# C-10 session runner — review fix round 2

Goal: run an authoritative match through the same game contract as the development harness.
Requirements: PLAT-007, PLAT-008, PLAT-022, PLAT-023, PLAT-025, PLAT-030,
PLAT-031, PLAT-033, NET-001. Decisions: D-079 and D-082, read from the integrator's main checkout.

Acceptance: immediate resume/reconnect; content-based private delivery; per-phone wire
revisions translated before current-state action validation; drawn input masks; disconnected
seats send no frames; team assignment before seating; bounded shortage; harness-compatible
identity-free event recording; contained callbacks and one picker event.

UAT: headless session attack tests and whole matches of all three real games at minimum and
maximum players, comparing state hashes every step. Privacy probes run across reconnect,
leader change and mid-match join. No screenshots: this slice draws nothing.

Out of scope: UI, wire schema changes, game join-policy metadata and dependency manifests.

## Close-out

The merged main harness and game rules are the baseline. Default pause/resume never calls
HostInput.pause: packets continue feeding buffers, paused taps are dropped and resume discards
edges. Reconnect resets the seat buffer and accepts fresh input immediately. An optional
`resumeFenceSteps` tightening is off by default and stops waiting after the configured steps.

Each seat retains snapshots of successfully delivered audience-filtered layout and private
view. Comparison first checks the raw game object identity and audience against the last
successful delivery, then compares the known layout/private-view shapes with indexed loops. Sends alone allocate cache snapshots and wire payloads. Layout wire revisions
increase on successful delivery; the wire-to-game map translates actions before driveStep
validates against the CURRENT game layout. Failed sends retry on frames even during pause.
A successful layout send computes the seat's held-button and axis masks once. Disconnected
seats have connectivity entries but no frames, matching the existing harness.

New team seats wait for room assignment. D-082 freezes a seated player’s team for the
match; room updates refresh only the runner’s name and colour, without calling game.join.
A room team reset to null retains the seat. enough() reads these frozen teams. Transport connection truth persists until connectionId changes.
Shortage uses RECONNECT_WINDOW_MS and injected elapsed frame time plus the room clock; it
ends in results after the seat hold or a confirmed leader quit. The shell must keep delivering
frames and room expiry updates during pause.

`recordInput` emits the harness MatchEvent union (including borrowed ticks), never room,
token, device or connection records. Consumers retaining events must copy them. The harness parser also accepts sim-core’s paired -1/-1 empty-input sentinel before a
connected seat’s first packet. The replay
test builds a kaki-match-3 recording containing joins, leaves, disconnect and pause/resume,
and replayMatch verifies its final hash. The legacy `record` callback remains borrowed.

Reviewer tests are ported into session/c10-review.test.ts and each game's src/session.test.ts.
Shared support is testing.fixture.ts, excluded by the existing library fixture exclusion.
The session fixture is renamed session.fixture.ts for the same reason. The cost probes assert simulation steps and send structure. Timing/heap diagnostics are
written only to an explicitly supplied C10_PERF_EVIDENCE path, never printed by the tests.
Whole-match describes have their own 60-second timeout; existing time limits are unchanged.

Attack fixture corrections follow D-079: draw the button being tested; keep its game layout
valid at long durations; expect a teamless newcomer to wait; use the seat actually allocated
by the room after a departure. The real-game twin sends game revisions to the harness and
wire revisions to the runner, as their respective interfaces require.

Evidence: tests-round1.txt, perf-round1.txt and verify-complete-round1.txt under uat/evidence/C-10-session-runner.
Independent review and integration remain with the integrator. Changes intentionally remain
uncommitted in the worktree as requested.

## Requests

1. Optional wire tightening: Host sends resume-fence {gen}; the phone clears held state and
   history, then answers resume-ack {gen, seq}, where seq is the first frame it will send
   after the fence. The host ignores frames and taps older than seq and stops waiting after
   N steps. Default play must not depend on this optional message. The current adapter fence
   hooks are compatibility hooks; the integrator must settle timeout reopening semantics
   with the actual wire implementation before enabling them.
2. Open question for the integrator: add a per-game mid-match join policy flag in GameMeta.
   D-082 resolves team changes: existing seats never rejoin for room detail updates.
   The game contract still has no separate name/colour update operation; only the runner’s
   details refresh mid-match.
3. Shell: send room expire events while paused, keep injected frames advancing, check
   Action.viewRev before translating/routing taps, bind callbacks to authenticated current
   connections, preload assets/setup data, and render pause/results/error/picker events.
4. Exact test-only dependency need: add `@kaki/netcode: workspace:*` to platform
   devDependencies and a platform test-project reference to netcode/tsconfig.lib.json.
   package.json and lockfile are integrator-owned and unchanged here. The existing test-only
   relative imports exercise the real HostInput and Peer.sendHost types; the new adapter test
   runs createSession with that receiver and proves default resume works without an ack.

### Round 1 diagnostic cost

Shared-machine Node measurements (not frame-latency budgets): eight-seat runner with real
buffer/loop and an in-place game, no recorder: 9.697 us/step. Allocating fixture with copied
recording/views: 82.080 us/step. Eight-seat real Tabao Rush runner: 58.8–78.4 us/step;
bare driveStep plus views: 19.1–19.5 us/step (about 39–59 us additional per step in this run).
See perf-round1.txt. These include delivery comparison, transport fixture and buffer feeding;
no heap-profiler or browser claim is made.

Final workspace verification: `VITEST_MAX_WORKERS=2 pnpm verify` passed (82 files,
2,330 passed, one existing skip), including build and trace checks. `git diff --check`
passed. See REPORT-round1.md for evidence scope and the unchanged-timeout rerun.


### Round 2 close-out (PLAT-023, PLAT-025, PLAT-031, NET-001)

- Paused frames only retry output. They never sample the input buffer. Resume calls
  discardEdges; held state and one release/press on the next sample follow sim-core rule 2.
  R1/R2 run ten TV frames during pause. R3 covers repeated pauses and reconnect.
- Seated teams stay fixed, including through room null resets. Initial seats enter via init;
  subsequent room updates make zero joins and zero leaves. A genuine new assigned seat still
  joins once. R5/R6 and the amended round-1 PLAT-025 test follow D-082; R5 makes every room
  team red and proves the match retains its frozen blue team and remains playable.
- Each seat keeps the raw layout/view reference alongside the sent clone and leader audience.
  Unchanged identity skips filtering and structural traversal. Failed sends cannot mark the
  new source as delivered; reconnect invalidates the sent cache and forces fresh delivery.
  compare.test.ts proves no getter traversal on unchanged identity, leader refresh and fresh
  equal-shape/cosmetic comparisons.
- Allocation claim by code reading: compare.ts has only direct known-field comparisons,
  discriminated switches and indexed array loops. It creates no arrays, objects, key lists,
  closures, iterators or JSON strings. It covers all ten controls, four block types and
  option/card/grid-cell fields in game/layout.ts. This claim covers comparison, not the
  runner/buffer as a whole. Same-reference game objects are treated as unchanged by D-082;
  games must return a different object when their content changes.
- Successful layout delivery prunes every wire mapping whose game revision is older than
  the delivered current revision. Same-game-revision cosmetic mappings remain valid (R4).
  This bounds history to the current game revision, as requested; cosmetic changes within
  that revision still retain their mappings.
- Reviewer replay and send/performance probes are ported to session/c10r2-*.test.ts without
  wall-clock assertions. session-perf.test.ts now checks 600 steps, eight initial layouts,
  no duplicate layout delivery and no lifecycle errors. Longer probes also assert phase
  layout counts (Tabao 8; Peek 56 at 6,500 steps), with eight phones.

Heap evidence: heap-before-collected-round2.txt and heap-after-collected-round2.txt. Stand-in
net heap growth before → after: 1,024.94 → 935.85 B/step without recording; 1,114.69 →
769.99 B/step with a non-retaining recordInput sink. See REPORT-round2.md for method and limits.
Tests and full verification are recorded in tests-round2.txt and verify-round2.txt.
Changes remain uncommitted for independent review; no shared trackers/contracts/manifests changed.

Round 2 final verification: `VITEST_MAX_WORKERS=2 pnpm verify` passed: 87 test files,
2,346 tests passed and one existing skip; build and trace checks passed (152 requirements).
`git diff --check` passed. No check configuration or existing time limit changed.
