# Kaki Arcade — Status

What actually works today. Kept honest: if it has not been seen working in UAT, it is not
listed as working. Updated in the same slice as any change (`WORKFLOW.md` step 5).

**Last updated:** 2026-11-16 · **Milestone:** M0 complete. **Build started 2026-11-16 on Randy's go (D-043):** Wave 0 running. Design gate: boards 0, 0B, 1A, 2 and 2B done; 1, 3, 4 and 5 to come.

## Works

- **C-12 (2026-11-18): the TV works from a keyboard.** Landing, lobby, picker, start screen, team
  setup, results and the pause panel all work from the arrow keys, Enter and Esc, with the keys
  shown on screen (D-162, D-165); P or Esc pauses during play. J seats a keyboard player and a game
  pad seats one more (CTRL-009, in progress: no real pad tested yet, held-key movement waits on
  T-07). Checked with 8 phones at 1080p and 720p. Evidence: `uat/evidence/C-12-host-keyboard/round11/`.
- **A-02 (2026-11-18): the cook body.** One shared cook body, rendered in Blender, does all nine
  actions (idle, walk, carry-walk, chop, stir, wash, serve, throw, extinguish) in 8 directions,
  with a cap head, colour masks for cap and apron, and a head and throwing-hand anchor on every
  frame. Checks: no foot slide, head anchor jumps at most 5.81 px, every action visibly moves on
  the composited frames. Tabao Rush art at full size is 5.14 MB of the 8 MB level budget.
  Not yet drawn in a game (T-07). Two art points await Randy (D-167). Evidence:
  `uat/evidence/A-02-cook-body/round6/`.
- **K-09 (2026-11-18): lone options and face-down cards on phones.** A lone option such as Rabakz's
  Skip takes only its own width (at least 89 px) and the answers get the rest (D-160); a large lone
  option such as Peek Poker's Lock in keeps 144 × 144 beside a 4 × 4 grid (D-164); face-down grid
  cells are named "Card N" and a selected one shows a white inset outline that clears 3 : 1 in every
  theme (D-166). Evidence `uat/evidence/K-04-layout-engine/k09-round3/` and
  `uat/evidence/C-16b-private-panel/k09-rabakz/`.

- Repository, requirements, design rules, architecture, build loop and tracking docs.
- `docs/HANDOFF.md`: full context from the planning conversation for the build session.
- `python3 tools/trace_check.py`: 152 requirements tracked (PRD v1.1), check passes.
- The build plan for concurrent agents (`PLAN.md`) and the backlog of 97 issues across 10
  tracks (`backlog/`): written, **awaiting Randy's confirmation**.
- Blender 5.2 LTS runs headlessly on the dev Mac; `tools/blender/sample_stall.py` renders the
  sample stall scene in about ten seconds.

- **Workspace (F-01, merged 2026-11-16):** pnpm workspace with nine empty packages wired in
  their dependency order; strict TypeScript; ESLint; a design lint for off-scale spacing and
  raw colours; Vitest (135 tests, all on the two lint tools); `pnpm verify` passes from a clean
  checkout and was shown to fail on a type error, a lint error, a design-lint finding, a failing
  test, a trace failure and an unregistered package. No game or screen code yet.

- **Protocol (F-02, merged 2026-11-16):** `packages/protocol` defines every pairing, control and
  input message with validators that never throw, role-split signalling decoders, nickname
  rules (12 visible characters) and the input frame with 8 ticks of history. Tested end to end
  against the real input buffer in review, not yet over a real network: no netcode uses it yet.
- **Simulation core (F-03, merged 2026-11-16):** `packages/sim-core` has a seeded random number
  generator, a fixed-timestep loop, the host's input buffer (loss, reordering and the 16-bit
  wrap handled; `discardEdges` for resume, `reset` for a new connection), and snapshot, hash,
  freeze, encode and record-and-replay helpers. 200 tests. No game uses it yet. Known gap: a tap
  made in the last moments of a pause can still land as play restarts.
- **Open Trivia import (R-11, merged 2026-11-16):** 2,342 questions in ten categories, credited
  under CC BY-SA 4.0, screened for all ages by patterns and by three review rounds of reading
  (last sampled fault rate 1.6%). The bank is 2,660 questions with the Singapore pack. Reproducible
  offline from a committed cache. Built by a Claude agent, fixed by Codex.
- **Singapore question pack (R-12, merged 2026-11-16):** 305 original four-option questions in
  six categories, each with a source note. Written and reviewed from memory with no web access:
  **no fact has been checked against a source**, and Randy's spot-check (R-14) is outstanding;
  `uat/evidence/R-12-singapore-pack/questions.md` lists the 17 to check first.
- **Rabakz question bank tooling (R-10, merged 2026-11-16):** `content/rabakz` holds the question
  schema, a validating build that writes one chunk per category, a seeded question selector and
  a stats report. The bank is filled by R-11 and R-12 above; the 60 picture questions (R-13)
  do not exist yet. Nothing reads it yet.
- **Network spike (S-01, in progress):** `spikes/s01-network/` connects up to 8 phones to a host
  page over WebRTC and measures input delay. Run on one Mac with emulated phones only: 8 scripted
  phones p95 27 ms, no loss, host at 60 fps. Not yet tried on real phones, over real Wi-Fi or
  through a relay; one touch-driven emulated phone was over budget (OQ-028). Not reviewed.

- **Asset pipeline (A-01).** `pnpm assets` packs frames into atlases (2048 × 2048 at most, full
  and half size, lossless sprites and lossy backgrounds), writes a manifest with anchors, layers
  and per-round sizes, and fails when a round is over PERF-023 or PERF-024. Proven on synthetic
  frames only: no real art exists yet. Two review rounds.

- **Design tokens and motion helpers (F-06).** `packages/ui` holds every decided colour, size,
  spacing step, type size and motion value, the four themes, and helpers for press, enter and
  exit, stagger, arcs, count-up, crossfade and card turn, with reduced-motion handling.
  `tokens.css` and `specimen.html` are generated and checked for staleness. 5.8 KB compressed.
  Real fonts are not bundled yet (F-06b). One review round plus fixes checked by the integrator.

- **Room state (C-06).** A pure module in `packages/platform` for seats 1 to 8 and their
  colours, nicknames (12 visible characters, unique, filtered), the leader and hand-over, the
  two-minute seat hold, host reload, and joining by phase. No screen or network uses it yet.
  Built by Codex; four review rounds, the last three on the nickname filter.

- **Pairing server (C-01).** `apps/signal`: a Cloudflare Worker and one Durable Object per room.
  Creates rooms with 8-character codes, authenticates the host at the socket upgrade, forwards
  only signalling between a phone and its host, caps and times out silent sockets, throttles
  floods, survives a restart with no ghost players, and expires idle rooms. Runs locally only
  (`pnpm --filter @kaki/signal dev`); **not deployed**, no relay credentials (C-02) and no
  cross-client rate limits were added by C-03 below. Built by Codex; two review rounds against a real local
  server; smoke test of 12 steps run by the integrator.

- **Game interface and conformance kit (F-04).** `packages/platform/src/game`: the `GameModule`
  contract, layout and private-view schemas, phone size limits from the decided button floors,
  the step driver, and a kit of 25 checks with 67 deliberately broken games it catches. Imported
  by games from `@kaki/platform/kit`. An independent reviewer's skeletons of all three games
  pass it. No real game exists yet. Started by a Claude builder, finished by Codex; four review
  rounds.

- **Input buffer follow-ups (F-03b, F-03c).** Two fast taps arriving together both count, a
  delay spike cannot repeat a tap, and a stall never replays old taps late. Two review rounds
  with 16 attack sequences.

- **Peek Poker rules (P-01, P-02).** `games/peek-poker/src/rules`: deal, memorise, swaps,
  secret picks, lock in, random fill, hand evaluator, scoring with the speed bonus, reveal and
  scoreboard phases, solo, joins and leaves. Passes the conformance kit at 1, 4 and 8 players;
  the evaluator agreed with an independent one on 60,000 hands. Rules only: no screen yet.
  Built by Codex; two review rounds.

- **Protocol clean-up (F-02b).** Face buttons are named by position everywhere (wire bits
  unchanged, with a test tying the game-facing table to the protocol), the retired socket
  `create` and `reopen` messages are gone, the host subprotocol helpers are strict, and a silent
  socket gets `opening-timeout`. Protocol version stays 1 until the first deploy (D-070). One
  review round; the pairing server's smoke test was rerun locally by the integrator.

- **Tabao Rush movement (T-01).** `games/tabao-rush/src/rules`: level and cook state, movement
  that follows the stick on the next step, eight-way facing with a steadying hold, wall
  sliding, soft collisions and the station a cook would use. No deadlock in any reviewed case
  (corridor, doorway, dead end, wall-lean, 210,000 random cook-steps). Rules only: how it feels
  cannot be judged until there is a screen, and every constant is provisional. Built by Codex;
  three review rounds.

- **Rabakz rules (R-01).** `games/rabakz/src/rules`: the untimed buzzer race with its 15-step
  tie window, lock-out, skip and idle reveal, scoring with streaks and the doubled final round,
  teams, scoreboard every 5 questions, joins and leaves. Takes questions in the bank's shape
  with picture credits. Passes the conformance kit in four scenarios with skips. Rules only: no
  screen yet. Built by Codex; three review rounds, last fix by the integrator.

- **Tabao Rush items (T-02).** Carrying one thing, endless crates with a floor cap, counters,
  throwing on a 377 ms flight and catching, with the floor item a press would take shown in the
  view. No item lost or duplicated in 586,000 reviewed cook-steps; step time stays flat through
  a whole round of button-mashing. Rules only: no screen yet. Built by Codex; two review rounds.

- **Netcode (C-04).** `packages/netcode`: pairing clients for host and phone, the two WebRTC
  data channels, input sending and receiving into the real input buffer, the control channel,
  link quality, and a connection lifecycle that survives host blips, early joiners and eight
  phones at once. 107 tests, including 45 written by the reviewer against the pairing
  server's real room logic. **Simulated connections only: it has never run in a browser.**
  Built by Codex; three review rounds.

- **Game dev harness (F-05).** `@kaki/platform/harness`: a headless match runner through the
  same path the console will use, scripted controllers as plain data, seeded bots, record and
  replay with checkpoints once a simulated second, text timelines and a command-line `play`
  and `replay`. Each of the three games has a harness test playing whole matches. The bare dev
  page with keyboard controls is F-05b. Built by Codex; two review rounds.

- **Tabao Rush stations (T-03).** Chop, wok, pot, grill, rice, drinks, plating, sink and bin
  as mechanisms; burning with a warning; fire on one kitchen clock with a single extinguisher;
  items that record what was done to them. No item lost or duplicated in 1.17 million reviewed
  cook-steps; a busy-kitchen step stays under a hundredth of a millisecond after warm-up.
  Recipes, plates that hold several things and serving are T-04. Rules only: no screen yet.
  Built by Codex; two review rounds.

- **Session runner (C-10).** `packages/platform/src/session`: runs any game in the host loop,
  routes inputs and taps, sends each phone its layout and private view only when the content
  changes, pause and resume, reconnect, shortage of players, teams fixed for a match, results
  and back to the picker, recordings the dev harness can replay. Whole matches of all three
  games match the harness step for step; privacy holds through reconnects, leader changes and
  mid-match joins. Simulated transport only: no screen and no real network yet. Built by Codex;
  three review rounds, last fix by the integrator.

- **Reconnect (C-05).** `packages/platform/src/reconnect`: a phone that sleeps, reloads or
  drops returns to its seat within two minutes with the same colour, name, score and private
  view; a reloaded host page brings back the room, players, leader, teams and last results and
  returns to the lobby (the running match is lost, OQ-031). Saved data is bounded, validated
  strictly and holds nothing secret. Fake storage and simulated connections only: not yet
  proven on a real phone or browser. Built by Codex; two review rounds, last fix by the
  integrator.

- **Pairing server limits (C-03).** Limits per client and per network on room creation,
  connection attempts, wrong or abandoned joins and silent sockets, with nothing about a client
  written to storage. Honest traffic (eight phones on one address, a school, a long evening)
  is never refused in tests. The 16-step smoke test passes on a real local server, where it
  caught a fault four review rounds had missed. **Not deployed, and not proven on Cloudflare's
  edge:** a staging probe is required first (D-089, OQ-030). Built by Codex; five review
  rounds and three smoke rounds.

- **Tabao Rush recipes (T-04).** The seven dishes as data; plates, bowls and cups that hold
  food; racks, a return counter for dirty containers and washing; laksa, mixing and spreading;
  a serving counter that accepts a correct dish and refuses a wrong one with a specific reason
  without consuming it. Each dish is cooked and served from crates by walking and button
  presses in a scripted test. No food or container lost or duplicated in the reviewed fuzz, no
  soft lock found. Orders, patience and scoring are T-05. Rules only: no screen yet. Built by
  Codex; three review rounds.
- **Tabao Rush levels (T-06).** A level format (grid, spawns for eight cooks, stations with
  facing, racks and their stock, dishes, round length, star base, venue), a validator that
  returns plainly worded problems and never throws, and a loader that validates before it
  builds the starting state. Two **test kitchens**, not final levels: a small kopitiam
  (chicken rice and kopi) and a zi char kitchen with all seven dishes and fires. Rules are
  D-093 and provisional. Twists are refused until they have behaviour, so no level declares
  one. The game itself still starts on the old fixture kitchen; real levels, twists and
  layouts fair at eight cooks are T-11. Nothing drawn. Built by Codex; two review rounds.
- **Host lobby (C-07): the first screen.** `apps/web` (Vite and Preact, D-088) serves `/host`:
  it creates a room on the pairing server and shows the room code, a QR code of the join
  link, eight seats with name, seat colour, connection quality, leader mark and a held seat's
  countdown, and a screen each for creating, restoring, unreachable, expired and taken over
  by another tab. Seen by the integrator in desktop Chromium at 720p, 1080p and 4K against a
  real local pairing server: a room is created, a reload reopens the same room, a room the
  server no longer has shows "This room has expired", and stopping the server while a room is
  open keeps the room on screen and retries at a paced rate. **Not yet seen:** a real TV,
  Safari, Firefox (phones joining and an outage were seen later, in C-08). The readings of
  the chosen board are D-090 and D-092. `/` is a placeholder link. **A fault shipped
  in this slice and was missed by the integrator and the review:** a player who joined after a
  seat's wipe had finished showed as "Seat N" with no name (the committed reduced-motion
  screenshot shows it). The UAT harness exposed it; fixed in C-08. Built by Codex over five fix rounds; three review rounds; the
  integrator's browser checks found two faults the reviews had not (tiny names, an expired
  room looping) and one of the integrator's own evidence claims was wrong and is withdrawn in
  the report.
- **Saving on the TV, and the detail benchmark (C-13 part 1), code only.** A store for scores,
  stars and settings on the TV's browser, safe against corrupt, foreign, oversized and newer
  records, and a benchmark that judges dropped frames (D-111, D-113). Nothing visible yet: the
  settings screen and running the benchmark on the lobby are part 2, and the benchmark has no
  real workload until the game renderer exists (OQ-036), so "auto" means full detail today.
  Tested by unit tests only. Two review rounds.
- **Message for browsers that can't run it (C-14).** A browser missing something the game needs
  sees "This browser can't run Kaki Arcade", the line for its device (computer, or the join
  link on a phone) and what is missing in plain words, instead of a broken page. Browsers too
  old to load the app at all (no modules, a failed early check, code they can't read) get a
  plain version of the same message, and so does a browser with JavaScript off. Seen working
  in Chromium on the development and production builds, at 320 to 1280 px wide; every normal
  page still loads. Not proven: a real old Safari or Android, WebKit and Firefox engines (X-05).
  Built by Codex over four fix rounds; two review rounds. The integrator's browser checks
  found that the round-3 backstop showed the message in a working browser (fixed in round 4).
- **Phone controller shell (K-01), development page only.** `/play?demo=controller` shows the
  landscape controller frame: a one-line header with the seat number in its colour, the name
  (cut with an ellipsis when long) and the link state as icon plus word, an empty play area,
  and "Turn your phone sideways" in portrait. While shown, the page cannot scroll, zoom, select
  text or pull to refresh, and it asks the phone to stay awake, saying "Keep your screen on"
  only if refused. Tested in Chromium phone emulation from 320 to 844 px wide. Not proven: real
  iPhone and Android (S-05); not yet the page a seated player sees (C-16); no stick or buttons
  yet (K-02, K-03).
- **Floating left stick (K-02), development page only.** `/play?demo=controller` shows a
  dashed stick area; the base appears where the thumb lands (kept inside the area, D-116), the
  knob tracks the thumb 1:1 and stretches with deflection, rubber-bands past the edge, and
  eases back and fades on release. A second finger never steals it; hiding the page, losing
  focus, resizing or a cancelled touch release it. Reduced motion drops the stretch and the
  easing. Tested in Chromium phone emulation at 844 and 667 wide. Not proven: real phones
  (K-07); phone frame timing (PERF-012, perf harness); stick and buttons together (K-04).
- **Buttons (K-03), development page only.** `/play?demo=controller&controls=buttons` shows
  L, Start and R along the top, a D-pad, and the shape diamond (cross, circle, square,
  triangle in their fixed colours, white rims). Sizes follow the phone (110 px shape buttons
  at 844 × 390, about 121 at 932 × 430; 89 × 68 for the rest) with at least 13 px between
  controls. A press shows at 0.97 at once and vibrates briefly; the release eases. Several
  buttons can be held at once, the D-pad slides between directions, and a cancelled touch,
  a hidden page or losing focus releases everything. Tested in Chromium phone emulation at
  667, 844 and 932 wide. Not proven: real phones and vibration on hardware (K-07); frame
  timing (PERF-012); the per-game layouts (K-04).
- **Layout engine (K-04), development page only.** `/play?demo=controller&layout=<name>` draws
  only the parts a layout asks for (stick, D-pad, shape buttons, L and R, options, a tappable
  grid with an action, cards, text) and grows them to fill the play area, with 13 px margins and
  gaps falling to 8 and 5 only where needed (D-117, D-118). Face buttons are 110 px at 844 wide and
  above and scale down to 89 on narrower phones (D-122). Labels that do not fit at 34 px step to
  21 px (D-127); disabled controls are an opaque grey with dark ink (D-125); face-down cards show
  the striped back. Changes crossfade without a blank frame. Tested in Chromium phone emulation
  at 667, 844 and 932 wide. Not proven: real phones (K-07); the games' own layouts (R-02, P-03,
  T-08); long action labels and web-font loading (follow-ups in K-05).
- **Rabakz scoreboard and podium (R-05), development page only.** A scoreboard every five
  questions and a final podium, with ties, late joiners and team totals first in team mode, for
  one to eight players at 720p to 4K. Long names end in an ellipsis; every heading and prompt is
  masked with room for its ink, and a browser checker compares measured ink with each mask (480
  screen states, none clipped). Screen transitions held 16.7 ms frames in the performance run.
  Not proven: inside the console (R-02 wires the game), sounds (RZ-033).
- **Rabakz TV screen (R-03), development page only.** The question, four options with letter
  and shape, who has answered, lock-outs and wrong options marked without colour alone, and
  the reveal, at reading size for 720p to 4K with eight players. A correct option pulses once
  in its own colour; between questions with a different layout the block changes by one
  mask; the winner's tick keeps its place after the name. Opened by the integrator in a
  browser across rounds 7 to 9. Not in the console yet (C-10/C-15), not on a TV, no real
  pictures or fonts. Performance run (`pnpm perf -- rabakz-screen`) is diagnostic only:
  median 16.7 ms frames, one unexplained 217 ms frame in the first run that did not repeat.
- **Game picker (C-09).** From the lobby the leader opens a picker on the TV listing all three
  games with name, player range and blurb; games that cannot be played with the players in the
  room say why. The leader's phone moves the focus (Previous, Next), selects, goes back and
  starts; other phones show who is choosing. The chosen tile grows into its start screen with
  the seats along the bottom. A failed game load shows a warning on TV and phone and Start can
  be pressed again; an empty room returns the TV to the lobby with its join code; the leader
  leaving hands the picker to the next leader. Tested with two real phone contexts in Chromium
  (all checks pass) and opened by the integrator. **Not proven:** a TV, real phones, Safari;
  frame time of the tile moves on the TV; a successful Start does nothing yet (C-10). The
  start-screen layout awaits Randy's choice on the design board. Built by Codex over ten fix
  rounds with four reviews; the integrator's browser runs found two one-line faults the unit
  tests could not (the stage grid's columns grew while a tile resized; a mask was paused) and
  one regression (the focus ring hidden at rest), all fixed.
- **Performance harness (F-08).** `pnpm perf` runs every installed game at 1, 4 and 8 players
  with seeded bots and reports step time, allocation and garbage-collection pauses;
  `pnpm perf -- lobby-8 --phones 8` pairs eight real phone contexts in a visible browser and
  records host frame times, long tasks, the display's refresh rate and whether each link is
  direct. Both ran on the dev Mac (exit 0). **No performance budget has been assessed by it:**
  the only screens are the lobby, the join page and the picker, so PERF-001, PERF-010,
  PERF-012 and PERF-030 all read "not assessed". Built by Codex over two fix rounds with two
  reviews; the browser layer failed on its first real start (an import hook rewrote paths
  inside Playwright) and the integrator fixed it. **Not proven:** 1 and 4 phones, headless,
  a production build, a quiet machine, anything on a TV or a real phone.
- **UAT harness (F-07).** `pnpm uat -- <slice>` starts the web app and a local pairing server,
  drives one host and up to eight phone browser contexts, takes settled screenshots and
  transition strips, fails on unexpected browser errors, enforces step and run deadlines and a
  size cap, stops everything it started, and writes a report that claims nothing was looked at.
  Scripts exist for the host lobby (31 steps) and the join page (14 steps, eight phones, a
  ninth refused, host reopen, a 25-second pairing outage) and both pass in Chromium. Its first
  runs found a real lobby fault (a late joiner shown as "Seat N"). Built by Codex over four fix
  rounds with two reviews; Codex cannot run a browser, so the integrator made eight small fixes
  from real runs, and the last fix round was checked by running, not by a third review. The
  integrator's claim that the first strips showed the seat wipe was wrong and is withdrawn in
  the report; the final strips do show it. **Not proven:** headed mode, the thumb helper,
  WebKit and Firefox.
- **Phone join page (C-08).** `/play` on a phone: the room code typed, pasted, or carried by
  the link; a name; then the lobby with the seat number, colour and name, a leader mark,
  "Change name" on its own screen and "Leave". A screen each for a full room, a room not
  found, a closed room, an unreachable room, the host disconnected, a seat taken over by
  another tab, a hold that ended, an expired seat, a game in progress and an out-of-date
  page. `pnpm dev` starts the web app and the local pairing server together. Seen by the
  integrator in desktop Chromium against a real local pairing server with eight emulated
  phones: all eight seated in under half a second each, a ninth told the room is full, a
  duplicate name numbered, a phone reload returning to its seat, the host page closed and
  reopened with all eight back, and the pairing server stopped for 22 seconds with every phone
  still connected and a rename reaching the TV. The last fix round's flows were checked with
  two phones, not eight. **Not seen:** a real phone or QR scan, Safari, Firefox, the on-screen
  keyboard, a screen reader, a player joining mid-game (no game can start). Rulings in D-095.
  Built by Codex over four fix rounds; three review rounds; the integrator's browser checks
  found five faults the unit tests had not (names missing on the TV, an outage dropping every
  phone, wrong lobby wording, a doubled notice, `localhost` refused by the dev pairing server).
- **Tabao Rush orders and scoring (T-05).** A seeded order queue per kitchen with patience and
  a last-quarter warning; serving only against an open order; points by dish, a speed tip and
  a loss for an expired order; a 3 minute 30 second round that ends exactly on time; 0 to 3
  stars; order rate, queue size and star thresholds scaled by crew size, with stars based on
  the average crew over the round so leaving cannot earn them. A full round runs at 1, 2, 4
  and 8 cooks in tests. **Every number is provisional** (D-091): worked out by arithmetic,
  not by play (OQ-032). A cook leaving never removes an order card. Players who join
  mid-round watch and share the score. Rules only: no screen yet. Built by Codex; two review
  rounds, the last must-fix confirmed by the integrator against the reviewer's test.

### Cook art spike (S-02)

- One toy cook is rigged in Blender and rendered at board 1C's size (1.5 tiles to the top of the
  head) in 8 directions, idle and walk, as a shared body plus a separate cap head, with colour
  masks so the cap and apron take each player's colour. 208 frames, 192 × 192 px, 94 s per
  character. Storage decided as lossy WebP q90 with exact colour (D-142, D-144): about 2.8 MB for
  all cook animations of the 8 MB level budget. Evidence: `uat/evidence/S-02-cook-spike/round2/`.
  The other 7 actions came with A-02 (above); A-02 keeps the cook sets lossless for now, so the
  storage choice is put to Randy again with the cook art.

### Private panel on the phone (K-05)

- A game can show each phone a private panel: text, stats, cards, choices and a tappable grid,
  seen only on that phone. It fits every phone size from 667 × 375 up without breaking a word;
  grid labels step down together (D-140); a change crossfades without blur (D-056), a whole-panel
  change fades as one surface, and a card turns face-up in perspective (610 px token). Rapid
  back-to-back changes leave no stray styles. Evidence: `uat/evidence/K-05-private-panel/round7/`.
  Tilt, shake and swipe area (the rest of CTRL-003) do not exist yet.

### Start a game from the picker (C-16)
Start loads the chosen game (Rabakz's question bank only when Rabakz is picked), runs it, shows its
TV screen and sends each phone its controller; pause and quit go back to the picker with the same
players. The results screen names winners and ties at the largest size that fits and falls back to
seat numbers only when a name cannot fit. UAT: `uat/evidence/C-16-start-game/round14/`.

- **Phones show each game's private view and theme (C-16b, 2026-11-18).** The phone draws its own
  private view (Rabakz's score panel, Peek Poker's hand) beside the controls, and takes the game's
  phone theme while a game is playing or paused; console on every other screen. Text on panels stays
  readable in every theme. Evidence `uat/evidence/C-16b-private-panel/round3/`.

## Does not exist yet

- No controller or game screen yet; the picker stops at "Starting…" until C-10 wires the session.

## Design gate

| Board | Status |
|---|---|
| 0 Art finish | Done: route D (Blender) |
| 0B End-goal vision | Published 2026-11-16 for Randy to see before the build starts |
| 1A Modelling approach | Done: chunky toy, scripted, one body with 8 heads (D-037) |
| 1 3D art style | Done: C, matte finish, daylight, camera at 60° (D-044) |
| 2 Visual identity | Done: C Marble table as the general rule (D-042) |
| 2B A theme for each game | Done: R1 Bandung, K1 Green baize, T1 Order chit (D-043) |
| 3 Big-screen layouts | Done: 1B, 2A, 3A, 4B, 5A; versus interactions rotate (D-046) |
| 4 Phone controller | Done: 1A with shape buttons in our colours, 2B, 3A, 4B (D-047, D-048) |
| 5 Motion | Done: 1B, 2A, 3A, 4A (D-051). **Gate closed 2026-11-16.** |

### Render jobs (A-01b, A-01d)
`pnpm assets --render` re-renders a job only when its content changes: each job has an id and a
committed stamp of its script, inputs and arguments, so merges no longer re-render other issues'
art. `--only <id>` renders one job, `--check-stale` lists stale jobs and fails if any are stale,
each job may set `timeoutSeconds`, and an interrupt or timeout kills Blender's whole process group
(checked with a real 5 s limit). Lossy encoding is refused for pages with more than one frame.
Evidence: `uat/evidence/A-01b-render-jobs/`.

### Dishes and ingredients (A-04)
Tabao Rush's ingredients, containers, the seven dishes in each state and their order-card icons
are rendered in Blender (`tools/blender/items.py`) into one atlas (254 × 940, 234,944 B). Served
dishes are built from their parts (kaya toast with kopi or teh in a side cup); checks keep every
portion inside its container and visible. Evidence: `uat/evidence/A-04-dishes/round9`, `round11`,
`round12`. Not yet drawn in a game; polish (rojak heap, chopped turnip and chicken at 1×) is A-10.

### Peek Poker table on the TV (P-04)
A development page (`games/peek-poker/dev/`) draws the TV table for 1 to 8 players: the 16-card
grid and 3 shared cards, the memorise countdown, swaps of two cards or two rows on arcs (one ease,
rows staggered with the upper one lifted, D-155, D-158), seat markers as players lock in (never
what they picked), and the reveal turning every card over with each player's picks marked by
seat colour and number, then the ranked hands list wiping in. Reduced motion shows the end state
with a "Swapped" outline. With 8 players the frame time stays at 16.7 ms median and 18.7 ms worst
(`uat/evidence/P-04-table/perf-8-r5/`). It is not yet loaded by the console (C-10/C-15).

### Playing cards (A-08)
The full Peek Poker deck exists as art: 52 faces, the back and five flip frames, rendered in
Blender from `tools/blender/cards.py`. Ranks are DM Sans Bold (D-150) at one shared height, so the
10 reads like the rest; suits differ by shape and colour and stay distinct in greyscale. One atlas,
915,460 B. Evidence: `uat/evidence/A-08-cards/round4/`. Cards are not yet drawn in a game; flips,
swaps and the reveal at runtime are P-04.

### Team setup (C-11)
For a game with teams, the leader turns Teams on, and the TV shows two sides split by a centre line
(D-143), balanced by seat. Each player taps Red or Blue on their phone; the leader can also move
anyone across. Teams may be uneven but each keeps at least one player (D-149). A chip that changes
team travels on an arc; a refusal shows only on the phone that tapped, and the TV names who was
refused. Team mode and the last split carry over to Play again. Evidence:
`uat/evidence/C-11-team-setup/round4-phones4`, `round4-phones8`, `round5-phones8`. Teams are not
yet shown during play (the games' own issues).

C-11b polished the leader's "Move players" grid (D-152, D-153): two halves headed Red and Blue
across a divider, columns sized by each side, every ordinary name on one line at 21 px or more (a
name too long is truncated, never shrunk), Done, Back and Start in one bottom row, every button at
least 55 px and inside the phone at 667 × 375 with 8 players in any split. A refusal on the
leader's phone takes the heading row for 3 seconds without moving anything, and shows again if
repeated. The Teams toggle is one button named "Teams" with a pressed state (tick, stronger border).
Evidence: `uat/evidence/C-11-team-setup/c11b-r8-phones8` (and the 4-phone run).

### Controller size and start-up check (K-08)
`pnpm verify` fails when the controller page and everything it loads passes 300,000 B gzip
(73,837 B today). `pnpm perf -- controller` builds for production, opens the controller page five
times in headless Chromium slowed 4x and fails when the median time to interactive passes 2 s
(D-148); it measured 221 to 252 ms on the dev Mac. A real phone has not been measured.

## Performance numbers

PERF-020 is assessed in an emulated browser (K-08: start-up median 252 ms of 2,000 ms, controller
73,837 B gzip of 300,000 B); no other budget has been assessed yet. Diagnostics from `pnpm perf` on the dev Mac (Apple M3,
2026-11-17, other jobs running, so rough): simulation step at eight players, 95th percentile
0.008 ms for Tabao Rush and under 0.001 ms for Peek Poker and Rabakz; game-only allocation
per step at eight players about 27 KB (Tabao Rush), 10 KB (Peek Poker), 10 KB (Rabakz); lobby
with eight phones on a 75 Hz display, frame time 95th percentile 14.1 ms, worst frame 120 ms.

| Date | Slice | Players | Frame p95 (laptop) | Frame p95 (TV) | Input p95 (direct) |
|---|---|---|---|---|---|

## Real-device checks

None run yet (`UAT.md` §5).

## Known gaps and risks

- Peek Poker's felt does not fill the phone page at some sizes: at 844 × 390 the page shows the
  console marble with felt only in a strip at the bottom (seen in K-09's peek-pick fixture and in
  main's C-16b round 3 shot 05). The phone theme surface needs to cover the whole page; to be fixed
  with P-03.

- Performance budgets are targets, not measurements, until M2.
- Whether the TCL Q65's own browser can run the game is unknown (REL-005).
- Names are not checked for trademarks (OQ-001).
- Boards 1, 3, 4 and 5 still need Randy's choices; nothing visible is built before them.
