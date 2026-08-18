import { describe, expect, it } from "vitest";
import { BONE_IDS, createJointedRagdoll, listBoneIds } from "./ragdoll";

describe("createJointedRagdoll", () => {
  it("exposes exactly the locked bone ids", () => {
    const ragdoll = createJointedRagdoll();
    const ids = listBoneIds(ragdoll);
    expect(ids.sort()).toEqual([...BONE_IDS].sort());
    expect(Object.keys(ragdoll.bones).sort()).toEqual([...BONE_IDS].sort());
    expect(Object.keys(ragdoll.bones)).toHaveLength(11);
  });
});
