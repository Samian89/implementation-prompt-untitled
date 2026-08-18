import { UNIT_COSTS, type RecruitableId } from "@/lib/game/data/economy";
import { MAX_SQUAD_SIZE } from "@/lib/game/data/units";
import { countSquadBots, spawnUnit } from "@/lib/game/units/spawn";
import { getMatch } from "@/lib/game/world/install";
import { getFort, homeFortForTeam, listForts, pointInCourtyard } from "@/lib/game/world/fort";
import type { Entity, SimWorld } from "@/lib/game/sim/types";
import { attachShield } from "./shield";
import { getTeamUpgrades, getTreasury, trySpend } from "./treasury";

export type RecruitError = "squad_cap" | "cannot_afford" | "not_at_owned_fort" | "missing_captain";

export type RecruitResult =
  | { ok: true; entities: Entity[]; treasury: number }
  | { ok: false; error: RecruitError; treasury: number };

export type RecruitOptions = {
  captainId: string;
  unitDefId: RecruitableId | string;
  fortId?: string;
  count?: number;
};

export function isAtOwnedFort(world: SimWorld, entity: Entity, fortId?: string): boolean {
  const transform = entity.components.transform;
  if (!transform) return false;
  const forts = fortId ? [getFort(world, fortId)].filter(Boolean) : listForts(world);
  for (const fort of forts) {
    if (!fort || fort.ownerTeamId !== entity.teamId) continue;
    if (pointInCourtyard(fort, transform.x, transform.z)) return true;
  }
  return false;
}

export function tryRecruit(world: SimWorld, opts: RecruitOptions): RecruitResult {
  const captain = world.getEntity(opts.captainId);
  const treasury = captain ? getTreasury(world, captain.teamId) : 0;
  if (!captain) return { ok: false, error: "missing_captain", treasury };

  const unitDefId = opts.unitDefId === "archer" ? "archer" : "swordsman";
  const count = Math.max(1, opts.count ?? 1);
  const cost = UNIT_COSTS[unitDefId] * count;
  const living = countSquadBots(world, captain.id);
  if (living + count > MAX_SQUAD_SIZE) {
    return { ok: false, error: "squad_cap", treasury };
  }

  const phase = getMatch(world).phase;
  if (phase !== "recruit" && !isAtOwnedFort(world, captain, opts.fortId)) {
    return { ok: false, error: "not_at_owned_fort", treasury };
  }

  const spent = trySpend(world, captain.teamId, cost);
  if (!spent.ok) return { ok: false, error: "cannot_afford", treasury: spent.treasury };

  const home = homeFortForTeam(world, captain.teamId, opts.fortId ?? captain.components.formationLoadout?.homeFortId);
  const originX = home?.spawnX ?? captain.components.transform?.x ?? 0;
  const originZ = home?.spawnZ ?? captain.components.transform?.z ?? 0;
  const entities: Entity[] = [];
  for (let i = 0; i < count; i++) {
    const slotIndex = living + i;
    const angle = (slotIndex / Math.max(1, MAX_SQUAD_SIZE)) * Math.PI * 2;
    const unit = spawnUnit(world, {
      kind: "bot",
      unitDefId,
      teamId: captain.teamId,
      captainId: captain.id,
      slotIndex,
      x: originX + Math.cos(angle) * 1.4,
      z: originZ + Math.sin(angle) * 1.4
    });
    const upgrades = getTeamUpgrades(world, captain.teamId);
    unit.components.upgrades = { sword: upgrades.sword, shield: upgrades.shield };
    if (upgrades.shield) attachShield(unit);
    entities.push(unit);
  }
  return { ok: true, entities, treasury: spent.treasury };
}
