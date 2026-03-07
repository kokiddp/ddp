import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { Client, Databases, Query } from 'node-appwrite';
import { log } from './logger.js';

const app = express();
const port = Number(process.env.PORT) || 3100;

app.use(express.json());

app.use((req, _res, next) => {
  log.info('Incoming request', { method: req.method, path: req.path });
  next();
});

// ── Appwrite setup ──

const ENDPOINT = process.env.APPWRITE_ENDPOINT ?? 'http://localhost/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? 'ddp';
const API_KEY = process.env.APPWRITE_API_KEY ?? '';
const DATABASE_ID = 'ddp';

const awClient = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(awClient);

// ── LiveKit config ──

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? 'secret';

// ── Helpers ──

async function verifyJwt(jwt: string): Promise<string> {
  const response = await fetch(`${ENDPOINT}/account`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-JWT': jwt,
    },
  });

  if (!response.ok) {
    throw new Error('Invalid JWT');
  }

  const account = (await response.json()) as { $id: string; name: string };
  return account.$id;
}

async function isSessionMember(gameSessionId: string, userId: string): Promise<boolean> {
  const result = await databases.listDocuments(DATABASE_ID, 'game_players', [
    Query.equal('gameSessionId', gameSessionId),
    Query.equal('userId', userId),
    Query.notEqual('status', 'left'),
    Query.notEqual('status', 'kicked'),
    Query.limit(1),
  ]);
  return result.total > 0;
}

// ── Routes ──

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ddp-integration-api' });
});

/**
 * POST /voice/token
 * Body: { jwt: string, sessionId: string }
 * Returns: { token: string }
 *
 * Issues a LiveKit access token for an authenticated session member.
 */
app.post('/voice/token', async (req, res) => {
  try {
    const { jwt, sessionId } = req.body as { jwt?: string; sessionId?: string };

    if (!jwt || !sessionId) {
      res.status(400).json({ error: 'Missing jwt or sessionId' });
      return;
    }

    // Verify identity
    let userId: string;
    try {
      userId = await verifyJwt(jwt);
    } catch {
      res.status(401).json({ error: 'Invalid authentication' });
      return;
    }

    // Verify session membership
    const isMember = await isSessionMember(sessionId, userId);
    if (!isMember) {
      res.status(403).json({ error: 'Not a member of this session' });
      return;
    }

    // Check voice chat is enabled for this session
    const session = await databases.getDocument(DATABASE_ID, 'game_sessions', sessionId);
    if (!session.voiceChatEnabled) {
      res.status(403).json({ error: 'Voice chat is not enabled for this session' });
      return;
    }

    // Generate LiveKit token
    const roomName = `ddp-session-${sessionId}`;
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userId,
      ttl: '4h',
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({ token, room: roomName });
  } catch (err) {
    log.error('Voice token issuance failed', { error: String(err) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  log.info('Integration API listening', { port });
});
