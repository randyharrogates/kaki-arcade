# C-19 — Label timing from independent fresh-mount samples (PERF-012, CTRL-003)

## Defect and evidence

The label timing test assessed one `measureLabelGroup` call and one
`observeLabelGroup` install per game. The integrator reported a failure in one of
three runs at machine load 5: exactly 4.0 ms failed `expected 4 to be less than 4`.
The same test has blocked verify on two unrelated branches. This was supplied
evidence at first; the review then ran the browser timing (below).

## Method change

For each game, collect seven timing pairs. Before every pair, unmount the previous
Preact tree, remove its container and render into a new clean container. Await
`document.fonts.ready` and two animation frames as before, then run the existing
first-pass and install timing sequence once. No repeated timing loop runs on a
mounted tree. Keep the target and non-empty label count assertions on every sample.

Assess each timing's median (the fourth sorted value) against the unchanged strict
budget: below 4 ms at 4× CPU throttling, or below 1 ms without CDP. Additionally,
every sample must be at most three times that budget (12 ms or 3 ms respectively).
Print all seven values and the median for both timings in each game's stdout line.

This implements the integrator's specified sampling decision, to be logged at
merge. It changes the estimator to reduce sensitivity to an isolated scheduler
interruption; it does not increase the median budget, reduce CPU throttling or
reuse a warmed mount between samples. The individual-sample ceiling also catches
large intermittent regressions. PERF-012's phone-feedback requirement and its
separate measurement-validity rules remain unchanged; this focused label-cost test
does not claim to assess the full touch-to-feedback budget.

## Validation

All launch loads below are 1-minute averages:

- ESLint first launch: 2.70; failed on a non-null assertion in the new median helper.
  Replaced it with an explicit seven-sample guard.
- TypeScript first launch: 2.51; passed.
- ESLint final launch: 2.46; passed with zero warnings.
- TypeScript final launch: 2.46; passed.

Commands: `pnpm exec eslint apps/web/src/kit-label-performance.dom.test.ts --max-warnings 0`
and `pnpm exec tsc -b tsconfig.build.json`. Each had a 10-minute timeout; neither
reached it. No emitted `.js` or `.d.ts` files appeared beside sources. No verify,
UAT, perf, install or Chromium command was run.

## Close-out

Only the permitted timing test and this note changed. Product code, budgets,
throttling and game fixtures are unchanged. No commit was made.

## Requests

Integrator to run the Chromium test, review the seven samples and medians for both
games, and record the sampling decision at merge as specified in the brief.

## Review measurements (2026-11-18)

Fresh mounts give independent samples on a new DOM with the code already warm (the renderer's own
install pass runs first), not cold samples. `performance.now()` ticks in 0.1 ms steps here, so the
original "exactly 4.0 ms" was a quantised reading. Rabakz `measureLabelGroup` pass, CPU 4x, ms:

| Run | Load at start | Samples | Median | Result |
|---|---:|---|---:|---|
| 1 | 2.36 | 0.9, 0.3, 0.2, 0.5, 0.8, 0.8, 1.0 | 0.8 | passed |
| 2 | 2.36 | 1.5, 1.5, 1.7, 1.3, 1.6, 1.4, 0.9 | 1.5 | passed |
| 3 | 2.33 | 1.4, 1.2, 1.7, 1.0, 1.5, 1.6, 1.8 | 1.5 | passed |
| 4 | 7.20 | 2.9, 3.3, 3.5, 2.6, 2.9, 2.5, 2.8 | 2.9 | passed |
| 5 | 10.34 | 3.7, 4.0, 3.2, 3.2, 3.4, 3.5, 2.8 | 3.4 | passed (information only: started above load 8) |

Load shifts the whole distribution, so the check is meaningful only on a quiet machine; verify
stays under load 8. The threshold is not raised. Verify evidence is in D-213.

