import { registerSystem } from "@/lib/game/sim/systems";
import type { Entity, RoamComponent, SimWorld } from "@/lib/game/sim/types";

export const DEFAULT_ROAM_RADIUS = 6;
export const ROAM_SYSTEM_NAME = "roam";

const ARRIVE_DISTANCE = 0.4;
const MIN_WANDER_DISTANCE = 2;
const IDLE_TICKS_MIN = 60;
const IDLE_TICKS_RANGE = 121;

function shouldRoam(entity: Entity): boolean {
  const control = entity.components.control;
  if (!control) return false;
  if (entity.kind === "captain" && control.drivenBy === "player") return false;
  if (control.drivenBy !== "ai") return false;
  if (entity.components.order != null) return false;
  return true;
}

function roamOrigin(world: SimWorld, entity: Entity, roam: RoamComponent): { x: number; z: number } {
  const squad = entity.components.squad;
  if (squad?.captainId) {
    const captain = world.getEntity(squad.captainId);
    const pose = captain?.components.transform;
    if (pose) return { x: pose.x, z: pose.z };
  }
  return { x: roam.spawnX, z: roam.spawnZ };
}

function pickWanderPoint(
  world: SimWorld,
  origin: { x: number; z: number },
  radius: number,
  fromX: number,
  fromZ: number
): { x: number; z: number } {
  const span = Math.max(0.5, radius - MIN_WANDER_DISTANCE);
  for (let attempt = 0; attempt < 8; attempt++) {
    const angle = world.rng() * Math.PI * 2;
    const dist = MIN_WANDER_DISTANCE + world.rng() * span;
    const x = origin.x + Math.cos(angle) * dist;
    const z = origin.z + Math.sin(angle) * dist;
    if (Math.hypot(x - fromX, z - fromZ) > 1.15) return { x, z };
  }
  return { x: origin.x + radius, z: origin.z };
}

export function ensureRoamComponent(entity: Entity, x: number, z: number, radius = DEFAULT_ROAM_RADIUS): RoamComponent {
  const existing = entity.components.roam;
  if (existing) return existing;
  const roam: RoamComponent = {
    spawnX: x,
    spawnZ: z,
    targetX: null,
    targetZ: null,
    idleTicksRemaining: 0,
    radius
  };
  entity.components.roam = roam;
  return roam;
}

export function roamSystem(world: SimWorld): void {
  for (const entity of world.entities.values()) {
    if (!shouldRoam(entity)) continue;
    const control = entity.components.control;
    const transform = entity.components.transform;
    if (!control || !transform) continue;

    const roam = ensureRoamComponent(entity, transform.x, transform.z);

    if (!control.enabled) {
      control.moveX = 0;
      control.moveY = 0;
      continue;
    }

    if (roam.idleTicksRemaining > 0) {
      roam.idleTicksRemaining -= 1;
      control.moveX = 0;
      control.moveY = 0;
      continue;
    }

    if (roam.targetX === null || roam.targetZ === null) {
      const origin = roamOrigin(world, entity, roam);
      const target = pickWanderPoint(world, origin, roam.radius, transform.x, transform.z);
      roam.targetX = target.x;
      roam.targetZ = target.z;
    }

    const dx = roam.targetX - transform.x;
    const dz = roam.targetZ - transform.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= ARRIVE_DISTANCE) {
      roam.targetX = null;
      roam.targetZ = null;
      roam.idleTicksRemaining = IDLE_TICKS_MIN + Math.floor(world.rng() * IDLE_TICKS_RANGE);
      control.moveX = 0;
      control.moveY = 0;
      continue;
    }

    control.lookYaw = Math.atan2(dx, dz);
    transform.yaw = control.lookYaw;
    control.moveX = 0;
    control.moveY = 1;
  }
}

export function ensureRoamSystem(): void {
  registerSystem(ROAM_SYSTEM_NAME, roamSystem);
}

ensureRoamSystem();
