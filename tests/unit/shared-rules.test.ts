import { describe, it, expect } from 'vitest';
import {
  validateCommandEnvelope,
  createResource,
  modifyResource,
  setResource,
  addStatus,
  removeStatus,
  tickStatuses,
  hasStatus,
  hasTag,
  RuleRegistry,
  applyEffects,
  createScene,
  getCurrentActorId,
  advanceTurn,
  endScene,
  setTurnOrder,
  removeFromTurnOrder,
  registerProfileDefinition,
  getProfileDefinition,
  createRegistryFromProfile,
  type Actor,
  type Status,
  type RuleHandler,
  type ActionProposal,
  type ActionContext,
} from '@ddp/shared-rules';

// ── Test helpers ──

function makeActor(overrides: Partial<Actor> = {}): Actor {
  return {
    id: 'actor-1',
    name: 'Test Actor',
    kind: 'player-character',
    resources: {},
    statuses: [],
    tags: [],
    metadata: {},
    ...overrides,
  };
}

function makeContext(): ActionContext {
  return {
    sessionId: 'session-1',
    actors: new Map(),
    round: 1,
    metadata: {},
  };
}

// ── Validation ──

describe('validateCommandEnvelope', () => {
  it('validates a correct envelope', () => {
    const result = validateCommandEnvelope({
      type: 'TestCommand',
      payload: {},
      issuedBy: 'user-1',
      issuedAt: new Date().toISOString(),
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing type', () => {
    const result = validateCommandEnvelope({
      type: '',
      payload: {},
      issuedBy: 'user-1',
      issuedAt: new Date().toISOString(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects missing issuedBy', () => {
    const result = validateCommandEnvelope({
      type: 'Test',
      payload: {},
      issuedBy: '',
      issuedAt: new Date().toISOString(),
    });
    expect(result.valid).toBe(false);
  });
});

// ── Resources ──

describe('Resource helpers', () => {
  it('creates a resource with defaults', () => {
    const r = createResource('hp', 'Health', 10, 20);
    expect(r.current).toBe(10);
    expect(r.max).toBe(20);
    expect(r.min).toBe(0);
  });

  it('modifies resource respecting bounds', () => {
    const r = createResource('hp', 'Health', 10, 20);
    expect(modifyResource(r, 5).current).toBe(15);
    expect(modifyResource(r, 15).current).toBe(20); // capped at max
    expect(modifyResource(r, -15).current).toBe(0); // capped at min
  });

  it('sets resource respecting bounds', () => {
    const r = createResource('hp', 'Health', 10, 20);
    expect(setResource(r, 25).current).toBe(20);
    expect(setResource(r, -5).current).toBe(0);
    expect(setResource(r, 15).current).toBe(15);
  });

  it('handles null max (unbounded)', () => {
    const r = createResource('xp', 'Experience', 100, null);
    expect(modifyResource(r, 9999).current).toBe(10099);
  });
});

// ── Statuses ──

describe('Status helpers', () => {
  const status: Status = {
    id: 'poison',
    name: 'Poisoned',
    kind: 'debuff',
    remainingRounds: 3,
    metadata: {},
  };

  it('adds a status', () => {
    const actor = makeActor();
    const updated = addStatus(actor, status);
    expect(updated.statuses).toHaveLength(1);
    expect(updated.statuses[0].name).toBe('Poisoned');
  });

  it('removes a status by id', () => {
    const actor = makeActor({ statuses: [status] });
    const updated = removeStatus(actor, 'poison');
    expect(updated.statuses).toHaveLength(0);
  });

  it('ticks down statuses and removes expired', () => {
    const actor = makeActor({
      statuses: [
        { ...status, remainingRounds: 1 },
        { id: 'perm', name: 'Permanent', kind: 'buff', remainingRounds: null, metadata: {} },
      ],
    });
    const ticked = tickStatuses(actor);
    // The 1-round status should be removed (goes to 0)
    expect(ticked.statuses).toHaveLength(1);
    expect(ticked.statuses[0].name).toBe('Permanent');
  });

  it('hasStatus checks correctly', () => {
    const actor = makeActor({ statuses: [status] });
    expect(hasStatus(actor, 'Poisoned')).toBe(true);
    expect(hasStatus(actor, 'Blessed')).toBe(false);
  });

  it('hasTag checks correctly', () => {
    const actor = makeActor({ tags: ['undead', 'boss'] });
    expect(hasTag(actor, 'undead')).toBe(true);
    expect(hasTag(actor, 'human')).toBe(false);
  });
});

// ── Action resolution ──

describe('RuleRegistry', () => {
  const handler: RuleHandler = {
    handles: ['attack'],
    validate: (proposal) => {
      if (!proposal.params.targetId) {
        return [{ field: 'targetId', message: 'Target is required' }];
      }
      return [];
    },
    resolve: (proposal) => ({
      proposalId: proposal.id,
      outcome: 'success',
      effects: [
        {
          targetActorId: proposal.params.targetId as string,
          effectType: 'modifyResource',
          params: { resourceId: 'hp', delta: -5 },
        },
      ],
      message: 'Hit for 5 damage',
      metadata: {},
    }),
  };

  it('registers and retrieves handlers', () => {
    const registry = new RuleRegistry();
    registry.register(handler);
    expect(registry.getHandler('attack')).toBe(handler);
    expect(registry.getHandler('unknown')).toBeUndefined();
  });

  it('processes valid action', () => {
    const registry = new RuleRegistry();
    registry.register(handler);

    const proposal: ActionProposal = {
      id: 'action-1',
      actorId: 'actor-1',
      actionType: 'attack',
      params: { targetId: 'actor-2' },
      timestamp: new Date().toISOString(),
    };

    const result = registry.processAction(proposal, makeActor(), makeContext());
    expect(result.outcome).toBe('success');
    expect(result.effects).toHaveLength(1);
  });

  it('rejects invalid action', () => {
    const registry = new RuleRegistry();
    registry.register(handler);

    const proposal: ActionProposal = {
      id: 'action-2',
      actorId: 'actor-1',
      actionType: 'attack',
      params: {},
      timestamp: new Date().toISOString(),
    };

    const result = registry.processAction(proposal, makeActor(), makeContext());
    expect(result.outcome).toBe('cancelled');
  });

  it('returns cancelled for unknown action type', () => {
    const registry = new RuleRegistry();
    const proposal: ActionProposal = {
      id: 'action-3',
      actorId: 'actor-1',
      actionType: 'fly',
      params: {},
      timestamp: new Date().toISOString(),
    };

    const result = registry.processAction(proposal, makeActor(), makeContext());
    expect(result.outcome).toBe('cancelled');
  });
});

// ── Effect application ──

describe('applyEffects', () => {
  it('modifies resource on target actor', () => {
    const actor = makeActor({
      id: 'target',
      resources: { hp: createResource('hp', 'HP', 20, 20) },
    });
    const actors = new Map([['target', actor]]);

    const result = applyEffects(actors, [
      {
        targetActorId: 'target',
        effectType: 'modifyResource',
        params: { resourceId: 'hp', delta: -5 },
      },
    ]);

    expect(result.get('target')!.resources.hp.current).toBe(15);
  });

  it('adds status to target actor', () => {
    const actor = makeActor({ id: 'target' });
    const actors = new Map([['target', actor]]);

    const result = applyEffects(actors, [
      {
        targetActorId: 'target',
        effectType: 'addStatus',
        params: {
          status: { id: 'stun', name: 'Stunned', kind: 'debuff', remainingRounds: 2, metadata: {} },
        },
      },
    ]);

    expect(result.get('target')!.statuses).toHaveLength(1);
    expect(result.get('target')!.statuses[0].name).toBe('Stunned');
  });

  it('removes status from target actor', () => {
    const actor = makeActor({
      id: 'target',
      statuses: [{ id: 'stun', name: 'Stunned', kind: 'debuff', remainingRounds: 2, metadata: {} }],
    });
    const actors = new Map([['target', actor]]);

    const result = applyEffects(actors, [
      {
        targetActorId: 'target',
        effectType: 'removeStatus',
        params: { statusId: 'stun' },
      },
    ]);

    expect(result.get('target')!.statuses).toHaveLength(0);
  });

  it('ignores effects targeting non-existent actors', () => {
    const actors = new Map<string, Actor>();
    const result = applyEffects(actors, [
      {
        targetActorId: 'ghost',
        effectType: 'modifyResource',
        params: { resourceId: 'hp', delta: -5 },
      },
    ]);
    expect(result.size).toBe(0);
  });
});

// ── Scene / Turn ──

describe('Scene helpers', () => {
  it('creates a scene', () => {
    const scene = createScene('s1', 'Combat', 'combat', ['a', 'b', 'c']);
    expect(scene.round).toBe(1);
    expect(scene.currentTurnIndex).toBe(0);
    expect(scene.active).toBe(true);
  });

  it('gets current actor', () => {
    const scene = createScene('s1', 'Combat', 'combat', ['a', 'b', 'c']);
    expect(getCurrentActorId(scene)).toBe('a');
  });

  it('advances turn within round', () => {
    let scene = createScene('s1', 'Combat', 'combat', ['a', 'b', 'c']);
    scene = advanceTurn(scene);
    expect(getCurrentActorId(scene)).toBe('b');
    expect(scene.round).toBe(1);
  });

  it('advances to new round', () => {
    let scene = createScene('s1', 'Combat', 'combat', ['a', 'b']);
    scene = advanceTurn(scene); // b
    scene = advanceTurn(scene); // new round, a
    expect(scene.round).toBe(2);
    expect(getCurrentActorId(scene)).toBe('a');
  });

  it('ends a scene', () => {
    const scene = endScene(createScene('s1', 'Combat', 'combat'));
    expect(scene.active).toBe(false);
  });

  it('sets turn order', () => {
    let scene = createScene('s1', 'Combat', 'combat', ['a', 'b']);
    scene = advanceTurn(scene); // now at b
    scene = setTurnOrder(scene, ['c', 'a', 'b']);
    expect(scene.currentTurnIndex).toBe(0);
    expect(getCurrentActorId(scene)).toBe('c');
  });

  it('removes actor from turn order', () => {
    let scene = createScene('s1', 'Combat', 'combat', ['a', 'b', 'c']);
    scene = advanceTurn(scene); // now at b
    scene = removeFromTurnOrder(scene, 'a');
    expect(scene.turnOrder).toEqual(['b', 'c']);
    expect(getCurrentActorId(scene)).toBe('b');
  });
});

// ── Rules profile ──

describe('Rules profile registry', () => {
  it('registers and retrieves profile definitions', () => {
    registerProfileDefinition({
      id: 'test-rules',
      name: 'Test Rules',
      version: '1.0',
      description: 'Test ruleset',
      handlers: [],
      defaultConfig: {},
    });

    const def = getProfileDefinition('test-rules');
    expect(def).toBeDefined();
    expect(def!.name).toBe('Test Rules');
  });

  it('creates registry from profile', () => {
    const handler: RuleHandler = {
      handles: ['test-action'],
      validate: () => [],
      resolve: (p) => ({
        proposalId: p.id,
        outcome: 'success',
        effects: [],
        message: 'ok',
        metadata: {},
      }),
    };

    registerProfileDefinition({
      id: 'with-handlers',
      name: 'With Handlers',
      version: '1.0',
      description: '',
      handlers: [handler],
      defaultConfig: {},
    });

    const registry = createRegistryFromProfile('with-handlers');
    expect(registry.getHandler('test-action')).toBe(handler);
  });
});
