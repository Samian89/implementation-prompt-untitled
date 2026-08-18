import { describe, expect, it } from "vitest";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { dressCaptain } from "@/lib/game/units/spawn";
import { createFortBag, homeFortForTeam, setFortOwner, writeForts } from "./fort";
import { installWorld } from "./install";

describe("homeFortForTeam", () => {
  it("honors preferredId only while that team still owns the named fort", () => {
    const sim = createEngine({ seed: 1, includeGlobalSystems: false });
    writeForts(sim, createFortBag());

    expect(homeFortForTeam(sim, "team-0", "SW")?.id).toBe("SW");

    setFortOwner(homeFortForTeam(sim, "team-0", "SW")!, "team-1");
    expect(homeFortForTeam(sim, "team-0", "SW")).toBeUndefined();
  });

  it("falls through to another owned fort when the preferred home is lost", () => {
    const sim = createEngine({ seed: 2, includeGlobalSystems: false });
    writeForts(sim, createFortBag());
    setFortOwner(homeFortForTeam(sim, "team-2", "NW")!, "team-0");
    expect(homeFortForTeam(sim, "team-0", "NW")?.id).toBe("NW");

    setFortOwner(homeFortForTeam(sim, "team-0", "NW")!, "team-2");
    expect(homeFortForTeam(sim, "team-0", "NW")?.id).toBe("SW");
  });
});

describe("homeFortForTeam in a match world", () => {
  it("does not return a named original corner after that team loses it", () => {
    const sim = createEngine({ seed: 3, includeGlobalSystems: false });
    installWorld(sim, { registerHeight: false });
    const captain = spawnCaptain(sim, { id: "cap-0", teamId: "team-0", x: 0, z: 0 });
    dressCaptain(captain);
    captain.components.formationLoadout!.homeFortId = "SW";

    const sw = homeFortForTeam(sim, "team-0", "SW")!;
    setFortOwner(sw, "team-1");

    expect(homeFortForTeam(sim, "team-0", "SW")).toBeUndefined();
    expect(homeFortForTeam(sim, "team-0", captain.components.formationLoadout?.homeFortId)).toBeUndefined();
  });
});
