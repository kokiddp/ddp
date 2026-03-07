import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { createServer } from 'http';
import { SessionRoom } from './rooms/session-room.js';

const app = express();
const port = Number(process.env.PORT) || 2567;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ddp-colyseus-server' });
});

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define('session', SessionRoom);

httpServer.listen(port, () => {
  console.log(`[DDP] Colyseus server listening on port ${port}`);
});
