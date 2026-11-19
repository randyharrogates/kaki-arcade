# P-12 — Shared cards covered until the grid turns over

## Goal and acceptance

PP-004 (D-296), PP-020 and PP-031: shared cards stay covered throughout
memorise, then turn face up as the grid turns face down. They remain public
through swaps, pick, reveal and scoreboard. No shared faces reach public or
private views early. Keep step pure and deterministic, the layout fixed and
the existing “Shared cards” label. Reduced motion switches directly.

## Changes

`src/rules/views.ts` publishes null shared faces, their count and a face-down
flag during memorise (including pause). The secret declarations and scrambling
include these hidden faces. Private views already gate hands on reveal; tests
exercise stale hands, waiting players and mid-match admission too.

The host model makes three backs from the count. The canvas reveals shared
cards alongside the grid hide, using the same atlas flip frames, token duration,
easing, face mask and edge-on face change. Reduced motion paints faces immediately.
The drawing key includes the new public fields. DOM slot flags identify the
covered state without carrying faces. No layout, label or styling changes.

The seeded dev fixtures derive views from the rules, so they inherit the new
visibility without duplicate fixture data. P-04 checks covered DOM slots and
widens the flip strip to include shared cards; P-06 checks covered slots on
start. P-07 obtains shared faces after memorise, preserves the independent hand
oracle and checks every snapshot against phase-dependent shared visibility.

## UAT script

`uat/slices/P-12-shared-cards.mjs` uses three real phones and a 1920 × 1080 TV,
with the existing read-only public observation seam. It checks the memorise
public payload, covered TV slots, empty shared DOM/hand rows and no phone card
faces. It captures normal memorise, a full-table flip strip, just-after-flip
and pick stills, then reduced-motion memorise and pick in the next round.
Public pick snapshots must have grid backs and all three shared faces.

Integrator: run P-12 with `--phones 3`, then inspect every still and strip.
Re-run affected P-04, P-06 and P-07 UAT. No UAT was run by this implementation.

## Out of scope

Trackers, requirements, decisions, dependencies, performance runs, publishing
and commits. No new hint copy.

## Close-out

Every pnpm invocation used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`.
Checks ran one at a time with a ten-minute limit; none reached the limit.

| Check | Result |
|---|---|
| Requested broad Vitest, initial | 155 files passed, one failed; 2,721 tests passed, one skipped. The failure was the old empty-secret assertion, since shared faces are now secrets in memorise; corrected. |
| Requested broad Vitest, final | Passed: 156 files, 2,722 tests; one skipped. |
| `pnpm exec tsc -b` | Passed after adding the new UAT phones array annotation; final recheck passed. Root test config uses noEmit; no adjacent emitted files appeared. |
| Requested ESLint | Passed after correcting new test assertions and UAT view annotations; zero warnings. |
| `pnpm run lint:design` | Passed, 543 files scanned. |

UAT and browser DOM tests are reserved for the integrator under the brief. No verify, UAT, perf,
install or commit was performed.

## Requests

Integrator execution and visual review of UAT and the browser DOM tests:
`apps/web/src/PeekPoker.dom.test.ts`, `host-peek-poker.dom.test.ts`,
`poker-results.dom.test.ts` and `phone-coverage.dom.test.ts`.
No copy question raised: the existing “Shared cards” label is retained.

## Round 2

PP-004: phone layout snapshots waited only for the incoming surface animation's
`finished` promise. A background headed phone could retain that snapshot, including
round-one card faces. Private-panel snapshots also waited only for animation
completion, and a later screen could copy those unfinished fades.

Controller-kit now removes layout and private-panel exits after the incoming
crossfade duration and delay plus one frame, even when animations stay paused.
Cleanup cancels the incoming fades so the current screen paints fully. A new
layout or private view clears the previous layout exit before capture; private
exits are cleared before the next snapshot, so interrupted screens cannot stack.

The phone DOM regression pauses every animation, renders round-one reveal and
scoreboard, then round-two memorise, and checks that the fallback leaves no card
faces or ghosts and exactly one visible layout. The UAT script foregrounds each
phone and waits for running animations before retaining the exact zero-faces
assertion. It also saves a round-two memorise still for each phone.

Integrator: run `apps/web/src/phone-coverage.dom.test.ts`, including the new
“PP-004 removes round-one phone faces after stalled fades into round-two memorise”
test, then P-12 UAT with three phones and inspect the stills. Browser DOM tests
and UAT were not run in this round. No verify, install or commit was performed.

Round 2 checks ran one at a time, each within ten minutes, with
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`:

| Check | Result |
|---|---|
| Requested broad Vitest (DOM and named fixture exclusions) | Passed: 210 files; 3,481 passed, one skipped; 409.72 seconds. |
| `pnpm exec tsc -b` | Passed; no new emitted files outside dist folders. |
| Requested ESLint | Initially found redundant timer number conversions and untyped fixture calls; corrected. Final run passed with zero warnings. |
| `pnpm run lint:design` | Passed; 543 files scanned. |

The supplied round-one failure screenshots are absent from this worktree at the
stated paths, so they could not be inspected here. Cause analysis is based on
the controller cleanup code and the supplied failure description.

## Round 3

PP-004: case (a). The scoreboard private view contains only Place and Score,
not the hand. On reveal → scoreboard, both the private-panel effect and the
full-layout effect created an outgoing reveal snapshot, giving ten faces.
The private-panel effect now defers to a pending full-layout snapshot, so only
one outgoing copy is rendered. A unit regression covers simultaneous changes;
the DOM regression asserts at most one outgoing layer, no live scoreboard
faces, and zero faces/ghosts after round-two memorise and the fallback.

Browser tests were not run, as instructed. No verify, UAT, install or commit
was performed. Round 3 check results follow.

All four checks ran sequentially, each within ten minutes, with
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`:

| Check | Result |
|---|---|
| Requested broad Vitest with exclusions | Passed: 210 files; 3,482 passed, one skipped; 464.96 seconds. |
| `pnpm exec tsc -b` | Passed; no new emitted files outside dist folders. |
| Requested ESLint | Passed with zero warnings. |
| `pnpm run lint:design` | Passed; 543 files scanned. |

## Round 4

PP-004 / CTRL-003: private-view capture now finishes only private fades, leaving
an ongoing full-layout crossfade intact. Fake-element unit regressions use
running animation timelines, change the private view 20 ms after the layout,
and retain the outgoing layout at 200 ms before removing it after completion.
Both layout and private fallbacks now inspect timeline progress: a moving,
uncompleted timeline reschedules for the remaining duration plus one frame;
a stalled timeline is cleaned up. Tests cover running, late-start and stalled
animations for both kinds of fade.

PP-031 / D-296: grid and shared cards use one atlas-turn and face-mask helper.
The existing 6 px lift is preserved as `cardLift.turnY` in UI motion tokens,
with a D-296 comment. P-12 samples the fake clock at 30 ms intervals across
0–390 ms, split into two strips because the harness allows at most twelve
frames per strip. Reduced-motion pick is captured on the first phase-changing
frame, without the previous 400 ms settling wait. Phase detection advances the
clock in 1 ms steps to avoid skipping past that first frame.

PP-020: P-07 permits room-players only on leader seat 1, requires an array,
integer seats 1–8 and string names, and keeps the exact key checks. The
memorise grid assertion no longer reads stale shared cards from the last round.

Close-out: no verify, UAT, perf, install or commit was performed. Browser DOM
tests remain for the integrator. Every pnpm invocation uses
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; requested checks run sequentially
with a ten-minute timeout each. The focused controller regression run passed
(32 tests). All requested checks completed within their ten-minute limits:

| Check | Result |
|---|---|
| Requested broad Vitest with exclusions and two workers | Passed: 215 files; 3,514 passed, one skipped; 424.84 seconds. |
| `pnpm exec tsc -b` | Passed; no new emitted files outside dist folders. |
| Requested ESLint | Passed with zero warnings. |
| `pnpm run lint:design` | Passed; 555 files scanned. |

Requests: run `apps/web/src/PeekPoker.dom.test.ts`,
`apps/web/src/host-peek-poker.dom.test.ts`,
`apps/web/src/poker-results.dom.test.ts` and
`apps/web/src/phone-coverage.dom.test.ts`, then the affected UAT and perf runs
identified in the review, with visual inspection by the integrator.
