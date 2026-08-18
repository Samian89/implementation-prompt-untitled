---
# Ship formation scroll, map scroll, and cone sensors
## Task Type
delivery
## Goal
Add the mid-battle command layer: Follow / Call to Arms, Hold, Retreat, and Wedge / Line / Box / Custom formations on a formation scroll that does not pause time, plus a separate view-only map scroll, plus cone-based forward detection with range falloff. When this ticket is done a player can open the scroll during movement, change formation, and watch bots take slots relative to the Captain while the match clock stays at full speed.
## Context
001–003 give a walking, fighting Captain and roaming bots. There are no orders, no formations, no sensors. Locked: the scroll controls bots and formations; the map is another scroll; time continues at full speed (overlay + hotkeys only); Custom places units relative to the Captain (not a battlefield minimap); map is view-only (fort ownership, squad dots, terrain) and cannot click-order a distant fort; detection is a forward cone with range falloff; max 20 slots; GAS should also express formation commands as replicable abilities. Roam (002) must yield when an order is present.
## Technical Approach
**Orders (`lib/game/command`):**
- `Order` component on each bot: `mode: 'garrison' | 'follow' | 'hold' | 'retreat'`, `slotIndex`, `formationId`, `customOffset?`.
- Captain-only command abilities (not combat uniques): `command.follow`, `command.callToArms`, `command.hold`, `command.retreat`, `command.form.wedge`, `command.form.line`, `command.form.box`, `command.form.custom`. These enqueue the same `Order` on every living squad bot. Bots are not granted these ids.
- Follow / Call to Arms: bots leave garrison and march in the active formation attached to the Captain's current transform (forward = Captain facing).
- Hold: freeze slots in world space at the moment of the command.
- Retreat: set mode `retreat`, target the Captain's home fort id if `bags.forts` exists, otherwise the Captain's spawn point (005 will fill real forts).
- When `Order` is present, the 002 roam system must no-op (check `entity.components.order` — roam is a shared touchpoint; add the guard in `lib/game/ai/roam.ts`).

**Formations (`lib/game/data/formations.ts`):**
- Data tables, not hardcoded offsets in AI. Each preset: id, display name, `slots: { index, x, z }[]` in Captain-local space (x = right, z = behind/forward). Provide at least 20 slots so a full squad fits.
- Wedge: apex front-center, ranks widening behind.
- Line: rank perpendicular to facing, Captain-centered.
- Box: hollow or filled rectangle around the Captain.
- Custom: player-authored `slots` stored on the Captain's `formationLoadout.custom`. Composer is an abstract grid (recommended 9×9 cells, 2m cell) showing unit tokens; dragging a token writes that unit's offset. Not a top-down battlefield.

**Scroll UI (`components/game/formation-scroll.tsx`):**
- Overlay, not a route change. Opening sets `bags.ui.formationScrollOpen = true` and does **not** write `timeScale`. Assert `timeScale === 1` every tick while open.
- In-world: Captain plays a "holding scroll" pose (torso spring pull / prop mesh). Combat and movement still tick.
- Controls: hotkey `Q` toggles formation scroll; `C` Follow / Call to Arms; `H` Hold; `R` Retreat; buttons on the overlay for Wedge, Line, Box, Custom, Follow, Hold, Retreat.
- Visible title text exactly `Formation Scroll`. Buttons labeled exactly `Wedge`, `Line`, `Box`, `Custom`, `Follow`, `Hold`, `Retreat`.

**Map scroll (`components/game/map-scroll.tsx`):**
- Hotkey `M` toggles. Title text exactly `Map Scroll`.
- Draws terrain silhouette + squad dots + fort markers from `bags.forts` if present, otherwise empty corners.
- Pointer handlers must not enqueue `InputCommand` move orders or `command.*` abilities. A test clicks the map API (`handleMapPointer(nx, nz)`) and expects `issuedOrders === []`.

**Sensors (`lib/game/ai/cone-sensor.ts`):**
- Forward cone: `range`, `halfAngleDeg` from a data row `sensors.combat`.
- Score = `max(0, 1 - distance/range) * (inCone ? 1 : 0)`, then multiply by 003's `targetPriority` (captains outrank bots).
- Units behind the facing vector or outside range score `0`.
- Tactics system: if `mode` is follow/garrison/hold and a hostile scores above `sensors.combat.engageThreshold`, grant/activate the unit's combat ability toward that target; otherwise keep marching to slot.

**Replication:** every command is an `AbilityEvent` already defined by 003's event log.
## Acceptance Criteria
- [ ] `lib/game/data/formations.ts` exports formation ids `wedge`, `line`, `box`, `custom`, each with `slots.length >= 20`
- [ ] `formationSlotWorld(captainPose, 'line', 0)` and `formationSlotWorld(captainPose, 'wedge', 0)` return different XZ points (`lib/game/command/formations.test.ts`)
- [ ] Activating `command.follow` then `command.form.wedge` moves each living bot toward its wedge slot; after 300 ticks every living bot is within `3` meters of its slot (`lib/game/command/follow.test.ts`)
- [ ] Opening the formation scroll (simulate `bags.ui.formationScrollOpen = true` for 120 ticks) leaves `snapshot.timeScale === 1` on every captured snapshot
- [ ] `scoreConeTarget` is `0` for a unit 10m directly behind the sensor and `> 0` for a unit 5m forward inside the cone; a Captain forward scores strictly higher than a bot at the same pose (`lib/game/ai/cone-sensor.test.ts`)
- [ ] `handleMapPointer` returns `{ issuedOrders: [] }` and does not push any `command.*` ability event
- [ ] `pnpm test -- lib/game/command lib/game/ai/cone-sensor lib/game/data/formations` exits 0
- [ ] `GET /play` body contains `Formation Scroll` and `Map Scroll`
## Files to Touch
- lib/game/command/orders.ts  (create)
- lib/game/command/formations.ts  (create)
- lib/game/command/formations.test.ts  (create)
- lib/game/command/follow.test.ts  (create)
- lib/game/command/map-scroll.ts  (create)
- lib/game/data/formations.ts  (create)
- lib/game/data/sensors.ts  (create)
- lib/game/ai/cone-sensor.ts  (create)
- lib/game/ai/cone-sensor.test.ts  (create)
- lib/game/ai/tactics.ts  (create)
- lib/game/ai/roam.ts  (modify)
- components/game/formation-scroll.tsx  (create)
- components/game/map-scroll.tsx  (create)
- components/game/command-hud.tsx  (create)
## Owned Areas
- lib/game/command
- lib/game/data/formations.ts
- lib/game/data/sensors.ts
- lib/game/ai/cone-sensor.ts
- lib/game/ai/tactics.ts
- components/game/formation-scroll.tsx
- components/game/map-scroll.tsx
## Shared Touchpoints
- lib/game/sim
- lib/game/gas
- lib/game/ai/roam.ts
- lib/game/combat/target-priority.ts
- lib/game/data/abilities.ts
- components/game/hud-slots.tsx
- components/game/play-canvas.tsx
- app/(game)/play/page.tsx
## Test Strategy
Run `pnpm test -- lib/game/command lib/game/ai/cone-sensor lib/game/data/formations`. On `/play`, press `Q` while walking — Captain keeps moving, clock does not freeze, pick `Wedge` and `Follow` and watch bots form up. Press `M` and click the map; the squad must not path to the click. Repeat at a mobile width: overlays remain usable (scroll/stack), time still does not pause.
## AMC Task Metadata
```json
{
  "title": "Ship formation scroll, map scroll, and cone sensors",
  "goal": "Add the mid-battle command layer: Follow / Call to Arms, Hold, Retreat, and Wedge / Line / Box / Custom formations on a formation scroll that does not pause time, plus a separate view-only map scroll, plus cone-based forward detection with range falloff. When this ticket is done a player can open the scroll during movement, change formation, and watch bots take slots relative to the Captain while the match clock stays at full speed.",
  "taskType": "delivery",
  "specRef": "specs/feat-8f2af896/004-formations-scrolls-sensors/spec.md",
  "acceptanceCriteria": [
    "lib/game/data/formations.ts exports formation ids wedge, line, box, custom, each with slots.length >= 20",
    "formationSlotWorld(captainPose, 'line', 0) and formationSlotWorld(captainPose, 'wedge', 0) return different XZ points (lib/game/command/formations.test.ts)",
    "Activating command.follow then command.form.wedge moves each living bot toward its wedge slot; after 300 ticks every living bot is within 3 meters of its slot (lib/game/command/follow.test.ts)",
    "Opening the formation scroll (simulate bags.ui.formationScrollOpen = true for 120 ticks) leaves snapshot.timeScale === 1 on every captured snapshot",
    "scoreConeTarget is 0 for a unit 10m directly behind the sensor and > 0 for a unit 5m forward inside the cone; a Captain forward scores strictly higher than a bot at the same pose (lib/game/ai/cone-sensor.test.ts)",
    "handleMapPointer returns { issuedOrders: [] } and does not push any command.* ability event",
    "pnpm test -- lib/game/command lib/game/ai/cone-sensor lib/game/data/formations exits 0",
    "GET /play body contains Formation Scroll and Map Scroll"
  ],
  "testCommand": "pnpm test -- lib/game/command lib/game/ai/cone-sensor lib/game/data/formations",
  "phase": "build",
  "ownedAreas": [
    "lib/game/command",
    "lib/game/data/formations.ts",
    "lib/game/data/sensors.ts",
    "lib/game/ai/cone-sensor.ts",
    "lib/game/ai/tactics.ts",
    "components/game/formation-scroll.tsx",
    "components/game/map-scroll.tsx"
  ],
  "sharedTouchpoints": [
    "lib/game/sim",
    "lib/game/gas",
    "lib/game/ai/roam.ts",
    "lib/game/combat/target-priority.ts",
    "lib/game/data/abilities.ts",
    "components/game/hud-slots.tsx",
    "components/game/play-canvas.tsx",
    "app/(game)/play/page.tsx"
  ],
  "dependsOn": [
    "Ship landing page and wobbly physics prototype",
    "Add distinct squad bots with roam"
  ],
  "browserVerification": {
    "required": true,
    "criteria": [
      {
        "id": "AC-FE-5",
        "text": "Pressing Q opens Formation Scroll with Wedge Line Box Custom Follow Hold Retreat; the Captain keeps moving and bots form up on Follow+Wedge; pressing M opens Map Scroll and clicking it does not issue a move",
        "route": "/play"
      }
    ]
  }
}
```
---
