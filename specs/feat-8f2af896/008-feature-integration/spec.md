---
# Integrate, validate, and harden the complete feature
## Task Type
feature_integration
## Goal
Inspect the cumulative base-to-HEAD change, trace every locked requirement to code and tests, run the full feature regression, and make only the corrective edits required for the original Shield Wall product to hold as one game. When this ticket is done a human can finish a real or fixture four-fort match on `/play` (AI kings or local multi) with wobble physics, scrolls, economy, capture, respawn, and hit bands intact. No source edit is required if evidence already shows the complete feature is correct.
## Context
Delivery tickets 001–007 each own a subsystem. Likely seams to audit: Snapshot `bags` contract, roam vs orders, GAS grant lists vs AI kings, map scroll remaining view-only after forts exist, 20-cap vs capture rewards, captain-death retreat vs respawn timers, `timeScale` staying `1` with both scrolls open, local host vs match default, placeholder home fully gone, no blood/gore regressions, no unique captain combat abilities. This ticket may edit any prior path to fix integration defects; it must not invent new scope (no first-person, no gore, no map click-to-order).
## Technical Approach
1. Read every delivery spec acceptance criterion and grep the tree for the named exports, routes, and HUD strings.
2. Add `lib/game/__tests__/feature-regression.test.ts` only if a cross-ticket invariant is not already asserted. Required invariants if missing:
   - `classifyHitForce` bands still 19/20/50/51
   - `timeScale === 1` while both scrolls are open
   - `handleMapPointer` still issues no orders when `bags.forts` is populated
   - 20-unit cap still holds after a capture payout
   - captain and swordsman melee grant lists still deep-equal
   - bot respawn at 1200 ticks, full health, no invuln
   - captain death forces `Retreat!` + `order.mode === 'retreat'`
   - `createMatch` + `debugSetFortOwner` still ends with `winnerTeamId`
   - `LocalHost` still moves two captains opposite ways
   - no `blood`/`gore` identifiers under `lib/game` or `components/game`
3. Run `pnpm test` and `pnpm typecheck`. Fix contract mismatches, duplicate systems (two tick loops, two hit classifiers), dead routes, and recruit/match HUD fighting each other.
4. Manually walk `/` → `/play` recruit → live match → formation scroll → map scroll → death/respawn → Local 2. If a hole is real, patch it. If the walk is already green, commit no product diff.
5. Keep `/play?mode=sandbox` working as the physics debug path (keys `1/2/3`).
## Acceptance Criteria
- [ ] `pnpm test` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `GET /` contains `Shield Wall` and does not contain `Your app is ready to build`
- [ ] `GET /play` contains `Formation Scroll`, `Map Scroll`, `Treasury`, `Forts`, and `Health`
- [ ] Feature regression asserts `classifyHitForce(19)==='stumble'`, `classifyHitForce(20)==='knockdown'`, `classifyHitForce(50)==='knockdown'`, `classifyHitForce(51)==='death'`
- [ ] Feature regression asserts `timeScale === 1` with both scrolls open and `handleMapPointer` issues `[]` orders on a live four-fort snapshot
- [ ] Feature regression asserts a post-capture treasury increase does not allow a 21st living squad member
- [ ] Feature regression asserts captain death emits `Retreat!` and bot respawn at tick 1200 has full health and no invulnerability tag
- [ ] A human or fixture path can take a match from recruit through at least one fort ownership change to `bags.match.phase === 'ended'` (test or recorded `/play` walk)
## Files to Touch
- lib/game/__tests__/feature-regression.test.ts  (create)
- (any delivery path, corrective edits only)
## Owned Areas
- lib/game/__tests__/feature-regression.test.ts
## Shared Touchpoints
- All completed delivery work, for integration fixes only
## Test Strategy
`pnpm test && pnpm typecheck`. Then browser-walk `/` and `/play` (match, sandbox, Local 2) at desktop and mobile widths. Only edit source when a criterion fails.
## AMC Task Metadata
```json
{
  "title": "Integrate, validate, and harden the complete feature",
  "goal": "Inspect the cumulative base-to-HEAD change, trace every locked requirement to code and tests, run the full feature regression, and make only the corrective edits required for the original Shield Wall product to hold as one game. When this ticket is done a human can finish a real or fixture four-fort match on /play (AI kings or local multi) with wobble physics, scrolls, economy, capture, respawn, and hit bands intact. No source edit is required if evidence already shows the complete feature is correct.",
  "taskType": "feature_integration",
  "specRef": "specs/feat-8f2af896/008-feature-integration/spec.md",
  "acceptanceCriteria": [
    "pnpm test exits 0",
    "pnpm typecheck exits 0",
    "GET / contains Shield Wall and does not contain Your app is ready to build",
    "GET /play contains Formation Scroll, Map Scroll, Treasury, Forts, and Health",
    "Feature regression asserts classifyHitForce(19)==='stumble', classifyHitForce(20)==='knockdown', classifyHitForce(50)==='knockdown', classifyHitForce(51)==='death'",
    "Feature regression asserts timeScale === 1 with both scrolls open and handleMapPointer issues [] orders on a live four-fort snapshot",
    "Feature regression asserts a post-capture treasury increase does not allow a 21st living squad member",
    "Feature regression asserts captain death emits Retreat! and bot respawn at tick 1200 has full health and no invulnerability tag",
    "A human or fixture path can take a match from recruit through at least one fort ownership change to bags.match.phase === 'ended' (test or recorded /play walk)"
  ],
  "testCommand": "pnpm test && pnpm typecheck",
  "phase": "build",
  "ownedAreas": [],
  "sharedTouchpoints": [
    "All completed delivery work, for integration fixes only"
  ],
  "dependsOn": [
    "Ship landing page and wobbly physics prototype",
    "Add distinct squad bots with roam",
    "Implement GAS combat and graduated hit reactions",
    "Ship formation scroll, map scroll, and cone sensors",
    "Build forts, economy, capture, and respawn",
    "Add AI king captains and match victory",
    "Enable local and networked multiplayer"
  ]
}
```
---
