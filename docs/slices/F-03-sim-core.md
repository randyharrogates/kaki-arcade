# Slice F-03 — Simulation core

Issue F-03 in `docs/backlog/F-foundation.md`, wave 1. Branch `issue/F-03-sim-core`.

## Goal

`@kaki/sim-core`: the pieces every game's pure rules and the host's frame loop are built from.
A seeded random-number generator, a fixed-timestep driver, an input buffer and snapshot
helpers. F-04 defines `GameModule` on top of it.

## Requirement IDs

| ID | Covered | Which part |
|---|---|---|
| PLAT-032 | partly | The means of meeting it: seeded randomness, a driver that never reads a clock, a deterministic `step(state, inputs, dt)` path, hashing and replay to prove determinism, and a test that the package itself touches no clock, timer or unseeded random source. The requirement is `done` only when the games' rules pass F-04's conformance kit. |

It also serves NET-005 (no stuck buttons) on the host side, and the "fixed timestep" and "no
allocation in the frame loop" lines of `docs/PERFORMANCE.md` §2. Neither is claimed here.

## Acceptance

1. **Random numbers.** State is four unsigned 32-bit integers in a plain object that survives
   JSON. Helpers: float, float in a range, whole number in an inclusive range without bias,
   chance, pick, shuffle in place, shuffled copy, clone, fork by label. Known-answer tests pin
   the output for seven seeds, the helpers and the forks.
2. **Fixed timestep.** The caller passes elapsed time; the driver returns whole steps, caps
   catch-up, reports dropped time and gives an interpolation alpha from 0 up to (not including)
   1. Bad elapsed values (negative, infinite, not a number) count as nothing. A loop object
   calls `sampleInputs(tick)` then `step(state, inputs, stepMs)` once per step.
3. **Input buffer.** Latest state wins per controller by sequence number. A repeat does
   nothing. An older packet never changes what is held. A tap shorter than one step appears as
   pressed and released in the same frame. A tap whose packets arrive out of order is still
   reported, once. A lost release is corrected by any later state. A controller silent while
   holding something is released after a set number of steps.
4. **Snapshots.** `deepFreeze`, `cloneState`, `hashState` (16 hex characters, pinned by known
   answers), and `createRecorder` / `replay` (seed plus input log gives identical hashes, and
   a mismatch is reported with its step).
5. **Determinism.** A toy game run for 10,000 steps with four controllers over a lossy link
   gives the same hash at every step from the same seed and inputs; a different seed or one
   changed input gives a different hash.
6. **Purity.** A test scans the non-test files of `packages/sim-core/src` and fails on
   `Math.random`, `Date.now`, `new Date`, `performance.now`, `setTimeout`, `setInterval` and
   a few relatives, and on any import from outside the package. This test catches accidents
   only: it is a text search and can be got round. The real proof of PLAT-032 is behavioural,
   replay-hash equality, which every game must pass in F-04's conformance kit.
7. **Overhead.** A test measures the driver's own cost per step and asserts it is tiny,
   with a limit far enough above the measurement not to be flaky.
8. `pnpm verify` passes completely.

## UAT

Nothing a player sees. Evidence is text in `uat/evidence/F-03-sim-core/`: `verify.txt` (the
whole of `pnpm verify`), `sim-core-tests.txt` (each test by name) and `REPORT.md`.

## Out of scope

- The `GameModule` types and conformance kit (F-04), the dev harness (F-05), the performance
  harness (F-08).
- Wire message shapes and validators (F-02). The buffer takes `(id, seq, buttons, axes)`.
- The frame callback, pause handling and reconnect logic on the host (track R).
- The lint rule for pure code (root config; see Requests).

---

## The API, for F-04 and the games

Everything is exported from `@kaki/sim-core`.

**Random numbers** (`rng.ts`). `RngState` is `{ a, b, c, d }`; keep it inside the game state.
`createRng(seed)` takes a whole number from 0 to 2^53 - 1 or any string. Drawing functions
(`nextU32`, `nextFloat`, `nextFloatBetween`, `nextInt(min, max)` both ends inclusive,
`nextChance`, `pick`, `shuffle`, `shuffled`) **advance the state in place**. A step that
returns a new state without touching the old one starts with `cloneRng(state.rng)`.
Two ways to get a sub-stream:

- `forkRng(rng, label)` does **not** advance the parent. For named sub-streams at set-up
  that must not disturb each other (`forkRng(root, 'deck')`, `forkRng(root, 'orders')`).
  The same label from the same parent state gives the same stream every time.
- `splitRng(rng, label)` **does** advance the parent (two draws). For anything that recurs
  during play: a new deck each round is `splitRng(state.rng, 'deck')`.

**Timestep** (`timestep.ts`). `createStepClock({ stepMs, maxCatchUpSteps, snapToleranceMs })`
and `advanceClock(clock, elapsedMs)`; results are left on the clock (`steps`, `alpha`,
`droppedMs`) so a frame allocates nothing. `resetClock` after a pause. Defaults: 1000/60 ms,
cap 6 steps (100 ms, the longest frame PERF-002 allows). `createSimLoop({ initialState, step,
sampleInputs, onStep })` joins a clock to a step function: `advance(elapsedMs)`, `stepOnce()`,
`state`, `previousState`, `tick`. `runSteps(step, state, inputsList)` runs with no clock, for
rules tests and bots. `StepFn<State, Inputs>` is `(state, inputs, dtMs) => State`; it may
return a new object or the same one changed in place.

**Input** (`input.ts`). `createInputBuffer<Id>({ axisCount, seqModulus, staleAfterSteps })`,
then `add`, `remove`, `reset`, `receive(id, seq, buttons, axes)` and, once per step,
`sample()`. `seqModulus` and `staleAfterSteps` are **required, with no default**: the host
passes the protocol's constants (65536 and 15 steps). sim-core does not import the protocol.

`sample()` returns `ReadonlyMap<Id, SampledInput>`. A `SampledInput` is `{ held, pressed,
released, axes, seq, age }`, all read-only, with buttons as a 32-bit mask; `isHeld`,
`wasPressed`, `wasReleased` (each throws on a button outside 0 to 31) and `buttonMask` read
it. **The map and frames are reused between samples** (no allocation per step), so a step
must not keep one. `SampledInput` cannot be assigned to the writable `InputFrame`: type the
game state's fields as `InputFrame` and storing a sampled frame does not compile (there is a
`@ts-expect-error` test of this). `copyFrame(frame)` makes a copy to keep. Step functions and
`GameModule` inputs should be typed with `SampledInput`; a bot or a test can pass an
`InputFrame` where a `SampledInput` is wanted. The recorder copies for itself.

Edge behaviour game rules will meet (each has a test in `input.test.ts > what game rules meet
at the edges`):

- Up then down again inside one step on a held button: `held`, `pressed` and `released` all
  set. The order was release then press.
- Two taps inside one step read as one `pressed`.
- Edges pile up while `sample()` is not called.

Rules for the host (also at the top of `input.ts`):

1. `sample()` exactly once per step.
2. On resume from a pause, before the first step: `discardEdges()`. It replaces the
   piled-up edges with the net change since the game last looked: held all through gives no
   edge, let go gives one `released`, pressed and still down gives one `pressed`, a tap
   wholly inside the pause gives nothing. Sequence numbers are kept: a packet older than
   the newest one received before the call is ignored afterwards, but one still in flight at
   the resume is applied as new (review round 3; see Requests). Do not use `reset` or sample-and-discard for this.
3. A new data channel for a controller, **and only then**: `reset(id)` before feeding it
   anything. A button held across the reconnect reads as a release, then a new press when
   the new channel's first packet arrives.
4. Never feed the buffer a packet from an old channel.

Notes for F-04 and game authors (each has a test):

- **Recommended contract for F-04: `step` returns a new state and never mutates its input**
  (state or inputs). The generator draws in place, so drawing from a generator inside a
  frozen state throws; a step starts with `cloneRng(state.rng)`. `forkRng` does not draw
  and works on a frozen parent.
- **`remove(id)` while a button is held delivers no release.** Rules must treat a controller
  with no frame as holding nothing.
- **Use `normaliseAxes(x, y)` before turning a stick into a speed.** The buffer clamps each
  axis on its own, so a raw diagonal is 1.41 long and a cook would run 41% faster
  diagonally. It takes an optional output pair so a step need not allocate.
- **`frame.age` is -1** (and `seq` -1) while nothing has been heard since `add` or `reset`;
  0 means a packet arrived since the previous step.
- **`nextInt(rng, min, max)` includes both ends.** For a list use `pick`.
- **`resetClock` keeps `totalDroppedMs`.** It is the running total for the clock's life.
- **A throw during `advance`** leaves `state` and `tick` at the last completed step (a step
  whose `onStep` threw did complete), adds the unfinished steps to dropped time, and has
  already consumed that step's presses from the input buffer.
- **Recordings can be saved:** `encodeRecording` / `decodeRecording` go to and from JSON-safe
  data, and a seed may be a string (`Recording<Inputs, string>`). `encodeState` /
  `decodeState` do the same for any state (Maps, Sets, typed arrays, bigint, `undefined`,
  -0, NaN and the infinities become small tagged objects) with an equal hash afterwards.
- **Do not freeze Maps or Sets by hand.** `Object.freeze` does not stop `set` or `add`, and
  it stops `deepFreeze` from installing its guard, so `deepFreeze` refuses such a Map or Set
  with an error naming where it is.
- **No property may be named `__proto__`** (it can arrive from `JSON.parse`); clone, hash,
  freeze and encode refuse it with the path.

**Snapshots** (`snapshot.ts`, `replay.ts`). `cloneState`, `hashState`, `deepFreeze` accept
plain data: primitives, arrays, plain objects, Maps, Sets, typed arrays. Anything else throws
a TypeError naming the path (`state.cooks<p1>.fn`). The hash ignores object key order and
respects Map and Set order. `createRecorder({ seed, hashEvery })` gives `record(inputs,
stateAfter)`; `replay(recording, init, step)` returns `{ state, hashes, matches,
firstMismatchStep }`.

## Decisions made inside the lane

| Choice | Why |
|---|---|
| sfc32 generator, seeded through a murmur-style mixer with 12 warm-up rounds | Integer-only, so identical on every engine; four words of plain state; checked in a test against an independent big-integer version. |
| Drawing mutates the generator in place | `docs/PERFORMANCE.md` §2 forbids per-frame allocation in `step`. `cloneRng` gives the non-mutating style when wanted. |
| A tap inside one step shows as `pressed` and `released` together, with `held` clear | The alternative (stretching the tap to a full step) delays the release by a step. Rules that act on a press use `pressed`; rules that act while held use `held`. |
| Eight recent packets remembered per controller | Enough to place a packet that arrives late and tell a real tap from the middle of a hold, so reordering neither loses a tap nor invents one. |
| `seqModulus` and `staleAfterSteps` required, no default (review round 1) | A wrong guess fails silently: told that 16-bit numbers never wrap, a buffer goes deaf to a controller after 65536 packets, about 18 minutes of held input. The values belong to the protocol. |
| Catch-up cap 6 | 100 ms is the longest frame any budget tolerates (PERF-002). Beyond it time is dropped, so the game slows for a moment instead of spiralling. |
| `snapToleranceMs`, off by default | A 60 Hz display reports 16.6 to 16.8 ms frames; against a 16.667 ms step that gives occasional 0-step and 2-step frames, visible on a cook drawn at its latest position. Snapping removes it at the cost of the simulation following the display's rate, not the wall clock. Left for the host and F-08 to decide with measurements. |
| Hash: object keys sorted; Map and Set in their own order; -0 differs from 0; all NaN alike | Map and Set order can change what a simulation does, so it is part of the state. |
| Cycles found by tracking the objects between the root and the current value; no fixed depth limit (review round 1) | A fixed limit both refused legitimate deep data and reported cycles vaguely. Depth is now bounded only by the engine's call stack (500 levels is tested). One object used in two places is allowed. |
| Arrays with holes or extra named properties are refused | They do not survive JSON or a structural copy unchanged, so two "equal" states could differ. |

## Measured overhead

On the dev Mac (M3), Node 24, best of 7 batches of 100,000 steps, three separate runs:

| What | Per step | Share of a 16.7 ms step | Test limit |
|---|---|---|---|
| Clock and loop with a trivial step | 0.010 to 0.013 µs | 0.00006% | 5 µs |
| The same with 8 controllers each sending one packet a step, buffer sampled | 0.217 to 0.237 µs | 0.0013% | 20 µs |

Taken while other agents were running, so treat them as upper bounds. The limits are 70 or
more times the measurement. After review round 1 the figures were 0.010 µs and 0.20 to
0.27 µs.

## For F-04's conformance kit

What the kit must check for every game, and the helper for each. The purity scan in this
package proves nothing about a game; these do.

1. **Replay-hash equality.** Record a run with `createRecorder` (seed, per-step inputs,
   hashes), then `replay(recording, init, step)` must give `matches: true`. Run it twice
   from scratch as well and compare `hashState` at every step. A different seed must give a
   different hash.
2. **The previous state is not changed by the next step, when driven through a real, reused
   input buffer.** Feed a `createInputBuffer` and pass `buffer.sample()` straight to `step`
   with no copying. Keep `hashState(previous)`; after the next `sample()` and `step`, hash
   `previous` again: it must be unchanged. This is what catches a game that stores a sampled
   frame in its state, and one that changes its old state in place.
3. **`step(cloneState(s))` equals `step(s)`** by `hashState`, with `cloneState` of the inputs
   too. Catches rules that depend on object identity, on something outside the state, or on
   a shared reference that a copy breaks.
4. **State survives a JSON round trip with an equal hash:** `hashState(JSON.parse(
   JSON.stringify(s)))` equals `hashState(s)`. The host keeps the room in `sessionStorage`
   to survive a reload (PLAT-009), so game state must be JSON-safe. In practice: no -0, NaN,
   Infinity or `undefined` values, and no Map, Set, typed array or bigint in state.
   `hashState` is strict on purpose so that this check fails loudly: it tells -0 from 0 and
   `{ a: undefined }` from `{}`. If F-04 would rather allow Maps in state, the check becomes
   `hashState(decodeState(JSON.parse(JSON.stringify(encodeState(s)))))` and the host must
   store states through `encodeState`; that is F-04's choice to make, once, for all games.
5. **Inputs are not changed:** `deepFreeze` the state and the (copied) inputs before `step`
   if the contract says a step returns a new state. `deepFreeze` goes all the way down even
   through parts already frozen on the surface, and throws on anything that is not plain
   data.
6. **Views do not change state:** `deepFreeze(state)` before `publicView`, `privateView`,
   `controllerLayout` and `isOver`.

---

## Close-out

### Requirement → code → tests → evidence

| ID | Code | Tests | Evidence |
|---|---|---|---|
| PLAT-032 (partly) | `packages/sim-core/src/rng.ts`, `timestep.ts`, `input.ts`, `snapshot.ts`, `replay.ts`, `hash.ts`, `index.ts` | `rng.test.ts` (known answers, sfc32 cross-check, helpers, forks), `timestep.test.ts`, `input.test.ts`, `snapshot.test.ts`, `replay.test.ts` (`determinism (PLAT-032)`, `record and replay`), `purity.test.ts`, `overhead.test.ts`; 200 tests | `uat/evidence/F-03-sim-core/verify.txt`, `sim-core-tests.txt`, `REPORT.md` |

PLAT-032 should stay `in progress`: it needs the games' rules and F-04's conformance kit.

### Acceptance

All eight statements pass; the file and test for each are in
`uat/evidence/F-03-sim-core/REPORT.md`.

### `pnpm verify` tail (after review round 2)

```
$ vitest run
[sim-core overhead] clock + loop: 0.0124 µs per step (0.00007% of a 16.7 ms step)
[sim-core overhead] clock + loop + 8-controller input buffer: 0.2625 µs per step (0.00157% of a 16.7 ms step)

 Test Files  9 passed (9)
      Tests  335 passed (335)

$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
$ python3 tools/trace_check.py
152 requirements; 5 in progress, 1 later, 146 not started
trace check passed
exit code: 0
```

### Dependencies

None added.

### Requests

0. **F-02 / host: the constants.** The host must pass `seqModulus: 65536` and
   `staleAfterSteps: 15` (or whatever the protocol finally exports) to `createInputBuffer`.
   Nothing in sim-core knows them.
1. **Lint for pure code (root config).** Add `no-restricted-properties` (`Math.random`,
   `Date.now`, `performance.now`) and `no-restricted-globals` (`setTimeout`, `setInterval`,
   `setImmediate`, `queueMicrotask`, `requestAnimationFrame`, `performance`, `crypto`) plus a
   `no-restricted-syntax` entry for `new Date`, scoped to `packages/sim-core/src/**` and
   `games/*/src/{rules,sim,levels}/**`, excluding `*.test.ts`. `purity.test.ts` covers
   `sim-core` only; game rules folders have nothing until this lint exists.
2. **F-02 (protocol): a tap whose only "down" packet is lost cannot be recovered by the
   host.** A very short tap is one "down" packet followed by the three "all released"
   packets; if that one packet is dropped the press never happened as far as the host knows.
   The buffer recovers reordering and duplication, not this. The protocol should either send
   each new state more than once or carry a per-button press counter. If it chooses the
   counter, the buffer needs a small addition.
3. **Track R: the host rules for the buffer** (listed above and at the top of `input.ts`):
   `reset(id)` for a new data channel only, never feed a packet from an old channel, and
   `discardEdges()` on resume from a pause.
4. **F-02: `staleAfterSteps` must exceed the gap between a phone's packets while something
   is held**, or long holds are cut off.
5. **`docs/ARCHITECTURE.md` §3** shows `init(config, players, seed: number)` and
   `step(state, inputs: Map<PlayerId, Input>, dtMs)`. Both fit this package as it is. F-04
   may want to say whether `step` may change its state in place (allowed here; `deepFreeze`
   is how the conformance kit would forbid it).
6. **`docs/TRACEABILITY.md`:** PLAT-032 can take the code, test and evidence paths above.

### Unsure

- **Nesting depth** is bounded by the engine's call stack. 500 levels is tested; 2,000
  overflowed inside the test runner. No real state is near that, and the error then is the
  engine's own "Maximum call stack size exceeded", with no path.
- **`discardEdges` trims the packet history to the newest packet.** The review asked for the
  history to be kept; kept whole, a delayed packet from inside the pause could still be
  placed after the resume and bring back the tap that was meant to vanish. Sequence numbers
  are kept, so such a packet is simply ignored. The cost: a reordered tap that straddles the
  exact moment of resume is not recovered.
- **`encodeState` / `decodeState` are exported**, beyond the `encodeRecording` pair that was
  asked for, because the recording encoder needs them and the host-reload check does too.
- **Snapping is off by default.** Whether a 60 Hz display needs it is a measurement for F-08.
- **Floating-point maths in rules.** `Math.sin`, `Math.cos`, `Math.pow` and friends are not
  guaranteed bit-identical across browsers. That does not matter while the host alone
  simulates; it would for phase 2 if two devices ever simulated the same game. Not checked
  here.
- **`deepFreeze` cannot freeze typed arrays**; a step that writes into one in a frozen state
  goes unnoticed. `hashState` before and after still catches it.

### Review round 1 (second commit)

| # | Finding | Change |
|---|---|---|
| 1 | `deepFreeze` stopped at an already-frozen value | Tracks visited objects in a WeakSet and always descends, including through frozen Maps and Sets. Checks the whole state first and throws the path-naming TypeError on class instances, functions, symbols, cycles, holed arrays; nothing is frozen when it throws. Tests: `goes all the way down through a value that is already frozen on the surface`, `freezes a shallow-frozen level table ...`, `refuses what is not plain data ...`. |
| 2 | Default `seqModulus` made a 16-bit sequence go deaf at the wrap | `seqModulus` and `staleAfterSteps` are required (type error and run-time TypeError when missing). Tests: `will not be made without ...`, `with the 16-bit range, hears 65534, 65535, 0, 1, 2 ...`, `follows a controller through three laps of 16-bit numbers under loss, repeats and reordering` (200,000 packets). |
| 3 | Reused sampled frames unguarded by types | `SampledInput` (read-only, `readonly number[]` axes), returned by `sample()`; `copyFrame()`; five `@ts-expect-error` lines in `a sampled frame cannot be stored in a writable slot`; documented at the top of `input.ts`. |
| 4 | Edge semantics | Documented at the top of `input.ts` and here; tests in `what game rules meet at the edges` (7 tests). `reset` now forgets unsampled edges (see "Unsure"). |
| 5 | `isHeld(frame, 32)` aliased button 0 | `isHeld`, `wasPressed`, `wasReleased` go through `buttonMask`, which now also refuses fractions, NaN and 2^32. |
| 6 | Purity test gaps | Whole-file scan. `Math` is allowed only as `Math.<pure function>` (so aliasing, destructuring, passing it on, indexing and a split across lines all fail); `Date`, `performance`, `crypto`, `Intl`, `Reflect`, `globalThis`, timers, `eval` and bare imports fail anywhere. 39 bad and 12 good samples in the self-check; a separate test of the import reader. The note above says what the test does not prove. |
| 7 | `splitRng` | Added, with known answers and a test contrasting it with `forkRng`. |
| 8 | Snapshot gaps | `BigInt64Array` and `BigUint64Array` supported (clone, hash with known answers, freeze). Holed arrays and arrays with extra properties throw with a path. Depth limit replaced by cycle detection. `replay` with surplus recorded hashes reports the step of the first surplus hash. A throwing step inside `advance` adds the unfinished steps' time to dropped time, sets `clock.steps` to the number that ran, and rethrows. |
| 9 | Conformance-kit section | "For F-04's conformance kit" above. |
| 10 | Evidence | Regenerated; `REPORT.md` updated. |

Existing known answers (generator, forks, state hashes) are unchanged by this round.

### Review round 2 (third commit)

| # | Finding | Change |
|---|---|---|
| M1 | `deepFreeze` left a hand-frozen or non-extensible Map or Set writable | Such a Map or Set is refused with a TypeError naming the path, before anything is frozen, unless it already carries `deepFreeze`'s own guard. Tests: `refuses a Map that was frozen by hand ...`, `refuses a Set that was frozen by hand`, `refuses a Set or Map that was sealed or made non-extensible`, `accepts a Map or Set it froze itself ...`. |
| S1 | `reset` wrong for resume | `discardEdges(id?)` added; `reset` documented as new-channel-only; host rule 2 rewritten in `input.ts` and here. Tests: `discardEdges: resuming from a pause` (9 tests, including a side-by-side with `reset`). |
| S2 | `reset` read the frame handed to game code | Private `lastSampledHeld` per controller, used by `reset` and `discardEdges`. Test: `reset reads what the game last saw from its own record ...`. |
| S3 | `advance` miscounted when `onStep` threw | Steps run are counted from the tick. Tests: `when onStep throws, the step it followed still counts ...`, `a throw comes after sampleInputs ...`. |
| S4 | Own `__proto__` key | Refused with the path in clone, hash, freeze and encode. Test: `refuses an own property named __proto__, naming where`. |
| small | `normaliseAxes`; `age` -1 until heard; `resetClock` keeps the total; `encodeRecording` / `decodeRecording` and string seeds; doc comments on `remove`, `nextInt`, frozen state and the recommended `step` contract; purity scan also catches `Function`, any `eval`, `localeCompare`, `toLocale...`, `WeakRef`, `FinalizationRegistry` | Each has a test and a line under "Notes for F-04 and game authors". |

Existing known answers are again unchanged.

### Added at merge (review round 3)

- **Request for F-02 and track C:** `discardEdges` cannot stop a tap made in the last moments of
  a pause whose packets are still in flight when play restarts. A true resume barrier needs the
  protocol, for example the host ignoring input until a frame sent after the phone has
  acknowledged the resume.
- **Follow-ups, not blocking:** a reordered first tap is dropped after `discardEdges` on a
  controller not yet heard (`historyFromRest`); `deepFreeze` is not all-or-nothing for a Map with
  its own non-configurable `set`; `normaliseAxes` returns (0, 0) for inputs above about 1e154;
  `decodeState` accepts a few shapes `encodeState` never writes; `Recorder.record` should hash
  before it pushes; the purity scan flags the bare words in comments and strings and refuses
  `Math.PI` and `Math.hypot`, which matters when F-04 reuses it on games.
- **For Randy (OQ-030):** "`step` returns a new state" creates objects every step, which
  `PERFORMANCE.md` §2 forbids as written.
