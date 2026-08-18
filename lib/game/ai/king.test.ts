import { describe, expect, it } from "vitest";
import { STARTING_TREASURY } from "@/lib/game/data/economy";
import { getAbilityDef } from "@/lib/game/data/abilities";
import { getAbilityEvents } from "@/lib/game/gas/ability-system";
import { createMatch, MATCH_CORNERS } from "@/lib/game/match/create-match";
import { getMatch } from "@/lib/game/world/install";
import { getFort } from "@/lib/game/world/fort";
import { getTreasury } from "@/lib/game/economy/treasury";
import { countSquadBots } from "@/lib/game/units/spawn";

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
});
