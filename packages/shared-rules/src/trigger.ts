/**
 * Event trigger system.
 *
 * Triggers fire automatically when conditions are met after effects are applied.
 * They enable reactive game logic like: "when HP drops to 0, add 'unconscious' status".
 */

import type { Actor } from './actor.js';
import type { ActionEffect, ActionContext } from './action.js';

export type TriggerEvent =
  | 'resourceChanged'
  | 'statusAdded'
  | 'statusRemoved'
  | 'statusExpired'
  | 'roundStarted'
  | 'turnStarted';

export interface TriggerDefinition {
  id: string;
  name: string;
  event: TriggerEvent;
  condition: (actor: Actor, context: TriggerContext) => boolean;
  effects: (actor: Actor, context: TriggerContext) => ActionEffect[];
}

export interface TriggerContext extends ActionContext {
  event: TriggerEvent;
  changedResourceId?: string;
  changedStatusId?: string;
}

/**
 * Registry for event triggers.
 */
export class TriggerRegistry {
  private triggers: TriggerDefinition[] = [];

  register(trigger: TriggerDefinition): void {
    this.triggers.push(trigger);
  }

  unregister(triggerId: string): void {
    this.triggers = this.triggers.filter((t) => t.id !== triggerId);
  }

  getTriggersForEvent(event: TriggerEvent): TriggerDefinition[] {
    return this.triggers.filter((t) => t.event === event);
  }

  /**
   * Evaluate all triggers for a given event and actor.
   * Returns effects from all triggers whose conditions are met.
   */
  evaluate(event: TriggerEvent, actor: Actor, context: ActionContext, extra?: { changedResourceId?: string; changedStatusId?: string }): ActionEffect[] {
    const triggerContext: TriggerContext = {
      ...context,
      event,
      changedResourceId: extra?.changedResourceId,
      changedStatusId: extra?.changedStatusId,
    };

    const effects: ActionEffect[] = [];
    for (const trigger of this.getTriggersForEvent(event)) {
      if (trigger.condition(actor, triggerContext)) {
        effects.push(...trigger.effects(actor, triggerContext));
      }
    }
    return effects;
  }
}
