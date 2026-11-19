# T-08 — Tabao Rush phone controller, rounds 3–6

TR-020; CTRL-002, CTRL-004, CTRL-005, CTRL-006, CTRL-008; D-280.

The play layout enables all four controller-kit face buttons: Cross picks/places,
Circle acts (including the wok), Square dashes, Triangle throws. Movement continues
through the existing sampled stick path with eight-way facing, without smoothing.
Circle retains both tap and held-frame station processing. Shake remains T-08b.

Dash was absent from the rules. It now travels one tile with a one-second cooldown
(provisional tuning), on a Square press edge. Twenty short collision-checked
segments reuse walk wall/cook collision handling. Holding Square does not repeat.
The play private view is empty to preserve face-button space; seat, nickname,
colour and connection remain in the standard shell. No game CSS or dependencies were added. Round 5 added a kit placement branch; round 6 moves it into platform.

## Generic parts

The shell Menu provides pause, as accepted in D-288. An own-cook portrait waits
for generic picture support in the private panel.
The standard kit owns sizing, the four-button diamond, surface treatment, press
scale 0.97, direct thumb tracking and reduced motion. No custom golden split was
introduced: the selected play board uses a stick and diamond; the pick layout
retains the existing 1.618:1 split.

## Tests and UAT

New unit coverage checks pick and play declarations, pure placement at 844 × 390,
667 × 375 and 932 × 430, face mapping and rule effects, held extinguisher actions,
dash edges/cooldown, and immediate movement/reversal/release after input-buffer
arrival at the real session boundary.

Exact UAT command (ports web 6240, signal 6241, uat 6242 as supplied by runner):

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- T-08-controller --phones 2 --out round4
```

The slice pairs two phones, passes cook picking, captures all three phone sizes,
drags the stick in an eight-frame strip, observes public TV movement and item
changes from actual phone inputs, picks up and throws cucumber, dashes, taps Act,
and pauses through Menu. It observes publicView only; it never edits game state.
The movement-stall fixture has no actionable processing station, so Act has phone
feedback only there; held effects are covered by unit tests. Browser evidence exists under `uat/evidence/T-08-controller/`; the revised
Act and throw captures require an integrator rerun and inspection.

## Close-out

The four requested checks ran one at a time without load gating. Every pnpm
command used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/tabao-rush packages/controller-kit --exclude '**/*.dom.test.ts' --exclude '**/layout-fixtures.test.ts' --exclude '**/team-polish.test.ts'` — passed: 42 files, 495 tests (288.16 seconds).
- `pnpm exec tsc -b tsconfig.build.json` — passed, including the UAT slice. Emitted files deleted with `pnpm exec tsc -b tsconfig.build.json --clean`.
- `pnpm exec eslint games/tabao-rush uat/slices/T-08-controller.mjs --max-warnings 0` — passed, zero warnings.
- `pnpm run lint:design` — passed, 522 files scanned.

The first run exposed legacy disabled-face assertions and new-test fixture mistakes;
these were corrected. A subsequent run was stopped after a known fixture failure;
the final full scoped run passed. ESLint caught UAT dynamic-import typing and a
test message's optional phase value; corrected and rechecked. TypeScript was rerun
after the UAT edits and cleaned again. No command ran for ten minutes.

No commit, verify, UAT, perf or installation performed. Browser evidence now exists from integration; no new evidence was created in
this round.

## Requests

The integrator runs DOM tests, verify, UAT and controller perf (pnpm perf -- controller).
Inspect every phone still, the TV effects and the stick strip before accepting.

## Round 2 — phone input stall investigation

TR-020. Added `games/tabao-rush/src/phone-input.test.ts` before any production
change. It runs the real phone handler, netcode sender/receiver and host session,
readies two cooks through the picker and sends the kit's `move` vector. The test
fails at the first movement assertion: x remains 1.5 instead of increasing.
It also includes held-input and release assertions for the eventual fix.

Root cause: `apps/web/src/phone.ts:175–180` only forwards scalar action values;
it drops `{ x, y }` stick values, boolean button values and all release events.
It never calls the peer's existing `inputSender.change`. The kit emits the
correct `move` vector, netcode maps the stick to axes 0/1 and repeats held frames,
the session enables those axes on the play layout, and movement reads them.
The earlier controller test bypassed the broken phone handler by feeding the
host buffer directly and used the already-playing fixture.

### Round 2 Requests

The required production fix is in `apps/web/src`, outside both the T-08 lane and
the brief's explicit `packages/*` exception. Requested authorisation to extend
scope to the minimal phone input fix and regression tests. No production fix has
been made while that request is pending. No contracts need be changed for this
investigation. The deliberately failing regression is retained for integration.

### Round 2 checks

- Focused Vitest: expected failure, one test; cook x stays 1.5.
- Full Tabao Rush Vitest: 33 files / 387 tests passed; only the new regression
  failed (34 files / 388 tests total), 232.25 seconds.
- `tsc -b tsconfig.build.json`: passed; `--clean`: passed.
- ESLint of the added test: passed, zero warnings.

Every pnpm command used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; Vitest used
`VITEST_MAX_WORKERS=2` and `--exclude '**/*.dom.test.ts'`. No installs, verify,
UAT, commits or tracker edits.

## Round 2b — host validation blocker

TR-020. Read-only inspection confirms a second boundary beyond the phone's scalar
filter: `apps/web/src/session-links.ts:63` rejects `data.value` unless it is absent,
a string or a number. The protocol action schema (`packages/protocol/src/channel.ts`)
accepts bounded JSON, including objects and booleans, and netcode's `sendPhone`
validates against that schema. However, forwarding vectors or booleans as actions
would still be discarded by the host. Per the round 2b instruction to stop when
validation refuses these values, no production fix or new phone test was made.
The existing failing integration regression is unchanged. The fix remains pending;
the sampled `peer.inputSender.change` path is the existing route for axes and held
button masks, rather than the host's scalar tap-action path.

Controller-kit emits a zero vector on stick up/cancel, delivered by the layout
renderer as `phase: 'change'`; it needs no synthetic release vector in that path.
Layout `kind: 'button'` emits boolean press/release (`true`/`false`); tap targets
emit a single choose event. The stick emits for each accepted pointermove without
throttling. `sendPhone` has no time-based rate limit (only a 16 KiB buffered-amount
guard); the separate sampled input sender enforces `INPUT_MAX_HZ` and repeats held
state. No throttling or batching was changed.

`docs/PERFORMANCE.md` specifies input delay budgets PERF-010 (direct p95 ≤ 50 ms),
PERF-011 (relay p95 ≤ 120 ms) and PERF-012 (local feedback within one frame), plus
tiny messages over the unordered unreliable channel. It supplies no numerical
input-traffic frequency or bytes-per-second budget. No performance compliance is
claimed from this inspection.

### Round 2b checks and Requests

Stopped at the requested validation gate. No Vitest, TypeScript, ESLint, verify,
install, UAT or commit ran in round 2b. Only this slice note changed. Clarify the
brief to permit mapping stick and held controls onto the existing sampled input
sender; scalar tap actions can retain their existing path without contract edits.

## Round 2c — sampled phone input repair

TR-020. `controllerInput` now resolves held controls from the delivered layout.
Stick changes call the peer's existing `inputSender.change` with axes; explicit
stick release sends zero axes (the kit's normal zero-vector change also works).
Layout buttons map through `PAD_BUTTON_BIT` and retain a combined held mask on
press/release, preserving the current stick reading. A new dial starts at neutral.
Scalar tap actions and their ignored releases retain the existing path. No changes
to `session-links.ts`, netcode, contracts, schemas or game production code.

Confirmed the host route: session-links binds authenticated peers to `seat-N`;
createHostInput decodes stick X/Y into axes 0/1; session sampling retrieves the
same player id, masks against the current layout and supplies frames to step.
Tabao Rush's `move` stick enables those axes. Its cross/circle/square/triangle
controls declare face-bottom/right/left/top, matching the simulation's pick/act/
dash/throw bits. The game remains pure. Peek Poker's grid/options, Rabakz's
answer/continue/skip options, and the cook picker's cooks grid/ready options
remain scalar tap actions. Console commands retain their separate action handler.

Added fake-peer phone unit coverage for axes, explicit release, exactly one tap
action with ignored release, and overlapping button presses/releases preserving
axes. The real-phone/netcode/session regression now passes movement, held motion
and zero-vector stopping. Shortened its hold from 20 to 4 steps to stay clear of
the second cook: the original duration caused collision separation to change x
after the stick had already returned to neutral. No game behaviour was changed.

### Round 2c checks

All pnpm commands used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`. Vitest used
`VITEST_MAX_WORKERS=2`, `--exclude '**/*.dom.test.ts'` and a 600-second subprocess
timeout per run; runs were sequential. No run timed out.

| Vitest scope | Result | Duration |
| --- | --- | --- |
| apps/web/src/phone.test.ts + games/tabao-rush/src/phone-input.test.ts | 2 files / 93 tests passed | 0.77 s |
| apps/web | 53 files passed, 2 failed; 543 tests passed, 3 failed | 11.98 s |
| games/tabao-rush | 34 files / 388 tests passed | 310.44 s |
| games/peek-poker | 15 files / 159 tests passed | 22.01 s |
| games/rabakz | 18 files / 332 tests passed | 24.25 s |
| packages/netcode | 4 files / 116 tests passed | 0.60 s |

The apps/web failures are two tests in `layout-fixtures.test.ts` and one in
`team-polish.test.ts`. Chromium cannot launch in this sandbox:
`bootstrap_check_in ... Permission denied (1100)` / `MachPortRendezvousServer`.
These tests were included with exactly the requested exclusion; no extra tests
were excluded. The apps/web phone, session-link and console tests passed.
The first focused run passed the phone tests but exposed the regression's cook
collision described above; after isolating the stick assertion, the focused run
and full Tabao Rush run passed.

After all Vitest runs, `pnpm exec tsc -b tsconfig.build.json` passed and
`pnpm exec tsc -b tsconfig.build.json --clean` passed. ESLint passed on
`apps/web/src/phone.ts`, `apps/web/src/phone.test.ts` and
`games/tabao-rush/src/phone-input.test.ts` with `--max-warnings 0`.

### Round 2c Close-out and Requests

Sampled input repair and requested automated checks complete, subject to the
three browser-launch failures above. Integrator should rerun those browser-backed
apps/web tests in an environment where Chromium can launch. No commits, verify,
installs, UAT, tracker edits or evidence changes in this round. Existing evidence
and earlier slice-note changes were retained.

## Round 3 — review fixes

NET-005, CTRL-005, TR-020. Held buttons are recorded by control id and stick
ownership is retained independently of the latest layout. Releases (including the
kit's zero-vector change) run before the connected/playing/setup guard. Leaving
play, losing a held control from a layout, and every onPeer callback clear both
axes and buttons and send neutral through the sampled sender, including automatic
redials which do not call begin.

The real phone/sender/receiver/session test now lives in
apps/web/src/phone-input.test.ts; games no longer import app code. It covers
pause/release/resume, a replacement peer, Cross removal and cucumber pickup.
The pickup fixture first moves the other cook out of the route using its host
input buffer; the tested cook's movement and Cross travel through the phone.

The play-phase own-cook private note is dropped. Cross uses the permitted shorter
label "Pick up" (it still puts down); no controller-kit label implementation was
changed. The placement test now uses an active playing cook and asserts there are
four buttons, preventing vacuous button assertions on any future watch layout. UAT checks both
dimensions against DESIGN §4.4, plus label scroll/client width and containment.
Still 14 turns south with the cucumber before capture; the throw then faces east
across open floor. The UAT script observes
Circle's held bit entering the real game step and carries that observation into
the public-view probe because this movement fixture has no processing station.
It also checks a held Square cannot repeat and an immediate second press during
a fresh cooldown is ignored. Browser evidence exists from integration; round 4 adjusts the Act and throw
captures for the next integrator run.

### D-288 — final text for the integrator to record

**D-288 · 2026-11-19 · Claude, integrator (T-08 review; delegated by Randy, 2026-11-18)** (T-08; TR-020, NET-005, CTRL-005; amends D-280) — (1) Pause: the controller kit has no Start part, so Tabao Rush pauses from the shell Menu (its 89 × 68 target, D-184). This meets the spec §2 Start row, and D-280's "Start" reads as Menu. (2) Dash: Square, on its press edge, moves the cook 1 tile in the stick's direction, or in its facing when the stick is centred, in 20 collision-checked segments. The cooldown is 60 steps (1 s); holding does not repeat, and a press during the cooldown is ignored. Both values are provisional until the T-17 playtest. (3) Act (circle) is enabled throughout play. (4) Cross reads "Pick up" although it also puts down and takes from a crate, to keep a short one-line label; a label that switches to "Put down" while holding is the alternative. (5) The phone sends the D-pad as taps only; a future game needing held directions must move it to the sampled path. (6) The play-phase own-cook note is dropped so the face buttons reach 103 / 112 / 123 px at 667 / 844 / 932; an own-cook portrait waits for generic picture support in the private panel. (7) The phone clears held stick and buttons and sends neutral when play ends or pauses, the connection drops, team setup opens, a layout no longer has the held control, or a new peer arrives; releases are honoured in any phase. Randy may overrule.

Commit 28a20b5a wrongly cites CTRL-007: its requirement is TR-020 only.
CTRL-007 belongs to T-08b.

### Round 3 Close-out and Requests

The two T-18 host test asset mocks now include the T-09 portraits map.
No trackers, contracts, lockfile, dependencies, commits, verify, installs or UAT
runs were changed/performed. Existing untracked UAT evidence was left intact.
The integrator should run phone-coverage.dom.test.ts, pause-panel.dom.test.ts,
tabao-cook-picker.dom.test.ts, kit-label-performance.dom.test.ts,
layout-fixtures.test.ts and team-polish.test.ts, then the T-08 controller UAT and
inspect all stills and the movement strip. Browser label containment and visual
acceptance remain pending.

### Round 3 check results

All pnpm commands used PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false. Vitest used
VITEST_MAX_WORKERS=2 and all three requested exclusions
(**/*.dom.test.ts, **/layout-fixtures.test.ts, **/team-polish.test.ts).
Runs were sequential, each with a 600-second timeout; none timed out.

| Scope | Result | Duration |
| --- | --- | --- |
| Touched tests (final rerun) | 5 files / 113 tests passed | 2.24 s |
| games/tabao-rush | 35 files / 397 tests passed | 242.60 s |
| apps/web | 54 files / 549 tests passed | 10.60 s |
| packages/controller-kit | 9 files / 108 tests passed | 0.85 s |

The final focused rerun includes the non-vacuous placement assertion and checks
all four equal square faces at 667 × 375: 103.03 px; 844 × 390: 112.20 px;
932 × 430: 123.20 px. These are pure kit placement measurements with the
68 px shell header allowance, not a browser/UAT measurement.

Final tsc -b tsconfig.build.json and its subsequent --clean both passed.
ESLint on every changed TypeScript/UAT path passed with --max-warnings 0.
git diff --check passed. An earlier TypeScript pass caught an excess-property
check in the new-peer test fixture; assigning its peer to a variable fixed the
fixture without changing production types. Earlier focused runs caught fixture
expectations around the initial neutral frame and the other cook blocking the
cucumber route; corrected before the full scoped checks.


## Round 4 — clean re-review should-fixes

NET-005, CTRL-005, TR-020. Added a fresh-sender/receiver redial regression:
the old sender stops without neutral, then Cross on the new peer must not move
the cook. Disconnect coverage asserts neutral at the sender boundary (the old
transport has already stopped); team setup coverage checks neutral through the
real receiver and session. The phone folds held button bits in a loop without
spreading an array on each stick move.

The size loop now retains cook picks in its play state, covering the former
private note's effect on all three phone sizes. UAT takes the Act still while
the pointer is down and faces east across open floor before throwing.

### Round 4 Close-out and Requests

No trackers, contracts, lockfile, commits, verify, installs or UAT changed or ran.
Existing browser evidence remains intact. The integrator should rerun and inspect
the revised Act and throw captures.

### Round 4 checks

All pnpm commands used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`. Vitest
used `VITEST_MAX_WORKERS=2` and excluded `**/*.dom.test.ts`,
`**/layout-fixtures.test.ts` and `**/team-polish.test.ts`. Runs were sequential,
each with a 600-second timeout; none timed out.

| Scope | Result | Duration |
| --- | --- | --- |
| Touched tests (final run) | 3 files / 104 tests passed | 0.93 s |
| apps/web | 54 files / 552 tests passed | 10.02 s |
| games/tabao-rush | 35 files / 397 tests passed | 236.46 s |

`tsc -b tsconfig.build.json` and subsequent `--clean` passed. ESLint on all
changed TypeScript and UAT paths passed with `--max-warnings 0`.
`git diff --check` passed.

The initial focused run exposed a disconnect test fixture issue: reconnect stops
the real sender before publishing disconnect, so a host-buffer assertion cannot
observe that neutral call. The final disconnect test asserts the call at the
sender boundary; the real-sender team-setup and fresh-redial tests pass.

## Round 5 — landscape ring clearance and final-layout sizing

TR-020, CTRL-004, CTRL-005. The kit's stick/four-face packing path keeps a
13 px margin on every side, including each face's border ring. It tries actual
inter-ring gaps of 34 → 21 → 13 px before reducing the preferred face diameter;
the diameter floors remain 110 px at widths ≥ 844 and 89 px below. Other control
combinations retain their existing packer. Previously the generic packer could
fall back to 8 px margins when the diamond was too tall.

The phone observes the play area belonging to its own mounted controls rather
than the first global match. It reads live bounds on mount, ResizeObserver,
window resize and visual viewport resize, deduplicating unchanged measurements.
This avoids using an earlier observer entry or an outgoing controller's board.

Unit coverage sweeps every integer width from 667 to 932 with header/wake-message
height pressure. `phone-controller-resize.dom.test.ts` tests 844 × 390 → 932 × 430,
intermediate landscape sizes and rotation, with a stale play-area node preceding
the mounted controller. It checks engine/board size agreement, all four ring
boxes and the stick's 13 px clearance, and the face diameter floors.
UAT now waits for `data-fits="true"` and two animation frames at each tested size,
then checks every complete face box against the play area with 13 px clearance,
plus stick/header clearance.

### Round 5 Close-out and Requests

No commit, verify, UAT, DOM test, install or tracker edits performed. Existing
untracked evidence retained. The supplied round3/17-phone1-phone-act.jpg was not
present in this checkout; the available round2/03-phone1-phone-932.jpg was inspected.
The integrator should run `apps/web/src/phone-controller-resize.dom.test.ts`,
`apps/web/src/phone-coverage.dom.test.ts`, `apps/web/src/layout-fixtures.test.ts`
and the previously requested controller DOM checks, then rerun T-08 UAT and
inspect the three landscape stills and the held Act capture.

### Round 5 checks

All commands used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`, ran one at a time,
and had a 600-second timeout. No check timed out.

- Full requested Vitest scope (`packages apps/web games`, all three requested
  exclusions, `VITEST_MAX_WORKERS=2`): 211 files passed; 3,495 tests passed,
  one skipped; 506.88 s.
- Final focused kit packing/renderer rerun after the packing edits:
  2 files / 34 tests passed; 0.54 s.
- `pnpm exec tsc -b`: passed; final run 3.16 s. Removed its emitted
  `node_modules/.cache/tsc/root.tsbuildinfo`; no source-adjacent emitted files found.

The first ESLint pass found four assertion-style issues in the new DOM/UAT
code; corrected before the final pass. DOM tests remain unrun as requested.

- Final full requested ESLint scope: passed, zero warnings; 31.00 s.
- `pnpm run lint:design`: passed, 545 files scanned; 0.31 s.
- `git diff --check`: passed.

## Round 6 — shared placement and short play areas

TR-020, CTRL-004, CTRL-005. Platform now owns stick/four-face placement; the kit
re-exports it, so conformance and the phone share the same fit decision. `gap`
returns the actual ring gap used by `data-gap` and `--layout-gap`.

Integrator decision: gaps shrink 34 → 21 → 13 px first, then the preferred
button diameter shrinks to its floor. Edge clearance then shrinks 13 → 8 → 5 px.
Buttons never fall below 110 px from 844 px wide, or 89 px below. Only when
5 px clearance with floor buttons cannot fit does placement report `fits: false`;
the stick must also meet that floor in both dimensions. UAT retains the two-frame
wait and now asserts stick left and bottom clearance as well as top clearance.

### Round 6 Close-out and Requests

No commits, verify, UAT, installs or tracker edits. DOM checks and UAT remain
for the integrator, including `phone-controller-resize.dom.test.ts`.

### Round 6 checks

All pnpm commands used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; checks ran
one at a time with 600-second limits. No check timed out.

- Requested full non-DOM Vitest scope: 215 files passed, one failed; 3,522 tests
  passed, one failed, one skipped (526.45 s). The failure was the existing Tabao
  Rush preferred fractional-diameter assertion. Placement now preserves that
  preferred diameter when it fits, rounding only the constrained diameter.
- Final focused rerun of kit private-panel, platform conformance-private and
  Tabao Rush controller tests: 3 files / 31 tests passed (4.23 s). The full suite
  was not rerun after that correction.
- `pnpm exec tsc -b`: passed. Removed emitted root build-info outside dist;
  no source-adjacent emitted files appeared in git status.
- Requested full ESLint scope: passed, zero warnings.
- `pnpm run lint:design`: passed, 557 files scanned.
- `git diff --check`: passed.

Integrator DOM checks: phone-controller-resize, phone-coverage, pause-panel,
tabao-cook-picker and kit-label-performance `.dom.test.ts` files in apps/web/src;
also the excluded browser-backed layout-fixtures.test.ts and team-polish.test.ts.
