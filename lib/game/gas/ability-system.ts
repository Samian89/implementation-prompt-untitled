import { executeMeleeStrike } from "@/lib/game/combat/melee";
import { spawnArrowProjectile } from "@/lib/game/combat/projectile";
import { pruneCombatFx } from "@/lib/game/combat/fx";
import {
  MELEE_STRIKE,
  RANGED_SHOOT,
  requireAbilityDef,
  type LoadoutRole
} from "@/lib/game/data/abilities";
import { isCommandAbilityId } from "@/lib/game/data/commands";
import { applyCommandAbility } from "@/lib/game/command/orders";
import { INPUT_BUTTON } from "@/lib/game/sim/input";
import { registerSystem } from "@/lib/game/sim/systems";
import type { AbilityEvent, Entity, SimWorld, Vec3 } from "@/lib/game/sim/types";
import { facingAim } from "@/lib/game/combat/collider";
import {
  addTag,
  ensureAbilitySystem,
  grantsForEntity,
  hasTag,
  inferUnitDefId,
  State,
  syncAbilityTagsFromHit
} from "./tags";

export { addTag, ensureAbilitySystem, hasTag, State } from "./tags";

export const COMBAT_SYSTEM_NAME = "combat";

export type AbilityActivateContext = {
  aim?: Vec3;
  targetId?: string;
};

export type ActivateResult =
  | { ok: true; event: AbilityEvent }
  | { ok: false; error: "missing_source" | "not_granted" | "blocked" | "cooldown" | "unknown_ability" };

/** The only combat entry. Predicts an AbilityEvent and commits it on this tick. */
export function tryActivate(
  world: SimWorld,
  entityId: string,
  abilityId: string,
  ctx: AbilityActivateContext = {}
): ActivateResult {
  const source = world.getEntity(entityId);
  if (!source) return { ok: false, error: "missing_source" };

  const gas = ensureAbilitySystem(source);
  if (hasTag(source, State.Dead) || hasTag(source, State.Knockdown)) {
    return { ok: false, error: "blocked" };
  }
  const hit = source.components.hitReaction;
  if (hit?.state === "death" || hit?.state === "knockdown") {
    return { ok: false, error: "blocked" };
  }
  if (!gas.granted.includes(abilityId)) {
    return { ok: false, error: "not_granted" };
  }

  let def;
  try {
    def = requireAbilityDef(abilityId);
  } catch {
    return { ok: false, error: "unknown_ability" };
  }

  const remaining = gas.cooldowns[abilityId] ?? 0;
  if (remaining > 0) return { ok: false, error: "cooldown" };

  const aim = resolveAim(source, ctx.aim);
  const event: AbilityEvent = {
    tick: world.tick,
    sourceId: source.id,
    abilityId,
    aim
  };
  gas.cooldowns[abilityId] = def.cooldownTicks;
  gas.activationQueue.push(event);
  commitAbilityEvent(world, event);
  executeAbility(world, source, event);
  return { ok: true, event };
}

export function setUnitLoadout(entity: Entity, loadout: LoadoutRole): void {
  const gas = ensureAbilitySystem(entity, inferUnitDefId(entity), loadout);
  gas.loadout = loadout;
  gas.granted = grantsForEntity(entity, inferUnitDefId(entity), loadout);
}

export function getAbilityEvents(world: Pick<SimWorld, "bags">): AbilityEvent[] {
  const log = world.bags.abilityEvents;
  return Array.isArray(log) ? (log as AbilityEvent[]) : [];
}

function commitAbilityEvent(world: SimWorld, event: AbilityEvent): void {
  const log = getAbilityEvents(world);
  log.push(event);
  world.bags.abilityEvents = log;
}

function executeAbility(world: SimWorld, source: Entity, event: AbilityEvent): void {
  if (isCommandAbilityId(event.abilityId)) {
    applyCommandAbility(world, source, event.abilityId);
    return;
  }
  if (event.abilityId === MELEE_STRIKE) {
    executeMeleeStrike(world, source, event.aim);
    return;
  }
  if (event.abilityId === RANGED_SHOOT) {
    spawnArrowProjectile(world, source, event.aim);
  }
}

function resolveAim(source: Entity, aim?: Vec3): Vec3 {
  if (aim) return aim;
  const yaw = source.components.control?.lookYaw ?? source.components.transform?.yaw ?? 0;
  const pitch = source.components.control?.lookPitch ?? source.components.transform?.pitch ?? 0;
  return facingAim(yaw, pitch * 0.35);
}

export function combatSystem(world: SimWorld): void {
  pruneCombatFx(world);
  for (const entity of world.entities.values()) {
    const gas = entity.components.abilitySystem;
    if (gas) {
      for (const [id, ticks] of Object.entries(gas.cooldowns)) {
        gas.cooldowns[id] = Math.max(0, ticks - 1);
      }
      gas.activationQueue = [];
    }
    syncAbilityTagsFromHit(entity);

    const swing = entity.components.swing;
    if (swing) {
      swing.remainingTicks -= 1;
      if (swing.remainingTicks <= 0) delete entity.components.swing;
    }

    const control = entity.components.control;
    if (!control || !gas) continue;
    const buttons = control.buttons ?? 0;
    if (buttons & INPUT_BUTTON.meleeStrike) {
      tryActivate(world, entity.id, MELEE_STRIKE);
    }
    if (buttons & INPUT_BUTTON.rangedShoot) {
      tryActivate(world, entity.id, RANGED_SHOOT);
    }
  }
}

export function ensureCombatSystem(): void {
  registerSystem(COMBAT_SYSTEM_NAME, combatSystem);
}

ensureCombatSystem();
