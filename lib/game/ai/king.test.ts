import { describe, expect, it } from "vitest";
import { STARTING_TREASURY } from "@/lib/game/data/economy";
import { getAbilityDef } from "@/lib/game/data/abilities";
import { COMMAND_FOLLOW, COMMAND_HOLD } from "@/lib/game/data/commands";
import { SENSORS } from "@/lib/game/data/sensors";
import { getAbilityEvents } from "@/lib/game/gas/ability-system";
import { createMatch, MATCH_CORNERS } from "@/lib/game/match/create-match";
import { getMatch } from "@/lib/game/world/install";
import { getFort } from "@/lib/game/world/fort";
import { getTreasury } from "@/lib/game/economy/treasury";
import { countSquadBots, dressCaptain, spawnUnit } from "@/lib/game/units/spawn";
import { spawnCaptain } from "@/lib/game/sim/engine";
import { bestConeHostile } from "./cone-sensor";
import { kingSystem } from "./king";

function stepUntilLive(world: ReturnType<typeof createMatch>, limit = 16): void {
  for (let i = 0; i < limit && getMatch(world).phase === "recruit"; i++) {
    world.step();
  }
}

describe("AI kings", () => {
  it("spends starting cash and fields a squad after the recruit phase", () => {
    const world = createMatch({ humanPlayers: 0, seed: 1, registerHeight: false });
    stepUntilLive(world);
    expect(getMatch(world).phase).not.toBe("recruit");

    const kings = [...world.entities.values()].filter(
      (entity) => entity.kind === "captain" && entity.components.king
    );
    const spent = kings.some((king) => {
      const treasury = getTreasury(world, king.teamId);
      const squadCount = countSquadBots(world, king.id);
      return treasury < STARTING_TREASURY && squadCount >= 1;
    });
    expect(spent).toBe(true);
  });

  it("never writes a high wall for horde and does write high for wall_lord", () => {
    const world = createMatch({ humanPlayers: 0, seed: 1, registerHeight: false });
    stepUntilLive(world);

    const hordeCorner = MATCH_CORNERS.find((corner) => corner.personality === "horde")!;
    const wallLordCorner = MATCH_CORNERS.find((corner) => corner.personality === "wall_lord")!;
    expect(getFort(world, hordeCorner.fortId)?.defense.wall).not.toBe("high");
    expect(getFort(world, wallLordCorner.fortId)?.defense.wall).toBe("high");
  });

  it("calls only ability ids present in abilities.ts over 600 ticks", () => {
    const world = createMatch({ humanPlayers: 0, seed: 1, registerHeight: false });
    for (let i = 0; i < 600; i++) world.step();
    const events = getAbilityEvents(world);
    expect(events.length).toBeGreaterThan(0);
    const captainCombat = events.filter((event) => event.abilityId.startsWith("captain."));
    expect(captainCombat).toEqual([]);
    for (const event of events) {
      expect(getAbilityDef(event.abilityId), event.abilityId).toBeDefined();
    }
  }, 60_000);

  it("does not abort sortie or zero the king on a ~11m cone hostile", () => {
    const world = createMatch({ humanPlayers: 0, seed: 1, registerHeight: false });
    stepUntilLive(world);

    const king = [...world.entities.values()].find(
      (entity) => entity.kind === "captain" && entity.components.king && entity.teamId === "team-1"
    );
    expect(king).toBeDefined();
    const captain = king!;
    const ai = captain.components.king!;
    ai.state = "sortie";
    ai.lastCommand = COMMAND_FOLLOW;
    ai.targetFortId = "SW";
    ai.waypointIndex = 0;

    const pose = captain.components.transform!;
    const yaw = captain.components.control?.lookYaw ?? pose.yaw;
    const foe = spawnCaptain(world, {
      id: "distant-cone-captain",
      teamId: "team-0",
      x: pose.x + Math.sin(yaw) * 11,
      z: pose.z + Math.cos(yaw) * 11,
      playerId: null,
      drivenBy: "none"
    });
    dressCaptain(foe);

    const scored = bestConeHostile(world, captain, SENSORS.combat);
    expect(scored).not.toBeNull();
    expect(scored!.score).toBeGreaterThan(SENSORS.combat.engageThreshold);

    kingSystem(world);

    expect(ai.state).toBe("sortie");
    expect(ai.lastCommand).toBe(COMMAND_FOLLOW);
    expect(captain.components.control!.moveY).toBe(1);
  });

  it("defends a threatened courtyard but keeps closing on a reachable hostile", () => {
    const world = createMatch({ humanPlayers: 0, seed: 1, registerHeight: false });
    stepUntilLive(world);

    const king = [...world.entities.values()].find(
      (entity) => entity.kind === "captain" && entity.components.king && entity.teamId === "team-1"
    )!;
    const home = getFort(world, "NE")!;
    const pose = king.components.transform!;
    const yaw = king.components.control?.lookYaw ?? pose.yaw;
    spawnUnit(world, {
      id: "reach-guard",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: "human",
      x: pose.x + Math.sin(yaw) * 2,
      z: pose.z + Math.cos(yaw) * 2,
      drivenBy: "none"
    });

    king.components.king!.state = "sortie";
    king.components.king!.lastCommand = COMMAND_FOLLOW;
    kingSystem(world);
    expect(king.components.king!.state).toBe("defend");
    expect(king.components.king!.lastCommand).toBe(COMMAND_HOLD);
    expect(king.components.control!.moveY).toBe(1);

    const world2 = createMatch({ humanPlayers: 0, seed: 1, registerHeight: false });
    stepUntilLive(world2);
    const king2 = [...world2.entities.values()].find(
      (entity) => entity.kind === "captain" && entity.components.king && entity.teamId === "team-1"
    )!;
    spawnUnit(world2, {
      id: "yard-raider",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: "human",
      x: home.x,
      z: home.z,
      drivenBy: "none"
    });
    king2.components.king!.state = "sortie";
    king2.components.king!.lastCommand = COMMAND_FOLLOW;
    king2.components.king!.targetFortId = "SW";
    kingSystem(world2);
    expect(king2.components.king!.state).toBe("defend");
    expect(king2.components.king!.lastCommand).toBe(COMMAND_HOLD);
  });
});
