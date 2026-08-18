"use client";

import { playerTeamIdOf, type MatchBag, type MatchPhase } from "@/lib/game/world/install";
import { fortsLabel, ownedFortCount, phaseLabel, teamIndex } from "@/lib/game/match/rules";
import type { Snapshot } from "@/lib/game/sim/types";
import { registerHudSlot } from "./hud-slots";

export type MatchHudProps = {
  snapshot: Snapshot | null;
  localTeamId?: string;
  onPlayAgain?: () => void;
};

function readMatch(snapshot: Snapshot | null): MatchBag | null {
  const raw = snapshot?.bags.match;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const bag = raw as MatchBag;
  if (bag.phase !== "recruit" && bag.phase !== "live" && bag.phase !== "ended") return null;
  return bag;
}

export function readMatchPhase(snapshot: Snapshot | null): MatchPhase | null {
  return readMatch(snapshot)?.phase ?? null;
}

export function matchStatusCopy(snapshot: Snapshot | null, localTeamId = "team-0"): {
  forts: string;
  phase: string;
  ended: boolean;
  outcome: "Victory" | "Defeat" | null;
} | null {
  const match = readMatch(snapshot);
  if (!match || !snapshot) return null;
  const owned = ownedFortCount({ bags: snapshot.bags }, localTeamId);
  const ended = match.phase === "ended";
  const winner = teamIndex(match.winnerTeamId);
  const local = teamIndex(localTeamId);
  return {
    forts: fortsLabel(owned),
    phase: phaseLabel(match.phase),
    ended,
    outcome: ended ? (winner !== null && winner === local ? "Victory" : "Defeat") : null
  };
}

export function MatchStatus({ snapshot, localTeamId = "team-0" }: { snapshot: Snapshot; localTeamId?: string }) {
  const status = matchStatusCopy(snapshot, localTeamId);
  if (!status) return null;
  return (
    <div className="w-fit max-w-[11rem] rounded-lg bg-slate-950/70 px-3 py-2 text-xs font-semibold tracking-wide text-slate-100 backdrop-blur sm:max-w-none">
      <p>{status.forts}</p>
      <p className="text-amber-200">{status.phase}</p>
    </div>
  );
}

export function MatchHud({ snapshot, localTeamId, onPlayAgain }: MatchHudProps) {
  const teamId = localTeamId ?? (snapshot ? playerTeamIdOf({ bags: snapshot.bags }) : "team-0");
  const status = matchStatusCopy(snapshot, teamId);
  if (!status) return null;

  return (
    <>
      {status.ended && status.outcome ? (
        <div
          className="pointer-events-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-amber-500/40 bg-slate-950/94 px-6 py-6 text-center text-slate-50 shadow-2xl backdrop-blur"
          role="dialog"
          aria-label={status.outcome}
        >
          <p className="text-3xl font-semibold tracking-wide">{status.outcome}</p>
          <p className="text-sm text-slate-300">{status.forts}</p>
          {onPlayAgain ? (
            <button
              type="button"
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
              onClick={onPlayAgain}
            >
              Play again
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

registerHudSlot("match", (snapshot) => {
  if (!snapshot.bags.match) return null;
  const teamId = playerTeamIdOf({ bags: snapshot.bags });
  return <MatchStatus snapshot={snapshot} localTeamId={teamId} />;
});
