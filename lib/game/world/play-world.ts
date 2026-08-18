import { dressCaptain, spawnUnit } from "@/lib/game/units/spawn";
import { spawnCaptain } from "@/lib/game/sim/engine";
import type { Entity, SimWorld } from "@/lib/game/sim/types";
import { ensureFormationLoadout } from "@/lib/game/command/orders";
import { ensureRespawnSystem } from "@/lib/game/lifecycle/respawn";
import { ensureCaptainDeathSystem } from "@/lib/game/lifecycle/captain-death";
import { getFort } from "./fort";
import { installWorld, type InstallWorldOptions } from "./install";
import { FORT_IDS, PLAYER_HOME_FORT, defaultOwnerForFort, type FortId } from "./map";

export type SpawnPlayWorldOptions = InstallWorldOptions & {
  skipGarrisons?: boolean;
};

export function spawnPlayWorld(
  world: SimWorld,
  opts: SpawnPlayWorldOptions = {}
): { captain: Entity; forts: ReturnType<typeof installWorld> } {
  ensureRespawnSystem();
  ensureCaptainDeathSystem();
  const homeFortId = opts.homeFortId ?? PLAYER_HOME_FORT;
  const forts = installWorld(world, { ...opts, homeFortId });
  const home = getFort(world, homeFortId)!;
  const captain = spawnCaptain(world, {
    playerId: "local",
    teamId: opts.playerTeamId ?? "team-0",
    x: home.spawnX,
    z: home.spawnZ
  });
  dressCaptain(captain);
  const loadout = ensureFormationLoadout(captain);
  loadout.homeFortId = homeFortId;
  loadout.homeX = home.spawnX;
  loadout.homeZ = home.spawnZ;

  if (!opts.skipGarrisons) {
    spawnScriptedGarrisons(world, homeFortId);
  }

  return { captain, forts };
}

export function spawnScriptedGarrisons(world: SimWorld, playerHome: FortId = PLAYER_HOME_FORT): Entity[] {
  const spawned: Entity[] = [];
  for (const id of FORT_IDS) {
    if (id === playerHome) continue;
    const fort = getFort(world, id);
    if (!fort) continue;
    const teamId = fort.ownerTeamId ?? defaultOwnerForFort(id);
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI;
      const bot = spawnUnit(world, {
        kind: "bot",
        unitDefId: i === 0 ? "swordsman" : "archer",
        teamId,
        captainId: `garrison-${id}`,
        slotIndex: i,
        x: fort.x + Math.cos(angle) * 1.6,
        z: fort.z + Math.sin(angle) * 1.6,
        drivenBy: "ai"
      });
      bot.components.order = {
        mode: "hold",
        slotIndex: i,
        formationId: "box",
        holdX: bot.components.transform!.x,
        holdZ: bot.components.transform!.z,
        fortId: id
      };
      spawned.push(bot);
    }
  }
  return spawned;
}

export function startMarch(world: SimWorld): void {
  const match = world.bags.match;
  if (match && typeof match === "object" && !Array.isArray(match)) {
    (match as { phase: string }).phase = "live";
  } else {
    world.bags.match = { phase: "live" };
  }
}
