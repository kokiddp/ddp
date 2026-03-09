import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const {
  mockJoinSession,
  mockGetSession,
  mockListSessionPlayers,
  mockUpdateSession,
  mockUpdatePlayer,
  mockLeaveSession,
} = vi.hoisted(() => ({
  mockJoinSession: vi.fn(),
  mockGetSession: vi.fn(),
  mockListSessionPlayers: vi.fn(),
  mockUpdateSession: vi.fn(),
  mockUpdatePlayer: vi.fn(),
  mockLeaveSession: vi.fn(),
}));

vi.mock('../../apps/web/src/services/session.service.js', () => ({
  getSession: mockGetSession,
  listSessionPlayers: mockListSessionPlayers,
  joinSession: mockJoinSession,
  updateSession: mockUpdateSession,
  updatePlayer: mockUpdatePlayer,
  leaveSession: mockLeaveSession,
}));

import { useActiveSessionStore } from '../../apps/web/src/stores/useActiveSessionStore.js';

describe('useActiveSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('upserts existing player on duplicate join response', async () => {
    const store = useActiveSessionStore();

    const firstDoc = {
      $id: 'player-1',
      userId: 'user-1',
      role: 'player',
      status: 'joined',
    };

    const secondDoc = {
      ...firstDoc,
      status: 'ready',
    };

    mockJoinSession.mockResolvedValueOnce(firstDoc).mockResolvedValueOnce(secondDoc);

    const first = await store.join('session-1', 'user-1', 'player');
    const second = await store.join('session-1', 'user-1', 'player');

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(store.players).toHaveLength(1);
    expect(store.players[0]?.$id).toBe('player-1');
    expect(store.players[0]?.status).toBe('ready');
    expect(store.currentPlayerId).toBe('player-1');
  });
});
