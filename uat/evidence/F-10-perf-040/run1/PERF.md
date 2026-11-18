# installed-games

Memory gate: {"freePercent":63,"pressureLevel":1,"source":"memcheck.sh"}

Command: node --expose-gc tools/perf/run.mjs

PERF-040: at least 10000 eight-player step samples across complete seeded matches (about 100 upper-tail observations for p99); 1/4 players diagnostic.

Warm-up: one full unmeasured pass before each timing run. Tabao Rush round length is conformance scaffolding until T-05.

Fixed 60 Hz; seed 808; default game settings, seeded bots, full match until isOver (safety cap 216000 steps). Module defaults may not be the heaviest level. Rabakz uses a synthetic default-length bank.

Step timing covers only GameModule.step. Driver timing and allocation include bots, input buffer, driveStep, layout checks, public views and harness bookkeeping. Timings are accelerated CPU runs, not real-time display frames.

Allocation: V8 statistical heap sampling includes collected objects in a separate deterministic run. Approximate 95% relative sampling error is 1.96/sqrt(N); systematic error is unknown. No exact allocation counter exists here. Node GC pauses do not prove browser GC behaviour.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[1.8115234375,3.01123046875,4.107421875],"contention":"unknown (load average cannot establish a quiet machine)","loadAverageEnd":[1.8115234375,3.01123046875,4.107421875],"contentionEnd":"unknown (load average cannot establish a quiet machine)","memoryGate":{"freePercent":63,"pressureLevel":1,"source":"memcheck.sh"},"runtime":"Node accelerated simulation","browser":null,"browserVersion":null,"headed":false,"viewport":null,"deviceScaleFactor":null}

| Budget | Result | Reason |
|---|---|---|
| PERF-040 (peek-poker) | pass | Eight-player step p95 ≤1.67 ms; p99 ≤3.34 ms |
| PERF-040 (rabakz) | pass | Eight-player step p95 ≤1.67 ms; p99 ≤3.34 ms |
| PERF-040 (tabao-rush) | pass | Eight-player step p95 ≤1.67 ms; p99 ≤3.34 ms |
| PERF-001 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |
| PERF-010 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |
| PERF-012 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |
| PERF-030 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Allocation includes the bot/driver harness. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| peek-poker | 1 | 8486 | 0.000083 | 0.000125 | 0.000334 | 0.050291 | 6893.954278 | 2663.932123 | 0.245833 |
| peek-poker | 4 | 8551 | 0.000042 | 0.000125 | 0.001000 | 0.023166 | 14295.087826 | 5687.785756 | 0.281792 |
| peek-poker | 8 | 8742 | 0.000042 | 0.000250 | 0.001042 | 0.031917 | 25460.562800 | 7193.331503 | 0.169584 |
| rabakz | 1 | 2669 | 0.000083 | 0.000125 | 0.000333 | 0.009792 | 6190.717123 | 2573.512177 | 0.116375 |
| rabakz | 4 | 2787 | 0.000083 | 0.000125 | 0.000875 | 0.007209 | 12912.430571 | 6069.054898 | 0.206542 |
| rabakz | 8 | 2813 | 0.000083 | 0.000167 | 0.001042 | 0.017458 | 20465.564166 | 11534.782794 | 0.147000 |
| tabao-rush | 1 | 12600 | 0.000791 | 0.001250 | 0.001708 | 0.116833 | 12013.284444 | 8716.574603 | 0.125583 |
| tabao-rush | 4 | 12600 | 0.001708 | 0.003291 | 0.004375 | 0.130541 | 30244.713016 | 19806.459683 | 0.133791 |
| tabao-rush | 8 | 12600 | 0.003166 | 0.004833 | 0.005875 | 0.105667 | 47550.893968 | 27110.983492 | 0.172459 |

Clock and resolution flags:
{"scenario":"peek-poker","clockTickMs":0.00004099999998175008,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"peek-poker","clockTickMs":0.00004099999995332837,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"peek-poker","clockTickMs":0.00004099999995332837,"timingResolution":{"assessmentStepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00004099999989648495,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00004099999989648495,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00004099999989648495,"timingResolution":{"assessmentStepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"assessmentStepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
