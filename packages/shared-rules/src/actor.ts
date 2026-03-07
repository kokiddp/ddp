/**
 * Actor abstraction — represents any entity that can perform or receive actions
 * in a game session (characters, NPCs, environmental hazards, etc.).
 */

export interface Actor {
  id: string;
  name: string;
  kind: string; // e.g. 'player-character', 'npc', 'environment'
  resources: Record<string, Resource>;
  statuses: Status[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface Resource {
  id: string;
  name: string;
  current: number;
  max: number | null;
  min: number;
}

export interface Status {
  id: string;
  name: string;
  kind: string;
  remainingRounds: number | null; // null = permanent until removed
  metadata: Record<string, unknown>;
}

// ── Helpers ──

export function createResource(
  id: string,
  name: string,
  current: number,
  max: number | null = null,
  min = 0,
): Resource {
  return { id, name, current, max, min };
}

export function modifyResource(
  resource: Resource,
  delta: number,
): Resource {
  let next = resource.current + delta;
  if (resource.max !== null) next = Math.min(next, resource.max);
  next = Math.max(next, resource.min);
  return { ...resource, current: next };
}

export function setResource(
  resource: Resource,
  value: number,
): Resource {
  let next = value;
  if (resource.max !== null) next = Math.min(next, resource.max);
  next = Math.max(next, resource.min);
  return { ...resource, current: next };
}

export function addStatus(actor: Actor, status: Status): Actor {
  return { ...actor, statuses: [...actor.statuses, status] };
}

export function removeStatus(actor: Actor, statusId: string): Actor {
  return { ...actor, statuses: actor.statuses.filter((s) => s.id !== statusId) };
}

export function tickStatuses(actor: Actor): Actor {
  const updated = actor.statuses
    .map((s) => {
      if (s.remainingRounds === null) return s;
      return { ...s, remainingRounds: s.remainingRounds - 1 };
    })
    .filter((s) => s.remainingRounds === null || s.remainingRounds > 0);

  return { ...actor, statuses: updated };
}

export function hasStatus(actor: Actor, statusName: string): boolean {
  return actor.statuses.some((s) => s.name === statusName);
}

export function hasTag(actor: Actor, tag: string): boolean {
  return actor.tags.includes(tag);
}
