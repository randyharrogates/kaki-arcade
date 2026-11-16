# T-04 review-fix round 2 evidence

Authority: D-085 and D-087 (2026-11-17), read from the primary checkout’s decision log.

## Coverage

1. A enumerates ingredient histories, stations and containers, asserting no trapped preparation
   and exact preview/effect agreement. A separate assertion lifts finished broth, plates it in
   a bowl, adds raw noodles with an `add` preview and checks completed laksa. Unfinished broth
   cannot be trapped in a plate/cup or crowded out of its bowl before noodles arrive.
2. B asserts cup separation after binning, matching plate/cup rack acceptance and named cup
   pickup. Additional assertions cover washing and fire separation, identities and dirty state.
   Completed toast sets still lift together for service; incomplete/emptied sets expose cup
   pickup. Detached cups use a free hand, an available counter, then a walkable floor pile.
   Empty plates left after lifting a lone cup become plates rather than empty dishes.
3. C asserts missing ingredient: drink for toast alone, toast with loose drink and toast with
   an empty cup. R9 is updated to the D-087 rejection; R7 asserts detached dirty fire containers.
4. D asserts empty/replacement plating timings of 0/0 after completed assembly and one unit
   of progress for simultaneous workers. Content replacement and cup removal reset timings.
5. Conformance reuses one recorded chicken-rice journey and retains both 12,601-step
   one/eight-cook scenarios, all kit checks and the 120-second limit. Its kitchen fixture
   omits mechanisms unused by that journey. All seven original walking/button journeys remain.
6. Both performance probes retain transit queues and allow arrivals at return counters.
   `performance.json` records accumulated returns separately from the constant active workload.
   Reviewer performance output records arrival-step timing and final queue/counter counts.
   Public views index transit IDs once instead of searching the queue for every item.
7. The slice note records D-087 and the requested T-05/T-06 integration obligations, including
   the review fixtures’ unreachable tile-0 return counter.

Round-2 reviewer tests live in `rules/r2.rev.test.ts` and `rules/fuzz2.rev.test.ts`.
The latter retains all eight full-round 1/2/4/8-cook cases with fires on/off, conservation by
container type, food loss/source rules, indexes, preview/effect agreement, leave/rejoin,
determinism and codec reload. Round-1 fuzz and existing tests remain.

## Results

`VITEST_MAX_WORKERS=2 T04_EVIDENCE=1 pnpm verify`: **PASS, exit 0**.
85 test files passed; 2,380 tests passed and one existing test skipped. Workspace, typecheck,
ESLint, design lint, build/budget hook and all 152 requirement trace checks passed.
A–D plus the additional broth/washing/fire tests: **9/9 PASS**. R1–R16: **PASS**.
Round-2 fuzz: **8/8 PASS**; round-1 fuzz: **8/8 PASS**. All seven original recipe journeys:
**PASS**. All 29 recipe tests, including combined conformance: **PASS**. Both full-match
conformance scenarios and membership replays remain; the existing 120-second test limit is
unchanged and passed. The full workspace run took 291.23 s.

Busy probes A/B each delivered returns on 12,300 steps and ended with 343 in transit and
14,057 at return counters. Arrival-step mean: **0.0425 / 0.0407 ms**; p95:
**0.0894 / 0.0806 ms**; worst: **0.655 / 3.035 ms**. Public-view p95:
**1.4465 / 1.1930 ms** with a 1,577,527-byte synthetic accumulated-supply sample.
Idle step p95: **0.0079 ms**. Mass-return stress ended with 50,400 transit/returned containers,
13 other roots; its worst post-warm-up step was **37.701 ms**. These deliberately oversized
synthetic populations exceed real finite supply and make return costs visible.

`verify-r2.txt` is the authoritative final verification log. `review-tests-r2.txt` summarises
assertion results; `review-performance-r2.txt` extracts the final probe figures.
`conformance.{txt,json}` and `performance.json` contain the final structured evidence.

These are Node measurements on shared hardware. The probes inject fresh synthetic containers
continuously, so returned supply grows far beyond the real game’s finite eight containers.
They measure arrival and accumulated-return costs; they are not conservation scenarios or
quiet-machine browser performance approval. No screen UAT or independent Claude review is claimed.
