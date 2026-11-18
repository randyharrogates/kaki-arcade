# R-07 part 1 — automated evidence (RZ-033)

Final permitted checks:

| Command | Result |
| --- | --- |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz packages/platform apps/web/src/session-adapter apps/web/src/host` | PASS: 61 files; 1335 tests passed, 1 existing skipped test; 67.19 s |
| `pnpm exec tsc -b tsconfig.build.json` | PASS, exit 0 |
| `pnpm exec eslint games/rabakz packages/platform apps/web/src --max-warnings 0` | PASS, exit 0 |
| `pnpm run lint:design` | PASS, 408 files scanned |

Before every test/typecheck invocation, `uptime` showed a 1-minute load below 8.
No memcheck, verify, whole-suite tests, UAT, perf, Blender or install was run.

Coverage: exact note frequencies, three partial ratios and levels, 4 ms attack, exponential
decays, start/stop times and peaks for all four cues and all eight seats; master and channel
nodes allocated before playback, with only cue oscillators/gains added during playback;
default/saved/invalid/blocked level storage, clamping and channel isolation; first-gesture
single-context creation and resume with blocked browser storage and listener disposal;
a ten-question solo match through scoreboard and final announcement, and a multiplayer
sequence including simultaneous winners and repeated views. Round 2 adds per-step public
wrong-press events (including the last press that unlocks everyone), silent skips/timeouts,
30 ms seat staggering, right after the last seat +233 ms, solo and simultaneous wrong +233 ms after each seat,
pre-gesture saved/applied levels, limiter configuration/routing, scheduling while suspended,
and firing ended handlers to assert node disconnection. A real Preact renderer against a
minimal in-memory DOM tests Screen history through redraws, remounts and active toggles;
the host route's active-only sound prop is checked. This is not browser UAT.

Initial check failures were resolved: DOM-free platform audio ports, package host import
boundary, removal of compiler output emitted beside source by the first failed build,
listener removal options, and fixture expectations accounting for buffered public answers
and shuffled correct-option indices. Final commands above pass.

Round 2 initial failures were corrected: shuffled fixture answers, the in-memory DOM's
remove port, and a registry return type that keeps host-renderer declarations out of
DOM-free consumers. A browser-based version of the Screen test could not launch Chromium
inside this sandbox (Mach port permission denied); it was replaced by the reconciler test,
without skipping coverage. The unreachable undefined baseline was removed. One later rerun timed out in the existing
platform conformance test `round 3 permits needless private revisions` as system load rose
above 40 during execution. After waiting for the one-minute load to fall below 8, the exact
requested command passed with no timeout/configuration changes.

The host service mounts after navigating from Landing, so that landing gesture does not
create/resume audio. A later TV keydown/pointerdown/click does. An untouched TV can remain
silent; the slice note asks the integrator to raise this through the design gate.

Listening route for integrator: `http://localhost:5690/host/sound` (development only).
Audible playback, browser scheduling duration and frame budgets have not been measured or
visually/audibly reviewed here. This report is automated evidence, not UAT sign-off.


## Round 3 — RZ-033, D-168 / D-169

Implemented persistent latest wrong-press events, cleared at the next question and replaced
at the next wrong-press tick (same-tick presses aggregate deterministically). Rendered
Screen tests run three simulation steps between draws for multiplayer wrong, last wrong
unlocking all players, and solo wrong/reveal; redraw and remount must not repeat cues.
Simultaneous wrong seats get staggered notes and one wrong at last-note +233 ms.
The shell's active-only sound mapping is exercised through its exported helper in the
rendered regression, replacing the cwd-relative source-text assertion. There is no file read.
A fourth graph gain cancels limiter makeup: fullRangeGain =
10^(threshold * (1 - 1/ratio) / 20), compensation = fullRangeGain^0.6 =
0.674528027697922 for threshold -6 dB, ratio 20 and zero knee. Tests check the value,
unity with makeup gain and the post-limiter routing.

Commands (only the requested verification commands were used):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz packages/platform packages/sim-core apps/web/src/session-adapter apps/web/src/host`
  — final run: 72 files passed, 1 failed; 1,590 tests passed, 1 failed, 1 existing skip.
  All Rabakz, platform sound, host sound and simulation checks pass. Sole remaining failure:
  `apps/web/src/host-keyboard.dom.test.ts` cannot launch Chromium in this sandbox:
  `bootstrap_check_in ... MachPortRendezvousServer ... Permission denied (1100)`.
  No browser-test skip, timeout increase or unrelated test rewrite was introduced.
- `pnpm exec tsc -b tsconfig.build.json` — passed, exit 0.
- `pnpm exec eslint games/rabakz packages/platform apps/web/src --max-warnings 0` — passed, exit 0.
- `pnpm run lint:design` — passed, 416 files scanned.

Before the first and final test runs, uptime 1-minute load was respectively 6.41 and
6.95; before typecheck it was 6.83. The initial test run had two stale host graph-count
expectations (corrected), a conformance timeout while load rose above 55 (passed on rerun),
and the same Chromium sandbox failure. Initial lint errors in the new regression were
corrected and scoped lint rerun successfully. `git diff --check` is clean.

Suspended contexts queue cues that play together on resume (limiter keeps it safe; low
priority). No UAT, audible browser review, performance run, commit or merge was performed.
The exact requested test command needs a rerun where Chromium can launch before the
integrator can record a fully green verification result.

## Round 4 — RZ-033, D-168 / D-169

Running per-question wrong-press counts replace the latest-step event. Tests cover two
consecutive steps before one draw, redraw/remount without repeats, repeated presses by
one seat, question reset, solo wrong and the last-wrong unlock. Seat notes stagger by
30 ms, followed by one wrong 233 ms after the last. Public counts expose no choices,
correct presses or timing. The new-question same-frame baseline behaviour is unchanged.
`activeScreenSound` now lives in the exported platform sound module, used by the host
route and game regression without a game-to-app import.

Only the four requested verification commands were run:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz packages/platform packages/sim-core apps/web/src/session-adapter apps/web/src/host`
  — final run: 72 files passed, 1 failed; 1,594 tests passed, 1 failed, 1 existing skip
  (55.82 s). All sound regressions pass. The sole failure remains the unrelated
  `apps/web/src/host-keyboard.dom.test.ts:160` Chromium launch: sandbox denies
  `bootstrap_check_in ... MachPortRendezvousServer ... Permission denied (1100)`.
- `pnpm exec tsc -b tsconfig.build.json` — passed, exit 0.
- `pnpm exec eslint games/rabakz packages/platform apps/web/src --max-warnings 0`
  — passed, exit 0.
- `pnpm run lint:design` — passed, 416 files scanned.

One-minute uptime load before test runs: 6.73 and 7.48; before typecheck: 7.84.
The first test run also caught a floating-point equality mismatch in the new timing
expectation (fixed to use the scheduled arithmetic). Initial ESLint caught a void arrow
shorthand in the new render helper; corrected before the passing rerun.
No test skip, browser workaround or unrelated code change was made. No memcheck, verify,
whole-suite test, UAT, perf, Blender, install, commit or merge was run. Integrator request:
rerun the exact selected Vitest command where Chromium may launch for a fully green run.
