---
# Add AI king captains and match victory
## Task Type
delivery
## Goal
Replace scripted empty-slot garrisons with three AI "king" Captains who spend starting cash, recruit, garrison or march, fight, and capture, and close the loop with a match that ends when one team owns all four forts. When this ticket is done `/play` starts a domination match against AI kings and shows a winner banner.
## Context
005 delivered forts, economy, capture, respawn, and hold-only garrisons. There is no opponent that spends currency or leaves home. Locked: each corner starts with one Captain (human or AI king); capturing snowballs via gear and more affordable units up to the 20 cap; replication-friendly so 007 can swap an AI king for a human without rebuilding the match; Captain AI uses the same components and abilities as the player Captain (no unique powers). Win condition was not user-stated as a phrase — implement "own all four forts" and surface it as `Victory` / `Defeat` (assumption recorded here).
## Technical Approach
**Match (`lib/game/match`, this ticket owns):**
- `createMatch({ humanPlayers: 1, seed })` places four captains at `NW/NE/SW/SE`, each with `STARTING_TREASURY`, empty roster, and a recruit phase (`bags.match.phase === 'recruit' | 'live' | 'ended'`).
- Recruit phase is timed (e.g. 45s / 2700 ticks) or until all captains `ready`. AI kings ready as soon as their spend plan commits.
- Live: 005 capture rules run. When one `ownerTeamId` owns all four forts, `phase = 'ended'`, `winnerTeamId` set. Snapshot bag: `bags.match = { phase, winnerTeamId, fortOwners }`.
- Empty human slots stay AI. `createMatch({ humanPlayers: 0 })` is the headless fixture.

**AI king (`lib/game/ai/king.ts`):**
- Personality table `lib/game/data/ai-personalities.ts`: `wall_lord` (high wall + fewer units), `horde` (20 units, no wall), `balanced`, `archer_keep`. Each is a spend plan over 005's economy API — no cheat resources.
- States: `recruit` → `garrison` (place archers behind gate, swordsmen at front if those types were bought) → `defend` if a hostile is in cone or courtyard → `sortie` toward the nearest enemy-owned or neutral fort when local courtyard is secure and squad living count ≥ threshold → `retreat` on own captain death (already forced by 005).
- Uses 004 orders and 003 abilities only. Targeting prefers enemy captains via existing `targetPriority`.
- Pathing: waypoint along terrain toward the target fort gate, then climb/break/enter using 005 volumes. No separate navmesh library required; waypoint graph with river ford/bridge nodes is enough.

**HUD (`components/game/match-hud.tsx`):**
- Live strings: `Forts n/4`, phase label `Recruit` / `Live` / `Ended`.
- Ended overlay: exact `Victory` if local team won, exact `Defeat` otherwise, plus `Play again`.
- `/play` default mode becomes this match (sandbox remains available as `?mode=sandbox` for 001–004 debug keys).

**Default spend for the headless fixture:** one horde king, one wall_lord, one balanced, one human-or-empty. Tests should finish a capture by teleporting/killing in the fixture rather than simulating 10 minutes of AI — include `debugSetFortOwner` only behind `sim.debug` used by tests, not the player HUD.
## Acceptance Criteria
- [ ] `createMatch({ humanPlayers: 0, seed: 1 })` yields exactly 4 captain entities and 4 forts, each fort `ownerTeamId` matching its corner captain at tick 0
- [ ] After the recruit phase, at least one AI king has `treasury < STARTING_TREASURY` and `squadCount >= 1` (`lib/game/ai/king.test.ts`)
- [ ] A `horde` personality never writes `fort.defense.wall === 'high'` on its home fort; a `wall_lord` does write `high` when it can afford it
- [ ] When `debugSetFortOwner` assigns all four forts to team `0`, `bags.match.phase === 'ended'` and `bags.match.winnerTeamId === 0` on the next tick (`lib/game/match/victory.test.ts`)
- [ ] AI kings call only ability ids present in `lib/game/data/abilities.ts` (no `captain.` combat ids) — asserted by collecting `abilityEvents` over 600 ticks
- [ ] `pnpm test -- lib/game/match lib/game/ai/king lib/game/data/ai-personalities` exits 0
- [ ] `GET /play` body contains `Forts` and contains `Recruit` or `Live`
- [ ] Ended overlay uses the exact string `Victory` or the exact string `Defeat`
## Files to Touch
- lib/game/match/create-match.ts  (create)
- lib/game/match/rules.ts  (create)
- lib/game/match/victory.test.ts  (create)
- lib/game/ai/king.ts  (create)
- lib/game/ai/king.test.ts  (create)
- lib/game/data/ai-personalities.ts  (create)
- components/game/match-hud.tsx  (create)
## Owned Areas
- lib/game/match
- lib/game/ai/king.ts
- lib/game/data/ai-personalities.ts
- components/game/match-hud.tsx
## Shared Touchpoints
- lib/game/sim
- lib/game/world
- lib/game/economy
- lib/game/lifecycle
- lib/game/command
- lib/game/gas
- lib/game/units
- components/game/recruit-setup.tsx
- components/game/hud-slots.tsx
- components/game/play-canvas.tsx
- app/(game)/play/page.tsx
## Test Strategy
Run `pnpm test -- lib/game/match lib/game/ai/king lib/game/data/ai-personalities`. On `/play` (default match), complete recruit, watch at least one enemy squad leave or hold a fort, open the map scroll for four ownership colors, then use a debug/test-only control or play until `Victory`/`Defeat`. Confirm `?mode=sandbox` still loads the physics sandbox. Desktop and mobile: Forts n/4 stays readable.
## AMC Task Metadata
```json
{
  "title": "Add AI king captains and match victory",
  "goal": "Replace scripted empty-slot garrisons with three AI king Captains who spend starting cash, recruit, garrison or march, fight, and capture, and close the loop with a match that ends when one team owns all four forts. When this ticket is done /play starts a domination match against AI kings and shows a winner banner.",
  "taskType": "delivery",
  "specRef": "specs/feat-8f2af896/006-ai-kings-match-loop/spec.md",
  "acceptanceCriteria": [
    "createMatch({ humanPlayers: 0, seed: 1 }) yields exactly 4 captain entities and 4 forts, each fort ownerTeamId matching its corner captain at tick 0",
    "After the recruit phase, at least one AI king has treasury < STARTING_TREASURY and squadCount >= 1 (lib/game/ai/king.test.ts)",
    "A horde personality never writes fort.defense.wall === 'high' on its home fort; a wall_lord does write high when it can afford it",
    "When debugSetFortOwner assigns all four forts to team 0, bags.match.phase === 'ended' and bags.match.winnerTeamId === 0 on the next tick (lib/game/match/victory.test.ts)",
    "AI kings call only ability ids present in lib/game/data/abilities.ts (no captain. combat ids) — asserted by collecting abilityEvents over 600 ticks",
    "pnpm test -- lib/game/match lib/game/ai/king lib/game/data/ai-personalities exits 0",
    "GET /play body contains Forts and contains Recruit or Live",
    "Ended overlay uses the exact string Victory or the exact string Defeat"
  ],
  "testCommand": "pnpm test -- lib/game/match lib/game/ai/king lib/game/data/ai-personalities",
  "phase": "build",
  "ownedAreas": [
    "lib/game/match",
    "lib/game/ai/king.ts",
    "lib/game/data/ai-personalities.ts",
    "components/game/match-hud.tsx"
  ],
  "sharedTouchpoints": [
    "lib/game/sim",
    "lib/game/world",
    "lib/game/economy",
    "lib/game/lifecycle",
    "lib/game/command",
    "lib/game/gas",
    "lib/game/units",
    "components/game/recruit-setup.tsx",
    "components/game/hud-slots.tsx",
    "components/game/play-canvas.tsx",
    "app/(game)/play/page.tsx"
  ],
  "dependsOn": [
    "Build forts, economy, capture, and respawn"
  ],
  "browserVerification": {
    "required": true,
    "criteria": [
      {
        "id": "AC-FE-7",
        "text": "Default /play is a four-captain match; Forts n/4 is visible; at least one AI-owned fort has units or defenses; ending the match shows Victory or Defeat",
        "route": "/play"
      }
    ]
  }
}
```
---
