import { CAPTURE_PAYOUT } from "@/lib/game/data/economy";
import { nextGearId, type GearId } from "@/lib/game/data/gear";
import { grantGear } from "@/lib/game/economy/gear";
import { getEconomy, grantTreasury } from "@/lib/game/economy/treasury";
import { isLivingCombatant } from "@/lib/game/command/orders";
import { registerSystem } from "@/lib/game/sim/systems";
import type { Entity, SimWorld } from "@/lib/game/sim/types";
import { listForts, pointInCourtyard, setFortOwner, type FortState } from "./fort";

export const CAPTURE_SYSTEM_NAME = "capture";

export function unitInFortForCapture(fort: FortState, entity: Entity): boolean {
  if (!isLivingCombatant(entity)) return false;
  const transform = entity.components.transform;
  if (!transform) return false;
  if (!pointInCourtyard(fort, transform.x, transform.z)) return false;
  if (fort.defense.gate !== "none" && fort.defense.gateHp > 0) {
    const climb = entity.components.climb;
    if (!(climb?.fortId === fort.id && climb.completed)) return false;
  }
  return true;
}

export function occupantsOf(world: SimWorld, fort: FortState): Entity[] {
  const inside: Entity[] = [];
  for (const entity of world.entities.values()) {
    if (unitInFortForCapture(fort, entity)) inside.push(entity);
  }
  return inside;
}

export function tryCaptureFort(world: SimWorld, fort: FortState): boolean {
  const inside = occupantsOf(world, fort);
  if (inside.length === 0) return false;
  const teams = new Set(inside.map((entity) => entity.teamId));
  if (teams.size !== 1) return false;
  const teamId = inside[0]!.teamId;
  if (fort.ownerTeamId === teamId) return false;
  const previous = fort.ownerTeamId;
  setFortOwner(fort, teamId);
  grantCaptureReward(world, teamId, inside[0]!);
  const captain = findTeamCaptain(world, teamId);
  if (captain?.components.formationLoadout) {
    captain.components.formationLoadout.homeFortId = fort.id;
  }
  void previous;
  return true;
}

function grantCaptureReward(world: SimWorld, teamId: string, capturer: Entity): GearId {
  grantTreasury(world, teamId, CAPTURE_PAYOUT);
  const economy = getEconomy(world);
  const gearId = nextGearId(economy.nextGearIndex);
  economy.nextGearIndex += 1;
  world.bags.economy = economy;
  grantGear(world, capturer, gearId);
  return gearId;
}

function findTeamCaptain(world: SimWorld, teamId: string): Entity | undefined {
  for (const entity of world.entities.values()) {
    if (entity.kind === "captain" && entity.teamId === teamId) return entity;
  }
  return undefined;
}

export function captureSystem(world: SimWorld): void {
  if (!world.bags.forts) return;
  for (const fort of listForts(world)) {
    tryCaptureFort(world, fort);
  }
}

export function ensureCaptureSystem(): void {
  registerSystem(CAPTURE_SYSTEM_NAME, captureSystem);
}

ensureCaptureSystem();
