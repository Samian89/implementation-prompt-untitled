"use client";

import type { PointerEvent } from "react";
import type { FormationId } from "@/lib/game/data/formations";
import { CUSTOM_CELL_METERS, CUSTOM_GRID_SIZE } from "@/lib/game/data/formations";
import type { Snapshot } from "@/lib/game/sim/types";

export type FormationCommand =
  | "command.follow"
  | "command.hold"
  | "command.retreat"
  | "command.form.wedge"
  | "command.form.line"
  | "command.form.box"
  | "command.form.custom";

type FormationScrollProps = {
  open: boolean;
  snapshot?: Snapshot | null;
  activeFormation?: FormationId;
  onIssue?: (abilityId: FormationCommand) => void;
  onClose?: () => void;
  onCustomSlot?: (slotIndex: number, x: number, z: number) => void;
};

const FORM_BUTTONS: Array<{ id: FormationCommand; label: "Wedge" | "Line" | "Box" | "Custom" }> = [
  { id: "command.form.wedge", label: "Wedge" },
  { id: "command.form.line", label: "Line" },
  { id: "command.form.box", label: "Box" },
  { id: "command.form.custom", label: "Custom" }
];

const ORDER_BUTTONS: Array<{ id: FormationCommand; label: "Follow" | "Hold" | "Retreat" }> = [
  { id: "command.follow", label: "Follow" },
  { id: "command.hold", label: "Hold" },
  { id: "command.retreat", label: "Retreat" }
];

function customTokens(snapshot?: Snapshot | null) {
  const captain = snapshot?.entities.find((entity) => entity.kind === "captain");
  const slots = captain?.components.formationLoadout?.custom.slots ?? [];
  const bots = (snapshot?.entities ?? []).filter((entity) => entity.kind === "bot");
  return bots.slice(0, 20).map((bot, i) => {
    const slotIndex = bot.components.squad?.slotIndex ?? i;
    const slot = slots.find((item) => item.index === slotIndex);
    return {
      id: bot.id,
      slotIndex,
      x: slot?.x ?? 0,
      z: slot?.z ?? -2
    };
  });
}

export function FormationScroll({
  open,
  snapshot,
  activeFormation,
  onIssue,
  onClose,
  onCustomSlot
}: FormationScrollProps) {
  const tokens = customTokens(snapshot);

  const onTokenPointer = (slotIndex: number, event: PointerEvent<HTMLButtonElement>) => {
    if (!onCustomSlot) return;
    const board = event.currentTarget.parentElement;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const col = Math.round(((event.clientX - rect.left) / rect.width) * (CUSTOM_GRID_SIZE - 1));
    const row = Math.round(((event.clientY - rect.top) / rect.height) * (CUSTOM_GRID_SIZE - 1));
    const clampedCol = Math.max(0, Math.min(CUSTOM_GRID_SIZE - 1, col));
    const clampedRow = Math.max(0, Math.min(CUSTOM_GRID_SIZE - 1, row));
    const x = (clampedCol - 4) * CUSTOM_CELL_METERS;
    const z = (4 - clampedRow) * CUSTOM_CELL_METERS;
    onCustomSlot(slotIndex, x, z);
  };

  return (
    <section
      className={`pointer-events-auto w-full max-w-md rounded-xl border border-amber-700/50 bg-stone-950/92 text-amber-50 shadow-xl backdrop-blur ${
        open ? "max-h-[70dvh] overflow-y-auto" : "hidden"
      }`}
      aria-hidden={!open}
      aria-label="Formation Scroll"
    >
      <header className="flex items-center justify-between gap-3 border-b border-amber-800/40 px-4 py-3">
        <h2 className="text-base font-semibold tracking-wide">Formation Scroll</h2>
        {onClose ? (
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-amber-100/80 hover:bg-amber-900/40"
            onClick={onClose}
          >
            Close
          </button>
        ) : null}
      </header>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {FORM_BUTTONS.map((button) => (
            <button
              key={button.id}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                activeFormation && button.label.toLowerCase() === activeFormation
                  ? "bg-amber-500 text-stone-950"
                  : "bg-stone-800 text-amber-50 hover:bg-stone-700"
              }`}
              onClick={() => onIssue?.(button.id)}
            >
              {button.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {ORDER_BUTTONS.map((button) => (
            <button
              key={button.id}
              type="button"
              className="rounded-md bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-emerald-50 hover:bg-emerald-700"
              onClick={() => onIssue?.(button.id)}
            >
              {button.label}
            </button>
          ))}
        </div>
        {activeFormation === "custom" ? (
          <div className="space-y-2">
            <p className="text-[11px] text-amber-100/80">
              Drag tokens on this 9×9 grid. Offsets are relative to the Captain, not the battlefield.
            </p>
            <div
              className="relative aspect-square w-full max-w-[18rem] rounded-md border border-amber-800/50 bg-[linear-gradient(to_right,rgba(180,83,9,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(180,83,9,0.18)_1px,transparent_1px)] bg-[size:11.11%_11.11%]"
            >
              {tokens.map((token) => {
                const col = 4 + token.x / CUSTOM_CELL_METERS;
                const row = 4 - token.z / CUSTOM_CELL_METERS;
                return (
                  <button
                    key={token.id}
                    type="button"
                    className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400 text-[9px] font-bold text-slate-950"
                    style={{
                      left: `${(col / (CUSTOM_GRID_SIZE - 1)) * 100}%`,
                      top: `${(row / (CUSTOM_GRID_SIZE - 1)) * 100}%`
                    }}
                    onPointerDown={(event) => onTokenPointer(token.slotIndex, event)}
                    onPointerUp={(event) => onTokenPointer(token.slotIndex, event)}
                    aria-label={`Slot ${token.slotIndex}`}
                  >
                    {token.slotIndex + 1}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <p className="text-[11px] leading-relaxed text-amber-100/70">
          Q toggles this scroll · C Follow / Call to Arms · H Hold · R Retreat. Time stays at full speed.
        </p>
      </div>
    </section>
  );
}
