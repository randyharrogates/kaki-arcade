# F-03b / F-03c — review round 2 evidence

Pure input logic has no visible UAT surface. Automated outputs are saved as `.txt` so they
are not git-ignored. The requesting integrator retains independent review and integration.

| Review item | Evidence |
|---|---|
| Late UP rearms a real recovered press after silence | X1 and X1b; UP-DOWN-UP counterpart in `input-edges.test.ts` |
| Applied/history duplicates are stale before queueing | X2; nine-tick oldest-first protocol feed; X3 axes |
| Four-sample wait cap and edge coalescing | X9: 72 ticks at 120 Hz, ten taps; balanced edges and final rest; newest-held/axes collapse test |
| Two recovered taps still count | recovered-history/wrap tests and physical timeline fuzz |
| Hard memory bound | 600 alternating ticks exercise the 256-entry safety net |
| Independent seeded properties | 400 windows, two players, several button flips per tick, axes, silence gaps, carried queues, duplicates and late flickers; every emitted edge consumes one physical transition in order, within four samples; no extras or missing transitions at drainage |
| Identity assertion scope | same Map, frame and axes objects reused; absence of sampling allocation is by code reading |
| Game-facing rule (c) | `input.ts` header; exact proposed Architecture §5 wording under slice Requests |

`tests.txt`: 2 focused files, 31 passing tests, including all 16 reviewer attack cases.
X12 preserves a B tap wholly inside collapse; seeded 40- and 259-tick stalls cover
expiry and the safety bound. Pause discard still drops whole taps; an UP inside
collapse rearms silence suppression. Exact edge-count balance across collapsed
cycles is deliberately not required; final held state remains the newest.
X9 now follows D-068 rather than requiring all stalled taps to replay; X11 follows the wait
cap rather than the superseded tail replacement policy. Other reviewer assertions are retained.
`verify.txt`: authoritative full-workspace verification output. Both outputs were inspected.
Real network latency and engine-internal allocations are not measured here.
