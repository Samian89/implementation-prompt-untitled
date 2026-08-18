import { registerData } from "./registry";

export type FormationId = "wedge" | "line" | "box" | "custom";

export type FormationSlot = {
  index: number;
  x: number;
  z: number;
};

export type FormationDef = {
  id: FormationId;
  displayName: string;
  slots: FormationSlot[];
};

const SLOT_COUNT = 20;

function slotsFrom(points: Array<{ x: number; z: number }>): FormationSlot[] {
  return points.slice(0, SLOT_COUNT).map((point, index) => ({
    index,
    x: point.x,
    z: point.z
  }));
}

/** Apex front-center (+Z local), ranks widening behind. */
function wedgeSlots(): FormationSlot[] {
  const points: Array<{ x: number; z: number }> = [];
  const ranks = [1, 2, 3, 4, 5, 5];
  let z = 2.4;
  for (const count of ranks) {
    const span = Math.max(0, count - 1) * 1.35;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      points.push({ x: -span / 2 + t * span, z });
    }
    z -= 1.45;
  }
  return slotsFrom(points);
}

/** Single rank perpendicular to facing, Captain-centered, slightly behind. */
function lineSlots(): FormationSlot[] {
  const points: Array<{ x: number; z: number }> = [];
  const spacing = 1.2;
  const start = -((SLOT_COUNT - 1) * spacing) / 2;
  for (let i = 0; i < SLOT_COUNT; i++) {
    points.push({ x: start + i * spacing, z: -1.6 });
  }
  return slotsFrom(points);
}

/** Hollow 7×5 rectangle around the Captain. */
function boxSlots(): FormationSlot[] {
  const points: Array<{ x: number; z: number }> = [];
  const halfW = 3.6;
  const halfD = 2.6;
  const front = 7;
  const side = 3;
  for (let i = 0; i < front; i++) {
    const t = i / (front - 1);
    points.push({ x: -halfW + t * halfW * 2, z: halfD });
  }
  for (let i = 0; i < front; i++) {
    const t = i / (front - 1);
    points.push({ x: -halfW + t * halfW * 2, z: -halfD });
  }
  for (let i = 0; i < side; i++) {
    const t = (i + 1) / (side + 1);
    points.push({ x: -halfW, z: halfD - t * halfD * 2 });
  }
  for (let i = 0; i < side; i++) {
    const t = (i + 1) / (side + 1);
    points.push({ x: halfW, z: halfD - t * halfD * 2 });
  }
  return slotsFrom(points);
}

/** Default custom loadout: 4×5 cluster on a 2 m grid (composer is 9×9). */
export const CUSTOM_GRID_SIZE = 9;
export const CUSTOM_CELL_METERS = 2;

export function defaultCustomSlots(): FormationSlot[] {
  const points: Array<{ x: number; z: number }> = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      points.push({
        x: (col - 2) * CUSTOM_CELL_METERS,
        z: (1 - row) * CUSTOM_CELL_METERS
      });
    }
  }
  return slotsFrom(points);
}

export const FORMATIONS: Record<FormationId, FormationDef> = {
  wedge: { id: "wedge", displayName: "Wedge", slots: wedgeSlots() },
  line: { id: "line", displayName: "Line", slots: lineSlots() },
  box: { id: "box", displayName: "Box", slots: boxSlots() },
  custom: { id: "custom", displayName: "Custom", slots: defaultCustomSlots() }
};

registerData("formations", FORMATIONS);

export function listFormationIds(): FormationId[] {
  return ["wedge", "line", "box", "custom"];
}

export function getFormation(id: string): FormationDef | undefined {
  if (id === "wedge" || id === "line" || id === "box" || id === "custom") {
    return FORMATIONS[id];
  }
  return undefined;
}

export function requireFormation(id: string): FormationDef {
  const def = getFormation(id);
  if (!def) throw new Error(`unknown formation: ${id}`);
  return def;
}

export function formationSlotLocal(
  formationId: FormationId,
  slotIndex: number,
  customSlots?: FormationSlot[]
): FormationSlot {
  const slots = formationId === "custom" && customSlots && customSlots.length > 0 ? customSlots : requireFormation(formationId).slots;
  const found = slots.find((slot) => slot.index === slotIndex);
  if (found) return found;
  return slots[Math.max(0, Math.min(slots.length - 1, slotIndex))] ?? { index: slotIndex, x: 0, z: -2 };
}
