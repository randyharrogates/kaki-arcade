# F-08 performance harness (NFR-PERF, PERF-001, PERF-010, PERF-012)

After the integrator adds the requested root script:

```
pnpm perf                         # all installed game modules, full default matches, 1/4/8 players
pnpm perf -- lobby-8               # headed Chromium, eight real paired phone contexts
pnpm perf -- lobby-8 --phones 1     # also supported: 4, 8
pnpm perf -- lobby-8 --headless     # diagnostics; frame budget not assessed
pnpm perf -- lobby-8 --build production # builds with local pairing origins, serves Vite preview
pnpm perf -- --slice F-08-perf-harness --out repeat-1
```

Before script integration use `node --expose-gc tools/perf/run.mjs`. No dependencies
are added. Node 24 strips TypeScript; the entry installs local source resolution hooks.
Evidence ownership is checked before measuring. Simulation defaults to `uat/evidence/simulation/perf/`; `--slice` and `--out` select a different folder. Browser outputs default to `perf-<phones>` so the 1/4/8 matrix is retained. Reviewed reports belong in unmarked folders such as `first-run`, which the runner refuses to replace.

The default command never starts a server or browser. The full run is outside verify;
Vitest discovers `tools/perf/*.test.ts`, including a 12-step fixture smoke.

Simulation runs use the module's fixed-timestep harness until `isOver`, rather than a
hard-coded game length. Unsupported player counts are reported, never substituted.
The 216000-step safety cap is an operational deadline, not a performance threshold;
a match reaching it fails the command. A full unmeasured warm-up precedes each timing run; further V8 compilation may still affect maxima. Tabao Rush round length is conformance scaffolding until T-05. Default module settings are measured, not a
claim to the heaviest rendered level. Rabakz gets a synthetic bank matching its
module-declared default length. Bots are repeatable, not optimal play or a worst-case
workload. The allocation run must reach the same final state hash as the timing run.

`stepMs` times only the game's `step`. `driverMs` includes the existing bots, input
buffer, driveStep and headless harness (including public-view/timeline work). Allocation
covers the latter scope. HeapProfiler sampling at 4096 bytes includes dead objects;
it is a second run because profiling changes timings. `sourceBytesPerStep` attributes
sampled allocations to source files, crediting URL-less V8 built-ins to their nearest JavaScript caller. `gameBytesPerStep` includes only `games/<id>/**` and `packages/sim-core/**`. `source95ErrorBytesPerStep` and `game95ErrorBytesPerStep` give approximate absolute statistical error bars (1.96 × sqrt(sum(sample bytes²)) / steps); systematic bias remains unknown. Source attribution lets reviewers distinguish bot cost from input.ts/drive.ts. V8 sampling is an estimate of managed heap allocation, not exact
bytes and not native memory. Approximate 95% relative error is 1.96/sqrt(sample count),
with unknown systematic error; this is not a rigorous confidence interval. Node GC
entries include harness overhead and exclude forced GC before the measured pass.
No Node time/allocation/GC budgets have been approved. Node GC is not browser GC.

## Adding a browser scenario

Add `uat/perf/<name>.mjs` exporting a `Scenario` (see `browser.ts`); the registry discovers
it without editing a central list. T-, P-, R- and K-track scenarios use the same API.
The **picker slot is pending**: no integrated picker screen is present in this checkout.
Adding `picker.mjs` makes it available automatically. Unknown names fail before stack startup.
`lobby-8` supports 1/4/8 phones, joins all phones, then renames/leaves/returns each in
turn. Its PERF-001/010/012 assessments are explicitly “not assessed”.

The shared UAT runner extension chooses the scenario script and callback and optionally
overrides launch mode. Existing UAT slices retain their defaults and behaviour. All
pairing, context creation, error rules, deadlines, process groups, abort cleanup and
marked evidence ownership come from that runner. Host: 1920×1080, scale 1; phones:
844×390, scale 3, separate touch-enabled contexts. No loopback transport is mocked.

Call `await capture.roundStart()` at actual round entry and `await capture.roundEnd()` at its end. Only the frames and duration between these calls count for PERF-001; lobby frames and duration cannot qualify it. `afterCapture(h)` runs after observers stop, for screenshots. Lobby takes one host and one phone screenshot there.

Only a scenario declaring `busiestRound: true`, with eight players, at least 180 seconds,
600 frame samples, a continuously visible host and headed Chromium can assess PERF-001.
The limit stays p95 ≤16.7 ms and maximum ≤50 ms. Headless rAF has not been validated
as representative; it cannot pass this budget. Inputs require 100 complete traces and
host `getStats()` transport-selected ICE candidates of type host or srflx on both sides (relay, missing stats or zero peers mean not assessed); a declaration of directness is ignored; p95 ≤50 ms. Feedback requires
100 touch/feedback pairs independent of receipt/application. A touch without feedback makes PERF-012 not assessed because coverage is unknown; it can never pass;
every press must be visible within one frame. Sample minima are harness validity rules,
not new performance budgets. Any stated budget failure or applicable budget with insufficient samples exits non-zero. Not-assessed results do not claim acceptance.

A development-only host scenario may set `hostPage` to a local absolute path
on the harness origin (including Vite's workspace `/@fs/` paths). The harness
navigates there instead of creating a room; the scenario must not join phones.
Reports record zero phones. External URLs and production builds are rejected.
`pnpm perf -- rabakz-screen` uses this for the Rabakz dev page: five cycles of
open, eight-seat reveal, same-layout next question and picture layout change,
waiting 800 presentation callbacks. This is diagnostic and does not declare a
180-second round or assess PERF-001.

### Timing integration for future screens

The explicit opt-in hook is `packages/platform/src/harness/perf-timing.ts`. It is absent
from every package export and product dependency graph. Import and install it only in
an `import.meta.env.DEV` branch when game/controller routes exist, with `enabled: true`,
a `now` callback returning `performance.timeOrigin + performance.now()`, a presentation
frame counter and a `record` callback. Disabled construction returns undefined. Current
production routes never import or call it, so they incur zero bytes and zero calls.

A scenario calls `await capture.observe(page)` for each instrumented phone/host and
forwards hook events to `globalThis.__kakiPerfRecord(event)` out of band. The phone
records `touch` at the trusted touch event with the sequence sent by the input sender;
record `feedback` only after checking that the actual pressed visual is present at the
next presentation frame. The host records `receipt` once for the accepted wire input
and `applied` at the actual simulation step consuming that sequence, including the
host presentation frame number. Do not replace `applied` with receipt or a DOM change.
`capture.applied` also accepts a complete trace for custom integrations. Missing and
duplicate traces are disclosed/rejected; clear captures before 16-bit sequence wrap.
Use `h.thumbs(phone)` for real scripted trusted CDP touch events, not synthetic clicks.
The lobby intentionally supplies no gameplay timings. The hook is ready to connect,
but no existing simulation/controller browser route can exercise it yet.

Each `observe(page)` calibrates that context against Node using the smallest of five round trips. Offset is Node midpoint minus browser epoch; residual uncertainty is at least half the chosen RTT plus browser/Node clock precision and possible drift over the scenario. Clock records preserve offset, uncertainty and that context's measured tick; browser reports also retain the Node tick separately. Ordering tolerates 2 ms (small negative deltas clamp to zero); larger inversions remain invalid. Calibration does not remove asymmetric scheduling or clock drift. `capture.applied` custom traces must already use calibrated Node epoch timestamps. Frame counters for touch/feedback must come from the same phone.

All contexts run on one machine. This does not measure real phone
CPU, Wi-Fi delay, panel scan-out or touch hardware. A real-device run remains required.
Long tasks are observed using PerformanceObserver; they are not GC attribution. A full
Tabao browser scenario must add a Chromium GC trace before claiming the document's
no-GC-pause condition. PERF-030 remains unassessed until a 30-minute stability scenario
measures memory growth, crashes and stuck inputs.

## Version 1 evidence schema

Output: `uat/evidence/<slice>/<out>/{.uat-run,perf.json,PERF.md}`. Defaults: simulation/perf for Node; <scenario>/perf-<phones> for browser. Browser runs also contain UAT run metadata and the actual perf command. Build is explicitly development or production; production builds with the local pairing origins before Vite preview starts. Production timing hooks remain absent, so game timing instrumentation must still respect the development-only integration contract.
These are marked run folders: replacing human/unmarked evidence or symlinked parents
is refused by the shared UAT `prepareEvidence`. Copy reviewed evidence outside a
replaceable run if retaining it across repeated counts/commands.

`perf.json` root fields:

| Field | Meaning |
|---|---|
| `schemaVersion` | Integer 1; incompatible changes increment it |
| `layer`, `scenario` | `simulation` or `browser`, and workload identity |
| `machine` | OS/release, CPU/model/core count, total RAM, Node version, initial CPU load averages and contention observation |
| `assessments[]` | Requirement `id`, `status` (`pass`, `fail`, `not assessed`, `insufficient samples`), reason |
| `measurements[]` | Per game/count or browser scenario measurements below |
| `notes[]` | Workload, measurement method and validity limitations |

Simulation entries: game ID, player count, actual steps/simulated seconds, elapsed CPU
wall time, complete flag, final deterministic hash, step/driver time summaries, allocation
method/B per step/sample count/approximate error/source attribution and determinism,
Measured `clockTickMs` (browser clock for frame reports; Node clock for simulation) and `timingResolution` mark each median/p95/p99/max below four ticks as below resolution, in JSON and PERF.md.
GC method/exposed-GC flag/raw pause durations/summary. Browser fields are explicitly
null in Node metadata; a Node pass is never a frame-time pass.

Browser entry: browser name/version, headed flag, viewport, scale factor, phone viewport/
scale/count, measured seconds, sample minima/adequacy, frame/input/feedback/long-task
summaries, observer support, raw frames and long tasks/visibility flag, complete traces,
timing-hook events normalized to Node epoch and incomplete count. Every summary has count, nearest-rank
median/p95/p99, maximum and count over 50; empty quantiles/max are null. Times are ms;
feedback uses presentation-frame counts. PERF.md is a short generated table and links
readers to JSON for full details.

Contention cannot be ruled out from load average. A one-minute load greater than the
logical CPU count is flagged; otherwise it says unknown. A quiet-machine integrator
repeat is required. Mac memory checks retain the 4 GiB perf gate; under denied sysctl,
Node total RAM plus memory_pressure retain the same memory threshold and disclose the
shell helper's existing level-1 pressure fallback. Other systems use Node free RAM.

## Controller cold start (PERF-020, D-129)

`pnpm run build && pnpm perf -- controller` checks the production `/play` entry in
headless Chromium. Under D-148 this is a blocking perf scenario outside verify;
verify retains the transfer-size check. It starts and stops its own Vite preview
on an ephemeral port with `--strictPort`. No signal server or UAT listener is needed
for the initial join controls. The single-page run retains the UAT 3 GiB memory
gate; refusal is a memory refusal, not a measured budget failure.

Each of five runs uses a fresh mobile context at 844 × 390, scale 3, blocked service
workers, disabled/cleared cache, CDP CPU rate 4, and CDP network conditions of
30 Mbit/s down, 15 Mbit/s up and 20 ms latency. A pre-navigation probe waits for fonts,
a visible, hittable room-code control and a presentation frame, then dispatches a
synthetic pointerdown. Its observational page handler marks
`kaki-controller-interactive` without changing form state or performing a join.
The mark's startTime is relative to navigation start; browser automation round trips
are outside the measured interval. The median of five must be ≤ 2000 ms.

This measures the production join controller entry, not the development-only kit demo
or QR-to-seated latency. The existing round/frame harness is deliberately not used:
it opens a host and creates a room before capture, whereas this check measures cold
navigation. Shared UAT process, readiness, port, memory and evidence helpers are reused.
`uat/evidence/controller/perf-1/startup.json` records conditions, browser
version, raw samples, median, threshold and pass/fail. The gitignored, marked `perf-1` folder is
replaced on repeat runs; copy reviewed evidence to an unmarked folder to retain it.
Missing controls/marks or browser/server errors fail the command. No timing result is
claimed until the integrator runs Chromium on a quiet machine.

The transfer-size half follows main's D-115 phone-closure measurement: HTML, the
entry's recursive static import closure (JS, CSS and assets), phone-route chunks and
CSS-referenced public files, counted once. Host-only dynamic imports are excluded;
the whole deployment remains measured against PERF-022. Verify keeps the unchanged
300,000-byte gzip controller threshold. The start-up half runs separately through
`pnpm perf -- controller`; over-budget medians, incomplete samples and browser/server
errors fail, and “not assessed” never passes. Optional `--slice` selects the evidence
parent and `--out perf-controller<name>` selects another gitignored marked run folder. It always
runs one headless production page; `--headed`, `--headless`, `--phones` and `--build` are refused.
To keep a reviewed report, copy `startup.json` into an unmarked folder such as `first-run`.
