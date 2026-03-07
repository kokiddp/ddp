/**
 * @ddp/shared-rules
 *
 * Protocol-level rule interfaces and reusable game logic primitives.
 */

// Validation
export { validateCommandEnvelope, type ValidationResult } from './validation.js';

// Actor model
export {
  type Actor,
  type Resource,
  type Status,
  createResource,
  modifyResource,
  setResource,
  addStatus,
  removeStatus,
  tickStatuses,
  hasStatus,
  hasTag,
} from './actor.js';

// Action resolution
export {
  type ActionProposal,
  type ActionOutcome,
  type ActionResult,
  type ActionEffect,
  type RuleHandler,
  type ValidationError,
  type ActionContext,
  RuleRegistry,
  applyEffects,
} from './action.js';

// Scene / turn management
export {
  type Scene,
  createScene,
  getCurrentActorId,
  advanceTurn,
  endScene,
  setTurnOrder,
  removeFromTurnOrder,
} from './scene.js';

// Rules profile extensibility
export {
  type RulesProfileDefinition,
  registerProfileDefinition,
  getProfileDefinition,
  listProfileDefinitions,
  createRegistryFromProfile,
} from './rules-profile.js';

// Event triggers
export {
  type TriggerEvent,
  type TriggerDefinition,
  type TriggerContext,
  TriggerRegistry,
} from './trigger.js';
