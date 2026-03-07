/**
 * Scene and turn/timeline abstractions.
 *
 * A scene represents a discrete segment of gameplay (combat, exploration, etc.).
 * Turn order is tracked per-scene.
 */

export interface Scene {
  id: string;
  name: string;
  kind: string; // e.g. 'combat', 'exploration', 'social', 'custom'
  round: number;
  turnOrder: string[]; // actor IDs
  currentTurnIndex: number;
  active: boolean;
  metadata: Record<string, unknown>;
}

export function createScene(
  id: string,
  name: string,
  kind: string,
  turnOrder: string[] = [],
): Scene {
  return {
    id,
    name,
    kind,
    round: 1,
    turnOrder,
    currentTurnIndex: 0,
    active: true,
    metadata: {},
  };
}

export function getCurrentActorId(scene: Scene): string | null {
  if (scene.turnOrder.length === 0) return null;
  return scene.turnOrder[scene.currentTurnIndex] ?? null;
}

export function advanceTurn(scene: Scene): Scene {
  if (scene.turnOrder.length === 0) return scene;

  const nextIndex = scene.currentTurnIndex + 1;
  if (nextIndex >= scene.turnOrder.length) {
    // New round
    return {
      ...scene,
      round: scene.round + 1,
      currentTurnIndex: 0,
    };
  }

  return { ...scene, currentTurnIndex: nextIndex };
}

export function endScene(scene: Scene): Scene {
  return { ...scene, active: false };
}

export function setTurnOrder(scene: Scene, order: string[]): Scene {
  return { ...scene, turnOrder: order, currentTurnIndex: 0 };
}

export function removeFromTurnOrder(scene: Scene, actorId: string): Scene {
  const newOrder = scene.turnOrder.filter((id) => id !== actorId);
  const currentActorId = getCurrentActorId(scene);

  let newIndex = scene.currentTurnIndex;
  if (currentActorId) {
    const idx = newOrder.indexOf(currentActorId);
    newIndex = idx >= 0 ? idx : Math.min(scene.currentTurnIndex, newOrder.length - 1);
  }

  return {
    ...scene,
    turnOrder: newOrder,
    currentTurnIndex: Math.max(0, newIndex),
  };
}
