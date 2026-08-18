import { COMMAND_FOLLOW } from "@/lib/game/data/commands";
import type { DefenseId } from "@/lib/game/data/defenses";
import { issueCommand } from "@/lib/game/command/orders";
import { tryBuyDefense, tryBuyUpgrade } from "@/lib/game/economy/defense";
import { tryRecruit } from "@/lib/game/economy/recruit";
import { readyAndMaybeBegin } from "@/lib/game/match/rules";
import type { SimWorld } from "@/lib/game/sim/types";
import { findCaptainByPlayerId } from "./session";

/** Marks one local captain ready and issues Follow without forcing live for the others. */
export function marchSplitCaptain(world: SimWorld, playerId: string): boolean {
  const captain = findCaptainByPlayerId(world.entities.values(), playerId);
  if (!captain) return false;
  readyAndMaybeBegin(world, captain.id);
  issueCommand(world, captain.id, COMMAND_FOLLOW);
  return true;
}

export function recruitSplitCaptain(
  world: SimWorld,
  playerId: string,
  unitDefId: "swordsman" | "archer"
): boolean {
  const captain = findCaptainByPlayerId(world.entities.values(), playerId);
  if (!captain) return false;
  return tryRecruit(world, { captainId: captain.id, unitDefId }).ok;
}

export function buyDefenseSplitCaptain(world: SimWorld, playerId: string, id: DefenseId): boolean {
  const captain = findCaptainByPlayerId(world.entities.values(), playerId);
  if (!captain) return false;
  return tryBuyDefense(world, id, { teamId: captain.teamId, captainId: captain.id }).ok;
}

export function buyUpgradeSplitCaptain(
  world: SimWorld,
  playerId: string,
  id: "sword" | "shield"
): boolean {
  const captain = findCaptainByPlayerId(world.entities.values(), playerId);
  if (!captain) return false;
  return tryBuyUpgrade(world, id, captain.teamId).ok;
}
