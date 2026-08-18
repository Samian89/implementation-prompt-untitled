---
# Build forts, economy, capture, and respawn
## Task Type
delivery
## Goal
Stand up the four-corner domination world: moderate terrain (forests, one river, central hill), forts with purchasable walls and gates, starting cash that can buy a full 20-unit army or a mix of units and defenses, medieval capture gear, physical shield upgrades, 20-second full-health fort respawns, and captain-death retreat. When this ticket is done a player can spend a treasury, garrison a fort, break or scale an enemy gate/wall (or walk in if the owner bought no defenses), capture it, and watch dead bots walk back from the home gate after 20 seconds.
## Context
001–004 provide movement, units, combat, and commands. The ground is still a flat plane; there are no forts, no currency, no capture, no respawn. Locked: four forts, one per corner; passive defenses (gates, walls, fortified bridges); scale the wall, break the door, or walk in if the captain spent only on units; starting cash enough for castle defense and units; 20 is the most they can afford if they buy only units and no high wall; capturing grants gear from a medieval list (hatchets, knives, spears, arrows, rocks, a trumpet); shield/sword upgrades are paid and then physically block; bots respawn at the Captain's fort after 20s at full health with no invulnerability window and walk to their ordered place; if the Captain dies, remaining bots scream retreat and run back to the fort while the Captain respawns, and the player may see them outside the gate still coming in. Map scroll (004) should start showing ownership dots — feed `bags.forts`, do not redesign the map component.
## Technical Approach
**World (`lib/game/world`, this ticket owns):**
- Map extents large enough for four corner forts and a readable midfield. Height function: central hill, a single river (ford/bridge on the axis between two forts), forest patches that slow move speed and occlude nothing beyond the existing cone (no new LOS system).
- Register `registerGroundHeight` from 001 so ragdolls stand on the heightfield.
- Forts `NW`, `NE`, `SW`, `SE`. Each: courtyard AABB, wall segments, gate actor, spawn points just inside the gate, banner color from owner team.
- Wall policy from purchased defense tier (`none | palisade | high`): `none` is a walkable gap; `palisade` / `high` are climbable (slow vertical move when overlapping a wall volume, faster on high); gate `none | wood | reinforced` has health; `none` is an open doorway. Melee and hatchet hits damage the gate; at 0 HP the gate collider disables.

**Economy (`lib/game/economy` + data tables):**
- Starting treasury `2000` (assumption recorded here, not user-stated as a number). Unit cost `100` each so 20 units = 2000 and a high wall cannot also be bought.
- Costs (data table, tunable): swordsman 100, archer 100, sword upgrade 40, shield upgrade 40, palisade 400, high wall 800, wood gate 200, reinforced gate 500. Starting cash is enough to buy a palisade + wood gate + a small mixed squad, or 20 naked units.
- Recruit only at an owned fort (pre-match setup panel and in-courtyard). `tryRecruit` fails with `squad_cap` at 20 living+queued, or `cannot_afford`, or `not_at_owned_fort`.
- Shield upgrade attaches a front-facing shield collider. Incoming melee traces that hit the shield first deal `0` force to the body and a small stagger to the attacker. Arrows that hit the shield have force multiplied by `shield.arrowFactor` (`< 1`). No upgrade = no shield collider; Line/Wedge/Box remain spatial only.
- Capture payout: `+400` treasury and one gear id from `hatchet | knife | spear | arrows | rock | trumpet` (cycle or weighted table). Gear is an inventory item that replaces or augments the unit/captain kit using 003 weapon rows (hatchet = higher melee force, knife = faster lower force, spear = longer trace, arrows = ammo stack, rock = thrown projectile, trumpet = +25% Follow/Call shout radius — a gear bonus, not a unique captain ability). Hard cap of 20 fielded units does not increase; capture money/gear is how a defense-heavy captain later affords more troops up to 20.

**Capture:**
- A team captures a fort when a living unit of that team is inside the courtyard and no living enemy unit is inside, after they entered via gap, broken gate, or completed climb. Ownership flips, banner color updates, `bags.forts[id].ownerTeamId` updates (map scroll reads this).
- Scripted enemy garrisons: other forts spawn a small hold-only bot squad so capture is not walking into an empty yard. Full AI kings are 006.

**Lifecycle:**
- Bot death: start a 20s (`1200` tick) respawn timer on the owning Captain's current home fort (last owned, else original corner). On fire: spawn at the fort spawn point, `health = maxHealth`, no invuln tag, `State.Dead` cleared, path to last `Order` slot or garrison slot.
- Captain death: apply death ragdoll; emit `squad.retreatScream` (visible floating text exactly `Retreat!` on each living bot — no gore audio required); force `command.retreat` on remaining bots toward the home fort gate; Captain respawns at that fort after the same 20s at full health. If the Captain currently owns zero forts, home is the original corner spawn; they still appear at that gate even if an enemy owns the fort.
- Bots already outside the gate continue walking in — do not teleport the squad on captain death.

**Setup UI (`components/game/recruit-setup.tsx`):**
- Before the sandbox/match starts (or at an owned courtyard): treasury readout, unit buy buttons `Swordsman` / `Archer`, defense picks, upgrade checkboxes. Visible string `Treasury`. Confirm `March` starts the field with the purchased roster.
- Register world meshes: walls, gates, river, hill, forest billboards/blocks.

**Win is not this ticket** — 006 adds match victory. This ticket must still flip ownership and grant rewards.
## Acceptance Criteria
- [ ] `lib/game/data/economy.ts` exports `STARTING_TREASURY === 2000`, `UNIT_COST === 100`, and `MAX_SQUAD_SIZE` usage such that `STARTING_TREASURY / UNIT_COST === 20`
- [ ] `tryRecruit` of 20 swordsmen on a fresh treasury succeeds and leaves `treasury === 0`; a 21st recruit returns `error: 'squad_cap'` or `error: 'cannot_afford'`
- [ ] `tryBuyDefense('high_wall')` on a treasury that already bought 20 units returns `error: 'cannot_afford'`; on a fresh treasury it succeeds and `fort.defense.wall === 'high'`
- [ ] A unit entering a `wall === 'none'` and `gate === 'none'` courtyard with no living enemies flips `fort.ownerTeamId` to that unit's team; a `gate === 'wood'` blocks entry until `gate.hp <= 0` (`lib/game/world/capture.test.ts`)
- [ ] `applyHit` on a shield-upgraded unit from the front at sword force does not set `hitReaction.state` to `death` and records `blockedBy === 'shield'`; the same hit from behind applies the full force band (`lib/game/economy/shield.test.ts`)
- [ ] A dead bot reaches `hitReaction.state === 'alive'` (or equivalent not-dead) at tick `1200` after death, at the home fort spawn, with `health === maxHealth`, and has no `State.Invulnerable` tag; by tick `1500` its XZ is closer to its last ordered slot than it was at respawn (`lib/game/lifecycle/respawn.test.ts`)
- [ ] On captain death, every living allied bot has `order.mode === 'retreat'` and a visible shout payload `Retreat!` (`lib/game/lifecycle/captain-death.test.ts`)
- [ ] `lib/game/data/gear.ts` exports ids `hatchet`, `knife`, `spear`, `arrows`, `rock`, `trumpet`
- [ ] `pnpm test -- lib/game/world lib/game/economy lib/game/lifecycle lib/game/data/economy lib/game/data/gear lib/game/data/defenses` exits 0
- [ ] `/play` shows the exact string `Treasury` and the map scroll can render four fort ids `NW`, `NE`, `SW`, `SE` from `bags.forts`
## Files to Touch
- lib/game/world/map.ts  (create)
- lib/game/world/terrain.ts  (create)
- lib/game/world/fort.ts  (create)
- lib/game/world/capture.ts  (create)
- lib/game/world/capture.test.ts  (create)
- lib/game/economy/treasury.ts  (create)
- lib/game/economy/recruit.ts  (create)
- lib/game/economy/defense.ts  (create)
- lib/game/economy/gear.ts  (create)
- lib/game/economy/shield.ts  (create)
- lib/game/economy/shield.test.ts  (create)
- lib/game/lifecycle/respawn.ts  (create)
- lib/game/lifecycle/respawn.test.ts  (create)
- lib/game/lifecycle/captain-death.ts  (create)
- lib/game/lifecycle/captain-death.test.ts  (create)
- lib/game/data/economy.ts  (create)
- lib/game/data/gear.ts  (create)
- lib/game/data/defenses.ts  (create)
- components/game/recruit-setup.tsx  (create)
- components/game/world-view.tsx  (create)
- components/game/fort-view.tsx  (create)
- lib/game/physics/ground.ts  (modify)
## Owned Areas
- lib/game/world
- lib/game/economy
- lib/game/lifecycle
- lib/game/data/economy.ts
- lib/game/data/gear.ts
- lib/game/data/defenses.ts
- components/game/recruit-setup.tsx
- components/game/world-view.tsx
- components/game/fort-view.tsx
## Shared Touchpoints
- lib/game/sim
- lib/game/physics/ground.ts
- lib/game/units
- lib/game/combat
- lib/game/command
- lib/game/data/weapons.ts
- components/game/map-scroll.tsx
- components/game/hud-slots.tsx
- components/game/play-canvas.tsx
- app/(game)/play/page.tsx
## Test Strategy
Run `pnpm test -- lib/game/world lib/game/economy lib/game/lifecycle lib/game/data/economy lib/game/data/gear lib/game/data/defenses`. On `/play`, buy a mixed squad and a wood gate, `March`, walk the hill and river, attack an enemy gate or climb a wall, capture a courtyard, kill a bot and wait through the 20s respawn walk-back, then suicide the Captain (debug `3` or a heavy hit) and read `Retreat!` as bots run home. Open `M` and confirm four ownership dots. Check desktop and mobile overlays for Treasury + recruit controls.
## AMC Task Metadata
```json
{
  "title": "Build forts, economy, capture, and respawn",
  "goal": "Stand up the four-corner domination world: moderate terrain (forests, one river, central hill), forts with purchasable walls and gates, starting cash that can buy a full 20-unit army or a mix of units and defenses, medieval capture gear, physical shield upgrades, 20-second full-health fort respawns, and captain-death retreat. When this ticket is done a player can spend a treasury, garrison a fort, break or scale an enemy gate/wall (or walk in if the owner bought no defenses), capture it, and watch dead bots walk back from the home gate after 20 seconds.",
  "taskType": "delivery",
  "specRef": "specs/feat-8f2af896/005-forts-economy-capture/spec.md",
  "acceptanceCriteria": [
    "lib/game/data/economy.ts exports STARTING_TREASURY === 2000, UNIT_COST === 100, and MAX_SQUAD_SIZE usage such that STARTING_TREASURY / UNIT_COST === 20",
    "tryRecruit of 20 swordsmen on a fresh treasury succeeds and leaves treasury === 0; a 21st recruit returns error: 'squad_cap' or error: 'cannot_afford'",
    "tryBuyDefense('high_wall') on a treasury that already bought 20 units returns error: 'cannot_afford'; on a fresh treasury it succeeds and fort.defense.wall === 'high'",
    "A unit entering a wall === 'none' and gate === 'none' courtyard with no living enemies flips fort.ownerTeamId to that unit's team; a gate === 'wood' blocks entry until gate.hp <= 0 (lib/game/world/capture.test.ts)",
    "applyHit on a shield-upgraded unit from the front at sword force does not set hitReaction.state to death and records blockedBy === 'shield'; the same hit from behind applies the full force band (lib/game/economy/shield.test.ts)",
    "A dead bot reaches hitReaction.state === 'alive' (or equivalent not-dead) at tick 1200 after death, at the home fort spawn, with health === maxHealth, and has no State.Invulnerable tag; by tick 1500 its XZ is closer to its last ordered slot than it was at respawn (lib/game/lifecycle/respawn.test.ts)",
    "On captain death, every living allied bot has order.mode === 'retreat' and a visible shout payload Retreat! (lib/game/lifecycle/captain-death.test.ts)",
    "lib/game/data/gear.ts exports ids hatchet, knife, spear, arrows, rock, trumpet",
    "pnpm test -- lib/game/world lib/game/economy lib/game/lifecycle lib/game/data/economy lib/game/data/gear lib/game/data/defenses exits 0",
    "/play shows the exact string Treasury and the map scroll can render four fort ids NW, NE, SW, SE from bags.forts"
  ],
  "testCommand": "pnpm test -- lib/game/world lib/game/economy lib/game/lifecycle lib/game/data/economy lib/game/data/gear lib/game/data/defenses",
  "phase": "build",
  "ownedAreas": [
    "lib/game/world",
    "lib/game/economy",
    "lib/game/lifecycle",
    "lib/game/data/economy.ts",
    "lib/game/data/gear.ts",
    "lib/game/data/defenses.ts",
    "components/game/recruit-setup.tsx",
    "components/game/world-view.tsx",
    "components/game/fort-view.tsx"
  ],
  "sharedTouchpoints": [
    "lib/game/sim",
    "lib/game/physics/ground.ts",
    "lib/game/units",
    "lib/game/combat",
    "lib/game/command",
    "lib/game/data/weapons.ts",
    "components/game/map-scroll.tsx",
    "components/game/hud-slots.tsx",
    "components/game/play-canvas.tsx",
    "app/(game)/play/page.tsx"
  ],
  "dependsOn": [
    "Ship landing page and wobbly physics prototype",
    "Add distinct squad bots with roam",
    "Implement GAS combat and graduated hit reactions",
    "Ship formation scroll, map scroll, and cone sensors"
  ],
  "browserVerification": {
    "required": true,
    "criteria": [
      {
        "id": "AC-FE-6",
        "text": "Recruit UI shows Treasury; March loads a four-fort map with hill, river, and forests; an open or broken fort can be captured; a dead bot respawns at the home gate and walks back; captain death shows Retreat! and bots run home",
        "route": "/play"
      }
    ]
  }
}
```
---
