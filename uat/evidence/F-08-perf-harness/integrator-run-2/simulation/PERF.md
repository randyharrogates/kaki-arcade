# installed-games

Memory gate: {"freePercent":50,"pressureLevel":1,"source":"memcheck.sh"}

Command: node --expose-gc tools/perf/run.mjs

Warm-up: one full unmeasured pass before each timing run. Tabao Rush round length is conformance scaffolding until T-05.

Fixed 60 Hz; seed 808; default game settings, seeded bots, full match until isOver (safety cap 216000 steps). Module defaults may not be the heaviest level. Rabakz uses a synthetic default-length bank.

Step timing covers only GameModule.step. Driver timing and allocation include bots, input buffer, driveStep, layout checks, public views and harness bookkeeping. Timings are accelerated CPU runs, not real-time display frames.

Allocation: V8 statistical heap sampling includes collected objects in a separate deterministic run. Approximate 95% relative sampling error is 1.96/sqrt(N); systematic error is unknown. No exact allocation counter exists here. Node GC pauses do not prove browser GC behaviour.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[2.630859375,3.7529296875,4.04345703125],"contention":"unknown (load average cannot establish a quiet machine)","memoryGate":{"freePercent":50,"pressureLevel":1,"source":"memcheck.sh"},"runtime":"Node accelerated simulation","browser":null,"browserVersion":null,"headed":false,"viewport":null,"deviceScaleFactor":null}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-010 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-012 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-030 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Allocation includes the bot/driver harness. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| peek-poker | 1 | 8486 | 0.000083 | 0.000208 | 0.000500 | 0.037083 | 7104.914447 | 2651.722838 | 0.136584 |
| peek-poker | 4 | 8551 | 0.000042 | 0.000084 | 0.000666 | 0.025917 | 15224.290025 | 5849.024442 | 0.257084 |
| peek-poker | 8 | 8742 | 0.000042 | 0.000250 | 0.001042 | 0.038042 | 27101.138412 | 9687.742851 | 0.096458 |
| rabakz | 1 | 2669 | 0.000083 | 0.000125 | 0.000291 | 0.009250 | 5694.327463 | 1995.431997 | 0.116333 |
| rabakz | 4 | 2787 | 0.000083 | 0.000125 | 0.001042 | 0.014958 | 12914.787226 | 5834.353785 | 0.166792 |
| rabakz | 8 | 2813 | 0.000042 | 0.000083 | 0.000958 | 0.007792 | 19158.492712 | 10172.820476 | 0.133917 |
| tabao-rush | 1 | 12600 | 0.000833 | 0.001792 | 0.005041 | 0.143417 | 12153.576508 | 8764.551111 | 0.187667 |
| tabao-rush | 4 | 12600 | 0.001833 | 0.003958 | 0.007083 | 0.198042 | 30398.373968 | 19805.984127 | 0.204667 |
| tabao-rush | 8 | 12600 | 0.003292 | 0.005209 | 0.010167 | 0.289709 | 47623.923810 | 27266.487619 | 0.250000 |

Clock and resolution flags:
{"scenario":"peek-poker","clockTickMs":0.00004099999998175008,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"peek-poker","clockTickMs":0.00004099999995332837,"timingResolution":{"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"peek-poker","clockTickMs":0.00004099999989648495,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00004099999989648495,"timingResolution":{"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00004099999989648495,"timingResolution":{"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"rabakz","clockTickMs":0.00004099999989648495,"timingResolution":{"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"scenario":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
