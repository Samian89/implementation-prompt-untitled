import { bestConeHostile } from "@/lib/game/ai/cone-sensor";
import { isInWeaponReach } from "@/lib/game/ai/tactics";
import {
  COMMAND_FOLLOW,
  COMMAND_FORM_BOX,
  COMMAND_HOLD
} from "@/lib/game/data/commands";
import { MELEE_STRIKE } from "@/lib/game/data/abilities";
import {
  AI_PERSONALITIES,
  requirePersonality,
  type PersonalityId
} from "@/lib/game/data/ai-personalities";
import { SENSORS } from "@/lib/game/data/sensors";
import { tryBuyDefense, tryBuyUpgrade } from "@/lib/game/economy/defense";
import { tryRecruit } from "@/lib/game/economy/recruit";
import { tryActivate } from "@/lib/game/gas/ability-system";
import { isLivingCombatant, issueCommand, listLivingSquadBots } from "@/lib/game/command/orders";
import { isDeadCombatant } from "@/lib/game/lifecycle/respawn";
import { registerSystem } from "@/lib/game/sim/systems";
import type { Entity, KingComponent, SimWorld } from "@/lib/game/sim/types";
import { getMatch } from "@/lib/game/world/install";
import {
  homeFortForTeam,
  isCourtyardSealed,
  listForts,
  pointInCourtyard,
  type FortState
} from "@/lib/game/world/fort";
import { COURTYARD_HALF, FORT_GATE_DIR, type FortId } from "@/lib/game/world/map";
import { RIVER } from "@/lib/game/world/terrain";
import { markCaptainReady } from "@/lib/game/match/rules";

export const KING_SYSTEM_NAME = "aiKing";

const ARRIVE_DISTANCE = 1.15;
const GATE_STRIKE_RANGE = 3.4;

export function attachKing(captain: Entity, personality: PersonalityId | string): KingComponent {
  const king: KingComponent = {
    personality,
    state: "recruit",
    ready: false
  };
  captain.components.king = king;
  return king;
}

export function executePersonalitySpend(world: SimWorld, captain: Entity, personality?: string): void {
  const id = (personality ?? captain.components.king?.personality ?? "balanced") as PersonalityId;
  const plan = requirePersonality(id);
  const homeId = captain.components.formationLoadout?.homeFortId;
  for (const defenseId of plan.defenses) {
    tryBuyDefense(world, defenseId, {
      teamId: captain.teamId,
      captainId: captain.id,
      fortId: homeId
    });
  }
  if (plan.units.swordsman > 0) {
    tryRecruit(world, { captainId: captain.id, unitDefId: "swordsman", count: plan.units.swordsman, fortId: homeId });
  }
  if (plan.units.archer > 0) {
    tryRecruit(world, { captainId: captain.id, unitDefId: "archer", count: plan.units.archer, fortId: homeId });
  }
  for (const upgrade of plan.upgrades) {
    tryBuyUpgrade(world, upgrade, captain.teamId);
  }
}

export function applyGarrisonOrders(world: SimWorld, captain: Entity, fort: FortState): void {
  for (const bot of listLivingSquadBots(world, captain.id)) {
    const point = garrisonPoint(fort, bot);
    bot.components.order = {
      mode: "hold",
      slotIndex: bot.components.squad?.slotIndex ?? 0,
      formationId: "box",
      holdX: point.x,
      holdZ: point.z,
      fortId: fort.id,
      engaging: false
    };
  }
  captain.components.order = {
    mode: "garrison",
    slotIndex: -1,
    formationId: "box",
    fortId: fort.id,
    holdX: fort.spawnX,
    holdZ: fort.spawnZ,
    engaging: false
  };
}

function garrisonPoint(fort: FortState, bot: Entity): { x: number; z: number } {
  const dir = FORT_GATE_DIR[fort.id as FortId] ?? { x: 0, z: -1 };
  const slot = bot.components.squad?.slotIndex ?? 0;
  const side = (slot % 2 === 0 ? -1 : 1) * (0.85 + (slot % 4) * 0.35);
  const perp = { x: -dir.z, z: dir.x };
  const ranged = bot.components.appearance?.unitDefId === "archer";
  const along = ranged ? -1.9 : 2.3;
  return {
    x: fort.x + dir.x * along + perp.x * side,
    z: fort.z + dir.z * along + perp.z * side
  };
}

function homeFort(world: SimWorld, captain: Entity): FortState | undefined {
  return homeFortForTeam(world, captain.teamId, captain.components.formationLoadout?.homeFortId);
}

function courtyardHasHostile(world: SimWorld, fort: FortState, teamId: string): boolean {
  for (const entity of world.entities.values()) {
    if (entity.teamId === teamId) continue;
    if (!isLivingCombatant(entity)) continue;
    const transform = entity.components.transform;
    if (!transform) continue;
    if (pointInCourtyard(fort, transform.x, transform.z)) return true;
  }
  return false;
}

function nearestContestFort(world: SimWorld, captain: Entity): FortState | undefined {
  const pose = captain.components.transform;
  let best: FortState | undefined;
  let bestDist = Infinity;
  for (const fort of listForts(world)) {
    if (fort.ownerTeamId === captain.teamId) continue;
    const dx = fort.x - (pose?.x ?? fort.x);
    const dz = fort.z - (pose?.z ?? fort.z);
    const dist = dx * dx + dz * dz;
    if (dist < bestDist) {
      best = fort;
      bestDist = dist;
    }
  }
  return best;
}

function crossesRiver(fromZ: number, toZ: number): boolean {
  const river = RIVER.z;
  return (fromZ - river) * (toZ - river) < 0;
}

function waypointToward(from: { x: number; z: number }, fort: FortState, index: number): { x: number; z: number } {
  const dir = FORT_GATE_DIR[fort.id as FortId] ?? { x: 0, z: -1 };
  const outside = {
    x: fort.x + dir.x * (COURTYARD_HALF + 3.2),
    z: fort.z + dir.z * (COURTYARD_HALF + 3.2)
  };
  const yard = { x: fort.x, z: fort.z };
  const path: Array<{ x: number; z: number }> = [];
  if (crossesRiver(from.z, outside.z)) {
    path.push({ x: 0, z: RIVER.z });
  }
  path.push(outside, yard);
  return path[Math.min(index, path.length - 1)]!;
}

function driveToward(entity: Entity, target: { x: number; z: number }): boolean {
  const control = entity.components.control;
  const transform = entity.components.transform;
  if (!control || !transform || !control.enabled) {
    if (control) {
      control.moveX = 0;
      control.moveY = 0;
    }
    return true;
  }
  const dx = target.x - transform.x;
  const dz = target.z - transform.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= ARRIVE_DISTANCE) {
    control.moveX = 0;
    control.moveY = 0;
    return true;
  }
  control.lookYaw = Math.atan2(dx, dz);
  transform.yaw = control.lookYaw;
  control.moveX = 0;
  control.moveY = 1;
  return false;
}

function issueOnce(world: SimWorld, captain: Entity, king: KingComponent, abilityId: string): void {
  if (king.lastCommand === abilityId) return;
  const result = issueCommand(world, captain.id, abilityId);
  if (result.ok) king.lastCommand = abilityId;
}

function commitRecruit(world: SimWorld, captain: Entity, king: KingComponent): void {
  if (king.ready) return;
  executePersonalitySpend(world, captain, king.personality);
  king.ready = true;
  markCaptainReady(world, captain.id);
  const fort = homeFort(world, captain);
  if (fort) applyGarrisonOrders(world, captain, fort);
  issueOnce(world, captain, king, COMMAND_FORM_BOX);
  issueOnce(world, captain, king, COMMAND_HOLD);
  king.state = "garrison";
}

export function kingSystem(world: SimWorld): void {
  if (!world.bags.match && !world.bags.forts) return;
  const phase = getMatch(world).phase;
  if (phase === "ended") return;

  for (const captain of world.entities.values()) {
    if (captain.kind !== "captain") continue;
    const king = captain.components.king;
    if (!king) continue;
    const plan = AI_PERSONALITIES[king.personality as PersonalityId] ?? AI_PERSONALITIES.balanced;

    if (!king.ready) {
      commitRecruit(world, captain, king);
    }

    if (isDeadCombatant(captain) || !isLivingCombatant(captain)) {
      king.state = "retreat";
      const control = captain.components.control;
      if (control) {
        control.moveX = 0;
        control.moveY = 0;
      }
      continue;
    }

    if (phase === "recruit") {
      king.state = "garrison";
      const home = homeFort(world, captain);
      if (home) driveToward(captain, { x: home.spawnX, z: home.spawnZ });
      continue;
    }

    const home = homeFort(world, captain);
    const hostile = bestConeHostile(world, captain, SENSORS.combat);
    const yardThreatened = home ? courtyardHasHostile(world, home, captain.teamId) : false;
    const living = listLivingSquadBots(world, captain.id).length;
    const hostileInReach = Boolean(
      hostile &&
      hostile.score > SENSORS.combat.engageThreshold &&
      isInWeaponReach(captain, hostile.target)
    );

    if (yardThreatened || hostileInReach) {
      king.state = "defend";
      issueOnce(world, captain, king, COMMAND_HOLD);
      if (hostileInReach && hostile?.target.components.transform) {
        driveToward(captain, {
          x: hostile.target.components.transform.x,
          z: hostile.target.components.transform.z
        });
      } else if (home) {
        driveToward(captain, { x: home.spawnX, z: home.spawnZ });
      }
      continue;
    }

    if (living >= plan.sortieThreshold) {
      const target = nearestContestFort(world, captain);
      if (target) {
        king.state = "sortie";
        if (king.targetFortId !== target.id) {
          king.targetFortId = target.id;
          king.waypointIndex = 0;
          king.lastCommand = undefined;
        }
        issueOnce(world, captain, king, COMMAND_FOLLOW);
        const pose = captain.components.transform ?? { x: target.x, z: target.z };
        const index = king.waypointIndex ?? 0;
        const waypoint = waypointToward(pose, target, index);
        const arrived = driveToward(captain, waypoint);
        if (arrived) king.waypointIndex = index + 1;
        maybeStrikeGate(world, captain, target);
        continue;
      }
    }

    king.state = "garrison";
    if (home) {
      applyGarrisonOrders(world, captain, home);
      issueOnce(world, captain, king, COMMAND_HOLD);
      driveToward(captain, { x: home.spawnX, z: home.spawnZ });
    }
  }
}

function maybeStrikeGate(world: SimWorld, captain: Entity, fort: FortState): void {
  if (!isCourtyardSealed(fort)) return;
  const pose = captain.components.transform;
  if (!pose) return;
  const dist = Math.hypot(pose.x - fort.x, pose.z - fort.z);
  if (dist > COURTYARD_HALF + GATE_STRIKE_RANGE) return;
  tryActivate(world, captain.id, MELEE_STRIKE);
}

export function ensureKingSystem(): void {
  registerSystem(KING_SYSTEM_NAME, kingSystem);
}
