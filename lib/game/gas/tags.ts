import { DEFAULT_MAX_HEALTH } from "@/lib/game/combat/health";
import { grantedAbilities, type LoadoutRole } from "@/lib/game/data/abilities";
import type { AbilitySystemComponent, Entity } from "@/lib/game/sim/types";

export const State = {
  Stumble: "State.Stumble",
  Knockdown: "State.Knockdown",
  Dead: "State.Dead",
  Control: {
    Lost: "State.Control.Lost"
  }
} as const;

export function ensureAbilitySystem(
  entity: Entity,
  unitDefId?: string,
  loadout?: LoadoutRole
): AbilitySystemComponent {
  const existing = entity.components.abilitySystem;
  if (existing) return existing;
  const role = loadout ?? inferLoadout(entity, unitDefId);
  const defId = unitDefId ?? inferUnitDefId(entity);
  const gas: AbilitySystemComponent = {
    attributes: { health: DEFAULT_MAX_HEALTH, maxHealth: DEFAULT_MAX_HEALTH },
    tags: [],
    granted: [...grantedAbilities(defId, role)],
    cooldowns: {},
    activationQueue: [],
    loadout: role
  };
  entity.components.abilitySystem = gas;
  return gas;
}

export function inferLoadout(entity: Entity, unitDefId?: string): LoadoutRole {
  const defId = unitDefId ?? inferUnitDefId(entity);
  if (defId === "archer") return "ranged";
  return "melee";
}

export function inferUnitDefId(entity: Entity): string {
  return entity.components.appearance?.unitDefId ?? (entity.kind === "captain" ? "captain" : "swordsman");
}

export function hasTag(entity: Entity, tag: string): boolean {
  return entity.components.abilitySystem?.tags.includes(tag) ?? false;
}

export function addTag(entity: Entity, tag: string): void {
  const gas = ensureAbilitySystem(entity);
  if (!gas.tags.includes(tag)) gas.tags.push(tag);
}

export function removeTag(entity: Entity, tag: string): void {
  const gas = entity.components.abilitySystem;
  if (!gas) return;
  gas.tags = gas.tags.filter((item) => item !== tag);
}

export function syncAbilityTagsFromHit(entity: Entity): void {
  const hit = entity.components.hitReaction;
  if (!hit) return;
  ensureAbilitySystem(entity);
  if (hit.state === "death") {
    addTag(entity, State.Dead);
    addTag(entity, State.Control.Lost);
    removeTag(entity, State.Stumble);
    removeTag(entity, State.Knockdown);
    return;
  }
  if (hit.state === "knockdown") {
    addTag(entity, State.Knockdown);
    addTag(entity, State.Control.Lost);
    removeTag(entity, State.Stumble);
    removeTag(entity, State.Dead);
    return;
  }
  if (hit.state === "stumble") {
    addTag(entity, State.Stumble);
    removeTag(entity, State.Knockdown);
    removeTag(entity, State.Control.Lost);
    removeTag(entity, State.Dead);
    return;
  }
  removeTag(entity, State.Stumble);
  removeTag(entity, State.Knockdown);
  removeTag(entity, State.Control.Lost);
}
