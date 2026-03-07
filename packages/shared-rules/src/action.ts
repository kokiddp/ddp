/**
 * Action abstraction — represents something an actor attempts to do.
 *
 * Actions go through a resolution pipeline:
 *   propose → validate → resolve → apply effects
 *
 * The resolution strategy is pluggable via RuleHandler.
 */

import type { Actor } from './actor.js';
import { modifyResource } from './actor.js';

export interface ActionProposal {
  id: string;
  actorId: string;
  actionType: string;
  params: Record<string, unknown>;
  timestamp: string;
}

export type ActionOutcome = 'success' | 'failure' | 'partial' | 'cancelled';

export interface ActionResult {
  proposalId: string;
  outcome: ActionOutcome;
  effects: ActionEffect[];
  message: string;
  metadata: Record<string, unknown>;
}

export interface ActionEffect {
  targetActorId: string;
  effectType: string; // e.g. 'modifyResource', 'addStatus', 'removeStatus'
  params: Record<string, unknown>;
}

/**
 * A rule handler processes an action proposal and returns a result.
 * Implementations are provided by rules-profile packages.
 */
export interface RuleHandler {
  /** Which action types this handler can process */
  handles: string[];

  /** Validate whether the action can be attempted */
  validate(
    proposal: ActionProposal,
    actor: Actor,
    context: ActionContext,
  ): ValidationError[];

  /** Resolve the action and determine effects */
  resolve(
    proposal: ActionProposal,
    actor: Actor,
    context: ActionContext,
  ): ActionResult;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Context available during action resolution.
 * Provides read access to session state without coupling to a specific store.
 */
export interface ActionContext {
  sessionId: string;
  actors: Map<string, Actor>;
  round: number;
  metadata: Record<string, unknown>;
}

// ── Rule registry ──

/**
 * A registry that maps action types to their handlers.
 */
export class RuleRegistry {
  private handlers = new Map<string, RuleHandler>();

  register(handler: RuleHandler): void {
    for (const type of handler.handles) {
      this.handlers.set(type, handler);
    }
  }

  getHandler(actionType: string): RuleHandler | undefined {
    return this.handlers.get(actionType);
  }

  processAction(
    proposal: ActionProposal,
    actor: Actor,
    context: ActionContext,
  ): ActionResult {
    const handler = this.handlers.get(proposal.actionType);
    if (!handler) {
      return {
        proposalId: proposal.id,
        outcome: 'cancelled',
        effects: [],
        message: `No handler registered for action type: ${proposal.actionType}`,
        metadata: {},
      };
    }

    const errors = handler.validate(proposal, actor, context);
    if (errors.length > 0) {
      return {
        proposalId: proposal.id,
        outcome: 'cancelled',
        effects: [],
        message: errors.map((e) => e.message).join('; '),
        metadata: { validationErrors: errors },
      };
    }

    return handler.resolve(proposal, actor, context);
  }
}

// ── Effect application ──

/**
 * Apply an array of effects to a map of actors.
 * Returns a new map with the modified actors.
 */
export function applyEffects(
  actors: Map<string, Actor>,
  effects: ActionEffect[],
): Map<string, Actor> {
  const result = new Map(actors);

  for (const effect of effects) {
    const actor = result.get(effect.targetActorId);
    if (!actor) continue;

    switch (effect.effectType) {
      case 'modifyResource': {
        const resourceId = effect.params.resourceId as string;
        const delta = effect.params.delta as number;
        const resource = actor.resources[resourceId];
        if (resource) {
          result.set(effect.targetActorId, {
            ...actor,
            resources: {
              ...actor.resources,
              [resourceId]: modifyResource(resource, delta),
            },
          });
        }
        break;
      }
      case 'addStatus': {
        const status = effect.params.status as Actor['statuses'][0];
        if (status) {
          result.set(effect.targetActorId, {
            ...actor,
            statuses: [...actor.statuses, status],
          });
        }
        break;
      }
      case 'removeStatus': {
        const statusId = effect.params.statusId as string;
        result.set(effect.targetActorId, {
          ...actor,
          statuses: actor.statuses.filter((s) => s.id !== statusId),
        });
        break;
      }
    }
  }

  return result;
}
