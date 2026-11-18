# tabao-rush-screen

Memory gate: {"freePercent":66,"pressureLevel":1,"source":"memcheck.sh"}

Command: node --expose-gc tools/perf/run.mjs tabao-rush-screen --phones 8 --slice T-07-tv-renderer --out perf-r7

Build: development

Each observed context is calibrated by the lowest of five Node round trips; uncertainty is half that round trip plus clock precision. Ordering tolerates 2 ms and clamps only those small negative deltas. Larger inversions remain invalid. This measures local browser scheduling and WebRTC, not real Wi-Fi, phone hardware or display scan-out.

Headless rAF representativeness is unproven. Headed run required for PERF-001. Long tasks are not GC attribution; real-round GC tracing remains required when game screens exist.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[2.16650390625,4.37353515625,6.54296875],"contention":"unknown (load average cannot establish a quiet machine)","memoryGate":{"freePercent":66,"pressureLevel":1,"source":"memcheck.sh"},"loadAverageEnd":[2.90576171875,4.35009765625,6.458984375],"contentionEnd":"unknown (load average cannot establish a quiet machine)"}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | Seeded scripted eight-cook simulation is diagnostic until a busiest-round capture is reviewed |
| PERF-010 | not assessed | Host-only scripted inputs have no phone transport latency |
| PERF-012 | not assessed | No phone feedback in this renderer scenario |
| PERF-030 | not assessed | Not a 30-minute session; no memory/stuck-input coverage |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Browser: Playwright Chromium (not branded Chrome). No allocation measurement. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| browser | 0 | 1800 | 16.700000 | 18.400000 | 18.700000 | 18.800000 | — | — | — |

Clock and resolution flags:
{"scenario":"tabao-rush-screen","clockTickMs":0.09999996423721313,"timingResolution":{"framesMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"inputMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"longTasksMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
