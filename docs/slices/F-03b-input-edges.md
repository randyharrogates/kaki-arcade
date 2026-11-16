# F-03b and F-03c — input edges

Branch: `issue/F-03b-input-edges`. Work is left uncommitted for the integrator as requested.

## Goal and governing specification

Quote from `docs/backlog/F-foundation.md`, “Carried from reviews”:

> - **F-03b (small, sim-core):** when a tick would latch a press or release already pending for
>   that button in this step, defer that tick and the rest of the slot's ticks until after the
>   next `sample()`, so two fast taps delivered together after a loss both count (F-02 review 3).
> - **F-03c (small, sim-core or C-04):** after a silence release, do not raise `pressed` for a
>   button until a tick shows it up, so a link delay spike cannot repeat a tap (F-02 review 3).

Requirements: NET-005; preserve the input-delay intent of PERF-010 and PERF-011.
PERF-012 concerns local phone feedback and is unaffected by this host-only change.

Acceptance: repeated presses and repeated releases survive recovery in separate samples;
ordinary press/release ticks have no added delay; the entire blocked tick and following ticks
wait, including axes and other buttons; suppression survives pause edge discard and ends on
an UP tick or a new-channel reset. Sequence wrap, loss recovery, duplicates, reordering,
reset, discard, queue overflow and borrowed frame identity are covered by automated tests.

UAT: pure host logic, no screen or browser artefact. Run the input tests and `pnpm verify`,
inspect the saved outputs under `uat/evidence/F-03b-input-edges/`.
Out of scope: transport, phone feedback, resume barrier, shared trackers, protocol contracts.

## Implementation and limits

`packages/sim-core/src/input.ts` preallocates a 256-tick deferred queue per player,
including axes and sample wait counts. An edge collision defers the whole tick and subsequent
ticks. Ordinary ticks have no added sample delay. Each queued tick may wait at most **4
samples** (about 67 ms at 60 Hz); before a fifth wait the whole remaining queue collapses to
accumulated edges: after a stall, each button reports at most one press and one release for everything that happened in it, and its final state is the newest. Newest axes also win (D-068). Repeated edges coalesce; even a tap wholly inside the collapsed span survives. `discardEdges` remains separate and deliberately drops taps wholly inside a pause. The 256-entry hard array bound is a memory safety net: reaching
it collapses immediately. It is not the latency policy.

Applied-tick duplicates are rejected before enqueueing, including history entries. Late UP
ticks rearm silence suppression before computing a recovered re-press. A late DOWN between
UP states recovers one tap and cannot manufacture another on duplicate delivery.
`reset` clears queue and suppression; `discardEdges` preserves suppression and sequence state.

The identity test proves only reuse of the same Map, frame and axes objects. Absence of
allocation in sampling is by code reading: preallocated arrays, scratch axes and scalar
locals; engine-internal allocation and real-network PERF-010/011 latency are not measured.

## Close-out

| Requirement | Code | Automated evidence |
|---|---|---|
| NET-005 | `packages/sim-core/src/input.ts` | `input-edges.test.ts`: duplicate presses/releases, loss recovery and wrap, late tap, silence, reset/discard, overflow, seeded reference fuzz |
| PERF-010, PERF-011 | same | `press-release-press defers only the duplicate`; `bounded queue retains newest state beyond the 256-tick safety bound`; `the same Map, frame and axes objects are reused` |

Review round 1 ports all 12 reviewer attack cases to `input-attacks.test.ts`. X9's old
expectation of replaying every stalled tap is replaced by D-068's four-sample limit; X11
checks queued duplicate rejection and eventual newest state under the new policy.
Additional cases cover the UP-DOWN-UP counterpart, nine-tick oldest-first protocol feeding,
newest axes after collapse, and the 256-entry safety net.

The seeded independent check records physical transitions per button, consumes each exactly
once from emitted edges, checks edge order and a four-sample deadline, and compares final
held state and axes after drainage. It uses 400 windows, two players, multi-button flips,
duplicates, reordered late flickers, loss recovery, carried queues and silence gaps. It does
not reproduce the implementation's pending-tick algorithm. Silence-held resumption remains
covered by dedicated deterministic tests because its second release is intentional.

Review round 2 ports all 16 reviewer attacks (including X12–X15). Seeded 40- and
259-tick stalls test expiry and the receive-side safety bound, including a single tap
on a non-colliding button. Separate tests check pause tap discard and an UP inside
collapse rearming silence suppression. Overflow fuzz checks final state and valid releases;
exact press/release count balance is not guaranteed when repeated edges coalesce.

Evidence: [tests](../../uat/evidence/F-03b-input-edges/tests.txt),
[verification](../../uat/evidence/F-03b-input-edges/verify.txt), and
[report](../../uat/evidence/F-03b-input-edges/REPORT.md).
No dependencies or public API changes. Changes remain uncommitted for review.

## Requests

- Integrator: update the known input limits in `docs/ARCHITECTURE.md` §5 and the shared
  trackers to reflect both fixes; those paths are outside this issue's lane.
- Exact proposed wording for `docs/ARCHITECTURE.md` §5:

  > A repeated press or release defers the whole tick and following ticks. A queued tick
  > waits at most four simulation samples (about 67 ms at 60 Hz); before it would wait
  > longer, collapse the whole remaining queue: after a stall, each button reports at most
  > one press and one release for everything that happened in it, and its final state is
  > the newest. Newest axes win; discardEdges separately drops taps inside a pause. A preallocated 256-tick array is a
  > memory safety net; reaching it collapses immediately. Applied or queued duplicates
  > are stale and consume no queue space. After silence releases a button, resumed held
  > input has no pressed edge until a tick shows it UP, including a late UP tick. A game
  > therefore sees released, then held without pressed, then a second released when the
  > player lets go. A late UP between held states also rearms the recovered re-press.

- No dependency or public API change requested.
