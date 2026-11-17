# K-05 — Private display panel

Requirements: CTRL-003, CTRL-002; D-132; R-10 control label floors.
Sensors remain K-06. Rabakz's three-stat row arrangement remains R-02.

## Round 4

The round-3 independent re-review was NOT CLEAN. Opened the review screenshots for
split figures, the long answer, eight long options (with and without private text),
and the overflowing text/options combination.

- Stat values use nowrap without anywhere wrapping. Pure metrics measure the entire
  figure width at each permitted step; labels may still wrap. A floor wider than the
  panel rejects the pair rather than splitting a number.
- Shared placement reserves content floors before allocating private space. Options
  reserve their glyph, gap, borders and padding and at most three lines at 21 px;
  whole words must fit too. Text controls reserve their measured column height.
  `packLayout` accepts these pure column floors; control-only packing retains its
  original defaults. Impossible combinations return fits:false.
- Conformance split: layouts without private blocks use main's `checkPhoneFit`,
  including its unchanged 818 × 314 phone rule, PHONE_LIMITS and packPhone.
  Layouts with private blocks use `placeController`, also called by the renderer.
  The repeat-audience probe explicitly returns no private view and its original
  `report.ok` assertion is restored; it tests the control-only contract.
- Replaced the accepts-iff-placement tautology with content-against-box assertions
  across every fixture pair and audience. Added long-answer, eight-long-options,
  long-text/options, single-line stat width and control-only grid/cards regressions.
- Private transitions crossfade only changed blocks using the shared 4A incoming and
  opaque outgoing motions. Card reveals use `cardTurn()`; held controls remain stable.
- PRIVATE_LINE_HEIGHT comes from the existing `@kaki/ui` lineHeight.body token.
  No UI token was missing or changed. Platform declares that workspace dependency;
  its purity test allows UI only for private-placement, with all other game modules
  retaining the original import restriction.
- Added platform package exports for layout, phone-placement, phone-placement-types
  and private-placement. Controller-kit declares @kaki/platform and uses these
  package exports; the architecture dependency line lists all four modules.
- UAT adds picker/stats, picker/stats-second, long-answer/picker and eight long
  options/text pairs at every requested viewport. It checks stat Range rectangles
  occupy one line and control text rectangles stay inside their button or part.
  The custom eight-option fixture is injected into the development catalogue in the
  browser by the script, without changing app-owned fixtures.

## Round 4 validation and integration

Round 4 was committed as `97b93ea`. Its scoped validation passed 22 Vitest
files (215 passed, one skipped), TypeScript and ESLint. The integrator completed
the platform TypeScript reference in `169f489` and the workspace lockfile in
`f2418ee`; these are completed integration work, not outstanding requests.

The deliberate `conformance-attacks.test.ts` change remains: the picks probe
uses `privateView: () => null` because picks with its private view plus the extra
leader control is rejected by D-132. The probe tests the control-only contract.

## Round 5 — whole-word content floors (CTRL-003, CTRL-002; D-132)

Opened the supplied `k05r5/32-phone1-failure.png`: “Instruments” crosses the red
answer button into the blue button. The DOM step chooser clamped the measured
width to the available width, hiding horizontal word overflow when wrapped height
fit. It now includes the constrained span's scroll width. A regression isolates
this case with fitting wrapped height and an overflowing word.

The shared pure `optionLabelStep` measures whole words at 34 then 21, including
the step's glyph, gap, borders and button padding. Placement uses that function
both to reserve each option's content floor before assigning private width and
to reject impossible pairs; the renderer uses its selected step as an upper bound
on DOM font selection. The exact long-answer/“Your picks are secret” pair is
covered at 667 × 375 and 667 × 307, including the word, glyph and inset widths at
both steps. Oversized unbreakable options step down or fail conformance.

Audited the other requested boxes: text controls already check whole words;
control grids now check labels at their permitted steps, including glyph space.
Private text and stat labels now measure whole words and use normal wrapping.
Private grids reserve a square cell large enough for their longest word at the
13 px floor and reject impossible geometry. Tests cover these floors and oversized
words. The existing character-wrapped 100-letter private-text test now correctly
expects rejection. Actual private stat-label overflow also participates in the
renderer fit check. No UAT measurement needed changing.

Validation: the permitted scoped Vitest run passed 22 files, 219 tests with one
skipped (220 total). Both TypeScript commands and scoped ESLint passed. Commands:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/controller-kit packages/platform/src/game apps/web/src/private-session.test.ts`
- `pnpm exec tsc -b`
- `pnpm exec tsc -p tsconfig.json --noEmit`
- `pnpm exec eslint packages/platform/src/game/private-placement.ts packages/platform/src/game/conformance-private.test.ts packages/controller-kit/src/layout-label.ts packages/controller-kit/src/layout-label.test.ts packages/controller-kit/src/layout-renderer.ts packages/controller-kit/src/private-panel.test.ts`

### Round 5 integration and evidence

Round 5 was committed as `8a27991`. The integrator ran a UAT with 68 shots,
committed the evidence as `ec14584`, and merged main as `2d3f729`. The independent
re-review was NOT CLEAN: the round-5 crossfade strip is blank in all 12 frames.
The round-3 strip shows the incoming text and outgoing cards as expected. Both
strips were opened during round 6. Earlier review findings A, B and C are fixed.

## Round 6 — fit isolation and private transitions (CTRL-003; D-132)

- Fit measurement temporarily detaches decorative ghost subtrees, excluding them
  from both descendant type-step queries and the panel's aggregate scroll box.
  Each completed or cancelled fade remeasures the live panel after cleanup.
- Added blocks use the shared crossfade incoming motion. Removed blocks retain
  their captured geometry and use the helper's exit-only outgoing fade with the
  shared shorter exit duration. Reduced motion still changes instantly.
- The private card container added perspective for cardTurn; round 7 replaces its spacing-derived distance with the D-140 card-perspective token.
- Private grid floors reserve the renderer's space-5 padding and panel edge,
  plus 10% glyph headroom. The grid-words fixture contains Kitchen, Counter,
  Steamer, Dumplings, Wonton and Chicken, including the measured 59 px word.
- Renderer regression tests cover cards → text, cards → stats, revealed → text,
  grid → text, stats → rabakz and rabakz → stats with motion on, mid-transition
  font measurement, ghost cleanup and completion remeasurement. Grid placement
  agreement is checked at the review's three device/layout combinations.
- K-05 UAT now asserts visibility and data-fits after transitions and checks the
  incoming text in crossfade frames, so the blank round-5 strip cannot pass.

## Close-out

Round 6 was committed as `83811bf`. The integrator committed real UAT evidence
as `ae76e87`: 68 shots plus two strips, every image looked at by the integrator.
The test types were integrated in `4ed9340`. The re-review was NOT CLEAN: the
two round-6 must-fixes were fixed, but interrupted private fades could retain
temporary surface styles. Existing conformance-attacks behaviour is retained.

Only the four permitted checks were run for round 6:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/controller-kit packages/platform/src/game packages/ui apps/web/src/private-session.test.ts` — passed: 26 files, 291 tests passed, one skipped.
- `pnpm exec tsc -p tsconfig.json --noEmit` — passed.
- `pnpm exec eslint packages/controller-kit packages/platform/src/game packages/ui/src uat/slices` — passed.
- `pnpm run lint:design` — passed: 367 files scanned.

Initial checks caught a test expectation for added blocks, a UAT optional-string
type error and test lint issues; all were corrected before the passing reruns.
Codex ran no verify, whole-suite Vitest, UAT, browser or install; the integrator
ran and reviewed the UAT described above. No node_modules links or copies were made.

## Requests

Integrator: run and visually review the amended K-05 UAT and independent review.
No lockfile, tsconfig or dependency work remains requested.

## Round 7 — interrupted fades and D-140 (CTRL-003; D-132, D-140)

- Before capturing a second private change, finish and restore running private
  fades. Cleanup is idempotent and cancels both animations before removing the
  ghost and restoring the live element's original surface and stacking styles.
- Changes to block count, block geometry or panel geometry crossfade the entire
  panel. Stable arrangements retain per-block fades; stable card reveals retain
  their card turn. Reduced motion applies the new state immediately.
- Each private grid selects one largest type step that fits every label. Pure
  metrics also record the common grid step; options still step independently.
- Exported CARD_PERSPECTIVE (610 px) from @kaki/ui and generated its CSS custom
  property. Private cards and the specimen use that property. Added exit-only
  crossfade coverage for the shorter exit and opaque default outgoing surface.
- Text-control whole-word placement permits exactly 1 px of horizontal glyph
  overhang. The renderer uses that shared placement and UAT allows the same
  horizontal tolerance for control text ranges.
- UAT transitions now run at 667 × 375 and 932 × 430, including changes 90 ms
  apart and assertions against retained inline fade styles. Added an eight-frame
  rabakz → stats strip. Each strip now has eight frames at 55 ms intervals,
  retaining 24 total captured frames across all three strips; transition loops
  add no screenshots. The integrator enforces the 14 MB evidence cap.
- Added DOM-effect regressions for interrupted fades and uniform private grid
  labels, plus pure overhang/grid-step tests.

Round 7 validation:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/controller-kit packages/platform/src/game packages/ui apps/web/src/private-session.test.ts` — passed: 26 files, 296 tests passed, one skipped.
- `pnpm exec tsc -b tsconfig.build.json` — passed.
- `pnpm exec eslint packages/controller-kit packages/platform/src/game packages/ui/src uat/slices` — passed.
- `pnpm run lint:design` — passed: 367 files scanned.

Initial checks caught a generated specimen mismatch, a test typing error, empty
fixture methods and a test colour literal; all were corrected. The interruption
regression was strengthened to assert temporary styling is actually applied.

Round 7 close-out (integrator, 2026-11-18): committed as 7ee99ae; UAT with `--max-mb 14` passed
(68 shots and three 8-frame strips, 13 MB, every image opened; evidence in
`uat/evidence/K-05-private-panel/round7/`, commit b0418b0); full check passed (3,594 tests,
every budget); independent review CLEAN, including 135 live browser runs of back-to-back changes
16 to 350 ms apart with no styles or ghost left behind.

Follow-ups, none visible to players: the UAT settle check covers blocks but not the panel itself
after a whole-panel fade, and no DOM test covers a second change during a whole-panel fade; the
old panel in a whole-panel fade stays opaque and could vanish in one frame if a future view
shrinks the panel's box; `crossfade({ exitOnly })` in `packages/ui/src/motion.ts` is now unused.
Not from this round: in shot 34 (eight long options, 667 × 443) the text block steps down one
by one under D-132, so "Watch the TV when ready." can read larger than the title above it.
