# R-07 part 1 — Rabakz sound (RZ-033)

Built under D-050 and D-168: set A, Mallet, reproduced from the supplied artifact's
`voice`, `mallet` and `SETS.mallet` functions. No dependencies or audio files.

- `packages/platform/src/sound.ts`: game-agnostic sound API, structural Web Audio ports,
  master / Effects limiter / Music graph, bounded 0–100 levels and guarded TV local
  storage. Host level getters/setters are available before a gesture. Defaults: Effects 70, Music 55.
- `apps/web/src/host-sound.ts`: one context per TV shell, created on the first key, pointer
  press or click and resumed on gestures. The graph is ready before sound playback; cues
  create only their own oscillators and envelope gains, disconnecting them when finished.
- `games/rabakz/host/sound.ts`: exact Mallet partials, attacks, decays, peaks, seat notes and
  note offsets; `cuesFor(previousView, nextView)` chooses events using public views only.
- The shell passes the active screen its sound API and a history object belonging to the
  session. A fresh-session null baseline produces the initial unlock; subsequent question
  transitions produce unlocks. History survives screen remounts and connection redraws; repeated views produce no cues. Wrong presses
  become audible through their public per-step event; successful answers become
  audible when the reveal exposes them. Each seat event sounds once.
  A winning buzz is heard at the reveal (D-169(3)), followed by right 233 ms after
  the last seat note. Wrong presses play their seat note then wrong 233 ms later.
  Skips and no-winner timeout reveals are silent. Seat notes arriving together are
  staggered 30 ms in seat order (D-169).
- `apps/web/src/host-sound-demo.tsx`: dev-only listening route. Open
  `http://localhost:5690/host/sound` with the web dev server running. Press a cue or a seat
  button; the first gesture enables browser audio. Production has no listening route.

The pure deterministic simulation now retains `wrongPresses: { tick, seats } | null`
for one step, including the final wrong press that clears everyone's picks (RZ-005).
The public-view type derives this field from `publicView`; no separate runtime view
schema exists. Architecture §4 records the view addition and service.
Tests cover a complete solo match and a multiplayer tie sequence, every seat's schedule,
partial envelopes and start/stop times, graph allocations, level defaults/persistence and
blocked storage, and first-gesture context creation/resume/cleanup.

## Part 2 after C-12

Add Effects and Music rows under Resume and Quit in the TV pause panel, using D-168
placement 1. Keyboard Left/Right changes the focused level. The leader can reach the same
controls via pause on their phone. Bind these to `setLevel` and `getLevel`; keep levels on
the TV's device. Music source remains outside this part.

## Close-out

Implementation is ready for integrator review; command results are recorded in
`uat/evidence/R-07-sound/REPORT.md`. No UAT, performance run or audible browser review was
performed in this part, as instructed. No commit was made.

## Requests

Integrator: listen on the dev URL, review the host mounting and public cue behaviour, and
integrate part 2 after C-12. Record shared tracker and decision updates in the integration
lane. Scheduling duration has not been measured in a browser here.

## Round 2 review fixes (D-169)

Wrong-press public events prevent the final unlock from swallowing a seat's sound.
Cue tests cover separate wrong presses, silent skip/timeout, solo and simultaneous wrong timing,
eight tied winner schedules and ended-node disconnection. The effects graph creates
a DynamicsCompressor limiter once with the engine. Cues schedule even while resume
is pending. A rendered Screen regression covers redraw, remount, inactive/active
transitions with shared session history; the host route's active-only sound wiring
is checked. The unreachable undefined snapshot baseline was removed; fresh history
is null. The dev listening page obtains its scheduler through the game registry.

TV gesture audit: `Landing` currently links to `/host`; the host shell creates the
sound service when it mounts, after that navigation, so the landing click/key does
not create or resume its context. The first subsequent TV keydown, pointerdown or
click while the host shell is mounted creates the context and calls resume if
suspended; later gestures retry resume. Phone inputs are not TV gestures. A TV
never touched after the host shell mounts can remain silent. No visible prompt was
added. Integrator: raise this normal-flow limitation through the design gate if a
landing/create-room gesture must unlock audio across navigation.

Round 2 final checks: selected Vitest run passed (61 files, 1,335 tests passed,
one existing skip); build typecheck, scoped ESLint and design lint all passed.
The exact commands and transient failure details are in the evidence report.

## Round 3 (RZ-033; D-168, D-169)

Wrong-press events persist until the next wrong press or question, so multiple simulation
steps between TV renders no longer swallow multiplayer, final-unlock or solo wrong cues.
Same-step seats remain grouped; each seat note is staggered 30 ms, followed by one wrong
233 ms after the last note. Rendered regressions advance three steps between draws and
check once-only playback through redraws and remounts. The shell uses a tested active-only
sound prop helper rather than a source-text assertion.

A fixed post-limiter gain cancels Web Audio's automatic makeup gain using the limiter's
threshold and ratio (zero knee); the graph test checks the compensation and connections.
Suspended contexts queue cues that play together on resume (limiter keeps it safe; low
priority). No audible browser review was performed. Check results are recorded in
`uat/evidence/R-07-sound/REPORT.md`. No commit was made.

Round 3 checks: typecheck, scoped ESLint and design lint passed. Selected Vitest:
1,590 passed, one existing skip, one failure in the existing host keyboard DOM test because
the sandbox denies Chromium's Mach port registration. All sound regressions passed.
Integrator request: rerun the exact selected command where Chromium can launch.

## Round 4 (RZ-033; D-168, D-169)

Replaced the latest-step wrong-press event with deterministic running counts per seat
for the current question, reset when the next question starts. The public view identifies
who pressed wrongly and how many times; it exposes no choices, timing or correct presses
(D-169(5)). `cuesFor` compares count increases, retaining every accepted press across
multiple simulation steps before a draw, including repeated presses by the same seat.
Seat notes remain in seat order, staggered 30 ms, with one wrong 233 ms after the last.
Question changes establish a fresh baseline without a wrong cue (the normal unlock remains).

Regressions cover seats pressing on consecutive steps before one draw, no repeats on
redraw/remount, repeated presses from one seat, question reset, solo wrong and the last
wrong unlocking everyone. The known non-issue remains unchanged: a press on the first
step of a new question drawn in the same frame as the question change is treated as part
of the new-question baseline and does not cue.

Moved `activeScreenSound` to the exported platform sound module. Both the host route
and the rendered game regression import it from `@kaki/platform`; no Rabakz file imports
app code. Updated the architecture's public-view description to match the counts.

Close-out and Requests: verification results are recorded in
`uat/evidence/R-07-sound/REPORT.md`. No commit, merge, UAT or audible review was performed.

Round 4 checks: typecheck, scoped ESLint and design lint passed. Selected Vitest:
1,594 passed, one existing skip, one failure because the sandbox denies Chromium's Mach
port registration in the existing host keyboard DOM test. All sound regressions pass.
Integrator request: rerun the exact selected command where Chromium can launch.
