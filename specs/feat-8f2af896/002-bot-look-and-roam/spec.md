---
# Add distinct squad bots with roam
## Task Type
delivery
## Goal
Spawn visually distinct squad bots that share the Captain's jointed-skeleton wobble, roam without tactics, and respect the architectural cap of 20 units per Captain. When this ticket is done `/play` shows a Captain plus roaming swordsman and archer placeholders, and headless tests prove appearance ids, the 20-unit clamp, and that idle bots change position.
## Context
Ticket 001 delivered one Captain, the ragdoll solver, the sim engine, and `/play`. There are no other units. Locked decisions: Captains are visually distinct from troop bots; a single default humanoid rig takes cosmetic skins; each Captain's squad architecture supports 20 units; Phase 2 is look-and-feel plus basic roaming, no tactics, no combat. Enemy targeting priority and formations are later tickets. The sim engine is 001-owned — register a `roam` system and a `units` factory; do not fork the tick loop.
## Technical Approach
**Data (`lib/game/data/units.ts`, this ticket owns):**
- Table rows: `swordsman`, `archer`, `captain`. Shared ragdoll prefab id. Distinct `skinId`, `primaryColor`, `heightScale`, `role: 'melee' | 'ranged' | 'captain'`.
- Captain row is a skin/priority marker only — no extra combat stats (those come in 003 and must stay equal to the chosen kit).
- `MAX_SQUAD_SIZE = 20` exported from this module. `spawnSquad(sim, captainId, roster)` refuses a 21st bot (`result.ok === false`, `error === 'squad_cap'`).

**Units (`lib/game/units`):**
- `createUnit({ kind, unitDefId, teamId, captainId, x, z })` attaches the 001 ragdoll + transform + control, plus `appearance { skinId, primaryColor, isCaptain }` and `squad { captainId, slotIndex }`.
- Bots start with `control.playerId = null` and `control.drivenBy = 'ai'`.
- Cosmetic skins are color/mesh-variant ids on the same bone set (helmet knob, tabard color). No second skeleton.

**Roam (`lib/game/ai/roam.ts`):**
- Register system `roam`. If a bot has no order component (004 will add orders), pick a wander point inside `roamRadius` (default 6m) of its spawn or captain, issue a move toward it, idle 1–3s, repeat.
- Roam must not run on captains with `control.drivenBy === 'player'`.
- Seedable RNG from `sim.rng` so tests are deterministic.

**View:**
- `components/game/unit-appearance.tsx` maps `appearance.skinId` to Three.js capsule materials. Captain: taller `heightScale`, crown/banner mesh, unique color. Swordsman and archer: different tabard colors and a bow-vs-blade prop (cosmetic only this ticket).
- Register a HUD slot that lists `Squad n/20` using the live bot count.

**Play wiring (shared touchpoint):** default sandbox on `/play` spawns 1 Captain + 4 swordsmen + 2 archers so the field is readable. Do not add combat or formation UI.
## Acceptance Criteria
- [ ] `lib/game/data/units.ts` exports `MAX_SQUAD_SIZE` equal to `20` and unit def ids `swordsman`, `archer`, `captain`
- [ ] `captain` def `skinId` is not equal to `swordsman.skinId` or `archer.skinId`
- [ ] `spawnSquad` with 20 bots returns `ok: true`; a 21st call returns `ok: false` and `error: 'squad_cap'` (`lib/game/units/spawn.test.ts`)
- [ ] After 180 ticks with no player input, at least one bot's `transform` XZ differs from its spawn by more than `0.5` (`lib/game/ai/roam.test.ts`)
- [ ] Every bot entity uses the same ragdoll bone id set as the Captain (assert bone id lists are deep-equal)
- [ ] `pnpm test -- lib/game/units lib/game/ai/roam lib/game/data/units` exits 0
- [ ] `/play` HUD contains the exact string `Squad` and the exact string `/20`
## Files to Touch
- lib/game/data/units.ts  (create)
- lib/game/data/units.test.ts  (create)
- lib/game/units/spawn.ts  (create)
- lib/game/units/spawn.test.ts  (create)
- lib/game/units/appearance.ts  (create)
- lib/game/ai/roam.ts  (create)
- lib/game/ai/roam.test.ts  (create)
- components/game/unit-appearance.tsx  (create)
- components/game/squad-count-hud.tsx  (create)
## Owned Areas
- lib/game/units
- lib/game/data/units.ts
- lib/game/ai/roam.ts
- components/game/unit-appearance.tsx
## Shared Touchpoints
- lib/game/sim
- lib/game/physics
- lib/game/data/registry.ts
- components/game/hud-slots.tsx
- components/game/play-canvas.tsx
- app/(game)/play/page.tsx
## Test Strategy
Run `pnpm test -- lib/game/units lib/game/ai/roam lib/game/data/units`. On `/play`, confirm one crowned/taller Captain and multiple differently colored bots that wander, bump, and wobble. Resize to a mobile width and confirm the `Squad n/20` readout remains visible.
## AMC Task Metadata
```json
{
  "title": "Add distinct squad bots with roam",
  "goal": "Spawn visually distinct squad bots that share the Captain's jointed-skeleton wobble, roam without tactics, and respect the architectural cap of 20 units per Captain. When this ticket is done /play shows a Captain plus roaming swordsman and archer placeholders, and headless tests prove appearance ids, the 20-unit clamp, and that idle bots change position.",
  "taskType": "delivery",
  "specRef": "specs/feat-8f2af896/002-bot-look-and-roam/spec.md",
  "acceptanceCriteria": [
    "lib/game/data/units.ts exports MAX_SQUAD_SIZE equal to 20 and unit def ids swordsman, archer, captain",
    "captain def skinId is not equal to swordsman.skinId or archer.skinId",
    "spawnSquad with 20 bots returns ok: true; a 21st call returns ok: false and error: 'squad_cap' (lib/game/units/spawn.test.ts)",
    "After 180 ticks with no player input, at least one bot's transform XZ differs from its spawn by more than 0.5 (lib/game/ai/roam.test.ts)",
    "Every bot entity uses the same ragdoll bone id set as the Captain (assert bone id lists are deep-equal)",
    "pnpm test -- lib/game/units lib/game/ai/roam lib/game/data/units exits 0",
    "/play HUD contains the exact string Squad and the exact string /20"
  ],
  "testCommand": "pnpm test -- lib/game/units lib/game/ai/roam lib/game/data/units",
  "phase": "build",
  "ownedAreas": [
    "lib/game/units",
    "lib/game/data/units.ts",
    "lib/game/ai/roam.ts",
    "components/game/unit-appearance.tsx"
  ],
  "sharedTouchpoints": [
    "lib/game/sim",
    "lib/game/physics",
    "lib/game/data/registry.ts",
    "components/game/hud-slots.tsx",
    "components/game/play-canvas.tsx",
    "app/(game)/play/page.tsx"
  ],
  "dependsOn": [
    "Ship landing page and wobbly physics prototype"
  ],
  "browserVerification": {
    "required": true,
    "criteria": [
      {
        "id": "AC-FE-3",
        "text": "Play field shows a taller or crowned Captain plus multiple differently colored bots that wander without player input, and the HUD reads Squad with /20",
        "route": "/play"
      }
    ]
  }
}
```
---
