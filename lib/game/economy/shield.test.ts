import { describe, expect, it } from "vitest";
import { applyHit } from "@/lib/game/combat/apply-hit";
import { weapons } from "@/lib/game/data/weapons";
import { createEngine } from "@/lib/game/sim/engine";
import { spawnUnit } from "@/lib/game/units/spawn";
import { attachShield } from "./shield";

describe("shield upgrade", () => {
  it("blocks a front sword hit and applies the full band from behind", () => {
    const sim = createEngine({ seed: 4 });
    const target = spawnUnit(sim, {
      id: "shielded",
      kind: "bot",
      unitDefId: "swordsman",
      teamId: "team-0",
      captainId: "cap",
      x: 0,
      z: 0
    });
    target.components.transform!.yaw = 0;
    target.components.control!.lookYaw = 0;
    attachShield(target);

    const front = applyHit(target, weapons.sword.force, { x: 0, y: 0, z: -1 });
    expect(front.blockedBy).toBe("shield");
    expect(target.components.hitReaction!.state).not.toBe("death");

    const behind = applyHit(target, weapons.sword.force, { x: 0, y: 0, z: 1 });
    expect(behind.blockedBy).toBeNull();
    expect(behind.band).toBe("knockdown");
    expect(target.components.hitReaction!.state).toBe("knockdown");
  });
});
