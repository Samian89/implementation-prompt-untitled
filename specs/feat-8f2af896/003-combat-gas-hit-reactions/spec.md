---
# Implement GAS combat and graduated hit reactions
## Task Type
delivery
## Goal
Give Captains and bots the same Gameplay Ability System combat kit: collision hit-trace melee, ballistic arrow projectiles, health, and the locked graduated hit reactions with stylized (no gore) feedback. When this ticket is done a player can swing and shoot on `/play`, hits are readable, and tests prove force bands, shared abilities, and projectile-vs-trace detection.
## Context
001 owns the sim, ragdoll, and `classifyHitForce`. 002 owns unit defs and spawning. There is no damage, no weapons, no abilities. Locked: arrows are projectile physics; melee is a collision-based hit-trace; Captain has no unique abilities (player control, visuals, and enemy priority only); no blood/gore — cartoony physical feedback; component-based characters + GAS designed for replication; data-driven stats. Debug impulse keys from 001 stay as a sandbox aid.
## Technical Approach
**GAS (`lib/game/gas`, this ticket owns):**
- `AbilitySystem` component on every unit: `attributes` (`health`, `maxHealth`), `tags` (set of strings), `granted` ability ids, `cooldowns`, `activationQueue`.
- `tryActivate(entityId, abilityId, ctx)` is the only combat entry. It checks tags (`State.Dead`, `State.Knockdown` block attacks), spends cooldown, and emits a predicted event that the sim commits on the same tick (single-player / AI now; 007 will echo the same event over the wire).
- Ability defs live in `lib/game/data/abilities.ts`. Rows this ticket must ship: `melee.strike`, `ranged.shoot`. No `captain.*` combat rows. Captain and swordsman both grant `melee.strike` when their loadout role is melee; Captain and archer both grant `ranged.shoot` when ranged. Grant lists must be deep-equal for the same role.
- Tags written by hit reactions: `State.Stumble`, `State.Knockdown`, `State.Dead`, `State.Control.Lost`. Knockdown lasts 1000–2000 ms then is removed; Death is permanent until respawn (005).

**Melee:**
- `melee.strike` runs a capsule/ray hit-trace from the striking limb along the swing, length from `lib/game/data/weapons.ts` (`sword.traceLength`). First enemy hit receives `weapons.sword.force` (tune so a standard sword is typically knockdown, a light tap / glancing can be stumble).
- Trace must not use the projectile mover.

**Ranged:**
- `ranged.shoot` spawns a `projectile` entity with gravity, speed, and `force` from `weapons.arrow`. On collision with a unit collider it applies that force and destroys the projectile. Misses hit the ground and despawn.
- No hitscan.

**Hit application:**
- Central `applyHit(sim, targetId, force, direction)` calls `classifyHitForce`, applies a ragdoll impulse, updates health (`health -= force` as a starting data-driven mapping from `hit-reactions` or `weapons`; death also occurs when `health <= 0` even if force ≤ 50 — if that dual path is implemented, a test must document it; the locked band still applies when health remains positive). Prefer force-band death at `> 50` as the primary lethal path so a single heavy hit kills.
- Stumble: brief stagger VFX (cartoon stars / squash), control kept.
- Knockdown: partial ragdoll 1–2s, then recover.
- Death: full ragdoll, `State.Dead`, freeze abilities. No blood decals, no gibs, no red-splatter textures. Allowed: squash, stars, puff, color flash.

**Enemy priority (sensor comes in 004):** export `targetPriority(entity)` that returns `2` for captains and `1` for bots so 004 can sort cone hits. Do not implement the cone here.

**View:**
- Readable swing arc and arrow mesh. Impact: star-burst or squash, never blood.
- Register HUD slot for local Captain health (`Health 100`).
- Bind LMB → `melee.strike` if granted, RMB hold/release → `ranged.shoot` if granted. Captain default sandbox loadout: melee (same as swordsman). Provide a sandbox toggle or spawn an archer-captain fixture in tests; play page may include a `Bow` / `Sword` kit switcher that only swaps granted abilities from the shared table.

**Replication:** ability activations are `AbilityEvent { tick, sourceId, abilityId, aim }` stored in the snapshot event log for 007.
## Acceptance Criteria
- [ ] `lib/game/data/abilities.ts` exports ability ids `melee.strike` and `ranged.shoot` and does not export any id starting with `captain.`
- [ ] `grantedAbilities('captain', 'melee')` deep-equals `grantedAbilities('swordsman', 'melee')`; `grantedAbilities('captain', 'ranged')` deep-equals `grantedAbilities('archer', 'ranged')`
- [ ] `melee.strike` against a dummy at 1.5m with a clear trace reduces dummy health and does not create a `projectile` entity (`lib/game/combat/melee.test.ts`)
- [ ] `ranged.shoot` creates a `projectile` entity whose `y` decreases over ticks under gravity and that applies `weapons.arrow.force` on collider overlap (`lib/game/combat/projectile.test.ts`)
- [ ] `applyHit(target, 19)` sets `hitReaction.state` to `stumble` and `control.enabled` true; `applyHit(target, 35)` sets `knockdown` and `control.enabled` false then true again by 2s; `applyHit(target, 51)` sets `death`, `tags` contains `State.Dead`, and `control.enabled` is false (`lib/game/combat/hit-reaction.test.ts`)
- [ ] A repo-wide search of `lib/game` and `components/game` has no filename or exported identifier containing `blood` or `gore`
- [ ] `pnpm test -- lib/game/gas lib/game/combat lib/game/data/abilities lib/game/data/weapons` exits 0
- [ ] `/play` HUD contains the exact string `Health`
## Files to Touch
- lib/game/gas/ability-system.ts  (create)
- lib/game/gas/ability-system.test.ts  (create)
- lib/game/data/abilities.ts  (create)
- lib/game/data/weapons.ts  (create)
- lib/game/combat/apply-hit.ts  (create)
- lib/game/combat/melee.ts  (create)
- lib/game/combat/melee.test.ts  (create)
- lib/game/combat/projectile.ts  (create)
- lib/game/combat/projectile.test.ts  (create)
- lib/game/combat/hit-reaction.test.ts  (create)
- lib/game/combat/health.ts  (create)
- lib/game/combat/target-priority.ts  (create)
- components/game/combat-feedback.tsx  (create)
- components/game/health-hud.tsx  (create)
## Owned Areas
- lib/game/gas
- lib/game/combat
- lib/game/data/abilities.ts
- lib/game/data/weapons.ts
- components/game/combat-feedback.tsx
## Shared Touchpoints
- lib/game/sim
- lib/game/physics
- lib/game/data/hit-reactions.ts
- lib/game/data/units.ts
- lib/game/units
- components/game/hud-slots.tsx
- components/game/play-canvas.tsx
- app/(game)/play/page.tsx
## Test Strategy
Run `pnpm test -- lib/game/gas lib/game/combat lib/game/data/abilities lib/game/data/weapons`. On `/play`, walk to a bot, LMB a readable melee connect (bot stumbles or knocks down, no blood), switch to bow if offered, RMB and watch an arcing arrow. Confirm a dead unit stays ragdolled. Check desktop and a narrow viewport for the Health readout.
## AMC Task Metadata
```json
{
  "title": "Implement GAS combat and graduated hit reactions",
  "goal": "Give Captains and bots the same Gameplay Ability System combat kit: collision hit-trace melee, ballistic arrow projectiles, health, and the locked graduated hit reactions with stylized (no gore) feedback. When this ticket is done a player can swing and shoot on /play, hits are readable, and tests prove force bands, shared abilities, and projectile-vs-trace detection.",
  "taskType": "delivery",
  "specRef": "specs/feat-8f2af896/003-combat-gas-hit-reactions/spec.md",
  "acceptanceCriteria": [
    "lib/game/data/abilities.ts exports ability ids melee.strike and ranged.shoot and does not export any id starting with captain.",
    "grantedAbilities('captain', 'melee') deep-equals grantedAbilities('swordsman', 'melee'); grantedAbilities('captain', 'ranged') deep-equals grantedAbilities('archer', 'ranged')",
    "melee.strike against a dummy at 1.5m with a clear trace reduces dummy health and does not create a projectile entity (lib/game/combat/melee.test.ts)",
    "ranged.shoot creates a projectile entity whose y decreases over ticks under gravity and that applies weapons.arrow.force on collider overlap (lib/game/combat/projectile.test.ts)",
    "applyHit(target, 19) sets hitReaction.state to stumble and control.enabled true; applyHit(target, 35) sets knockdown and control.enabled false then true again by 2s; applyHit(target, 51) sets death, tags contains State.Dead, and control.enabled is false (lib/game/combat/hit-reaction.test.ts)",
    "A repo-wide search of lib/game and components/game has no filename or exported identifier containing blood or gore",
    "pnpm test -- lib/game/gas lib/game/combat lib/game/data/abilities lib/game/data/weapons exits 0",
    "/play HUD contains the exact string Health"
  ],
  "testCommand": "pnpm test -- lib/game/gas lib/game/combat lib/game/data/abilities lib/game/data/weapons",
  "phase": "build",
  "ownedAreas": [
    "lib/game/gas",
    "lib/game/combat",
    "lib/game/data/abilities.ts",
    "lib/game/data/weapons.ts",
    "components/game/combat-feedback.tsx"
  ],
  "sharedTouchpoints": [
    "lib/game/sim",
    "lib/game/physics",
    "lib/game/data/hit-reactions.ts",
    "lib/game/data/units.ts",
    "lib/game/units",
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
        "id": "AC-FE-4",
        "text": "On /play, a melee swing visibly connects and the target stumbles or knocks down with cartoon feedback and no blood; Health is visible on the HUD",
        "route": "/play"
      }
    ]
  }
}
```
---
