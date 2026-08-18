import { STARTING_TREASURY } from "@/lib/game/data/economy";
import type { SimWorld } from "@/lib/game/sim/types";

export type TeamUpgrades = {
  sword: boolean;
  shield: boolean;
};

export type EconomyBag = {
  treasuries: Record<string, number>;
  inventories: Record<string, string[]>;
  upgrades: Record<string, TeamUpgrades>;
  nextGearIndex: number;
};

export function emptyEconomy(starting = STARTING_TREASURY): EconomyBag {
  return {
    treasuries: {
      "team-0": starting,
      "team-1": starting,
      "team-2": starting,
      "team-3": starting
    },
    inventories: {},
    upgrades: {},
    nextGearIndex: 0
  };
}

export function getEconomy(world: Pick<SimWorld, "bags">): EconomyBag {
  const existing = world.bags.economy;
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const bag = existing as EconomyBag;
    if (bag.treasuries) return bag;
  }
  const created = emptyEconomy();
  world.bags.economy = created;
  return created;
}

export function getTreasury(world: Pick<SimWorld, "bags">, teamId: string): number {
  const bag = getEconomy(world);
  return bag.treasuries[teamId] ?? 0;
}

export function setTreasury(world: Pick<SimWorld, "bags">, teamId: string, amount: number): number {
  const bag = getEconomy(world);
  bag.treasuries[teamId] = Math.max(0, Math.round(amount));
  world.bags.economy = bag;
  return bag.treasuries[teamId]!;
}

export type SpendResult = { ok: true; treasury: number } | { ok: false; error: "cannot_afford"; treasury: number };

export function trySpend(world: Pick<SimWorld, "bags">, teamId: string, cost: number): SpendResult {
  const treasury = getTreasury(world, teamId);
  if (treasury < cost) return { ok: false, error: "cannot_afford", treasury };
  return { ok: true, treasury: setTreasury(world, teamId, treasury - cost) };
}

export function grantTreasury(world: Pick<SimWorld, "bags">, teamId: string, amount: number): number {
  return setTreasury(world, teamId, getTreasury(world, teamId) + amount);
}

export function getTeamUpgrades(world: Pick<SimWorld, "bags">, teamId: string): TeamUpgrades {
  const bag = getEconomy(world);
  return bag.upgrades[teamId] ?? { sword: false, shield: false };
}

export function setTeamUpgrade(
  world: Pick<SimWorld, "bags">,
  teamId: string,
  id: keyof TeamUpgrades,
  value: boolean
): void {
  const bag = getEconomy(world);
  const current = bag.upgrades[teamId] ?? { sword: false, shield: false };
  current[id] = value;
  bag.upgrades[teamId] = current;
  world.bags.economy = bag;
}
