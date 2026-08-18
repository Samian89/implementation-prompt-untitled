"use client";

import type { PointerEvent } from "react";
import { handleMapPointer } from "@/lib/game/command/map-scroll";
import type { Snapshot } from "@/lib/game/sim/types";

type FortMarker = {
  id: string;
  x: number;
  z: number;
  ownerTeamId?: string;
};

function readForts(snapshot?: Snapshot | null): FortMarker[] {
  const raw = snapshot?.bags.forts;
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : Object.entries(raw as Record<string, unknown>).map(([id, value]) => ({
        id,
        ...(typeof value === "object" && value ? (value as Record<string, unknown>) : {})
      }));
  const markers: FortMarker[] = [];
  for (const entry of list) {
    const fort = entry as Partial<FortMarker> & Record<string, unknown>;
    if (typeof fort.x !== "number" || typeof fort.z !== "number") continue;
    markers.push({
      id: String(fort.id ?? "fort"),
      x: fort.x,
      z: fort.z,
      ownerTeamId: typeof fort.ownerTeamId === "string" ? fort.ownerTeamId : undefined
    });
  }
  return markers;
}

type MapScrollProps = {
  open: boolean;
  snapshot?: Snapshot | null;
  onClose?: () => void;
};

function project(x: number, z: number, span = 24) {
  return {
    left: `${((x + span) / (span * 2)) * 100}%`,
    top: `${((span - z) / (span * 2)) * 100}%`
  };
}

export function MapScroll({ open, snapshot, onClose }: MapScrollProps) {
  const forts = readForts(snapshot);
  const units = (snapshot?.entities ?? []).filter(
    (entity) => entity.kind === "captain" || entity.kind === "bot"
  );

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / Math.max(1, rect.width);
    const nz = (event.clientY - rect.top) / Math.max(1, rect.height);
    handleMapPointer(nx, nz);
  };

  return (
    <section
      className={`pointer-events-auto w-full max-w-md rounded-xl border border-slate-500/40 bg-slate-950/92 text-slate-50 shadow-xl backdrop-blur ${
        open ? "max-h-[70dvh] overflow-y-auto" : "hidden"
      }`}
      aria-hidden={!open}
      aria-label="Map Scroll"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-700/60 px-4 py-3">
        <h2 className="text-base font-semibold tracking-wide">Map Scroll</h2>
        {onClose ? (
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-slate-200/80 hover:bg-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        ) : null}
      </header>
      <div className="p-4">
        <div
          className="relative aspect-square w-full max-w-[18rem] overflow-hidden rounded-md border border-slate-600/50 bg-emerald-950"
          onPointerDown={onPointer}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            handleMapPointer(
              (event.clientX - rect.left) / Math.max(1, rect.width),
              (event.clientY - rect.top) / Math.max(1, rect.height)
            );
          }}
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-emerald-800">
            <path
              d="M4 72 C 18 60, 28 80, 46 70 C 62 60, 74 78, 96 64 L 96 96 L 4 96 Z"
              fill="currentColor"
              opacity="0.45"
            />
            <path d="M8 18 C 22 10, 30 28, 48 20 C 64 12, 80 26, 92 16" fill="none" stroke="#334155" strokeWidth="2" />
            <circle cx="50" cy="48" r="10" fill="#3f6212" opacity="0.55" />
          </svg>
          {forts.length === 0 ? (
            <>
              <span className="absolute left-2 top-2 h-2 w-2 rounded-sm bg-slate-500/70" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-sm bg-slate-500/70" />
              <span className="absolute bottom-2 left-2 h-2 w-2 rounded-sm bg-slate-500/70" />
              <span className="absolute bottom-2 right-2 h-2 w-2 rounded-sm bg-slate-500/70" />
            </>
          ) : (
            forts.map((fort) => (
              <span
                key={fort.id}
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-amber-400"
                style={project(fort.x, fort.z)}
                title={fort.id}
              />
            ))
          )}
          {units.map((unit) => {
            const transform = unit.components.transform;
            if (!transform) return null;
            return (
              <span
                key={unit.id}
                className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  unit.kind === "captain" ? "bg-amber-300" : "bg-sky-300"
                }`}
                style={project(transform.x, transform.z)}
              />
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-300/80">
          View only. Clicking the parchment does not issue a march or a command.
        </p>
      </div>
    </section>
  );
}
