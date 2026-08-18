import type { Entity, Snapshot, SimWorld } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && value.constructor === Object;
}

/** Deep clone via JSON so snapshots never leak class instances or functions. */
export function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function assertSerializable(value: unknown, path = "value"): void {
  if (value === null || value === undefined) return;
  const kind = typeof value;
  if (kind === "function") {
    throw new Error(`snapshot is not serializable: function at ${path}`);
  }
  if (kind !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertSerializable(item, `${path}[${i}]`));
    return;
  }
  if (!isPlainObject(value)) {
    const name = (value as object).constructor?.name ?? "unknown";
    throw new Error(`snapshot is not serializable: ${name} instance at ${path}`);
  }
  for (const [key, child] of Object.entries(value)) {
    assertSerializable(child, `${path}.${key}`);
  }
}

export function buildSnapshot(world: Pick<SimWorld, "tick" | "timeScale" | "entities" | "bags">): Snapshot {
  const entities: Entity[] = [];
  for (const entity of world.entities.values()) {
    entities.push(cloneSerializable(entity));
  }
  const snapshot: Snapshot = {
    tick: world.tick,
    timeScale: world.timeScale,
    entities,
    bags: cloneSerializable(world.bags)
  };
  assertSerializable(snapshot, "snapshot");
  return snapshot;
}
