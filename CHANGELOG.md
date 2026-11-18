# Changelog

Newest first. One entry per closed slice, naming the requirement IDs.

## 2026-11-18 — R-07 part 2: Effects and Music levels in the TV pause panel

- RZ-033 (in progress), D-168: the pause panel shows Effects and Music rows between Resume and
  Quit to picker, each with a level, a bar and − and + buttons. Up/Down moves between rows;
  Left/Right, or a game pad's d-pad, steps the focused level by 10 between 0 and 100; a held key
  steps once. Levels are saved on the TV and apply at once.
- Each Effects change plays one neutral C5 Mallet note from `packages/platform` (D-168 voice) at
  the new level; reaching 0 is silent. Music changes and presses at either end play nothing.
- Not yet: music playback, a listen on a real TV, OQ-040.

## 2026-11-18 — P-03: Peek Poker phone pick

- PP-005, PP-020 (in progress until seen on the TV): Watch the TV with seconds while memorising;
  a private face-down 4 × 4 tap grid (no D-pad, D-062(5), D-164), two picks with deselect, and a
  144 × 144 Lock in without a shape (D-171); Locked in, own hand with name and points at the
  reveal, a 13 px note when picks were filled at random, Scores on the TV, Match over.
- No pick reaches another phone or the public view before the reveal (tested at 1, 2 and 8 phones,
  every host send and every received message).
- Controller kit: the play-area felt copies the shell's whole painting box, so the felt is one
  surface on every game's phone; private-panel notes stay at 13 px (D-175).
- Controller cold start 168.7 ms median (budget 2,000).

## 2026-11-18 — A-10: dish art polish

- TR-041, TR-040 (in progress until seen on the TV): rojak is a mixed heap with dark sauce;
  chopped turnip is cream with warm-beige sides (D-173); chicken is five flat fanned slices with
  a skin band; laksa shows a broth rim; cups show their contents. Drop and shift checks keep
  every portion visible in its composition (closest icon pair IoU 0.7457).
- Pipeline: `--refresh-item-metadata` recomputes containment footprints and outline flags from
  the pixels; the items stamp leaves out only those derived fields; `--migrate-items-stamp`
  accepts a committed render without re-rendering when its inputs and outputs are unchanged;
  render and stale checks refuse any turnip colour but cream.
- Sheets (`tools/assets/item_sheet.py`): servings, loose items and icons on both counters at
  1× and 4×, `uat/evidence/A-10-dish-polish/round5`. Items atlas 236,330 B; the level stays at
  5.14 of 8 MB.

## 2026-11-18 — R-07 part 1: Rabakz sounds on the TV

- RZ-033 (in progress): the TV plays D-168's Mallet set: answers open, a buzz-in note per seat,
  right and wrong, timed by D-169. Each wrong press is counted per player for the question, so
  every buzz is heard once however many steps run between frames; two wrong presses in one step
  play their seat notes 30 ms apart and one "wrong" after them.
- A limiter on the Effects bus, with its make-up gain cancelled (×0.6745) so cues stay at the
  D-168 level. Effects and Music levels are read and saved before the first gesture.
- Not yet: the pause-panel level rows (part 2), a listen on a real TV, and OQ-040 (no sound until
  the TV is touched; a game pad does not count).

## 2026-11-18 — C-12: the TV works from a keyboard, plus a keyboard or pad player

- `apps/web/src/host-keyboard.ts`, `host-route.tsx`, `picker-route.tsx`, `style.css`: arrow keys,
  Enter and Esc drive the landing, lobby, picker, start screen, team setup, results and the pause
  panel, with key hints on screen; the picker header follows D-162 with D-165's spacing.
  `local-player.ts`, `gamepad-poll.ts`: J seats a keyboard player; a connected game pad seats one more
  and is polled only while present. PLAT-024 (done), CTRL-009 (in progress) (D-162, D-165).

## 2026-11-18 — A-02: the cook body, nine actions in eight directions

- `tools/blender/cook.py`, `tools/blender/cook_poses.py`: one shared cook body, rigged and posed for
  idle, walk, carry-walk, chop, stir, wash, serve, throw and extinguish in 8 directions, with a
  separate cap head, colour masks and per-frame head and throwing-hand anchors. Render jobs split
  to fit the 300 s render timeout. `tools/assets/pipeline.py`: repeated frames packed once;
  `tools/assets/cook_strips.py`: sheets and a motion check on composited frames. TR-060, NN-4
  (D-154, D-163, D-167).

## 2026-11-18 — K-09: lone options, large Lock in, face-down grid cells

- `packages/platform/src/game/{phone-placement.ts,private-placement.ts,option-metrics.ts}`: a lone
  option (Rabakz's Skip) takes only its own width, at least 89 px, and the space goes to the other
  parts (D-160, the stated exception to CTRL-002's "used parts grow"); a large lone option keeps its
  144 × 144 size beside a grid (D-164). `packages/platform/src/game/layout.ts` and
  `packages/controller-kit`: face-down grid cells named "Card N", with a selected outline in the card
  back's border colour, inset so it clears 3 : 1 in every theme (D-164, D-166). CTRL-002, CTRL-005,
  PP-005 (in progress). Controller start-up 171 ms of 2,000 ms.

## 2026-11-18 — C-16b: phones show the game's private view and theme

- `apps/web/src/phone.ts`, `phone-route.tsx`, `phone-themes.ts`: a phone keeps its own private view
  (newer revisions only; dropped if it fails the check; cleared on lobby, picker, results, seat loss,
  leave and disconnect) and draws it beside the controls; while a game is playing or paused the page
  and controller take that game's phone theme (D-161: Tabao Rush uses its own token block), console
  otherwise. `packages/controller-kit`: every surface drawn on a panel uses `--ka-panel-ink`, so text
  stays readable in every game theme. CTRL-003, PLAT-031 (in progress). Controller page 94,055 B gzip
  of 300,000 (PERF-020); cold start median 175 ms. Evidence `uat/evidence/C-16b-private-panel/round3/`.

## 2026-11-18 — P-04: Peek Poker table on the TV

- `games/peek-poker/host/`: canvas table with grid, shared cards, flips with masks, swaps on arcs
  (rows staggered and lifted, D-155, D-158), lock-in markers, and the reveal with picks marked and
  a ranked hands list; reduced motion keeps every state change. Everything is warmed before
  ready (a 350 ms first-use frame removed). PP-003, PP-004, PP-008, PP-021, PP-031 (in progress:
  console wiring is C-10/C-15). Evidence `uat/evidence/P-04-table/round5/`, `perf-8-r5/`.

## 2026-11-18 — C-11b: team setup polish

- The leader's "Move players" grid: Red and Blue halves with headings and a divider, columns by
  side size, names on one line at 21 px or more, one action row, every target 55 px inside the
  phone at 667 × 375 with 8 players (D-152). A refusal takes the heading row without moving
  anything and shows again when repeated (D-153). The Teams toggle is one button with a pressed
  state. Browser tests check targets against every clipping parent. PLAT-025 (in progress: teams
  during play are the games' issues). Evidence `uat/evidence/C-11-team-setup/c11b-r8-phones8`.

## 2026-11-18 — A-01b, A-01d: render jobs

- `tools/assets/pipeline.py`: render jobs with ids, content stamps instead of file times,
  `--only <id>`, `--check-stale` (non-zero when stale), per-job `timeoutSeconds`, Blender's process
  group killed on timeout or interrupt; lossy encoding only for single-frame pages. Supports NN-4,
  PERF-023, PERF-024. Evidence `uat/evidence/A-01b-render-jobs/`.

## 2026-11-18 — A-04: dishes and ingredients

- `tools/blender/items.py` renders ingredients, containers, the seven dishes in each state and
  order-card icons, with served compositions, containment, visibility and outline-scale checks
  (`bakedOutline`). TR-040; TR-041 in progress (in-game check with track T; polish A-10, D-145).
  Evidence `uat/evidence/A-04-dishes/`.

## 2026-11-18 — A-08: playing cards

- `tools/blender/cards.py` renders 52 faces, the back and five flip frames as a declared render job
  with token colours and pixel checks; ranks in DM Sans Bold with shared heights (D-147, D-150).
  PP-030; PP-031 frames (runtime in P-04). Evidence `uat/evidence/A-08-cards/round4/`.

## 2026-11-18 — C-11: team setup

- `packages/platform/src/teams.ts` and the session guard: balanced split by seat, switches and leader
  moves, each team keeps at least one player, no size cap (D-149). PLAT-025.
- `apps/web/src/team-setup*`: the TV's two sides across a centre line (D-143), team chips on arcs,
  private refusals with an attributed TV line, moved-player notices, Start in the console primary
  (D-151); team mode survives Play again and Continue. Evidence `uat/evidence/C-11-team-setup/`.
  PLAT-025 stays in progress until teams show during play.

## 2026-11-18 — K-08: controller size and start-up check

- `tools/check_budgets.mjs` checks the controller entry and everything it loads in `pnpm verify`
  (73,837 B gzip of 300,000 B). PERF-020.
- `pnpm perf -- controller`: production build on a free port, five headless Chromium loads at CPU
  4x, fails when the median time to interactive passes 2,000 ms; median 252 ms on the dev Mac.
  Runs outside verify (D-148). Evidence `uat/evidence/K-08-controller-budget/first-run/`.

## 2026-11-18 — S-02: cook art spike

- `tools/blender/cook.py`: toy cook rig at 1.5 tiles, idle and walk in 8 directions, body, cap
  head and colour masks, contact shadow, anchors written back after publish; checks for height,
  foot slide, anchor jump, foot lift, mask coverage and spill. Rendered set in
  `assets/src/tabao-rush/cook-spike/`. NN-4, TR-060 (idle and walk).
- Storage decision D-142 corrected by D-144; evidence `uat/evidence/S-02-cook-spike/round2/`.

## 2026-11-18 — K-05: private panel on the phone

- `packages/controller-kit/src/layout-renderer.ts`, `layout.css`: the private block (text, stats,
  cards, choices, grid), fitted by `packages/platform/src/game/private-placement.ts`; crossfades
  per block or across the whole panel, interrupted fades cleaned up; card turn with the new
  card-perspective token in `@kaki/ui` (D-140). CTRL-003 (private panel part).
- Tests: renderer DOM tests, placement tests, private-session delivery; UAT
  `uat/slices/K-05-private-panel.mjs` at four phone sizes with three frame strips.

## 2026-11-18 — C-16: start a game from the picker

- `apps/web/src/`: Start loads the chosen game's module (`session-loading.ts`, before `init`; the
  Rabakz bank in its own chunk), runs it in the session runner (`session-adapter.ts`), shows its TV
  screen and sends phones their controller (`session-links.ts`); pause and quit return to the picker.
- `results.tsx`: the results screen names the winners or the tie; the headline takes the largest
  size whose rendered ink fits (measured from line boxes without changing the page) and falls back
  to "Player N wins!" or "N players share first" only when no named size fits (D-131).
- (PLAT-022, PLAT-023 in progress: real phones and the C-15 end-to-end run remain.)

## 2026-11-17 — R-05: Rabakz scoreboard and podium

- `games/rabakz/host/`: standings (scoreboard every 5 questions, final podium, team totals first
  in team mode, ties and late joiners), `Results.tsx`, screen layout and copy masks with room for
  ink (prompt descenders, header Q tail), and `overflow.ts`, a browser checker that compares
  measured ink with each mask; `tools/perf/rabakz-screen` covers the eight screens.
- (RZ-032 in progress: the screens run on the Rabakz dev page; the console wires them with R-02.)

## 2026-11-17 — K-04: layout engine

- `packages/controller-kit/src`: `layout-renderer.ts` (draws the declared parts, revision guard,
  crossfade on a change of tap meaning, held and disabled feedback), `layout-placement.ts`
  (packs and grows parts, D-117/D-118 spacing fallbacks, `fits` only when nothing overlaps),
  `layout-label.ts` (natural-width measurement and the D-127 34 to 21 px step), `layout.css`
  (D-125 disabled fill, card backs); `packages/ui` `faceFloor` (D-122) and disabled tokens;
  demo fixtures behind `?demo=controller&layout=`.
- (CTRL-002 in progress)

## 2026-11-17 — K-03: D-pad, shape buttons, L, R and Start

- `packages/controller-kit/src`: `buttons.ts` (D-pad, shape diamond from the shared shape
  paths, shoulder and Start buttons; press drawn in the pointer handler, release eases),
  `button-input.ts` (pointer routing, multi-touch, slide between D-pad directions, held
  hit-testing on unscaled geometry, guarded vibration), `button-sizing.ts` (sizes from the
  phone with a play-area fit check, D-051 floors), `buttons.css`; demo behind
  `?controls=buttons`; `tools/uat/thumb.ts` cancels only a touch in progress.
- (CTRL-001, CTRL-005, CTRL-006, PERF-012 in progress)

## 2026-11-17 — K-02: floating left stick

- `packages/controller-kit/src`: `stick-model.ts` (dead zone, normalised vector, rubber-band,
  graded stretch, clamped anchor with the knob under the thumb, D-116), `stick.ts` (pointer
  routing, capture, cancel on pointercancel, lost capture, hide, blur, pagehide and resize),
  `stick.css` (dashed outline in the stick-outline token); `lock.ts` cancels only cancelable
  multi-touch moves; demo on `/play?demo=controller`; `uat/slices/K-02-left-stick.mjs`.
- (CTRL-001, CTRL-005, PERF-012 in progress)

## 2026-11-17 — C-13 part 1: host-device storage and detail benchmark

- `packages/platform/src/storage`: `host-store.ts` (versioned, validated, size-capped records;
  newer records kept), `settings.ts` (detail setting, cache keyed on the user-agent hash,
  screen and idle refresh rate), `benchmark.ts` (dropped-frame verdict under an injected
  workload, idle cadence probe). D-111, D-113, OQ-036.
- (DATA-002, PERF-002 in progress)

## 2026-11-17 — C-14: message for unsupported browsers

- `apps/web/index.html`: ES5 preflight (floor `AbortSignal.timeout`, above the bundle's ES2022
  parse floor), a static message that fills the screen, `<noscript>`; `vite.config.ts`: entry
  loader with error and entry-ran backstops; `apps/web/src/support.ts`,
  `BrowserNotSupported.tsx`: the in-app message with plain feature names; demo names kept out
  of production by the build scanner; `uat/slices/C-14-unsupported-browser.mjs` with a
  `--production` mode.
- (REL-006 in progress)

## 2026-11-17 — K-01: phone controller shell

- `packages/controller-kit`: `ControllerShell`, a reference-counted page lock, a wake-lock helper
  that retries once on touch, the header model; dev demo `/play?demo=controller`;
  `uat/slices/K-01-controller-shell.mjs`. The kit now depends on `preact` 11.2.0 (D-110).
- (CTRL-004, CTRL-008 in progress)

## 2026-11-17 — R-03: Rabakz TV screen

- `games/rabakz/host/` (view-model, Screen, dev page), exported as `"./host"`; success pulse
  in the option's colour and one block mask between questions (D-105, D-106); `uat/perf/
  rabakz-screen.mjs` and `Scenario.hostPage` in `tools/perf`. `games/rabakz` now declares
  `@kaki/ui` and `preact`.
- (RZ-003, RZ-005, RZ-006, RZ-030, RZ-031, RZ-034, NFR-A11Y in progress)

## 2026-11-17 — C-09: game picker

- `packages/platform/src/picker.ts` (pure picker state), the TV picker and start screen in
  `apps/web` (`picker-route.tsx`, `picker-animation.ts`, `picker-content.ts`), leader controls
  and watcher view on the phone, `picker-input` and `picker-state` in `packages/protocol`,
  each game's `meta.ts`, `uat/slices/C-09-game-picker.mjs`. Rulings D-098, D-104, D-107,
  D-108. `docs/ARCHITECTURE.md` §4 and §5 updated.
- (PLAT-020, PLAT-021 in progress; PLAT-006 extended)

## 2026-11-17 — F-08: performance harness; `pnpm perf`

- `tools/perf/` (simulation layer, browser scenario runner, budget evaluator, versioned
  reports), `uat/perf/lobby-8.mjs`, a dev-only timing hook in
  `packages/platform/src/harness/perf-timing.ts` that is absent from production builds.
  Verify keeps the transfer-size budgets and gains a short smoke; browser budgets are checked
  by `pnpm perf` before a slice with a game screen closes (D-100). Run folders are untracked.
  `docs/PERFORMANCE.md` §4 and `docs/UAT.md` rewritten to match.
- (NFR-PERF in progress; no frame-time or input-delay budget assessed yet)

## 2026-11-17 — F-07: UAT harness; `pnpm uat`

- `tools/uat/` (runner, harness, thumb helper), `uat/slices/` for the host lobby and the join
  page, playwright 1.64.0 (D-094). Run folders `uat/evidence/<slice>/auto/` are untracked
  (D-096). `docs/UAT.md` §2 rewritten; the uat-runner agent points at `uat/slices/`.
- (NFR-TEST in progress)

## 2026-11-17 — C-08: phone join page; `pnpm dev`

- `apps/web` phone route, view and demo states at `/play`; `tools/dev.mjs` behind `pnpm dev`
  (web app and local pairing server; `KAKI_HOST` for a LAN address, `KAKI_DEV_KEEP=1` to stop
  the pairing server alone).
- A seated phone ignores room-gone reports and pairing outages while its link is open; phone
  retries run 1 s to 30 s (D-095). The room-code alphabet moves to `@kaki/protocol`; the build
  fails if the pairing server's word filter is bundled.
- Fixes a C-07 fault: a player who joined after a seat's wipe ended showed as "Seat N".
- (PLAT-002, PLAT-003, PLAT-004, PLAT-009, PERF-020, PERF-021 in progress)

## 2026-11-17 — T-06: Tabao Rush level format, validator and loader

- `games/tabao-rush/src/levels/` with two test kitchens; rules in D-093. (TR-050, TR-057 in
  progress)

## 2026-11-17 — C-07: host lobby, the first screen

- `apps/web` (host route, lobby view-model, QR, motion, restore and retry), `tools/check_budgets.mjs`
  counting every deployable file, tokens `--ka-type-233` and `--ka-opacity-ghost`.
- Pairing server: every reply to an allowed origin carries CORS headers; an unknown or expired
  room is marked `X-Kaki-Room: gone`. Netcode: after a room is open the host reconnects to the
  pairing server in place and never closes phone links (D-092).
- (PLAT-001, PLAT-004, PLAT-009, PLAT-010, PERF-022 in progress)

## 2026-11-17 — T-05: Tabao Rush orders, patience, scoring, stars and scaling

- `games/tabao-rush/src/rules/orders.ts`; points and patience per dish in `recipes.ts`; the
  game spec gains the provisional numbers (D-091, OQ-032). (TR-001, TR-004, TR-005, TR-006 in
  progress)

## 2026-11-17 — T-04: Tabao Rush recipes, plating and serving

- `games/tabao-rush/src/rules/recipes.ts` and station changes; rule details added to the game
  spec (D-085, D-087). (TR-003, TR-004, TR-040 in progress; TR-008 advanced)

## 2026-11-17 — C-03: pairing server rate limits

- `apps/signal/src/core/admission.ts`, `core/address.ts`, `admission-object.ts`; smoke test
  extended (D-081, D-083, D-084, D-089; OQ-030). (DATA-005 advanced)

## 2026-11-17 — C-05: reconnect and host reload

- `packages/platform/src/reconnect/` (D-086; OQ-031 open). (PLAT-007, PLAT-009 in progress)

## 2026-11-17 — C-10: session runner

- `packages/platform/src/session/` (D-079, D-082). (PLAT-022, PLAT-023 in progress; PLAT-030,
  PLAT-031, PLAT-033, NET-001 advanced)

## 2026-11-17 — T-03: Tabao Rush stations, timers, burning and fire

- `games/tabao-rush/src/rules/stations.ts` (D-080). (TR-007, TR-008, TR-010, TR-030 in progress)

## 2026-11-16 — F-05: game dev harness

- `packages/platform/src/harness` and `packages/platform/scripts`; shared fixtures moved to
  `packages/platform/src/test-fixtures`; a harness test in each game (D-075).
  (PLAT-030, NFR-TEST in progress)

## 2026-11-16 — C-04: netcode

- `packages/netcode`: pairing clients, WebRTC transport, input sender and receiver, control
  channel, link quality (D-076, D-077). `ARCHITECTURE.md` §5 gains the connection lifecycle.
  (NET-001, NET-002, NET-005, PERF-010 in progress)

## 2026-11-16 — T-02: Tabao Rush items

- `games/tabao-rush/src/rules`: carrying, crates, counters, throwing and catching (D-078).
  Earlier movement tests no longer write evidence during verify.
  (TR-002, TR-009, TR-023 in progress)

## 2026-11-16 — R-01: Rabakz rules

- `games/rabakz/src/rules`: pure rules against the game interface; rule details decided in
  D-071, D-073 and D-074 and written into `docs/games/rabakz.md`.
  (RZ-001, RZ-004, RZ-006 to RZ-009, RZ-012, RZ-014, RZ-016, RZ-026 in progress)

## 2026-11-16 — T-01: Tabao Rush state shape and movement

- `games/tabao-rush/src/rules`: pure movement against the game interface (D-072, D-073).
  (TR-002, TR-020, TR-021, TR-022 in progress)

## 2026-11-16 — F-02b: protocol clean-up

- `packages/protocol`, `apps/signal`: buttons by position, socket `create`/`reopen` removed,
  strict host subprotocol helpers, `opening-timeout` error code. Wire format unchanged (D-070).

## 2026-11-16 — P-01, P-02: Peek Poker rules and hand evaluator

- `games/peek-poker/src/rules`: pure rules against the game interface, with rule details
  decided in D-069 and written into `docs/games/peek-poker.md`.
  (PP-001 to PP-007, PP-009 to PP-013, PP-022 in progress)

## 2026-11-16 — F-03b, F-03c: input buffer follow-ups

- `packages/sim-core`: duplicate edges deferred to the next step, a four-step wait cap with a
  collapse that keeps one press and one release per button (D-068), no new press after a
  silence release until the button is seen up. `ARCHITECTURE.md` §5 updated. (NET-005, PERF-010)

## 2026-11-16 — F-04: game interface and conformance kit

- `packages/platform/src/game`: `GameModule` types, settings, layouts with revisions, private
  views, phone limits, `driveStep`, purity scan and the conformance kit (`@kaki/platform/kit`).
  `ARCHITECTURE.md` §3 rewritten to match; game specs use shape names (D-062).
  (PLAT-025, PLAT-030, PLAT-031, PLAT-032, PLAT-033 in progress)

## 2026-11-16 — C-01: pairing server

- `apps/signal`: Worker, room Durable Object with hibernation, a pure room core, host
  authentication at the upgrade, abuse caps, expiry, and a smoke script. Dev dependencies
  wrangler and workers types (D-061). Rulings D-063, D-065, D-066. `ARCHITECTURE.md` §5 updated.
  (PLAT-001, NET-002, DATA-001, DATA-005 in progress)

## 2026-11-16 — C-06: room state

- `packages/platform/src/room`: pure room reducer (seats, colours, nicknames with a blocked-words
  filter, leader and hand-over, seat hold, restore after a host reload, join policy), a public
  view with no tokens, and 660 tests. Rulings D-060, D-064, D-067.
  (PLAT-003, PLAT-004, PLAT-005, PLAT-006, PLAT-008 in progress)

## 2026-11-16 — R-11: Open Trivia Database import

- 2,342 imported questions across ten categories with licence credit, an all-ages screen and
  text corrections; hard questions added to games, comics and anime. Three review rounds.
  (RZ-021, RZ-023, RZ-024 in progress)

## 2026-11-16 — F-06: design tokens and motion helpers

- `packages/ui`: tokens, four themes, motion helpers, generated `tokens.css` and specimen page.
  Review fixes: per-frame helpers allocate nothing; a press shows at once. Seven contrast and
  type rulings applied (D-056). Started by a Claude builder, finished by Codex.
  (NN-5, NFR-DES, PERF-012 in progress)

## 2026-11-16 — A-01: asset pipeline

- `tools/assets`: atlas packer, manifest and budget check behind `pnpm assets`; verify now packs
  `assets/src` and fails over budget. Built by Codex, two Claude review rounds. Synthetic frames
  only so far. (PERF-023, PERF-024 in progress)

## 2026-11-16 — F-02: protocol

- `packages/protocol`: signalling, control-channel and input messages with validators; input
  frames carry recent button history instead of timed repeats (no added delay; 21 ms thumb to
  simulation step at the 95th percentile in review); nickname rules; data-channel constants.
  Three review rounds. `ARCHITECTURE.md` §5 rewritten to match. (NET-001, NET-005 in progress)

## 2026-11-16 — R-12: Singapore question pack

- 305 original Singapore questions (food, places, history, life, nature, arts and sport), all
  four-option, romanised names only, each with a source note. One independent editorial review;
  facts not yet checked against sources. (RZ-021 and RZ-024 in progress)

## 2026-11-16 — Design gate closed

- Boards 4 (phone controller) and 5 (motion) decided; `DESIGN.md` §4 locked (D-047 to D-051).
  Visible work may begin. (NN-6)

## 2026-11-16 — F-03: simulation core

- `packages/sim-core`: seeded generator with pinned known answers, fixed-timestep driver with a
  catch-up cap, input buffer with edge latching, snapshot/hash/freeze/encode helpers, record and
  replay. Three review rounds; evidence in `uat/evidence/F-03-sim-core/` (no screen involved).
  (PLAT-032 in progress until the games pass the F-04 conformance kit)

## 2026-11-16 — R-10: Rabakz question schema, build and selector

- `content/rabakz`: schema and validator, deterministic build to content-hashed chunks, seeded
  selector for 10, 30 or 50 questions with difficulty mixes and a recently-used list, a public
  question type without the answer, and a stats report against the bank targets. Two review
  rounds; evidence in `uat/evidence/R-10-question-schema/` (no screen involved). (RZ-020 partial,
  RZ-022 partial until the full bank passes)

## 2026-11-16 — S-01: network spike, first half

- `spikes/s01-network/`: host page, phone page, pairing server and an unattended run with 1, 4
  and 8 emulated phones; evidence in `uat/evidence/S-01-network-spike/`. Loopback numbers only;
  the real-phone and relay runs wait for Randy (OQ-028). (NN-3, PERF-010, PERF-011, NET-002,
  NET-003: none met yet)

## 2026-11-16 — F-01: workspace and `pnpm verify`

- pnpm workspace, strict TypeScript with project references, ESLint, Vitest, a workspace guard
  (`tools/check_workspace.mjs`), a design lint (`tools/lint_design.mjs`) and `pnpm verify`.
  Nine stub packages wired in dependency order. Two review rounds; evidence in
  `uat/evidence/F-01-workspace/` (no screen involved). (NN-7, NN-8, NFR-TEST)

## 2026-11-16 — F-09: agent tooling

- `issue-builder` agent, `/issue` integrator command, `tools/agents/worktree.sh` (worktree and
  ports per issue) and `tools/agents/memcheck.sh` (memory check before any concurrent job).
  No screen involved; checked by running both scripts. (NN-8)

## 2026-11-16 — Planning: PRD v1.1, third game, concurrent build plan

- Design board 1A (modelling approach) published and decided: chunky toy cooks, scripted, one
  body with 8 heads. Sources in `docs/design-gate/` and `tools/blender/board1a_*`.
- Rule: every design or graphics choice goes to Randy as an artifact (D-022).
- PRD v1.1: **Rabakz** trivia game (RZ-001 to RZ-034), teams (PLAT-025), throwing and fires
  (TR-009, TR-010), no scrolling (TR-057), interacting versus kitchens (TR-058), 8 unique cook
  characters (TR-064), Peek Poker speed rule and 3/5/7 rounds. 152 requirements tracked.
- `docs/PLAN.md` and `docs/backlog/`: tracks, waves, worktree rules and 97 issues for building
  with concurrent agents. Proposed, awaiting Randy. (NN-6, NN-7, NN-8)

## 2026-11-15 — M0: repository and planning docs

- PRD with 118 tracked requirements, game specs for Tabao Rush and Peek Poker.
- Design rules (golden ratio, motion, no flat backgrounds) and the design gate.
- Architecture, performance budgets, Blender art pipeline.
- The build loop, UAT method, reviewer and UAT agents, `/slice` command.
- Traceability tracker and `tools/trace_check.py`.
- Art finish comparison board and the first Blender sample scene. (NN-6 board 0, NN-7, NN-8)
