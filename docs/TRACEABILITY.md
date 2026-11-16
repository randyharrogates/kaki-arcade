# Kaki Arcade — Traceability

Every requirement, its state, and the proof. This is the tracker PRD NN-7 requires. It is
checked by `python3 tools/trace_check.py`, which runs inside `pnpm verify`.

**Status values:** `not started` · `in progress` · `partial` (say what is missing in STATUS.md) ·
`done` · `later` (designed for, not built in v1) · `not met` (tested and failed; needs a decision).

A row is `done` only with code paths, an automated test, UAT evidence Claude has looked at, and a
clean review (`WORKFLOW.md`). Requirement text here is a short label; the PRD wording is the
requirement.

## Non-negotiables

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| NN-1 | MUST | Everything runs in a web browser: the big screen and the phone controllers | M3 | not started | — | — | — |
| NN-2 | MUST | The phone is the controller | M3 | not started | — | — | — |
| NN-3 | MUST | No perceptible lag in play | M2 on | not started | — | — | — |
| NN-4 | MUST | Art is produced through Blender (route D) and must look finished: not primitive, with correct character… | M2, M5 | not started | — | — | — |
| NN-5 | MUST | The design rules in DESIGN.md (golden ratio, motion, no flat backgrounds) are binding for the interface… | M1 on | in progress | `packages/ui` (tokens, themes, motion helpers; screens come later) | `packages/ui/src/*.test.ts` | `uat/evidence/F-06-design-tokens/` |
| NN-6 | MUST | Visual and art direction is chosen by Randy from artifact option boards before any game code is written… | M1 | in progress | `docs/DESIGN.md` §4 (a decision gate, not code; closed 2026-11-16, D-051) | — | `docs/design-gate/` boards 0 to 5 |
| NN-7 | MUST | Implementation is tracked against this PRD in local repo docs at all times (TRACEABILITY.md) | M0 on | in progress | `tools/trace_check.py`, `package.json` (verify) | `tools/*.test.ts` | `uat/evidence/F-01-workspace/` |
| NN-8 | MUST | Work proceeds in the loop code → verify → test (UAT with screenshots) → review → code (WORKFLOW.md) | M0 on | in progress | `package.json` (verify), `tools/check_workspace.mjs`, `tools/lint_design.mjs`, `.claude/agents/` | `tools/*.test.ts` | `uat/evidence/F-01-workspace/` |
| NN-9 | MUST | Built by Claude | all | not started | — | — | — |

## Platform: rooms, picker, game interface

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| PLAT-001 | MUST | Opening the host page creates a room with a short room code and a QR code that encodes the join link | M3 | in progress | `apps/signal/src/worker.ts`, `core/codes.ts` (room creation and codes; the host page and QR are C-07) | `apps/signal/src/core/room.test.ts`, `worker.test.ts` | `uat/evidence/C-01-pairing-server/` |
| PLAT-002 | MUST | A phone that scans the QR code (or types the code at the join page) lands in the lobby as a player, with… | M3 | not started | — | — | — |
| PLAT-003 | MUST | A room holds 1 to 8 players | M3 | in progress | `packages/platform/src/room/room.ts` (pure state: 8 seats; no screen yet) | `room/seats-and-leader.test.ts`, `room/invariants.test.ts` | `uat/evidence/C-06-room-state/` |
| PLAT-004 | MUST | Each player picks a nickname (max 12 characters) and is assigned a distinct colour and seat number shown… | M3 | in progress | `packages/platform/src/room/room.ts` (nickname check, uniqueness, seat and colour; no screen yet) | `room/names.test.ts` | `uat/evidence/C-06-room-state/` |
| PLAT-005 | MUST | Nicknames pass a blocked-words filter | M8 | in progress | `packages/platform/src/room/blocked-words.ts` (rule in D-067; known gaps in the slice note) | `room/filter.test.ts` | `uat/evidence/C-06-room-state/` |
| PLAT-006 | MUST | The first player to join is the room leader and can start games, change settings and return to the picker | M3 | in progress | `packages/platform/src/room/room.ts` (leader, hand-over; leader actions come with C-07 to C-10) | `room/seats-and-leader.test.ts`, `room/restore.test.ts` | `uat/evidence/C-06-room-state/` |
| PLAT-007 | MUST | A player whose phone sleeps, reloads or drops is put back in the same seat with the same state when they… | M3 | in progress | `packages/platform/src/reconnect/` (a phone returns to its seat within the two-minute hold; simulated connections, no real phone yet) | `packages/platform/src/reconnect/*.test.ts`, `games/*/src/reconnect.test.ts` | `uat/evidence/C-05-reconnect/` |
| PLAT-008 | MUST | Players can join mid-session from the lobby | M3 | in progress | `packages/platform/src/room/room.ts` (joining by phase and game policy; no screen yet) | `room/seats-and-leader.test.ts` | `uat/evidence/C-06-room-state/` |
| PLAT-009 | MUST | If the host page closes or reloads, phones show "host disconnected" and reconnect automatically when the… | M3 | in progress | `packages/platform/src/reconnect/` (host reload restores room, players and last results and returns to the lobby; OQ-031 open; no real browser yet) | `packages/platform/src/reconnect/*.test.ts`, `games/*/src/reconnect.test.ts` | `uat/evidence/C-05-reconnect/` |
| PLAT-010 | SHOULD | The big screen shows connection quality per player (good, weak, relayed) | M3 | not started | — | — | — |
| PLAT-020 | MUST | The lobby shows a game picker listing every installed game with name, player range and a one-line description | M3 | not started | — | — | — |
| PLAT-021 | MUST | Each game declares its supported player range | M3 | not started | — | — | — |
| PLAT-022 | MUST | After a game ends, the room returns to a results screen and then the picker, keeping the same players | M3 | in progress | `packages/platform/src/session/` (ends a match with results and returns to the picker with the same players; no screen yet) | `packages/platform/src/session/*.test.ts` | `uat/evidence/C-10-session-runner/` |
| PLAT-023 | MUST | The leader can pause a running game and quit to the picker | M3 | in progress | `packages/platform/src/session/` (pause, leader resume, quit with a second press; no screen yet) | `packages/platform/src/session/*.test.ts` | `uat/evidence/C-10-session-runner/` |
| PLAT-024 | SHOULD | The big screen can be driven without a phone for setup (keyboard) so the host is never stuck | M3 | not started | — | — | — |
| PLAT-025 | MUST | Games may declare team play; two teams with colour themes, balanced by default, changeable on phones | M3 | in progress | `packages/platform/src/game/types.ts` (games declare teams; team setup is C-11) | `packages/platform/src/game/*.test.ts` | `uat/evidence/F-04-game-interface/` |
| PLAT-030 | MUST | Games are modules behind one documented interface | M3 | in progress | `packages/platform/src/game/` (interface and conformance kit; no real game yet) | `packages/platform/src/game/*.test.ts` | `uat/evidence/F-04-game-interface/` |
| PLAT-031 | MUST | The interface covers: metadata, player range, controller layout per player and game phase, simulation… | M3 | in progress | `packages/platform/src/game/types.ts`, `layout.ts`, `settings.ts`, `drive.ts` | `packages/platform/src/game/*.test.ts` | `uat/evidence/F-04-game-interface/` |
| PLAT-032 | MUST | Game simulation is a pure, deterministic function of state, inputs and a seed, with no access to… | M3 | in progress | `packages/sim-core/src/` (generator, timestep, input buffer, snapshot, replay; games must still pass the F-04 kit) | `packages/sim-core/src/*.test.ts` | `uat/evidence/F-03-sim-core/` |
| PLAT-033 | MUST | All three v1 games use this interface with no private back doors | M3 | in progress | `packages/platform/src/game/conformance.ts` (the kit each game must pass; the games are tracks R, P, T) | `packages/platform/src/game/conformance-*.test.ts` | `uat/evidence/F-04-game-interface/` |

## Controller kit

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| CTRL-001 | MUST | The phone shows a console-style controller assembled from a standard kit: left stick, D-pad, A/B/X/Y face… | M3 | not started | — | — | — |
| CTRL-002 | MUST | Each game declares which kit parts it uses per phase | M3 | not started | — | — | — |
| CTRL-003 | MUST | Optional kit parts a game may request: tilt, shake, swipe area, and a private display panel (text, cards,… | M3 | not started | — | — | — |
| CTRL-004 | MUST | The controller works in landscape, fills the screen, prevents page scroll, zoom, text selection and… | M3 | not started | — | — | — |
| CTRL-005 | MUST | Touch targets are at least 55 px | M3 | not started | — | — | — |
| CTRL-006 | MUST | Every press gives feedback on the phone within one frame: visual always, vibration where the browser… | M3 | not started | — | — | — |
| CTRL-007 | MUST | Motion parts (tilt, shake) ask for permission with a clear tap-to-enable step on iPhone and degrade to a… | M3 | not started | — | — | — |
| CTRL-008 | MUST | The controller shows the player's colour, seat and nickname, and a connection indicator | M3 | not started | — | — | — |
| CTRL-009 | SHOULD | A physical keyboard or gamepad attached to the host can act as one extra player for development and… | M3 | not started | — | — | — |

## Networking

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| NET-001 | MUST | The host browser is authoritative: it runs the simulation | M3 | in progress | `packages/protocol/src/channel.ts` (no host → phone message can carry state or another player's view; the host runner is C-10), `packages/netcode/src/` (validated control channel, per-phone revisions) | `packages/protocol/src/*.test.ts`, `packages/netcode/src/*.test.ts` | `uat/evidence/F-02-protocol/`, `uat/evidence/C-04-netcode/` |
| NET-002 | MUST | Phones connect to the host directly (WebRTC data channels) | M3 | in progress | `apps/signal/src/core/room.ts`, `room-object.ts` (signalling only, forwarding validated), `packages/netcode/src/` (pairing clients and data channels, simulated connections only) | `apps/signal/src/core/room.test.ts`, `room-object.test.ts`, `packages/netcode/src/*.test.ts` | `uat/evidence/C-01-pairing-server/`, `uat/evidence/C-04-netcode/` |
| NET-003 | MUST | When a direct link is impossible, the connection falls back to a relay (Cloudflare TURN) automatically | M3 | not started | — | — | — |
| NET-004 | MUST | The pairing server stops issuing relay access once monthly relay usage passes a configured limit (default… | M8 | not started | — | — | — |
| NET-005 | MUST | Input messages are small, sequenced and tolerant of loss; a dropped packet never leaves a button stuck down | M3 | in progress | `packages/protocol/src/input.ts`, `packages/sim-core/src/input.ts` `packages/netcode/src/input-sender.ts`, `input-receiver.ts` | `packages/protocol/src/*.test.ts`, `packages/netcode/src/*.test.ts` | `uat/evidence/F-02-protocol/`, `uat/evidence/C-04-netcode/` |
| NET-006 | MUST | All pages are served over HTTPS (required for motion sensors, wake lock and WebRTC) | M3 | not started | — | — | — |
| NET-007 | LATER | Phase 2: a remote player on a single device sees the game view and plays with on-screen or keyboard controls | Phase 2 | later | — | — | — |

## Data, privacy and safety

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| DATA-001 | MUST | No accounts, no email, no personal data collected in v1 | M8 | in progress | `apps/signal` stores only room code, host secret, socket ids, roles and timestamps (the rest of the product is later) | `apps/signal/src/room-object.test.ts` | `uat/evidence/C-01-pairing-server/` |
| DATA-002 | MUST | Scores, stars and settings are saved on the host device only | M8 | not started | — | — | — |
| DATA-003 | MUST | The only telemetry is anonymous error and performance counts with no nicknames, IPs or device identifiers… | M8 | not started | — | — | — |
| DATA-004 | MUST | A short privacy page states the above in plain English | M8 | not started | — | — | — |
| DATA-005 | MUST | Room codes are unguessable enough to prevent casual gate-crashing, rooms expire when idle, and the pairing… | M8 | in progress | `apps/signal/src/core/codes.ts`, `core/room.ts` (8-character codes, idle and absolute expiry, per-socket limits), `apps/signal/src/core/admission.ts`, `core/address.ts`, `admission-object.ts` (limits per client and per network on creation, attempts, failed guesses and silent sockets; local runtime only, not deployed) | `apps/signal/src/core/room.test.ts`, `room-object.test.ts` | `uat/evidence/C-01-pairing-server/` |

## Public release

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| REL-001 | MUST | Deployed on Cloudflare under a leeseidon.com subdomain, within the existing US$5/month plan under normal use | M8 | not started | — | — | — |
| REL-002 | MUST | A landing page explains what it is in one screen and has a single "Host a game" action | M8 | not started | — | — | — |
| REL-003 | MUST | A "how to put this on your TV" help page: laptop over HDMI (recommended, with Game Mode), and the TV's own… | M8 | not started | — | — | — |
| REL-004 | MUST | Supported big screens: current Chrome, Edge and Safari on a laptop or desktop | M8 | not started | — | — | — |
| REL-005 | SHOULD | Runs in a browser on Randy's TCL Q65 (Google TV) | M2, M8 | not started | — | — | — |
| REL-006 | MUST | Unsupported browsers get a clear message, not a broken page | M8 | not started | — | — | — |

## Quality

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| NFR-PERF | MUST | All budgets in PERFORMANCE.md are met and tested automatically | M2 on | not started | — | — | — |
| NFR-DES | MUST | Every screen passes the checklist in DESIGN.md §6 at review | M3 on | in progress | `packages/ui/src/contrast.ts`, `tools/design_lint` (tokens only; no screen exists yet) | `packages/ui/src/contrast.test.ts` | `uat/evidence/F-06-design-tokens/` |
| NFR-A11Y | MUST | Colour is never the only way to tell players apart (colour plus shape or number) | M3 on | not started | — | — | — |
| NFR-REL | MUST | A 30-minute 8-player session completes with no crash, no stuck input and no desync between the big screen… | M6, M8 | not started | — | — | — |
| NFR-TEST | MUST | Game rules have unit tests on the deterministic simulation | M3 on | in progress | `vitest.config.ts`, `packages/platform/src/game/` (conformance kit), `packages/platform/src/harness/` (dev harness); rules tests in each game; UAT and performance harnesses are F-07 and F-08 | `packages/platform/src/harness/*.test.ts`, `games/*/src/**/harness.test.ts` | `uat/evidence/F-01-workspace/`, `uat/evidence/F-05-game-harness/` |
| NFR-DOC | MUST | TRACEABILITY.md, STATUS.md and CHANGELOG.md are updated in the same loop as the change they describe | M0 on | in progress | — | — | — |

## Performance budgets

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| PERF-001 | MUST | Reference laptop (the dev Mac, Chrome, 1080p output) — 95th-percentile frame time ≤ 16.7 ms (60 fps); no… | M2 on | not started | — | — | — |
| PERF-002 | MUST | TV-class device (the TCL Q65's browser) — 95th-percentile frame time ≤ 33.3 ms (30 fps) in lower-detail… | M2, M8 | not started | — | — | — |
| PERF-010 | MUST | Direct, same Wi-Fi — 95th percentile ≤ 50 ms | M2 on | not started | — | — | — |
| PERF-011 | MUST | Relayed — 95th percentile ≤ 120 ms; the big screen marks the player as relayed (PLAT-010) | M2 on | not started | — | — | — |
| PERF-012 | MUST | Phone feedback — The controller shows the press within one frame of the touch, independent of the network | M2 on | in progress | `packages/ui/src/motion.ts` `press`, `.ka-pressable` (press-down is instant; the controller is K-01) | `packages/ui/src/motion.test.ts` | — |
| PERF-020 | MUST | Controller page — ≤ 300 KB transferred; interactive ≤ 2 s on a mid-range phone on Wi-Fi | M2 on | not started | — | — | — |
| PERF-021 | MUST | QR scan to seated in lobby — ≤ 5 s | M2 on | not started | — | — | — |
| PERF-022 | MUST | Host shell (landing to lobby) — ≤ 1.5 MB transferred | M2 on | not started | — | — | — |
| PERF-023 | MUST | One Tabao Rush level, all assets — ≤ 8 MB transferred; loaded before the round starts, never during it | M2 on | in progress | `tools/assets/pipeline.py`, `tools/check_budgets.mjs` (packing and the size check in `pnpm verify`; the runtime loader is track T) | `tools/assets/test_pipeline.py`, `tools/assets/pipeline.test.ts` | `uat/evidence/A-01-asset-pipeline/` |
| PERF-024 | MUST | Texture memory in a round — ≤ 256 MB decoded on the host | M2 on | in progress | `tools/assets/pipeline.py` (decoded bytes per round in the manifest, checked at build) | `tools/assets/test_pipeline.py` | `uat/evidence/A-01-asset-pipeline/` |
| PERF-030 | MUST | 30-minute 8-player session: no crash, memory growth under 10%, no stuck input (NFR-REL) | M6, M8 | not started | — | — | — |

## Peek Poker

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| PP-001 | MUST | A match is 3, 5 or 7 rounds chosen by the leader (default 5) | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-002 | MUST | Each round deals from one shuffled standard 52-card deck: 16 cards into a 4 × 4 grid and 3 shared cards | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-003 | MUST | The 16 grid cards are shown face up on the big screen for the memorise time (20 seconds in round 1), then… | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-004 | MUST | The 3 shared cards stay face up for the whole round | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-005 | MUST | Each player secretly picks 2 grid positions on their own phone within the pick time (default 20 seconds) | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-006 | MUST | Two or more players may pick the same card | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-007 | MUST | A player's hand is their 2 picked cards plus the 3 shared cards | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-008 | MUST | At the reveal, the grid flips face up, each player's picks are marked with their colour and seat number,… | M4 | not started | — | — | — |
| PP-009 | MUST | Round scoring by hand rank plus best-hand bonus; fastest among tied best hands gets +3, others +1 | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-010 | MUST | A player who has not picked 2 cards when time runs out has the missing picks chosen at random | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-011 | MUST | Difficulty rises each round (table below) | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-012 | MUST | 1 to 8 players | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-013 | MUST | A player who joins mid-match enters at the next round with a score of 0 | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-020 | MUST | Picks are never sent to other phones or drawn on the big screen before the reveal | M4 | not started | — | — | — |
| PP-021 | MUST | The big screen shows who has locked in (seat markers only), not what they picked | M4 | not started | — | — | — |
| PP-022 | MUST | When everyone has locked in, the round proceeds without waiting for the timer | M4 | in progress | `games/peek-poker/src/rules/` (rules only; no screen) | `games/peek-poker/src/rules/*.test.ts` | `uat/evidence/P-01-peek-poker-rules/` |
| PP-030 | MUST | Cards are large enough on a TV to read rank and suit from 3 m, and suits differ by shape and colour | M4 | not started | — | — | — |
| PP-031 | MUST | Card flips, swaps and the reveal follow ../DESIGN.md §3 (masks for reveals, arcs for moving cards, no bounce) | M4 | not started | — | — | — |
| PP-032 | MUST | A running scoreboard is visible between rounds and a final podium at match end | M4 | not started | — | — | — |

## Rabakz

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| RZ-001 | MUST | A match is 10, 30 or 50 questions chosen by the leader | M4 | in progress | `games/rabakz/src/rules/` (rules only; no screen) | `games/rabakz/src/rules/rules.test.ts` | `uat/evidence/R-01-rabakz-rules/` |
| RZ-002 | MUST | Multiple choice, true or false and picture questions; no typed answers | M4 | not started | — | — | — |
| RZ-003 | MUST | Question and options on the big screen; matching answer buttons on each phone | M4 | not started | — | — | — |
| RZ-004 | MUST | No timer; any player answers at any moment; a press is final for that turn | M4 | in progress | `games/rabakz/src/rules/` (rules only; no screen) | `games/rabakz/src/rules/rules.test.ts` | `uat/evidence/R-01-rabakz-rules/` |
| RZ-005 | MUST | TV shows who answered and which options were wrong; nothing sent to other phones | M4 | not started | — | — | — |
| RZ-006 | MUST | First correct answer ends the question; 0.25 s tie window; wrong = locked until all have had a turn; leader skip; auto-skip at 30 s | M4 | in progress | `games/rabakz/src/rules/` (rules only; no screen) | `games/rabakz/src/rules/rules.test.ts` | `uat/evidence/R-01-rabakz-rules/` |
| RZ-007 | MUST | Correct answer scores 100; no speed bonus; scores never go down | M4 | in progress | `games/rabakz/src/rules/` (rules only; no screen) | `games/rabakz/src/rules/rules.test.ts` | `uat/evidence/R-01-rabakz-rules/` |
| RZ-008 | MUST | Streak: +50 from the third question won in a row | M4 | in progress | `games/rabakz/src/rules/` (rules only; no screen) | `games/rabakz/src/rules/rules.test.ts` | `uat/evidence/R-01-rabakz-rules/` |
| RZ-009 | MUST | Final round scores double | M4 | in progress | `games/rabakz/src/rules/` (rules only; no screen) | `games/rabakz/src/rules/rules.test.ts` | `uat/evidence/R-01-rabakz-rules/` |
| RZ-010 | MUST | Leader chooses categories or Mixed | M4 | not started | — | — | — |
| RZ-011 | MUST | Leader chooses difficulty: Easy, Mixed or Hard | M4 | not started | — | — | — |
| RZ-012 | MUST | Free-for-all and two-team mode; a won question scores for the team | M4 | in progress | `games/rabakz/src/rules/` (rules only; no screen) | `games/rabakz/src/rules/rules.test.ts` | `uat/evidence/R-01-rabakz-rules/` |
| RZ-013 | MUST | Solo score attack; only the first answer can score | M4 | not started | — | — | — |
| RZ-014 | MUST | Mid-match joiner enters at the next question with 0 | M4 | in progress | `games/rabakz/src/rules/` (rules only; no screen) | `games/rabakz/src/rules/rules.test.ts` | `uat/evidence/R-01-rabakz-rules/` |
| RZ-015 | MUST | No repeats within a match; recently seen questions avoided on this host | M4 | not started | — | — | — |
| RZ-016 | MUST | Players level on points share the placing | M4 | in progress | `games/rabakz/src/rules/` (rules only; no screen) | `games/rabakz/src/rules/rules.test.ts` | `uat/evidence/R-01-rabakz-rules/` |
| RZ-020 | MUST | Bundled bank; everything for a match loaded before it starts, at most 2 MB | M4 | in progress | `content/rabakz/src/select.ts` (loader and budget; fetching before a match is R-08) | `content/rabakz/src/select.test.ts` | `uat/evidence/R-10-question-schema/` |
| RZ-021 | MUST | Sources: Open Trivia Database (CC BY-SA 4.0, credited) and a Singapore pack spot-checked by Randy | M4 | in progress | `content/rabakz/src/questions/singapore-*.json` (305 written), `content/rabakz/scripts/import-otdb.ts`, `CREDITS.md` (2,342 imported and credited; Randy's spot-check R-14 outstanding) | `content/rabakz/scripts/build.test.ts` | `uat/evidence/R-12-singapore-pack/` |
| RZ-022 | MUST | Question schema and build-time validation of lengths | M4 | in progress | `content/rabakz/src/schema.ts`, `validate.ts`, `build.ts` | `content/rabakz/src/validate.test.ts`, `scripts/build.test.ts` | `uat/evidence/R-10-question-schema/` |
| RZ-023 | MUST | Bank screened for a public, all-ages audience | M4 | in progress | `content/rabakz/scripts/otdb-screen.ts`, `otdb-removed.txt`, `otdb-allowed.txt` (pattern screen plus three review rounds of reading; Randy's spot-check R-14 outstanding) | `content/rabakz/scripts/otdb-screen.test.ts` | `uat/evidence/R-11-otdb-import/` |
| RZ-024 | MUST | Launch size: 1,500 questions, 200 Singapore, 60 picture | M4 | in progress | `content/rabakz/src/questions/` (Singapore 312 of 200 met; total and pictures outstanding: R-11, R-13) | `content/rabakz/scripts/build.test.ts` | `uat/evidence/R-12-singapore-pack/` |
| RZ-025 | MUST | Picture images are real photographs (free licence, credited) or Codex-generated and checked; no renders | M4 | not started | — | — | — |
| RZ-026 | MUST | Option order shuffled from the seed; correct position uniform | M4 | in progress | `games/rabakz/src/rules/` (rules only; no screen) | `games/rabakz/src/rules/rules.test.ts` | `uat/evidence/R-01-rabakz-rules/` |
| RZ-030 | MUST | Question and options readable from 3 m; options differ by letter and shape | M4 | not started | — | — | — |
| RZ-031 | MUST | No timer shown; lock-out marked without colour alone; motion rules | M4 | not started | — | — | — |
| RZ-032 | MUST | Scoreboard every 5 questions and a final podium; team totals first in team mode | M4 | not started | — | — | — |
| RZ-033 | SHOULD | Sounds for answer, correct, wrong, unlock | M4 | not started | — | — | — |
| RZ-034 | MUST | Players shown by seat number, colour and nickname; no cook characters | M4 | not started | — | — | — |

## Tabao Rush

| ID | Pri | Requirement | Milestone | Status | Code | Tests | Evidence |
|---|---|---|---|---|---|---|---|
| TR-001 | MUST | Orders appear as cards on an order board (dish, recipe icons, patience timer); no customer characters | M5 | not started | — | — | — |
| TR-002 | MUST | Players move freely around the stall floor, carry one item at a time, and interact with the station they face | M5 | in progress | `games/tabao-rush/src/rules/` (movement and carrying; rules only) | `games/tabao-rush/src/rules/movement.test.ts` | `uat/evidence/T-01-tabao-movement/`, `uat/evidence/T-02-tabao-items/` |
| TR-003 | MUST | A dish is made by taking ingredients through stations in the recipe's order, then plating and delivering… | M5 | in progress | `games/tabao-rush/src/rules/recipes.ts`, `stations.ts` (seven recipes as data, containers, ordered steps; rules only, no screen) | `games/tabao-rush/src/rules/recipes.test.ts` | `uat/evidence/T-04-tabao-recipes/` |
| TR-004 | MUST | Correct orders score points plus a speed tip | M5 | in progress | `games/tabao-rush/src/rules/recipes.ts`, `stations.ts` (serving and rejection with a reason only; scoring, tips and orders are T-05) | `games/tabao-rush/src/rules/recipes.test.ts` | `uat/evidence/T-04-tabao-recipes/` |
| TR-005 | MUST | A round lasts a fixed time (default 3 minutes 30 seconds) | M5 | not started | — | — | — |
| TR-006 | MUST | Score thresholds and order rate scale with the number of players so 1 player and 8 players both face a… | M5 | not started | — | — | — |
| TR-007 | MUST | Cooking stations run on timers once loaded | M5 | in progress | `games/tabao-rush/src/rules/stations.ts` (rules only; no screen) | `games/tabao-rush/src/rules/stations.test.ts` | `uat/evidence/T-03-tabao-stations/` |
| TR-008 | MUST | Used plates return dirty and must be washed before reuse | M5 | in progress | `games/tabao-rush/src/rules/stations.ts` (rules only; served containers come back dirty at the return counter and are washed at the sink, T-04) | `games/tabao-rush/src/rules/stations.test.ts` | `uat/evidence/T-03-tabao-stations/` |
| TR-009 | MUST | Throwing a held raw or chopped ingredient on an arc; teammates catch | M5 | in progress | `games/tabao-rush/src/rules/items.ts` (rules only; no screen) | `games/tabao-rush/src/rules/items.test.ts` | `uat/evidence/T-02-tabao-items/` |
| TR-010 | MUST | Fires: start, spread, burning station unusable, extinguisher; harder levels only | M6 | in progress | `games/tabao-rush/src/rules/stations.ts` (rules only; no screen) | `games/tabao-rush/src/rules/stations.test.ts` | `uat/evidence/T-03-tabao-stations/` |
| TR-020 | MUST | Movement responds on the next simulation step after input arrives, with no acceleration smoothing while… | M5 | in progress | `games/tabao-rush/src/rules/` (rules only; no screen) | `games/tabao-rush/src/rules/movement.test.ts` | `uat/evidence/T-01-tabao-movement/` |
| TR-021 | MUST | The station a player would interact with is highlighted before they press, so a press never surprises | M5 | in progress | `games/tabao-rush/src/rules/` (rules only; no screen) | `games/tabao-rush/src/rules/movement.test.ts` | `uat/evidence/T-01-tabao-movement/` |
| TR-022 | MUST | Players cannot walk through each other; collisions are soft enough that 8 players never deadlock in a corridor | M5 | in progress | `games/tabao-rush/src/rules/` (rules only; no screen) | `games/tabao-rush/src/rules/movement.test.ts` | `uat/evidence/T-01-tabao-movement/` |
| TR-023 | MUST | Players can pass items by placing them on counters | M5 | in progress | `games/tabao-rush/src/rules/items.ts` (rules only; no screen) | `games/tabao-rush/src/rules/items.test.ts` | `uat/evidence/T-02-tabao-items/` |
| TR-030 | MUST | Every station shows its state at a glance from 3 m: empty, working (with progress), done, burning | M5 | in progress | `games/tabao-rush/src/rules/stations.ts` (view data only; nothing is drawn) | `games/tabao-rush/src/rules/stations.test.ts` | `uat/evidence/T-03-tabao-stations/` |
| TR-031 | MUST | Progress and state are readable without colour alone (NFR-A11Y) | M5 | not started | — | — | — |
| TR-040 | MUST | 7 dishes at launch, introduced gradually across levels | M6 | in progress | `games/tabao-rush/src/rules/recipes.ts`, `stations.ts` (the seven dishes exist as recipes; gradual introduction is T-06 and T-16) | `games/tabao-rush/src/rules/recipes.test.ts` | `uat/evidence/T-04-tabao-recipes/` |
| TR-041 | MUST | Each dish is recognisable as itself at game size on a TV (checked at the design gate and in UAT) | M6 | not started | — | — | — |
| TR-050 | MUST | 8 co-op levels across hawker-world venues, each a distinct layout and twist; fires from level 5 | M6 | not started | — | — | — |
| TR-051 | MUST | Co-op mode for 1 to 8 players | M5 | not started | — | — | — |
| TR-052 | MUST | Team versus: two teams, mirrored kitchens side by side on one screen, team colour themes, 3 arenas | M7 | not started | — | — | — |
| TR-053 | MUST | Solo and short-handed play can add bots to reach a chosen team size | M6 | not started | — | — | — |
| TR-054 | MUST | Level select shows stars earned per level, saved on the host device (DATA-002) | M6 | not started | — | — | — |
| TR-055 | MUST | A 60-second playable tutorial on first run teaches move, pick up, act and serve | M5 | not started | — | — | — |
| TR-056 | MUST | A player who joins mid-round enters at the next round, and spectates until then | M5 | not started | — | — | — |
| TR-057 | MUST | Every level and arena fits the whole screen; nothing scrolls | M5 | not started | — | — | — |
| TR-058 | MUST | Mirrored versus kitchens interact; forms chosen on board 3 | M7 | not started | — | — | — |
| TR-060 | MUST | Cooks animated in 8 directions (9 actions incl. throw and extinguish); one shared body, different heads | M5 | not started | — | — | — |
| TR-061 | MUST | Every player identifiable by character head, colour (player or team) and seat number marker | M5 | not started | — | — | — |
| TR-062 | MUST | Game motion follows ../DESIGN.md §3: no bounce or overshoot, ease-out entrances, a pulse to confirm a… | M5 | not started | — | — | — |
| TR-064 | MUST | At least 8 cook characters; each player picks a unique one before a round | M5 | not started | — | — | — |
| TR-063 | SHOULD | Sound effects for every action and one music loop per setting, with separate volume controls on the big screen | M6 | not started | — | — | — |
