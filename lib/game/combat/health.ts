import type { AbilitySystemComponent, Entity } from "@/lib/game/sim/types";

export const DEFAULT_MAX_HEALTH = 100;

export function getAbilitySystem(entity: Entity): AbilitySystemComponent | undefined {
  return entity.components.abilitySystem;
}

export function getHealth(entity: Entity): number {
  return entity.components.abilitySystem?.attributes.health ?? DEFAULT_MAX_HEALTH;
}

export function getMaxHealth(entity: Entity): number {
  return entity.components.abilitySystem?.attributes.maxHealth ?? DEFAULT_MAX_HEALTH;
}

export function setHealth(entity: Entity, value: number): number {
  const gas = entity.components.abilitySystem;
  if (!gas) return value;
  gas.attributes.health = Math.max(0, Math.min(gas.attributes.maxHealth, value));
  return gas.attributes.health;
}

/** Subtracts `amount` from current health. Returns the remaining health. */
export function damageHealth(entity: Entity, amount: number): number {
  return setHealth(entity, getHealth(entity) - amount);
}

export function isHealthDead(entity: Entity): boolean {
  return getHealth(entity) <= 0;
}

export function healthLabel(current: number): string {
  return `Health ${Math.max(0, Math.round(current))}`;
}
