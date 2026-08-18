import {
  COMMAND_CALL_TO_ARMS,
  COMMAND_FOLLOW,
  COMMAND_FORM_BOX,
  COMMAND_FORM_CUSTOM,
  COMMAND_FORM_LINE,
  COMMAND_FORM_WEDGE,
  COMMAND_HOLD,
  COMMAND_RETREAT,
  COMMAND_ABILITY_IDS,
  isCommandAbilityId,
  type CommandAbilityId
} from "@/lib/game/data/commands";
import { defaultCustomSlots } from "@/lib/game/data/formations";
import { facingAim } from "@/lib/game/combat/collider";
import { State } from "@/lib/game/gas/tags";
import { registerSystem } from "@/lib/game/sim/systems";
import type {
  AbilityEvent,
  Entity,
  FormationLoadoutComponent,
  OrderComponent,
  SimWorld
} from "@/lib/game/sim/types";
import { formationSlotWorld, type CaptainPose } from "./formations";

export const FOLLOW_SYSTEM_NAME = "follow";
export const SCROLL_POSE_SYSTEM_NAME = "scrollPose";

const ARRIVE_DISTANCE = 0.55;

export type UiBag = {
  formationScrollOpen?: boolean;
  mapScrollOpen?: boolean;
};

export function isLivingCombatant(entity: Entity): boolean {
  if (entity.kind !== "captain" && entity.kind !== "bot") return false;
  if (entity.components.hitReaction?.state === "death") return false;
  const tags = entity.components.abilitySystem?.tags ?? [];
  if (tags.includes(State.Dead)) return false;
  return true;
}

export function ensureUiBag(world: Pick<SimWorld, "bags">): UiBag {
  const existing = world.bags.ui;
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return existing as UiBag;
  }
  const ui: UiBag = {};
  world.bags.ui = ui;
  return ui;
}

/** Opens/closes the formation overlay. Never writes timeScale. */
export function setFormationScrollOpen(world: Pick<SimWorld, "bags" | "timeScale">, open: boolean): void {
  const ui = ensureUiBag(world);
  ui.formationScrollOpen = open;
  world.bags.ui = ui;
}

export function setMapScrollOpen(world: Pick<SimWorld, "bags">, open: boolean): void {
  const ui = ensureUiBag(world);
  ui.mapScrollOpen = open;
  world.bags.ui = ui;
}

export function isFormationScrollOpen(world: Pick<SimWorld, "bags">): boolean {
  const ui = world.bags.ui;
  if (!ui || typeof ui !== "object") return false;
  return Boolean((ui as UiBag).formationScrollOpen);
}

export function isMapScrollOpen(world: Pick<SimWorld, "bags">): boolean {
  const ui = world.bags.ui;
  if (!ui || typeof ui !== "object") return false;
  return Boolean((ui as UiBag).mapScrollOpen);
}

export function ensureCommandGrants(entity: Entity): void {
  const gas = entity.components.abilitySystem;
  if (!gas || entity.kind !== "captain") return;
  for (const id of COMMAND_ABILITY_IDS) {
    if (!gas.granted.includes(id)) gas.granted.push(id);
  }
}

export function ensureFormationLoadout(entity: Entity): FormationLoadoutComponent {
  const existing = entity.components.formationLoadout;
  if (existing) return existing;
  const transform = entity.components.transform;
  const loadout: FormationLoadoutComponent = {
    activeId: "line",
    custom: { slots: defaultCustomSlots() },
    homeX: transform?.x ?? 0,
    homeZ: transform?.z ?? 0
  };
  entity.components.formationLoadout = loadout;
  return loadout;
}

export function captainPoseOf(entity: Entity): CaptainPose {
  const transform = entity.components.transform;
  const control = entity.components.control;
  return {
    x: transform?.x ?? 0,
    y: transform?.y ?? 0,
    z: transform?.z ?? 0,
    yaw: control?.lookYaw ?? transform?.yaw ?? 0
  };
}

export function listLivingSquadBots(world: SimWorld, captainId: string): Entity[] {
  const bots: Entity[] = [];
  for (const entity of world.entities.values()) {
    if (entity.kind !== "bot") continue;
    if (entity.components.squad?.captainId !== captainId) continue;
    if (!isLivingCombatant(entity)) continue;
    bots.push(entity);
  }
  return bots;
}

function slotIndexFor(bot: Entity): number {
  return bot.components.squad?.slotIndex ?? 0;
}

function ensureOrder(bot: Entity, loadout: FormationLoadoutComponent): OrderComponent {
  const existing = bot.components.order;
  if (existing) return existing;
  const custom = loadout.custom.slots.find((slot) => slot.index === slotIndexFor(bot));
  const order: OrderComponent = {
    mode: "follow",
    slotIndex: slotIndexFor(bot),
    formationId: loadout.activeId,
    customOffset: custom ? { x: custom.x, z: custom.z } : undefined
  };
  bot.components.order = order;
  return order;
}

export type RetreatTarget = {
  x: number;
  z: number;
  fortId?: string;
};

type FortRecord = {
  id?: string;
  ownerTeamId?: string;
  x?: number;
  z?: number;
  spawnX?: number;
  spawnZ?: number;
};

function asFortList(value: unknown): FortRecord[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as FortRecord[];
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (entry && typeof entry === "object") {
        return { id: key, ...(entry as FortRecord) };
      }
      return { id: key };
    });
  }
  return [];
}

export function resolveRetreatTarget(world: SimWorld, captain: Entity): RetreatTarget {
  const loadout = ensureFormationLoadout(captain);
  const forts = asFortList(world.bags.forts);
  if (forts.length > 0) {
    const homeId = loadout.homeFortId;
    const named = homeId
      ? forts.find((fort) => fort.id === homeId && fort.ownerTeamId === captain.teamId)
      : undefined;
    const owned = forts.find((fort) => fort.ownerTeamId === captain.teamId);
    const home = named ?? owned;
    if (home) {
      return {
        x: home.spawnX ?? home.x ?? loadout.homeX,
        z: home.spawnZ ?? home.z ?? loadout.homeZ,
        fortId: home.id
      };
    }
    const pose = captain.components.transform;
    return {
      x: pose?.x ?? loadout.homeX,
      z: pose?.z ?? loadout.homeZ
    };
  }
  return { x: loadout.homeX, z: loadout.homeZ, fortId: loadout.homeFortId };
}

function customSlotsFor(captain: Entity, order: OrderComponent) {
  if (order.customOffset) {
    return [{ index: order.slotIndex, x: order.customOffset.x, z: order.customOffset.z }];
  }
  return captain.components.formationLoadout?.custom.slots;
}

export function applyCommandAbility(world: SimWorld, captain: Entity, abilityId: string): void {
  if (captain.kind !== "captain") return;
  if (!isCommandAbilityId(abilityId)) return;
  const loadout = ensureFormationLoadout(captain);
  ensureCommandGrants(captain);

  if (abilityId === COMMAND_FORM_WEDGE) loadout.activeId = "wedge";
  if (abilityId === COMMAND_FORM_LINE) loadout.activeId = "line";
  if (abilityId === COMMAND_FORM_BOX) loadout.activeId = "box";
  if (abilityId === COMMAND_FORM_CUSTOM) loadout.activeId = "custom";

  const living = listLivingSquadBots(world, captain.id);

  if (
    abilityId === COMMAND_FORM_WEDGE ||
    abilityId === COMMAND_FORM_LINE ||
    abilityId === COMMAND_FORM_BOX ||
    abilityId === COMMAND_FORM_CUSTOM
  ) {
    for (const bot of living) {
      const order = ensureOrder(bot, loadout);
      order.formationId = loadout.activeId;
      if (loadout.activeId === "custom") {
        const slot = loadout.custom.slots.find((item) => item.index === order.slotIndex);
        if (slot) order.customOffset = { x: slot.x, z: slot.z };
      }
    }
    return;
  }

  if (abilityId === COMMAND_FOLLOW || abilityId === COMMAND_CALL_TO_ARMS) {
    for (const bot of living) {
      const order = ensureOrder(bot, loadout);
      order.mode = "follow";
      order.formationId = loadout.activeId;
      order.engaging = false;
    }
    return;
  }

  if (abilityId === COMMAND_HOLD) {
    const pose = captainPoseOf(captain);
    for (const bot of living) {
      const order = ensureOrder(bot, loadout);
      const worldSlot = formationSlotWorld(pose, order.formationId, order.slotIndex, customSlotsFor(captain, order));
      order.mode = "hold";
      order.holdX = worldSlot.x;
      order.holdZ = worldSlot.z;
      order.engaging = false;
    }
    return;
  }

  if (abilityId === COMMAND_RETREAT) {
    const target = resolveRetreatTarget(world, captain);
    for (const bot of living) {
      const order = ensureOrder(bot, loadout);
      order.mode = "retreat";
      order.fortId = target.fortId;
      const offset = formationSlotWorld(
        { x: 0, y: 0, z: 0, yaw: 0 },
        order.formationId,
        order.slotIndex,
        customSlotsFor(captain, order)
      );
      order.retreatX = target.x + offset.x * 0.35;
      order.retreatZ = target.z + offset.z * 0.35;
      order.engaging = false;
    }
  }
}

export type IssueCommandResult =
  | { ok: true; event: AbilityEvent }
  | { ok: false; error: "missing_source" | "not_granted" };

export function issueCommand(
  world: SimWorld,
  captainId: string,
  abilityId: CommandAbilityId | string
): IssueCommandResult {
  const captain = world.getEntity(captainId);
  if (!captain) return { ok: false, error: "missing_source" };
  if (captain.kind !== "captain") return { ok: false, error: "not_granted" };
  ensureCommandGrants(captain);
  const yaw = captain.components.control?.lookYaw ?? captain.components.transform?.yaw ?? 0;
  const event: AbilityEvent = {
    tick: world.tick,
    sourceId: captain.id,
    abilityId,
    aim: facingAim(yaw, 0)
  };
  const existing = world.bags.abilityEvents;
  const log = Array.isArray(existing) ? (existing as AbilityEvent[]) : [];
  log.push(event);
  world.bags.abilityEvents = log;
  applyCommandAbility(world, captain, abilityId);
  return { ok: true, event };
}

export function writeCustomSlot(captain: Entity, slotIndex: number, x: number, z: number): void {
  const loadout = ensureFormationLoadout(captain);
  const slots = loadout.custom.slots;
  const existing = slots.find((slot) => slot.index === slotIndex);
  if (existing) {
    existing.x = x;
    existing.z = z;
  } else {
    slots.push({ index: slotIndex, x, z });
  }
}

export function marchTarget(
  world: SimWorld,
  bot: Entity,
  captain: Entity | undefined
): { x: number; z: number } | null {
  const order = bot.components.order;
  if (!order) return null;
  if (order.mode === "hold" && order.holdX != null && order.holdZ != null) {
    return { x: order.holdX, z: order.holdZ };
  }
  if (order.mode === "retreat") {
    if (order.retreatX != null && order.retreatZ != null) {
      return { x: order.retreatX, z: order.retreatZ };
    }
    if (captain) return resolveRetreatTarget(world, captain);
    return { x: 0, z: 0 };
  }
  if (!captain) return null;
  const pose = captainPoseOf(captain);
  return formationSlotWorld(pose, order.formationId, order.slotIndex, customSlotsFor(captain, order));
}

function driveToward(entity: Entity, target: { x: number; z: number }): void {
  const control = entity.components.control;
  const transform = entity.components.transform;
  if (!control || !transform || !control.enabled) {
    if (control) {
      control.moveX = 0;
      control.moveY = 0;
    }
    return;
  }
  const dx = target.x - transform.x;
  const dz = target.z - transform.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= ARRIVE_DISTANCE) {
    control.moveX = 0;
    control.moveY = 0;
    return;
  }
  control.lookYaw = Math.atan2(dx, dz);
  transform.yaw = control.lookYaw;
  control.moveX = 0;
  control.moveY = 1;
}

export function followSystem(world: SimWorld): void {
  for (const entity of world.entities.values()) {
    if (entity.kind !== "bot") continue;
    const order = entity.components.order;
    if (!order) continue;
    if (!isLivingCombatant(entity)) {
      const control = entity.components.control;
      if (control) {
        control.moveX = 0;
        control.moveY = 0;
      }
      continue;
    }
    if (order.engaging) continue;
    const captainId = entity.components.squad?.captainId;
    const captain = captainId ? world.getEntity(captainId) : undefined;
    const target = marchTarget(world, entity, captain);
    if (!target) continue;
    driveToward(entity, target);
  }
}

export function scrollPoseSystem(world: SimWorld): void {
  const open = isFormationScrollOpen(world);
  for (const entity of world.entities.values()) {
    if (entity.kind !== "captain") continue;
    entity.components.scrollPose = { active: open };
    if (!open) continue;
    const ragdoll = entity.components.ragdoll;
    const transform = entity.components.transform;
    if (!ragdoll || !transform) continue;
    const torso = ragdoll.bones.torso;
    const pelvis = ragdoll.bones.pelvis;
    const arm = ragdoll.bones.lowerArmR;
    const yaw = entity.components.control?.lookYaw ?? transform.yaw;
    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    if (torso && pelvis) {
      torso.x += (pelvis.x + fwdX * 0.1 - torso.x) * 0.18;
      torso.z += (pelvis.z + fwdZ * 0.1 - torso.z) * 0.18;
      torso.y += (pelvis.y + 0.34 - torso.y) * 0.12;
    }
    if (arm && torso) {
      arm.x += (torso.x + fwdX * 0.16 - arm.x) * 0.2;
      arm.z += (torso.z + fwdZ * 0.16 - arm.z) * 0.2;
      arm.y += (torso.y - 0.04 - arm.y) * 0.16;
    }
  }
}

export function ensureFollowSystem(): void {
  registerSystem(FOLLOW_SYSTEM_NAME, followSystem);
  registerSystem(SCROLL_POSE_SYSTEM_NAME, scrollPoseSystem);
}

ensureFollowSystem();


