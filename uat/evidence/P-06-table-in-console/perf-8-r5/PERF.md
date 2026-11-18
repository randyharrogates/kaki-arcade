# peek-poker-console

Memory gate: {"freePercent":65,"pressureLevel":1,"source":"memcheck.sh"}

Command: node --expose-gc tools/perf/run.mjs peek-poker-console --phones 8 --slice P-06-table-in-console

Build: development

Each observed context is calibrated by the lowest of five Node round trips; uncertainty is half that round trip plus clock precision. Ordering tolerates 2 ms and clamps only those small negative deltas. Larger inversions remain invalid. This measures local browser scheduling and WebRTC, not real Wi-Fi, phone hardware or display scan-out.

Headless rAF representativeness is unproven. Headed run required for PERF-001. Long tasks are not GC attribution; real-round GC tracing remains required when game screens exist.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[5.67138671875,4.91650390625,4.75634765625],"contention":"unknown (load average cannot establish a quiet machine)","memoryGate":{"freePercent":65,"pressureLevel":1,"source":"memcheck.sh"},"loadAverageEnd":[4.26220703125,4.65087890625,4.6650390625],"contentionEnd":"unknown (load average cannot establish a quiet machine)"}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | One console round is diagnostic, not a busiest 180-second round |
| PERF-010 | not assessed | Controller inputs are exercised without instrumented apply timestamps |
| PERF-012 | not assessed | Controller feedback is not instrumented in this table diagnostic |
| PERF-030 | not assessed | Not a 30-minute session; no memory/stuck-input coverage |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Browser: Playwright Chromium (not branded Chrome). No allocation measurement. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| browser | 8 | 1666 | 16.700000 | 17.400000 | 17.600000 | 233.300000 | — | — | 222.000000 |

Clock and resolution flags:
{"scenario":"peek-poker-console","clockTickMs":0.09999996423721313,"timingResolution":{"framesMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"inputMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"longTasksMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
