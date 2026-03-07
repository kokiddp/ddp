# Rules Profile Guide

This document explains how DDP's protocol engine works, how to create custom rule handlers, and how to register a rules profile.

## Overview

DDP uses a **pluggable rules engine** built on three core concepts:

1. **Action Proposals** -- actors declare what they want to do
2. **Rule Handlers** -- validate and resolve proposals into outcomes
3. **Effects** -- mutations applied to actors after resolution

The engine is deliberately generic: no game-specific terminology is baked in. Whether you are building a D&D-inspired system, a narrative PbtA game, or something completely custom, the same primitives apply.

## Core Types

### Actor

An entity that can act or be acted upon:

```typescript
interface Actor {
  id: string;
  name: string;
  kind: string;            // e.g. 'player-character', 'npc', 'environment'
  resources: Record<string, Resource>;
  statuses: Status[];
  tags: string[];
  metadata: Record<string, unknown>;
}
```

### Resource

A bounded numeric value on an actor (health, mana, action points, etc.):

```typescript
interface Resource {
  id: string;
  name: string;
  current: number;
  max: number | null;      // null = unbounded
  min: number;
}
```

### Status

A temporary or permanent condition on an actor:

```typescript
interface Status {
  id: string;
  name: string;
  kind: string;            // 'buff', 'debuff', 'condition', etc.
  remainingRounds: number | null;  // null = permanent
  metadata: Record<string, unknown>;
}
```

## Creating a Rule Handler

A `RuleHandler` processes one or more action types through a validate-then-resolve pipeline:

```typescript
import type { RuleHandler, ActionProposal, Actor, ActionContext } from '@ddp/shared-rules';

const meleeAttackHandler: RuleHandler = {
  // Which action types this handler processes
  handles: ['melee-attack'],

  // Validate: return errors if the action cannot proceed
  validate(proposal: ActionProposal, actor: Actor, context: ActionContext) {
    if (!proposal.params.targetId) {
      return [{ field: 'targetId', message: 'A target is required' }];
    }
    const target = context.actors.get(proposal.params.targetId as string);
    if (!target) {
      return [{ field: 'targetId', message: 'Target not found' }];
    }
    return []; // valid
  },

  // Resolve: determine outcome and effects
  resolve(proposal: ActionProposal, _actor: Actor, _context: ActionContext) {
    const damage = Math.floor(Math.random() * 6) + 1; // 1d6
    return {
      proposalId: proposal.id,
      outcome: 'success',
      effects: [
        {
          targetActorId: proposal.params.targetId as string,
          effectType: 'modifyResource',
          params: { resourceId: 'hp', delta: -damage },
        },
      ],
      message: `Dealt ${damage} damage`,
      metadata: { roll: damage },
    };
  },
};
```

## Registering a Rules Profile

A `RulesProfileDefinition` bundles handlers together:

```typescript
import {
  registerProfileDefinition,
  type RulesProfileDefinition,
} from '@ddp/shared-rules';

const myProfile: RulesProfileDefinition = {
  id: 'simple-combat',
  name: 'Simple Combat Rules',
  version: '1.0.0',
  description: 'Basic melee and ranged combat with d6 damage',
  handlers: [meleeAttackHandler, rangedAttackHandler, healHandler],
  defaultConfig: {
    criticalHitMultiplier: 2,
    maxActionsPerTurn: 1,
  },
};

registerProfileDefinition(myProfile);
```

## Using a Rules Profile at Runtime

When a session starts, the runtime loads the profile and creates a registry:

```typescript
import { createRegistryFromProfile } from '@ddp/shared-rules';

const registry = createRegistryFromProfile('simple-combat');

// Process an action
const result = registry.processAction(proposal, actor, context);

if (result.outcome === 'success') {
  // Apply effects to actor state
  const updatedActors = applyEffects(actorMap, result.effects);
}
```

## Effect Types

The built-in `applyEffects` function handles three effect types:

| effectType       | params                                    | Description              |
|------------------|-------------------------------------------|--------------------------|
| `modifyResource` | `{ resourceId: string, delta: number }`   | Add/subtract from a resource |
| `addStatus`      | `{ status: Status }`                      | Apply a status to an actor   |
| `removeStatus`   | `{ statusId: string }`                    | Remove a status by ID        |

Custom effect types can be processed by extending the `applyEffects` logic.

## Scene and Turn Management

Scenes represent discrete gameplay segments. The engine tracks rounds and turn order:

```typescript
import { createScene, advanceTurn, getCurrentActorId } from '@ddp/shared-rules';

let scene = createScene('combat-1', 'Battle', 'combat', ['alice', 'bob', 'goblin']);

getCurrentActorId(scene);  // 'alice'
scene = advanceTurn(scene); // now 'bob'
scene = advanceTurn(scene); // now 'goblin'
scene = advanceTurn(scene); // round 2, back to 'alice'
```

## Architecture Boundaries

| Concern                        | Where it lives                    |
|-------------------------------|-----------------------------------|
| Protocol primitives           | `packages/shared-rules/src/`      |
| Type contracts                | `packages/shared-types/src/`      |
| Custom rule handlers          | Future `packages/rules-*` packages |
| Runtime action processing     | `apps/colyseus-server/` (SessionRoom) |
| Persistence (snapshots, etc.) | `apps/colyseus-server/` via Appwrite |

Rule handlers should be **pure functions** with no side effects. All state mutation happens through the effects pipeline, which the runtime applies to the authoritative state.

## Best Practices

- Keep handlers stateless -- all context comes through `ActionContext`
- Use `tags` and `metadata` on actors for game-specific data rather than adding new fields
- Use `Resource` for any numeric value that changes during play
- Use `Status` for temporary/permanent conditions that affect gameplay
- Validate thoroughly in `validate()` to give clear rejection messages
- Return descriptive `message` strings from `resolve()` for the UI to display
