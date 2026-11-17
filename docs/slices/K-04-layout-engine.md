# K-04 — Controller layout engine

## Goal and scope

CTRL-002: assemble a phone controller from its current declarative layout and play-area
size, keeping targets above the D-051 floors. CTRL-001, CTRL-004, CTRL-005 and CTRL-006
are context supplied by the merged shell, stick and buttons. No game rules, transport,
private-view panel (K-05) or motion/gesture acquisition (K-06) is added.

## Built

- `layout-placement.ts`: pure audience-aware placement returning rectangles, required canvas
  and `fits`. Left stick/D-pad; fixed face positions in a right-hand diamond; shoulders along
  the top; options in TV row order; a centred picker and right-thumb action; card row; centred
  text with title/body/note tones. Only declared controls render.
- `layout-renderer.ts` and `layout.css`: stable keys retain surviving DOM and held state;
  pointer capture, cancellation, haptics and press feedback; disabled targets cannot press;
  item selected/focus presentation; outputs carry control, value, phase and revision.
  Removed held controls release through the existing kit cancellation path. Button and
  D-pad releases retain the revision of their press; stick gestures retain their starting
  revision. New gestures use the current layout. Sessions decide which outputs are stale; held releases must still clear local held state
  before network filtering.
- `layout-types.ts`: structural boundary compatible with platform `ControllerLayout`, and
  the tap-signature revision guard. Presentation-only changes preserve revisions; changed
  tap meaning requires a bump; revisions cannot go backwards. Text-only bumps are allowed.
- Demo fixtures selected by `/play?demo=controller&layout=tabao|rabakz|poker|dpad-only|text-only|cards|every`.
  Rabakz switches to “Watch the TV” after a choice. Existing stick/default and
  `controls=buttons` demos remain. Development-only `controller-demo-layout` events switch
  fixture by name; the output element records callback history for UAT.

## Decisions and board differences

- General margins and inter-control gaps are 13 px. The grid uses board 4's explicit
  exception: 8 px gaps and exactly 89 × 68 px cells. The single large Lock in option is 144 px tall; multi-option rows fill the play area.
- Face targets grow from 110 to a 144 px maximum, constrained by measured available
  height and column width. Rectangular bounds remain separate with 13 px gaps; the diamond
  uses a wider horizontal axis to keep all four fixed face positions visible.
  The stick capture area consumes its allocated left column (or the whole available area
  when alone); the existing floating stick model controls the visible disc's bounded size.
  D-pad cells grow from 89 × 68 to a maximum of 144 × 89. Option widths fill the available
  column; their maximum is the supplied play-area width minus margins. Card rows fill their
  column, with board card heights (122 px tappable, 93 px read-only). The supplied play area
  is the outer maximum for all growing regions.
- The 4 × 4 picker is geometrically centred when a 144 px action fits to its right; at 667 px
  it shifts left enough to retain both action and 13 px margins. Board 4 was drawn at 844 px.
- Generic packing places independent panel declarations in columns. A game should supply a
  feasible phase layout. The intentionally exhaustive `every` diagnostic exceeds every
  requested phone size; it returns `fits=false` and preserves floors on a larger required
  canvas rather than shrinking targets. It is a catalogue, not a playable game phase.
- Screen swaps retain an inert visual snapshot behind the incoming controls for the shared
  crossfade duration. Newly entering controls fade in; surviving held controls stay opaque
  and track directly. Reduced motion removes the snapshot immediately.
- The brief explicitly requires disabled buttons not to press. Implemented that behaviour;
  platform's ButtonControl comment currently says disabled presses still arrive. The
  integrator should reconcile that comment before integration.

## Requests / contract limitations

1. The fixed schema has no Start/Select control. Neither is fabricated or drawn. Start is
   still available in the existing buttons demo. Add a schema representation in a later
   contract slice if layout-driven Start/Select is required.
2. Held buttons have `disabled`, but no `ItemState`; options, grids and cards have ItemState.
   The renderer honours the fields that actually exist.
3. Controller-kit has no platform dependency or project reference, and package/config edits
   are forbidden. A local structural input type avoids importing platform implementation
   code or adding a runtime dependency. Integrator should consider moving shared layout
   types into the existing lower-level contract package in a future slice.
4. Swipe/shake/tilt acquisition is K-06. Those declarations produce no synthetic controls or
   callbacks here. The exhaustive fixture includes them for the hand-off; UAT input coverage
   covers K-04's supported interactive kinds only.
5. No arbitrary schema can fit every part on one phone while preserving the floors. The
   caller must inspect `fits` and supply a feasible phase layout; the exhaustive catalogue
   intentionally demonstrates the failure contract.

## Acceptance and validation

`layout.test.ts` checks the three requested phone sizes (passing the remaining play area
below the shell header), margins, circle clearance, floors, fixed grid geometry, options,
growth, audience filtering, impossible packing, output revision tagging and stale filtering,
and semantic revision transitions. Existing kit tests also run.

UAT: `uat/slices/K-04-layout-engine.mjs` captures each fixture at all three sizes; exercises
face press/release, stick vector/neutral, D-pad direction, options choice, grid cell index,
card id and disabled card, removal mid-hold, Rabakz transition and reduced motion. The
integrator must run it on ports web 5390 / signal 5391 / UAT 5392, inspect all screenshots and
frame strips, and run full verify. No browser, full verify, evidence write or commit was
performed in this sandbox, per the implementation brief.

## Close-out

- Requirement: CTRL-002; code and test paths above.
- Unit/type/lint/design checks: results reported in the implementation hand-off.
- Evidence: pending integrator UAT; no evidence directory was written.
- Review: pending independent integrator review. Changes intentionally uncommitted.

## Round 2 — integrator UAT fixes (CTRL-002)

Read the round1-failure report and opened k04-a.jpg and 08-phone1-tabao-844.jpg.
The screenshots show stacked faces, overlapping parts and uncentred text.

- `layout-renderer.ts`: rectangle lengths are explicit px strings; wrappers receive placement
  left/top/width/height. ResizeObserver measures the actual play area on mount and resize;
  no header-height assumption is used by rendering. The relative engine fills its parent.
- `layout.css`: controls fill their wrappers with border-box sizing; grid rows fill their
  rectangles, options have 34 px labels and 13 px gaps, and the stick fills its left area.
- `layout-placement.ts`: faces keep fixed top/left/right/bottom positions with separate
  rectangular bounds. Text-only groups are centred, ordered title/body/note; title uses the
  display face. Poker retains the 89 × 68 cells, 8 px gaps and separate 144 px Lock in action.
- `layout-fixtures.ts`: Rabakz matches the host row order cross/circle/square/triangle.
  Renderer defaults follow that order and explicit OptionItem.face always takes precedence.
- `uat/slices/K-04-layout-engine.mjs`: each fixture at each size checks measured control
  bounds for overlap, 13 px margins, 55 px target floors, 110 px faces at 844 × 390 and
  data-fits=true. The press test addresses the actual pick target.

Validation: 65 controller-kit tests pass; build typecheck, ESLint on changed code and design
lint pass. No full verify or browser/UAT execution; no writes under uat/evidence.

Close-out: the playable fixtures are covered by pure placement tests; visual acceptance and
independent review remain with the integrator. Changes remain uncommitted as in round 1.

Request: the exhaustive `every` fixture is still physically impossible at phone sizes while
retaining all required target floors. Its strict new UAT assertion will report failure rather
than accepting data-fits=false. The integrator must split that catalogue into feasible phases
(or supply a larger canvas); shrinking targets or silently hiding declared controls would
violate the brief. This outstanding fixture limitation prevents a claim of complete UAT pass.


## Round 3 — note clearance, action label and screen change (CTRL-002)

Read the integrator's round2 REPORT.md and opened k04r2-a.jpg and
24-strip-answer-transition.jpg at full size. The integrator's `every` expectation is
retained: it must report `data-fits="false"`. That resolves the round 2 Request about the
stress fixture; it remains an intentionally impossible catalogue.

- `shell.css`: the board now has a flexible play row and an intrinsically measured note
  row. The browser measures the actual note (including wrapping and its bottom padding),
  with no assumed note height. LayoutEngine's existing ResizeObserver reads the resulting
  play rectangle. The play row clips controls and establishes the containing block and
  stacking context for its outgoing snapshots.
- `layout-renderer.ts`, `layout-placement.ts`, `layout.css`: a single option uses a
  non-wrapping 34 px label and 13 px horizontal padding. ResizeObserver measures the actual
  label font, adding icon, gap, padding and borders; Poker's action grows to that width
  while keeping the grid cells and action height at their existing floors. At insufficient
  height the fixed grid remains above the note, but reports the missing margins via fits=false.
- `layout.css`: the incoming engine has z-index 1 and its outgoing snapshot z-index 0.
  The renderer continues to use `@kaki/ui` crossfade() exactly: outgoing opacity stays 1
  throughout the token duration, then its snapshot is removed. Inert outgoing wrappers and
  all descendants force pointer-events:none, including controls with their own pointer rules.
- `controller-demo.tsx`: the debug readout is hidden unless `?debug=1`; its data remains
  available to UAT. Fixture changes increase revisions so Watch the TV can return to answers
  and accept a new answer without a backwards revision error.
- `uat/slices/K-04-layout-engine.mjs`: adds the measured note rectangle to overlap checks,
  scrollWidth/scrollHeight against client dimensions for every control, and Lock in's
  no-wrap/13 px label inset checks. Both change directions capture 12 frames at an interval
  of ceil(slow-token/10), spanning beyond the full token duration to settled state. Each
  frame checks incoming-above-outgoing, full outgoing opacity, inertness and tap exclusion;
  final checks require snapshot removal. Reduced motion captures both settled states and
  requires no transition animations. The strict playable-fixture fit checks are retained.

Validation: 338 tests pass across 25 files with
`pnpm exec vitest run packages/controller-kit apps/web`. Build typecheck, ESLint on changed
TypeScript/UAT files and design lint pass. The new pure tests cover measured action width,
unchanged grid floors and insufficient height after reserving the note. Only the requested
checks were run; no full verify, browser/UAT run or writes under uat/evidence.

### Close-out

CTRL-002 round 3 changes are ready for independent integrator review and visual UAT.
Changes remain uncommitted, following the round 2 hand-off. Existing evidence was read only.

### Requests / remaining acceptance constraint

At 667 × 375, a fixed 4 × 4 grid is 296 px high; the required 13 px top/bottom margins
make its minimum play height 322 px. A 47 px shell header leaves 328 px before the note.
Any measured note above 6 px leaves too little height (the real 13 px caption plus padding
exceeds that). The engine therefore honestly reports Poker as not fitting there, and the
retained strict UAT fit assertion will fail. A 310 px measured-play regression test confirms
that floors are preserved. No threshold or playable-fixture expectation was relaxed.
The integrator must resolve the compact-height layout policy; a complete visual UAT pass
cannot be claimed with these simultaneous fixed geometry constraints.

## Round 4 — spacing fallback (CTRL-002, D-117)

D-117 supersedes round 3's compact-height acceptance constraint: retain 13 px outer
margins when the layout fits at the control floors; otherwise retry with 8 px, never
less. Control floors and internal gaps remain unchanged.

- `layout-placement.ts` tries 13 px first and retries at 8 px only after failure.
  Placement reports the selected margin; `fits=false` means the 8 px attempt also failed.
- `layout-renderer.ts` exposes `data-margin="13"` or `"8"` on the engine root.
- `layout.test.ts` covers Poker at exact play-height boundaries: 322 px fits at 13,
  312 px needs 8, and 311 px fails at 8, preserving the 296 px grid floor.
- UAT checks measured bounds against the reported margin and requires 13 px for all
  playable fixtures at 844 and 932. The impossible `every` catalogue still must report
  failure. Poker at 667 × 375 can now use 8 px after the shell reserves the note.

### Close-out

CTRL-002: 341 tests pass across 25 files via
`pnpm exec vitest run packages/controller-kit apps/web`; build typecheck,
ESLint on the four changed code/UAT files and design lint pass.
Only the requested checks were run. No full verify, browser UAT or evidence writes.
Changes remain uncommitted under the same round 3 hand-off rules.
Visual acceptance remains with the integrator.

### Requests

None. D-117 resolves the round 3 compact-height policy constraint.


## Round 5 — compact gaps (CTRL-002, D-118)

D-118 extends D-117: try (13 px margin, normal gaps), then (8 px margin,
normal gaps), then (8 px margin, 5 px gaps). Gaps never fall below 5 px;
controls retain their floors. Normal gaps remain 13 px, with the grid's 8 px exception.
`fits=false` now means all three attempts failed. The engine exposes `data-gap`
alongside `data-margin`, and rendering uses the selected spacing for grids,
options, cards and D-pad targets.

The measured 667 × 375 Poker play area is 307 px high. Its third attempt needs
8 + 4 × 68 + 3 × 5 + 8 = 303 px, keeping 89 × 68 px cells. Unit coverage checks
307 px and the exact 303/302 px success/failure boundary, as well as the first
two attempts. UAT asserts normal spacing at 844 and 932 for playable fixtures,
and compares measured margins, separation and non-overlap with reported spacing
at every size, retaining the normal grid exception and impossible catalogue check.

### Close-out

CTRL-002: 344 tests pass across 25 files using
`pnpm exec vitest run packages/controller-kit apps/web`.
`pnpm exec tsc -b tsconfig.build.json`, ESLint on changed TypeScript/UAT files,
and `pnpm run lint:design` pass. No full verify, browser UAT or evidence writes.
Changes remain uncommitted under the round 4 hand-off rules. Visual acceptance
remains with the integrator.

### Requests

None. D-118 resolves the measured 307 px play-area failure.


## Round 6 — opaque transition surfaces (CTRL-002)

Read the round 5 integrator report and opened `round5/32-strip-answer-transition.jpg`:
the answers retained full contrast until their snapshot was removed.
Each layout now paints the shell's existing single background treatment over its opaque
base, aligned to the shell origin including the header offset. The incoming surface fades
with the shared 4A incoming token, covering outgoing controls progressively. Newly entering
controls retain their fade; surviving held controls remain opaque and track directly.
Snapshot removal waits for the incoming surface animation to finish. Reduced motion removes
it immediately, and at rest only the live layout layer remains.

The answer-transition UAT decodes the actual captured strip and samples a blank interior
pixel of the first answer in all twelve frames, accounting for device scale and strip
columns. Contrast relative to the final background must decrease monotonically (4 units
of RGB-distance tolerance for JPEG), decrease across at least three intervals, and never
drop by 80% of its initial contrast in one interval. It also requires exactly one resting
layout. This rejects the round 5 abrupt disappearance without relying on opacity metadata.

### Close-out

CTRL-002: `pnpm exec vitest run packages/controller-kit apps/web` passes (344 tests,
25 files); `pnpm exec tsc -b tsconfig.build.json`, ESLint on changed TypeScript/UAT files,
and `pnpm run lint:design` pass. Only the requested checks were run; no full verify,
browser UAT or writes under `uat/evidence`. The updated strip assertion awaits the
integrator's UAT execution and visual review. Changes remain uncommitted under the
round 5 hand-off rules.

### Requests

None.


## Round 7 — wire revisions, locked geometry and contract fidelity (CTRL-002, CTRL-006)

This section supersedes the earlier implementation descriptions where they differ.

1. Wire revisions may advance for selected/disabled state changes. The engine checks only
   whole, non-decreasing revisions and reports problems through `onRevisionProblem` after
   render. The demo uses one full-layout comparison for all wire updates, including the
   watch transition. A state-only revision bump is exercised through the engine and demo.
2. Multi-option controls reserve `ceil(count / 2) * 68 + row gaps`; overflow reaches `fits`
   and the fallback. Seven/eight-option tests use 667 × 307, 844 × 322 and 932 × 362.
3. Faces use board 4 1A's equal-axis 95:110 step-to-face ratio. Triangle is top, circle
   right, cross bottom, square left. Clearance uses circles in unit tests and UAT.
4. Disabled held buttons use `aria-disabled`, retain feedback and emit press/release.
   Disabled choices remain blocked. Surviving held releases retain the press revision.
5. Spacing attempts are exactly (13,13), (8,8), (8,5). Shoulders occupy a separate side
   column so they do not consume the diamond's height. The stick/faces/L/R regression at
   844 × 322 selects (8,8).
6. Crossfades and snapshots occur only for changed controls/tap meaning. The transition effect has dependencies. Round 7 still built presentation/transition
   strings and cloned changed snapshots during render; round 9 corrects this with memoised
   strings and effect-only cloning. Text/label measurement is limited to presentation/width/audience changes
   and ResizeObserver callbacks.
7. Regression coverage checks face positions/growth, D-pad growth, uncapped card width,
   original-revision releases, stateful ARIA, blank cells and plain unshaped options.
   UAT checks independent floor sums for margins, 89 × 68 non-face targets, face floors,
   circle clearance, face positions, option row order and the separately measured wake
   note. It captures `every`, shoulders and disabled fixtures, and holds a surviving face
   through a changed layout. Its state-only grid step checks no ghost is created.
8. D-pad cells grow with their allocated region and preserve their 89:68 aspect.
9. Cards keep the 89:122 tappable aspect, at least 89 px width, and stay centred as a row.
   The renderer draws rank and suit glyph rather than suit words.
10. Shared `@kaki/ui` disabled CSS tokens provide board 4 `.lockd` opacity 0.4 and greyscale.
11. Unlabelled cells have only an accessible name; options without `face` stay plain.
12. Fixtures and fixture-based packing tests now live in `apps/web`, with generic names:
    `stick-faces`, `options`, `picker`, `shoulders`, `disabled-faces`, `disabled-options`,
    `selected-picker`, `watch`, `dpad-only`, `text-only`, `cards`, `every`.
    Controller-kit contains no game names or game fixtures; grid/action packing is generic.
13. `aria-pressed` requires item state; text uses observed content heights; `currentOutput`
    filters revision only for choices; the supplied `area` controls packing and root size.

### Close-out

Only the requested checks were run: `pnpm exec vitest run packages/controller-kit apps/web`
(357 tests, 26 files), `pnpm exec tsc -b tsconfig.build.json`, ESLint on all changed
TypeScript/UAT files, and `pnpm run lint:design`. All pass. No full verify, browser UAT or
writes under `uat/evidence`. Changes remain uncommitted under the round 6 hand-off rules.
Independent review and visual acceptance remain with the integrator.

### Requests

Run and inspect the updated UAT, including transition strips and added stills. At a
667 × 307 play area, a 300 px locked square diamond plus two minimum 8 px margins needs
316 px; it correctly reports `fits=false` rather than changing the locked geometry or
shrinking the 110 px face floor. UAT explicitly captures this insufficient-canvas case.
At 844 × 322 the diamond fits with 8 px margins/gaps; at 932 × 362 it keeps 13 px.


## Round 8 — narrow-phone face floor (CTRL-002, D-122)

D-122 supersedes round 7's 667 px insufficient-canvas request: at viewport widths
below 844 px the face floor is `max(89, 110 × width / 844)`; at 844 px and wider it
remains 110 px. Packing preserves the board 4 equal-axis diamond and grows faces
above that floor when space permits. The Tabao-style `stick-faces` fixture now reports
`fits=true` at 667 × 307 usable pixels within a 667 × 375 phone, including the shell
and wake note. Tests cover 667, 844 and 932 px, plus 700 and 843 px to guard the
proportional interval. UAT independently applies D-122 at every tested size and uses
the scaled diamond span for its margin and insufficient-canvas assertions.

The round-7 disabled opacity/filter tokens had no consumer outside controller-kit.
Removed both from shared `packages/ui/src/css.ts` and its generated `tokens.css`;
board 4 `.lockd` styling (opacity 0.4, greyscale) now lives in the kit's layout CSS.
No shared disabled design token is retained.

### Close-out

Only the requested checks were run: `pnpm exec vitest run packages/controller-kit apps/web`
(363 tests, 26 files), `pnpm exec tsc -b tsconfig.build.json`, ESLint on changed
TypeScript/UAT files, and `pnpm run lint:design`. All pass. No full verify, browser
UAT or writes under `uat/evidence`. Changes remain uncommitted under the round-7
hand-off rules; independent review and visual acceptance remain with the integrator.

### Requests

Run and inspect the updated UAT at all three phone sizes; 667 px diamond fixtures now
must fit while respecting D-122.


## Round 9 — clearance, viewport floor and disabled surfaces (CTRL-002, CTRL-006)

D-122 uses the phone viewport's long side, independent of the usable play width.
`faceFloor` now belongs to `@kaki/ui` beside `BUTTON_FLOOR`/`phoneScale` and uses
`phone.width`. LayoutEngine requires the viewport; the demo passes the same measured
viewport used by controlSizes. A 750 px play area retains a 110 px floor on an 844 px
phone and an 89 px floor on a 667 px phone.

D-125 supersedes round 8's local opacity/filter rule: disabled controls and cards use
shared opaque grey fill and reduced-contrast ink tokens, with no element opacity or
runtime filter. The existing contrast helper verifies at least 3:1. Inline item colours
cannot override the disabled fill. Both generated UI artefacts carry the new tokens.

Generic packing now includes the complete minimum column width in `fits`; the (8,8)
and (8,5) retries run when that width fails. Shoulders follow the preceding columns even
on an insufficient canvas. Tests cover every pair and triple of stick, D-pad, faces,
L/R, four options, grid/action and three cards at all three requested play sizes.
Every successful result must retain the reported gap between every placed pair.

The platform revision comment now states the non-decreasing rule and permits unchanged
signature bumps. The unused currentOutput helper/export is removed: staleness belongs
to the session. Output revision tagging and held-release behaviour remain covered.

Face-down cards use board 4's existing striped card-back tokens and white 8 px border;
“Hidden card” is accessible text only. The hidden-cards fixture covers enabled and
disabled backs. UAT adds its stills and accessible-name/no-visible-label assertions.
The long-answer fixture now uses the real bank answer “Modular Interface of Digital
Instruments”. D-127 supersedes the round-9 fixed-34 px/two-line expectation: labels
that overflow at 34 px step to 21 px and wrap, measured before paint. UAT requires
labelFits at either size; visual acceptance remains with the integrator.
Diamond UAT tolerances are 0.5 px with explicit failure messages.

Presentation and transition strings are memoised on props.layout. Round 10 supersedes
the retained-snapshot approach: the current outgoing DOM is cloned at a tap-signature
swap before reconciliation, never for a fresh layout object alone. Surface alignment
refreshes through ResizeObserver on the engine and shell, plus viewport resize.

### Close-out

Only the authorised checks were run: `pnpm exec vitest run packages/controller-kit apps/web
--exclude '**/*.dom.test.ts'` (366 tests, 26 files), `pnpm exec tsc -b tsconfig.build.json`,
ESLint on changed TypeScript/UAT files and `pnpm run lint:design`. All pass.
No main merge, full verify, browser UAT or writes under uat/evidence. This historical
round-9 validation is superseded by the round-10 close-out below.

### Requests

Integrator: execute UAT and inspect the card-back/long-answer stills and transition
strips against D-127; no visual acceptance is claimed here.


## Round 10 — measured type fallback and final review (CTRL-002, D-127)

- Options, grid cells and action labels are measured at 34 px in a layout effect before
  paint, falling to the shared 21 px token only on overflow. ResizeObserver repeats the
  decision when target bounds change. Unit coverage checks both decisions. UAT accepts
  either type step and requires labelFits for the real bank answer.
- Disabled panels keep an opaque grey soft-paper gradient; disabled backs keep the same
  stripe geometry in grey and a lighter grey border. Enabled borders use card-back-border.
  Disabled ink is darker and tested at 4.5:1 against the disabled fill, including 13 px faces.
- Face-down targets omit colour classes, item colour and glyph. A read-only hidden-card
  fixture and UAT still cover role=img and accessible-only hidden labels.
- Swap snapshots capture the current outgoing DOM only when tap meaning changes. A fresh
  layout object or revision alone does not clone. placeLayout requires an explicit viewport.
- Every playable fixture packing test also runs at the D-118 667 × 307 play area.

### Close-out

CTRL-002: all 439 tests across 31 files pass with
`VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/controller-kit packages/ui apps/web --exclude '**/*.dom.test.ts'`.
`pnpm exec tsc -b tsconfig.build.json`, ESLint on changed source/test/UAT files and
`pnpm run lint:design` pass. No full verify, browser UAT or evidence writes.

### Requests

Integrator: run and inspect UAT, especially the 667 px long answer, disabled cards,
read-only hidden cards and swap strips. Visual acceptance remains pending that review.

## Round 11 — action label measurement regression (CTRL-002, D-127)

The 34 px decision now measures the label's natural one-line width independently of
flex shrink, and its wrapped height against the button's content box after subtracting
the face glyph and gap. Temporary label styles are restored before paint. Each resize
starts at step 34, so a previous step-21 wrapping state cannot affect the next decision.
The existing only-child nowrap rule remains active at 34; only step 21 permits wrapping.
The shared `--ka-phone-type-21` token is present in packages/ui/tokens.css:54.

Unit regressions cover a short Lock in label whose natural width fits beside its face
even when the live span is narrower, exact fits, long-answer overflow and wrapped height.
A stylesheet regression checks only-child nowrap at 34 and normal wrapping at 21.

### Close-out

All 442 tests across 31 files pass with
`VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/controller-kit packages/ui apps/web --exclude '**/*.dom.test.ts'`.
`pnpm exec tsc -b tsconfig.build.json`, ESLint on the three changed TypeScript files and
`pnpm run lint:design` pass. No full verify, browser UAT, tracker or evidence writes.

### Requests

Integrator: rerun picker UAT and inspect Lock in on one line at 34 px, plus the long
Rabakz answer at 21 px. Browser fit and visual acceptance remain with the integrator.

## Round 12 — finite measurements and label flex width (CTRL-002, D-127)

Opened round11-failure/04-phone1-failure.png: Lock in is visibly split over two
lines. Reproduced the numerical cause in unit coverage: parsing column-gap normal
produced NaN, making the old comparison select 21 even for a fitting short label.
The same problem affected non-numeric padding. A finite px parser now substitutes
zero; labelTypeStep retains 34 whenever any input dimension is non-finite.
Step-21 label spans use flex: 1 1 0 to occupy the remaining content width beside
the fixed icon rather than wrapping within a smaller intrinsic flex allocation.
The 34 px only-child nowrap rule and the UAT assertion are unchanged.

### Close-out

446 tests across 31 files pass with the round-11 command:
`VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/controller-kit packages/ui apps/web --exclude '**/*.dom.test.ts'`.
Build typecheck, ESLint on both changed TypeScript files and design lint pass.
Regressions cover normal gap, non-numeric padding, every non-finite input dimension,
step-21 flex allocation and the 667 px answer content box using mocked font bounds.
No full verify, browser UAT, evidence writes or commit, following round-11 rules.

### Requests

Integrator: rerun the unchanged UAT to confirm Lock in stays on one line at 34
and the real long answer fits at 21. Unit font bounds are mocked; actual browser
font fit and visual acceptance remain pending integrator review.

## Round 13 — natural option width for placement (CTRL-002, D-127)

Read round12-failure/REPORT.md and removed the placement/type-step feedback loop.
Only-child option widths now measure the span at the 34 px phone token with flex none,
width max-content and white-space nowrap, restoring its inline styles in finally.
Gap, padding, borders and measured bounds use the same finite-safe parser as label stepping.
The renderer passes this natural width to placement regardless of the live label step.
UAT assertions are unchanged.

### Close-out

449 tests across 31 files pass with
`VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/controller-kit packages/ui apps/web --exclude '**/*.dom.test.ts'`.
After extending the non-finite border case, all 12 layout-label tests pass again.
`pnpm exec tsc -b tsconfig.build.json`, ESLint on all three changed TypeScript files,
and `pnpm run lint:design` pass. The picker fixture at 667 × 307 fits a 210 px action
with mocked 110 px natural text and retains step 34. Expected browser width is
ceil(natural Lock in width at 34 px + 100 px), approximately 200–210 px, rather than
144 px. Actual font bounds and visual acceptance remain with the integrator.
No full verify, browser UAT, evidence writes or commit, following round-12 rules.

### Requests

Integrator: rerun the unchanged picker UAT and inspect Lock in on one line at 34 px.
