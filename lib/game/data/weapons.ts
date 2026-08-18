import { registerData } from "./registry";

export type SwordWeapon = {
  id: "sword";
  traceLength: number;
  /** Standard connect — knockdown band (20–50). */
  force: number;
  radius: number;
};

export type ArrowWeapon = {
  id: "arrow";
  speed: number;
  gravity: number;
  force: number;
  radius: number;
};

export type WeaponTable = {
  sword: SwordWeapon;
  arrow: ArrowWeapon;
};

/** Data-driven weapon rows. Call sites read `weapons.sword` / `weapons.arrow`. */
export const weapons: WeaponTable = {
  sword: {
    id: "sword",
    traceLength: 2.2,
    force: 35,
    radius: 0.18
  },
  arrow: {
    id: "arrow",
    speed: 22,
    gravity: 16,
    force: 32,
    radius: 0.1
  }
};

registerData("weapons", weapons);

export const WEAPONS = weapons;

export function getWeapon<K extends keyof WeaponTable>(id: K): WeaponTable[K] {
  return weapons[id];
}
