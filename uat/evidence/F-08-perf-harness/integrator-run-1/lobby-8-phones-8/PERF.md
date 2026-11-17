# lobby-8

Command: node --expose-gc tools/perf/run.mjs -- lobby-8 --phones 8

Build: development

Each observed context is calibrated by the lowest of five Node round trips; uncertainty is half that round trip plus clock precision. Ordering tolerates 2 ms and clamps only those small negative deltas. Larger inversions remain invalid. This measures local browser scheduling and WebRTC, not real Wi-Fi, phone hardware or display scan-out.

Headless rAF representativeness is unproven. Headed run required for PERF-001. Long tasks are not GC attribution; real-round GC tracing remains required when game screens exist.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[8.71044921875,5.33740234375,5.57275390625],"contention":"detected (one-minute load exceeds logical CPUs)"}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | Lobby seat transitions are not the busiest game level in a three-minute round |
| PERF-010 | not assessed | No game/controller simulation apply point exists on the lobby |
| PERF-012 | not assessed | No game controller press feedback exists on the lobby |
| PERF-030 | not assessed | Not a 30-minute session; no memory/stuck-input coverage |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Allocation includes the bot/driver harness. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| browser | 8 | 1717 | 13.300000 | 14.800000 | 15.300000 | 1027.100000 | — | — | 610.000000 |

Clock and resolution flags (step and driver statistics):
{"clockTickMs":0.09999996423721313,"timingResolution":{"framesMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"inputMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"longTasksMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
