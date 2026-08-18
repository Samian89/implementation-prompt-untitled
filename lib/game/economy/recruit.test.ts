import { describe, expect, it } from "vitest";
import { STARTING_TREASURY } from "@/lib/game/data/economy";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { dressCaptain } from "@/lib/game/units/spawn";
import { installWorld } from "@/lib/game/world/install";
import { getFort } from "@/lib/game/world/fort";
import { tryBuyDefense } from "./defense";
import { tryRecruit } from "./recruit";
import { getTreasury } from "./treasury";

describe("tryRecruit", () => {
  it("buys 20 swordsmen down to treasury 0 and refuses a 21st", () => {
    const sim = createEngine({ seed: 8 });
    installWorld(sim, { registerHeight: false });
    const home = getFort(sim, "SW")!;
    const captain = spawnCaptain(sim, { id: "cap-shop", teamId: "team-0", x: home.spawnX, z: home.spawnZ });
    dressCaptain(captain);
    expect(getTreasury(sim, "team-0")).toBe(STARTING_TREASURY);

    const bought = tryRecruit(sim, { captainId: captain.id, unitDefId: "swordsman", count: 20 });
    expect(bought.ok).toBe(true);
    expect(getTreasury(sim, "team-0")).toBe(0);

    const extra = tryRecruit(sim, { captainId: captain.id, unitDefId: "swordsman" });
    expect(extra.ok).toBe(false);
    if (!extra.ok) {
      expect(["squad_cap", "cannot_afford"]).toContain(extra.error);
    }
  });
});

describe("tryBuyDefense", () => {
  it("refuses a high wall after 20 units and succeeds on a fresh treasury", () => {
    const broke = createEngine({ seed: 9 });
    installWorld(broke, { registerHeight: false });
    const home = getFort(broke, "SW")!;
    const captain = spawnCaptain(broke, { id: "cap-broke", teamId: "team-0", x: home.spawnX, z: home.spawnZ });
    dressCaptain(captain);
    expect(tryRecruit(broke, { captainId: captain.id, unitDefId: "swordsman", count: 20 }).ok).toBe(true);
    const denied = tryBuyDefense(broke, "high_wall");
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("cannot_afford");

    const fresh = createEngine({ seed: 10 });
    installWorld(fresh, { registerHeight: false });
    const bought = tryBuyDefense(fresh, "high_wall");
    expect(bought.ok).toBe(true);
    expect(getFort(fresh, "SW")!.defense.wall).toBe("high");
  });
});
