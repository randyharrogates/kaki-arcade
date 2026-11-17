# F-08: the integrator's runs after fix round 2 (2026-11-17)

Dev Mac, one other job running (load about 3.4 at the start and 4.0 at the end; the report
records contention as unknown). These runs show the harness works; they are not accepted
performance results.

- `pnpm perf`: exit 0; report in `simulation/`.
- `pnpm perf -- lobby-8 --phones 8` (visible Playwright Chromium 156, development build):
  exit 0; report and two screenshots in `lobby-8-phones-8/`. The screenshots were not opened
  this time (opened in run 1; the scenario's own checks passed).
- The report now records: the display at 75 Hz (measured 13.3 ms between idle frames; the OS
  says 75), all eight phone links direct (read from the host's WebRTC statistics), each
  step's start and end on the host's clock, the memory gate as one line, and load at the end.
- Frame times over 1,962 frames: median 13.3 ms, 95th percentile 14.1 ms, 99th 14.3 ms,
  worst 120 ms, one long task of 130 ms. Run 1's 1,027 ms frame did not recur. All four
  budgets read "not assessed", as they should for a lobby.
- Not done: 1 and 4 phones, `--headless`, `--build production`, a quiet-machine repeat, the
  host in its own browser instance.
