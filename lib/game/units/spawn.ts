import { ensureRoamSystem, ensureRoamComponent } from "@/lib/game/ai/roam";
import { ensureTacticsSystem } from "@/lib/game/ai/tactics";
import { ensureFollowSystem, ensureFormationLoadout } from "@/lib/game/command/orders";
import { MAX_SQUAD_SIZE, requireUnitDef, type UnitDefId } from "@/lib/game/data/units";
import { ensureAbilitySystem } from "@/lib/game/gas/ability-system";
import { createJointedRagdoll } from "@/lib/game/physics/ragdoll";
import { spawnCaptain } from "@/lib/game/sim/engine";
import type { Entity, EntityKind, SimWorld } from "@/lib/game/sim/types";
import { attachUnitAppearance } from "./appearance";

ensureRoamSystem();
ensureFollowSystem();
ensureTacticsSystem();

let nextUnitSerial = 1;

export const SANDBOX_ROSTER: UnitDefId[] = [
  "swordsman",
  "swordsman",
  "swordsman",
  "swordsman",
  "archer",
  "archer"
];

export type CreateUnitOptions = {
  id?: string;
  kind: EntityKind;
  unitDefId: UnitDefId | string;
  teamId: string;
  captainId: string;
  x: number;
  z: number;
  y?: number;
  slotIndex?: number;
  playerId?: string | null;
  drivenBy?: "player" | "ai" | "none";
};

export type SpawnSquadResult =
  | { ok: true; entities: Entity[] }
  | { ok: false; error: "squad_cap"; entities: Entity[] };

export function countSquadBots(world: SimWorld, captainId: string): number {
  let count = 0;
  for (const entity of world.entities.values()) {
    if (entity.kind === "bot" && entity.components.squad?.captainId === captainId) {
      count += 1;
    }
  }
  return count;
}

export function slotOffset(slotIndex: number): { x: number; z: number } {
  const ring = 2.3 + Math.floor(slotIndex / 8) * 1.35;
  const spoke = slotIndex % 8;
  const angle = (spoke / 8) * Math.PI * 2 + Math.floor(slotIndex / 8) * 0.35;
  return { x: Math.cos(angle) * ring, z: Math.sin(angle) * ring };
}

export function createUnit(opts: CreateUnitOptions): Entity {
  const def = requireUnitDef(opts.unitDefId);
  const x = opts.x;
  const y = opts.y ?? 0;
  const z = opts.z;
  const isBot = opts.kind === "bot";
  const entity: Entity = {
    id: opts.id ?? `${opts.kind}-${def.id}-${nextUnitSerial++}`,
    teamId: opts.teamId,
    kind: opts.kind,
    components: {
      transform: { x, y, z, yaw: 0, pitch: 0 },
      control: {
        enabled: true,
        uprightAllowed: true,
        playerId: opts.playerId ?? (isBot ? null : "local"),
        drivenBy: opts.drivenBy ?? (isBot ? "ai" : "player"),
        moveX: 0,
        moveY: 0,
        lookYaw: 0,
        lookPitch: 0
      },
      ragdoll: createJointedRagdoll({ x, y, z }),
      hitReaction: { state: "idle", force: 0, remainingTicks: 0 },
      squad: {
        captainId: opts.captainId,
        slotIndex: opts.slotIndex ?? 0
      }
    }
  };
  attachUnitAppearance(entity, def.id);
  ensureAbilitySystem(entity, def.id, def.role === "ranged" ? "ranged" : "melee");
  if (isBot) {
    entity.components.control!.playerId = null;
    entity.components.control!.drivenBy = opts.drivenBy ?? "ai";
    ensureRoamComponent(entity, x, z);
  }
  return entity;
}

export function spawnUnit(world: SimWorld, opts: CreateUnitOptions): Entity {
  return world.spawnEntity(createUnit(opts));
}

export function dressCaptain(entity: Entity): Entity {
  attachUnitAppearance(entity, "captain");
  ensureAbilitySystem(entity, "captain", "melee");
  entity.components.squad = {
    captainId: entity.id,
    slotIndex: -1
  };
  ensureFormationLoadout(entity);
  return entity;
}

export function spawnSquad(world: SimWorld, captainId: string, roster: Array<UnitDefId | string>): SpawnSquadResult {
  const existing = countSquadBots(world, captainId);
  if (existing + roster.length > MAX_SQUAD_SIZE) {
    return { ok: false, error: "squad_cap", entities: [] };
  }

  const captain = world.getEntity(captainId);
  const originX = captain?.components.transform?.x ?? 0;
  const originZ = captain?.components.transform?.z ?? 0;
  const teamId = captain?.teamId ?? "team-0";

  if (captain && !captain.components.appearance) {
    dressCaptain(captain);
  }

  const entities: Entity[] = [];
  for (let i = 0; i < roster.length; i++) {
    const slotIndex = existing + i;
    const offset = slotOffset(slotIndex);
    const unit = spawnUnit(world, {
      kind: "bot",
      unitDefId: roster[i]!,
      teamId,
      captainId,
      slotIndex,
      x: originX + offset.x,
      z: originZ + offset.z
    });
    entities.push(unit);
  }
  return { ok: true, entities };
}

export function spawnPlaySandbox(world: SimWorld): { captain: Entity; bots: Entity[] } {
  const captain = spawnCaptain(world, { playerId: "local", x: 0, z: 0 });
  dressCaptain(captain);
  const result = spawnSquad(world, captain.id, SANDBOX_ROSTER);
  return { captain, bots: result.ok ? result.entities : [] };
}
