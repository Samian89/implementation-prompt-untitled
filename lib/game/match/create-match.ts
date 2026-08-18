import { createEngine, spawnCaptain, type SimEngine } from "@/lib/game/sim/engine";
import { dressCaptain } from "@/lib/game/units/spawn";
import { ensureFormationLoadout } from "@/lib/game/command/orders";
import { ensureRespawnSystem } from "@/lib/game/lifecycle/respawn";
import { ensureCaptainDeathSystem } from "@/lib/game/lifecycle/captain-death";
import { attachKing, ensureKingSystem, executePersonalitySpend, applyGarrisonOrders, kingSystem } from "@/lib/game/ai/king";
import type { PersonalityId } from "@/lib/game/data/ai-personalities";
import { getFort } from "@/lib/game/world/fort";
import { installWorld } from "@/lib/game/world/install";
import { type FortId } from "@/lib/game/world/map";
import { ensureMatchRules, markCaptainReady, matchRulesSystem, RECRUIT_TICKS, syncFortOwners, writeMatch } from "./rules";

export type MatchCorner = {
  fortId: FortId;
  teamId: string;
  teamIndex: number;
  personality: PersonalityId;
};

/** SW is the human seat; remaining corners are AI kings. */
export const MATCH_CORNERS: MatchCorner[] = [
  { fortId: "SW", teamId: "team-0", teamIndex: 0, personality: "horde" },
  { fortId: "NE", teamId: "team-1", teamIndex: 1, personality: "wall_lord" },
  { fortId: "NW", teamId: "team-2", teamIndex: 2, personality: "balanced" },
  { fortId: "SE", teamId: "team-3", teamIndex: 3, personality: "archer_keep" }
];

export type CreateMatchOptions = {
  humanPlayers?: number;
  seed?: number;
  registerHeight?: boolean;
  world?: SimEngine;
};

export function createMatch(opts: CreateMatchOptions = {}): SimEngine {
  ensureRespawnSystem();
  ensureCaptainDeathSystem();
  ensureMatchRules();
  ensureKingSystem();

  const world = opts.world ?? createEngine({ seed: opts.seed ?? 1 });
  if (opts.world) {
    world.registerSystem("matchRules", matchRulesSystem);
    world.registerSystem("aiKing", kingSystem);
  }

  const humanPlayers = Math.max(0, Math.min(4, opts.humanPlayers ?? 1));
  installWorld(world, {
    playerTeamId: "team-0",
    homeFortId: "SW",
    registerHeight: opts.registerHeight
  });
  writeMatch(world, {
    phase: "recruit",
    winnerTeamId: null,
    recruitEndsAt: world.tick + RECRUIT_TICKS,
    ready: {},
    fortOwners: {
      NW: "team-2",
      NE: "team-1",
      SW: "team-0",
      SE: "team-3"
    }
  });

  for (let i = 0; i < MATCH_CORNERS.length; i++) {
    const corner = MATCH_CORNERS[i]!;
    const fort = getFort(world, corner.fortId);
    if (!fort) continue;
    const isHuman = i < humanPlayers;
    const captain = spawnCaptain(world, {
      id: `captain-${corner.fortId}`,
      teamId: corner.teamId,
      playerId: isHuman ? "local" : null,
      drivenBy: isHuman ? "player" : "ai",
      x: fort.spawnX,
      z: fort.spawnZ
    });
    dressCaptain(captain);
    const loadout = ensureFormationLoadout(captain);
    loadout.homeFortId = corner.fortId;
    loadout.homeX = fort.spawnX;
    loadout.homeZ = fort.spawnZ;

    if (!isHuman) {
      attachKing(captain, corner.personality);
      executePersonalitySpend(world, captain, corner.personality);
      applyGarrisonOrders(world, captain, fort);
      const king = captain.components.king;
      if (king) {
        king.ready = true;
        king.state = "garrison";
      }
      markCaptainReady(world, captain.id);
    }
  }

  syncFortOwners(world);
  return world;
}
