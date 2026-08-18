"use client";

import { getTreasury } from "@/lib/game/economy/treasury";
import { DEFENSES, type DefenseId } from "@/lib/game/data/defenses";
import { UNIT_COST, UPGRADE_COST } from "@/lib/game/data/economy";
import { MAX_SQUAD_SIZE } from "@/lib/game/data/units";
import type { Snapshot } from "@/lib/game/sim/types";
import { registerHudSlot } from "./hud-slots";

export type RecruitSetupProps = {
  open: boolean;
  snapshot: Snapshot | null;
  teamId?: string;
  squadCount: number;
  compact?: boolean;
  eyebrow?: string;
  ariaLabel?: string;
  hint?: string;
  onRecruit: (unitDefId: "swordsman" | "archer") => void;
  onBuyDefense: (id: DefenseId) => void;
  onBuyUpgrade: (id: "sword" | "shield") => void;
  onMarch: () => void;
};

export function treasuryLabel(amount: number): string {
  return `Treasury ${amount}`;
}

export function readTreasuryAmount(snapshot: Snapshot | null, teamId = "team-0"): number {
  if (!snapshot) return 0;
  return getTreasury({ bags: snapshot.bags }, teamId);
}

export function RecruitSetup({
  open,
  snapshot,
  teamId = "team-0",
  squadCount,
  compact = false,
  eyebrow = "Muster",
  ariaLabel = "Recruit",
  hint,
  onRecruit,
  onBuyDefense,
  onBuyUpgrade,
  onMarch
}: RecruitSetupProps) {
  const treasury = readTreasuryAmount(snapshot, teamId);
  const upgrades = readUpgrades(snapshot, teamId);
  const wall = readHomeWall(snapshot, teamId);

  if (!open) return null;

  return (
    <section
      className={`pointer-events-auto w-full max-w-lg overflow-y-auto rounded-xl border border-amber-700/40 bg-slate-950/94 text-slate-50 shadow-2xl backdrop-blur ${
        compact ? "max-h-full" : ""
      }`}
      aria-label={ariaLabel}
    >
      <header
        className={`flex items-center justify-between gap-3 border-b border-slate-700/70 ${
          compact ? "px-3 py-2" : "px-4 py-3"
        }`}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300/90">{eyebrow}</p>
          <h2 className={`font-semibold tracking-wide ${compact ? "text-base" : "text-lg"}`}>Treasury</h2>
        </div>
        <p className={`font-semibold tabular-nums text-amber-200 ${compact ? "text-xl" : "text-2xl"}`}>
          {treasury}
        </p>
      </header>
      <div className={compact ? "grid gap-2 px-3 py-2 sm:grid-cols-2" : "grid gap-4 px-4 py-4 sm:grid-cols-2"}>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Units · {squadCount}/{MAX_SQUAD_SIZE}
          </p>
          <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
            <button
              type="button"
              className={`rounded-md bg-sky-800 text-left font-semibold hover:bg-sky-700 ${
                compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
              }`}
              onClick={() => onRecruit("swordsman")}
            >
              Swordsman <span className="float-right text-sky-200">{UNIT_COST}</span>
            </button>
            <button
              type="button"
              className={`rounded-md bg-emerald-800 text-left font-semibold hover:bg-emerald-700 ${
                compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
              }`}
              onClick={() => onRecruit("archer")}
            >
              Archer <span className="float-right text-emerald-200">{UNIT_COST}</span>
            </button>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Defenses · {wall}</p>
          <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
            {(Object.keys(DEFENSES) as DefenseId[]).map((id) => (
              <button
                key={id}
                type="button"
                className={`rounded-md bg-slate-800 text-left font-semibold capitalize hover:bg-slate-700 ${
                  compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
                }`}
                onClick={() => onBuyDefense(id)}
              >
                {id.replaceAll("_", " ")}{" "}
                <span className="float-right text-slate-300">{DEFENSES[id].cost}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        className={`flex flex-wrap items-center gap-3 border-t border-slate-800 ${
          compact ? "px-3 py-2" : "px-4 py-3"
        }`}
      >
        <label className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
          <input type="checkbox" checked={upgrades.sword} onChange={() => onBuyUpgrade("sword")} />
          Sword +{UPGRADE_COST.sword}
        </label>
        <label className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
          <input type="checkbox" checked={upgrades.shield} onChange={() => onBuyUpgrade("shield")} />
          Shield +{UPGRADE_COST.shield}
        </label>
        <div className="ml-auto flex flex-col items-end gap-1">
          <button
            type="button"
            className={`rounded-md bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400 ${
              compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
            }`}
            onClick={onMarch}
          >
            March
          </button>
          <p className={`max-w-[16rem] text-right leading-snug text-slate-400 ${compact ? "text-[10px]" : "text-[11px]"}`}>
            {squadCount > 0
              ? "Squad follows you into the field."
              : "Recruit first, or march empty and press C to Follow."}
            {hint ? ` ${hint}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}

function readUpgrades(snapshot: Snapshot | null, teamId: string): { sword: boolean; shield: boolean } {
  const economy = snapshot?.bags.economy as
    | { upgrades?: Record<string, { sword?: boolean; shield?: boolean }> }
    | undefined;
  return {
    sword: Boolean(economy?.upgrades?.[teamId]?.sword),
    shield: Boolean(economy?.upgrades?.[teamId]?.shield)
  };
}

function readHomeWall(snapshot: Snapshot | null, teamId: string): string {
  const forts = snapshot?.bags.forts;
  if (!forts || typeof forts !== "object") return "none";
  for (const value of Object.values(forts as Record<string, { ownerTeamId?: string; defense?: { wall?: string } }>)) {
    if (value?.ownerTeamId === teamId) return value.defense?.wall ?? "none";
  }
  return "none";
}

registerHudSlot("treasury", (snapshot) => {
  const amount = readTreasuryAmount(snapshot, "team-0");
  return (
    <div className="w-fit rounded-lg bg-slate-950/60 px-3 py-2 text-xs font-semibold tracking-wide text-slate-100 backdrop-blur">
      Treasury {amount}
    </div>
  );
});
