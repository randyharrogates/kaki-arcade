# K-08 — Controller size and start-up budget check

## Goal and requirements

Enforce PERF-020: transfer size in verify under D-115, and controller cold start as
a blocking `pnpm perf -- controller` scenario under D-129 as amended by D-148.

## Acceptance

- Production `/play`, 844 × 390, CPU 4×, 30/15 Mbit/s, 20 ms RTT, empty cache.
- Five cold contexts; navigation-to-painted-control accepting a synthetic press;
  median ≤ 2000 ms, JSON report and one-line terminal result, failure above budget.
- Verify retains the phone-closure transfer check; browser start-up runs outside verify.
- No dependency, threshold, controller-kit behaviour or game code changes.

## Implementation

`tools/perf/cli.ts` dispatches `controller` to `controller-startup.ts` before the
general multi-page perf memory gate. This single-page runner retains the UAT 3 GiB
gate and reports memory refusals distinctly from measured budget failures. Preview
uses an ephemeral loopback port (listen on 0, read, close, pass to `--strictPort`).
The runner owns browser/preview cleanup and five cold contexts with CDP conditions.

The pre-navigation probe waits for fonts and a painted, visible, hittable room-code
control. The pointerdown hook at `apps/web/src/phone-route.tsx:81-84` is the
measurement's input target: it marks `kaki-controller-interactive` when the synthetic
press is accepted without changing form state. It must not be removed as dead code.
No joining/networking is part of this cold entry measurement.

`controller-startup-report.ts` validates five samples and computes the median and
threshold result. The terminal line reads CPU rate and budget from the report.
Over-budget medians, missing marks, incomplete samples and browser/server errors
fail the command; “not assessed” cannot pass.

Main's D-115 transfer check counts the phone's HTML, static import closure, CSS,
assets, phone-route chunks and CSS-referenced public files once. Host-only dynamic
imports are excluded; the whole deployment remains measured against PERF-022.
The controller threshold remains 300,000 gzip bytes.

Reports default to `uat/evidence/controller/perf-1/startup.json`, in marked,
gitignored run folders. `--slice` changes the parent; `--out perf-<name>` selects
another ignored run folder. Unmarked evidence is protected by `prepareEvidence`.

## Validation and UAT script

Integrator: run `pnpm run build && pnpm perf -- controller` on a quiet machine with
Playwright Chromium. Inspect five samples, D-129 conditions, the PERF-020 terminal
line and JSON report; review the initial `/play` join controls at 844 × 390.
A median over 2000 ms, missing marks or timeouts must fail. Chromium execution and
visual review are reserved for the integrator because this sandbox cannot launch it.

Round 2 checks (all passed):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/check_budgets.test.ts tools/perf` — 7 files, 58 tests
- `pnpm exec tsc -b tsconfig.build.json`
- `pnpm exec eslint tools apps/web/src/phone-route.tsx`
- `pnpm run lint:design` — 367 files scanned

Each command is run only after uptime's one-minute load is below 8. Full verify,
whole-suite tests, UAT and browser execution are excluded by the round 2 brief.

## Out of scope

QR-to-seated latency, game/paired controller layouts, real-device benchmarking,
frame/input-delay budgets and shared tracker updates.

## Close-out

PERF-020 size enforcement remains in verify. D-148 moves start-up enforcement to
the blocking controller perf scenario. Automated coverage includes CLI dispatch and
failure propagation, median/threshold/invalid samples, report-driven terminal output,
and transfer accounting. Independent review and post-merge browser timing remain
integrator work; committed by the integrator (0b70d08).

Post-merge measured median (integrator, 2026-11-18, after merging main; production build,
headless Chromium, CPU 4x, 5 runs, Apple silicon 16 GB under concurrent load): **227 ms** and
**221 ms** against 2000 ms; the reviewer's independent run measured 223 ms. Reports are written to
the ignored `uat/evidence/controller/perf-1/startup.json`.

Integrator fixes at merge (review round 2 should-fixes): the ignore rule is back to `perf-[148]/`
plus `perf-controller*/`, and the controller `--out` must be `perf-1` or start with
`perf-controller`, so retained evidence such as `R-03-rabakz-screen/perf-run-1/` is never hidden;
`--headed`, `--headless`, `--phones` and `--build` are refused for `controller` instead of being
silently ignored; the unused `tools/perf/controller-startup.mjs` is removed.

## Requests

None. D-148 is on main.
