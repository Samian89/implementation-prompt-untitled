"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { emptyInput } from "@/lib/game/sim/input";
import type { Snapshot } from "@/lib/game/sim/types";
import { LOCAL_BINDINGS, sampleMove } from "@/lib/game/net/bindings";
import { WsHost } from "@/lib/game/net/ws-host";
import { findHumanCaptain } from "@/lib/game/net/session";
import { MatchHud } from "./match-hud";
import { battlefieldLabel } from "@/lib/game/net/bindings";

const BattlefieldPane = dynamic(
  () => import("./battlefield-pane").then((mod) => mod.BattlefieldPane),
  { ssr: false }
);

export type NetworkPlayProps = {
  roomCode: string;
  wsUrl: string;
  playerName: string;
  onError?: (message: string) => void;
};

export function NetworkPlay({ roomCode, wsUrl, playerName, onError }: NetworkPlayProps) {
  const hostRef = useRef<WsHost | null>(null);
  const lookRef = useRef({ yaw: 0, pitch: -0.12 });
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [status, setStatus] = useState("Connecting…");

  useEffect(() => {
    const host = new WsHost({ wsUrl, roomCode, playerName });
    hostRef.current = host;
    const unsub = host.onSnapshot(setSnapshot);
    const keys = new Set<string>();
    const onKeyDown = (event: KeyboardEvent) => keys.add(event.code);
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let raf = 0;
    const frame = () => {
      const assigned = host.getLocalPlayerIds()[0];
      if (assigned && hostRef.current) {
        const move = sampleMove(keys, LOCAL_BINDINGS[0]!);
        host.submitInput({
          ...emptyInput(assigned, 0),
          moveX: move.moveX,
          moveY: move.moveY,
          lookYaw: lookRef.current.yaw,
          lookPitch: lookRef.current.pitch
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    void host
      .connect()
      .then((joined) => {
        setPlayerId(joined.playerId);
        setStatus(`Seated as ${joined.playerId} · ${joined.seatsTaken}/${joined.seatsMax}`);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "match_server_unavailable";
        setStatus(message);
        onError?.(message);
      });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      unsub();
      host.dispose();
      hostRef.current = null;
    };
  }, [roomCode, wsUrl, playerName, onError]);

  const followId = playerId ?? "p1";
  const local = snapshot ? findHumanCaptain(snapshot.entities, followId) : undefined;

  return (
    <div className="relative h-full min-h-[22rem] w-full bg-slate-950">
      <section aria-label={battlefieldLabel(1)} className="h-full">
        <BattlefieldPane
          snapshot={snapshot}
          playerId={followId}
          ariaLabel={battlefieldLabel(1)}
          capturePointer
          onPointerLook={(dx, dy) => {
            lookRef.current.yaw -= dx * 0.0024;
            lookRef.current.pitch = Math.max(-0.7, Math.min(0.35, lookRef.current.pitch - dy * 0.002));
          }}
        />
      </section>
      <p className="pointer-events-none absolute left-3 top-3 rounded bg-slate-950/70 px-2 py-1 text-xs text-slate-100">
        {status}
      </p>
      <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-4">
        <MatchHud snapshot={snapshot} localTeamId={local?.teamId} />
      </div>
    </div>
  );
}
