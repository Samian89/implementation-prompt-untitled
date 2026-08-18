import { describe, expect, it } from "vitest";
import { createMatch } from "@/lib/game/match/create-match";
import { createEngine, spawnCaptain } from "@/lib/game/sim/engine";
import { BONE_IDS, createJointedRagdoll, listBoneIds } from "./ragdoll";

function expectFiniteBones(entity: { components: { ragdoll?: { bones: Record<string, { x: number; y: number; z: number; vx: number }> } } }) {
  const bones = entity.components.ragdoll?.bones;
  expect(bones).toBeTruthy();
  for (const bone of Object.values(bones!)) {
    expect(Number.isFinite(bone.x)).toBe(true);
    expect(Number.isFinite(bone.y)).toBe(true);
    expect(Number.isFinite(bone.z)).toBe(true);
    expect(Number.isFinite(bone.vx)).toBe(true);
  }
}

describe("createJointedRagdoll", () => {
  it("exposes exactly the locked bone ids", () => {
    const ragdoll = createJointedRagdoll();
    const ids = listBoneIds(ragdoll);
    expect(ids.sort()).toEqual([...BONE_IDS].sort());
    expect(Object.keys(ragdoll.bones).sort()).toEqual([...BONE_IDS].sort());
    expect(Object.keys(ragdoll.bones)).toHaveLength(11);
  });
});

describe("ragdoll integration stays playable", () => {
  it("keeps a standing captain's bones finite for 10 seconds", () => {
    const sim = createEngine({ seed: 1 });
    const captain = spawnCaptain(sim, { x: 0, z: 0 });
    for (let i = 0; i < 600; i++) sim.step();
    expectFiniteBones(captain);
    const pelvis = captain.components.ragdoll!.bones.pelvis;
    expect(Math.abs(pelvis.x)).toBeLessThan(1.5);
    expect(Math.abs(pelvis.z)).toBeLessThan(1.5);
    expect(pelvis.y).toBeGreaterThan(0.4);
    expect(pelvis.y).toBeLessThan(2.2);
  });

  it("keeps every createMatch unit finite through 300 ticks", () => {
    const world = createMatch({ humanPlayers: 1, seed: 7 });
    for (let i = 0; i < 300; i++) world.step();
    let counted = 0;
    for (const entity of world.entities.values()) {
      if (!entity.components.ragdoll) continue;
      expectFiniteBones(entity);
      counted += 1;
    }
    expect(counted).toBeGreaterThan(4);
  });
});
