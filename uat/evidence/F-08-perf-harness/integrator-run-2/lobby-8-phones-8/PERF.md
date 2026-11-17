# lobby-8

Memory gate: {"freePercent":47,"pressureLevel":1,"source":"memcheck.sh"}

Command: node --expose-gc tools/perf/run.mjs lobby-8 --phones 8

Build: development

Each observed context is calibrated by the lowest of five Node round trips; uncertainty is half that round trip plus clock precision. Ordering tolerates 2 ms and clamps only those small negative deltas. Larger inversions remain invalid. This measures local browser scheduling and WebRTC, not real Wi-Fi, phone hardware or display scan-out.

Headless rAF representativeness is unproven. Headed run required for PERF-001. Long tasks are not GC attribution; real-round GC tracing remains required when game screens exist.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[3.380859375,3.8896484375,4.08984375],"contention":"unknown (load average cannot establish a quiet machine)","memoryGate":{"freePercent":47,"pressureLevel":1,"source":"memcheck.sh"},"loadAverageEnd":[4.0400390625,3.99462890625,4.119140625],"contentionEnd":"unknown (load average cannot establish a quiet machine)"}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | Lobby seat transitions are not the busiest game level in a three-minute round |
| PERF-010 | not assessed | No game/controller simulation apply point exists on the lobby |
| PERF-012 | not assessed | No game controller press feedback exists on the lobby |
| PERF-030 | not assessed | Not a 30-minute session; no memory/stuck-input coverage |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Browser: Playwright Chromium (not branded Chrome). No allocation measurement. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| browser | 8 | 1962 | 13.300000 | 14.100000 | 14.300000 | 120.000000 | — | — | 130.000000 |

Clock and resolution flags:
{"scenario":"lobby-8","clockTickMs":0.09999996423721313,"timingResolution":{"framesMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"inputMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"longTasksMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
