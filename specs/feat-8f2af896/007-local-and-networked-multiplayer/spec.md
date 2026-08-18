---
# Enable local and networked multiplayer
## Task Type
delivery
## Goal
Turn the snapshot/input protocol into real multiple-human play: two to four local Captains on one machine with separate keyboard bindings, plus an online room hosted by a WebSocket match server that runs the same authoritative sim. When this ticket is done an operator can start Local 2-player on `/play` and independently move two Captains, or host/join a room code and see a second client accept the same snapshots.
## Context
001 defined `InputCommand` + `Snapshot` but only one local player drives a Captain; 006 fills unused corners with AI kings. Locked: replication-friendly from day one; AI-only testing first; real multiplayer in this phase; local in-editor (here: in-browser) play must simulate multiple local players before real networking; keyboard and mouse only; no auth pack is composed — rooms are code-based, not OAuth. Next.js App Router route handlers cannot hold long-lived WebSocket clients; a small dedicated `ws` process is the durable path.
## Technical Approach
**Shared net host (`lib/game/net`, this ticket owns):**
- `NetHost` interface: `submitInput(cmd: InputCommand)`, `onSnapshot(cb)`, `getLocalPlayerIds()`.
- `LocalHost` implements `NetHost` in-process: multiple `playerId`s, one sim, one tick loop. This is the "simulate multiple local players" path and must work with `pnpm dev` alone (no extra process).
- `WsHost` implements the same interface against the match server.

**Local multi:**
- Lobby control `Local 2` / `Local 3` / `Local 4` on `/play`. Player 1: WASD + mouse. Player 2: IJKL + numpad look keys (`8/4/6/2` or `;`/`'` yaw). Players 3–4: additional documented key maps on the lobby card (still keyboard+mouse, no gamepad requirement).
- View: split screen (2 = vertical or horizontal split; 3–4 = quad). Each pane has its own third-person camera and `aria-label="Captain n battlefield"`.
- Unfilled slots remain 006 AI kings.

**Networked multi:**
- `server/match-server.ts` using the `ws` package. `package.json` script `"match-server": "tsx server/match-server.ts"` (add `ws`, `@types/ws`, `tsx` as deps; `package.json` is a shared touchpoint).
- Protocol (JSON, versioned): client `join { roomCode, playerName }` → server assigns a free corner `playerId` or `error: 'room_full'`; client `input { InputCommand }`; server ticks at 60 Hz and broadcasts `snapshot` (or a delta plus periodic full snapshot). Server sim is the authority; clients render snapshots and may predict local movement but must reconcile.
- `POST /api/match` creates a room and returns `{ roomCode, wsUrl }`. `GET /api/match?code=` returns `{ exists, seatsTaken, seatsMax: 4 }` so the lobby can show status without the WS process answering HTTP. Room state may live in memory on the match server; the Next route either proxies to it (`MATCH_SERVER_URL`) or, when the match server is down, `POST /api/match` returns HTTP 503 with `{ error: 'match_server_unavailable' }` — not a fake success.
- Lobby UI: exact strings `Host match`, `Join match`, `Room code`, `Local 2`. Joining with a valid code mounts `WsHost`. Disconnects reassign that corner to an AI king without tearing down the match.

**Security / fairness (lightweight):** server ignores inputs for the wrong `playerId`, ignores commands for dead/knocked-down control, and does not trust client snapshot state.

**Tests:** `LocalHost` with two canned input streams must move two captains in different directions. A protocol codec test round-trips a snapshot. When `MATCH_SERVER_URL` is unset, `POST /api/match` returns 503 JSON (integration can skip live WS if the process is absent; include a `lib/game/net/protocol.test.ts` that does not need the socket).
## Acceptance Criteria
- [ ] `LocalHost` with two player ids, P1 `moveX=1` and P2 `moveX=-1` for 60 ticks, yields two captain transforms whose `x` moved in opposite directions (`lib/game/net/local-host.test.ts`)
- [ ] `encodeSnapshot` / `decodeSnapshot` round-trips a fixture snapshot with `JSON.parse(JSON.stringify(decoded))` deep-equal to the decoded value (`lib/game/net/protocol.test.ts`)
- [ ] `POST /api/match` with no match server returns HTTP 503 and JSON `{ "error": "match_server_unavailable" }`
- [ ] `GET /play` body contains `Local 2` and `Host match` and `Join match` and `Room code`
- [ ] Unfilled network/local seats remain occupied by an AI king (`createSession({ humans: 1 }).aiKingCount === 3`)
- [ ] `pnpm test -- lib/game/net` exits 0
- [ ] Split-screen local 2-player mounts two elements labeled `Captain 1 battlefield` and `Captain 2 battlefield`
## Files to Touch
- lib/game/net/host.ts  (create)
- lib/game/net/local-host.ts  (create)
- lib/game/net/local-host.test.ts  (create)
- lib/game/net/ws-host.ts  (create)
- lib/game/net/protocol.ts  (create)
- lib/game/net/protocol.test.ts  (create)
- lib/game/net/session.ts  (create)
- server/match-server.ts  (create)
- app/api/match/route.ts  (create)
- components/game/lobby.tsx  (create)
- components/game/split-view.tsx  (create)
- package.json  (modify)
## Owned Areas
- lib/game/net
- server/match-server.ts
- app/api/match/route.ts
- components/game/lobby.tsx
- components/game/split-view.tsx
## Shared Touchpoints
- lib/game/sim
- lib/game/match
- lib/game/ai/king.ts
- components/game/play-canvas.tsx
- components/game/hud-slots.tsx
- app/(game)/play/page.tsx
- package.json
## Test Strategy
Run `pnpm test -- lib/game/net`. On `/play`, click `Local 2`, confirm split view, move P1 with WASD and P2 with IJKL in opposite directions. Click `Host match` with the match server stopped and confirm the UI shows the server-unavailable error (HTTP 503). Optionally run `pnpm match-server`, host, and join from a second browser window with the room code. Check 2-pane desktop and a stacked mobile layout.
## AMC Task Metadata
```json
{
  "title": "Enable local and networked multiplayer",
  "goal": "Turn the snapshot/input protocol into real multiple-human play: two to four local Captains on one machine with separate keyboard bindings, plus an online room hosted by a WebSocket match server that runs the same authoritative sim. When this ticket is done an operator can start Local 2-player on /play and independently move two Captains, or host/join a room code and see a second client accept the same snapshots.",
  "taskType": "delivery",
  "specRef": "specs/feat-8f2af896/007-local-and-networked-multiplayer/spec.md",
  "acceptanceCriteria": [
    "LocalHost with two player ids, P1 moveX=1 and P2 moveX=-1 for 60 ticks, yields two captain transforms whose x moved in opposite directions (lib/game/net/local-host.test.ts)",
    "encodeSnapshot / decodeSnapshot round-trips a fixture snapshot with JSON.parse(JSON.stringify(decoded)) deep-equal to the decoded value (lib/game/net/protocol.test.ts)",
    "POST /api/match with no match server returns HTTP 503 and JSON { \"error\": \"match_server_unavailable\" }",
    "GET /play body contains Local 2 and Host match and Join match and Room code",
    "Unfilled network/local seats remain occupied by an AI king (createSession({ humans: 1 }).aiKingCount === 3)",
    "pnpm test -- lib/game/net exits 0",
    "Split-screen local 2-player mounts two elements labeled Captain 1 battlefield and Captain 2 battlefield"
  ],
  "testCommand": "pnpm test -- lib/game/net",
  "phase": "build",
  "ownedAreas": [
    "lib/game/net",
    "server/match-server.ts",
    "app/api/match/route.ts",
    "components/game/lobby.tsx",
    "components/game/split-view.tsx"
  ],
  "sharedTouchpoints": [
    "lib/game/sim",
    "lib/game/match",
    "lib/game/ai/king.ts",
    "components/game/play-canvas.tsx",
    "components/game/hud-slots.tsx",
    "app/(game)/play/page.tsx",
    "package.json"
  ],
  "dependsOn": [
    "Ship landing page and wobbly physics prototype",
    "Add AI king captains and match victory"
  ],
  "browserVerification": {
    "required": true,
    "criteria": [
      {
        "id": "AC-FE-8",
        "text": "Local 2 starts a split view where WASD moves Captain 1 and IJKL moves Captain 2 independently; Host match / Join match / Room code are visible",
        "route": "/play"
      }
    ]
  }
}
```
---
