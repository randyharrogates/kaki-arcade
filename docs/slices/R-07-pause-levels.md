# R-07 part 2 — Pause levels

## Goal and requirements

RZ-033 (partial), D-168: expose the saved TV Effects and Music levels in the pause
panel. Part 1 supplies persistence and the live engine. Music playback remains out
of scope.

## Acceptance

- Resume, Effects, Music and Quit to picker are reachable in order with Up/Down.
  Left/Right adjusts a focused level by ten, clamped to 0–100. Saved intermediate
  values remain valid (including the part 1 Music default of 55).
- Existing game-pad directions use the same keyboard route. C-12 has no phone path
  for driving the TV pause panel; no new phone path is added.
- Each actual Effects change calls setLevel before playing one neutral C5 Mallet confirmation.
  Music changes save without a cue. Attempts beyond either bound do nothing.
- The game screen and pause panel share one hostSound instance; live gains and
  device storage update immediately through part 1's setLevel.
- Rows display text and a bar, using UI spacing/type/colour tokens. Fill moves with
  the base duration (233 ms), ease-in-out; reduced motion uses tokenised zero
  durations. Existing press scale and panel entrance/exit remain in use.
- Panel and rows fit inside the TV safe area at 1920×1080 and 1280×720.

## Implementation and tests

- `apps/web/src/pause-panel.tsx`: extracted existing panel with level controls.
- `apps/web/src/host-route.tsx`: shares the existing engine with both consumers.
- `apps/web/src/host-keyboard.ts`: includes sliders in the focus sequence and omits
  their pointer buttons. Slider Left/Right events stop before menu navigation.
- `apps/web/src/pause-level.test.ts`: stepping and both bounds.
- `apps/web/src/host-sound.test.ts`: saved levels also change already-created gains.
- `apps/web/src/pause-panel.dom.test.ts`: Chromium fixture opens the panel with
  Escape at both TV sizes, moves to Effects, presses Right twice, checks displayed
  and stored 90 plus two cue calls, then measures panel/row containment.

## UAT script

`uat/slices/R-07-pause-levels.mjs` creates a room, joins the keyboard seat, starts
the first game and opens pause using Escape. At each TV size it captures the panel
before and after changing Effects and Music, checks their numeric changes, then
resumes. Every resize waits two animation frames and waits for --screen-scale to
match the viewport before proceeding.

Expected evidence: `uat/evidence/R-07-pause-levels/auto/`, screenshots named
`pause-1080-before`, `pause-1080-after`, `pause-720-before`, `pause-720-after`.

## Close-out

Implementation ready for integrator verification; browser execution, UAT and visual
review remain pending. No commit, shared-tracker edits or dependencies added.
The request's command restrictions override the general pnpm verify workflow.

## Round 2

- Styled both level buttons with `ka-panel ka-pressable`: the shared panel recipe
  supplies the corner radius, edge and surface treatment. Removed press scaling
  from the whole row. Lower-case accessible button labels are unchanged.
- Chose a neutral platform confirmation tone rather than a registry lazy load.
  It needs no game module or prefetch and preserves D-168's C5 Mallet partials,
  4 ms attack, decay and peak. The existing engine schedules it 20 ms ahead on
  the Effects bus, after setting the new level. Platform contains no seat or game
  semantics. A unit test checks scheduling, envelope, bus routing and cleanup.
- Repeated Left/Right keydowns are consumed without stepping or replaying sound.
- Extended `pause-panel.dom.test.ts` at both TV sizes: Music changes without a cue;
  Effects presses at 0 and 100 preserve storage, value and cue count; a bubbling
  d-pad Left keydown on the focused row steps once and retains focus; repeated
  Right does nothing; press styling belongs only to the buttons.

Round 2 validation:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src packages/platform/src/sound games/rabakz/host`:
  626 tests passed, including the new tone test. Six browser tests could not launch
  in this sandbox; the command exits 1. Integrator browser execution remains required.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/web/src packages/platform/src uat/slices/R-07-pause-levels.mjs --max-warnings 0`: passed.
- `pnpm run lint:design`: passed (420 files).

Final tests and typecheck started below load 8 (7.89 and 7.97 respectively).
An earlier typecheck was mistakenly started above the requested threshold; the
final passing run obeyed it.

## Requests

Integrator: rerun the scoped Vitest command outside the sandbox, including the new
pause-panel DOM test and the existing Chromium tests; run the UAT slice and inspect
all four screenshots for safe margins, focus visibility, type and fill motion.
Confirm by ear that Effects changes sound at the chosen level (zero is silent),
and that Music is silent. Exercise the bound game pad's directions as well.
