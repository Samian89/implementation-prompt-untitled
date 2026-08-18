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

## Requirements

- Node.js 20 or newer
- [pnpm](https://pnpm.io/installation) 9 or newer
- A PostgreSQL database, if this app ships one (there is a `drizzle.config.ts`)

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Now fill in `.env.local`. `.env.example` lists every variable this app reads,
with the required ones first. The two that most often block a first run:

- **`DATABASE_URL`** — the Postgres connection string, e.g.
  `postgres://user:password@localhost:5432/appdb`. Without it, any page that
  reads the database fails with "DATABASE_URL is not set".
- **`AUTH_SECRET`** — required if this app has sign-in. It signs the session
  cookie; there is no default, and without it every sign-in silently fails.
  Generate one:

  ```bash
  openssl rand -base64 32
  ```

If the app has a database, create the schema before the first start:

```bash
pnpm db:generate   # writes db/migrations from the schema
pnpm db:migrate    # applies them
pnpm db:seed       # creates the starter accounts shown on the sign-in page
```

Then start it:

```bash
pnpm dev
```

The app runs at http://localhost:3000, and `GET /api/health` should return
`{"ok":true,...}`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build (run `pnpm build` first) |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm db:generate` | Generate SQL migrations from the schema |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Seed starter data |
| `pnpm db:studio` | Browse the database in Drizzle Studio |

The `db:*` scripts exist only when this app includes a database.

## Deploying

Set the same variables in your host's environment, plus
`NEXT_PUBLIC_BASE_URL` (the app's public origin, e.g.
`https://example.com`) so links, OAuth callbacks and social preview URLs are
absolute. `NEXT_PUBLIC_*` values are inlined at build time — change one and
rebuild, restarting alone will not pick it up. Run `pnpm db:migrate` against
the production database on each release.

## Project layout

```
app/            routes (App Router)
components/     UI — components/ui holds the shared primitives
lib/            server + shared helpers
db/             schema, migrations and seed (if present)
docs/foundation/ how the foundation fits together, and which files are yours
```

Read `docs/foundation/` before changing anything under `app/layout.tsx`,
`components/site-header.tsx` or `middleware.ts` — it documents the extension
points that survive an upgrade.
