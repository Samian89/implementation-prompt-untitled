import { describe, expect, it } from "vitest";
import { emptyInput } from "@/lib/game/sim/input";
import { LocalHost } from "./local-host";

describe("LocalHost", () => {
  it("moves two captains in opposite x directions from canned P1/P2 streams", () => {
    const host = new LocalHost({ playerIds: ["p1", "p2"], seed: 1, registerHeight: false });
    expect(host.getLocalPlayerIds()).toEqual(["p1", "p2"]);

    const start = host.getSnapshot();
    const startP1 = start.entities.find((entity) => entity.components.control?.playerId === "p1");
    const startP2 = start.entities.find((entity) => entity.components.control?.playerId === "p2");
    expect(startP1?.components.transform).toBeTruthy();
    expect(startP2?.components.transform).toBeTruthy();
    const x1 = startP1!.components.transform!.x;
    const x2 = startP2!.components.transform!.x;

    for (let i = 0; i < 60; i++) {
      host.submitInput({ ...emptyInput("p1", host.world.tick), moveX: 1 });
      host.submitInput({ ...emptyInput("p2", host.world.tick), moveX: -1 });
      host.step();
    }

    const end = host.getSnapshot();
    const endP1 = end.entities.find((entity) => entity.components.control?.playerId === "p1");
    const endP2 = end.entities.find((entity) => entity.components.control?.playerId === "p2");
    const dx1 = endP1!.components.transform!.x - x1;
    const dx2 = endP2!.components.transform!.x - x2;
    expect(dx1).toBeGreaterThan(0.5);
    expect(dx2).toBeLessThan(-0.5);
    expect(Math.sign(dx1)).not.toBe(Math.sign(dx2));
    host.dispose();
  });
});
