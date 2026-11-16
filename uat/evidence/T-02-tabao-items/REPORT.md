# T-02 review-fix round 1 — pure-rule evidence

The original build is committed. This review's changes are committed on the issue branch in the authorised
lane. D-078 was read from the primary checkout. No screenshot or renderer is produced by
this pure-rule issue; Claude's independent review and screen judgement remain outstanding.

| Review item | Automated result |
|---|---|
| 1 | Direct held/counter/floor indexes, separate flights, 24-floor crate refusal; whole-round eight-cook crate abuse stays bounded. Synthetic 60-floor/eight-flight test permits exactly 64 hand lookups per step and forbids enumeration of resting items. |
| 2 | Held, floor-pickup and counter-pickup point-blank chains publish a flight before catching. |
| 3 | Throw time derives from 377 ms as 23 steps. No literal 24-step duration remains. |
| 4 | Button taps ignored, sampled cross before triangle, lower seat wins a real contested counter item regardless of frame insertion order. |
| 5 | Resting tile stored at throw creation, public end matches it; backward fallback tested from both directions. Reservations prevent landing overwrite. Leave recovery prefers free floor; emergency all-occupied paths conserve items on a start pile. |
| 6 | Public `floorItem` identifies the oldest recoverable floor item; null with full hands or a highlighted target. Cross never puts down on floor. |
| 7 | Reviewer's four maps at all 1–8 cook counts, frozen deterministic replay, identities, correct presses/targets, swept catch radius, unchanged flight data and blocked-path sampling. Full original long-match tests retained. Explicit counter handoff chains require both cross presses and the same counter. |
| 8 | T-01 random maps reduced to 32 while retaining explicit convex-corner cases and 600 steps/map; no timeout changes. Evidence writes gated by T01_EVIDENCE/T02_EVIDENCE; no normal verification writes evidence. |
| 9 | Slice note replaces fourteen proposals with D-078 and only four follow-ups. |

`review-performance.json` records 21 blocks of 600 steps (12,600 total) for eight cooks
mashing both buttons every other step at eight crates. The conservative structural bound is
24 floor items plus 8 × (23 + 1) in-flight/held headroom = 216 items. Floor items can exceed
24 as existing flights land; 24 is an issuance cutoff. There is no destruction or recycling
of IDs. Count stabilises in the first block and remains unchanged through the round.

`review-worst-case.json` records 2,000 independent steps with 60 floor items and eight flights,
matching the reviewer's synthetic workload. Timings are Node observations with other workspace
work possible, not browser/TV approval. Tests assert counts/structure, never wall-clock budgets.

Conformance runs full 12,601-step solo and eight-cook scenarios and membership replays,
ending at tick 12,600. `conformance.json` and `conformance.txt` hold the complete kit results.
`review-verify.txt` is the evidence-enabled verification; `review-verify-no-evidence.txt` is
ordinary verification. Earlier `verify.txt` and `kit-tests.txt` are original-build history.

The slice note records the only remaining requests: T-05 lifecycle scaffold, screen judgement
of catch radius/duration, T-06 split-kitchen floor reachability, and T-08 button wording.

## Final validation

Both `VITEST_MAX_WORKERS=2 T02_EVIDENCE=1 pnpm verify` and
`VITEST_MAX_WORKERS=2 pnpm verify` passed (exit 0). No timeouts or thresholds changed.
60 test files passed; 2,070 tests passed and one skipped.

A SHA-256 digest of the full tracked diff and all untracked file contents was identical
before and after ordinary verification: `fcc0aaff182eb25ca79e75f0366289489caf0b4306f30f1cd9028423a9f36743`.
This includes T-01/T-02 evidence; the run caused no repository changes. The log was
copied into this evidence folder explicitly after that comparison.

| Workload | Items | Mean step ms | Worst step ms |
|---|---:|---:|---:|
| Whole-round crate abuse (highest 600-step block mean) | 112 peak / 216 bound | 0.010280 | 0.367625 |
| Reviewer's synthetic 60 floor + 8 flights | 68 | 0.008091 | 0.056708 |

Abuse count is 112 by tick 600 and still 112 at tick 12,600. Final-block mean step:
0.004998 ms. The synthetic case performs exactly
64 hand-index reads per step regardless of resting items.

```text
Conformance kit: tabao-rush (returns-new) PASSES
    step ms: mean 0.0016, p95 0.0027, worst 0.0486; allocation counts unavailable (report only)
  scenario "solo co-op": 1 player, 12601 steps, over at step 12600, final hash 746083d9cf045e3f
    step ms: mean 0.0131, p95 0.0199, worst 0.6463; allocation counts unavailable (report only)
  scenario "eight-cook co-op": 8 players, 12601 steps, over at step 12600, final hash be0262b0edfd845d
  membership replay "solo co-op": 12601 steps, over at step 12600
  membership replay "eight-cook co-op": 12601 steps, over at step 12600
```

Ordinary verify tail:

```text

 Test Files  60 passed (60)
      Tests  2070 passed | 1 skipped (2071)
   Start at  23:03:27
   Duration  78.38s (transform 830ms, setup 0ms, import 3.02s, tests 147.14s, environment 4ms)

$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 48 in progress, 1 later, 103 not started
trace check passed
```
