# P-09 — assessed Peek Poker match harness

Requirements: PERF-001, PERF-010, PERF-012, PP-031.

## Integrator decision

Round 1b explicitly resolves the measurement-window blocker: for Peek Poker, the
**whole five-round match**, from first-round memorise entry to the podium, is the
marked round for PERF-001. This is a measurement window, not a rules change. The
integrator will record its D-number at merge. D-227 requires separate production
frame and development input runs. No timers, rules, thresholds or shared documents
were changed.

## Changes

- `uat/perf/peek-poker-console.mjs`: real lobby/picker/Start, five memorise/pick/reveal/
  scoreboard cycles and final podium, bracketed with capture markers. Four grid
  presses per phone per round (select, deselect, select, second card) supply 160
  measured presses at eight phones. Phones then lock in. Each pick phase stays open
  for at least 15 seconds, within the existing 20-second timer; the match window is
  expected to exceed 180 seconds. Runtime evidence, not this estimate, determines
  sample adequacy. Phones remain open for the harness's direct ICE-path check.
- `tools/perf/action-timing.ts` and its unit test: generic serial, harness-armed action
  correlation, trusted phone pointerdown, actual next-frame pressed visual check,
  and completion only after simulation application. Existing Capture calibration,
  event schema, correlation and reporting are reused. No sequence is added to the
  gameplay protocol. Only one measured action is outstanding at a time; player,
  control and value must match. Missing application times out rather than allowing
  subsequent IDs to drift.
- `apps/web/src/session-adapter.ts`: necessary development-only test hooks because
  existing routes had no receipt or simulation-apply timing point. Receipt is read
  at the authenticated session transport boundary. Application is read after the
  real game step consumes its accepted actions, not from a DOM update or receipt.
  The callback is installed only by the harness; production removes these branches.
- `tools/perf/browser.ts` and its unit test: expose capture build type; production
  input/feedback assessments explicitly say frames only and cannot block Run A for
  missing development hooks. Development coverage/threshold rules remain in force.
- Harness/scenario READMEs document the integration and two-run approach.

## Exact commands for the integrator

Run sequentially on a quiet machine. Run A (headed production Chrome, frames only):

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm perf -- peek-poker-console --phones 8 --build production --host-browser chrome --slice P-09-perf-match --out perf-production-a
```

Run B (headed development Chrome, input and feedback):

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm perf -- peek-poker-console --phones 8 --host-browser chrome --slice P-09-perf-match --out perf-development-b
```

Reports are `uat/evidence/P-09-perf-match/<out>/perf.json` and `PERF.md`.
Run A assesses PERF-001 only with at least 180 s and 600 visible host frames, eight
phones, production build and headed Chrome. Per D-249/D-277, macOS must report every
online display at the same rate within 59.94–60.06 Hz, unchanged at round end. An
unknown built-in-panel rate, unsupported OS, hidden host or changed/mismatched rates
prevents assessment. The rAF estimate cannot satisfy this guard. A Chromium pass is
slice evidence only. Budgets remain p95 ≤16.7 ms and max ≤50 ms.

Run B intentionally leaves PERF-001 unassessed. PERF-010 needs at least 100 complete
press/receipt/apply observations, valid calibrated timestamps and verified direct ICE
paths for all phones; p95 must be ≤50 ms. PERF-012 needs at least 100 touch/feedback
pairs with complete feedback coverage; every observed feedback must occur within one
phone presentation frame, independently of transport. Lock presses are exercised but
not measured; all 160 grid presses are measured. A missing pressed visual prevents a
feedback pass. All contexts are local: results do not prove real phone hardware or
Wi-Fi latency. Detected contention at either endpoint revokes passes and exits nonzero;
a quiet machine is still the integrator's responsibility.

## Checks

Only the three authorised checks were run, sequentially; each completed within ten
minutes. No install, verify, UAT, perf, commit or push was run.

- `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/perf uat --exclude '**/*.dom.test.ts' --exclude '**/layout-fixtures.test.ts' --exclude '**/team-polish.test.ts'`: pass, 15 files / 138 tests (3.75 s).
- `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm exec tsc -b`: pass. The root test config uses `noEmit: true`; no emitted source files required removal.
- `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm exec eslint tools/perf uat/perf --max-warnings 0`: pass, zero warnings.

Initial checks identified one test that still assumed production timing assessment,
TypeScript annotations/import spelling and four lint issues; these were corrected
before the final passes.

## Close-out

Implementation is ready for integrator review and the two assessed runs. No measured
performance acceptance is claimed here. No evidence run was fabricated.

## Requests

Integrator: run A and B, inspect the reports and any captured evidence, record the
measurement-window decision with a D-number, and update shared trackers at merge.
Chrome availability, display guard, runtime sample coverage, contention and actual
budget results remain runtime assessment conditions.

## Round 2 diagnosis (2026-11-19)

Inspected all nine production failure PNGs, production `run.json`,
`/tmp/claude-502-p09-perfa.log`, and development `perf.json` / `PERF.md`.
The host really shows round 2, Picking for seats 1–7 and Picked for seat 8;
phones 1–7 have cells 0/1 selected, while phone 8 has Locked in and the
private reveal-wait message. This is not solely a stale private phone panel.

**Cause remains unconfirmed; neither a script-only diagnosis nor a product fix
is claimed.** Production round 1's pick/reveal step took 17,343 ms and round 1's
scoreboard step completed before the next memorise/pick wait. Thus a round-1
Playwright lock click waiting until round 2 is inconsistent with the saved step
timings. The log contains no phone/action trace to explain seat 8's lock.
`deal` clears picks/locks, game revisions advance through phase transitions,
`driveStep` checks action revisions, and session-links checks both current wire
layout and private-view revisions. No production-only state branch was found in
these paths. Development uses a different grid input mechanism (held pointer via
`actionTiming`, versus Playwright `click` in production); a development pass is
therefore insufficient to exclude an input/automation interaction.

Changes:

- `games/peek-poker/src/rules/game.test.ts`: eight-player regression coverage for
  clearing all round-one locks, rejecting a delayed round-one lock in round two,
  and accepting a current round-two lock. This passes existing product code;
  it does not reproduce the production failure.
- `uat/perf/peek-poker-console.mjs`: observe every phone's memorise Watch the TV /
  Seconds view after the host's numbered round heading, then require its fresh,
  unselected grid before pressing. Bound lock clicks to two seconds and wait for
  that phone's Locked in (or its own Points reveal, since the last lock immediately
  reveals). These are harness synchronisation safeguards, not a proven root fix.

Run B: 13,011 frames, p95 18.2 ms; raw.slowFrames provides host-clock start times.
150 ms at 51,049.8 ms falls inside Round 1 scoreboard (44,993.9–51,958.5 ms).
166.5 ms at 224,416.1 ms falls inside Final podium (over)
(220,384.9–227,089.6 ms), before that step calls roundEnd. No long-task entries
were recorded; the data identifies steps, not the cause of either frame.
PERF-001 remains unassessed because this was a development build.

Checks, sequential and each under ten minutes (all pnpm commands prefixed with
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false):

- Requested Vitest command: pass, 126 files; 1,869 passed, one skipped; 46.44 s.
- `pnpm exec tsc -b`: pass; no emitted files outside dist appeared.
- `pnpm exec eslint uat/perf tools/perf games/peek-poker --max-warnings 0`: pass,
  zero warnings.

### Close-out for round 2

No product code changed. No install, verify, UAT, perf, commit or push was run.
The production failure is still open: these unit checks do not establish that
harness synchronisation resolves it.

### Requests for round 2

Integrator: review safeguards and rerun production with per-phone grid/lock action
tracing if the failure persists. Retain round, phone, layout revision and host lock
state around each input so the first unexpected transition can be attributed.

## Round 3 — review 1 response

PERF-001, PERF-010, PERF-012, PP-031; controller coverage under CTRL-002/003.

- `apps/web/src/session-adapter.peek-poker.test.ts` uses the real platform
  `createSession`, eight seats and the existing fake transport. Seat 8 locks last
  in both rounds and reveals immediately. In round 2 it replays every wire layout
  revision sent to seat 8, checking picks and lock state after each tap; only the
  round-2 grid revision may select a cell. No game-specific platform code added.
- `packages/controller-kit/src/layout-renderer.test.ts` exercises the actual Target
  event binding and single-option selection ghost through pointerdown, pointerup
  and click. `apps/web/src/session-adapter.controller-lock-swap.dom.test.ts` adds a browser counterpart with a real mouse
  tap, ghost events and a subsequent replacement layout (integrator must run it).
- `apps/web/src/session-adapter.ts` extends the existing opt-in DEV hook with the
  wire/game revision mapping, and observes only actions admitted to the game step.
  It preserves `assignTeam` and `activeGame = loaded.game`. The harness records
  every accepted action, including unarmed lock presses, with step, round, player,
  control/value, wire revision and game revision. This trace is development-only;
  a production run cannot carry it. It is not evidence explaining the earlier
  production failure.
- `tools/perf/action-timing.ts` installs the accepted-action collector and checks
  the full pressed matrix against `pressScale(true)`, rejecting release scale(1).
  Its tests cover production opt-out, unarmed accepted actions and pressed matrices.
- `tools/perf/browser.ts` names the current step for the collector and reports
  touch-to-feedback milliseconds plus “pressed visual present at the next frame,
  N of N”. `tools/perf/timing.ts` and its test cover the elapsed feedback time.
- `uat/perf/peek-poker-console.mjs` writes `actions.json` in the run directory,
  including on scenario failure, and ends the window after 130 podium frames.
- `tools/check_budgets.mjs` rejects any deployed JavaScript chunk containing
  `__kakiActionTiming`; its unit test checks a nested lazy chunk and clean output.

### Close-out and Requests for round 3

Check results and regression outcomes are recorded below after execution. No perf,
UAT, verify, install, commit, push, tracker or decision edits are part of this turn.
Integrator: run the DOM regression and merged-tree perf measurements. The earlier
production early-lock failure remains unexplained unless runtime tracing attributes
it; passing boundary regressions alone cannot establish its cause.

Regression outcomes: **no bug reproduced in 3(a) or 3(b)**. The session test passes
without a platform/game fix: historical wire revisions leave seat 8 unpicked and
unlocked, the current round-2 grid revision selects, and seat 8's final locks reveal
immediately in both rounds. The controller unit test passes without a generic kit
fix: one choose output at revision 1, zero additional outputs on ghost/live
pointerup or click. Browser confirmation remains pending the integrator's DOM run.
`apps/web/src/session-adapter.test.ts` additionally verifies that trace metadata
maps wire 0/1 to game revisions 7/8 and excludes an intervening stale tap.

Checks (sequential, each capped at 600 seconds; every pnpm invocation prefixed with
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`):

- Requested Vitest suite: pass, 178 files; 3,026 passed, one skipped. DOM tests,
  layout-fixtures and team-polish excluded exactly as requested.
- `pnpm exec tsc -b`: pass; no emitted files outside dist folders.
- Requested ESLint scope with `--max-warnings 0`: pass, no warnings. Earlier lint
  attempts identified test typing/import placement and regex-style issues, fixed
  before the final passing run.
- `pnpm run lint:design`: pass, 544 files scanned.

Integrator DOM checks (not run here):
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/session-adapter.controller-lock-swap.dom.test.ts apps/web/src/PeekPoker.dom.test.ts apps/web/src/host-peek-poker.dom.test.ts`.
The new DOM regression is required to establish real-browser pointer/click and
ghost behavior; the existing Peek Poker DOM tests provide adjacent coverage.
Production bundle exclusion is implemented/tested as a budget guard; no new
production build or perf evidence was produced in this turn.
