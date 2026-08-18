import {
  formationSlotLocal,
  type FormationId,
  type FormationSlot
} from "@/lib/game/data/formations";

export type CaptainPose = {
  x: number;
  y?: number;
  z: number;
  yaw: number;
};

export type WorldSlot = {
  x: number;
  y: number;
  z: number;
};

/**
 * Captain-local (x = right, z = forward) to world XZ.
 * yaw 0 faces +Z, matching locomotion.
 */
export function formationSlotWorld(
  captainPose: CaptainPose,
  formationId: FormationId,
  slotIndex: number,
  customSlots?: FormationSlot[]
): WorldSlot {
  const local = formationSlotLocal(formationId, slotIndex, customSlots);
  const yaw = captainPose.yaw;
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const fwdX = Math.sin(yaw);
  const fwdZ = Math.cos(yaw);
  return {
    x: captainPose.x + local.x * rightX + local.z * fwdX,
    y: captainPose.y ?? 0,
    z: captainPose.z + local.x * rightZ + local.z * fwdZ
  };
}

export function worldSlotsForFormation(
  captainPose: CaptainPose,
  formationId: FormationId,
  customSlots?: FormationSlot[]
): WorldSlot[] {
  const count = formationId === "custom" && customSlots ? customSlots.length : 20;
  const slots: WorldSlot[] = [];
  for (let i = 0; i < count; i++) {
    slots.push(formationSlotWorld(captainPose, formationId, i, customSlots));
  }
  return slots;
}
