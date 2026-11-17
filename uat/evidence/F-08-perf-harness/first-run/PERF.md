# installed-games

Sandbox fallback: Node totalmem, memory_pressure 52% free; pressure-level sysctl unavailable (memcheck.sh level-1 fallback).

Fixed 60 Hz; seed 808; default game settings, seeded bots, full match until isOver (safety cap 216000 steps). Module defaults may not be the heaviest level. Rabakz uses a synthetic default-length bank.

Step timing covers only GameModule.step. Driver timing and allocation include bots, input buffer, driveStep, layout checks, public views and harness bookkeeping. Timings are accelerated CPU runs, not real-time display frames.

Allocation: V8 statistical heap sampling includes collected objects in a separate deterministic run. Approximate 95% relative sampling error is 1.96/sqrt(N); systematic error is unknown. No exact allocation counter exists here. Node GC pauses do not prove browser GC behaviour.

Machine: {"hostname":"redacted","platform":"darwin","release":"27.0.0","cpu":"Apple M3","cores":8,"totalMemoryBytes":17179869184,"node":"v24.21.0","loadAverageStart":[3.73486328125,4.08251953125,4.2158203125],"contention":"unknown (load average cannot establish a quiet machine)","runtime":"Node accelerated simulation","browser":null,"browserVersion":null,"headed":false,"viewport":null,"deviceScaleFactor":null}

| Budget | Result | Reason |
|---|---|---|
| PERF-001 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-010 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-012 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |
| PERF-030 | not assessed | Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated |

Time in milliseconds. Allocation includes the bot/driver harness. See perf.json for driver timings, sampling error, scenario length, raw browser samples and input-delay percentiles.

| Game | Players | Samples | Median | p95 | p99 | Max | B/step | Max GC / long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| peek-poker | 1 | 8486 | 0.000084 | 0.000208 | 0.000708 | 0.175042 | 7482.476550 | 0.187459 |
| peek-poker | 4 | 8551 | 0.000042 | 0.000084 | 0.000917 | 0.074375 | 15025.335049 | 0.100458 |
| peek-poker | 8 | 8742 | 0.000042 | 0.000333 | 0.001166 | 0.035208 | 26885.701213 | 0.326167 |
| rabakz | 1 | 2669 | 0.000083 | 0.000125 | 0.001083 | 0.095750 | 5886.798052 | 0.081541 |
| rabakz | 4 | 2787 | 0.000083 | 0.000125 | 0.000833 | 0.036375 | 13774.966631 | 0.091000 |
| rabakz | 8 | 2813 | 0.000083 | 0.000166 | 0.000916 | 0.015458 | 20272.964095 | 0.104750 |
| tabao-rush | 1 | 12600 | 0.000875 | 0.001834 | 0.004667 | 0.465083 | 13119.681270 | 0.098625 |
| tabao-rush | 4 | 12600 | 0.001834 | 0.003917 | 0.006500 | 0.100458 | 30669.852698 | 0.099500 |
| tabao-rush | 8 | 12600 | 0.003166 | 0.004833 | 0.006083 | 0.073667 | 47792.037460 | 0.441917 |
