export const MAP_HALF_EXTENT = 36;
export const FORT_OFFSET = 20;
export const COURTYARD_HALF = 4.6;
export const GATE_WIDTH = 3.2;
export const GATE_DEPTH = 1.15;
export const WALL_THICKNESS = 0.7;

export const FORT_IDS = ["NW", "NE", "SW", "SE"] as const;
export type FortId = (typeof FORT_IDS)[number];

export const FORT_ORIGINS: Record<FortId, { x: number; z: number }> = {
  NW: { x: -FORT_OFFSET, z: FORT_OFFSET },
  NE: { x: FORT_OFFSET, z: FORT_OFFSET },
  SW: { x: -FORT_OFFSET, z: -FORT_OFFSET },
  SE: { x: FORT_OFFSET, z: -FORT_OFFSET }
};

/** Inward-facing gate: south for northern forts, north for southern forts. */
export const FORT_GATE_DIR: Record<FortId, { x: number; z: number }> = {
  NW: { x: 0, z: -1 },
  NE: { x: 0, z: -1 },
  SW: { x: 0, z: 1 },
  SE: { x: 0, z: 1 }
};

export const PLAYER_HOME_FORT: FortId = "SW";

export const TEAM_BANNER: Record<string, string> = {
  "team-0": "#b45309",
  "team-1": "#991b1b",
  "team-2": "#1d4ed8",
  "team-3": "#166534"
};

export const NEUTRAL_BANNER = "#78716c";

export function bannerColorFor(teamId: string | null | undefined): string {
  if (!teamId) return NEUTRAL_BANNER;
  return TEAM_BANNER[teamId] ?? NEUTRAL_BANNER;
}

export function defaultOwnerForFort(id: FortId): string {
  if (id === "SW") return "team-0";
  if (id === "NE") return "team-1";
  if (id === "NW") return "team-2";
  return "team-3";
}
