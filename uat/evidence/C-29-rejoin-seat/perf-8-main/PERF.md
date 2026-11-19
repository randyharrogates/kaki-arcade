# peek-poker-console

Memory gate: {"freePercent":70,"pressureLevel":1,"source":"memcheck.sh"}

Command: node --expose-gc tools/perf/run.mjs peek-poker-console --phones 8 --build production --slice C-29-rejoin-seat --out perf-8-main

Build: production

Each observed context is calibrated by the lowest of five Node round trips; uncertainty is half that round trip plus clock precision. Ordering tolerates 2 ms and clamps only those small negative deltas. Larger inversions remain invalid. This measures local browser scheduling and WebRTC, not real Wi-Fi, phone hardware or display scan-out.

Headless rAF representativeness is unproven. Headed run required for PERF-001. Long tasks are not GC attribution; real-round GC tracing remains required when game screens exist.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[2.2236328125,5.31103515625,6.78466796875],"contention":"unknown (load average cannot establish a quiet machine)","memoryGate":{"freePercent":70,"pressureLevel":1,"source":"memcheck.sh"},"loadAverageEnd":[1.89306640625,3.57177734375,5.68115234375],"contentionEnd":"unknown (load average cannot establish a quiet machine)"}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | OS-reported display refresh rate unknown; requires 60 Hz |
| PERF-010 | not assessed | Production builds assess frames only; timing hooks are development-only |
| PERF-012 | not assessed | Production builds assess frames only; timing hooks are development-only |
| PERF-030 | not assessed | Not a 30-minute session; no memory/stuck-input coverage |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Browser identity and version: see perf.json (Chromium is not branded Chrome). No allocation measurement. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| browser | 8 | 13135 | 16.700000 | 18.200000 | 18.600000 | 18.800000 | — | — | — |



Clock and resolution flags:
{"scenario":"peek-poker-console","clockTickMs":0.09999990463256836,"timingResolution":{"framesMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"inputMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"longTasksMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
