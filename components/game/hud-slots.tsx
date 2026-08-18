"use client";

import { Fragment, type ReactNode } from "react";
import type { Snapshot } from "@/lib/game/sim/types";

export type HudSlotRender = (snapshot: Snapshot) => ReactNode;

export type HudSlot = {
  id: string;
  render: HudSlotRender;
};

const slots: HudSlot[] = [];

export function registerHudSlot(slot: HudSlot): void;
export function registerHudSlot(id: string, render: HudSlotRender): void;
export function registerHudSlot(idOrSlot: string | HudSlot, render?: HudSlotRender): void {
  const slot: HudSlot =
    typeof idOrSlot === "string" ? { id: idOrSlot, render: render! } : idOrSlot;
  const existing = slots.findIndex((item) => item.id === slot.id);
  if (existing >= 0) slots[existing] = slot;
  else slots.push(slot);
}

export function listHudSlots(): HudSlot[] {
  return slots.slice();
}

/** Play page is the only caller — later tickets append via registerHudSlot. */
export function renderHudSlots(snapshot: Snapshot): ReactNode {
  return slots.map((slot) => <Fragment key={slot.id}>{slot.render(snapshot)}</Fragment>);
}
