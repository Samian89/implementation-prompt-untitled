import { classifyHitForce, HIT_REACTION_TICKS } from "@/lib/game/data/hit-reactions";
import { applyRagdollImpulse, snapRagdollToPose, stepRagdoll, translateRagdoll } from "@/lib/game/physics/ragdoll";
import { debugImpulseFromButtons, latestInputByPlayer } from "./input";
import type { Entity, NamedSystem, SimWorld, SystemFn, Vec3 } from "./types";

const globalSystems: NamedSystem[] = [];

/** Later tickets call this from their own modules to add systems. */
export function registerSystem(name: string, fn: SystemFn): void {
  const existing = globalSystems.findIndex((system) => system.name === name);
  if (existing >= 0) globalSystems[existing] = { name, fn };
  else globalSystems.push({ name, fn });
}

export function getRegisteredSystems(): NamedSystem[] {
  return globalSystems.slice();
}

export function clearRegisteredSystems(): void {
  globalSystems.length = 0;
}

export function applyImpulseToEntity(entity: Entity, force: number, direction?: Vec3): void {
  const hit = entity.components.hitReaction;
  const control = entity.components.control;
  const ragdoll = entity.components.ragdoll;
  if (!hit || !control) return;

  const band = classifyHitForce(force);
  hit.force = force;
  hit.state = band;

  const dir = direction ?? { x: 1, y: 0.35, z: 0.15 };

  if (band === "stumble") {
    control.enabled = true;
    control.uprightAllowed = true;
    hit.remainingTicks = HIT_REACTION_TICKS.stumble;
    if (ragdoll) {
      ragdoll.stiffnessScale = 0.45;
      ragdoll.poseEnabled = true;
      applyRagdollImpulse(ragdoll, force * 0.35, dir);
    }
    return;
  }

  if (band === "knockdown") {
    control.enabled = false;
    control.uprightAllowed = false;
    control.moveX = 0;
    control.moveY = 0;
    hit.remainingTicks = HIT_REACTION_TICKS.knockdown;
    if (ragdoll) {
      ragdoll.stiffnessScale = 0.18;
      ragdoll.poseEnabled = false;
      applyRagdollImpulse(ragdoll, force * 0.55, dir);
    }
    return;
  }

  control.enabled = false;
  control.uprightAllowed = false;
  control.moveX = 0;
  control.moveY = 0;
  hit.remainingTicks = -1;
  if (ragdoll) {
    ragdoll.stiffnessScale = 0.06;
    ragdoll.poseEnabled = false;
    applyRagdollImpulse(ragdoll, force * 0.7, dir);
  }
}

export function inputSystem(world: SimWorld, queued: { commands: InputCommandLike[] }): void {
  const latest = latestInputByPlayer(queued.commands);
  for (const entity of world.entities.values()) {
    const control = entity.components.control;
    if (!control?.playerId) continue;
    const command = latest.get(control.playerId);
    if (!command) continue;
    control.lookYaw = command.lookYaw;
    control.lookPitch = command.lookPitch;
    if (control.enabled) {
      control.moveX = command.moveX;
      control.moveY = command.moveY;
    } else {
      control.moveX = 0;
      control.moveY = 0;
    }
    const transform = entity.components.transform;
    if (transform) {
      transform.yaw = command.lookYaw;
      transform.pitch = command.lookPitch;
    }
    control.buttons = command.buttons;
    const impulse = debugImpulseFromButtons(command.buttons);
    if (impulse !== null) {
      world.applyImpulse(entity.id, impulse);
    }
  }
  queued.commands.length = 0;
}

type InputCommandLike = {
  tick: number;
  playerId: string;
  moveX: number;
  moveY: number;
  lookYaw: number;
  lookPitch: number;
  buttons: number;
};

const WALK_SPEED = 4;

export function locomotionSystem(world: SimWorld): void {
  const dt = world.dt * world.timeScale;
  for (const entity of world.entities.values()) {
    const control = entity.components.control;
    const transform = entity.components.transform;
    if (!control || !transform || !control.enabled) continue;
    const moveX = clamp(control.moveX, -1, 1);
    const moveY = clamp(control.moveY, -1, 1);
    if (moveX === 0 && moveY === 0) continue;
    const yaw = control.lookYaw;
    // yaw 0 faces +Z; moveX is right (+X), moveY is forward (+Z).
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    const dx = (moveX * rightX + moveY * fwdX) * WALK_SPEED * dt;
    const dz = (moveX * rightZ + moveY * fwdZ) * WALK_SPEED * dt;
    transform.x += dx;
    transform.z += dz;
    if (entity.components.ragdoll) {
      translateRagdoll(entity.components.ragdoll, dx, 0, dz);
    }
  }
}

export function hitReactionSystem(world: SimWorld): void {
  for (const entity of world.entities.values()) {
    const hit = entity.components.hitReaction;
    const control = entity.components.control;
    const ragdoll = entity.components.ragdoll;
    const transform = entity.components.transform;
    if (!hit || !control) continue;
    if (hit.state === "death") {
      control.enabled = false;
      control.uprightAllowed = false;
      continue;
    }
    if (hit.remainingTicks > 0) {
      hit.remainingTicks -= 1;
      if (hit.remainingTicks === 0) {
        if (hit.state === "knockdown") {
          control.enabled = true;
          control.uprightAllowed = true;
          if (ragdoll && transform) {
            ragdoll.stiffnessScale = 1;
            ragdoll.poseEnabled = true;
            snapRagdollToPose(ragdoll, transform);
          }
        } else if (hit.state === "stumble") {
          if (ragdoll) {
            ragdoll.stiffnessScale = 1;
            ragdoll.poseEnabled = true;
          }
        }
        hit.state = "idle";
        hit.force = 0;
      }
    }
  }
}

export function balanceAndPhysicsSystem(world: SimWorld): void {
  for (const entity of world.entities.values()) {
    const ragdoll = entity.components.ragdoll;
    const transform = entity.components.transform;
    const control = entity.components.control;
    if (!ragdoll || !transform) continue;
    const moving = Boolean(control?.enabled && (control.moveX !== 0 || control.moveY !== 0));
    const upright = Boolean(control?.uprightAllowed);
    stepRagdoll(ragdoll, transform, {
      dt: world.dt * world.timeScale,
      tick: world.tick,
      uprightAllowed: upright,
      moving,
      gravity: true
    });
    const pelvis = ragdoll.bones.pelvis;
    if (!control?.enabled) {
      transform.x = pelvis.x;
      transform.z = pelvis.z;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
