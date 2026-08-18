export type GroundHeightFn = (x: number, z: number) => number;

/** Default infinite plane at y = 0. Ticket 005 replaces this via registerGroundHeight. */
let sampleFn: GroundHeightFn = () => 0;

export function registerGroundHeight(fn: GroundHeightFn): void {
  sampleFn = fn;
}

export function sampleGroundHeight(x: number, z: number): number {
  return sampleFn(x, z);
}

export function resetGroundHeight(): void {
  sampleFn = () => 0;
}
