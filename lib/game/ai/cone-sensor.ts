import { targetPriority } from "@/lib/game/combat/target-priority";
import { SENSORS, type CombatSensor } from "@/lib/game/data/sensors";
import type { Entity, EntityKind } from "@/lib/game/sim/types";

export type ConeOrigin = {
  x: number;
  y?: number;
  z: number;
  yaw?: number;
  facingX?: number;
  facingZ?: number;
};

export type ConeTargetLike =
  | Entity
  | {
      x: number;
      y?: number;
      z: number;
      kind?: EntityKind;
    };

function originPose(origin: ConeOrigin | Entity): ConeOrigin {
  if ("components" in origin) {
    const transform = origin.components.transform;
    const control = origin.components.control;
    return {
      x: transform?.x ?? 0,
      y: transform?.y ?? 0,
      z: transform?.z ?? 0,
      yaw: control?.lookYaw ?? transform?.yaw ?? 0
    };
  }
  return origin;
}

function targetPose(target: ConeTargetLike): { x: number; z: number } {
  if ("components" in target) {
    const transform = target.components.transform;
    return { x: transform?.x ?? 0, z: transform?.z ?? 0 };
  }
  return { x: target.x, z: target.z };
}

function facingOf(origin: ConeOrigin): { x: number; z: number } {
  if (origin.facingX != null && origin.facingZ != null) {
    return { x: origin.facingX, z: origin.facingZ };
  }
  const yaw = origin.yaw ?? 0;
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

function priorityOf(target: ConeTargetLike): number {
  if ("components" in target) return targetPriority(target);
  if (target.kind === "captain") return 2;
  if (target.kind === "bot") return 1;
  return 1;
}

/**
 * Score = max(0, 1 - distance/range) * (inCone ? 1 : 0) * targetPriority.
 * Behind the facing vector or outside range is 0.
 */
export function scoreConeTarget(
  origin: ConeOrigin | Entity,
  target: ConeTargetLike,
  sensor: CombatSensor = SENSORS.combat
): number {
  const pose = originPose(origin);
  const dest = targetPose(target);
  const dx = dest.x - pose.x;
  const dz = dest.z - pose.z;
  const distance = Math.hypot(dx, dz);
  if (distance > sensor.range || distance < 1e-8) return 0;

  const facing = facingOf(pose);
  const faceLen = Math.hypot(facing.x, facing.z) || 1;
  const fx = facing.x / faceLen;
  const fz = facing.z / faceLen;
  const dot = (dx * fx + dz * fz) / distance;
  if (dot <= 0) return 0;

  const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
  const half = (sensor.halfAngleDeg * Math.PI) / 180;
  if (angle > half) return 0;

  const falloff = Math.max(0, 1 - distance / sensor.range);
  return falloff * priorityOf(target);
}

export function bestConeHostile(
  world: { entities: Map<string, Entity> },
  sensorEntity: Entity,
  sensor: CombatSensor = SENSORS.combat
): { target: Entity; score: number } | null {
  let best: { target: Entity; score: number } | null = null;
  for (const other of world.entities.values()) {
    if (other.id === sensorEntity.id) continue;
    if (other.kind !== "captain" && other.kind !== "bot") continue;
    if (other.teamId === sensorEntity.teamId) continue;
    const score = scoreConeTarget(sensorEntity, other, sensor);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { target: other, score };
  }
  return best;
}
