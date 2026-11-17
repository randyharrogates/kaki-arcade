# F-08: the integrator's first runs (2026-11-17)

Run on the dev Mac with two other jobs running (one-minute load 8.7 at the start of the
browser run; the report itself says "contention detected"). These runs show that the harness
works. They are not performance results.

- `pnpm perf` (simulation layer): exit 0 on a fresh checkout in about five seconds; nine
  matches; report in `simulation/`. Fault seen: the generated PERF.md contains the memory
  check's two output lines.
- `pnpm perf -- lobby-8 --phones 8` (visible Chromium, development build): the first attempt
  failed before any browser opened because the runner's import hook rewrote imports inside
  Playwright's package; fixed by the integrator (`tools/perf/run.mjs`). The second attempt:
  exit 0; report and two screenshots in `lobby-8-phones-8/`. Both screenshots opened: the TV
  shows eight seats named "Renamed 1" to "Renamed 8", each "Good", seat 1 the leader; phone 1
  shows its seat, "You're in." and its controls.
- Frame times over 1,717 frames: median 13.3 ms, 95th percentile 14.8 ms, 99th 15.3 ms,
  worst 1,027 ms, longest long task 610 ms. PERF-001, PERF-010, PERF-012 and PERF-030 all
  read "not assessed", as they should for a lobby. The 1 s frame and the 610 ms long task
  happened under contention; they must be looked at again on a quiet machine before anything
  is concluded about the lobby.
- Not done: runs at 1 and 4 phones, `--headless`, `--build production`, a quiet-machine
  repeat.
