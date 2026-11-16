# T-03 review-fix round 1 evidence

Pure simulation; screen judgement of provisional D-080 timings remains open.

- A01–A16 and A02b: PASS, with exact finished-output assertions for the same-step races.
- Additional shared-clock, rack/bin and ordered chop/grill history assertions: PASS.
- Station boundaries, 1–8 cook seeded conservation/reload, walking extinguisher rescue,
  attacks, reviewer fuzz and reviewer performance workload: 42 tests PASS (`review-tests.txt`).
- Fuzz: 512,363 cook-steps, 12 ignitions (7 spreads),
  no unfinished output; exactly one extinguisher, valid ownership/location and all indexes.
- Unmodified conformance kit: PASS for solo and eight cooks, full matches and membership
  replays. The eight-seat scenario includes a fire, rack pickup, bin disposal and a grill turn.
  Fixtures use seat assignment so the kit's player IDs exercise the same mechanisms.
- Public data: worker seat/null, burnt-to-fire remaining/total steps, ordered process history.
- No dependencies, package manifests, lockfile, shared trackers or specifications changed.

Node timing observations (report only; existing budgets and time limits unchanged):

- Reviewer busy-kitchen workload: worst step 11.460250 ms;
  highest block p95 0.125708 ms. See `review-performance.json`.
- Occupied-station/crate abuse: worst step 2.175042 ms.
  The 60/6,000 resting-item enumeration probes retain equal bounded hand reads.
- Kit: solo worst 5.3025 ms, eight cooks worst 1.9634 ms (`conformance.txt`).

The sandbox denies `sysctl`, so the memory probe could not report free memory. Final
verification uses `VITEST_MAX_WORKERS=2`; ordinary verification does not refresh evidence.

Final `VITEST_MAX_WORKERS=2 pnpm verify`: PASS (70 files; 2,285 passed, one skipped).
Typecheck, ESLint, design lint, build/budgets and trace passed.

```text
Test Files  70 passed (70)
      Tests  2285 passed | 1 skipped (2286)
   Start at  00:14:50
   Duration  229.55s (transform 1.70s, setup 0ms, import 5.07s, tests 445.25s, environment 5ms)

$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 60 in progress, 1 later, 91 not started
trace check passed
```
