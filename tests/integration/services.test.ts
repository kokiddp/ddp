/**
 * Integration tests for DDP application services (Colyseus, Integration API).
 *
 * These tests start each server in a child process, verify its health endpoint,
 * then shut it down.
 */
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '../..');
const NVM_DIR = process.env['NVM_DIR'] ?? resolve(homedir(), '.nvm');

function startServer(
  cwd: string,
  port: number,
): Promise<{ proc: ChildProcess; stop: () => void }> {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(
      'bash',
      ['-c', `source "${NVM_DIR}/nvm.sh" --no-use 2>/dev/null && nvm use v20.20.0 > /dev/null 2>&1 && npx tsx src/index.ts`],
      {
        cwd,
        stdio: 'pipe',
        env: { ...process.env, PORT: String(port), NVM_DIR },
      },
    );

    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        proc.kill();
        reject(new Error(`Server at ${cwd} failed to start within 15s`));
      }
    }, 15_000);

    const onData = (data: Buffer) => {
      if (!resolved && data.toString().includes('listening')) {
        resolved = true;
        clearTimeout(timeout);
        resolvePromise({ proc, stop: () => proc.kill() });
      }
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    proc.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code} before listening`));
      }
    });
  });
}

async function waitForPort(port: number, retries = 10): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Port ${port} not responding after ${retries} retries`);
}

// Use high ports to avoid conflicts with running dev servers
const COLYSEUS_TEST_PORT = 19567;
const API_TEST_PORT = 19100;

describe('Colyseus server', () => {
  it('starts up and serves health endpoint', async () => {
    const { stop } = await startServer(
      resolve(ROOT, 'apps/colyseus-server'),
      COLYSEUS_TEST_PORT,
    );

    try {
      await waitForPort(COLYSEUS_TEST_PORT);
      const res = await fetch(`http://localhost:${COLYSEUS_TEST_PORT}/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('ddp-colyseus-server');
    } finally {
      stop();
    }
  });
});

describe('Integration API', () => {
  it('starts up and serves health endpoint', async () => {
    const { stop } = await startServer(
      resolve(ROOT, 'apps/integration-api'),
      API_TEST_PORT,
    );

    try {
      await waitForPort(API_TEST_PORT);
      const res = await fetch(`http://localhost:${API_TEST_PORT}/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('ddp-integration-api');
    } finally {
      stop();
    }
  });
});
