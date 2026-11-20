# tabao-rush-tutorial

Memory gate: {"freePercent":67,"pressureLevel":1,"source":"memcheck.sh"}

Command: node --expose-gc tools/perf/run.mjs tabao-rush-tutorial --phones 8 --slice T-10-tutorial --out perf-tutorial

Build: development

Each observed context is calibrated by the lowest of five Node round trips; uncertainty is half that round trip plus clock precision. Ordering tolerates 2 ms and clamps only those small negative deltas. Larger inversions remain invalid. This measures local browser scheduling and WebRTC, not real Wi-Fi, phone hardware or display scan-out.

Headless rAF representativeness is unproven. Headed run required for PERF-001. Long tasks are not GC attribution; real-round GC tracing remains required when game screens exist.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[4.29052734375,7.5625,7.5576171875],"contention":"unknown (load average cannot establish a quiet machine)","memoryGate":{"freePercent":67,"pressureLevel":1,"source":"memcheck.sh"},"loadAverageEnd":[3.75,7.17724609375,7.41845703125],"contentionEnd":"unknown (load average cannot establish a quiet machine)"}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | TR-055 diagnostic: eight scripted cooks, 600 tutorial ticks then leader skip; captures tutorial-to-round texture hand-off and at least 600 frames / 10 seconds of play, not a busiest full round |
| PERF-010 | not assessed | Host-only scripted inputs and leader skip; no phone transport latency |
| PERF-012 | not assessed | No phone feedback in this tutorial renderer scenario |
| PERF-030 | not assessed | Not a 30-minute session; no memory/stuck-input coverage |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Browser identity and version: see perf.json (Chromium is not branded Chrome). No allocation measurement. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| browser | 0 | 1199 | 16.700000 | 18.000000 | 18.600000 | 18.800000 | — | — | — |



Clock and resolution flags:
{"scenario":"tabao-rush-tutorial","clockTickMs":0.09999990463256836,"timingResolution":{"framesMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"inputMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"longTasksMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
