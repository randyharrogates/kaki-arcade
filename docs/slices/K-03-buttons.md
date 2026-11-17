# K-03 — Controller buttons, round 5

Reusable D-pad, shape diamond, L, R and Start. Requirement row: CTRL-001, CTRL-005,
CTRL-006, PERF-012. K-04 owns game wiring; K-02 owns the stick. This demo renders a
D-pad at `/play?demo=controller&controls=buttons`. The integrator merged K-02
from main; `/play?demo=controller` now defaults to the stick.

## Round 2 changes

- Kit buttons reset inherited minimum dimensions and own their border-box width and
  height. The demo supplies controlSizes(playArea); UAT compares both dimensions to those
  values within 0.5 px at 667×375, 844×390 and 932×430.
- Filled-colour 3A has no pressed ring. Press-down writes scale 0.97 immediately before
  callbacks and the optional haptic tick. Release uses UI press(false); reduced motion
  retains state with no animation. A new press cancels any release animation.
- Face SVGs use SHAPE_BUTTONS paths, viewBox 0 0 24 24 and SHAPE_STROKE. Icon dimensions
  use space[55], replacing 55%. Face rims use space[5] white; the opacity difference from board 4 1A is
  recorded in round 4 below.
- Diamond geometry replaces the 0.75/2.5 factors with a Pythagorean diagonal axis
  (Math.SQRT2), plus token spacing. At the 110 px face floor, diagonal neighbours have
  23.38 px between circular rims, versus the board's approximately 24.35 px: about
  0.97 px tighter. This preserves the 13 px play-area margins on the smallest phone.
  Larger controls retain the same 23.38 px diagonal gap.
- Demo positioning and held readout live in controller-demo.css, outside kit CSS. L,
  Start and R occupy the upper row; the readout has its own bounded area above the D-pad.
  Start is clear of the D-pad, diamond and wake note. UAT checks all control pairs using
  actual circular face geometry, edge margins, wake text and readout clearance.
- Held state uses data-held, with accessible names retained. Hit-testing recovers the
  unscaled layout bounds, including during release animation, so scaling cannot drop a
  finger at the rim. The whole D-pad captures fingers beginning in its empty areas.
- Multiple fingers can own the same control; only the last departure releases it.
  Controls uses the injectable bindControlEvents wiring for pointercancel,
  lostpointercapture, blur, hidden visibility and unmount. Tests exercise that exact
  binding, callbacks, held state and post-release moves without requiring a DOM runtime.
- thumb.ts commits a new finger only after CDP succeeds, provides touchCancel, and
  detaches in finally even when cancellation fails. Failure paths are covered by tests.
- UAT press/release strips begin before touch-down/lift with a requested 16 ms cadence.
  Independent in-page rAF samples begin unpressed, assert the adjacent frame is 0.97 and
  enforce intervals no longer than 34 ms through that transition. Twenty-four presses
  across eight controls independently check the first rAF after pointerdown. UAT also
  dispatches trusted touchCancel and a hidden visibility change.

Local constant for integrator token review: HAPTIC_TICK_MS = 10 in button-input.ts.
UI has no haptic token; this is hardware feedback duration, not a visual motion timing.
Other geometry uses counts, Math.SQRT2 and existing UI space/motion/shape tokens.

## Close-out

Round 2 changes are on issue/K-03-buttons. No dependencies, contracts, shared trackers,
UI tokens, lockfiles or evidence files were changed. index.ts remains as in round 1;
no changes anticipate K-02's concurrent implementation or merge conflicts.

Validation: `pnpm exec vitest run packages/controller-kit tools/uat/thumb.test.ts`
passed: 3 files, 26 tests. `pnpm exec tsc -b tsconfig.build.json` and targeted
`pnpm exec eslint ... --max-warnings 0` passed. No full verify or UAT run was
performed in round 2, as requested; no auto evidence folder exists.

No visual or real-device validation is claimed.

Round 2 was committed as `a7c7079`.

PERF-012's latency budget is measured by the perf harness, not closed here. The UAT
first-frame assertions cover local feedback behaviour, not a measured latency budget.

## Requests

Integrator: run UAT, inspect every screenshot and frame strip, check the observed capture
cadence (screenshot overhead can exceed its requested cadence), and obtain independent
Claude review. The in-page rAF cadence assertion provides separate transition samples.
Run the perf harness before closing PERF-012. Review the local haptic constant and the
approximately 1 px board-spacing difference above. K-02 has since been merged by the integrator. No requirement row is closed by this builder.

## Round 3 changes and close-out

Addresses the integrator's look in `uat/evidence/K-03-buttons/round2/REPORT.md`.
Requirement IDs remain CTRL-001, CTRL-005, CTRL-006 and PERF-012.

- `packages/controller-kit/src/buttons.css`: suppresses the native WebKit tap
  highlight on the shared kit-button class (D-pad, face, shoulder and Start).
  UAT checks the computed transparent value on all eleven controls at all three
  viewports. K-02 now supplies the stick implementation after the integrator merge.
- `uat/slices/K-03-buttons.mjs`: press and release strips use a fixed Cross
  bounding-box crop plus 13 px margin. Both request 16 ms intervals and report
  consecutive capture timestamps (spacing is report-only), sampled at the end of
  checkFrame immediately before the harness records its label and takes the image.
  Press frame 0 is scale 1 and frame 1 is scale 0.97. Circle is pressed after the
  strip to retain simultaneous-touch coverage without adding a second CDP touch
  to the timed capture. Release starts held, reaches rest and reports the count of
  visibly intermediate scales strictly above 0.97 and below 0.995.
- A separate two-frame close-up places Cross held on the left and fully at rest
  on the right, using identical crop bounds; it waits for release to finish.
  This comparison is a still pair and is intentionally exempt from motion cadence.

Validation: `pnpm exec vitest run packages/controller-kit tools/uat/thumb.test.ts`
passed (3 files, 26 tests); `pnpm exec tsc -b tsconfig.build.json` passed;
`pnpm exec eslint packages/controller-kit/src uat/slices/K-03-buttons.mjs tools/uat/thumb.ts tools/uat/thumb.test.ts --max-warnings 0`
passed. No full verify, UAT or performance run was executed, per the round 3 brief.
No new screenshots or visual acceptance are claimed.

Round 3 requests: integrator to run UAT and inspect every screenshot and strip,
including the labelled capture intervals and the held/rest close-up. Capture
spacing is report-only after the integrator correction; in-page rAF timing remains asserted.
Independent Claude review, real-phone checks and PERF-012 measurements remain
outstanding as described above. No shared trackers or requirement rows changed.

Round 3 was committed as `9bfb567`.

## Round 4 changes and close-out

Requirement IDs: CTRL-001, CTRL-005, CTRL-006 and PERF-012.

- Release strips pass with fewer than two visibly intermediate frames. REPORT step
  notes and run.json record the actual count (strictly 0.97 < scale < 0.995) and
  all per-frame scale samples. Rest must still be reached; capture spacing remains
  report-only. No captured-frame count is claimed before the integrator runs UAT.
- Empty centre, corner and inter-key gap tests use distinct coordinates against
  the production hit geometry and slide onto Right, Up and Left respectively.
  UAT adds empty-centre-to-Right and Cross rim movement (2 px inside to 1 px inside).
- UAT stubs navigator.vibrate before pressing, checks HAPTIC_TICK_MS on press and
  verifies release adds no call. This tests wiring, not physical vibration.
- controlSizes uses the actual supplied play-area width and height directly with
  UI buttonSizes: scale by the smaller landscape dimension ratio to 844×390,
  floored at 1, then round each control size. No header height is assumed or added.
  A 1200×400 height-limited case and a 932×350 floor case cover this rule.
- Hit-testing and feedback query current DOM buttons; slide reads current props.
  A ShoulderButton rerender test replaces L with R and requires R press feedback.
- D-pad chevrons now use the 24×24 viewBox and SHAPE_STROKE, matching face strokes.
- Face rim difference retained for token review: board 4 uses rgba(255,255,255,.85);
  the current rim uses existing --ka-on-colour (#FFFFFF, fully opaque). UI has no
  85%-white rim token. No UI-owned token or raw colour was added in this lane.
- The integrator's K-02 merge is present. The demo defaults to the stick; buttons
  and K-03 UAT use `/play?demo=controller&controls=buttons`.

Requests: integrator runs UAT and inspects strips, including the actual visible
release count, and reviews the documented rim opacity difference. No evidence,
shared trackers, dependencies, contracts or lockfiles changed in round 4.
Validation: `pnpm exec vitest run packages/controller-kit tools/uat/thumb.test.ts`
passed (5 files, 40 tests). `pnpm exec tsc -b tsconfig.build.json` and
`pnpm exec eslint packages/controller-kit/src uat/slices/K-03-buttons.mjs tools/uat/thumb.ts tools/uat/thumb.test.ts --max-warnings 0`
passed. No full verify, UAT or performance run was executed, as requested.
No visual or real-device acceptance is claimed.

Round 4 commit limitation: `git add` failed creating the external worktree
`index.lock` (Operation not permitted). Changes remain uncommitted; the integrator
must commit on issue/K-03-buttons with CTRL-001, CTRL-005, CTRL-006 and PERF-012.


## Round 5 changes and close-out

Requirement IDs: CTRL-001, CTRL-005, CTRL-006 and PERF-012. The integrator's
D-057 ruling supersedes round 4's play-area sizing instruction above.

- `controlSizes(viewport, playArea)` starts with UI `buttonSizes(viewport)`.
  The optional play area checks the demo's diamonds, upper row, margins and gaps;
  only a layout that cannot fit is reduced, retaining every D-051 floor. Tests use
  the real 45 px header reduction: 932×430 gives 121 px faces, 844×390 gives 110 px;
  a height-limited case checks the resulting vertical extents and floors.
- The demo waits for its first ResizeObserver measurement before rendering buttons;
  the measured play area and current innerWidth/innerHeight are recorded together.
  There is no first-render header-height assumption.
- Release run notes explicitly label scales as pre-capture samples that lag the
  picture by one frame. The count describes samples, not observed image frames.
- Controls passes the current NodeList directly to controlHit, avoiding the extra
  per-move array. Current DOM ids and current slide props remain supported.
- Regression tests route a pointer along a face rim with a 0.97-scaled DOM rect
  and verify Controls changes slide behaviour after rerender during a held pointer.
- The empty-centre UAT step asserts zero held controls immediately on landing.
  REPORT count clarification: the slice defines 14 executed steps (three layout
  iterations plus eleven subsequent steps), including the release run-notes step;
  no REPORT or capture count is claimed without an integrator run.

Validation: `pnpm exec vitest run packages/controller-kit tools/uat/thumb.test.ts`
passed (5 files, 43 tests). `pnpm exec tsc -b tsconfig.build.json` and targeted
ESLint passed. No full verify, UAT or performance run; no evidence written and no
visual or real-device acceptance claimed. No shared trackers or dependencies changed.

Requests: integrator runs and visually reviews UAT and independently reviews these
fixes; PERF-012 measurements and the existing rim-token review remain outstanding.

Round 5 commit limitation: staging failed because the sandbox cannot create
`/Users/randy/projects/personal/web-apps/kaki-arcade/.git/worktrees/K-03/index.lock`
(Operation not permitted). Changes remain uncommitted on the issue branch. Suggested
commit: `fix(controller-kit): restore viewport button sizing (CTRL-001, CTRL-005, CTRL-006, PERF-012)`.
