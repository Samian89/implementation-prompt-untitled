"use client";

import { MAX_SQUAD_SIZE } from "@/lib/game/data/units";
import type { Snapshot } from "@/lib/game/sim/types";
import { registerHudSlot } from "./hud-slots";

export function countLiveBots(snapshot: Snapshot, captainId?: string): number {
  return snapshot.entities.filter((entity) => {
    if (entity.kind !== "bot") return false;
    if (!captainId) return true;
    return entity.components.squad?.captainId === captainId;
  }).length;
}

export function squadCountLabel(count: number): string {
  return `Squad ${count}/${MAX_SQUAD_SIZE}`;
}

export function SquadCountHud({ snapshot }: { snapshot: Snapshot }) {
  const localCaptain = snapshot.entities.find((entity) => entity.kind === "captain");
  const count = countLiveBots(snapshot, localCaptain?.id);
  return (
    <div className="w-fit rounded-lg bg-slate-950/60 px-3 py-2 text-xs font-semibold tracking-wide text-slate-100 backdrop-blur">
      {squadCountLabel(count)}
    </div>
  );
}

registerHudSlot("squad-count", (snapshot) => <SquadCountHud snapshot={snapshot} />);
