import type { Entity, Vec3 } from "@/lib/game/sim/types";

export type UnitCollider = {
  entityId: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
};

const DEFAULT_RADIUS = 0.42;
const DEFAULT_HEIGHT = 1.85;

export function isCombatant(entity: Entity): boolean {
  return entity.kind === "captain" || entity.kind === "bot";
}

export function isProjectileEntity(entity: Entity): boolean {
  return entity.kind === "projectile" || entity.components.projectile != null;
}

export function unitCollider(entity: Entity): UnitCollider | null {
  if (!isCombatant(entity)) return null;
  const transform = entity.components.transform;
  if (!transform) return null;
  const pelvis = entity.components.ragdoll?.bones.pelvis;
  return {
    entityId: entity.id,
    x: pelvis?.x ?? transform.x,
    y: transform.y,
    z: pelvis?.z ?? transform.z,
    radius: DEFAULT_RADIUS,
    height: DEFAULT_HEIGHT
  };
}

/** Closest distance from a segment to a vertical capsule. Negative means penetration. */
export function segmentCapsuleDistance(start: Vec3, end: Vec3, collider: UnitCollider): number {
  const closest = closestPointOnSegment(start, end, {
    x: collider.x,
    y: clamp(start.y, collider.y + collider.radius, collider.y + collider.height - collider.radius),
    z: collider.z
  });
  const cx = collider.x;
  const cy = clamp(closest.y, collider.y + collider.radius, collider.y + collider.height - collider.radius);
  const cz = collider.z;
  return Math.hypot(closest.x - cx, closest.y - cy, closest.z - cz) - collider.radius;
}

export function sphereHitsCapsule(point: Vec3, radius: number, collider: UnitCollider): boolean {
  const cy = clamp(point.y, collider.y + collider.radius, collider.y + collider.height - collider.radius);
  const dist = Math.hypot(point.x - collider.x, point.y - cy, point.z - collider.z);
  return dist <= radius + collider.radius;
}

export function closestPointOnSegment(a: Vec3, b: Vec3, p: Vec3): Vec3 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dy * dy + dz * dz;
  if (lenSq < 1e-8) return { x: a.x, y: a.y, z: a.z };
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy + (p.z - a.z) * dz) / lenSq, 0, 1);
  return { x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t };
}

export function facingAim(yaw: number, pitch = 0): Vec3 {
  const cp = Math.cos(pitch);
  return {
    x: Math.sin(yaw) * cp,
    y: -Math.sin(pitch),
    z: Math.cos(yaw) * cp
  };
}

export function normalize(vec: Vec3): Vec3 {
  const len = Math.hypot(vec.x, vec.y, vec.z) || 1;
  return { x: vec.x / len, y: vec.y / len, z: vec.z / len };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
