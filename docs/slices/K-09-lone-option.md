# K-09 — Lone option width

Requirements: CTRL-002, CTRL-005, PP-005; CTRL-003 for private panels. Decision: D-160.

## Change

A lone option beside other parts reserves its own label width and padding, with
an 89 px floor, and receives no share of spare column width. Other columns share
the spare width. This also applies to the grid/action path and to controls beside
a private panel. A standalone lone option retains the previous placement.

Standard neighbouring lone options reserve the compact 21 px label step; large
144 px targets retain their natural 34 px measurement. The existing
label-fit logic retains 34 px when it fits. Natural 34 px measurements from the
kit are converted to the compact step, preserving padding/borders and accounting
for the corresponding face size and gap. Without a DOM measurement, placement
uses the same pure glyph-width estimate used by option-label fitting.
This makes Skip 89 px; reserving the unwrapped 34 px estimate instead would make
it 100 px and leave only 257.5 px answer buttons at 667 px, below this brief's
263 px requirement.

If an option label still cannot fit at 21 px in at most three lines, placement
tries gaps of 8 px and then 5 px. This content fallback retains the selected
margin. The existing geometric fit fallback remains.

## Measurements

Rabakz-shaped four-answer row plus leader-only Skip, no private panel, using the
requested play-area dimensions:

| Play area | Answer button before | Answer button after | Skip before | Skip after |
| --- | ---: | ---: | ---: | ---: |
| 667 × 375 | 189.75 px | 263 / 271 px | 235.5 px | 89 px |
| 844 × 390 | 234 px | 351.5 px | 324 px | 89 px |

After widths are first / second label group; the second group needs the 5 px gap
for “Cretaceous-Paleogene”. Both four-label groups use the eight labels in the brief. The regression tests
check every option's label step and every target's 89 × 68 px floor.

## Validation

Final checks (all passed):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/platform games`:
  89 files passed; 1,733 tests passed, one skipped; 353.16 s.
- `pnpm exec tsc -b tsconfig.build.json`: exit 0.
- `pnpm exec eslint packages/platform --max-warnings 0`: exit 0.
- `pnpm run lint:design`: exit 0; 394 files scanned.

Before every test/typecheck invocation, `uptime` reported a one-minute load
below 8. Earlier scoped runs hit the pre-existing five-second timeout in
“round 3 permits needless private revisions”; it passed in both later runs.
Intermediate implementation/assertion failures were corrected before the final
passing run.

Seven regression tests cover both label groups and sizes, target floors,
13 → 8 → 5 gap pressure (including an impossible label at the 5 px floor),
non-leader and standalone placement, natural measured widths for a large grid
action, compact measured widths, and equal sharing among the remaining parts.
Frozen fingerprints cover all 16 existing catalogue fixtures at both sizes and
for both audiences (64 placements). All 14 fixtures without a neighbouring lone
option match the pre-change fingerprint exactly; only picker and selected-picker
change.

## Close-out

Implementation is confined to platform placement, its tests, and this note.
No games, controller-kit, shared trackers, dependencies or lockfile changed.
No commit, merge, push, UAT, performance command or whole-suite check was run.

## Requests

Claude to review the compact lone-label interpretation above and complete the
normal independent review/integration.

## Round 2

CTRL-002, CTRL-005, PP-005; CTRL-003 for private panels. D-164(1–2) is binding. Large lone options now retain a
144 px width floor, alongside their existing 144 px height. The picker retains
its available-column cap for wrapping large labels, and uses the content-fit
width when reserving room for a private panel (the pre-existing D-132 behaviour).
Non-large lone options retain D-160's compact sizing.

Pure placement measurements for the Peek Poker pick layout (16 face-down cells
and a large, unshaped “Lock in”), reserving the 68 px phone header:

| Phone viewport | Play area | Lock in | Each of 16 cells | Margin / part gap / cell gap |
| --- | --- | --- | --- | --- |
| 667 × 375 | 667 × 307 | 146 × 144 px | 89 × 68 px | 8 / 5 / 5 px |
| 844 × 390 | 844 × 322 | 146 × 144 px | 89 × 68 px | 13 / 13 / 8 px |

These use the pure label estimate. A supplied natural measurement of 100 px is
floored to 144 × 144 px at both sizes; a 210 px measurement retains 210 × 144 px.
All parts fit inside the play area and its selected margin. Regression coverage
also checks large lone options beside other controls and with a private panel.

`GridCell.faceDown` is accepted and checked as a boolean. Face-down cells reject
labels (including empty labels) and marks. The kit uses its existing card-back
class, accessible names “Card 1” through “Card 16” in row-major order, and keeps
`aria-pressed` tied to selection. Games are unchanged.

Selected card backs use the existing `--ka-ink` token, with the existing 5 px
outline moved to a 13 px inset. The stroke occupies depths 8–13 px, immediately
inside the 8 px card-back border. It extends zero pixels into the gap, leaving
the entire 5 px minimum gap clear. Tests bind these dimensions to the CSS and
spacing tokens. Contrast calculated from Peek Poker's token values:

| Ink against | Contrast |
| --- | ---: |
| Card back base | 5.20 : 1 |
| Card back stripe | 3.90 : 1 |
| Felt base | 7.37 : 1 |
| Felt weave | 6.61 : 1 |

All exceed D-164's 3 : 1 floor. No new colour token or dependency was added.

Round 2 final validation (all passed):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/platform packages/controller-kit games/peek-poker`: 62 files passed; 1,251 tests passed, one skipped; 64.86 s.
- `pnpm exec tsc -b tsconfig.build.json`: exit 0.
- `pnpm exec eslint packages/platform packages/controller-kit --max-warnings 0`: exit 0.
- `pnpm run lint:design`: exit 0; 398 files scanned.

Before each test/typecheck command, the one-minute load from `uptime` was below
8 (7.28, 7.83 and 7.90 for Vitest; 7.95 for TypeScript). The first scoped run
exposed picker-cap regressions and a new assertion mismatch, corrected before
the final run. The second run passed all changed-code tests but hit the existing
five-second timeout in “round 3 permits needless private revisions”; the final
run passed without changing that test or its timeout. No browser/Mach-port
failure occurred.

No commit,
merge, game edit, UAT, performance run, install or whole-suite check is part of
this round. Claude retains independent review and integration.

## Round 3

Requirements: CTRL-002 (D-160 is the stated exception to “used parts grow”),
CTRL-005 (target floors), PP-005 (face-down 4 × 4 pick grid), and CTRL-003
only for the private-panel path. CTRL-004 is not the requirement served here.

- Added `peek-pick`: sixteen face-down cells, two selected, and a large,
  unshaped Lock in. K-04 now captures it at its phone sizes (including
  667 × 375 and 844 × 390), applies the Peek Poker theme to the demo shell,
  and checks fit, 89 × 68 cell floors, the 144 × 144 action floor, names
  Card 1–16, selected `aria-pressed`, and the one-line Lock in label.
  Removed the unused outer `tops` set; retained the per-span line check.
- Added the panel-scoped face-down selector, restoring the same −13 px
  outline offset and 5 px stroke (depths 8–13 px) inside private panels.
  A real Chromium computed-style regression checks both contexts.
- Added the real Rabakz leader regression with the first four long sentence
  labels listed above, Skip, Score/Streak/Points gained, and Watch the screen.
  Both phone viewports reserve the 68 px header; Skip stays 89 px, every answer
  fits the whole-word label policy and target floors, and the private panel fits.
- Exercised both natural and measured lone options with a face, at standard
  and large sizes, including the 68 px natural face deduction and 34/68 px
  compact/large additions.
- Moved text width, height, option-label fitting and the single-option inset
  to the leaf `option-metrics.ts`; both placement modules import it, removing
  their cycle. Existing private-placement exports remain compatible. The
  purity inventory permits UI tokens in this placement metrics leaf.

### Unresolved colour constraint

The requested single fixed colour cannot reach 3:1 against every theme's
background. Peek Poker felt has relative luminance 0.07459: even black reaches
only 2.49:1, so a passing colour must have luminance at least 0.32378. Console's
marble treatment includes luminance 0.54080, requiring a dark outline at or
below 0.14693; a lighter-than-marble alternative would require luminance above
1. These intervals do not intersect. This is independent of the card-back
constraint and cannot be solved by adding a new single fixed colour token.

No new colour or token was added. The current `--ka-ink` colour is retained
pending clarification. Expanded tests cover all four themes and deliberately
expose the console and Tabao Rush failures (2.648:1 against the card back).
A two-colour treatment using existing white and dark tokens was proposed to
Randy; its approval is pending. Round 3 is not complete until this is resolved.

### Validation

Only the four permitted validation commands were invoked. Latest results:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run packages/platform packages/controller-kit apps/web/src/layout-fixtures`:
  51 files passed, 2 failed; 1,134 tests passed, 3 failed, 1 skipped.
  Two failures expose the unresolved contrast requirement above. The third is
  Chromium failing to launch in the sandbox: `bootstrap_check_in` for
  `MachPortRendezvousServer` returned “Permission denied (1100)”. The computed
  outline offsets therefore remain unverified in a browser. All placement
  regressions and the fixture contract test pass.
- `pnpm exec tsc -b tsconfig.build.json`: exit 0.
- `pnpm exec eslint packages/platform packages/controller-kit apps/web/src uat/slices/K-04-layout-engine.mjs --max-warnings 0`: exit 0.
- `pnpm run lint:design`: exit 0, 400 files scanned.

Before every test/typecheck invocation, `uptime` reported one-minute load below
8 (4.97, 3.64, 3.34, 3.52 and 4.61). Earlier runs exposed the new leaf's purity
inventory, an exact-optional-property type error and a CSS-generator import;
these were corrected. No UAT screenshots were generated or visually accepted.
No game, shared tracker, dependency or lockfile edit, install, commit, merge,
performance run, or whole-suite command was made.

### Integrator resolution of the colour constraint (D-166)

The outline is inset 8–13 px, so it lies only on the card back, whose colour and border are the same in
every theme; the felt and marble backgrounds never sit under it. It now uses `--ka-card-back-border`
(white): 5.95 : 1 against `#B5371F` and 4.46 : 1 against the stripe paint `#C15743`. The contrast test
checks exactly those, in every theme, plus the inset geometry. All scoped tests pass (1,137).

