---
# Ship landing page and wobbly physics prototype
## Task Type
delivery
## Goal
Replace the synthesized blank-next home with a Shield Wall product landing, add a `/play` third-person battlefield, and land the authoritative TypeScript simulation that walks a single jointed-skeleton Captain (cylinder/capsule limbs, spring-damper joints, active balance). When this ticket is done an operator can open `/`, click into `/play`, walk the wobbly Captain with WASD + mouse, and fire debug impulses that classify as stumble / knockdown / death at the locked force thresholds.
## Context
The composed foundation is blank-next: Next.js 15 App Router, Tailwind, Button/Card, no auth, no database, no test runner, no 3D/physics libraries. `app/page.tsx` is the kernel placeholder ("Your app is ready to build") and is a reserved path — a recompose overwrites it. Foundation docs say product pages belong under a route group; creating `app/(game)/page.tsx` while leaving `app/page.tsx` in place makes Next fail the build with two `/` pages, so this ticket deletes `app/page.tsx`. `siteNavLinks` is generated and empty (`hasPlay: false`); Play must be added in `components/site-header.tsx` (base-owned, known recompose cost). Locked physics: start directly with a jointed skeleton (not a bean/blob), spring-damper constraints, third-person camera, keyboard and mouse only, stylized feedback, no gore. Locked hit bands must exist in data even before combat: force `< 20` stumble (control kept), `20–50` knockdown (control lost 1–2s then recover), `> 50` death (full ragdoll + death state). Architecture must be replication-friendly from this ticket: fixed-dt tick, input commands, snapshots.
## Technical Approach
Implement a headless authoritative sim in TypeScript (`lib/game/sim`) that later tickets register systems into. Rendering is a client-only Three.js view of snapshots. Do not add Rapier/WASM — a custom spring-damper / XPBD solver stays deterministic, Node-testable, and lockstep-friendly.

**Simulation core (this ticket owns):**
- Fixed `dt = 1/60`. `timeScale` defaults to `1` and is part of every snapshot.
- `InputCommand { tick, playerId, moveX, moveY, lookYaw, lookPitch, buttons }` is the only way a human or AI drives a Captain.
- `Snapshot { tick, timeScale, entities, bags }` where `bags` is an open `Record<string, unknown>` later tickets write (`forts`, `match`, `economy`) without changing the Snapshot shape.
- Each entity has `id`, `teamId`, `kind: 'captain' | 'bot'`, `components` map. This ticket writes `transform`, `control`, `ragdoll`, `hitReaction`.
- `registerSystem(name, fn)` so 002–007 add systems from their own files. Engine ticks registered systems in registration order, then writes a snapshot.
- Classify incoming impulse magnitude with `classifyHitForce(force)` against `lib/game/data/hit-reactions.ts`. Do not hardcode thresholds at call sites.

**Ragdoll:**
- Bones (capsule or cylinder): `pelvis`, `torso`, `head`, `upperArmL`, `upperArmR`, `lowerArmL`, `lowerArmR`, `upperLegL`, `upperLegR`, `lowerLegL`, `lowerLegR`.
- Each joint: rest pose, linear/angular spring stiffness + damping, swing/twist limits.
- Active balance: world-up torque on pelvis and torso while `control.uprightAllowed === true`.
- Stumble (`force < 20`): brief stiffness drop + shove impulse; `control.enabled` stays true.
- Knockdown (`20 <= force <= 50`): `control.enabled = false` for 1000–2000 ms, partial ragdoll (lower stiffness, balance off), then a stand-up blend that restores control.
- Death (`force > 50`): `control.enabled = false` permanently, balance off, full ragdoll, `hitReaction.state === 'death'`.
- Ground: infinite plane at y=0 for this ticket. Later world tickets replace the sample function via `registerGroundHeight(fn)` owned here as the hook, implemented by 005.

**Playable surface:**
- Delete `app/page.tsx`. Add `app/(game)/page.tsx` landing that uses existing `Button` / `Card`. Visible `h1` text is exactly `Shield Wall`. Primary CTA text is exactly `Enter the field` and links to `/play`.
- `app/(game)/play/page.tsx` renders a client `PlayCanvas` (dynamic import, `ssr: false`) with `aria-label="Shield Wall battlefield"`.
- Third-person camera spring-follows behind the local Captain. No first-person toggle.
- WASD (or arrows) move in camera-relative XZ; mouse look. Debug keys `1` / `2` / `3` apply impulses of magnitude `10`, `35`, `60` to the local Captain so hit bands are demoable without combat.
- `components/game/hud-slots.tsx` exports a render list later tickets append to from their own modules via `registerHudSlot`. Play page only calls `renderHudSlots(snapshot)` — later tickets do not need to redesign the play page.
- Add `vitest` + `three` + `@types/three`. `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`. `vitest.config.ts` uses the Node environment and `@/` path alias.
- Header: add a `Play` link to `/play` and show brand text `Shield Wall` (do not edit `lib/site-nav.generated.ts`). Update `app/layout.tsx` default description to a real Shield Wall sentence when `NEXT_PUBLIC_APP_DESCRIPTION` is unset.
- Replace `app/icon.svg` with a simple shield-and-wall mark.

**Out of this ticket:** bots, weapons, forts, AI, networking transport. Snapshot + InputCommand are the contract those tickets consume.
## Acceptance Criteria
- [ ] `app/page.tsx` does not exist and `app/(game)/page.tsx` exists, so Next has a single `/` route
- [ ] `GET /` response body contains the exact string `Shield Wall` and the exact string `Enter the field`
- [ ] `GET /play` returns HTTP 200 and the response body contains `Shield Wall battlefield`
- [ ] `pnpm test -- lib/game` exits 0
- [ ] `classifyHitForce(19)` returns `'stumble'`, `classifyHitForce(20)` returns `'knockdown'`, `classifyHitForce(50)` returns `'knockdown'`, `classifyHitForce(51)` returns `'death'` (unit test in `lib/game/data/hit-reactions.test.ts`)
- [ ] A ragdoll built by `createJointedRagdoll()` exposes exactly the bone ids `pelvis`, `torso`, `head`, `upperArmL`, `upperArmR`, `lowerArmL`, `lowerArmR`, `upperLegL`, `upperLegR`, `lowerLegL`, `lowerLegR`
- [ ] After 60 ticks with `InputCommand.moveX = 1`, the Captain entity `transform.x` differs from its spawn `x` by more than `0.5`
- [ ] Applying impulse `10` leaves `control.enabled === true` and `hitReaction.state === 'stumble'`; impulse `35` sets `control.enabled === false` and `hitReaction.state === 'knockdown'` and restores `control.enabled === true` by tick `120` (2s); impulse `60` sets `hitReaction.state === 'death'` and `control.enabled === false` at tick `180`
- [ ] Every snapshot includes `timeScale === 1` and a serializable `entities` array (no class instances, no functions)
- [ ] `package.json` `scripts.test` equals `vitest run`
## Files to Touch
- app/page.tsx  (delete)
- app/(game)/page.tsx  (create)
- app/(game)/play/page.tsx  (create)
- app/(game)/play/play-client.tsx  (create)
- app/layout.tsx  (modify)
- app/icon.svg  (modify)
- components/site-header.tsx  (modify)
- components/game/play-canvas.tsx  (create)
- components/game/third-person-camera.ts  (create)
- components/game/hud-slots.tsx  (create)
- lib/game/index.ts  (create)
- lib/game/sim/engine.ts  (create)
- lib/game/sim/types.ts  (create)
- lib/game/sim/input.ts  (create)
- lib/game/sim/snapshot.ts  (create)
- lib/game/sim/systems.ts  (create)
- lib/game/physics/ragdoll.ts  (create)
- lib/game/physics/spring-damper.ts  (create)
- lib/game/physics/balance.ts  (create)
- lib/game/physics/ground.ts  (create)
- lib/game/data/hit-reactions.ts  (create)
- lib/game/data/hit-reactions.test.ts  (create)
- lib/game/data/registry.ts  (create)
- lib/game/physics/ragdoll.test.ts  (create)
- lib/game/sim/engine.test.ts  (create)
- package.json  (modify)
- vitest.config.ts  (create)
## Owned Areas
- lib/game/sim
- lib/game/physics
- lib/game/data/hit-reactions.ts
- lib/game/data/registry.ts
- app/(game)/page.tsx
- app/(game)/play/page.tsx
- components/game/play-canvas.tsx
- components/game/hud-slots.tsx
- vitest.config.ts
## Shared Touchpoints
- components/site-header.tsx
- app/layout.tsx
- app/icon.svg
- package.json
## Test Strategy
`pnpm test -- lib/game` must cover hit-band classification, ragdoll bone set, movement integration, and the three debug impulse outcomes. Manually open `/` and `/play`: walk with WASD, look with the mouse, press `1`/`2`/`3` and confirm stumble (keeps walking), knockdown (flops 1–2s then stands), death (stays down). Desktop and a narrow mobile viewport both show the canvas; controls remain keyboard and mouse.
## AMC Task Metadata
```json
{
  "title": "Ship landing page and wobbly physics prototype",
  "goal": "Replace the synthesized blank-next home with a Shield Wall product landing, add a /play third-person battlefield, and land the authoritative TypeScript simulation that walks a single jointed-skeleton Captain (cylinder/capsule limbs, spring-damper joints, active balance). When this ticket is done an operator can open /, click into /play, walk the wobbly Captain with WASD + mouse, and fire debug impulses that classify as stumble / knockdown / death at the locked force thresholds.",
  "taskType": "delivery",
  "specRef": "specs/feat-8f2af896/001-physics-prototype-and-landing/spec.md",
  "acceptanceCriteria": [
    "app/page.tsx does not exist and app/(game)/page.tsx exists, so Next has a single / route",
    "GET / response body contains the exact string Shield Wall and the exact string Enter the field",
    "GET /play returns HTTP 200 and the response body contains Shield Wall battlefield",
    "pnpm test -- lib/game exits 0",
    "classifyHitForce(19) returns 'stumble', classifyHitForce(20) returns 'knockdown', classifyHitForce(50) returns 'knockdown', classifyHitForce(51) returns 'death' (unit test in lib/game/data/hit-reactions.test.ts)",
    "A ragdoll built by createJointedRagdoll() exposes exactly the bone ids pelvis, torso, head, upperArmL, upperArmR, lowerArmL, lowerArmR, upperLegL, upperLegR, lowerLegL, lowerLegR",
    "After 60 ticks with InputCommand.moveX = 1, the Captain entity transform.x differs from its spawn x by more than 0.5",
    "Applying impulse 10 leaves control.enabled === true and hitReaction.state === 'stumble'; impulse 35 sets control.enabled === false and hitReaction.state === 'knockdown' and restores control.enabled === true by tick 120 (2s); impulse 60 sets hitReaction.state === 'death' and control.enabled === false at tick 180",
    "Every snapshot includes timeScale === 1 and a serializable entities array (no class instances, no functions)",
    "package.json scripts.test equals vitest run"
  ],
  "testCommand": "pnpm test -- lib/game",
  "phase": "build",
  "ownedAreas": [
    "lib/game/sim",
    "lib/game/physics",
    "lib/game/data/hit-reactions.ts",
    "lib/game/data/registry.ts",
    "app/(game)/page.tsx",
    "app/(game)/play/page.tsx",
    "components/game/play-canvas.tsx",
    "components/game/hud-slots.tsx",
    "vitest.config.ts"
  ],
  "sharedTouchpoints": [
    "components/site-header.tsx",
    "app/layout.tsx",
    "app/icon.svg",
    "package.json"
  ],
  "dependsOn": [],
  "browserVerification": {
    "required": true,
    "criteria": [
      {
        "id": "AC-FE-1",
        "text": "Home page h1 reads Shield Wall and the Enter the field button navigates to /play",
        "route": "/"
      },
      {
        "id": "AC-FE-2",
        "text": "Play canvas is visible; WASD moves the jointed Captain; key 1 stumbles, key 2 knocks down then stands, key 3 stays in death ragdoll",
        "route": "/play"
      }
    ]
  }
}
```
---
