# C-25 — Detail benchmark in Start preparation

Goal: choose per-game TV detail before Ready (PERF-002, PERF-023).

Acceptance: optional generic host presentation scene; about one second of rAF workload,
initial frames discarded, existing cadence/drop judge reused; per-game TV-local verdicts;
Auto with no scene stays full; lower resources decoded before Ready. ~~Pause settings cycle
Auto/Full/Lower for the next game and reset automatic verdicts.~~ C-13 part 2 owns pause settings. No loading during play.

Implementation: the presentation contract is separate from the pure simulation module,
so game renderer code stays in the host bundle. Start waits on detail selection before
mounting its renderer and before subscribing simulation frames. The detached TV-sized scene
cannot change visible DOM. Sampling costs approximately 1 s, capped by a 1.4 s wall timeout;
resource decoding is normal preparation and adds to total Start time. Synchronous scene
callbacks must remain bounded: JavaScript cannot interrupt a stalled draw.

Tabao Rush remains without a scene. Its renderer owns asynchronous texture loading and its
own recursive rAF; exposing a synchronous busiest-scene draw with shared decoded resources
needs more than a small entry point. T-17 must supply that presentation. Existing renderer
behaviour is unchanged. Explicit lower still passes half detail to the renderer, whose ready
promise already waits for decoding and GPU preparation.

UAT: `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- C-25-detail-benchmark --phones 1 --out round3`.
The development console fixture pairs one real phone, captures Starting at 1920/1280,
records detail.json (including preparation duration in milliseconds), then forces slow drawing and checks lower and half resources at Ready.
The fixture decodes the first real manifest atlas at the selected resolution and records
its URL after decode. Its scene is synthetic; Tabao's representative workload awaits T-17.
DOM test exercises the detached scene and holds half decoding pending to check readiness.

## Close-out

Handoff: the integrator commits and runs DOM tests, verify and UAT to round1.
Checks: the requested broad unit run completed with 1,991 passes, one skip and one
file-list assertion failure caused by the added contract source. After correcting that
assertion, a focused rerun of purity, detail preparation and session adapter passed all
31 tests. Final build typecheck (including the UAT slice), ESLint with zero warnings and
design lint (511 files) passed. TypeScript emitted files were removed with build --clean.
DOM tests and browser evidence remain for the integrator.
No verify, UAT, perf, install, Blender, commit or tracker edits were performed here.

## Requests

Supply Tabao Rush's representative scene in T-17; visually review the existing-token pause
controls at both TV sizes during integration. Review all UAT stills and run the DOM test.
No brief/PRD/game-rule/DESIGN conflict was found. The architecture summary now explicitly
covers the optional host-only presentation declaration alongside the pure game interface.

## Round 2 — review fixes (PERF-002, PERF-023)

The integrator's direction supersedes the round-1 pause controls and cache: no idle-cadence
probe runs at Start, avoiding its approximately 0.5 s cost per launch. Per-game verdicts now
use `createHostDeviceStore` in the platform namespace, with schema validation, the standard
size limit, UA hash (C-13's helper), screen width × height and devicePixelRatio. All three
must match for reuse. Raw-string entries are ignored. Measurements also retain
`lowerBudgetMet: false` when even Lower fails. Setting changes preserve C-13's measurement.
The two pause detail controls and their local state/imports are removed; C-13 part 2 owns UI.

Start uses the shared platform `runDetailBenchmark`, with optional duration, timeout and
warm-up counts; default sampling is unchanged. Duration-based runs retain the full window
even on high-refresh displays rather than stopping at 120 intervals. The browser injects wall timers because the
platform package has no DOM globals. Visible samples with fewer than two valid intervals
select and cache Lower; hidden samples stay Full without caching. Draw, destroy and full
benchmark-asset failures fall back to uncached Full. Half-asset failures still reject Start.
The adapter passes its generation's AbortSignal, cancels sampling on stop/restart, and never
caches cancelled measurements. Frames remain gated behind assets, detail and mounted Ready.

The presentation documentation and fixture require forced drawing work each frame at
viewport × DPR backing dimensions; the fixture scales the atlas to that canvas and reads
one pixel. UAT records Auto, cached second launch, slow, explicit Full and Auto without a
scene in `detail.json`, including scene-run counts and preparation cost. Every run resets
to 1920 × 1080; 1280 stills are taken only after sampling and cost recording finish.

Validation: the requested unit suite passed (99 files, 1,628 tests passed, one skipped).
Build typecheck including UAT passed; emitted files were deleted with build --clean.
ESLint passed with zero warnings. Design lint passed (511 files). The final unit/typecheck
rerun covers the timer-source and lint corrections. No verify, DOM tests, UAT, perf,
installation, commits or tracker edits were performed.

### Close-out and Requests

The integrator runs DOM tests, verify and UAT, reviews all stills and `detail.json`, and
commits. The old request to review pause detail controls no longer applies. Tabao's
representative scene remains T-17's responsibility. No scope conflict was found; the
integrator explicitly authorised the cache without D-113's idle probe in this round.

Exact UAT command (not run here):

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5330 KAKI_PORT_SIGNAL=5331 KAKI_PORT_UAT=5332 pnpm uat -- C-25-detail-benchmark --phones 1 --out round3
```

## Round 3 — re-review fixes (PERF-002, PERF-023)

Invalid benchmark decisions now return uncached Full before saving. The zero-interval unit
case covers this fallback; the visible timeout continues to produce valid, cached Lower.
Each UAT scenario clears its asset and atlas record. Cached, explicit Full and no-scene
runs assert Full with neither record present. Auto captures a three-frame Starting… strip
at 1920, approximately 300 ms apart while sampling.

### D-289 — ready for the integrator to record

The host presentation may optionally supply `benchmarkScene`. Sampling lasts 1 s after
5 warm-up frames, with a 1.4 s timeout. Timeout gives cached Lower; hidden, invalid,
cancelled or failed sampling gives uncached Full. Verdicts are cached per game by UA hash,
screen size and DPR, without an idle probe. This amends D-113's key because the probe costs
approximately 0.5 s on every Start.

### Close-out and Requests

N4: on Lower, T-17 must release the full benchmark resources before Ready.
The integrator records D-289, runs UAT with `--out round3`, and reviews the Starting… strip
and scenario records.

Validation: focused Vitest passed (1 file, 10 tests); apps/web Vitest passed (53 files,
552 tests), sequentially with two workers, the requested exclusions and a 10-minute limit
each. Build typecheck and build --clean passed. ESLint passed with zero warnings on changed
code paths; the Markdown slice note is ignored by repository configuration (the final
invocation used --no-warn-ignored). Diff whitespace check passed. No verify, installs,
UAT, commits or shared tracker edits were performed.
