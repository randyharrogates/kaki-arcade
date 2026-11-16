# R-01 — review-fix round 2 evidence

PASS: `VITEST_MAX_WORKERS=2 pnpm verify` (exit 0). Checks and time limits unchanged.
51 files passed; 1,928 tests passed; one existing workspace test skipped.
Rabakz: 65 tests across three files. B1–B7 and the corrected A15/A20 are ported.
Round 1 is committed; round 2 remains uncommitted for Claude review.

| Review item | Change and assertions |
|---|---|
| 1. D-073 input ordering | Actions processed in host receipt order; leader skip immediately reveals and later taps do nothing. A2/B7 and the tie boundary test. Unfiltered fuzzScript includes skips. |
| 2. RZ-013 eligible solo | Solo count excludes waiting joiners, retains disconnected eligible members. B3 and existing disconnection/solo regressions. |
| 3. Tick-0 joins | Eligible true, joinedMidGame false. B4. |
| 4. Secrets | Removed separate future option-text declarations; future prompts/correct answers remain secret, with path matching for future correct indices. Future options still scramble; shared option-text assertions and kit secret checks pass. |
| 5. Categories | Zero/single-category picker omitted; absent categories mean Mixed, normalised to [] at init. No mixed category sentinel. Both schemas validate. |
| 6. End layout | No continue control at over; scoreboard leader continue retained. Explicit over-layout assertion plus B2. |

Conformance: all 25 unchanged checks pass with skips for solo/eight-player FFA and two/eight-player
teams (5,000 steps per scenario), plus four 5,000-step membership replays.
The repeat-taps check passes honestly: 571 probes. Source filtering helper removed.
`conformance.txt` and `conformance.json` were explicitly regenerated with:

```sh
RABAKZ_EVIDENCE=1 VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz
```

Default verification writes no evidence. Logs were captured in /private/tmp then deliberately
copied here. Initial verification attempts caught lint errors; those were fixed without
changing any check, timeout or dependency. Final verify tail:

```text
 Test Files  51 passed (51)
      Tests  1928 passed | 1 skipped (1929)
   Start at  22:03:54
   Duration  35.89s (transform 668ms, setup 0ms, import 2.10s, tests 66.02s, environment 2ms)

$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 31 in progress, 1 later, 120 not started
trace check passed

```

Pure rules and controller descriptors only; no visual output or screenshot UAT applies.
Host-side kit timings do not measure browser rendering, network or GC behaviour.
No shared trackers, contracts, lockfiles, dependencies, pushes or merges were changed.
Independent Claude review and integration remain outstanding.
