# F-03 simulation core: evidence report

Nothing in this issue is visible to a player, so there are no screenshots. The evidence is
the full `pnpm verify` run (`verify.txt`, exit 0, 335 tests) and the per-test listing for
`packages/sim-core` (`sim-core-tests.txt`, 200 tests). Both were regenerated after review round 2 from the tree that was then committed, and read.

| # | Acceptance statement | Result | Shown by |
|---|---|---|---|
| 1 | Seeded generator: plain serialisable state; float, int range, pick, shuffle, fork by label; output pinned by known answers | pass | `sim-core-tests.txt`: `rng.test.ts > known answers ...` (9 tests), `the generator`, `splitRng`, `forkRng`, `helpers` |
| 2 | Fixed-timestep driver: caller-owned clock, whole steps, catch-up cap, alpha, `step(state, inputs, dt)` plumbing | pass | `timestep.test.ts > advanceClock`, `createSimLoop`, `runSteps` |
| 3 | Input buffer: latest wins, sequence numbers, loss/duplication/reordering, edges, no missed tap, no stuck button | pass | `input.test.ts > latest state wins`, `taps are not missed`, `no stuck buttons`, `sequence numbers that wrap`, `what game rules meet at the edges`, `sampled frames are borrowed`, `required options`, `against a simulated bad link` |
| 4 | Snapshot helpers: deep freeze, structural clone, stable hash, record and replay | pass | `snapshot.test.ts`, `replay.test.ts > record and replay` |
| 5 | Determinism: same seed and inputs give the same hash at each of 10,000 steps; different seed differs | pass | `replay.test.ts > determinism (PLAT-032)` |
| 6 | Library source mentions no clock, timer or unseeded random source | pass | `purity.test.ts` (5 tests, including the scanner's own self-check on 48 bad and 15 good samples) |
| 7 | Driver overhead per step is tiny and the test is not flaky | pass | `verify.txt` lines `[sim-core overhead]`: 0.012 µs (clock + loop), 0.263 µs (with 8 controllers); limits 5 µs and 20 µs |
| 8 | `pnpm verify` passes completely | pass | `verify.txt`, last line `exit code: 0` |

## Review round 1

| Finding | Result | Shown by (`sim-core-tests.txt`) |
|---|---|---|
| 1 `deepFreeze` descends through frozen values; path-naming error | pass | `snapshot.test.ts > deepFreeze > goes all the way down ...`, `freezes a shallow-frozen level table ...`, `refuses what is not plain data ...` |
| 2 Sequence wrap; options required | pass | `input.test.ts > required options` (3 tests) |
| 3 Sampled frames read-only in the types | pass | `input.test.ts > sampled frames are borrowed`; the `@ts-expect-error` lines are checked by `tsc -b` in `verify.txt` |
| 4 Edge semantics | pass | `input.test.ts > what game rules meet at the edges` |
| 5 Button range checks | pass | `input.test.ts > bad input and bookkeeping > handles all 32 buttons as an unsigned mask` |
| 6 Purity scan | pass | `purity.test.ts` |
| 7 `splitRng` | pass | `rng.test.ts > splitRng` (4 tests) |
| 8 Snapshot, replay and loop gaps | pass | `snapshot.test.ts > hashState > refuses an array with a hole ...`, `supports 64-bit integer arrays`, `refuses a state that refers to itself, naming where`, `handles nesting far deeper ...`; `replay.test.ts > ... does not match when the recording has more or fewer hashes ...`; `timestep.test.ts > createSimLoop > when a step throws ...` (2 tests) |

## Review round 2

| Finding | Result | Shown by (`sim-core-tests.txt`) |
|---|---|---|
| M1 hand-frozen or non-extensible Map or Set refused | pass | `snapshot.test.ts > deepFreeze > refuses a Map that was frozen by hand ...`, `refuses a Set that was frozen by hand`, `refuses a Set or Map that was sealed or made non-extensible`, `accepts a Map or Set it froze itself ...` |
| S1 `discardEdges` for resume | pass | `input.test.ts > discardEdges: resuming from a pause` (9 tests) |
| S2 `reset` uses its own record | pass | `input.test.ts > what game rules meet at the edges > reset reads what the game last saw from its own record ...` |
| S3 `onStep` throw counted correctly | pass | `timestep.test.ts > createSimLoop > when onStep throws ...`, `a throw comes after sampleInputs ...` |
| S4 `__proto__` key refused | pass | `snapshot.test.ts > hashState > refuses an own property named __proto__, naming where` |
| `normaliseAxes` | pass | `input.test.ts > normaliseAxes` (5 tests) |
| `age` is -1 until something is heard | pass | `input.test.ts > latest state wins > starts at rest`, `no stuck buttons > reset releases what is held ...` |
| `resetClock` keeps the total | pass | `timestep.test.ts > advanceClock > resetClock forgets banked time but keeps the running total of dropped time` |
| Recording to and from JSON; string seed | pass | `replay.test.ts > record and replay > a recording saved as JSON text ...`, `takes a string seed ...`, `refuses to decode what is not a recording`; `snapshot.test.ts > encodeState and decodeState` (5 tests) |
| Frozen state and the generator; `remove` gives no release | pass | `rng.test.ts > the generator > throws when drawn from inside a frozen state ...`; `input.test.ts > ... > a removed controller gets no release ...` |
| Purity scan additions | pass | `purity.test.ts > the scanner catches each forbidden thing ...` |
