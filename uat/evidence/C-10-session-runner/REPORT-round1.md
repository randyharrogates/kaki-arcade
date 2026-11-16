# C-10 review fix round 1 evidence

Headless evidence only; no renderer, browser, screenshot or deployment claims.

Final workspace verification: `VITEST_MAX_WORKERS=2 pnpm verify`, exit 0.
82 test files passed; 2,330 tests passed, one existing skip. Workspace guard,
typecheck, ESLint, design lint, build/budget hook and trace check passed.
See verify-complete-round1.txt. No check or existing time limit was changed.

Targeted command: `VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/platform/src/session games/*/src/session*.test.ts --maxWorkers=2`.
See tests-round1.txt. Includes A1–A17 (and A5b), real-game min/max whole matches
with per-step harness hashes, privacy lifecycle probes, immediate real Peek Poker
reconnect, harness replay of console lifecycle events, optional fence timeout,
settings rejection, guarded callbacks, shortage quit and connection truth.

Reviewer test corrections: fixture draws its tested button and clamps its layout
index at long durations; A6 waits for the authoritative room team assignment under
D-079; A16 targets the seat actually allocated after a departure. Shared twin feeds
wire revisions to the runner and game revisions to the harness. Whole-match
suites have the requested 60-second describe timeout.

Cost diagnostics in perf-round1.txt: in-place game + eight-seat runner + real
buffer/loop, no recording: 9.697 us/step. Allocating fixture including copied
recording and views: 82.080 us/step. Real Tabao Rush runner 58.8–78.4 us/step,
bare stepping plus views 19.1–19.5 us/step, about 39–59 us extra per step.
Measurements are shared-machine Node diagnostics, not latency budgets. The steady
runner test also asserts only 16 initial transport sends across 101,000 steps.
An overlapping diagnostic run hit the existing 5-second performance-test timeout;
the complete workspace and final targeted runs were rerun without changing it.

Changes remain uncommitted for the requesting integrator. No manifests, lockfile,
node_modules, shared trackers, game implementations or owned contracts were edited.
The small harness parser change accepts sim-core's paired -1/-1 empty-input
sentinel, allowing a console recording before a seat's first packet to replay.
