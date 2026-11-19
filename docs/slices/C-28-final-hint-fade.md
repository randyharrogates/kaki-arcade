# C-28 — Final-screen hint fade

Requirement: PLAT-022.

The shell hint now starts one WAAPI opacity entrance in a mount layout effect, using
`crossfade().incoming` from `packages/ui` for its keyframes, duration, delay, easing and
fill. The layer rests at opacity 1. Reduced motion and unavailable WAAPI skip the
animation. The effect cancels its animation on unmount; copy updates do not restart it.
No layout or game-specific shell code changed.

Exit follows the existing shell behaviour: the enclosing Overlap retains the outgoing
screen and hint until its transition completes. No separate hint exit animation was added.

## Checks

Run sequentially with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`, without load gating:

- Requested apps/web unit suite, with `VITEST_MAX_WORKERS=2` and all three exclusions:
  passed (52 files, 538 tests).
- `pnpm exec tsc -b tsconfig.build.json`: passed. Deleted emitted files with
  `pnpm exec tsc -b tsconfig.build.json --clean` afterwards.
- `pnpm exec eslint apps/web --max-warnings 0`: passed without disabling rules.
- `pnpm run lint:design`: passed (508 files scanned).

All checks ran one at a time with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`.
No installs, DOM tests, verify, UAT, performance runs or commits were performed.

## Close-out

Added unit coverage for incoming keyframes and crossfade timing, cleanup, reduced motion
and opaque resting CSS. Existing copy/theme tests mock the hook lifecycle so they can
continue inspecting the returned VNode without a DOM.

Added `apps/web/src/game-final-hint.dom.test.ts` for the integrator. It mounts the actual
component in Chromium, checks one finite 0→1 animation with incoming duration/easing,
awaits `ready` to prove the animation gets a start time and leaves pending state, awaits
completion, checks opacity 1, checks copy updates do not restart it, cancels the completed
animation to check resting opacity 1, and checks no animation under reduced motion.
The integrator reports four of five browser tests passed in round 1, with the easing
comparison failing because Chromium normalises its string. Round 2 compares numeric
cubic-bezier values, narrows the effect to `KeyframeEffect` and the bundle entry to a
chunk, and uses the hook's callback type and `RegExp.exec` in the unit tests. The DOM
test was not rerun here because Chromium crashes in this sandbox.

## Requests

Rerun the DOM test in the integrator browser environment. For visual UAT, reuse
R-08-full-match's podium strip with at least five phones; this needs the R-16 merge.
Inspect frame 0 and the full transition from the last outgoing question to the podium:
the shell hint should fade with the incoming screen instead of appearing at full strength
over outgoing lower seat rows. Check both phone and keyboard hint copy, immediate reduced
motion appearance, and the existing final-screen exit.

the integrator runs the DOM tests, verify and UAT

## Round 3 — verify animation guard (PLAT-022)

Source tracing identifies the extra animation as the WAAPI effect targeting
`.game-final-layer`: opacity keyframes `[{ opacity: 0 }, { opacity: 1 }]`, incoming
crossfade duration 377 ms, zero delay, one iteration, in-out easing and `fill: both`.
The fill retains the completed effect in `document.getAnimations()`. The fixture mounts
this hint on its first `over` draw and retains that component through subsequent `over`
draws; its empty-dependency layout effect does not restart on those redraws. This is
choice (a): a legitimate screen entrance, rather than a component restart to fix.

The poker results DOM test now requires exactly one hint animation with that layer as
its target, checks its opacity keyframes, incoming duration and single iteration, awaits
completion and cancels only that validated effect. The existing global zero-animation
guard remains unchanged after the later `over` redraws, so stray animations and hint
restarts still fail. The hint DOM test additionally redraws while the entrance is active
and requires the same layer, animation identity and count; its existing post-completion
copy-update check remains.

Checks ran one at a time, without load gating, all pnpm commands prefixed with
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`:

- Requested non-DOM apps/web unit suite: passed, 52 files / 538 tests.
- Build TypeScript: passed after fixing a possibly-undefined animation in the new test;
  emitted files deleted with `tsc -b tsconfig.build.json --clean`.
- ESLint apps/web with zero warnings: passed.
- Design lint: passed, 508 files scanned.

No command reached ten minutes. No DOM tests, verify, UAT, installs or commits ran.
The animation identification above is from source tracing; the new browser assertions
are for the integrator to confirm in `poker-results.dom.test.ts` and
`game-final-hint.dom.test.ts`.

## Round 4 — review 1 fixes (PLAT-022)

Must-fix 1 is complete per the integrator: both DOM test files passed before this
round. This round adds the pre-await global animation-count guard in
`poker-results.dom.test.ts`, rejecting any extra animation before waiting for the
validated hint entrance to finish. The completed entrance remains registered as
requested; review should-fix 5 was skipped.

`game-final-hint.tsx` now multiplies its entrance duration by the dev `?slow=` value
using FadeLayer's parsing and minimum of 1. A unit test covers a multiplier of 4,
a value below 1 and invalid input.

`C-18-final-hint.mjs` adds eight-phone reduced-motion cases for both Peek Poker and
Rabakz. Each captures a six-frame final entrance strip, asserting opacity 1 and no
running/pending hint animation from frame 0. The Rabakz FFA case also captures the
leader's Continue exit: the original hint must remain within the outgoing screen,
with local opacity 1 and no restarted entrance. Only ancestor screen animations
are scrubbed, through 99% at the last sample, then resumed to assert hint removal.
Existing keyboard and Peek Poker stills remain available in this script.

`R-08-full-match.mjs` pauses and scrubs `.game-final-layer` alongside `.rz-block`
in the podium strip, and requires numeric entrance start times within 17 ms.

Checks ran sequentially, each completing well within ten minutes, with every pnpm
command prefixed by `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`:

- Requested non-DOM apps/web unit command with all three exclusions and
  `VITEST_MAX_WORKERS=2`: passed, 53 files / 558 tests.
- `pnpm exec tsc -b`: passed, including a repeat after the exit harness correction.
  The root config uses `noEmit: true`; no emitted source files needed removal.
- Requested ESLint command over apps/web and both changed UAT scripts, zero warnings:
  passed, repeated after the harness correction.

No DOM tests, UAT, verify, installs or commits ran in this round. Existing untracked
`uat/evidence/R-08-full-match/c28-ffa/` evidence was left untouched. New strips are
script coverage only: no new visual evidence has been produced or inspected here.

### Requests for integrator

Run `apps/web/src/game-final-hint.dom.test.ts` and
`apps/web/src/poker-results.dom.test.ts` in the browser environment. Run C-18 with
eight phones and R-08's podium case; inspect both reduced-motion frame-0 hints,
the outgoing-screen exit, and the synchronised podium strip before closing the
visual review. The earlier Requests sections record previous rounds; this section
is the current hand-off.
