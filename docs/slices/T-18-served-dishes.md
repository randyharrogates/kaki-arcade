# T-18 served dishes — round 3

Scope: TR-041, TR-040. Branch: `issue/T-18-served-dishes`.

## Changes

Completed fixed dishes expand into their recipe container and `composition`
layers. `servedComposition` selects the actual kopi or teh, including kaya toast's
side cup. Partial and dirty containers use only present contents, with
`contentCompositions` replacing generic portions and `portionScales` applying
only to generic portions. Explicit anchors win over slots; stable pooled insertion
sorts metadata layers by `order`. Item layers share depth so a portion's vertical
anchor cannot reverse their draw order; held items retain the cook's front/back
hands convention.

Each cached item owns a derived number of reusable draw records (currently 9). Unchanged content reuses them
while placement changes; the sprite pool and interpolation storage use the same
capacity. Source-frame anchors, trim and composition scales drive placement.
Counter bounds use full-resolution rectangles at both details. Half textures
still draw at twice sprite scale. No additional outline pass is applied to baked
ink. No assets, packer, rules, dependencies or trackers changed.

Unit coverage compares all seven dishes against packed metadata with kopi and
teh at both details, checks partial/dirty contents and scales, explicit-anchor
precedence, stable sorting, cache reuse and invalidation. The new dev fixture and
`uat/slices/T-18-served-dishes.mjs` stage all seven dishes on counters, a partial
plate, a held plated dish and a serving-counter dish at 1920 × 1080 and
1280 × 720, with both detail levels and both drinks.

## Integrator decisions

1. `containmentFootprints` is published-pixel metadata, not a rendering input
   (ART-PIPELINE §2). It is neither consumed nor added to the packed manifest.
   Packed `bakedOutline` means the PNG already contains ink and receives no extra
   renderer outline (§10).
2. This reader works entirely in full-resolution source coordinates: the
   89 × 89 canvas and [44.5, 44.5] source anchor. No anchors are halved, including
   nested explicit anchors. Half-detail textures draw at twice sprite scale;
   §10's anchor-halving rule applies to readers using half-detail coordinates.
   A one-line comment records this convention at the placement transform.

## Checks and evidence

Checks ran one at a time with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`:

- Requested Tabao Rush non-DOM suite: 30 files passed, one failed; 380 tests
  passed, one failed. `movement.test.ts`'s existing TR-022 seeded cramped-run test
  exceeded its 5,000 ms timeout (5,034 ms). No movement code or timeout changed.
- Focused final rerun of `host/item-model.test.ts`, `host/screen.test.ts` and
  `src/rules/movement.test.ts`: all 3 files and all 32 tests passed, including
  the previously timed-out test, six new composition tests and allocation checks.
- `pnpm exec tsc -b tsconfig.build.json --listEmittedFiles`: passed, including
  the UAT slice; all 1,032 emitted files removed afterwards. Repeated after the
  final changes with the same result. `--listEmittedFiles` identifies cleanup.
- `pnpm exec eslint games/tabao-rush uat/slices --max-warnings 0`: passed on the
  final files. The first run found one unnecessary optional chain in a new test;
  it was corrected.
- `pnpm run lint:design`: passed, 514 files scanned.
- `git diff --check`: passed.

Integrator reports round2 UAT ran and passed, and verify passed. This round runs
only the requested unit tests, typecheck and ESLint; no UAT, perf, verify, installs
or commits. Performance and the physical 3 m TV check are still owed.

## Close-out and Requests

Integrator: review round 3, capture and inspect the new held-dish stills, run
performance on a quiet machine and complete the physical 3 m TV check. Record
D-286 below in the decision log at merge. Ports and exact commands:

```sh
export KAKI_PORT_WEB=6340 KAKI_PORT_SIGNAL=6341 KAKI_PORT_UAT=6342
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- T-18-served-dishes --out round2-uat
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm perf -- tabao-rush-screen
```

## Round 3 review fixes

The cap is derived from loaded composition/served variant lengths and recipe
container capacities multiplied by each container's largest content override,
plus its base. This deliberately conservative bound is 9 with the current
manifest. Excess layers increment the model overflow and feed `pool.overflow`.
The renderer visits only current/previous active nodes and attaches sprites on
use. With 512 item slots, the scene pool falls from 8,744 + station count to
5,160 + station count (3,584 fewer sprites). No performance result is claimed.
Detail is read once in the fixture. `held-dish` faces cook 1 east and has explicitly
named stills at both resolutions and details.

## D-286 — renderer composition and coordinate contract (for integrator recording)

The renderer reads `composition`, `servedComposition`, `contentCompositions` and
`portionScales`; `containmentFootprints` is validation only. `bakedOutline` means
no added outline. There is one full-resolution coordinate space with no halved
anchors. Items share a depth with a per-layer offset. The pool cap is derived
and overflow counted.

## Round 3 check results

All pnpm commands used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`. Vitest used
`VITEST_MAX_WORKERS=2` and `--exclude '**/*.dom.test.ts'`, with runs sequential
and below the 10-minute limit.

- Host suite: 6 files / 40 tests passed, including the final rerun after overflow
  accounting changed. Tests cover the derived bound, exact excess-layer count in
  `pool.overflow`, cached movement, and composed counter fitting with divisor 2
  using independent full-resolution expected positions, scale and layer depth.
- Wider Tabao Rush suite: 29 files passed / 2 failed; 381 tests passed / 3 failed
  in 305.86 seconds. All failures were existing 5-second test timeouts:
  `review/review.test.ts` conservation cases corridor / 3 cooks and pillars / 7
  cooks, and `host/station-cue.test.ts` reachable-cook sweep. The sweep passed in
  the final host rerun. No thresholds or unrelated code changed.
- `pnpm exec tsc -b tsconfig.build.json`: passed after correcting the new test's
  Map type inference; `pnpm exec tsc -b tsconfig.build.json --clean`: passed.
- ESLint on all changed code paths with `--max-warnings 0`: passed.
- `git diff --check`: passed.

The existing untracked round 2 evidence folder was left untouched. No new visual
acceptance or performance measurements are claimed.
