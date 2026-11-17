# installed-games

Sandbox fallback: Node totalmem, memory_pressure 54% free; pressure-level sysctl unavailable (memcheck.sh level-1 fallback).

Command: node --expose-gc tools/perf/run.mjs --slice F-08-perf-harness --out round-1

Warm-up: one full unmeasured pass before each timing run. Tabao Rush round length is conformance scaffolding until T-05.

Fixed 60 Hz; seed 808; default game settings, seeded bots, full match until isOver (safety cap 216000 steps). Module defaults may not be the heaviest level. Rabakz uses a synthetic default-length bank.

Step timing covers only GameModule.step. Driver timing and allocation include bots, input buffer, driveStep, layout checks, public views and harness bookkeeping. Timings are accelerated CPU runs, not real-time display frames.

Allocation: V8 statistical heap sampling includes collected objects in a separate deterministic run. Approximate 95% relative sampling error is 1.96/sqrt(N); systematic error is unknown. No exact allocation counter exists here. Node GC pauses do not prove browser GC behaviour.

Machine: {"platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[7.1171875,7.67724609375,6.78369140625],"contention":"unknown (load average cannot establish a quiet machine)","runtime":"Node accelerated simulation","browser":null,"browserVersion":null,"headed":false,"viewport":null,"deviceScaleFactor":null}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-010 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-012 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-030 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |

Time in milliseconds. Statistics below four measured clock ticks are below resolution; see clockTickMs and timingResolution in perf.json. Allocation includes the bot/driver harness. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Game B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| peek-poker | 1 | 8486 | 0.000125 | 0.000250 | 0.001042 | 0.488125 | 7205.415037 | 2556.604289 | 0.958417 |
| peek-poker | 4 | 8551 | 0.000084 | 0.000458 | 0.002125 | 0.181042 | 15207.742720 | 5928.374225 | 0.560583 |
| peek-poker | 8 | 8742 | 0.000083 | 0.000541 | 0.002375 | 0.141792 | 26952.754976 | 9604.851979 | 0.206000 |
| rabakz | 1 | 2669 | 0.000125 | 0.000167 | 0.000833 | 0.016583 | 5693.347321 | 1957.554140 | 0.197875 |
| rabakz | 4 | 2787 | 0.000125 | 0.000250 | 0.001583 | 0.191083 | 12923.941155 | 5778.391102 | 0.207500 |
| rabakz | 8 | 2813 | 0.000083 | 0.000125 | 0.001666 | 0.011167 | 19644.908638 | 10560.489157 | 0.240333 |
| tabao-rush | 1 | 12600 | 0.001542 | 0.002875 | 0.006416 | 0.123958 | 12218.659048 | 8767.173968 | 1.049208 |
| tabao-rush | 4 | 12600 | 0.003416 | 0.007584 | 0.014417 | 0.200209 | 30448.571429 | 19848.109841 | 0.311375 |
| tabao-rush | 8 | 12600 | 0.006417 | 0.011375 | 0.022584 | 1.455125 | 47664.203175 | 27266.570794 | 0.352958 |

Clock and resolution flags (step and driver statistics):
{"game":"peek-poker","clockTickMs":0.00004200000000764703,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"peek-poker","clockTickMs":0.00004200000000764703,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"peek-poker","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"rabakz","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"rabakz","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"below resolution","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"rabakz","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"below resolution","p95":"below resolution","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"tabao-rush","clockTickMs":0.00004099999978279811,"timingResolution":{"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}

{"game":"tabao-rush","clockTickMs":0.00004099999932805076,"timingResolution":{"stepMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"driverMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"},"gcMs":{"median":"resolved","p95":"resolved","p99":"resolved","max":"resolved"}}}
