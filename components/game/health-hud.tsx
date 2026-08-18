"use client";

import { getHealth, healthLabel } from "@/lib/game/combat/health";
import type { Snapshot } from "@/lib/game/sim/types";
import { registerHudSlot } from "./hud-slots";

export function localCaptainHealth(snapshot: Snapshot): number {
  const captain = snapshot.entities.find((entity) => entity.kind === "captain");
  return captain ? getHealth(captain) : 100;
}

export function HealthHud({ snapshot }: { snapshot: Snapshot }) {
  const value = localCaptainHealth(snapshot);
  return (
    <div className="w-fit rounded-lg bg-slate-950/60 px-3 py-2 text-xs font-semibold tracking-wide text-slate-100 backdrop-blur">
      {healthLabel(value)}
    </div>
  );
}

registerHudSlot("health", (snapshot) => <HealthHud snapshot={snapshot} />);
