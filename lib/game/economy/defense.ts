import { UPGRADE_COST, type UpgradeId } from "@/lib/game/data/economy";
import { getDefense, type DefenseId } from "@/lib/game/data/defenses";
import { getMatch } from "@/lib/game/world/install";
import { applyDefenseToFort, getFort, homeFortForTeam, type FortState } from "@/lib/game/world/fort";
import { attachShield } from "@/lib/game/economy/shield";
import type { Entity, SimWorld } from "@/lib/game/sim/types";
import { getTeamUpgrades, getTreasury, setTeamUpgrade, trySpend } from "./treasury";
import { isAtOwnedFort } from "./recruit";

export type BuyDefenseResult =
  | { ok: true; fort: FortState; treasury: number }
  | { ok: false; error: "cannot_afford" | "not_at_owned_fort" | "unknown_defense" | "missing_fort"; treasury: number };

export function tryBuyDefense(
  world: SimWorld,
  defenseId: DefenseId | string,
  opts: { teamId?: string; fortId?: string; captainId?: string } = {}
): BuyDefenseResult {
  const def = getDefense(defenseId);
  const teamId = opts.teamId ?? inferTeamId(world, opts.captainId) ?? "team-0";
  const treasury = getTreasury(world, teamId);
  if (!def) return { ok: false, error: "unknown_defense", treasury };

  const captain = opts.captainId ? world.getEntity(opts.captainId) : findCaptain(world, teamId);
  const phase = getMatch(world).phase;
  if (phase !== "recruit" && captain && !isAtOwnedFort(world, captain, opts.fortId)) {
    return { ok: false, error: "not_at_owned_fort", treasury };
  }

  const fort =
    (opts.fortId ? getFort(world, opts.fortId) : undefined) ??
    homeFortForTeam(world, teamId, captain?.components.formationLoadout?.homeFortId);
  if (!fort) return { ok: false, error: "missing_fort", treasury };

  const spent = trySpend(world, teamId, def.cost);
  if (!spent.ok) return { ok: false, error: "cannot_afford", treasury: spent.treasury };

  applyDefenseToFort(fort, def.id);
  return { ok: true, fort, treasury: spent.treasury };
}

export type BuyUpgradeResult =
  | { ok: true; treasury: number }
  | { ok: false; error: "cannot_afford" | "already_owned"; treasury: number };

export function tryBuyUpgrade(world: SimWorld, upgradeId: UpgradeId, teamId = "team-0"): BuyUpgradeResult {
  const current = getTeamUpgrades(world, teamId);
  const treasury = getTreasury(world, teamId);
  if (current[upgradeId]) return { ok: false, error: "already_owned", treasury };
  const spent = trySpend(world, teamId, UPGRADE_COST[upgradeId]);
  if (!spent.ok) return { ok: false, error: "cannot_afford", treasury: spent.treasury };
  setTeamUpgrade(world, teamId, upgradeId, true);
  applyUpgradeToTeam(world, teamId, upgradeId);
  return { ok: true, treasury: spent.treasury };
}

export function applyUpgradeToTeam(world: SimWorld, teamId: string, upgradeId: UpgradeId): void {
  for (const entity of world.entities.values()) {
    if (entity.teamId !== teamId) continue;
    if (entity.kind !== "captain" && entity.kind !== "bot") continue;
    applyUpgradeToEntity(entity, upgradeId);
  }
}

export function applyUpgradeToEntity(entity: Entity, upgradeId: UpgradeId): void {
  const upgrades = entity.components.upgrades ?? { sword: false, shield: false };
  upgrades[upgradeId] = true;
  entity.components.upgrades = upgrades;
  if (upgradeId === "shield") attachShield(entity);
}

function inferTeamId(world: SimWorld, captainId?: string): string | undefined {
  if (captainId) return world.getEntity(captainId)?.teamId;
  return findCaptain(world, "team-0")?.teamId ?? "team-0";
}

function findCaptain(world: SimWorld, teamId: string): Entity | undefined {
  for (const entity of world.entities.values()) {
    if (entity.kind === "captain" && entity.teamId === teamId) return entity;
  }
  return undefined;
}
