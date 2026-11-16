# Headless game harness (PLAT-030, NFR-TEST)

Import from `@kaki/platform/harness`. Nothing here is exported from the runtime entry.
A game imports the harness in its own tests; platform never depends on a game.

```ts
import { createMatch, formatTimeline, replayMatch, parseRecording } from '@kaki/platform/harness';

const match = createMatch(game, {
  seed: 42,
  players: 2, // Or PlayerInfo[], sorted into seat order by the harness.
  teams: false,
  // settings: { ... }, // Partial overrides on schema defaults; validated.
  // context: { data: { 'selected-questions.json': questions }, saved: null },
});
match.script('p1', [
  { do: 'stick', x: 1, y: 0, steps: 2 },
  { do: 'until', predicate: { path: ['phase'], value: 'pick' }, maxSteps: 5 },
  { do: 'tap', control: 'pick', value: 'yes' },
  { do: 'press', button: 'faceBottom' },
  { do: 'release', button: 'faceBottom' },
]);
match.until((m) => m.isOver, 10000);
console.log(formatTimeline(match.timeline));
const json = JSON.stringify(match.recording());
const replay = replayMatch(game, parseRecording(json));
// replay.matches, replay.finalHash, replay.divergence: { event, step, diff, expectedView, actualView } | null
```

For the included `phasedFixture` (12 steps), this script's timeline is:

```text
     0  phase="prepare"
     3  phase="pick"
     9  phase="reveal"
    12  phase="over"
```

Scripts are plain data. Paths read only the public view; comparisons are `eq` (default),
`ne`, `gte`, `lte`. Each player's cursor runs in seat order before sampling. A press,
release or tap consumes one step. Stick and wait durations consume exactly N steps;
the stick returns to rest afterwards, while a pressed button stays down until released.
`tapIfOffered` consumes one step and skips a tap that the current layout refuses.
An `until` may use `predicates: [condition, condition]`; all conditions must hold.
A satisfied `until` continues to its next command immediately; a pending one waits at
most `maxSteps` and then throws. Scripts freeze when paused or disconnected.
Held stick, tilt and press calls also refuse controls the current audience-filtered layout
does not draw. Their final boolean argument (or script `evenIfRefused`) bypasses this
call-time refusal; sampling still zeroes undrawn axes and releases undrawn buttons.
A drawn but disabled button still arrives, as on a phone. Releases always work.
Use `evenIfRefused: true` on a tap to submit a deliberately invalid action to the shared
driver; otherwise a missing, stale, disabled or wrong-audience tap throws with step,
player and reason. `revision` optionally tests stale layouts. Concurrent accepted taps
still obey the driver's first-tap-per-control rule.

`step(n)` returns the number of simulation steps actually taken, not wall time; no catch-up clock is needed. It stops
advancing while explicitly paused, below the game's minimum roster or missing a team.
It also stops at `isOver`. `blocked` is `null`, `'paused'`, `'roster short'`, `'empty team'` or
`'over'`. `until(fn, maxSteps)` throws on exhaustion or blocked advancement.
`join`, `leave`, `disconnect`, `reconnect`, `pause`, `resume` take effect immediately and
are recorded, even between steps. Departures can empty a roster; joins unblock it.
Membership uses `applyMembership`, active steps use `driveStep` at `STEP_MS`, and held
inputs use the real sim-core buffer and protocol constants. Frames are supplied in seat
order. Disconnected players supply neither frames nor actions. Leadership is sticky: the first player leads through disconnects, passes on leave to the
lowest remaining seat, and can be changed explicitly with `setLeader(id)`. It is never
automatically reclaimed on reconnect or by a lower-seat join. This replaces the former
lowest-connected-seat rule; unlike the full room, there is no timed disconnect grace expiry.
Player connection state is available through the read-only `disconnected` snapshot; layouts and private views are filtered by audience. The console pause bit
is stripped by `driveStep`; call `pause()` explicitly to exercise the platform pause.

`createBots(match, { seed, weights, chaos })` returns a controller with `step(n)`.
Keep it across calls so its seeded stream is independent of batching. Weights (finite,
non-negative) apply per offered action: `idle`, `tap`, `stick`, `button`, `tilt`, `shake`.
Only current audience-visible controls and enabled tap values are used. `pressDisabled: true`
also permits drawn-but-disabled held buttons; disabled tap values remain excluded. Bots
read current connection state each attempt, including manual reconnects and leaves. Bots reset held
inputs each step and may choose new ones. Chaos is opt-in, for example
`chaos: { probability: 0.01, leave: 1, join: 2, disconnect: 1, reconnect: 2 }`.
Joins restore players chaos removed; it never invents new seats. Chaos can leave a match
short of players; continue attempting bot steps to allow rejoins. Avoid assigning both a
bot and a script to the same player: scripts run after the bot's choices.

Recording is enabled by default. Use `record: false` for a match that needs no recording:
it stores no inputs, computes no state hashes (including at setup), and `recording()` throws.
The CLI selects this mode unless `--record file` is supplied.

Recordings (`kaki-match-3`) contain setup and run-length encoded sampled inputs/lifecycle
events. `hashEvery: N` defaults to **60 simulation steps**, once a simulated second.
Initial state, lifecycle events, and the final step are always hashed. Calling `recording()`
includes the current final step without changing the cadence if play then continues.
Each checkpoint stores `{ event, step, hash }`. Default `views` is empty;
`viewEvery: N` optionally stores a public view every N simulation steps. Repeated frames
retain the first sequence counter; replay advances it modulo the protocol range. Edges,
axes, actions, audience/leader and membership changes break runs. `parseRecording(json)`
validates the envelope, ordered checkpoints, final checkpoint, events, Maps, frames, actions
and optional snapshots. This replaces the experimental v1/v2 formats.

Replay compares hashes at the recorded checkpoints. Without the original build it reports
the **first mismatching checkpoint**, its inclusive `fromStep`/`toStep` span since the last
matching checkpoint, and the recomputed public view at that checkpoint (`actualView` and
`checkpointView`). It cannot identify the exact first divergent step within that span.
A hash cannot reconstruct an old view; an exact stored snapshot is used if available,
otherwise the diff says the original view is unavailable. `hashEvery: 1` gives an exact-step
report even without a reference. Differences that appear and disappear entirely between
checkpoints cannot be detected with a sparse recording.

To refine a failing span to the exact first divergent step, keep the recorded build's module:
`replayMatch(changedGame, recording, { referenceGame: originalGame })`. Replay drives both
builds from the same setup and inputs; the reference must match the recorded checkpoint hash.
It then reruns both builds step by step across only the failing span, comparing each state.
The returned `event`, `step`, views and diff identify the first differing event; `checkpoint`
and `checkpointView` retain the original failing checkpoint, and `exact` indicates whether
the report is exact. This works with in-place states as well as returned states. A reference
that fails the stored hash is not trusted for expected views or exact refinement.

`initialView` is retained for init diagnostics. Ordinary diffs contain public data only;
`diff: 'state'` or `diff: 'private', player: 'p1'` explicitly opts into sensitive diagnostics.
Never share those diagnostics publicly. `expectedView` and `actualView` are returned along
with untruncated diff paths. An empty public diff with a matching reference means only hidden
state diverged. Complete state snapshots are not stored per step.

`createMatch(game, { seed, players, state: craftedState })` is a test-only door: the supplied
state is cloned and bypasses `init`, while settings/roster validation still runs. The caller
must supply the matching roster/context/settings. One encoded initial state is kept in its
recording so Maps, Sets and typed arrays round-trip. Never use this for product setup.
`headline: (publicView) => string` selects useful timeline text for games with no phase field.
There is always a terminal entry, even if its headline is unchanged.

`dumpView(json)` sorts object keys and defaults to 24 lines, 100 columns, depth 5 and
5 array entries, showing omitted counts. `diffViews` returns full public JSON paths.
The timeline records changes to phase, headline, round or over, not countdown ticks.

Run with the same Node TypeScript mechanism as content/rabakz:

```sh
node --import ./packages/platform/scripts/register.ts packages/platform/scripts/cli.ts play peek-poker --seed 7 --players 8 --steps 20000 --bots
node --import ./packages/platform/scripts/register.ts packages/platform/scripts/cli.ts play harness-fixture --module packages/platform/src/harness/fixture.ts --seed 42 --players 2 --steps 12 --bots --record /tmp/match.json
node --import ./packages/platform/scripts/register.ts packages/platform/scripts/cli.ts replay /tmp/match.json --module packages/platform/src/harness/fixture.ts
```

`play <game>` loads `games/<game>/src/index.ts` by convention, or an arbitrary exported
GameModule via `--module path`. `--context file` supplies preloaded JSON context (Rabakz
requires its selected questions). Replay reads the recording's game id and accepts the
same `--module` override. `--record file` writes a recording; `--settings '{"length":24}'` supplies settings overrides;
`--teams` requests team play; `--hash-every N` selects recording checkpoint cadence (default 60). Loaded `meta.id` must match the requested game, including
`--module` overrides. The CLI prints timeline/results or replay diagnostics; failure exits
nonzero. Tests call exported `main(args, io)` with injected read/write/load/log functions;
importing it does not execute a command or write any files. Node 24+ and the existing workspace links are required.
