import { registerData } from "./registry";

export type CombatSensor = {
  id: "sensors.combat";
  range: number;
  halfAngleDeg: number;
  engageThreshold: number;
};

export const SENSORS = {
  combat: {
    id: "sensors.combat" as const,
    range: 14,
    halfAngleDeg: 50,
    engageThreshold: 0.35
  } satisfies CombatSensor
};

export const COMBAT_SENSOR = SENSORS.combat;

registerData("sensors", SENSORS);

export function getCombatSensor(): CombatSensor {
  return SENSORS.combat;
}
