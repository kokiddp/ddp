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
  saveTextMessage,
  getTextMessages,
  getCharacter,
} from '../appwrite.js';
import { log } from '../logger.js';
import { z } from 'zod';

// ── Message schemas ──

const bindCharacterSchema = z.object({
  characterId: z.string().min(1),
});

const submitActionSchema = z.object({
  actionType: z.string().min(1),
  actionPayload: z.record(z.string(), z.unknown()).default({}),
});

const sendTextMessageSchema = z.object({
  body: z.string().min(1).max(5000),
  senderCharacterId: z.string().optional(),
});

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

  /** Cache of characterId → character name for display in chat */
  private characterNameCache = new Map<string, string>();

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

    // Note: We don't block active-session joins here because legitimate members
    // need to reconnect (e.g., navigating from lobby to play view, or page reload).
    // The isSessionMember check above already ensures only registered members can join.
    // New player registration is blocked at the Appwrite layer (session.service joinSession).

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

    log.info('Room created', { roomId: this.roomId, sessionId: this.state.sessionId });
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
    log.info('Player joined', { userId, roomId: this.roomId });

    // Send current session status to the newly joined client
    client.send('sessionStatus', { status: this.state.status });

    // Broadcast player join to all clients (including the new one)
    this.broadcast('playerJoined', { userId, role: player.role });
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
      log.info('Player left', { userId, roomId: this.roomId });
      this.broadcast('playerLeft', { userId });
    } else {
      // Disconnected — allow reconnection for 60s
      try {
        await this.allowReconnection(client, 60);
        // Reconnected successfully
        player.status = 'joined';
        log.info('Player reconnected', { userId, roomId: this.roomId });
      } catch {
        // Timed out waiting for reconnection
        player.status = 'left';
        this.state.players.delete(client.sessionId);
        this.clientUserMap.delete(client.sessionId);
        log.warn('Player reconnection timed out', { userId, roomId: this.roomId });
        this.broadcast('playerLeft', { userId });
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
        log.info('Final snapshot saved', { sessionId: this.state.sessionId, roomId: this.roomId });
      } catch (err) {
        log.error('Failed to save final snapshot', { sessionId: this.state.sessionId, error: String(err) });
      }
    }

    log.info('Room disposed', { roomId: this.roomId });
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

      // Load current players from Appwrite and pre-cache character names
      const players = await getSessionPlayers(this.state.sessionId);
      for (const p of players) {
        const charId = p.characterId as string | null;
        if (charId && !this.characterNameCache.has(charId)) {
          try {
            const charDoc = await getCharacter(charId);
            this.characterNameCache.set(charId, charDoc.name as string);
          } catch {
            // Character lookup failed, will fall back to userId in chat
          }
        }
      }
      log.info('Loaded players from Appwrite', { count: players.length, sessionId: this.state.sessionId });
    } catch (err) {
      log.error('Bootstrap failed', { sessionId: this.state.sessionId, error: String(err) });
    }
  }

  // ── Message handlers ──

  private registerMessageHandlers(): void {
    this.onMessage('toggleReady', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.ready = !player.ready;
        this.broadcast('playerReady', { userId: player.userId, ready: player.ready });
      }
    });

    this.onMessage('bindCharacter', async (client, message: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const parsed = bindCharacterSchema.safeParse(message);
      if (!parsed.success) return;
      player.characterId = parsed.data.characterId;

      // Cache character name for chat display
      if (!this.characterNameCache.has(parsed.data.characterId)) {
        try {
          const charDoc = await getCharacter(parsed.data.characterId);
          this.characterNameCache.set(parsed.data.characterId, charDoc.name as string);
        } catch (err) {
          log.warn('Failed to look up character name', { characterId: parsed.data.characterId, error: String(err) });
        }
      }
    });

    this.onMessage('startSession', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== 'host') return;

      // Check all non-host players are ready
      let allReady = true;
      let playerCount = 0;
      this.state.players.forEach((p) => {
        if (p.role !== 'host') {
          playerCount++;
          if (!p.ready) allReady = false;
        }
      });
      if (!allReady || playerCount === 0) {
        client.send('startRejected', {
          reason: playerCount === 0
            ? 'Cannot start without any players'
            : 'All players must be ready before starting',
        });
        return;
      }

      this.state.status = 'active';
      this.broadcast('sessionStatus', { status: 'active' });

      updateSessionStatus(this.state.sessionId, 'active').catch((err) =>
        log.error('Failed to update session status', { error: String(err) }),
      );

      // Start periodic snapshots (every 5 minutes)
      this.snapshotInterval = setInterval(() => {
        this.persistSnapshot(player.userId).catch((err) =>
          log.error('Auto-snapshot failed', { error: String(err) }),
        );
      }, 5 * 60 * 1000);
    });

    this.onMessage('pauseSession', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== 'host') return;

      this.state.status = 'paused';
      this.broadcast('sessionStatus', { status: 'paused' });

      updateSessionStatus(this.state.sessionId, 'paused').catch((err) =>
        log.error('Failed to pause session', { error: String(err) }),
      );

      this.persistSnapshot(player.userId).catch((err) =>
        log.error('Pause snapshot failed', { error: String(err) }),
      );
    });

    this.onMessage('endSession', async (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== 'host') return;

      this.state.status = 'ended';
      this.broadcast('sessionStatus', { status: 'ended' });

      try {
        await updateSessionStatus(this.state.sessionId, 'ended');
        await this.persistSnapshot(player.userId);
      } catch (err) {
        log.error('Failed to finalize session end', { error: String(err) });
      }
      this.disconnect();
    });

    this.onMessage('submitAction', (client, message: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (this.state.status !== 'active') {
        client.send('actionRejected', { reason: 'Session is not active' });
        return;
      }

      const parsed = submitActionSchema.safeParse(message);
      if (!parsed.success) {
        client.send('actionRejected', { reason: 'Invalid action' });
        return;
      }

      // Broadcast the action to all clients.
      // The shared-rules package will eventually process these authoritatively.
      this.broadcast('actionApplied', {
        userId: player.userId,
        actionType: parsed.data.actionType,
        actionPayload: parsed.data.actionPayload,
        timestamp: new Date().toISOString(),
      });
    });

    this.onMessage('requestSnapshot', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== 'host') return;

      this.persistSnapshot(player.userId).catch((err) =>
        log.error('Manual snapshot failed', { error: String(err) }),
      );
    });

    // ── Text chat ──

    this.onMessage('sendTextMessage', (client, message: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const parsed = sendTextMessageSchema.safeParse(message);
      if (!parsed.success) return;

      const timestamp = new Date().toISOString();
      const charId = parsed.data.senderCharacterId || player.characterId || null;
      const displayName = charId ? (this.characterNameCache.get(charId) ?? null) : null;

      const textMsg = {
        gameSessionId: this.state.sessionId,
        senderUserId: player.userId,
        senderCharacterId: charId,
        senderDisplayName: displayName,
        kind: 'user' as const,
        body: parsed.data.body,
        createdAt: timestamp,
      };

      // Broadcast to all connected clients
      this.broadcast('textMessage', textMsg);

      // Persist to Appwrite (fire-and-forget)
      saveTextMessage({
        gameSessionId: textMsg.gameSessionId,
        senderUserId: textMsg.senderUserId,
        senderCharacterId: textMsg.senderCharacterId,
        senderDisplayName: textMsg.senderDisplayName,
        kind: textMsg.kind,
        body: textMsg.body,
      }).catch((err) =>
        log.error('Failed to persist text message', { error: String(err) }),
      );
    });

    this.onMessage('loadChatHistory', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      getTextMessages(this.state.sessionId).then((messages) => {
        client.send('chatHistory', messages.map((m) => ({
          gameSessionId: m.gameSessionId,
          senderUserId: m.senderUserId,
          senderCharacterId: m.senderCharacterId ?? null,
          senderDisplayName: (m.senderDisplayName as string) ?? null,
          kind: m.kind,
          body: m.body,
          createdAt: m.$createdAt,
        })));
      }).catch((err) =>
        log.error('Failed to load chat history', { error: String(err) }),
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
