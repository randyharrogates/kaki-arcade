# R-17 — Distinguish skipped questions from no answer

Requirement IDs: RZ-006, RZ-007 (reveal, skip and zero-point outcomes); RZ-005 only
for keeping the per-seat `skipped` flag private.

Goal: show “Skipped” only for a player whose accepted Skip ended the question, and
“No answer” for a player who gave no answer without skipping. Keep “Right” and “Wrong”.

Acceptance:
- A solo skip reveals “Skipped” with zero points.
- The next solo question timing out reveals “No answer” with zero points.
- An idle multiplayer opponent sees “No answer” when someone else wins or skips.
- Correct and wrong answers retain “Right” and “Wrong”, with unchanged awards.

Implementation: one deterministic `skipped` boolean per rules seat, initialised and reset
for each question, set only on an accepted leader skip. It is not added to public views.
A solo wrong answer now reveals immediately within the action loop, so a later same-step
Skip cannot change an already ended question. This preserves the existing repeat-tap
conformance invariant. Existing wrong-answer reveal copy takes precedence over skip status.

Unit coverage: rules/view transitions in `games/rabakz/src/rules/views.test.ts` cover solo
skip followed by timeout (including flag reset), multiplayer winner/wrong/idle players,
and rejected guest skip followed by accepted leader skip. The existing skipped-view test
now uses a real skip; the no-input presentation fixture expects “No answer”.

UAT script: `uat/slices/R-17-no-answer.mjs`, one paired landscape phone, clock installed
once before Start. Skip question 1, then leave question 2 unanswered until its idle reveal.
Capture settled phone reveals `01-skipped-phone` and `02-no-answer-phone`, asserting zero
points and no crossfade ghosts. R-08's named reference script is absent in this worktree;
R-06's existing fake-clock setup supplied the equivalent pattern.

UAT command:

```sh
KAKI_PORT_WEB=5790 KAKI_PORT_SIGNAL=5791 pnpm uat -- R-17-no-answer --phones 1
```

The standard runner consumes web/signal ports; 5792 remains the reserved UAT port.
The completed run is under `uat/evidence/R-17-no-answer/round1/`.

## Validation

One-minute load measured immediately before each launch; every launch was below 8.

| Command | Launch load | Result |
|---|---:|---|
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz` | 2.26 | Initial run: 288 passed, 2 failed (old no-input expectation and repeat-tap conformance); corrected |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz` | 2.03 | 18 files, 290 tests passed |
| `pnpm exec tsc -b tsconfig.build.json` | 2.71 | Passed |
| `pnpm exec eslint games/rabakz uat/slices/R-17-no-answer.mjs --max-warnings 0` | 3.12 | Passed |
| `pnpm run lint:design` | 3.03 | Passed, 484 files scanned |

No command reached the ten-minute limit. No generated JavaScript, source maps or declarations
were left beside sources by typechecking. No dependencies, contracts or shared trackers changed.

### Round 2 validation

Only the three requested checks were run, each below load 8 and within ten minutes.

| Command | Launch load | Result |
|---|---:|---|
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz` | 4.66 | 18 files, 294 tests passed |
| `pnpm exec tsc -b tsconfig.build.json` | 4.21 | Passed; no emitted files to delete |
| `pnpm exec eslint games/rabakz --max-warnings 0` | 3.78 | Passed |

## Close-out

UAT ran and passed at one phone. The Claude reviewer opened both settled stills on
2026-11-18: “Skipped” and “No answer”, each with +0, no clipping or visible ghosts.
The report records the visual acceptance and identifies multiplayer and Right/Wrong
outcomes as unit coverage only. The integrator changed the no-pick contrast case in
`apps/web/src/rabakz-phone.dom.test.ts` to “No answer” (HEAD c06a05b9).

Round 2 gates the in-loop solo reveal on an accepted answer and respects
`inputs.disconnected`. Unit tests cover wrong-then-Skip, Skip-then-answer, rejected
stale taps and the disconnected count. No commit made, as instructed by the brief.

## Requests

Integrator: review the round-2 diff and handle shared trackers and final closure.
