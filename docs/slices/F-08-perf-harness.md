# F-08 — Performance harness

## Goal and requirements

Build repeatable simulation diagnostics and a browser performance runner using the real
UAT stack, without inventing simulation budgets. NFR-PERF, PERF-001 and PERF-010 are
partially covered: measurement and evaluation infrastructure, not acceptance of game
rendering or real-device latency. PERF-012 and PERF-030 are explicitly reported where
not assessed. The no-GC-pause condition in PERFORMANCE §2 remains a browser-round gate.

Branch: `issue/F-08-perf-harness`.

## Acceptance and implementation

- `tools/perf/run.mjs` is the Node 24 source entry. `cli.ts` defaults to all installed
  modules discovered from `games/*/src/index.ts`, 1/4/8 players, fixed-seed existing bots,
  full matches at the existing 60 Hz timestep until the module says over. Unsupported
  counts are disclosed; the safety cap is an operational failure, not a budget.
- `headless.ts` separately measures game step time, driver time, managed-heap sampled
  allocation including collected objects, source attribution and observed Node GC pauses.
  The allocation run must reach the same state hash. Default settings and a synthetic
  Rabakz bank are disclosed; these are not heaviest-level or optimal-play claims.
- `metrics.ts` implements nearest-rank percentiles, honest empty/small samples, exact
  approved frame/direct-input limits, feedback frame checks and epoch-based timing maths.
- `browser.ts`, `registry.ts` and `uat/perf/lobby-8.mjs` capture host rAF deltas and long
  tasks during real paired seat transitions. Headed is the default; 1/4/8 phone contexts
  are selectable. Lobby joins all phones, then renames, leaves and returns each. Picker
  is a clearly documented pending slot, automatically enabled by adding `picker.mjs`.
- `packages/platform/src/harness/perf-timing.ts` is an explicit opt-in, clock-injected,
  unexported hook. Future browser routes record touch/receipt/actual application/visible
  feedback through it, correlated by player and wire sequence; `timing.ts` validates
  traces and counts missing ones; feedback pairs are independent of receipt/application. Current routes have no controller/game apply point,
  so lobby input/feedback are **not assessed**. No gameplay packet changes or invented
  receipt-as-application proxy. Production scan proves the hook markers are absent.
- `report.ts` writes schema-v1 `perf.json` and a short generated `PERF.md`, using the
  shared UAT ownership guard. Output is `uat/evidence/<slice>/<out>/` (simulation/perf or <scenario>/perf-<phones> by default), itself
  the marked run folder. Unmarked human evidence and symlinked parents are refused.
- Machine, initial load average, unknown/detected contention, sample counts, run length,
  mode, viewport/scaling and browser/version are reported. Node browser/viewport fields
  are null. Under-sampled or inapplicable measurements cannot become a budget pass.
- No new dependencies, root configuration, gameplay contracts or shared trackers changed.

Small UAT sharing changes, listed in full: `runner.ts` additionally accepts production
build/preview selection and the actual caller command; production Vite build receives local
pairing/join origins. `runner.test.ts` asserts both launch modes reach Chromium.
`runner.ts` accepts an optional extension
containing a script path, scenario callback and explicit headed override; without that
extension its behaviour is unchanged. `runner.test.ts` adds one mocked extension lifecycle
and cleanup test. Existing UAT harness tests pass. Marked-folder code is reused, not copied.

API, schema, timing integration instructions and measurement caveats:
[`tools/perf/README.md`](../../tools/perf/README.md).

## Tests and evidence

`tools/perf/perf.test.ts`: percentile maths including tiny/empty samples; budgets pass,
fail, not assessed and insufficient samples; argument validation; scenario discovery;
report JSON/Markdown; shared marked-folder replacement/human/symlink protection; a
12-step fixture deterministic smoke and a short allocation smoke; production scan.
`tools/perf/timing.test.ts`: explicit hook opt-in, timestamp/frame correlation, lost and
duplicate traces, invalid sequence, and absence from package entry exports.

Round-1 regression coverage adds `cli.test.ts` (fresh-checkout default output and
ownership refusal before measuring), `browser.test.ts` (round-only duration/frames,
applicable insufficient-sample exit, independent feedback and observed direct-path gate),
nearest-JS allocation attribution, resolution/privacy/tolerance checks, and launcher
assertions for both headed overrides and production build/preview. Focused perf plus
runner tests: 27 passed across five files. Full verification is recorded below.

Evidence:

- [`first-run/perf.json`](../../uat/evidence/F-08-perf-harness/first-run/perf.json) and
  [`first-run/PERF.md`](../../uat/evidence/F-08-perf-harness/first-run/PERF.md): full Node runs.
- [`production-scan.txt`](../../uat/evidence/F-08-perf-harness/production-scan.txt): deployed
  build scan for both timing-hook markers (zero occurrences).
- `round-1-verify-tail.txt`, `round-1-targeted-tests.txt`: round-1 verification output (below).
- `round-1-results/perf.json` and `round-1-results/PERF.md`: warm headless repeats,
  game-only allocations, per-source errors and measured-resolution flags.

## UAT script and limits

The integrator runs `pnpm perf -- lobby-8` on a quiet machine with headed Chromium, then
repeats with `--phones 1` and `--phones 4`, preserving each run outside the replaceable
`perf-<phones>` folders. Add `--build production` for a built-app repeat. Inspect real joins, rename/removal/return transitions, host visibility,
phone acknowledgements, unexpected errors, raw frame counts and long-task support.
Run `--headless` once to confirm frame budgets say not assessed. Inspect all generated
UAT failure images if any; no browser, server, Wrangler or network was started here.

The browser path, trusted-touch timings and headed behaviour need the integrator's first
run. A full real browser Tabao round, GC attribution, heaviest level, and all T/P/R/K
controller scenarios await their screens. Same-machine contexts do not prove real Wi-Fi,
phone hardware/display latency, TV performance or 30-minute stability. PERF-001/010/012/030
are not marked pass by these headless or lobby measurements.

## Close-out

Implementation and browser-free checks complete; browser execution and acceptance are
pending integrator review. Exact numbers and verification tail are recorded below.

The memory helper's sysctl is denied in this sandbox. F-08 preserves its four-GiB memory
requirement using Node total RAM plus memory_pressure, disclosing the existing helper's
level-1 fallback when pressure-level sysctl cannot be read. Memory_pressure reported
60% free for the first run. CPU load averages cannot establish that the machine was quiet;
all numbers are diagnostic and require a quiet-machine repeat. No budgets were loosened.

## Requests (full integration text)

1. Add this exact root `package.json` script line:

   ```json
   "perf": "node --expose-gc tools/perf/run.mjs"
   ```

   No tsconfig include change is required: root `tsconfig.json` already includes
   `tools/**/*.ts`, `tools/**/*.mjs`, `uat/**/*.ts` and `uat/**/*.mjs`; the optional hook
   is already inside platform's source include. Preserve those existing lines.

2. Update the `CLAUDE.md` command table: `pnpm perf` runs installed-game simulation
   diagnostics; `pnpm perf -- <scenario> --phones 1|4|8 --headed|--headless
   --build development|production --slice <name> --out <name>` runs browser scenarios.
   Defaults are simulation/perf and <scenario>/perf-<phones> under uat/evidence.
   Record D-100 exactly: `pnpm verify` enforces browser-free transfer-size budgets and
   runs a short performance-harness smoke. `pnpm perf` checks browser budgets on the
   integrator's quiet machine before any slice that draws a game screen closes; a failure
   blocks that slice exactly as a verify failure does. No budget changes. Not assessed
   and insufficient samples never mean pass. Leave rule 6's wording unchanged.

3. Update `docs/PERFORMANCE.md` §4 Measurement to record:

   - The stated aim remains the **heaviest level**, eight players, a full round. Until
     T-05 the simulation measures default settings; Tabao Rush round length is conformance
     scaffolding. Seeded bots and default matches are diagnostic coverage, not proof of
     the heaviest workload. No simulation time or allocation budget is approved.
   - PERF-001 requires at least 180 seconds and 600 visible headed host frames **inside
     the explicit round capture window**. Lobby time/frames cannot qualify a round.
     PERF-010 and PERF-012 require 100 observations. These are validity rules, not budgets.
     PERF-010 requires host getStats evidence of selected host/srflx candidates on both
     ends; PERF-012 uses touch/feedback pairs independently of receipt/application, and
     missing feedback makes coverage not assessed. Applicable insufficient samples or
     budget failures exit non-zero. No existing limit changes.
   - Verify keeps transfer-size budgets and the short performance smoke. The integrator
     runs `pnpm perf` on a quiet machine before any slice drawing a game screen closes;
     a failure blocks closing exactly as a verify failure does (D-100). Not assessed and
     insufficient samples never constitute acceptance. No change to CLAUDE.md rule 6.
   - Reports disclose build type, actual command, environment (no hostname), duration,
     sample validity, measured clock resolution, warm-up, allocation scope and error,
     context clock calibration and limitations. Production browser runs use `--build
     production`; which build constitutes acceptance is still OQ-034. Same-machine runs
     do not sign off real Wi-Fi/devices. Browser-round GC attribution, PERF-002 TV runs
     and PERF-030's 30-minute stability scenario remain required when applicable.

4. Update `docs/UAT.md` evidence guidance:

   - Reports are `uat/evidence/<slice>/<out>/perf.json` and `PERF.md`; defaults are
     `simulation/perf` and `<scenario>/perf-<phones>`. Only marked run folders can be
     replaced, and ownership is checked before measurement. Retain reviewed evidence
     in unmarked folders such as `first-run` or `round-1-results`.
   - Run `pnpm perf` for simulations and `pnpm perf -- lobby-8 --phones 1|4|8` for the
     current headed real-pairing scenario; append `--build production` to build/serve
     production. Inspect host and phone screenshots taken after capture stops.
   - Keep D-100's gate: verify enforces transfer sizes plus the short smoke; perf is a
     quiet-machine gate before a slice with a game screen closes. Not assessed and
     insufficient samples never pass. Heaviest level remains the aim; defaults are
     measured until T-05. Leave rule 6 untouched. See tools/perf/README.md for methods.

5. OQ-034 remains a question for Randy: what simulation-time budget, game-only allocation
   guard and acceptance build should apply? Do not record a proposed simulation budget
   as a decision or enforce one. D-100 settles the verify/perf gate only.

6. Record these interpretation/decision sentences:

   - “F-08 measures complete default matches with seeded existing bots, deriving duration
     from each module's isOver; this is repeatable diagnostic coverage, not a claim that
     defaults or random bots exercise the busiest level.”
   - “F-08 uses minimum validity counts of 600 host frames and 100 observations each: complete touch-to-apply traces for PERF-010, touch-to-feedback pairs for PERF-012, with the existing 180-second round length for PERF-001; these do not change
     any performance budget.”
   - “F-08 retains expandInput's existing allocation behaviour: the bot harness bypasses
     network expansion, and its allocations/Node GC cannot justify a reused wire-expansion
     buffer; reassess that change from an attributed real-browser trace before optimising.”
   - “The carried roughly 500 bytes per step in input.ts/drive.ts is not comparable to
     F-08's whole bot-driver allocation figure; use source attribution and a session/browser
     workload to isolate it before setting a limit.”
   - “F-08's timing hook is explicit opt-in and absent from production entry graphs. T/P/R/K
     browser integration must import it only behind import.meta.env.DEV, stamp actual touch,
     accepted receipt, simulation consumption and verified visible feedback, and forward
     events out of band to the local harness; no production wire bytes are added.”
   - “Headless Chromium rAF representativeness has not been demonstrated. Frame-budget
     acceptance requires a visible headed host; the integrator must run that path.”
   - “A sandbox-denied sysctl may use Node RAM and memory_pressure with the same four-GiB
     perf memory threshold, disclosing the existing pressure-level fallback; this does not
     establish a quiet machine.”

7. Integrator: add the script, run and inspect the headed browser matrix, confirm lifecycle
   selectors/visibility/observer support, retain the reports, and repeat full Node measurements
   on a quiet machine. Add picker and actual game/controller/GC/stability scenarios as their
   screens exist. Record shared tracker/backlog/command-document changes and acceptance only
   after independent review and the relevant real-device runs.

## Measured headless results

Round-1 warm measurements: Apple M3, 8 cores, 16 GiB, v24.21.0; OS darwin 27.0.0. Initial load [7.1171875, 7.67724609375, 6.78369140625]; contention unknown (load average cannot establish a quiet machine). All nine allocation hashes match. Node diagnostics do not assess browser budgets.

Command: `node --expose-gc tools/perf/run.mjs --slice F-08-perf-harness --out round-1`. Retained in the unmarked `round-1-results` folder.

| Game | Players | Steps | Median ms | p95 ms | p99 ms | Max ms | Harness B/step | Game B/step ±95% statistical error | Max Node GC ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| peek-poker | 1 | 8486 | 0.000125† | 0.000250 | 0.001042 | 0.488125 | 7205 | 2557 ± 69 | 0.958 |
| peek-poker | 4 | 8551 | 0.000084† | 0.000458 | 0.002125 | 0.181042 | 15208 | 5928 ± 105 | 0.561 |
| peek-poker | 8 | 8742 | 0.000083† | 0.000541 | 0.002375 | 0.141792 | 26953 | 9605 ± 132 | 0.206 |
| rabakz | 1 | 2669 | 0.000125† | 0.000167 | 0.000833 | 0.016583 | 5693 | 1958 ± 108 | 0.198 |
| rabakz | 4 | 2787 | 0.000125† | 0.000250 | 0.001583 | 0.191083 | 12924 | 5778 ± 182 | 0.208 |
| rabakz | 8 | 2813 | 0.000083† | 0.000125† | 0.001666 | 0.011167 | 19645 | 10560 ± 245 | 0.240 |
| tabao-rush | 1 | 12600 | 0.001542 | 0.002875 | 0.006416 | 0.123958 | 12219 | 8767 ± 105 | 1.049 |
| tabao-rush | 4 | 12600 | 0.003416 | 0.007584 | 0.014417 | 0.200209 | 30449 | 19848 ± 158 | 0.311 |
| tabao-rush | 8 | 12600 | 0.006417 | 0.011375 | 0.022584 | 1.455125 | 47664 | 27267 ± 185 | 0.353 |

† Below four measured clock ticks. Per-run measured tick and resolution flags for step, driver and GC statistics are in perf.json and PERF.md. Allocation is sampled managed heap; game scope is games/<id>/** plus packages/sim-core/**, with URL-less built-ins charged to the nearest JavaScript caller. Per-source absolute statistical errors are in JSON; systematic bias remains unknown. Warm-up is a full pass; later V8 compilation can still affect maxima. Tabao Rush round length is conformance scaffolding until T-05. Heaviest level remains the aim; this run measures defaults.

## Final verification

`VITEST_MAX_WORKERS=2 pnpm verify` exited 0.

```text
test memory gate
test memory gate
Evidence captured. Keeping browsers and servers until Ctrl-C (configured overall timeout still applies).
Evidence captured. Keeping browsers and servers until Ctrl-C (configured overall timeout still applies).

 Test Files  140 passed (140)
      Tests  3142 passed | 1 skipped (3143)
   Start at  11:36:34
   Duration  385.37s (transform 2.52s, setup 0ms, import 9.10s, tests 744.56s, environment 10ms)

$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
$ vite build
vite v8.3.8 building client environment for production...
transforming...
✓ 82 modules transformed.
rendering chunks...
computing gzip size...
dist/.vite/manifest.json          0.18 kB │ gzip:  0.14 kB
dist/index.html                   0.48 kB │ gzip:  0.32 kB
dist/assets/index-BPIRmN5K.css   15.53 kB │ gzip:  3.91 kB
dist/assets/index-tRffVSyx.js   114.30 kB │ gzip: 41.53 kB

✓ built in 86ms
PERF-022 host: 130315 bytes raw, 45415 bytes gzip / 1500000
PERF-020 controller (shared entry): 130315 bytes raw, 45415 bytes gzip / 300000
PERF-022 deploy: 130315 bytes raw, 45415 bytes gzip / 1500000
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

All workspace, typecheck, lint, design, unit, build/transfer-budget and trace checks passed. No check or existing limit was changed. Focused perf and runner coverage: 27 passed across five files. Browser launch/production wiring is covered by launcher mocks; headed Chromium, real screenshots and production browser execution remain for the integrator. No browser performance acceptance is claimed.

## Round-2 close-out and carried requests

Manual applied samples without feedback now invalidate PERF-012 coverage even beside
100 correlated touch/feedback pairs. Applicable unassessed feedback and contention exit
non-zero. Contention at either endpoint revokes passes while preserving failures.
The import hook is repository-scoped and independently importable. Reports normalise the
memory gate, distinguish browser measurements from simulation allocation, and record idle
rAF refresh estimates (60 intervals), optional OS refresh, Playwright Chromium/version,
host-clock slow-frame/long-task start times, scenario step boundaries and ending load.

Carry to integration: give the host its own browser instance for frame-budget runs; the
first phone context in the same Chromium is the prime suspect for the integrator's
1,027 ms first frame and 610 ms long task. Replace the Rabakz import in headless.ts with
a module-provided performance data fixture. Timing hooks are development-only, so
`--build production` assesses frames only. PERF-001 specifies Chrome; this harness runs
Playwright Chromium, not branded Chrome; offer channel `chrome` later.

Round-2 verification: `VITEST_MAX_WORKERS=2 pnpm verify` exited 0.
No checks or existing limits changed. Both protected evidence folders are untouched.

```text
 Test Files  140 passed (140)
      Tests  3145 passed | 1 skipped (3146)
   Start at  12:35:03
   Duration  227.37s (transform 1.64s, setup 0ms, import 6.28s, tests 435.92s, environment 8ms)

$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
$ vite build
vite v8.3.8 building client environment for production...
transforming...
✓ 82 modules transformed.
rendering chunks...
computing gzip size...
dist/.vite/manifest.json          0.18 kB │ gzip:  0.14 kB
dist/index.html                   0.48 kB │ gzip:  0.32 kB
dist/assets/index-BPIRmN5K.css   15.53 kB │ gzip:  3.91 kB
dist/assets/index-tRffVSyx.js   114.30 kB │ gzip: 41.53 kB

✓ built in 61ms
PERF-022 host: 130315 bytes raw, 45415 bytes gzip / 1500000
PERF-020 controller (shared entry): 130315 bytes raw, 45415 bytes gzip / 300000
PERF-022 deploy: 130315 bytes raw, 45415 bytes gzip / 1500000
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

Standalone sandbox launcher check: `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/dev.test.ts`
exited 0: one file, five tests passed (688 ms). No launcher-test sandbox failure occurred
in this round's full verification or standalone rerun.
