import { Room, Client } from '@colyseus/core';
import { Schema, MapSchema, type } from '@colyseus/schema';

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
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

export class SessionRoom extends Room<SessionState> {
  maxClients = 20;

  onCreate(options: Record<string, unknown>): void {
    this.setState(new SessionState());

    if (typeof options.sessionId === 'string') {
      this.state.sessionId = options.sessionId;
    }
    if (typeof options.hostUserId === 'string') {
      this.state.hostUserId = options.hostUserId;
    }

    this.onMessage('toggleReady', (client, _message) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.ready = !player.ready;
      }
    });

    this.onMessage('bindCharacter', (client, message: { characterId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && typeof message.characterId === 'string') {
        player.characterId = message.characterId;
      }
    });

    console.log(`[SessionRoom] Room created: ${this.roomId}`);
  }

  onJoin(client: Client, options: Record<string, unknown>): void {
    const player = new PlayerState();
    player.userId = typeof options.userId === 'string' ? options.userId : client.sessionId;
    player.role =
      player.userId === this.state.hostUserId ? 'host' : 'player';
    player.status = 'joined';

    this.state.players.set(client.sessionId, player);
    console.log(`[SessionRoom] Player joined: ${player.userId}`);
  }

  onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.status = 'left';
      console.log(`[SessionRoom] Player left: ${player.userId}`);
    }
    this.state.players.delete(client.sessionId);
  }

  onDispose(): void {
    console.log(`[SessionRoom] Room disposed: ${this.roomId}`);
  }
}
