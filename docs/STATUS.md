# Kaki Arcade — Status

What actually works today. Kept honest: if it has not been seen working in UAT, it is not
listed as working. Updated in the same slice as any change (`WORKFLOW.md` step 5). One short
bullet per feature; the detail is in `docs/slices/`, `CHANGELOG.md` and `DECISIONS.md`.

**Last updated:** 2026-11-20 · **Milestone:** M0 complete; build started 2026-11-16 on Randy's go
(D-043). Design gate closed 2026-11-16 (table below).

## Works

### Platform and console
- Landing: title, Host a game, the three games, a picture and links to Put this on your TV,
  Privacy and Credits; one scrolling column with 55 px targets on phones; arrow keys, Enter and
  Space work it from a TV keyboard or remote (A-09, X-01).
- Put this on your TV help page (laptop over HDMI first, the TV browser as fallback, how phones
  join), Privacy page in plain words, and Credits with a download of our adapted questions
  (CC BY‑SA 4.0) (X-02, X-03, X-10; D-268).
- Host lobby: room code, QR code, eight seats with colour, name, link quality, leader mark and a
  held seat's countdown; screens for restoring, unreachable, expired and taken-over rooms (C-07;
  D-088, D-090, D-092).
- The whole TV works from the keyboard (arrows, Enter, Esc; P or Esc pauses); J seats a keyboard
  player and a game pad one more (C-12; D-162, D-165).
- The TV seat watches Peek Poker and Rabakz ("Watching", no hand or scores) and plays Tabao Rush; a
  connected phone always leads (C-27; D-230, D-231, D-282).
- Game picker: the leader picks on the phone; games that cannot be played say why; the tile grows
  into a start screen with the game's picture, settings mirrored from the leader's phone and the
  seats (C-09, A-09, R-04; D-174).
- Team setup: Teams on, players tap Red or Blue, the leader can move anyone in a "Move players"
  grid; teams carry over to Play again (C-11, C-11b; D-143, D-149, D-152, D-153).
- Start loads the chosen game behind "Starting…", runs it and sends each phone its controller;
  nothing loads after Start; pause and quit go back to the picker with the same players (C-16, P-06).
- Pause from the keyboard or any phone; the leader resumes or quits from the phone; the pause panel
  sets Effects and Music levels, saved on the TV (C-15, R-07; D-168).
- Sound: Host a game turns the TV's sound on; a TV opened directly says how to turn it on, and
  the first click or key does (C-24; D-229, D-294).
- Final screens show one hand-off line ("The leader continues on their phone" or "Enter:
  Continue"), fading in with the screen; results name winners and ties (C-16, C-18, C-28; D-304).
- Late join: a phone joining a running Rabakz or Peek Poker match is seated with 0 and plays from
  the next question or round; in Rabakz teams it joins the smaller team (C-17, C-21; D-234, D-285).
- Rejoin: a phone gets its seat, name, score and private view back; another browser can claim a
  disconnected seat; a player gone over 3 s pauses play until they return or the leader carries
  on (C-05, C-29; D-298, D-301, D-310).
- A host reload keeps the room, seats, teams, leader, last results and completed scores per game,
  and returns to the lobby; the running match is lost (C-05, C-22; D-226, D-270, OQ-031).
- Removing a player from the TV lobby or the leader's phone; the removed browser cannot rejoin;
  leadership passes on as for a leave (C-23; D-247, D-302).
- The TV keeps scores, bests and settings in a safe store; the detail benchmark picks Full or
  Lower on the first Start of a game with a benchmark scene (C-13 part 1, C-25; D-111, D-113, D-289).
- A browser that cannot run the game sees "This browser can't run Kaki Arcade" with what is
  missing, also with old browsers and JavaScript off (C-14).
- The TV sends anonymous daily counts after results or when hidden, never in play; phones send
  nothing (X-04).
- Underneath: pairing server with per-client limits, protocol, WebRTC netcode, room state,
  session runner, reconnect and the game interface with its conformance kit (C-01, C-03, C-04,
  C-06, C-10, F-02, F-02b, F-04; D-070, D-095).

### Phone controller
- Join page: code typed, pasted or from the link, a name, then the lobby with seat, colour, leader
  mark, Change name and Leave, and a screen for every failure; eight phones seat in under half a
  second each (C-08; D-095).
- A phone that never reaches the TV shows "This phone can't reach the big screen" after 15 s
  with Wi-Fi advice and Try again (K-11; D-250, D-267).
- Controller frame: header with seat, name and link state; no scroll, zoom or pull-to-refresh;
  asks to stay awake; "Turn your phone sideways" in portrait (K-01).
- Floating stick that tracks the thumb 1:1; shape, D-pad, L, R and Start buttons with a 0.97
  press and a short vibration; several held at once (K-02, K-03; D-116).
- Layout engine draws only what a game asks for and fills the play area; lone options take their
  own width; face-down cards show the striped back (K-04, K-09; D-117, D-118, D-122, D-125, D-127,
  D-160, D-164, D-166).
- Private panel per phone (text, stats, cards, choices, grid) that crossfades and turns cards in
  perspective; the phone takes each game's theme in play (K-05, C-16b; D-056, D-140).
- On Android Chrome a landscape phone hides the browser bar after the first touch; a web app
  manifest lets "Add to Home screen" open full screen, the only route on iPhone (K-12; D-297, D-307).

### Peek Poker
- Rules: deal, memorise, swaps, secret picks, lock in, random fill, hand evaluator, speed-bonus
  scoring; ties ranked by round points, then lock-in order, then seat (P-01, P-02, P-11; D-223, D-261).
- Full match in the console at 1, 3 and 8 phones: memorise, swaps on arcs, pick, reveal,
  scoreboard every round and a podium; no pick reaches the TV or another phone early (P-04, P-07;
  D-155, D-158, D-241).
- Shared cards lie face down while memorising and turn up with the grid (P-12; D-296, D-309).
- Phone: "Watch the TV" while memorising, a private face-down 4 × 4 grid to pick two (tick on a
  chosen card), Lock in, then your five cards, hand name and points (P-03, K-10).
- Scoreboard after each round and podium at the end; each phone shows its place and score; solo
  bests ("Best N", "New best · N") kept on the TV (P-05, P-10).
- Setup: Rounds 3/5/7 and Difficulty Rising or Steady (20 s every round, no twist); solo bests kept
  per difficulty (R-04, P-13; D-299, D-308).
- Production build ships every card atlas at both detail levels and starts Peek Poker (P-08).

### Rabakz
- Question bank: 2,342 Open Trivia Database questions (CC BY-SA 4.0) and 305 original Singapore
  questions, 2,660 in all, in a validating, seeded bank (R-10, R-11, R-12).
- Rules: buzzer race with tie window, lock-out, leader skip, 30 s idle reveal, streaks and a
  doubled final round, teams, a scoreboard every five questions (R-01).
- Full match in the console with 1 phone, 8 phones and 8 in teams; a reloaded phone keeps its seat
  and score; no other nickname reaches a phone (R-08).
- TV: question with four lettered, shaped options, who has answered, lock-outs and the reveal;
  the reveal names a streak and its bonus (R-03, R-18).
- A 4 s "Final round" card before the double-points block, a "Double points" chip on each final
  question, and "Final round · Double points" on phones (R-16; D-217, D-290).
- Phones: four shape buttons with the option text; reveal shows Right, Wrong, Skipped or No answer
  with points, streak and total; only "Right" pulses; places labelled above Score, "=2nd" for ties,
  team place in teams (R-02, R-17, R-19; D-221, D-222, D-235, D-312).
- Scoreboard and final podium: one step per place, ties together, team columns with totals in
  teams, "No team" for a teamless late player (R-05, R-20; D-221, D-233, D-295).
- Setup: Questions 10/30/50, Categories with Mixed, Difficulty, Teams; too few questions is
  refused with the count and a fix (R-04; D-174).
- Solo score attack against a best kept on the TV per length; recently seen questions avoided
  until the pool runs out (R-06).
- Sounds on the TV: answers open, buzz-in notes, right and wrong, through a limiter (R-07;
  D-168, D-169).

### Tabao Rush
- Rules: movement, carrying and throwing, stations with burning and fire, seven recipes, orders,
  patience, scoring and stars, and two test kitchens (kopitiam, zi char) (T-01–T-06; D-091, D-093).
- TV renderer: kitchen, stations with shape cues and a count, cooks with seat markers, rejection
  notes, a pulse on a finished station; served dishes built from their layers (T-07, T-07b,
  T-18; D-271–D-276, D-286, D-291).
- Phone: stick on the left, Pick up, Act, Dash and Throw on the right; the cook moves on the next
  step with no smoothing; Dash one tile with a 1 s cooldown (T-08; D-280, D-306).
- Cook picker before each round: eight cooks, taken ones faded with the owner's badge, Ready
  locks, the round starts when all are ready; the TV shows the chosen heads (T-09; D-287).
- First-run tutorial in a practice kitchen (four lessons, each waits for every cook); only the
  leader can skip; it does not return once a round has finished in the room (T-10; D-311).

### Art and assets
- Asset pipeline: `pnpm assets` packs atlases at full and half size with a manifest and fails over
  budget; render jobs re-render only when their stamp changes (A-01, A-01b, A-01d).
- Cooks: one shared body doing nine actions in eight directions, eight distinct heads, colour on
  cap and apron, a walk that rocks and bobs; WebP q90 sheets (S-02, A-02, A-02b, A-02d, A-03;
  D-142, D-144, D-167, D-293).
- Dishes and ingredients in every state, with order-card icons (A-04, A-10; D-173).
- Station art for 12 kinds and a crate with state plaques (A-05; D-278, D-279); steam, sparks,
  fire, spray and shadow effects readable on the light counter (A-07, A-07b).
- Level backgrounds for the kopitiam and zi char kitchens in three looks, with collision maps and
  anchors (A-06; D-281, D-292). Eleven recipe step icons (A-11; D-284).
- Full Peek Poker deck: 52 faces, back and flip frames (A-08; D-150). Shell pictures for the
  landing and each game (A-09).
- Blender 5.2 LTS runs headlessly on the dev Mac.

### Tooling and performance
- `pnpm verify` runs workspace, types, ESLint, design lint, unit tests, budgets and the trace
  check, and fails on each (F-01); `trace_check.py` tracks 152 requirements (PRD v1.1).
- Design tokens and motion helpers in `packages/ui` with reduced-motion handling (F-06).
- Sim core (seeded RNG, fixed step, input buffer, replay) and a headless dev harness with bots
  (F-03, F-03b, F-03c, F-05).
- `pnpm uat` drives a TV and up to eight phones, with Chromium, Chrome or WebKit TVs and Chromium
  or WebKit phones (F-07, X-05; D-212).
- `pnpm perf`: game step at 1, 4 and 8 players (PERF-040 assessed from 10,000+ samples), browser
  scenarios incl. a full scored Peek Poker match, and `pnpm perf -- controller` (F-08, F-10,
  P-09, K-08; D-148, D-277, D-305).
- Each conformance test has its own time limit (4× its slowest run alone); no budget changed
  (C-20; D-259).
- Network spike: 8 emulated phones over WebRTC on one Mac, p95 27 ms, no loss; one touch-driven
  phone was over budget (S-01, in progress; OQ-028).
- Docs, `HANDOFF.md`, `PLAN.md` and the backlog of 97 issues across 10 tracks.

## Does not exist yet

- Rabakz picture questions (R-13); music playback, styles chosen (A-12; D-314); tilt, shake and swipe
  (rest of CTRL-003).
- Team colours and names during Rabakz play (R-15); the wok shake (T-08b); T-10b tutorial polish
  (ring contrast, step-row offset, larger leader hint).
- Tabao Rush: the TV still draws a placeholder floor (T-17), T-07's placeholder cues instead of the
  A-05 sprite and step words instead of the A-11 icons; real levels, twists and layouts fair at
  eight cooks (T-11); the other six levels and the arenas (A-06b).
- No real game has a benchmark scene, so Auto means Full (until T-17); no settings screen for Full
  or Lower (C-13 part 2).
- No save when the page closes mid-match (Rabakz solo, R-06); relay credentials (C-02).

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

## Performance numbers

Latest figure per budget, on the dev Mac (Apple M3). Only PERF-020 has been assessed, in an
emulated browser.

- **PERF-001 frame (16.7 ms p95): not assessed.** Peek Poker full match, 8 phones, production
  Chrome: median 16.7, p95 18.3 (over budget), max 33.3 ms, no long tasks; macOS reported no
  display rate (P-09).
- Diagnostics, development build: Tabao Rush tutorial-to-round p95 18.0 ms, max 18.8
  (T-10); Peek Poker 8 phones p95 18.2 ms (P-12); Rabakz screen 8 phones, headless, p95 16.8 ms,
  max 33.3 (R-20). Tabao Rush production frame time not yet measured.
- **PERF-010 input (50 ms p95):** 32.2 ms at 8 phones, every press shown on the next frame
  (P-13, development build, Chromium).
- **PERF-020 controller start-up (2,000 ms):** 174.4 ms (R-19, production build, headless
  Chromium slowed 4x). Controller page 73,837 B gzip of 300,000 B (K-08).
- **PERF-040 game step (3.34 ms):** not assessed, run under contention (load about 20 on 8 cores):
  p99 Peek Poker 0.0031, Rabakz 0.0048, Tabao Rush 0.0406 ms (F-10).
- **Transfer and decoded size:** deploy shell 684,398 B gzip of 1,500,000 (X-10); Tabao Rush
  kopitiam round 2,643,604 of 8,000,000 B sent and 68,600,688 of 256,000,000 B decoded; cook
  portraits 53,018 of 60,000 B (T-09).
- Allocation per step at eight players about 27 KB (Tabao Rush), 10 KB (Peek Poker and Rabakz)
  (2026-11-17, rough). Reconnect 151.8 ms, host recovery 2,181.6 ms, 8 phones (C-15).

## Real-device checks

None run yet (`UAT.md` §5).

## Known gaps and risks

**Everywhere**
- Real phones (Android and iPhone, incl. home-screen installs and vibration), a real TV and its
  browser at 3 m, a real game pad and remote (OK key), real Wi-Fi and a relay: none tested
  (K-07, S-05, S-03b, X-09).
- PERF-001 never assessed: needs the lid closed and the display or TV at 60 Hz before a
  milestone run (D-277). PERF-040 has not passed on a quiet machine. No Chrome launch run.
- Pairing server and counts not deployed or proven on Cloudflare's edge; a staging probe comes
  first (D-089, X-06, OQ-030).
- Browsers: Playwright WebKit phones never seat locally (D-212); Edge, real Safari, Firefox, old
  Android and TV browsers untested (OQ-051). TCL Q65's browser is unknown (REL-005).
- Performance budgets are targets, not measurements, until M2. Names: X-07's web check flags Tabao Rush and
  Peek Poker (medium risk), register searches by hand still due; Randy decides (OQ-001). Rabakz phones' departures from board 4 still open for Randy (OQ-050).

**Platform and console**
- Sound: a real TV's autoplay block, sound after the TV sleeps and pad-only TVs (one click or key
  needed) are unproven (C-24, X-09). Effects volume needs Randy's ear (D-168).
- Rejoin: the room code during play and the waiting-panel layout await Randy; no console perf run
  (C-29). A private window or cleared data can rejoin after removal (accepted v1 limit, C-23).
- Occupied TV lobby cards use 21 px text, waiting for Randy (OQ-054). A keyboard or pad leader
  cannot change settings (OQ-042). Totals kept across reloads are shown on no screen (OQ-044).
- Privacy limiter wording (OQ-030) and how the adapted bank is offered (OQ-045) are open; serving
  the questions file on production hosting is unproven (X-06).
- The Results Play again / Continue still carries a cross, and the leader's third Results button is
  clipped at 844 × 390 (OQ-056, C-30).
- A tap made just before a pause ends can still land as play restarts (F-03).

**Peek Poker**
- When five or more players pick one card, markers cover the lower half of its face (OQ-043).
  Late join and an all-locked early end are not covered by UAT (P-07).

**Rabakz**
- Singapore pack facts unchecked against any source; Randy's spot-check is outstanding (R-12,
  R-14). The reveal's chosen option is unlabelled on the phone (R-19).
- Reduced motion, shared title size, the teamless player, 30- and 50-question cards, streak ties
  and teams: unit or DOM tests only (R-16, R-18, R-19). Question-to-results crossfade cuts at about
  400 ms (R-05).

**Tabao Rush**
- Every movement, dash and scoring number is provisional, set by arithmetic not play (D-091,
  D-093, OQ-032). T-06 notes the game still starts on the old fixture kitchen.
- A held dish reads poorly; no timed eight-cook tutorial; versus team colours in play and a still
  of the badge fade missing (T-09, T-10, T-18). T-07 review 8's minor should-fixes not all closed.

**Art**
- No 3 m TV check of stations, effects, step icons, dishes (chicken look, cup contents) or the
  level looks; Randy has not chosen the level look; Golden differs only by a counter band (A-06).
- The knife hides behind the cap facing SE and the E-facing extinguisher is mostly hidden (A-02b);
  two cook art points await Randy (D-167). Makcik's face and uncle's band keep cut edges (A-03).
- Spray rotation and nozzle fit untested; some grain in steam and spray (A-07b). Step icons on
  light cards only; spread is the weakest (A-11). Baked plates on racks (OQ-055).
