# P-01 / P-02 evidence

Pure rules only. No renderer, DOM, network, assets, sound or visual UAT exists in this slice.
The integrator retains independent review and visual integration UAT.

Acceptance evidence:

| Requirement | Automated evidence |
| --- | --- |
| PP-001 | Leader settings default, all 3/5/7 complete matches, score sums and equal places |
| PP-002 | Unique 16+3 seeded deals, fresh round decks, long-match uniqueness invariants |
| PP-003 | Exact 1,200-step first memorise, hidden TV grid, reversible pause |
| PP-004 | Shared faces unchanged through memorise, pick and reveal, and every swap |
| PP-005 | Secret tap selection/deselection, two-card cap, lock-before-pick, privacy scrambling |
| PP-006 | Both players select the same two cards |
| PP-007 | All nine categories, all kicker positions, suit/order ties, wheel, reference tests |
| PP-009 | Exact points table, kicker-based winner, lock counter, explicit best-hand lock +3, other best hands +1, seed-7 unlocked tie |
| PP-010 | Exact expiry, zero/one missing picks, distinct positions and preserved selection |
| PP-011 | Every ramp row and sequential card/row swap in 3/5/7-round matches |
| PP-012 | Solo save/restore and post-leave best; one/eight-player kit and empty-room hooks |
| PP-013 | Round-one admission before first step; later zero-score waiting joins in every phase; kit membership replays |
| PP-032 | Exact eight-second reveal and five-second standings before every next deal or end |
| PP-022 | Immediate all-lock reveal; disconnected players and waiting joiners excluded |

`tests.txt`: focused Vitest output. `kit.txt`: all 25 conformance checks, scenario completion,
replays and measured game-step mean / p95 / worst (milliseconds). `verify.txt`: complete
workspace verification. Final results and timings are recorded in the slice note.

Evaluator coverage includes all 6,175 legal rank multisets and 1,287 non-flush variants for
all-distinct ranks: 7,462 reference comparisons. All 21 five-card subsets of each of 40 seeded
seven-card sets add 840 reference comparisons and sorted comparison-law checks. Suits are
covered by flush and non-flush variants because they never break a poker tie.

The eight seeded seven-round, eight-player property matches check every step for unique deals,
valid distinct picks, nondecreasing scores and immutable locked selections. The kit freezes
inputs/state, scans production sources, tests delayed and repeated taps, scrambles every
currently hidden face/pick, and checks public results as well as TV/phone payloads.

Review round 1 additionally verifies the exact five cards scored for PP-007, fixed 20-second
pick time with rounds-only settings, solo locked/unlocked/random speed bonuses, and stable
private revisions within a displayed second and during reveal. The long seeded property test
uses cheaper direct invariant assertions at every step; its original timeout is unchanged.
Future swaps remain host-only; only the active swap reaches public views.

Focused result: 3 files, 74 tests passed. Final workspace result and current conformance
measurements follow below; full logs are retained alongside this report.

Final result: PASS. `VITEST_MAX_WORKERS=2 KAKI_PEEK_EVIDENCE=1 pnpm verify` exited 0.
51 files passed; 1,937 tests passed and one existing test skipped; duration 100.66 seconds.
The initial full run stopped on an optional-chain lint preference, corrected before this pass.
No check, budget or timeout was changed. All 25 conformance checks pass.

```text
Conformance kit: peek-poker (returns-new) PASSES
    step ms: mean 0.0006, p95 0.0007, worst 2.6352; allocation counts unavailable (report only)
  scenario "solo three rounds": 1 player, 9000 steps, over at step 5919, final hash f9ce1737aba3c7cb
    step ms: mean 0.0006, p95 0.0011, worst 3.0408; allocation counts unavailable (report only)
  scenario "five rounds": 4 players, 14000 steps, over at step 11639, final hash c1c8277c6cec13b3
    step ms: mean 0.0007, p95 0.0019, worst 0.2994; allocation counts unavailable (report only)
  scenario "eight seven rounds": 8 players, 19000 steps, over at step 17629, final hash 288b9fb8ff385d74
  membership replay "solo three rounds": 9000 steps, over at step 7518
  membership replay "five rounds": 14341 steps, over at step 14340
  membership replay "eight seven rounds": 19000 steps, over at step 17981
```

Verify tail:

```text
 Test Files  51 passed (51)
      Tests  1937 passed | 1 skipped (1938)
   Start at  21:38:09
   Duration  100.66s (transform 1.81s, setup 0ms, import 5.16s, tests 188.87s, environment 4ms)

$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 31 in progress, 1 later, 120 not started
trace check passed
```
