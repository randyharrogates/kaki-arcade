# T-06 review round 1

Scope: TR-050, TR-057, TR-006; D-093 supersedes the provisional slice rules.
Nothing is drawn. Rendered screen fit and eight-cook playability remain lead/T-07/T-11 UAT.

## Review items

1. Replaced the two long multi-crew conformance tests with four 3,000-step tests: each seed at
   one and eight cooks. Each asserts real service, score, dirty return, expiry, deterministic
   replay after JSON reload and round end. Source purity, malformed definitions and loader
   determinism remain covered. No time limit was increased. Removed the redundant full-round
   idle timing loop from this file.
2. Both seeds use the D-091 default solo thresholds 200/400/600.
3. Dropped the no-reuse supply formula. Require positive clean stock for every required kind,
   six plates for plated dishes and D-093's worst eight-cook arrival/chop floor. The floor
   requires two boards in Kopitiam and three in Zi char; these remain test kitchens with one
   plating counter, not final eight-cook layouts. Regression cases cover zero cups, five plates
   and no bowl for laksa.
4. Every twist kind is refused for missing behaviour. Seed hooks are removed; Zi char is
   renamed zi-char-test-kitchen. Typed hooks remain, with floor, contiguous path, two-kitchen
   interaction and two-region split checks.
5. Added validated venues to format, seed data and compiled runtime levels.
6. Refuse unused ingredient and drink crates, bad facing access, duplicate catalogue ids
   ignoring case, duplicate ordinals, ordinals outside integer 1–99 and multiple extinguishers
   on no-fire levels. Added validateCatalogue; validateLevels remains a compatibility alias.
7. Oversized footprints return before collision scanning or graph searches. Fire distance
   uses one multi-source search, shared by all burnable stations.
8. Removed compileLevel from the public package index; loadLevel validates before building a
   state and returns problems on refusal. Raw compile remains module-local API for fixtures.
   Missing legacy return counters now emit a missing-return-counter refusal, retain the dish
   and award no points; the regression checks all three outcomes.
9. Initial players and cooks sort by seat. PlayerInfo.team selects the corresponding kitchen
   and an unused spawn there; absent team uses spawn index. Regression covers reversed roster,
   team assignment and the no-team fallback. Insufficient team spawns return loading problems.
10. Renamed the publicView-only legacy test to say it checks inspection. The separate service
    test asserts container retention, no score/returns and the explicit refusal reason.
11. Slice note replaces provisional rulings with D-093, contains both current ASCII maps, and
    records the T-07/T-11/T-13/T-14 requests including 144+120 px fit, 5 px spare horizontal
    margins at 15 tiles, real twist behaviour, board/plating throughput, hidden seeds,
    kitchen-aware fallbacks/connectivity, team kitchens and arena interaction forms.

The reviewer's attack/time/serve/map probes were read. Existing rejection coverage was kept;
new failing or ruled cases were ported into levels.test.ts and review.test.ts as assertions.

## Timings and verification

First complete `VITEST_MAX_WORKERS=2 pnpm verify`: PASS, 116 files, 2,814 passing tests and
one pre-existing skipped test; Vitest duration 229.77 s. Build and trace passed.

A targeted level-file run during the second verification and companion orders run passed all
50 cases: 537 ms including transform/import, 151 ms tests. The four simulation cases took
16 / 30 / 12 / 27 ms (Kopitiam 1/8, Zi char 1/8). This is below 15 s each and 60 s per file.
The two level files together passed 72 tests in the earlier targeted run (600 ms overall).

First verification validator timings: 200×200 / 400 stations refused in 0.011 ms;
100 valid fire-enabled Zi char validations took 26.132 ms total. The oversized-grid regression
asserts a generous 200 ms bound, and valid fire-distance checks still run on the seed.

Load setup: a shell loop repeatedly runs the separate rules/orders.test.ts file with
VITEST_MAX_WORKERS=2 while the second complete verification uses VITEST_MAX_WORKERS=2.
The supplied memory-check script was attempted; sandbox restrictions prevent sysctl access.
No check, package manifest, dependency, lockfile or existing timing limit was loosened.

Second complete verification under load: PASS, 116 files, 2,814 passing tests and one
pre-existing skipped test; Vitest duration 332.10 s. Build and trace passed. The four level
simulations took 35.0 / 61.5 / 21.6 / 46.7 ms. Oversized validation took 0.041 ms;
100 valid validations took 44.542 ms. The separate orders file passed repeatedly throughout.

Final verify tail:

```text
 Test Files  116 passed (116)
      Tests  2814 passed | 1 skipped (2815)
   Duration  332.10s
$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 74 in progress, 1 later, 77 not started
trace check passed
```

Logs: review-1-verify-first.txt, review-1-verify-load.txt, review-1-companion.txt,
review-1-level-timings.txt and review-1-regressions.txt.
