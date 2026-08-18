import { describe, expect, it } from "vitest";
import type { Snapshot } from "@/lib/game/sim/types";
import { decodeSnapshot, encodeSnapshot } from "./protocol";

const fixture: Snapshot = {
  tick: 12,
  timeScale: 1,
  entities: [
    {
      id: "captain-SW",
      teamId: "team-0",
      kind: "captain",
      components: {
        transform: { x: -20, y: 0, z: -16.8, yaw: 0.15, pitch: -0.05 },
        control: {
          enabled: true,
          uprightAllowed: true,
          playerId: "p1",
          drivenBy: "player",
          moveX: 1,
          moveY: 0,
          lookYaw: 0.15,
          lookPitch: -0.05,
          buttons: 0
        },
        hitReaction: { state: "idle", force: 0, remainingTicks: 0 }
      }
    },
    {
      id: "captain-NE",
      teamId: "team-1",
      kind: "captain",
      components: {
        transform: { x: 20, y: 0, z: 16.8, yaw: 3.1, pitch: 0 },
        control: {
          enabled: true,
          uprightAllowed: true,
          playerId: null,
          drivenBy: "ai",
          moveX: 0,
          moveY: 0,
          lookYaw: 3.1,
          lookPitch: 0
        },
        king: { personality: "wall_lord", state: "garrison", ready: true }
      }
    }
  ],
  bags: {
    forts: { SW: { id: "SW" }, NE: { id: "NE" }, NW: { id: "NW" }, SE: { id: "SE" } },
    match: { phase: "live", winnerTeamId: null, fortOwners: { SW: "team-0" } },
    economy: { "team-0": 80 },
    ui: { formationOpen: false }
  }
};

describe("protocol codec", () => {
  it("round-trips a fixture snapshot through encodeSnapshot / decodeSnapshot", () => {
    const decoded = decodeSnapshot(encodeSnapshot(fixture));
    expect(JSON.parse(JSON.stringify(decoded))).toEqual(decoded);
    expect(decoded).toEqual(fixture);
  });
});
