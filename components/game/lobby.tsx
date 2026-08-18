"use client";

import { LOCAL_BINDINGS } from "@/lib/game/net/bindings";
import type { CreateRoomResponse, RoomStatusResponse } from "@/lib/game/net/protocol";

export type LobbyMode = { kind: "solo" } | { kind: "local"; humans: 2 | 3 | 4 } | { kind: "sandbox" };

export type NetworkJoin = {
  roomCode: string;
  wsUrl: string;
};

export type GameLobbyProps = {
  mode: LobbyMode;
  roomCode?: string;
  error?: string | null;
  onLocal: (humans: 2 | 3 | 4) => void;
  onSolo?: () => void;
  onHost: () => Promise<void> | void;
  onJoin: () => Promise<void> | void;
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  hosting?: boolean;
  joining?: boolean;
};

export function GameLobby({
  mode,
  roomCode,
  error,
  onLocal,
  onSolo,
  onHost,
  onJoin,
  joinCode,
  onJoinCodeChange,
  hosting,
  joining
}: GameLobbyProps) {
  return (
    <section
      className="pointer-events-auto z-30 w-full border-b border-emerald-900/50 bg-slate-950/95 px-3 py-3 text-slate-100 shadow-lg backdrop-blur sm:px-4"
      aria-label="Multiplayer lobby"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
            Local captains
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {([2, 3, 4] as const).map((count) => (
              <button
                key={count}
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  mode.kind === "local" && mode.humans === count
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                }`}
                onClick={() => onLocal(count)}
              >
                {`Local ${count}`}
              </button>
            ))}
            {onSolo ? (
              <button
                type="button"
                className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-slate-700"
                onClick={onSolo}
              >
                Solo
              </button>
            ) : null}
          </div>
          <ul className="mt-2 grid gap-0.5 text-[11px] text-slate-300 sm:grid-cols-2">
            {LOCAL_BINDINGS.map((binding) => (
              <li key={binding.playerId}>
                {binding.title}: {binding.detail}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-[16rem] flex-1 lg:max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
            Networked match
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <button
              type="button"
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              onClick={() => void onHost()}
              disabled={hosting}
            >
              Host match
            </button>
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs font-semibold text-slate-200">
              Room code
              <input
                value={joinCode}
                onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase())}
                className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm font-medium tracking-widest text-slate-50"
                autoComplete="off"
                spellCheck={false}
                placeholder="ABCD"
                aria-label="Room code"
              />
            </label>
            <button
              type="button"
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
              onClick={() => void onJoin()}
              disabled={joining}
            >
              Join match
            </button>
          </div>
          {roomCode ? (
            <p className="mt-2 text-xs text-amber-200">
              Sharing code <span className="font-mono tracking-widest">{roomCode}</span>
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs font-semibold text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export async function hostMatchRequest(): Promise<CreateRoomResponse> {
  const response = await fetch("/api/match", { method: "POST" });
  const body = (await response.json().catch(() => ({}))) as Partial<CreateRoomResponse> & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || "match_server_unavailable");
  }
  if (!body.roomCode || !body.wsUrl) {
    throw new Error("match_server_unavailable");
  }
  return { roomCode: body.roomCode, wsUrl: body.wsUrl };
}

export async function joinMatchStatus(code: string): Promise<RoomStatusResponse> {
  const response = await fetch(`/api/match?code=${encodeURIComponent(code)}`);
  return (await response.json()) as RoomStatusResponse;
}
