import { COMMAND_RETREAT } from "@/lib/game/data/commands";
import { applyCommandAbility, ensureFormationLoadout, isLivingCombatant } from "@/lib/game/command/orders";
import { registerSystem } from "@/lib/game/sim/systems";
import type { Entity, SimWorld } from "@/lib/game/sim/types";
import { isDeadCombatant, queueRespawn } from "./respawn";

export const CAPTAIN_DEATH_SYSTEM_NAME = "captainDeath";
export const RETREAT_SHOUT = "Retreat!";

export type ShoutPayload = {
  entityId: string;
  text: string;
  tick: number;
};

export function getShouts(world: Pick<SimWorld, "bags">): ShoutPayload[] {
  const ui = world.bags.ui;
  if (ui && typeof ui === "object" && !Array.isArray(ui)) {
    const shouts = (ui as { shouts?: ShoutPayload[] }).shouts;
    if (Array.isArray(shouts)) return shouts;
  }
  return [];
}

export function pushShout(world: SimWorld, entity: Entity, text: string): void {
  entity.components.shout = { text, tick: world.tick };
  const ui =
    world.bags.ui && typeof world.bags.ui === "object" && !Array.isArray(world.bags.ui)
      ? (world.bags.ui as { shouts?: ShoutPayload[] })
      : {};
  const shouts = Array.isArray(ui.shouts) ? ui.shouts : [];
  shouts.push({ entityId: entity.id, text, tick: world.tick });
  ui.shouts = shouts.slice(-32);
  world.bags.ui = ui;
}

export function onCaptainDeath(world: SimWorld, captain: Entity): void {
  if (captain.kind !== "captain") return;
  ensureFormationLoadout(captain);
  queueRespawn(world, captain);
  const pending = captain.components.respawn;
  if (pending?.retreatIssued) return;
  if (pending) pending.retreatIssued = true;
  applyCommandAbility(world, captain, COMMAND_RETREAT);
  for (const entity of world.entities.values()) {
    if (entity.kind !== "bot") continue;
    if (entity.components.squad?.captainId !== captain.id) continue;
    if (!isLivingCombatant(entity)) continue;
    const order = entity.components.order;
    if (order) order.mode = "retreat";
    pushShout(world, entity, RETREAT_SHOUT);
  }
}

export function captainDeathSystem(world: SimWorld): void {
  if (!world.bags.forts) return;
  for (const entity of world.entities.values()) {
    if (entity.kind !== "captain") continue;
    if (!isDeadCombatant(entity)) continue;
    onCaptainDeath(world, entity);
  }
}

export function ensureCaptainDeathSystem(): void {
  registerSystem(CAPTAIN_DEATH_SYSTEM_NAME, captainDeathSystem);
}

ensureCaptainDeathSystem();
