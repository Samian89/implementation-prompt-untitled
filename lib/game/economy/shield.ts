import type { Entity, Vec3 } from "@/lib/game/sim/types";

export const SHIELD_ARROW_FACTOR = 0.28;

export function attachShield(entity: Entity): void {
  entity.components.shield = {
    equipped: true,
    arrowFactor: SHIELD_ARROW_FACTOR
  };
  const upgrades = entity.components.upgrades ?? { sword: false, shield: false };
  upgrades.shield = true;
  entity.components.upgrades = upgrades;
}

export function hasShield(entity: Entity): boolean {
  return Boolean(entity.components.shield?.equipped || entity.components.upgrades?.shield);
}

/** Incoming direction dotted with facing. Negative = striking the front. */
export function frontHitDot(entity: Entity, direction: Vec3): number {
  const yaw = entity.components.control?.lookYaw ?? entity.components.transform?.yaw ?? 0;
  const len = Math.hypot(direction.x, direction.z) || 1;
  const nx = direction.x / len;
  const nz = direction.z / len;
  const facingX = Math.sin(yaw);
  const facingZ = Math.cos(yaw);
  return nx * facingX + nz * facingZ;
}

export function isFrontHit(entity: Entity, direction?: Vec3): boolean {
  if (!direction) return false;
  return frontHitDot(entity, direction) < -0.15;
}

export type ShieldResolve = {
  force: number;
  blockedBy: string | null;
};

export function resolveShieldHit(
  target: Entity,
  force: number,
  direction?: Vec3,
  kind: "melee" | "arrow" = "melee"
): ShieldResolve {
  if (!hasShield(target) || !isFrontHit(target, direction)) {
    return { force, blockedBy: null };
  }
  if (kind === "arrow") {
    const factor = target.components.shield?.arrowFactor ?? SHIELD_ARROW_FACTOR;
    return { force: force * factor, blockedBy: "shield" };
  }
  return { force: 0, blockedBy: "shield" };
}
