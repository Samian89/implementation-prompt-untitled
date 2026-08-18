import { describe, expect, it } from "vitest";
import { FORT_IDS } from "@/lib/game/world/map";
import { getFort, listForts } from "@/lib/game/world/fort";
import { getMatch } from "@/lib/game/world/install";
import { matchStatusCopy } from "@/components/game/match-hud";
import { createMatch } from "./create-match";
import { debugSetFortOwner } from "./rules";

describe("createMatch", () => {
  it("yields four captains and four forts whose owners match the corner captains at tick 0", () => {
    const world = createMatch({ humanPlayers: 0, seed: 1, registerHeight: false });
    expect(world.tick).toBe(0);
    const captains = [...world.entities.values()].filter((entity) => entity.kind === "captain");
    expect(captains).toHaveLength(4);
    expect(listForts(world)).toHaveLength(4);
    for (const captain of captains) {
      const homeId = captain.components.formationLoadout?.homeFortId;
      expect(homeId).toBeTruthy();
      const fort = getFort(world, homeId!);
      expect(fort?.ownerTeamId).toBe(captain.teamId);
    }
    for (const id of FORT_IDS) {
      const owner = getFort(world, id)?.ownerTeamId;
      const captain = captains.find((entity) => entity.components.formationLoadout?.homeFortId === id);
      expect(captain?.teamId).toBe(owner);
    }
  });
});

describe("victory", () => {
  it("ends the match for team 0 on the next tick after debugSetFortOwner takes all four forts", () => {
    const world = createMatch({ humanPlayers: 0, seed: 1, registerHeight: false });
    for (const id of FORT_IDS) {
      debugSetFortOwner(world, id, 0);
    }
    expect(getMatch(world).phase).not.toBe("ended");
    world.step();
    const match = getMatch(world);
    expect(match.phase).toBe("ended");
    expect(match.winnerTeamId).toBe(0);
    const snap = world.getSnapshot();
    expect(matchStatusCopy(snap, "team-0")?.outcome).toBe("Victory");
    expect(matchStatusCopy(snap, "team-1")?.outcome).toBe("Defeat");
  });
});
