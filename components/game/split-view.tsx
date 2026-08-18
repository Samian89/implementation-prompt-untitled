"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { emptyInput } from "@/lib/game/sim/input";
import type { Snapshot } from "@/lib/game/sim/types";
import {
  LOCAL_BINDINGS,
  battlefieldLabel,
  bindingForPlayer,
  sampleLookDelta,
  sampleMove
} from "@/lib/game/net/bindings";
import { LocalHost } from "@/lib/game/net/local-host";
import { findHumanCaptain } from "@/lib/game/net/session";
import { MatchHud } from "./match-hud";

const BattlefieldPane = dynamic(
  () => import("./battlefield-pane").then((mod) => mod.BattlefieldPane),
  { ssr: false }
);

export type SplitViewProps = {
  playerIds: string[];
  snapshot: Snapshot | null;
  looks?: Array<{ onPointerLook?: (dx: number, dy: number) => void }>;
};

export function SplitView({ playerIds, snapshot, looks }: SplitViewProps) {
  const count = Math.max(1, playerIds.length);
  const layout =
    count === 1
      ? "grid-cols-1 grid-rows-1"
      : count === 2
        ? "grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1"
        : "grid-cols-1 grid-rows-4 md:grid-cols-2 md:grid-rows-2";

  return (
    <div className={`grid h-full min-h-[22rem] w-full ${layout}`}>
      {playerIds.map((playerId, index) => {
        const label = battlefieldLabel(index + 1);
        return (
          <section
            key={playerId}
            aria-label={label}
            className="relative min-h-[10rem] overflow-hidden border border-slate-800"
          >
            <BattlefieldPane
              snapshot={snapshot}
              playerId={playerId}
              ariaLabel={label}
              capturePointer={index === 0}
              onPointerLook={looks?.[index]?.onPointerLook}
            />
            <p className="pointer-events-none absolute left-2 top-2 rounded bg-slate-950/70 px-2 py-1 text-[11px] font-semibold text-slate-100">
              {LOCAL_BINDINGS[index]?.title ?? `Captain ${index + 1}`} · {LOCAL_BINDINGS[index]?.detail}
            </p>
          </section>
        );
      })}
    </div>
  );
}

export type LocalSplitPlayProps = {
  humans: number;
  onLeave?: () => void;
};

export function LocalSplitPlay({ humans, onLeave }: LocalSplitPlayProps) {
  const hostRef = useRef<LocalHost | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [gen, setGen] = useState(0);
  const looks = useRef<Array<{ yaw: number; pitch: number }>>([]);

  const playerIds = useMemo(
    () => Array.from({ length: Math.max(2, Math.min(4, humans)) }, (_, i) => `p${i + 1}`),
    [humans]
  );

  useEffect(() => {
    const host = new LocalHost({
      playerIds,
      humans: playerIds.length,
      seed: 7
    });
    hostRef.current = host;
    looks.current = playerIds.map(() => ({ yaw: 0, pitch: -0.12 }));
    setSnapshot(host.getSnapshot());

    const keys = new Set<string>();
    const onKeyDown = (event: KeyboardEvent) => {
      keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };

    let raf = 0;
    let acc = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const elapsed = Math.min(0.08, (now - last) / 1000);
      last = now;
      acc += elapsed;
      while (acc >= host.world.dt) {
        for (let i = 0; i < playerIds.length; i++) {
          const playerId = playerIds[i]!;
          const binding = bindingForPlayer(playerId, i);
          const move = sampleMove(keys, binding);
          const look = looks.current[i] ?? { yaw: 0, pitch: -0.12 };
          const delta = sampleLookDelta(keys, binding);
          look.yaw += delta.yaw;
          look.pitch = Math.max(-0.7, Math.min(0.35, look.pitch + delta.pitch));
          looks.current[i] = look;
          host.submitInput({
            ...emptyInput(playerId, host.world.tick),
            moveX: move.moveX,
            moveY: move.moveY,
            lookYaw: look.yaw,
            lookPitch: look.pitch
          });
        }
        host.step();
        acc -= host.world.dt;
      }
      setSnapshot(host.getSnapshot());
      raf = requestAnimationFrame(frame);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      host.dispose();
      hostRef.current = null;
    };
  }, [playerIds, gen]);

  const lookHandlers = playerIds.map((_, index) => ({
    onPointerLook: (dx: number, dy: number) => {
      const look = looks.current[index] ?? { yaw: 0, pitch: -0.12 };
      look.yaw -= dx * 0.0024;
      look.pitch = Math.max(-0.7, Math.min(0.35, look.pitch - dy * 0.002));
      looks.current[index] = look;
    }
  }));

  const local = snapshot ? findHumanCaptain(snapshot.entities, playerIds[0]) : undefined;

  return (
    <div className="relative h-full min-h-[22rem] w-full bg-slate-950">
      <SplitView playerIds={playerIds} snapshot={snapshot} looks={lookHandlers} />
      <div className="pointer-events-none absolute inset-x-0 top-10 z-20 flex justify-center px-4">
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <MatchHud
            snapshot={snapshot}
            localTeamId={local?.teamId}
            onPlayAgain={() => setGen((value) => value + 1)}
          />
          {onLeave ? (
            <button
              type="button"
              className="rounded-md bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-100"
              onClick={onLeave}
            >
              Leave split
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
