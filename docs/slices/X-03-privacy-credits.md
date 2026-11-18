# X-03 — Privacy and Credits

Requirements: DATA-001..005, RZ-021. Branch: issue/X-03-privacy-credits.

## Changes

Legal modules and tests now live in apps/web/src/pages/. The two public routes load
copy and CSS lazily; their immediate fallback paints a console surface and panel.
Each route sets its document title. The landing footer is static, uses inline labels,
and does not import legal-copy. Its TV links use type-34 over a quiet ka-panel backing.

TV legal pages use the shell's 1920×1080 board, 55px safe margin and uniform
--screen-scale transform, including at 1280×720. They do not scroll. The back link
receives focus on mount at widths of at least 1001 px (the TV layout). H1/h2/body use type-89/55/34, with space-34 section gaps.
Whole sections occupy two columns; counts and room codes occupy the wider column.
Phone pages scroll in their own main element, preserve the original section order,
use h2/body 34/21, keep the panel inside the gutter and cap landscape reading width
on a φ-derived measure (about 66ch). No new dependency, font or image was added.

## Copy and code sources

Read docs/DESIGN.md §4 and §6 and the shell scaling implementation. Read
apps/signal/src/admission-object.ts: HMAC-SHA256 uses a secret and rotating time
value; the derived hashes rotate, rather than the secret itself. Admission counters
live in memory. Room-code copy now says, as one sentence in legal-copy.ts:
(Historical wording, since replaced:) “To stop abuse, we briefly use rotating hashes of network addresses in memory.” Current: “To stop abuse, we briefly use a scrambled form of your network address, keeping it only in memory.”
This wording is for Randy's OQ-030 review; it does not promise that no hash is stored.

Read sibling X-04/apps/signal/src/counts.ts: daily totals exclude addresses, but
counts admission uses rotating network-address hashes in a memory-only limiter
and refusal cache. Added that distinction to the counts paragraph, retaining the
host-only daily-count explanation. Room-code and nickname text was shortened to fit the TV board.
Expiry assertions read the signal core source and require IDLE_MS = 10 minutes and
ABSOLUTE_MS = 12 hours, tying copy to code without importing signal into the bundle.
Nicknames retain the accurate tab-session reconnect explanation.

content/rabakz/CREDITS.md supports “fixed spelling and spacing” and the adapted
questions' same-licence offer. Credits now say “Our adapted versions of these questions
are shared under the same licence (CC BY-SA 4.0).” Card lettering credits DM Sans
(SIL Open Font License), checked against assets/src/fonts/dm-sans/OFL.txt.
Earlier claims that no font binaries/licence files exist were incorrect: card font
assets are present; interface text still uses device fonts. Generated sound credit
remains. Adapted-bank public distribution is still an integrator release question.

## Integrator layout selection (D-178)

The integrator removed the equal-column variant under D-178. The only layout is
1.618 : 1 columns on TV and one scrolling column on phones. The UAT script captures
both pages at 1920×1080 and 1280×720, plus phone top, section and panel-end stills.
The historical round notes below describe earlier implementations and checks.

## Validation / Close-out

Only permitted checks were run, with one-minute load below 8 before each launch.
- Vitest: 40 files passed, 6 failed; 459 tests passed, 6 failed. All eight legal copy,
  contrast and expiry tests passed. Five browser suites failed on Chromium
  MachPortRendezvous permission denial: Overlap.dom, PeekPoker.dom,
  host-keyboard.dom, layout-fixtures, team-polish. legal.dom failed opening its
  local Vite listener (EPERM 127.0.0.1:6732). Browser layout assertions did not run.
- Typecheck: passed.
- ESLint: passed.
- Design lint: passed, 422 files scanned.

No verify, UAT, perf, install or commit run. No screenshots or rendered layout pass
claimed. Changes remain for independent review and integrator validation.

## Requests

Run browser checks and the round3 UAT outside the sandbox; inspect and publish both
variants for Randy. Review OQ-030 wording, reconcile counts after X-04 merges first,
measure transfer budgets and resolve adapted-bank distribution before release.
No protected/shared documents, contracts, dependencies or lockfile changed.

## Round 4 — reading order, fit and plain copy

Inspected round3/03-host-privacy-1920x1080-equal-top.jpg and
round3/05-host-failure.png. Both reorder the sections; golden leaves Nicknames at
the panel bottom. Replaced the reordered groups with contiguous runs: privacy's
first three sections initially in column 1, Room codes and Nicknames in column 2;
credits initially keeps its first section in column 1. Before paint, the page measures
every section at both actual column widths and chooses the contiguous split with
the shortest maximum column height. DOM order is also phone and assistive reading
order. The longer privacy run occupies the wide golden column. No section splits.

Panel height is now fixed to the board's inner height, with space-34 bottom
padding; title-to-sections spacing is space-21. Body remains type-34, headings
remain type-55/89. Counts copy is shorter and uses plain words, including “device
details” instead of “device identifiers”. No typography token was reduced.

Reviewed admission-object.ts, core/admission.ts and sibling X-04 counts.ts.
Admission uses rotating ten-minute HMAC inputs and memory-only counters; counts
also holds a memory-only refusal cache. The daily storage call forwards counts
only. “Never store it” would obscure the temporary memory retention, so final
sentences say:
- Room codes: “To stop abuse, we briefly use a scrambled form of your network
  address, keeping it only in memory.”
- Anonymous counts: “We briefly use a scrambled form of its network address to
  limit how often counts are sent, keeping it only in memory.”

UAT now collects assertion failures and asserts after every variant and phone
still has been captured. Each TV variant writes actual clearance to fit.txt and its scaled
space-34 requirement. The DOM test checks section order and board-coordinate
clearance. This prevents a fixed panel from hiding text overflow behind a passing
outer-page no-scroll check. No UAT run or new rendered fit claim made here.

### Round 4 Close-out and Requests

Validation results are recorded below after checks. Integrator: run browser tests
and UAT, inspect all variants, and use the recorded per-variant clearances to assess
the fit at both resolutions. Equal remains an offered dev artifact; golden remains
the default. No commit, verify, UAT, perf, install or protected-file changes.

Final round 4 checks:
- Vitest: 40 files / 460 tests passed; 6 files / 6 tests failed. Five failures
  are Chromium MachPortRendezvous permission denial; legal.dom fails opening
  127.0.0.1:6732 with EPERM, before rendering or assertions. All nine legal-copy
  tests pass. Final run launched at load 3.96 (two workers).
- TypeScript build: passed (load 3.88).
- ESLint: passed (load 3.58).
- Design lint: passed, 422 files (load 3.81).

An initial Vitest launch incorrectly proceeded at load 18.22; it was repeated
below 8 after the final code changes. No measured per-variant fit is available:
the sandbox prevents the browser/listener from starting. fit.txt will be generated
by the integrator's UAT run, with clearance and scaled requirement per TV variant.

## Round 5 — D-180 anonymous counts and landing clearance

Kept the resumed edits after reviewing the diff. Privacy now lists the eight
D-180 kinds: session errors, load errors, errors reaching the server, connection
drops (one per drop regardless of retries), and the four frame-time bands. It
states host-only delivery, phones sending nothing, results/page-hide delivery,
no sending during play, omitted personal/request details and totals with no expiry.
The two OQ-030 limiter sentences remain unchanged. Credits, the default D-178
1.618 : 1 columns and existing fit assertions remain unchanged.

The existing legal DOM test now checks that the landing footer and “Put this on
your TV” link do not intersect at 1920×1080, 1280×720, 390×844 and 844×390.
No landing implementation change was made; rendered overlap and fit are unverified.

### Round 5 Close-out and Requests

Only the four authorised checks ran, each launched after uptime showed a
one-minute load below 8:
- Vitest (load 3.73): 45 files / 499 tests passed; 12 browser tests could not run.
  Eleven failed at missing Chromium under /nonexistent; legal.dom failed at its
  local listener with EPERM. No browser layout assertion or screenshot ran.
- TypeScript build (load 3.56): passed.
- ESLint (load 3.79): passed.
- Design lint (load 4.64): passed, 449 files scanned.

Evidence: uat/evidence/X-03-privacy-credits/round5/REPORT.md.
Integrator: run the browser assertions outside the sandbox and check TV fit with
at least 34 px board-coordinate clearance plus phone overflow and landing overlap.
OQ-030 remains with Randy. No commit, verify, UAT, perf, install, dependency link,
protected/shared document or contract changes.

## Round 6 — golden-column Privacy fit (DATA-001..005)

Shortened No sign-up, Saved on your TV and Anonymous counts without removing
facts. Eight kinds remain explicit (four error/drop counts plus four frame-time
bands); the copy test still asserts all eight, delivery, exclusions and no expiry.
Both scrambled-address limiter sentences are byte-for-byte unchanged.

Reordered whole sections to Anonymous counts, Room codes, No sign-up, Saved on
your TV, Nicknames. The initial contiguous split is now after Room codes; the
existing measured split selection remains. This places the two longer sections
in the wide golden column and the three shorter sections in the narrow column.
DOM, visual and phone reading orders agree. Updated the browser order assertion.
No CSS, type sizes, surface treatments or overflow rules changed.

### Fit estimate (not a browser measurement)

The 1920×1080 board has a 970 px panel, 3 px border and 21 px top padding.
The 89 px title plus 21 px gap put section tops at y=189; panel bottom is y=1025,
leaving 836 design px. Column content widths are approximately 1068 and 660 px.
Conservative estimated body lines: wide = counts 9 + room codes 5 = 14;
narrow = no sign-up 2 + saved data 4 + nicknames 5 = 11. At body 34×1.3,
Chromium's expected rounded line box is 44.1875 px (44.2 nominal).
Wide height = 14×44.1875 + 2×(55+13) + 34 = 788.625 px;
narrow height = 11×44.1875 + 3×(55+13) + 2×34 = 758.0625 px.
Estimated minimum clearance: 836−788.625 = 47.375 design px at 1920 and 1280.
At 1280 the board scales by 2/3: 31.58 screen px versus 22.67 required.
Using unrounded 44.2 px line boxes gives 47.2 design px, also above 34.
These are line-count estimates; another wide-column line would consume the margin.
The integrator must confirm actual wrapping and clearance in Chromium.

### Close-out and Requests

Each permitted check launched after uptime showed one-minute load below 8:
- Final Vitest (load 4.07): 499 tests passed; 12 browser tests not run (11 missing
  Chromium under /nonexistent, legal.dom listener EPERM before rendering).
- TypeScript build (load 3.92): passed.
- ESLint (load 4.48): passed.
- Design lint (load 5.63): passed, 449 files scanned.

No verify, UAT, perf, install, dependency links or commit. Integrator: run browser
fit assertions at both TV sizes and inspect phone reading order. OQ-030 wording
remains pending and unchanged. No rendered-fit pass is claimed.

## Round 7 — review fixes (DATA-001..005, RZ-021)

- Must-fix 2: phone back links have space-13 below them; the DOM assertion checks
  the full 10 px focus outline clearance above h1. Mount focus applies only at
  widths of at least 1000 px.
- Must-fix 3: Anonymous counts uses the reviewer's exact proposed paragraph,
  including server-reach under-counting, timing and daily retention. The limiter
  sentence is unchanged. Eleven copy assertions replace the earlier wording;
  each section now has a 720-character cap. The new copy has no numeric ranges
  that can break across lines.
- Must-fix 4: the phone footer renders in normal flow outside the scaled TV board,
  with phone type and token-based 55 px minimum link heights. DOM checks cover
  target height and landing horizontal overflow in both phone orientations.
  The landing body remains owned by X-01/A-09.
- Must-fix 6: corrected this title and removed obsolete query-flag instructions.
  D-178's equal-variant removal is recorded above. Removed the remaining variant
  attribute, loops and still-name suffixes from the implementation and checks.
- Should-fixes: Nicknames states that the server never sees names while retaining
  the tab-copy/reconnect facts. CC BY‑SA uses U+2011 in text and link labels.
  Phone UAT now captures the panel scrolled fully to its end.

### Measured fit — integrator to complete

No browser measurement was run in this sandbox. The review's candidate measurement
is context only; it is not validation of this revision. Integrator: run DOM/UAT,
inspect every still and record actual results here, including the narrow-column
nickname change and device-font wrapping risk.

| Viewport | Privacy clearance | Credits clearance | Required clearance | Result |
| --- | --- | --- | --- | --- |
| 1920×1080 | 47.375 design px | 356.69 design px | 34 design px | Pass (uat-r8/fit.txt; margin 13.4 px, under one body line) |
| 1280×720 | 31.58 screen px | 237.79 screen px | 22.67 screen px | Pass |
| 390×844 | no horizontal overflow; panel end shown (13) | panel end shown (16) | 55 px targets, centre-point hit test in legal.dom | Pass |
| 844×390 | no horizontal overflow; panel end shown (23) | panel end shown (27) | 55 px targets, centre-point hit test in legal.dom | Pass |

### Round 7 Close-out and Requests

Each permitted check launched with one-minute load below 8:
- Vitest (load 2.79): 46 files and 501 tests passed. Thirteen browser tests
  did not run: twelve could not find Chromium under /nonexistent; legal.dom
  could not open its local listener (EPERM). No browser layout pass is claimed.
- TypeScript build (load 3.59): passed; no adjacent source .js/.js.map/.d.ts
  outputs were found to remove.
- ESLint (load 3.43): passed.
- Design lint (load 3.21): passed, 454 files scanned.

Browser tests and UAT require the integrator's environment. No evidence, shared trackers, decisions,
backlog, contracts or lockfile edited; no commit, verify, UAT, perf or install run.

## Round 8 — phone footer hit targets (DATA-004, RZ-021)

Cause: the portal placed a static footer in #app, but the landing main remained
an absolutely positioned 1920×1080 board with a transform. That positioned,
transformed board paints above the normal-flow footer and intercepts its taps
where their rectangles intersect. This is a layout defect, not a click timeout
that should be bypassed in the test.

Source geometry predicts coverage in 844×390: the scaled board occupies the full
390 px height, crossing the footer near the top of #app. At 390×844 the board is
vertically centred well below the footer; at 1000×720 its top is about 79 px,
below the footer link centres. Width alone therefore does not determine failure;
shorter heights at 1000 px can also cause intersection. These are geometry
 deductions, not browser measurements; the sandbox cannot establish the rendered
failure matrix.

Removed the portal and its media-query subscription. The footer is again the
last child of the landing main. A landing-only CSS class replaces the scaled
board at widths ≤1000 px with a viewport-sized, unscaled vertical scrolling
layout. Content and footer participate in the same flex flow, with token gaps,
phone type and 55 px footer targets. Long content wraps inside the available
width. No stacking override is needed. The ≥1001 px rules and TV DOM structure
are unchanged apart from the inert landing class.

The browser test now scrolls each phone footer link into view and checks that
`document.elementFromPoint` at its centre returns the link or a descendant.
It retains target-height, horizontal-overflow and TV-help non-overlap assertions
at 390×844 and 844×390, and adds 1000×720 and 1001×720 boundary coverage.

### Round 8 Close-out and Requests

Permitted checks only, each launched after uptime reported one-minute load <8:
- Vitest (6.16): 11 tests passed; two browser tests could not run (legal listener
  EPERM at 127.0.0.1:6732; TV help missing Chromium under /nonexistent).
- TypeScript build (6.09): passed. No generated adjacent source outputs required
  deletion; the two existing game CSS declaration files are tracked sources.
- ESLint (6.65): no errors; CSS was ignored by its configuration.
- Design lint (6.17): passed, 454 files scanned.

Integrator: run browser assertions to establish actual hit testing, phone
scrolling/overflow and TV clearance. No rendered pass or screenshot claim is made.
No commit, verify, UAT, perf, install, dependency links or protected-file edits.

### Integrator, at merge (after review 8)

- Phone landing footer gap on the φ scale: `margin-top: var(--ka-space-13)` (flex gap 21 + 13 = 34), `max-width: 100%`.
- Mount focus breakpoint `(min-width: 1001px)`, matching legal.css's ≤ 1000 px phone layout.
- `legal.dom` waits for the footer link's URL before navigating directly, so a broken href fails.
- "CC BY‑SA 4.0" uses no-break spaces in text and link label, so "CC" never ends a line.
- Footer links carry `ka-pressable` (press scale 0.97).
- Superseded untracked runs `round6/` and `uat-r7/` removed; current evidence is `uat-r9/`.
