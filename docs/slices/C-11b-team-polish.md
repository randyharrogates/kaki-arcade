# C-11b — Team setup polish

## Goal and scope
Polish the leader's team controls under PLAT-025 and D-151/D-152, preserving D-143's centre-line setup and D-149's team rules. No game, transport or team-assignment rule changes.

## Acceptance
- D-152 retains labelled Red/Blue halves and a 21 px minimum for every player name.
- Move players assigns each half ceil(side count / 3) columns on a shared equal-width column grid, with at most three rows. Compact headings and the divider remain.
- Done, Back to game picker and Start occupy one bottom row. All targets stay at least 55 × 55 and inside 667 × 375 and 844 × 390.
- Ordinary names, including Cloud Noodle and Player 2–8, remain untruncated in balanced and 7–1 eight-player layouts. Only the 12-character stress name may truncate.
- Teams is one bordered button. Pressed state adds a tick and a stronger token border; text and border use the same motion tokens, with instant reduced-motion changes. Start retains D-151's console primary.

## Implementation and tests
Round 4 removes the action rail and fixed two-column halves. Each half spans its required number of shared grid columns; matching internal and external gaps preserve equal button widths. Numbered team-colour discs sit above names so the full button width is available to each label. Existing canvas fitting and the 21 px floor remain.

TeamsToggle now has one panel surface and border, with border colour and overlapping text states changing over the same base duration and easing. Nested bordered panels are removed.

The browser regression builds its fixture once, launches one browser and has a 120 s timeout. It covers four/eight players at both phone sizes, every split from balanced to the most uneven legal split, full ordinary names, three-row limits, equal widths, viewport containment and the bottom action row. It retains oversized-name refitting, accessible move labels and reduced-motion checks.

UAT assertions reject ordinary-name truncation and capture explicit 7–1 and balanced move grids at both widths. Round 4 used a 14-character stress name; Round 5 corrects it to the PLAT-004 maximum of 12. UAT was not run, as requested.

## Validation
Only the four requested checks were run. One-minute loads before web tests were 4.90 and 3.64; before TypeScript checks, 4.16 and 4.03 (all below 8).

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web`: 404 passed, 2 failed. Both browser tests (`Overlap.dom.test.ts` and `team-polish.test.ts`) fail at Chromium launch with MachPortRendezvousServer `bootstrap_check_in` Permission denied (1100), before DOM assertions execute.
- `pnpm exec tsc -b tsconfig.build.json`: passed after correcting an optional locator-name type in the UAT script.
- `pnpm exec eslint apps/web uat/slices`: passed.
- `pnpm run lint:design`: passed, 378 files scanned.

Logs: `uat/evidence/C-11b-team-polish/round4/`. No UAT or new screenshots; no commit or merge.

## Close-out
Implementation and static checks complete. Browser layout, visual UAT and independent review remain outstanding; the slice is not closed.

## Requests
Integrator: rerun the permitted web-test command outside the Chromium Mach-port sandbox. Run C-11-team-setup separately with four and eight phones and inspect balanced/7–1 layouts at both widths, plus the Teams toggle and reduced-motion treatment.

## Round 5

PLAT-025: refused moves now keep the tapping leader's notice visible as one 21 px line between the move grid and bottom actions. Only the hint stays visually hidden. The refusal layout removes vertical gaps between roster rows and below headings, reserving space for the notice at the two landscape sizes without changing seat discs or the rendered 34 px Red/Blue headings. Removed the overridden 21 px heading declaration.

Teams now has the fixed accessible name “Teams”, with `aria-pressed` carrying its state; visible on/off text and tick remain. DOM and UAT locators use that name and check pressed state. The DOM test compares computed pressed background against the console primary and pressed border against the unpressed border, replacing the ineffective descendant assertion.

The DOM fixture uses `WWWWWWWWWWWW` (12 characters). Its truncation check now explicitly uses 667 × 375 with eight players in a 7–1 split, then checks full-name restoration at 1800 px. The assertion still requires truncation at 667; actual rendering could not be observed because Chromium failed before DOM assertions. Added a visible refusal/21 px/viewport/action-target regression at 667. UAT now taps the lone Red player inside Move players at the eight-player 7–1 split, waits for the leader's visible refusal, and requests `move-players-refusal-667`.

Command results (only the four requested checks; one-minute load 4.47 before Vitest and 4.00 before TypeScript, both below 8):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web`: 404 passed, 2 failed. `Overlap.dom.test.ts` and `team-polish.test.ts` both fail at Chromium launch: MachPortRendezvousServer `bootstrap_check_in` Permission denied (1100). No DOM assertions executed in these tests; browser validation remains outstanding.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/web uat/slices`: passed.
- `pnpm run lint:design`: passed, 378 files scanned.

Logs: `uat/evidence/C-11b-team-polish/round5/`. UAT was not run, so no new screenshots were produced. No commit or merge. The integrator must run the permitted web tests outside this Chromium sandbox and inspect the requested UAT capture before closing the slice.

## Round 6

PLAT-025, integrator's decision: Move players always renders the labelled Red/Blue
headings at `--ka-phone-type-21`, keeping the divider, 5 px heading margin and 8 px
roster row gaps. Removed Round 5's refusal-dependent heading-margin and row-gap
collapses. The status row always reserves one 21 px line, empty without a notice;
the refusal icon also fits that 21 px line. The grid, status and actions use the
same zero outer row gap in both states. A
refusal therefore changes the text without changing the layout. D-152's name
fitting and 21 px floor remain unchanged.

The browser regression now covers every legal Red/Blue split (including both 7–1
orientations), four/eight players and 667 × 375 / 844 × 390, with and without a
refusal. Every grid/action target must be at least 55 × 55, fit inside the content
box of every ancestor with non-visible overflow, and return itself or a descendant
from `elementFromPoint` 2 px inside all four corners. It also checks unchanged grid
and action-row tops across refusal, 21 px headings and no overflow in the phone
content containers. The UAT refusal shot now checks every grid/action target against
all clipping ancestors' content boxes.

Only the four requested validation commands were run. One-minute loads were 4.52 and 6.05
before Vitest runs and 4.96 before TypeScript, all below 8:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web`: 404 passed, 2 failed.
  `Overlap.dom.test.ts` and `team-polish.test.ts` fail at Chromium launch with
  MachPortRendezvousServer `bootstrap_check_in` Permission denied (1100), before
  any DOM assertions execute.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/web uat/slices`: passed.
- `pnpm run lint:design`: passed, 378 files scanned.

Logs: `uat/evidence/C-11b-team-polish/round6/`. No UAT, commit or merge.

### Close-out

Implementation and static checks complete. Browser validation remains unverified
because Chromium cannot launch in this sandbox; the slice remains open.

### Requests

Integrator: run the permitted web-test command outside the Chromium sandbox and
inspect the refusal UAT capture before closing the slice.

## Round 7

PLAT-025, D-153: removed the reserved refusal line below Move players. The refusal
now overlays the existing 21 px Red/Blue heading row, spanning both halves with
the warning icon and 21 px text. Headings and refusal crossfade using the base
and exit duration tokens and ease-in-out; reduced-motion tokens swap instantly.
A route-local UI timer restores the headings after three seconds; the next grid
tap also restores them. The single status live region remains, visually hidden
in Move players, while the visual overlay is aria-hidden to avoid duplicate
announcements. Side-picking notices retain their existing placement.

The DOM regression keeps clipping-ancestor content-box containment and every legal
split at both phone sizes. Corner probes now inset by each computed corner radius
plus 2 px, with four additional edge-midpoint probes. Added heading-row refusal,
three-second expiry using Playwright's clock, next-tap dismissal, unchanged tops
on expiry and reduced-motion transition checks. UAT keeps its content-box check,
asserts the refusal occupies the heading row, and requests both
`move-players-refusal-667` and `move-players-refusal-cleared-667` captures.

Only the four permitted validation commands were run. One-minute loads before
web tests were 5.37 and 4.50; before TypeScript, 4.87 and 4.44 (all below 8).

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web`: 404 passed, 2 failed.
  Both `Overlap.dom.test.ts` and `team-polish.test.ts` fail at Chromium launch
  with MachPortRendezvousServer `bootstrap_check_in` Permission denied (1100),
  before their DOM assertions execute.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/web uat/slices`: passed.
- `pnpm run lint:design`: passed, 378 files scanned.

Logs: `uat/evidence/C-11b-team-polish/round7/`. No UAT, commit or merge.

### Close-out

Implementation and static checks complete. Browser layout and motion remain
unverified because Chromium cannot launch in this sandbox; the slice remains open.

### Requests

Integrator: rerun the permitted web tests outside the Chromium sandbox, then run
and inspect the four/eight-phone UAT, including both refusal captures.

## Round 8

PLAT-025, D-153: the heading refusal now distinguishes a newly appearing or
changed refused notice from a persisting host notice. Each grid tap records the
current view revision in a ref and clears the heading and its timer. The first
newer team-setup update consumes that pending tap and can show the same refusal
again. Later revisions without a tap cannot revive a stale notice or restart its
three-second timer. The timer is cleaned up on unmount. The integrator's padding-box
clip checks and divider below the heading row are preserved.

The DOM fixture increments revision on every draw and models refused lone-player
moves. Regression assertions cover repeated identical refusals after grid taps,
a new revision carrying a stale notice without a tap, changed refusal text,
three-second expiry, successful next-tap dismissal, and existing zero-second
reduced-motion transitions.

Only the four requested checks were run. One-minute loads were 4.25 before web
tests and 4.47 before TypeScript, both below 8:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web`: 404 passed, 2 failed.
  `Overlap.dom.test.ts` and `team-polish.test.ts` fail at Chromium launch with
  MachPortRendezvousServer `bootstrap_check_in` Permission denied (1100), before
  DOM assertions execute.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/web uat/slices`: passed.
- `pnpm run lint:design`: passed, 378 files scanned.

Logs: `uat/evidence/C-11b-team-polish/round8/`. No UAT, commit or merge.

### Close-out

Implementation and static checks complete. Browser regressions remain unverified
because Chromium cannot launch in this sandbox; the slice remains open.

### Requests

Integrator: rerun the permitted web-test command outside the Chromium sandbox to
verify repeated refusals, stale-notice suppression and the existing layout/motion
assertions before closing the slice.
