import { registerLocomotionAdjust } from "@/lib/game/sim/systems";
import type { Entity, SimWorld } from "@/lib/game/sim/types";
import { isCourtyardSealed, listForts, pointInCourtyard, pointInWall, type FortState } from "./fort";
import { terrainSpeedScale } from "./terrain";

const PALISADE_CLIMB_RATE = 1 / 180;
const HIGH_CLIMB_RATE = 1 / 90;

export function unitHasCompletedClimb(entity: Entity, fortId: string): boolean {
  const climb = entity.components.climb;
  return Boolean(climb && climb.fortId === fortId && climb.completed);
}

export function advanceClimb(entity: Entity, fort: FortState): void {
  const rate = fort.defense.wall === "high" ? HIGH_CLIMB_RATE : PALISADE_CLIMB_RATE;
  const existing = entity.components.climb;
  if (!existing || existing.fortId !== fort.id) {
    entity.components.climb = { fortId: fort.id, progress: rate, completed: false };
    return;
  }
  existing.progress = Math.min(1, existing.progress + rate);
  if (existing.progress >= 1) existing.completed = true;
}

export function adjustWorldStep(
  world: SimWorld,
  entity: Entity,
  from: { x: number; z: number },
  proposed: { x: number; z: number }
): { x: number; z: number } {
  if (!world.bags.forts) return proposed;
  const scale = terrainSpeedScale(from.x, from.z);
  const x = from.x + (proposed.x - from.x) * scale;
  const z = from.z + (proposed.z - from.z) * scale;

  for (const fort of listForts(world)) {
    if (fort.defense.wall !== "none" && pointInWall(fort, x, z)) {
      advanceClimb(entity, fort);
    }
    if (!isCourtyardSealed(fort)) continue;
    const wasIn = pointInCourtyard(fort, from.x, from.z);
    const nowIn = pointInCourtyard(fort, x, z);
    if (!wasIn && nowIn && !unitHasCompletedClimb(entity, fort.id)) {
      return { x: from.x, z: from.z };
    }
  }
  return { x, z };
}

export function ensureWorldMovement(): void {
  registerLocomotionAdjust(adjustWorldStep);
}

ensureWorldMovement();
