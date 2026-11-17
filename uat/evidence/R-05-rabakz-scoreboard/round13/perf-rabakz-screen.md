# rabakz-screen

Memory gate: {"freePercent":54,"pressureLevel":1,"source":"memcheck.sh"}

Command: node --expose-gc tools/perf/run.mjs rabakz-screen --headless

Build: development

Each observed context is calibrated by the lowest of five Node round trips; uncertainty is half that round trip plus clock precision. Ordering tolerates 2 ms and clamps only those small negative deltas. Larger inversions remain invalid. This measures local browser scheduling and WebRTC, not real Wi-Fi, phone hardware or display scan-out.

Headless rAF representativeness is unproven. Headed run required for PERF-001. Long tasks are not GC attribution; real-round GC tracing remains required when game screens exist.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[6.751953125,8.7265625,9.14208984375],"contention":"unknown (load average cannot establish a quiet machine)","memoryGate":{"freePercent":54,"pressureLevel":1,"source":"memcheck.sh"},"loadAverageEnd":[4.77685546875,8.064453125,8.88720703125],"contentionEnd":"unknown (load average cannot establish a quiet machine)"}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | Repeated dev-page transitions are diagnostic, not a real busiest 180-second round |
| PERF-010 | not assessed | Fixture public snapshots have no controller-to-simulation apply point |
| PERF-012 | not assessed | No phones or controller feedback in this host-only scenario |
| PERF-030 | not assessed | Not a 30-minute session; no memory/stuck-input coverage |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Browser: Playwright Chromium (not branded Chrome). No allocation measurement. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| browser | 0 | 1613 | 16.700000 | 16.800000 | 16.800000 | 33.300000 | — | — | — |

Clock and resolution flags:
{"scenario":"rabakz-screen","clockTickMs":0.09999996423721313,"timingResolution":{"framesMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"inputMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"longTasksMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
