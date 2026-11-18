# installed-games

Memory gate: {"freePercent":63,"pressureLevel":1,"source":"memcheck.sh"}

Command: node --expose-gc tools/perf/run.mjs

PERF-040: at least 10000 eight-player step samples across complete seeded matches (about 100 upper-tail observations for p99); 1/4 players diagnostic.

Warm-up: one full unmeasured pass before each timing run. Tabao Rush round length is conformance scaffolding until T-05.

Fixed 60 Hz; successive assessment seeds from 808 (recorded per game); default game settings, seeded bots, full match until isOver (safety cap 216000 steps). Module defaults may not be the heaviest level. Rabakz uses a synthetic default-length bank.

Step timing covers only GameModule.step. Driver timing and allocation include bots, input buffer, driveStep, layout checks, public views and harness bookkeeping. Timings are accelerated CPU runs, not real-time display frames.

Allocation: V8 statistical heap sampling includes collected objects in a separate deterministic run. Approximate 95% relative sampling error is 1.96/sqrt(N); systematic error is unknown. No exact allocation counter exists here. Node GC pauses do not prove browser GC behaviour.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[20.228515625,19.63720703125,19.77490234375],"contention":"detected (one-minute load exceeds logical CPUs)","loadAverageEnd":[21.0908203125,19.82568359375,19.84033203125],"contentionEnd":"detected (one-minute load exceeds logical CPUs)","memoryGate":{"freePercent":63,"pressureLevel":1,"source":"memcheck.sh"},"runtime":"Node accelerated simulation","browser":null,"browserVersion":null,"headed":false,"viewport":null,"deviceScaleFactor":null}

| Budget | Result | Reason |
|---|---|---|
| PERF-040 (peek-poker) | not assessed | 17,372 steps over 2 matches; p95 0.0007090000001426233 ms ≤ 1.67; p99 0.0031249999999545253 ms ≤ 3.34; contention |
| PERF-040 (rabakz) | not assessed | 11,092 steps over 4 matches; p95 0.0002909999998337298 ms ≤ 1.67; p99 0.004750000000058208 ms ≤ 3.34; contention |
| PERF-040 (tabao-rush) | not assessed | 12,600 steps over 1 matches; p95 0.01687500000025466 ms ≤ 1.67; p99 0.0406249999996362 ms ≤ 3.34; contention |
| PERF-001 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |
| PERF-010 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |
| PERF-012 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |
| PERF-030 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; allocation and GC remain diagnostic |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Allocation includes the bot/driver harness. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples (first match) | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| peek-poker | 1 | 8486 | 0.000208 | 0.000375 | 0.001541 | 0.241875 | 6927.666274 | 2731.443790 | 0.525083 |
| peek-poker | 4 | 8551 | 0.000167 | 0.000500 | 0.003041 | 0.771667 | 14460.790083 | 5773.403812 | 3.815584 |
| peek-poker | 8 | 8742 | 0.000125 | 0.000875 | 0.003750 | 0.555333 | 25652.797072 | 9522.909174 | 0.525583 |
| rabakz | 1 | 2669 | 0.000250 | 0.000292 | 0.001375 | 0.066334 | 6033.303859 | 2298.152117 | 0.469250 |
| rabakz | 4 | 2787 | 0.000209 | 0.000459 | 0.004334 | 0.096125 | 12977.156799 | 6161.294582 | 0.560458 |
| rabakz | 8 | 2813 | 0.000125 | 0.000375 | 0.006042 | 0.514000 | 20167.488091 | 10975.934589 | 0.759000 |
| tabao-rush | 1 | 12600 | 0.002166 | 0.003417 | 0.007042 | 0.547541 | 12138.001905 | 8830.073651 | 0.527625 |
| tabao-rush | 4 | 12600 | 0.004708 | 0.009583 | 0.013333 | 0.239209 | 30285.865397 | 19721.707937 | 0.396000 |
| tabao-rush | 8 | 12600 | 0.009250 | 0.016875 | 0.040625 | 1.840709 | 46958.236825 | 26718.146667 | 0.975208 |



PERF-040 assessment samples (milliseconds):

| Game | Matches | Seeds | Samples | Median | p95 | p99 | Max |
|---|---:|---|---:|---:|---:|---:|---:|
| peek-poker | 2 | 808, 809 | 17372 | 0.00012500000002546585 | 0.0007090000001426233 | 0.0031249999999545253 | 0.8204999999998108 |
| rabakz | 4 | 808, 809, 810, 811 | 11092 | 0.00012500000002546585 | 0.0002909999998337298 | 0.004750000000058208 | 0.5140000000001237 |
| tabao-rush | 1 | 808 | 12600 | 0.009250000000065484 | 0.01687500000025466 | 0.0406249999996362 | 1.8407090000000608 |

Clock and resolution flags:
{"scenario":"peek-poker","clockTickMs":0.00004200000000764703,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"peek-poker","clockTickMs":0.00004100000001017179,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"peek-poker","clockTickMs":0.000041999999893960194,"timingResolution":{"assessmentStepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.000041000000237545464,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00008299999990413198,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00004099999978279811,"timingResolution":{"assessmentStepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999932805076,"timingResolution":{"assessmentStepMs":null,"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999932805076,"timingResolution":{"assessmentStepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
