# installed-games

memory: 54% free (about 8 of 16 GB), pressure level 1; perf needs 4 GB
ok to start


Command: node --expose-gc tools/perf/run.mjs 

Warm-up: one full unmeasured pass before each timing run. Tabao Rush round length is conformance scaffolding until T-05.

Fixed 60 Hz; seed 808; default game settings, seeded bots, full match until isOver (safety cap 216000 steps). Module defaults may not be the heaviest level. Rabakz uses a synthetic default-length bank.

Step timing covers only GameModule.step. Driver timing and allocation include bots, input buffer, driveStep, layout checks, public views and harness bookkeeping. Timings are accelerated CPU runs, not real-time display frames.

Allocation: V8 statistical heap sampling includes collected objects in a separate deterministic run. Approximate 95% relative sampling error is 1.96/sqrt(N); systematic error is unknown. No exact allocation counter exists here. Node GC pauses do not prove browser GC behaviour.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[3.7734375,3.9970703125,5.16064453125],"contention":"unknown (load average cannot establish a quiet machine)","runtime":"Node accelerated simulation","browser":null,"browserVersion":null,"headed":false,"viewport":null,"deviceScaleFactor":null}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-010 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-012 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-030 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Allocation includes the bot/driver harness. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| peek-poker | 1 | 8486 | 0.000083 | 0.000208 | 0.000375 | 0.028292 | 7255.424935 | 2701.335847 | 0.254959 |
| peek-poker | 4 | 8551 | 0.000042 | 0.000167 | 0.001000 | 3.623208 | 14940.687171 | 5650.198573 | 2.621166 |
| peek-poker | 8 | 8742 | 0.000042 | 0.000334 | 0.001416 | 0.047042 | 26962.231984 | 9589.970259 | 0.171292 |
| rabakz | 1 | 2669 | 0.000084 | 0.000125 | 0.000417 | 0.011500 | 5567.973024 | 1970.799550 | 0.149375 |
| rabakz | 4 | 2787 | 0.000084 | 0.000292 | 0.001709 | 0.010041 | 12868.314316 | 5723.823466 | 0.182917 |
| rabakz | 8 | 2813 | 0.000042 | 0.000125 | 0.002750 | 0.064541 | 19690.787060 | 10474.533950 | 0.233209 |
| tabao-rush | 1 | 12600 | 0.001042 | 0.001917 | 0.003709 | 3.983250 | 12004.795556 | 8657.337143 | 1.532833 |
| tabao-rush | 4 | 12600 | 0.002541 | 0.006375 | 0.014208 | 7.259125 | 30236.786032 | 19812.796190 | 1.809875 |
| tabao-rush | 8 | 12600 | 0.004667 | 0.007875 | 0.011750 | 0.244959 | 47489.385397 | 27117.243810 | 0.265833 |

Clock and resolution flags (step and driver statistics):
{"game":"peek-poker","clockTickMs":0.00004099999998175008,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"peek-poker","clockTickMs":0.00004099999995332837,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"peek-poker","clockTickMs":0.00004099999989648495,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"rabakz","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"rabakz","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"rabakz","clockTickMs":0.000041999999893960194,"timingResolution":{"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
