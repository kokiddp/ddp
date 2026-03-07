/**
 * Rules profile strategy.
 *
 * A RulesProfileDefinition bundles together the handlers and configuration
 * that make up a specific ruleset (e.g. "D&D 5e-inspired", "PbtA-inspired", "custom").
 *
 * This is the extensibility point: new game systems create a RulesProfileDefinition
 * and register it. The session runtime loads the appropriate one based on the
 * session's rulesProfileId.
 */

import type { RuleHandler } from './action.js';
import { RuleRegistry } from './action.js';

export interface RulesProfileDefinition {
  /** Unique identifier for this rules profile type */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version string */
  version: string;
  /** Description of the ruleset */
  description: string;
  /** The rule handlers this profile provides */
  handlers: RuleHandler[];
  /** Default configuration blob */
  defaultConfig: Record<string, unknown>;
}

/**
 * Global registry of available rules profile definitions.
 */
const profileDefinitions = new Map<string, RulesProfileDefinition>();

export function registerProfileDefinition(def: RulesProfileDefinition): void {
  profileDefinitions.set(def.id, def);
}

export function getProfileDefinition(id: string): RulesProfileDefinition | undefined {
  return profileDefinitions.get(id);
}

export function listProfileDefinitions(): RulesProfileDefinition[] {
  return Array.from(profileDefinitions.values());
}

/**
 * Create a RuleRegistry from a rules profile definition.
 */
export function createRegistryFromProfile(profileId: string): RuleRegistry {
  const def = profileDefinitions.get(profileId);
  const registry = new RuleRegistry();

  if (def) {
    for (const handler of def.handlers) {
      registry.register(handler);
    }
  }

  return registry;
}
