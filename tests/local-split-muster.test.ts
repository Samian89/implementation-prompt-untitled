import { readFileSync } from "node:fs";
import { join } from "node:path";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecruitSetup } from "@/components/game/recruit-setup";
import { STARTING_TREASURY } from "@/lib/game/data/economy";
import { getTreasury } from "@/lib/game/economy/treasury";
import { LocalHost } from "@/lib/game/net/local-host";
import {
  buyDefenseSplitCaptain,
  buyUpgradeSplitCaptain,
  marchSplitCaptain,
  recruitSplitCaptain
} from "@/lib/game/net/muster";
import { findCaptainByPlayerId } from "@/lib/game/net/session";
import { getMatch } from "@/lib/game/world/install";
import { countSquadBots } from "@/lib/game/units/spawn";

// RecruitSetup is a Next JSX file; vitest node has no automatic runtime.
(globalThis as { React?: typeof React }).React = React;

const ROOT = join(__dirname, "..");

function readSource(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Local 2–4 muster overlay (AMC-85f55d1c)", () => {
  it("LocalSplitPlay mounts a per-pane RecruitSetup instead of waiting on the 2700-tick timeout", () => {
    const split = readSource("components/game/split-view.tsx");
    expect(split).toContain("RecruitSetup");
    expect(split).toContain("compact");
    expect(split).toContain("${title} · Muster");
    expect(split).toContain("${title} Recruit");
    expect(split).toContain("AI kings already spent. Muster here, then March.");
    expect(split).toContain("Each captain musters their own treasury, then March.");
    expect(split).toContain("Ready — waiting on other captains");
    expect(split).toContain("marchSplitCaptain");
    expect(split).toContain("recruitSplitCaptain");
    expect(split).toContain("buyDefenseSplitCaptain");
    expect(split).toContain("buyUpgradeSplitCaptain");
    expect(split).not.toContain("startMarch");

    const playClient = readSource("app/(game)/play/play-client.tsx");
    expect(playClient).toContain("LocalSplitPlay");
    expect(playClient).toContain("mode.kind === \"local\"");

    const recruit = readSource("components/game/recruit-setup.tsx");
    expect(recruit).toContain("Treasury");
    expect(recruit).toContain("March");
    expect(recruit).toContain("Swordsman");
    expect(recruit).toContain("Archer");
    expect(recruit).toMatch(/compact\?:/);
  });

  it("renders compact Treasury / Muster / March so both captains can shop", () => {
    const host = new LocalHost({ playerIds: ["p1", "p2"], humans: 2, seed: 7, registerHeight: false });
    const html = renderToString(
      createElement(RecruitSetup, {
        open: true,
        snapshot: host.getSnapshot(),
        teamId: "team-0",
        squadCount: 0,
        compact: true,
        eyebrow: "Captain 1 · Muster",
        ariaLabel: "Captain 1 Recruit",
        hint: "AI kings already spent. Muster here, then March.",
        onRecruit: () => undefined,
        onBuyDefense: () => undefined,
        onBuyUpgrade: () => undefined,
        onMarch: () => undefined
      })
    );
    expect(html).toContain("Captain 1 Recruit");
    expect(html).toContain("Captain 1 · Muster");
    expect(html).toContain("Treasury");
    expect(html).toContain(String(STARTING_TREASURY));
    expect(html).toContain("Swordsman");
    expect(html).toContain("Archer");
    expect(html).toContain("March");
    expect(html).toContain("AI kings already spent");
    host.dispose();
  });

  it.each([2, 3, 4] as const)(
    "Local %i humans start empty with a full treasury while AI kings already spent",
    (humans) => {
      const playerIds = Array.from({ length: humans }, (_, i) => `p${i + 1}`);
      const host = new LocalHost({ playerIds, humans, seed: 7, registerHeight: false });
      expect(getMatch(host.world).phase).toBe("recruit");

      for (const playerId of playerIds) {
        const captain = findCaptainByPlayerId(host.world.entities.values(), playerId);
        expect(captain, playerId).toBeDefined();
        expect(countSquadBots(host.world, captain!.id)).toBe(0);
        expect(getTreasury(host.world, captain!.teamId)).toBe(STARTING_TREASURY);
        expect(captain!.components.king).toBeUndefined();
      }

      const aiCaptains = [...host.world.entities.values()].filter(
        (entity) => entity.kind === "captain" && entity.components.king
      );
      expect(aiCaptains).toHaveLength(4 - humans);
      for (const king of aiCaptains) {
        expect(king.components.king?.ready).toBe(true);
        const spent = getTreasury(host.world, king.teamId) < STARTING_TREASURY;
        const recruited = countSquadBots(host.world, king.id) > 0;
        expect(spent || recruited).toBe(true);
      }

      for (let i = 0; i < playerIds.length; i++) {
        const playerId = playerIds[i]!;
        expect(recruitSplitCaptain(host.world, playerId, i % 2 === 0 ? "swordsman" : "archer")).toBe(true);
        expect(marchSplitCaptain(host.world, playerId)).toBe(true);
        if (i < playerIds.length - 1) {
          expect(getMatch(host.world).phase).toBe("recruit");
        }
      }
      expect(getMatch(host.world).phase).toBe("live");
      host.dispose();
    }
  );

  it("lets one split captain buy walls and upgrades without emptying the other", () => {
    const host = new LocalHost({ playerIds: ["p1", "p2"], humans: 2, seed: 7, registerHeight: false });
    const p1 = findCaptainByPlayerId(host.world.entities.values(), "p1")!;
    const p2 = findCaptainByPlayerId(host.world.entities.values(), "p2")!;
    expect(buyDefenseSplitCaptain(host.world, "p1", "palisade")).toBe(true);
    expect(buyUpgradeSplitCaptain(host.world, "p1", "sword")).toBe(true);
    expect(getTreasury(host.world, p1.teamId)).toBeLessThan(STARTING_TREASURY);
    expect(getTreasury(host.world, p2.teamId)).toBe(STARTING_TREASURY);
    host.dispose();
  });
});
