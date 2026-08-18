import { sampleGroundHeight } from "@/lib/game/physics/ground";
import { weapons } from "@/lib/game/data/weapons";
import { registerSystem } from "@/lib/game/sim/systems";
import type { Entity, ProjectileComponent, SimWorld, Vec3 } from "@/lib/game/sim/types";
import { applyHitToEntity } from "./apply-hit";
import { facingAim, isCombatant, isProjectileEntity, normalize, sphereHitsCapsule, unitCollider } from "./collider";

export const PROJECTILE_SYSTEM_NAME = "projectiles";

let projectileSerial = 1;

export function spawnArrowProjectile(world: SimWorld, source: Entity, aim?: Vec3): Entity {
  const transform = source.components.transform;
  const limb = source.components.ragdoll?.bones.lowerArmL ?? source.components.ragdoll?.bones.lowerArmR;
  const yaw = source.components.control?.lookYaw ?? transform?.yaw ?? 0;
  const pitch = source.components.control?.lookPitch ?? transform?.pitch ?? 0;
  const direction = normalize(aim ?? facingAim(yaw, pitch * 0.35));
  const origin: Vec3 = limb
    ? { x: limb.x, y: limb.y, z: limb.z }
    : {
        x: (transform?.x ?? 0) + direction.x * 0.45,
        y: (transform?.y ?? 0) + 1.35,
        z: (transform?.z ?? 0) + direction.z * 0.45
      };
  const muzzle: Vec3 = {
    x: origin.x + direction.x * 0.55,
    y: origin.y + 0.08,
    z: origin.z + direction.z * 0.55
  };
  const speed = weapons.arrow.speed;
  const projectile: ProjectileComponent = {
    vx: direction.x * speed,
    vy: direction.y * speed,
    vz: direction.z * speed,
    force: weapons.arrow.force,
    radius: weapons.arrow.radius,
    gravity: weapons.arrow.gravity,
    sourceId: source.id,
    weaponId: weapons.arrow.id
  };
  const entity: Entity = {
    id: `projectile-${projectileSerial++}`,
    teamId: source.teamId,
    kind: "projectile",
    components: {
      transform: {
        x: muzzle.x,
        y: muzzle.y,
        z: muzzle.z,
        yaw,
        pitch
      },
      projectile
    }
  };
  return world.spawnEntity(entity);
}

export function listProjectiles(world: SimWorld): Entity[] {
  return [...world.entities.values()].filter(isProjectileEntity);
}

export function stepProjectiles(world: SimWorld): void {
  const dt = world.dt * world.timeScale;
  const doomed: string[] = [];
  for (const entity of world.entities.values()) {
    const body = entity.components.projectile;
    const transform = entity.components.transform;
    if (!body || !transform) continue;

    body.vy -= body.gravity * dt;
    transform.x += body.vx * dt;
    transform.y += body.vy * dt;
    transform.z += body.vz * dt;

    const floor = sampleGroundHeight(transform.x, transform.z) + body.radius;
    if (transform.y <= floor) {
      doomed.push(entity.id);
      continue;
    }

    const hit = firstOverlap(world, entity, body, transform);
    if (hit) {
      applyHitToEntity(
        hit,
        body.force,
        normalize({ x: body.vx, y: body.vy, z: body.vz }),
        world,
        body.weaponId === "arrow" ? "arrow" : "melee"
      );
      doomed.push(entity.id);
    }
  }
  for (const id of doomed) {
    world.entities.delete(id);
  }
}

function firstOverlap(
  world: SimWorld,
  projectile: Entity,
  body: ProjectileComponent,
  transform: { x: number; y: number; z: number }
): Entity | null {
  const point = { x: transform.x, y: transform.y, z: transform.z };
  for (const entity of world.entities.values()) {
    if (entity.id === projectile.id || entity.id === body.sourceId) continue;
    if (!isCombatant(entity)) continue;
    const collider = unitCollider(entity);
    if (!collider) continue;
    if (sphereHitsCapsule(point, body.radius, collider)) return entity;
  }
  return null;
}

export function projectileSystem(world: SimWorld): void {
  stepProjectiles(world);
}

export function ensureProjectileSystem(): void {
  registerSystem(PROJECTILE_SYSTEM_NAME, projectileSystem);
}

ensureProjectileSystem();
