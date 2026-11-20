# installed-games

Memory gate: {"freePercent":63,"pressureLevel":1,"source":"memcheck.sh"}

Command: node --expose-gc tools/perf/run.mjs

PERF-040: at least 10000 eight-player step samples across complete seeded matches (about 100 upper-tail observations for p99); 1/4 players diagnostic.

Warm-up: one full unmeasured pass before each timing run. Tabao Rush round length is conformance scaffolding until T-05.

Fixed 60 Hz; successive assessment seeds from 808 (recorded per game); default game settings, seeded bots, full match until isOver (safety cap 216000 steps). Module defaults may not be the heaviest level. Rabakz uses a synthetic default-length bank.

Step timing covers only GameModule.step. Driver timing and allocation include bots, input buffer, driveStep, layout checks, public views and harness bookkeeping. Timings are accelerated CPU runs, not real-time display frames.

Allocation: V8 statistical heap sampling includes collected objects in a separate deterministic run. Approximate 95% relative sampling error is 1.96/sqrt(N); systematic error is unknown. No exact allocation counter exists here. Node GC pauses do not prove browser GC behaviour.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[5.9853515625,5.5732421875,5.66357421875],"contention":"unknown (load average cannot establish a quiet machine)","loadAverageEnd":[5.826171875,5.546875,5.65380859375],"contentionEnd":"unknown (load average cannot establish a quiet machine)","memoryGate":{"freePercent":63,"pressureLevel":1,"source":"memcheck.sh"},"runtime":"Node accelerated simulation","browser":null,"browserVersion":null,"headed":false,"viewport":null,"deviceScaleFactor":null}

| Budget | Result | Reason |
|---|---|---|
| PERF-040 (peek-poker) | pass | 17,372 steps over 2 matches; p95 0.000208 ms ≤ 1.67; p99 0.000916 ms ≤ 3.34 |
| PERF-040 (rabakz) | pass | 11,092 steps over 4 matches; p95 0.000084 ms ≤ 1.67; p99 0.001 ms ≤ 3.34 |
| PERF-040 (tabao-rush) | pass | 12,788 steps over 1 match; p95 0.0075 ms ≤ 1.67; p99 0.0112 ms ≤ 3.34 |
| PERF-001 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |
| PERF-010 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |
| PERF-012 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |
| PERF-030 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Allocation includes the bot/driver harness. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples (first match) | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| peek-poker | 1 | 8486 | 0.000083 | 0.000125 | 0.000375 | 0.096959 | 6899.162856 | 2647.049729 | 0.137250 |
| peek-poker | 4 | 8551 | 0.000042 | 0.000125 | 0.000958 | 0.023166 | 14077.886563 | 5616.445328 | 0.131208 |
| peek-poker | 8 | 8742 | 0.000042 | 0.000250 | 0.001042 | 0.040792 | 25898.852437 | 9461.888813 | 0.122500 |
| rabakz | 1 | 2669 | 0.000084 | 0.000125 | 0.000458 | 0.010458 | 6059.947546 | 2348.990633 | 0.130375 |
| rabakz | 4 | 2787 | 0.000083 | 0.000166 | 0.000958 | 0.012959 | 13401.357732 | 6111.678507 | 0.152625 |
| rabakz | 8 | 2813 | 0.000042 | 0.000084 | 0.001291 | 0.009791 | 20610.269463 | 11480.807679 | 0.198917 |
| tabao-rush | 1 | 12631 | 0.000958 | 0.001750 | 0.004084 | 0.084208 | 13226.328240 | 9362.534083 | 0.140625 |
| tabao-rush | 4 | 12633 | 0.001959 | 0.003708 | 0.006875 | 0.093000 | 27868.994538 | 16095.120399 | 0.137084 |
| tabao-rush | 8 | 12788 | 0.004458 | 0.007500 | 0.011166 | 0.028000 | 52980.397873 | 30344.492337 | 0.136583 |



PERF-040 assessment samples (milliseconds):

| Game | Matches | Seeds | Samples | Median | p95 | p99 | Max |
|---|---:|---|---:|---:|---:|---:|---:|
| peek-poker | 2 | 808, 809 | 17372 | 0.000042 | 0.000208 | 0.000916 | 0.0656 |
| rabakz | 4 | 808, 809, 810, 811 | 11092 | 0.000042 | 0.000084 | 0.001 | 0.0137 |
| tabao-rush | 1 | 808 | 12788 | 0.00446 | 0.0075 | 0.0112 | 0.028 |

Clock and resolution flags:
{"scenario":"peek-poker","clockTickMs":0.00004099999998175008,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"peek-poker","clockTickMs":0.00004099999995332837,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"peek-poker","clockTickMs":0.00004099999989648495,"timingResolution":{"assessmentStepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00004099999989648495,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00004099999989648495,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00004099999989648495,"timingResolution":{"assessmentStepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"assessmentStepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
