# implementation-prompt-untitled

# Implementation Prompt: Untitled Shield Wall Tactics Game

## 1. Concept Overview

A third-person (first-person as a future stretch goal) squad-tactics game blending:
- The squad-command, formation-based combat of **Shieldwall** (2023, Nezon Production)
- The wobbly, physically comedic ragdoll movement of **Fall Guys**

The player acts as a **Captain** who personally fights on the battlefield while commanding a squad of AI-controlled soldiers (swordsmen and archers) using formations, positioning, and battlefield commands.

This is not a "knock players off a platform" game — combat and territory control are the core loop, delivered through exaggerated, physically-driven character movement rather than a serious military sim tone.

---

## 2. Core Game Loop: Fort Domination

- The map contains **four forts**, one per corner, each controlled by one **Captain** (human player or AI "king").
- Each fort has passive defenses: gates, walls, fortified bridges.
- Captains recruit and assign a squad of bots:
  - **Swordsmen** (melee)
  - **Archers** (ranged)
- Players manually position their squad around their fort (e.g., archers behind gates, swordsmen at the front) — poor positioning has real tactical consequences (e.g., archers on the front line get slaughtered).
- Teams fight each other; defeating a fort's squad allows the winning team to **capture** it.
- Capturing a fort grants:
  - More unit slots / additional bots
  - Gear and other bonuses
- This creates a snowballing conquest loop across the four-fort map.

---

## 3. Squad Command System

### 3.1 Follow / Call to Arms
- A command switches the squad from "garrison" behavior (holding position at the fort) to "follow" behavior (marching with the Captain).

### 3.2 The Scroll (Formation & Command UI)
- The Captain pulls out an in-world **scroll** as the formation/command interface (usable **anytime, mid-battle**, including for retreating).
- Formation options:
  - **Wedge**
  - **Line**
  - **Box**
  - **Custom** — player manually places each unit's position on a grid/map representation
- The scroll also supports **retreat / hold position** commands, allowing the Captain to reform mid-fight rather than only pre-battle.

---

## 4. Physics & Character Style

- **Wobbly, physically-driven movement** is core to the game's identity — not just a death effect. Units visibly bump, jostle, shove, and stumble during shield wall clashes and combat generally.
- Approach: **ragdoll physics with active balancing forces** that keep characters upright under normal conditions, but allow them to be knocked off balance or fully ragdoll when hit hard enough.
- **Base character rig:** a single default "bean"/blob-shaped humanoid body (Fall Guys-style), onto which different **cosmetic skins** can be applied.
- Captains are visually distinct from regular troop bots.
- Combat must be **visibly readable**: sword swings, arrow shots, and hits should clearly land and register.
- **No blood/gore** — hit reactions and death should be conveyed through stylized/cartoony physical feedback instead.

---

## 5. Build Phases

1. **Phase 1 — Physics Prototype**
   - Rough bubbly/blob humanoid placeholder character.
   - Focus entirely on nailing the wobbly ragdoll + balancing feel.
   - No combat, no AI — just walking around and observing the character/physics.

2. **Phase 2 — Bot Look & Feel**
   - Test the appearance and wobble of squad bots.
   - Basic movement/roaming, no tactics yet.

3. **Phase 3 — Tactics & Combat**
   - Squad following, formations (scroll system), combat behaviors (swordplay, archery), hit reactions.

4. **Phase 4 — Domination Loop**
   - Forts, capturing, unit/gear rewards, AI captains.

5. **Phase 5 — Multiplayer**
   - Transition AI-controlled captains to real networked players.

---

## 6. Technical Decisions

- **Engine:** Unreal Engine (chosen for physics fidelity/Chaos Physics, suited to the wobbly ragdoll requirement, and closer visual/technical parity with Shieldwall).
- **Language:** C++
- **Controls:** Keyboard & mouse only (initial scope)
- **Camera:** Third-person to start; first-person considered later if feasible.
- **Multiplayer:** Real networked multiplayer is a goal from the start. Development begins with AI-only testing, but the architecture (character movement, replication) must support multiplayer from day one so it can be added without a rebuild.
- **Local development:** Fully free to build and run locally in-editor, including simulating multiple local players before any real networking is added. No cost until release/revenue thresholds (per Unreal's royalty model) or if purchasing marketplace assets.

---

## 7. Industry Best Practices to Follow

- **Component-based architecture** — Captain and bot characters built from reusable components (movement, health, weapon, etc.) rather than deep inheritance chains.
- **Gameplay Ability System (GAS)** — recommended for combat actions, abilities, and formation commands; built with multiplayer replication in mind from the ground up.
- **Replication-friendly design** — movement and physics structured for Unreal's replication system from day one, even while all "players" are AI, so real multiplayer can be added later without rework.
- **Data-driven design** — units, formations, and stats defined via data tables rather than hardcoded, for easier iteration and balancing.
- **Performance-conscious physics** — ragdoll/wobble physics implemented with an eye toward scaling to larger battles later.

---

## 8. Team

- Primary developer/owner: designing and directing the project, with software development background (new to game dev specifically).
- Additional coding help: one collaborator assisting with implementation.

Scaffolded by Agent Mission Control.
