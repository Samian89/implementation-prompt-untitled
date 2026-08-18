export const HIT_FORCE = {
  /** Exclusive upper bound for stumble. `force < 20` is stumble. */
  stumbleBelow: 20,
  /** Inclusive upper bound for knockdown. `20 <= force <= 50` is knockdown. */
  deathAbove: 50
} as const;

export type HitBand = "stumble" | "knockdown" | "death";

/** Classify an incoming impulse. Call sites must not hardcode these bands. */
export function classifyHitForce(force: number): HitBand {
  if (force < HIT_FORCE.stumbleBelow) return "stumble";
  if (force <= HIT_FORCE.deathAbove) return "knockdown";
  return "death";
}

/** Durations at the locked 60 Hz tick. Knockdown is inside the 1–2 s window. */
export const HIT_REACTION_TICKS = {
  stumble: 18,
  knockdown: 90
} as const;

export const DEBUG_IMPULSE_FORCE = {
  stumble: 10,
  knockdown: 35,
  death: 60
} as const;
