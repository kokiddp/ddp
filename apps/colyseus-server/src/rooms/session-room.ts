import { Room, Client } from '@colyseus/core';
import { Schema, MapSchema, type } from '@colyseus/schema';
import {
  verifyJwt,
  isSessionMember,
  getGameSession,
  getSessionPlayers,
  getLatestSnapshot,
  saveSnapshot,
  updateSessionStatus,
} from '../appwrite.js';

// ── State schemas ──

export class PlayerState extends Schema {
  @type('string') userId: string = '';
  @type('string') characterId: string = '';
  @type('string') role: string = 'player';
  @type('string') status: string = 'joined';
  @type('boolean') ready: boolean = false;
}

export class SessionState extends Schema {
  @type('string') sessionId: string = '';
  @type('string') hostUserId: string = '';
  @type('string') status: string = 'lobby';
  @type('uint32') snapshotVersion: number = 0;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

// ── Interfaces ──

interface JoinOptions {
  jwt?: string;
  userId?: string;
  sessionId?: string;
  hostUserId?: string;
}

interface AuthResult {
  userId: string;
  sessionId: string;
}

// ── Room ──

export class SessionRoom extends Room<SessionState> {
  maxClients = 20;

  /** Map from Colyseus client.sessionId to authenticated userId */
  private clientUserMap = new Map<string, string>();

  /** Interval handle for auto-snapshots */
  private snapshotInterval: ReturnType<typeof setInterval> | null = null;

  // ── Auth ──

  async onAuth(_client: Client, options: JoinOptions): Promise<AuthResult> {
    const sessionId = options.sessionId;
    if (!sessionId) {
      throw new Error('Missing sessionId');
    }

    let userId: string;

    if (options.jwt) {
      // Production path: verify JWT
      userId = await verifyJwt(options.jwt);
    } else if (options.userId && process.env.NODE_ENV === 'development') {
      // Dev-only fallback: trust userId from options
      userId = options.userId;
    } else {
      throw new Error('Authentication required');
    }

    // Verify the user is a member of this session
    const isMember = await isSessionMember(sessionId, userId);
    if (!isMember) {
      throw new Error('Not a member of this session');
    }

    return { userId, sessionId };
  }

  // ── Lifecycle ──

  async onCreate(options: JoinOptions): Promise<void> {
    this.setState(new SessionState());

    if (typeof options.sessionId === 'string') {
      this.state.sessionId = options.sessionId;
    }
    if (typeof options.hostUserId === 'string') {
      this.state.hostUserId = options.hostUserId;
    }

    // Bootstrap state from Appwrite
    await this.bootstrapFromAppwrite();

    // Register message handlers
    this.registerMessageHandlers();

    console.log(`[SessionRoom] Room created: ${this.roomId} (session: ${this.state.sessionId})`);
  }

  async onJoin(client: Client, _options: JoinOptions, auth?: AuthResult): Promise<void> {
    if (!auth) throw new Error('Auth required');
    const { userId } = auth;
    this.clientUserMap.set(client.sessionId, userId);

    const player = new PlayerState();
    player.userId = userId;
    player.role = userId === this.state.hostUserId ? 'host' : 'player';
    player.status = 'joined';

    this.state.players.set(client.sessionId, player);
    console.log(`[SessionRoom] Player joined: ${userId}`);
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const userId = player.userId;

    if (consented) {
      // Player intentionally left
      player.status = 'left';
      this.state.players.delete(client.sessionId);
      this.clientUserMap.delete(client.sessionId);
      console.log(`[SessionRoom] Player left: ${userId}`);
    } else {
      // Disconnected — allow reconnection for 60s
      try {
        await this.allowReconnection(client, 60);
        // Reconnected successfully
        player.status = 'joined';
        console.log(`[SessionRoom] Player reconnected: ${userId}`);
      } catch {
        // Timed out waiting for reconnection
        player.status = 'left';
        this.state.players.delete(client.sessionId);
        this.clientUserMap.delete(client.sessionId);
        console.log(`[SessionRoom] Player reconnection timed out: ${userId}`);
      }
    }
  }

  async onDispose(): Promise<void> {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
    }

    // Save final snapshot before room disposal
    if (this.state.sessionId) {
      try {
        await this.persistSnapshot('system');
        await updateSessionStatus(this.state.sessionId, 'paused');
        console.log(`[SessionRoom] Final snapshot saved for session: ${this.state.sessionId}`);
      } catch (err) {
        console.error(`[SessionRoom] Failed to save final snapshot:`, err);
      }
    }

    console.log(`[SessionRoom] Room disposed: ${this.roomId}`);
  }

  // ── State bootstrap ──

  private async bootstrapFromAppwrite(): Promise<void> {
    if (!this.state.sessionId) return;

    try {
      // Load session metadata
      const session = await getGameSession(this.state.sessionId);
      this.state.hostUserId = session.hostUserId;
      this.state.status = session.status === 'active' ? 'active' : 'lobby';

      // Load latest snapshot if resuming
      const snapshot = await getLatestSnapshot(this.state.sessionId);
      if (snapshot) {
        this.state.snapshotVersion = snapshot.version;
        try {
          const blob = JSON.parse(snapshot.stateBlob);
          if (blob.status) {
            this.state.status = blob.status;
          }
        } catch {
          // Snapshot parse failed, start fresh
        }
      }

      // Load current players from Appwrite
      const players = await getSessionPlayers(this.state.sessionId);
      console.log(`[SessionRoom] Loaded ${players.length} players from Appwrite`);
    } catch (err) {
      console.error(`[SessionRoom] Bootstrap failed:`, err);
    }
  }

  // ── Message handlers ──

  private registerMessageHandlers(): void {
    this.onMessage('toggleReady', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.ready = !player.ready;
      }
    });

    this.onMessage('bindCharacter', (client, message: { characterId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && typeof message?.characterId === 'string') {
        player.characterId = message.characterId;
      }
    });

    this.onMessage('startSession', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== 'host') return;

      this.state.status = 'active';

      updateSessionStatus(this.state.sessionId, 'active').catch((err) =>
        console.error('[SessionRoom] Failed to update session status:', err),
      );

      // Start periodic snapshots (every 5 minutes)
      this.snapshotInterval = setInterval(() => {
        this.persistSnapshot(player.userId).catch((err) =>
          console.error('[SessionRoom] Auto-snapshot failed:', err),
        );
      }, 5 * 60 * 1000);
    });

    this.onMessage('pauseSession', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== 'host') return;

      this.state.status = 'paused';

      updateSessionStatus(this.state.sessionId, 'paused').catch((err) =>
        console.error('[SessionRoom] Failed to pause session:', err),
      );

      this.persistSnapshot(player.userId).catch((err) =>
        console.error('[SessionRoom] Pause snapshot failed:', err),
      );
    });

    this.onMessage('endSession', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== 'host') return;

      this.state.status = 'ended';

      updateSessionStatus(this.state.sessionId, 'ended').catch((err) =>
        console.error('[SessionRoom] Failed to end session:', err),
      );

      this.persistSnapshot(player.userId)
        .catch((err) => console.error('[SessionRoom] End snapshot failed:', err))
        .finally(() => this.disconnect());
    });

    this.onMessage('submitAction', (client, message: { actionType: string; actionPayload: Record<string, unknown> }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (this.state.status !== 'active') {
        client.send('actionRejected', { reason: 'Session is not active' });
        return;
      }

      if (!message?.actionType || typeof message.actionType !== 'string') {
        client.send('actionRejected', { reason: 'Invalid action' });
        return;
      }

      // Broadcast the action to all clients.
      // The shared-rules package will eventually process these authoritatively.
      this.broadcast('actionApplied', {
        userId: player.userId,
        actionType: message.actionType,
        actionPayload: message.actionPayload ?? {},
        timestamp: new Date().toISOString(),
      });
    });

    this.onMessage('requestSnapshot', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== 'host') return;

      this.persistSnapshot(player.userId).catch((err) =>
        console.error('[SessionRoom] Manual snapshot failed:', err),
      );
    });
  }

  // ── Snapshot persistence ──

  private async persistSnapshot(createdBy: string): Promise<void> {
    if (!this.state.sessionId) return;

    this.state.snapshotVersion++;

    const stateBlob: Record<string, unknown> = {
      status: this.state.status,
      snapshotVersion: this.state.snapshotVersion,
      players: {} as Record<string, Record<string, unknown>>,
    };

    this.state.players.forEach((player, key) => {
      (stateBlob.players as Record<string, Record<string, unknown>>)[key] = {
        userId: player.userId,
        characterId: player.characterId,
        role: player.role,
        status: player.status,
        ready: player.ready,
      };
    });

    await saveSnapshot(
      this.state.sessionId,
      this.state.snapshotVersion,
      JSON.stringify(stateBlob),
      createdBy,
    );
  }
}
