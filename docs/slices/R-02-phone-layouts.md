# R-02 — Rabakz phone layouts (RZ-003, RZ-005)

## Round 2

Restored disabled, faded options on every phone as soon as the TV marks them wrong, including
after unlock. The host continues to refuse repeats. Answering shows only a small score line
beside the shape buttons. Locked out explains the wait without promising a reveal; only
Locked in says “Watch the TV for the reveal”.

Reveal now orders the status chip, signed Points gained, Streak and Score total, followed by
the chosen option in note tone. An unanswered reveal says “Skipped” and has no invented option
line. Status uses title tone, secondary figures use body tone, and option names / notes use
note tone. The kit now honours these existing tones in both pure placement and DOM measurement.
Points and status share the largest available token (34 px); neither draws smaller than the
secondary lines. This satisfies the requested points emphasis and status-size floor together.
Scoreboard/end shows the player's shared placing and total, for example “2nd · 700”, as required
by the game's phone table. Its revision also changes when a departure changes placing.

Four 40-character options are tested through the actual Rabakz layout, private view and
`placeController`, including leader Skip, at 667 × 375 and 844 × 390. Tests derive each face
button's box from placement, then check 34 → 21 px and the three-line ceiling in that box;
they do not assume a 260 px button. Content-aware placement grows the grid within the existing
tokens when the labels need more width. No new layout constants or dependencies were added.

Skip stays beside the grid at the existing 89 × 68 floor. Board 4's header location cannot
meet that floor; the integrator records this discrepancy. Skip remains leader-only throughout
the question, including the secret tie window; the host enforces whether a press has an effect.
R-03 shows no letters on the TV; phones also have no letters.

## Validation

Only the four requested checks are used. Before each Vitest or TypeScript run the one-minute
`uptime` load was below 8 before every test/typecheck start (final runs: 6.10 and 4.03).

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz packages/controller-kit packages/platform/src/game apps/web/src`: exit 1; 979 passed, 1 skipped, 5 failed. All five failures are Chromium sandbox launch denials, listed under Requests. The earlier load-sensitive conformance timeout passed on the final run. Every Rabakz and kit unit test passed.
- `pnpm exec tsc -b tsconfig.build.json`: exit 0.
- `pnpm exec eslint games/rabakz packages/controller-kit packages/platform/src apps/web/src uat/slices/R-02-phone-layouts.mjs --max-warnings 0`: exit 0.
- `pnpm run lint:design`: exit 0; 418 files scanned.

No verify, UAT, performance, memcheck, Blender or install command was run. Round-two changes
remain uncommitted, as requested.

Tests cover wrong-option disabling on other phones and after unlock, leader Skip in question,
identical leader layout/private view with firstCorrect/winners set or unset, reveal order,
skipped-without-pick copy, placing/total, real-box long labels, and stable layout transport.

The updated `uat/slices/R-02-phone-layouts.mjs` checks the non-leader has no Skip at every
capture and reads font size from the label span. Its separate deterministic presentation
fixture, `games/rabakz/dev/phone-long-options.html`, uses the shipped shell, game views and kit
placement for four 40-character options. It captures leader (with Skip) and guest at both
667 and 844, requiring 21 px / at most three lines. The paired-room flow still covers answering,
lock-out, unlock, locked-in, right reveal and leader-skip reveal. The fixture changes no live
match state and is never imported by production.

Existing round-one captures and their report are under
`uat/evidence/R-02-phone-layouts/round1-p2/` (commit `eba32ffc21429aeaa488925f1473caf0395a895a`).
They predate these fixes. Round-two browser execution and visual acceptance remain with the
integrator, as requested; the updated UAT has been written but not run here.

## Close-out

RZ-003 / RZ-005 round-two implementation is ready for independent review after the checks
below. Code: `games/rabakz/src/rules/views.ts`; tests: `views.test.ts`, `attack.test.ts`,
`rules.test.ts` and the kit private-panel test. Existing contracts are unchanged.

## Requests

Run the browser-backed tests outside this sandbox: `Overlap.dom.test.ts`,
`PeekPoker.dom.test.ts`, `host-keyboard.dom.test.ts`, `layout-fixtures.test.ts` and
`team-polish.test.ts` cannot launch Chromium (MachPortRendezvous permission denied).
Run the updated R-02 UAT with two phones, inspect every capture, including all four
long-option captures, and save the new evidence under `uat/evidence/R-02-phone-layouts/`.

## Round 2 UAT repair — 18 November 2026 (RZ-003, RZ-005)

Cause: the paired-room flow completed all 36 captures. I opened its answering capture
and final leader/guest skip-reveal captures. Four answers are visible in answering;
the final captures show the skipped reveal. The timeout at line 104 occurs only after
navigating to the separate long-options fixture. Vite's `serveRawFsMiddleware` serves
`/@fs` HTML before `indexHtmlMiddleware`: the fixture's inline module therefore kept
bare imports such as `preact`, which browsers cannot resolve. This is a fixture boot
failure, not missing product answer controls or a changed answering-state selector.

Moved the fixture module to `games/rabakz/dev/phone-long-options.ts`, referenced by
an external script so Vite transforms imports and CSS. Its local tsconfig lets ESLint
check the entry. The slice waits for fixture readiness, then a visible answer button,
and asserts four buttons. It retains all four long-option captures (leader/guest at
667 and 844), font/wrapping/target checks, guest-no-Skip at every capture, and now
asserts leader Skip presence during question captures and absence during reveals.

The new browser-free `phone-render.test.ts` invokes the shipped LayoutEngine and
expands its component tree with measurement/input effects stubbed. At both phone
sizes and both leader states it proves placement fits, one `data-part="answer"`
options wrapper renders four enabled answer buttons with the four 40-character
labels, and only the leader renders Skip. The wrapper is the part; the four options
are its button descendants, matching the UAT selectors.

Validation (one-minute uptime loads before final Vitest / TypeScript starts: 3.14 /
3.42, both below 8):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz packages/controller-kit packages/platform apps/web/src`: exit 1; 1,864 passed, 1 skipped, 5 failed. All four new renderer cases passed. The five failures are the existing Chromium sandbox launch denials in Overlap, PeekPoker, host-keyboard, layout-fixtures and team-polish; no product/unit assertion failed.
- `pnpm exec tsc -b tsconfig.build.json`: exit 0.
- `pnpm exec eslint games/rabakz packages apps/web/src uat/slices --max-warnings 0`: exit 0.
- `pnpm run lint:design`: exit 0, 420 files scanned.

### Close-out

Fixture repair and renderer regression coverage are complete, uncommitted. Deleted
`uat-2-failure.log` as requested. No verify, UAT, perf, memcheck, Blender or install
command was run. Validation logs are in `uat/evidence/R-02-phone-layouts/round2-repair/`.

### Requests

Integrator: run the updated two-phone UAT outside this sandbox and visually inspect
all captures, including the four long-option captures. Re-run the five browser tests
there; this sandbox cannot launch Chromium, so the complete requested Vitest command
cannot pass here. Existing partial `round2-p2` evidence is preserved.

## Round 4 — private status contrast (RZ-003, RZ-005)

The private title span already painted the kit's light panel gradient, but inherited
Rabakz's near-white background ink (`#FFF1F4`). The locked-out round-three capture
`round3-p2/10-phone1-locked-out-844-phone1.jpg` was opened and confirms the unreadable pill.
Added a Rabakz-only selector in `packages/controller-kit/src/layout.css` setting the
private title span's colour to `var(--ka-panel-ink)` (`#3A1730`). Both colours and the
unchanged paper gradient come from `packages/ui`; no token, contract or other game's
selector was changed.

Calculated WCAG contrast against the white / pale-pink gradient endpoints is
**1.0972 / 1.0219:1 before**, **15.6117 / 13.9246:1 after**. These are token-based
calculations, not a claim that the browser assertions ran. The tokens have the same
values in light and dark mode.

Added `apps/web/src/rabakz-phone.dom.test.ts`, using the existing Playwright + Vite DOM
test pattern and `@kaki/ui`'s `contrastRatio` helper. It mounts the shipped ControllerShell
and LayoutEngine with actual Rabakz layouts/private views for Locked out, Locked in,
Right, Wrong and Skipped. In both preferred colour schemes it reads the computed text
colour and gradient paints from the pill itself and requires 4.5:1 against both paints.
Removing the new rule restores the inherited failing contrast above. It also checks
that all three other themes retain inherited pill ink. There was no existing DOM
contrast helper; the shared UI contrast helper is reused.

Validation (one-minute load below 8 before each start):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz packages/controller-kit apps/web/src`: exit 1; 817 passed, 6 failed. All failures are Chromium launch denials (`MachPortRendezvous`, permission denied), in Overlap, PeekPoker, host-keyboard, layout-fixtures, team-polish and the new Rabakz test. The new fixture bundled successfully. Load 1.45.
- `pnpm exec tsc -b tsconfig.build.json`: exit 0, including after final test typing corrections. Loads 2.15 / 4.21.
- `pnpm exec eslint games/rabakz packages/controller-kit apps/web/src --max-warnings 0`: final exit 0. Initial run found unsafe callback typing/non-null assertions in the new test; corrected. Loads 2.62 / 4.26.
- `pnpm run lint:design`: exit 0, 421 files scanned. Load 2.91.

### Close-out

The theme-scoped fix and five-state computed-contrast regression are ready for integrator
review. Changes remain uncommitted. No verify, UAT, perf, Blender, install, tracker or
contract changes were made.

### Requests

Integrator: run the browser tests outside this sandbox to execute the computed-contrast
and other-theme assertions, and inspect the resulting phone presentation. Browser
validation remains unproven here because Chromium cannot launch.


## Round 5 — independent review repairs (RZ-003, RZ-005)

Private title pills now use inline-block, 5 px block / 21 px inline token padding,
with generic panel ink for every theme. Pure placement reserves that padding;
DOM fitting checks the padded span's dimensions and scroll bounds. The browser
assertion covers all five status strings at 667 and 844, in both colour schemes
and all four themes, requiring 13 px minimum text insets, no overflow and 4.5:1
against both gradient stops. No game name remains in the kit CSS.

Tone ceilings now apply only to panels with a title block. Untitled panels keep
34 px text, including Peek Poker's real privateView hand name (new regression
at both phone widths). The kit retains its titled hierarchy test and adds an
explicit untitled regression. Step-21 option labels use the shared bold weight;
a CSS regression and the long-option browser assertions cover this.

A four-option grid with a separate unshaped action places that action at the far
right of the play area, reserving at least 34 px from the grid. The private panel
occupies the intervening column. Tests check clearance, far-edge alignment and
89 × 68 floors. The compact 89 px action retains “Skip”: at 21 px the whole word
“question” exceeds its available label width. No 15 px fallback was introduced.

The kit reuses @kaki/ui pulse() on a private title change, once per changed title;
unchanged title text does not restart it. Reduced motion bypasses animation, and
unmount/title replacement cancels it. This is a small game-agnostic application
of the existing primitive, including “Locked in”; no new motion token was added.

The long-option fixture and both corresponding unit fixtures now contain four
whole-word 40-character strings, with no truncation or filler punctuation.

The UAT script adds live question-five scoreboard / leader Continue captures,
and deterministic shipped-view captures for “2nd · 700” at scoreboard and end,
and “Join next question”, leader/guest at both sizes. These stills are scripted,
not generated or visually accepted here: UAT was expressly prohibited this round.
The final-round announcement is **unit-tested only**: the rules tests cover the
final phase, but games/rabakz/host/Screen.tsx:294 retains the preceding question
when publicView supplies no question; it has no announcement surface to capture.
Adding that host feature is outside RZ-003 / RZ-005. This is not visual evidence
of a final announcement.

### Choices for the integrator

Put these departures from board 4 to Randy together with the next rendered UAT
artifact. They are recorded for decision, not represented as approved changes:

- Locked-out presentation: board 4 overlays the faded answers with a full veil;
  games/rabakz/src/rules/views.ts:57 instead supplies a “Locked out” private pill
  and an explanatory note beside the grid.
- Correct reveal: board 4 has a “Correct” chip and +150 at 89 px;
  games/rabakz/src/rules/views.ts:46 uses “Right” and Points gained, with the
  titled-panel ceiling of 34 px in packages/platform/src/game/private-placement.ts:41.
- Header: board 4 says “Question 7 of 10”; the shipped shell uses “Connected”
  from packages/controller-kit/src/model.ts:5.
- Pill surface: packages/controller-kit/src/layout.css:83 uses the shared pale
  panel gradient (including its white endpoint), rather than a coloured chip.
- Skip: games/rabakz/src/rules/views.ts:25 retains compact “Skip” at 21 px,
  with the 89 × 68 play-area target and far-right separation implemented in
  packages/platform/src/game/private-placement.ts:122; board 4 puts a smaller
  “Skip question” in the header.
- Status confirmation: packages/controller-kit/src/layout-renderer.ts:130 applies
  the shared pulse to changed private title text, including Locked in, per §3.

### Requests

The integrator explicitly authorised this round's edits in packages/controller-kit
and packages/platform: pill surface/ink, padding-aware fitting, titled-only tone
ceilings, generic separated-action placement, shared title pulse and regression
tests. No contracts, dependencies, lockfile, trackers or protected design docs
were edited. No commit was made.

Run browser-backed tests outside the sandbox: Overlap.dom.test.ts,
PeekPoker.dom.test.ts, host-keyboard.dom.test.ts, layout-fixtures.test.ts,
team-polish.test.ts and rabakz-phone.dom.test.ts cannot launch Chromium here
(MachPortRendezvous permission denied). Run and inspect every new UAT still:
`pnpm uat -- R-02-phone-layouts --phones 2 --out round5-p2`.

### Validation

Only the four requested validation commands were used; each start waited for
one-minute load below 8. Final results and logs are recorded in
uat/evidence/R-02-phone-layouts/round5-checks/ and its parent README.


Final commands: Vitest exit 1 (1,989 passed, 1 skipped, six Chromium launch
failures only); TypeScript exit 0; ESLint exit 0; design lint exit 0 (421 files).
Exact commands are in the evidence README. Final one-minute loads before starts
were 7.42 / 6.84 / 7.71 / 6.17 respectively. No UAT, verify, perf, Blender,
install or commit was run. Browser execution and visual acceptance remain open.

## Round 6 — single-action label clipping (RZ-003, RZ-005)

The integrator's round5-p2 run found Continue at 667 × 375 needed 89 px but
received 83 px at the existing bold 21 px step. Rabakz single-option targets
now use the existing 8 px horizontal padding token instead of 13 px, freeing
10 px inside the target. The target box, shape, 13 px shape/label gap, type
ladder and D-051 minimum dimensions are preserved. This applies to Continue
and both Skip presentations (beside answers and alone for a waiting player).
No new target size or smaller type was introduced.

The Rabakz-scoped rule lives in `games/rabakz/controller.css`, imported by the
shipped phone route and the deterministic phone fixture. Shared kit/platform
files and contracts are untouched.

Extended `apps/web/src/rabakz-phone.dom.test.ts` to measure the actual label
span's scroll/client bounds and rendered text bounds, 34/21 px type, three-line
ceiling, and 89 × 68 target floors. It exercises Continue, question options
with Skip, and lone Skip at 667 × 375, 844 × 390, 932 × 430 and their portrait
orientations. Existing light/dark status contrast assertions remain.

### Validation

Every permitted check started with one-minute uptime load below 8:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz apps/web/src`
  (7.99): exit 1; 725 passed, six failed solely at Chromium launch with
  MachPortRendezvous permission denied. The affected files are
  `Overlap.dom.test.ts`, `PeekPoker.dom.test.ts`, `host-keyboard.dom.test.ts`,
  `layout-fixtures.test.ts`, `team-polish.test.ts`, and `rabakz-phone.dom.test.ts`.
  The new DOM assertions did not execute; browser fit remains unconfirmed.
- `pnpm exec tsc -b tsconfig.build.json` (4.33): exit 0 after correcting the
  DOM test's `expect.poll` message argument. Initial run: exit 2 for
  that test API type error.
- `pnpm exec eslint games/rabakz apps/web/src uat/slices --max-warnings 0`
  (5.72): exit 0.
- `pnpm run lint:design` (5.82): exit 0; 422 files scanned.

Logs: `uat/evidence/R-02-phone-layouts/round6-checks/`. No verify, UAT, perf,
install or commit was run. Existing round5-p2 evidence is untouched.

### Close-out

RZ-003 / RZ-005: token-only single-action padding fix, shipped and fixture
imports, and DOM regression coverage are ready for integrator review. Browser
execution and visual acceptance remain open; no round-six UAT pass is claimed.

### Requests

Integrator: rerun the six browser-backed test files outside this sandbox, then
run and inspect `pnpm uat -- R-02-phone-layouts --phones 2 --out round6-p2`.

## Round 7 — four long answers (RZ-003, RZ-005)

Board 4's rzAnswer/rzBtns specifies a 2 × 2 grid. While choosing an answer,
Rabakz now puts its single private score line in a 55 px strip above that grid.
The leader still has a separate 89 px Skip target with 34 px clearance. All
geometry uses existing spacing tokens; targets, shapes and the 34/21 ladder
remain intact. Multi-block locked/reveal panels retain their existing placement.

With Skip present, the answer grid is viewport width minus 149 px. At the
21 px label step, available label widths (before the renderer shrinks spans
to their longest line) are 206.5 / 295 / 339 px at 667 / 844 / 932 wide,
assuming the normal 13 px grid gap and 1 px panel edge. These are calculated
capacities, not browser measurements; Chromium cannot run here.

The DOM regression reads every content/rabakz question file and uses the three
longest bank options (40 characters, including “Musical Interface of Digital
Instruments”) plus “A lovely hot bowl of noodles with prawns”. It keeps
the three-line, no-overflow and target-floor assertions at all three requested
landscape sizes and explicitly requires 21 px labels for these long options.

### Close-out

Uncommitted; no verify, UAT, perf or install run. Final permitted checks and
load readings are recorded in round7-checks/README.md under the slice evidence.

### Requests

Integrator: execute the browser assertions and inspect the long-answer UAT
outside this sandbox. Actual rendered label widths and wrapping remain unverified.


## Round 8 — retain private status with long options (RZ-003, RZ-005)

The private-view data still contained Locked out / Locked in. Long options
consumed the available side-panel width, making pure placement fail; the
renderer consequently omitted the private panel. CSS alone could not restore it.

Added a measured fallback in the existing private-placement implementation:
when side placement fails for four options and text-only private blocks, try a
55 px horizontal strip above the answers. Each block must fit independently,
and the relocated answer controls must pass the existing content-fit calculation.
The renderer honours the resulting per-block widths. Normal side placement,
reveal panels and the round-seven choosing-state score strip remain in use.
No public layout/private-view contract, game rules or dependencies changed.

Calculated strip geometry (not browser measurements): with 13 px outer margins
and two 13 px gaps, three text blocks receive (viewport width − 52) / 3:
205 / 264 / 293.33 px at 667 / 844 / 932 wide. Title padding remains 21 px per
side, leaving 163 / 222 / 251.33 px for status text. Existing 34 → 21 → 13
measurement selects a fitting title token; the regression requires at least
21 px in the fallback. Choosing-state score stays in its existing full-width
641 / 818 / 906 px strip, so no score competes with a status pill.

The fallback answer grid reserves 89 px for Skip plus 34 px clearance and
26 px outer margins: grid widths 518 / 695 / 783 px. With the 13 px column
gap, 21 px shape, 13 px shape/label gap, two 5 px insets and two 1 px edges,
label capacities remain 206.5 / 295 / 339 px. Grid heights are 213 / 228 /
268 px at the requested landscape sizes. Round-seven choosing CSS is unchanged.

Existing DOM test expectations and selectors are unchanged, including the
integrator's order-free option comparison. Added pure regression coverage for
Locked out, Locked in, Right, Wrong and Skipped with long options at all three
sizes; at 667 px the locked states must actually use the strip.

### Close-out

Uncommitted. Only the four requested check commands were used, each started
below one-minute load 8. Results are in the round8-checks evidence README.
Browser tests were not run: Chromium is unavailable with the requested
PLAYWRIGHT_BROWSERS_PATH=/nonexistent. No rendered fit or contrast pass is claimed.

### Requests

Integrator: rerun the unchanged browser test outside the sandbox to confirm
status rendering, padding, contrast and long-option wrapping in every listed theme.

## Round 9 — consistent status strip (RZ-003, RZ-005)

Extended Rabakz's existing score-strip CSS to every answer state, including
Locked out and Locked in. Multiple private blocks share the 55 px top strip;
the 2 × 2 answer grid retains its full choosing-state width. The grid uses an
8 px gap so two rows remain 110 px tall at 844 × 390 (D-051). Skip retains its
89 × 68 minimum and reserved separation. No font step was reduced.

The DOM option-fit loop now covers question, scoreboard, answered, locked-out
and waiting at 667 × 375, 844 × 390 and 932 × 430. It tests long phrases,
bank-derived longest words/tokens, and the exact Mentsuyu question separately.
Locked states assert a visible status and a panel above the answer grid.
Answer targets at 844 px and wider require both dimensions to be at least
110 px. The three-line check rounds fractional line-height up to the integer
clientHeight boundary; a fourth line still fails.

Longest alphabetic word: Somatosensation (15 letters, tied). Longest unbroken
whitespace token: Cretaceous-Paleogene (19 characters). Calculated leader label
capacities at 21 px are 205 / 293.5 / 337.5 px in question, answered and locked-out
states. Scoreboard has no answer labels. These are capacities, not rendered
measurements; browser execution is unavailable here.

### Close-out

Changes remain uncommitted. TypeScript, ESLint and design lint passed; 726 unit
tests passed. Six Chromium-dependent tests are not run (launch failures).
Check results and width calculations: `uat/evidence/R-02-phone-layouts/round9-checks/README.md`.
No verify, UAT, perf, install or node_modules linking was performed.

### Requests

Integrator: establish the new test's failing layout assertion with the previous
CSS, then its passing result with this CSS, outside the sandbox. The baseline
check here stopped at Chromium launch, so no red/green browser result is claimed.
Run two-phone UAT and inspect the status strip, targets and label wrapping.

## Round 10 — placement failure isolated (RZ-003, RZ-005)

The third option set contains Cretaceous-Paleogene. Extending the pure placement
regression with that token reproduces a false placed.fits result, which prevents
LayoutEngine from creating the private panel. This is a product placement bug,
not an ignored fixture draw or a revision-key collision. The shared option
metric treats the hyphenated token as indivisible and rejects the strip.

All DOM assertions remain. Option sets and contrast colour schemes now run as
separate tests, each retaining the 30-second limit.

### Close-out

Uncommitted and incomplete pending scope permission for the shared platform
implementation fix. The new pure regression fails as expected; browser tests
were not run because Chromium is unavailable. Check details are recorded in
uat/evidence/R-02-phone-layouts/round10-checks/README.md.

### Requests

Allow the implementation correction in packages/platform/src/game/option-metrics.ts
outside the R-02 paths. After repair, the integrator must run Chromium and measure
the split tests at load 2; no timing or rendered pass is claimed here.


## Round 11 — browser break opportunities (RZ-003, RZ-005)

Generic option metrics now permit wrapping after ordinary hyphens, Unicode hyphens,
figure/en/em dashes, slashes and zero-width spaces, and before em dashes.
Non-breaking spaces and non-breaking hyphens remain indivisible. The three-line
limit and 21 px floor are unchanged. No DOM assertions were changed.

### Close-out

The round-10 Rabakz long-option placement regression passes, including the
Cretaceous-Paleogene case and retained status panel checks. Twelve new platform
unit cases pass, covering the bank's Triassic–Jurassic, other break points,
unbreakable words, non-breaking punctuation and the line/size limits.

All permitted checks started with one-minute load below 8. Final Vitest result:
1783 passed, one skipped, two pure platform failures, and eleven browser tests
not run (Chromium launch fails with the explicitly nonexistent browser path).
TypeScript build, ESLint and design lint passed. Evidence summary:
`uat/evidence/R-02-phone-layouts/round11-checks/README.md`.
No verify, UAT, perf, install, node_modules linking or commit was run.

### Requests

Integrator review is needed for the untouched platform assertions outside the
permitted test file: lone-option.test.ts:95 expects width 271 but receives 263
with breakable hyphenated labels; conformance-private.test.ts:32 expects text
height at most 291 but receives Infinity. Browser validation remains outstanding.


## Round 12 — merged fixture and metric assertions (RZ-003, RZ-005, CTRL-002, CTRL-003)

The merged placement/renderer combination is consistent: note-tone text always stays at
13 px, titled panels retain title/body ceilings, and untitled body text retains its
34 px ceiling. The retained hierarchy and PP-020 regression tests pass.

Rabakz views tests supplied question data but no categories.json inventory. Added the
same inventory context as main's rules/harness.test.ts; all 17 views tests pass without
changing their assertions.

263 px is the answer cell width, not a changed natural single-line label width.
With breakable hyphenated labels, placement retains 13 px margins/gaps rather than
reducing gaps to 5 px. At 667 px: (667-26-89-13-13)/2 = 263;
the old 271 px result used 13 px margins and 5 px gaps:
(667-26-89-5-5)/2 = 271.
The natural Skip width remains 89 px. Updated the answer-grid expectation and added
an explicit regression that hyphen/dash/slash lone options reserve their unwrapped
textWidth plus the existing 32 px inset. Production measurement is unchanged.

The Infinity fixture is layoutFixtures.every's note "Every kind", in a 36 × 291 px
box. "Every" is unbreakable and measures 36.01 px at the note's 13 px step; "kind"
measures 24.31 px. Production text controls already permit exactly 1 px overhang
(D-140); the cross-fixture assertion omitted that argument. It now measures with the
same allowance. The separate D-140 test still rejects 1.1 px overhang. This is not
an option-label 21 px / three-line violation; no fixture text or measurement rule
was changed to hide an unbreakable option.

### Validation

Each permitted check started below one-minute load 8:

- Vitest, requested command with PLAYWRIGHT_BROWSERS_PATH=/nonexistent and
  VITEST_MAX_WORKERS=2: exit 0; 109 files passed, 2348 tests passed, 1 skipped.
  Final start load 3.55. Initial diagnostic run (load 3.34) exposed the two
  metric assertions after fixing the Rabakz context.
- ESLint, requested command: exit 0; start load 3.48.
- Design lint, requested command: exit 0, 455 files; start load 3.44.
- TypeScript build not run: tsconfig.build.json references library configs that
  emit JS/declarations (for example packages/platform/tsconfig.lib.json). The
  explicit no-emission instruction takes precedence; no alternative tsc command
  was authorised.
- Browser tests not run: Chromium is unavailable in this sandbox. The requested
  packages/game filter contains no browser test files; the one skip is the
  opt-in simulation benchmark. No browser or visual acceptance is claimed.

Logs: uat/evidence/R-02-phone-layouts/round12-checks/.

### Close-out

All three reported failure groups pass. Changes remain uncommitted. No production
code, protected docs, contracts, dependencies or lockfile changed. No verify, UAT,
perf, install or node_modules linking was run.

### Requests

Integrator: run browser validation outside the sandbox and the TypeScript build
where emitting its configured output is permitted.

## Round 13 — placement truth and transform-safe labels (RZ-003, RZ-005, CTRL-003)

The strip is a generic shared placement rule: visible controls must be exactly one
four-option grid plus an optional single option without a face glyph, and private
blocks must all be text. This eligible composition prefers a measured 55 px strip
above the grid, with 13 px outer margins/separation and 8 px internal gaps. It
reserves the action's natural width and 34 px separation, or 5 px at the unused
edge. The candidate checks every box for positive dimensions, phone bounds and
pairwise overlap, as well as control content and private text fit. No unrelated
control can be carried through from a failed packing result. ARCHITECTURE records
this rule without game names or control IDs.

Removed Rabakz's placed-box CSS overrides and its grid-gap override. Pure placement
now supplies the actual grid used by both renderer and type-step cap. At the 844 ×
390 guest viewport the content area is 844 × 322, the grid is 813 × 228 at (13,81),
and each of Christopher Walken, David Hasselhoff, Jerry Springer and Patrick Swayze
selects 34 px. Wider boxes can also retain some 38–40 character labels at 34 px;
old assertions that every long label must always select 21 were adjusted. The
21 px minimum, three-line ceiling, content fit and narrow-phone step-down checks
remain. Added a guest DOM case asserting actual computed 34 px labels.

The fixture sweep now checks bounds for every fitting box and checks overlap,
using circle distance for circular diamond buttons whose bounding squares overlap
by design. All 24 every-kind/text-view/leader/phone combinations are explicitly
rejected. Round 12's assertion allowance is reverted: no remaining fitting fixture
has justified re-applying it. The Round 12 explanation of the Infinity as harmless
is superseded by the placement regression and this fix; the separate D-140
production one-pixel-overhang test remains intact.

Hyphens and slashes stay joined to a following digit in text metrics; regressions
cover Catch-22, A350-1000, 85-92, 3/4 and -40. Kit measurement converts transformed
text and icon rectangles back to layout pixels for type selection, natural option
widths and the pinned longest-line width. The conversion uses computed layout width
(with an offsetWidth fallback), preserving fractional widths. Longest-line rounding
restores browser subpixel precision before integer rounding. Unit and DOM regressions
compare scale(0.97) with scale(1). Small bold type is now scoped to shape-coloured
targets and targets with an explicit background rather than every 21 px target.

### Validation

Every check started with one-minute load below 8:

- Final exact requested Vitest command (PLAYWRIGHT_BROWSERS_PATH=/nonexistent,
  VITEST_MAX_WORKERS=2): start load 6.97; 154 files passed, 2848 tests passed,
  1 skipped. The 19 failures across 13 files are all Chromium launch failures
  at /nonexistent, including all seven Rabakz DOM cases. All non-browser tests
  passed, including fixture bounds/overlap, every-kind rejection, 34 px placement,
  numeric punctuation and scale-measurement regressions. Exit 1; no browser pass
  is claimed. Log: /tmp/r02-round13-tests-final.log (outside evidence).
- Final `pnpm exec tsc -b tsconfig.build.json`: start load 5.94, exit 0.
  No generated .js/.js.map/.d.ts files were left beside sources; the existing
  tracked host stylesheet declarations were preserved.
- Final `pnpm exec eslint packages games apps/web/src`: start load 6.02, exit 0.
- Diagnostic Vitest starts were at 2.78 and 6.38; they exposed corrected stale
  geometry assertions and test/mock defects. The second also had one existing
  conformance test exceed its 5-second timeout; it passed on the final run without
  a timeout or implementation change. Earlier TypeScript starts (5.59, 6.48)
  passed; lint findings from the first start (6.25) were corrected and the next
  run (7.58) passed.

No verify, UAT, performance run, install, dependency linking or evidence edits
were performed.

### Close-out

Changes remain uncommitted for Claude's review. Browser validation is still required;
no new rendered acceptance or visual evidence is claimed.

### Requests

Integrator: run the updated DOM regressions with Chromium available, then review the
rendered grid/status views. Prior human choices about the title pulse and board-4
departures remain open; this round does not decide them or alter protected trackers.

## Round 14 — fractional label probes (RZ-003, RZ-005)

Cause in `measureLabelTypeStep`: the wrapped probe has an explicitly assigned
fractional available width, but its `scrollWidth` is an integer CSSOM measurement.
The fitter took the maximum of these values and compared it with the fractional
available width. A fitting probe whose width rounds up therefore falsely reports
horizontal overflow. Column position / transform conversion can leave the available
width just below an integer, explaining why equal-capacity buttons can disagree.
This is a measurement comparison defect, independent of numeric wrapping or font
readiness; the renderer already remeasures after fonts and button resizes.

Compare scrollWidth with clientWidth (and scrollHeight with clientHeight) before
using scroll bounds as evidence of overflow. Keep fractional natural/wrapped bounds
for the actual fit calculation. Each answer still independently selects its largest
fitting 34/21 step under the placement cap; no grid-wide reduction or test relaxation
was added. The existing four-34 browser assertion is unchanged.

Added a browser-free regression for a fitting 322.99999 px probe whose scroll/client
widths both round to 323, an exact-integer counterpart, and a genuinely overflowing
324 px word. All select the expected step; the fractional fitting case fails with
the old implementation.

### Validation

- Requested Vitest command: start load 3.94; 1,448 passed, 1 skipped; seven Rabakz
  DOM cases failed solely because Chromium is absent at `/nonexistent`. Exit 1.
- Requested TypeScript build: start load 4.19; exit 0. No generated JS, maps or
  declarations were left beside sources (checked with git status).
- Changed-file ESLint: exit 0; final start load 5.76. An earlier successful lint
  was mistakenly started after a load reading of 10.26, violating the load gate;
  it was repeated below 8.
- Design lint: start load 5.70; exit 0.

Logs are `/tmp/r02-round14-{tests,tsc,eslint-final,design}.log`.
No verify, UAT, perf, install, dependency linking or commit was run.

### Close-out and Requests

The unit regression and fitting correction are ready for review. The specific
browser result remains unverified in this sandbox: integrator, rerun the unchanged
short-answer DOM assertion and the other scenarios with real Chromium.

## Round 15 — short-name geometry audit (RZ-003, RZ-005)

**Unresolved: no production fix or browser pass is claimed.** Round 14's rounding
explanation did not establish the cause of the integrator's real-Chromium failure.

Browser-free calculation from the current source at viewport 844 × 390, play area
844 × 322, guest / isLeader:false: the answer part is x=13, y=81, width=813,
height=228; placement margin=13 and gap=8. The CSS has no remaining answer-box
override. Its two equal columns and rows therefore produce the same 402.5 × 110
button boxes used by the renderer's placement cap. This rules out the former
345 px part / wider shipped grid discrepancy for this case.

| Label | Estimated natural width at 34 | optionLabelStep at 402.5 × 110 |
| --- | ---: | ---: |
| Christopher Walken | 315.52 px | 34 |
| David Hasselhoff | 270.98 px | 34 |
| Jerry Springer | 243.44 px | 34 |
| Patrick Swayze | 243.44 px | 34 |

The pure estimator reserves 12 px for edges/padding plus 55+13 px for the shape
and gap: available width=322.5 and height=98. Its estimated single-line height
is ceil(34×1.3)=45. Shipped CSS uses 5 px padding and 3 px borders on each side,
so geometric label space is 402.5−16−55−13=318.5 px by 110−16=94 px.
The DOM fitter uses integer client dimensions, which can round this width;
these are derived layout numbers, not browser measurements. Even a two-line
34 px label requires ceil(2×34×1.3)=89 px and fits the derived height.

Added a non-browser test through the actual Rabakz layout/private view asserting
the exact answer placement, gap and all four 34 px placement caps. It establishes
that placement does not reproduce the reported rejection; it is **not** a
regression that reproduces the unknown DOM cause. A direct esbuild-bundled call
to the source placement function independently returned the numbers above.

The unchanged four-34 browser assertion now includes each label's text, rendered
step, part and button dimensions, available space, and natural/wrapped 34 px
bounds plus scroll/client bounds in its failure message. It restores all probed
inline styles and the step attribute. This makes the next integrator failure
reviewable without assuming which DOM dimension caused the rejection.

### Close-out and Requests

Steps 1 and 4 are complete. Steps 2 and 3 remain incomplete: no verified cause
inside measureLabelTypeStep and no reproducing unit test or production correction.
Integrator: run the short-name scenario with Chromium and retain its expanded
failure message; it will identify the rejecting width/height before another fix.
No commit, verify, UAT, perf, install or dependency linking was performed.

### Validation

All check starts used a one-minute uptime load below 8. Requested Vitest command:
initial load 6.22, final load 2.60; final exit 1, 1,449 passed, 1 skipped and seven
Rabakz browser cases failed solely at Chromium launch under /nonexistent. TypeScript:
initial load 2.93, final load 4.66, both exit 0. Changed-file ESLint: initial load
2.87 found a nullable type assertion in the diagnostics; corrected to an explicit
null guard, final load 4.28, exit 0. Design lint: load 3.70, exit 0, 455 files
scanned. Source-output inspection found only the pre-existing tracked
`games/rabakz/host/styles.d.ts`; no emitted source neighbours needed removal.
Logs: `/tmp/r02-round15-{tests-final,tsc-final,eslint-final,design}.log`.

## Round 16 — placement-driven label measurement (RZ-003, RZ-005)

The integrator's call trace establishes the stale decision: Christopher Walken
was measured only at 667 px, selected 21, and never measured after the redraw at
844 px. The Target measurement effect depended on label, face and placement cap,
not placed dimensions. Both sizes can have the same cap, so that effect did not
rerun; the only geometry invalidation was an asynchronous button ResizeObserver.
Round 14's assertion that resizes reliably caused measurement was incorrect.

The source does **not** establish why Chromium delivered no observer callback for
the reported 314 → 402.5 width change. Targets have stable item keys; outgoing
layers are cloneNode snapshots, not moves of observed buttons. Crossfades use
opacity; press feedback uses scale, whose visual changes do not trigger
ResizeObserver, but that does not explain this placed-width change. A genuine
content-box change on that same connected button should trigger the observer.
Claiming replacement, an outgoing observer, or scale as the proven browser cause
would go beyond the available evidence. The demonstrated code defect is relying
on that callback instead of explicitly invalidating on known placement changes.

Target now receives its placed cell width/height for options and interactive
grids. Both dimensions are effect dependencies; viewport resize also invokes the
measurement. Existing observer and font readiness invalidation remain. Thus a
redraw with changed placement measures synchronously even without an observer
callback. No game-specific logic was added to shared packages.

The fitter uses the placed border box minus computed borders, padding, shape
width and gap. Its hidden fixed probe is mounted outside the grid and animation
ancestors, copies the label typography at the caller's reset 34 px, and wraps at
an explicit available width. It never reads live button bounds or transform scale
in this path. Probe removal is in finally. Callers without placement retain the
existing DOM measurement path. The live span still shrinks to its longest rendered
line after the type step is selected.

Added a browser-free regression using deliberately stale 1 × 1 live dimensions,
asserting different decisions from two placed boxes and probe cleanup. Added the
`short-resize` DOM case: one page draws short options at 667 × 375, resizes to
844 × 390, redraws the same keyed options and polls for four 34 px labels. This
sequence adds no font/animation waits, only expect.poll. All existing assertions
remain and also run for the new short scenario.

### Validation

All check starts used a one-minute uptime load below 8. Final requested Vitest:
start load 6.66, exit 1; 1,450 passed, one skipped, eight DOM cases failed solely
at Chromium launch under /nonexistent. Initial run caught an inaccurate mocked
wrapped-height fixture; corrected it to model narrow wrapping before rerunning.
TypeScript: final start load 6.21, exit 0. Changed-file ESLint: final start load
6.03, exit 0. Design lint: start load 6.03, exit 0, 455 files scanned.
Source-neighbour scan found only the pre-existing `games/rabakz/host/styles.d.ts`;
no emitted source neighbours needed deletion. git diff --check passed.
Logs: `/tmp/r02-round16-{tests-final,tsc-final,eslint-final,design}.log`.

### Close-out and Requests

Production correction and regression are ready for integrator review. Real
Chromium confirmation remains with the integrator, including the new short-resize
case. The specific reason for the missing observer delivery remains unproven;
correctness no longer relies on that delivery. No commit, verify, UAT, perf,
install, dependency linking, tracker or lockfile edits were performed.

## Round 17 — shared option-group label step (RZ-003, RZ-005, CTRL-003)

Reviewed D-127, rounds 13–16 and the supplied round-16 four-longest screenshot:
its four shape-coloured answers mix 34 px regular and 21 px bold. Per the
integrator's round-17 decision (to be logged at merge), each existing options or
interactive-grid group now resets all labels to 34, measures every label against
its placed cell, and applies the smallest measured step to every target through
`data-label-step`. Actual measurement replaces the per-label estimated placement
cap; measured wrapping is explicitly limited to three lines. Longest-line span
widths are recomputed after applying the shared step. No game IDs are involved.

Round-16 placed-width/height dependencies, viewport resize, ResizeObserver and
font invalidation remain. Each callback refreshes its own existing DOM group;
separate controls such as Skip and Lock in retain independent measurement.
Resetting the entire group before probing also clears the 21 px bold styling,
so resizing can restore every option to 34 px regular.

Unit coverage exercises four fitting labels, one overflowing label reducing all
four, resize recovery, an independently measured single control, and a four-line
label in an otherwise tall box. Both four-longest UAT checks now require one font
size and one weight across all four labels, retaining their per-label checks.

### Validation

- Requested Vitest command: initial launch load 5.86, exit 0, 383 tests passed;
  final launch load 7.40, exit 0, 384 tests passed across 26 files.
- TypeScript build: launch loads 6.53 and 7.77, both exit 0.
- Requested ESLint: initial launch load 7.78, exit 0; repeat launch load 8.07,
  exit 0. **That repeat breached the load gate.** Final repeat used an enforced
  below-8 gate, launched at 7.70 and passed (exit 0).
- Design lint: launch loads 7.90 and 7.14, both exit 0; 455 files scanned.
- Source-neighbour scan found only pre-existing tracked stylesheet declarations
  (`games/rabakz/host/styles.d.ts` and `games/peek-poker/host/style.d.ts`), with
  no generated source neighbours to delete. `git diff --check` passed.

Logs: `/tmp/r02-round17-tests{,-final}.log`,
`/tmp/r02-round17-tsc{,-final}.log`,
`/tmp/r02-round17-eslint{,-final,-gated}.log`, and
`/tmp/r02-round17-design{,-final}.log`.

### Close-out and Requests

Ready for integrator review, uncommitted. Browser/UAT rendering remains for the
integrator; no new visual acceptance is claimed. No verify, UAT, perf, install,
dependency linking, protected-document or lockfile edits were performed.

## Round 18 — one batched measurement per group (CTRL-003, RZ-003, RZ-005)

Read review 14 in full. Main was already merged as c5113ba0; no merge performed.
The options/interactive-grid container now owns one frame-deduplicated scheduler,
with mount, fonts.ready, loadingdone, group ResizeObserver, window resize and
shell data-theme mutation triggers. Targets no longer each remeasure the group.
Each pass resets all targets, snapshots typography, mounts all natural/wrapped
probes, reads all probe bounds, then applies the smallest step to the whole group.
Longest-line widths are also read together before writing widths. Separate controls
retain independent groups and placement remains the source of cell dimensions.
Interactive grids use the drawn 5/8 gap, matching controlContentFits.

Regression coverage counts 32 probe mounts (two per label, linear in 16 targets)
per group pass, including deduplication of repeated callbacks; checks every trigger
and a theme line-height change from 34 to 44 px after initial measurement. Existing
shared-step, resize recovery and separate-control expectations remain.

Moved the text-strip section to ARCHITECTURE §3 (D-203). Decision references are
D-203 (preferred strip), D-204 (option metrics), D-205 (shared group step) and
D-206 (bold on coloured targets). OQ-050 retains board-4 departures and title pulse.
Filled the round-17 REPORT using review 14's tables, explicitly attributing visual
review to Claude reviewer. These are historical stills, not round-18 validation.
K-05/C-16b evidence for kit fixtures `options`, `disabled-options` and `long-answer`
predates the preferred strip (D-203); integrator must refresh or qualify those rows.

### Close-out and Requests

Uncommitted for integrator review. Integrator retains real-browser, merged-tree UAT
and controller performance gates, plus Randy's OQ-050 choices. No verify, UAT, perf,
install, node_modules linking, tracker/contract/lockfile edits or commits performed.

### Validation (round 18)

All launches used a preceding uptime one-minute load below 8:
- Vitest: 3.32 initially (712 passed, one skipped, one new mock failure); fixed the
  mock's missing getBoundingClientRect. Final run launched at 7.75: exit 0,
  713 passed, one skipped across 55 files. No browser test launched in this selection.
- TypeScript build: 3.46 and 7.34, both exit 0.
- Requested ESLint: 4.30 initially (seven empty mock method errors); corrected
  mock comments, then 6.56 and 7.32, both exit 0.
- Design lint: 5.24, exit 0, 468 files scanned.

Source-neighbour scan found only pre-existing tracked stylesheet declarations
`games/rabakz/host/styles.d.ts` and `games/peek-poker/host/style.d.ts`; no emitted
.js, .js.map or .d.ts files needed deletion. git diff --check passed.
Logs: `/private/tmp/r02-r18-{tests,tests-final,tsc,tsc-final,eslint,eslint-final,eslint-latest,design}.log`.

## Round 19 — measure placed groups before paint (CTRL-003, RZ-003, RZ-005)

Identified a timing window introduced in round 18: Part installs the new placed-box
owner in useLayoutEffect, but observeLabelGroup deferred even its initial pass to
RAF. Keyed buttons could therefore retain the previous narrow box's shared 21 px
step until that frame, while their new button geometry already fit 34 px. The
cell-box gap/padding/border deductions match the round-17 per-target path.
The initial group pass now runs synchronously in that layout effect; subsequent
resize/theme/font notifications remain frame-deduplicated. Each pass retains
batched probe writes then geometry reads. No renderer or browser-test edits.

The new unit regression runs observeLabelGroup through the real measureLabelGroup
path with four named labels initially at 21, a 2×2 group of 402.5×110 buttons,
319.5×94 available label boxes and 88 px wrapped heights. It asserts all four
become 34 before RAF/fonts.ready and all eight probes mount before geometry reads.
The existing 16-target test still checks one batched pass per later trigger.

Validation, serial launches (one-minute load at each launch):
- Requested unit selection, PLAYWRIGHT_BROWSERS_PATH=/nonexistent and
  VITEST_MAX_WORKERS=2: load 5.5132; exit 0, 714 passed, one skipped, 55 files.
- TypeScript build: load 5.3291; exit 0. No untracked source-neighbour .js,
  .js.map or .d.ts emissions found; no source declarations deleted.
- Requested ESLint: load 5.1426; exit 0.
- Design lint: load 5.2109; exit 0, 468 files scanned.
- Browser baseline: load 3.1255 failed to launch because inherited
  PLAYWRIGHT_BROWSERS_PATH=b points to no browser. Retried with that variable
  removed using the installed cache at load 5.6797: Chromium aborted before tests
  with MachPortRendezvousServer bootstrap_check_in Permission denied (1100).
- Two post-fix browser runs, VITEST_MAX_WORKERS=2, installed cache, loads 5.3291
  and 5.7388: same sandbox Chromium launch abort, all eight cases blocked before
  assertions. The required two 8/8 browser passes remain unverified.
- git diff --check passed. Logs: /private/tmp/r02-r19-*.log.

### Close-out and Requests

Integrator subsequently confirmed Chromium 8/8 twice and 23/23 for the full
browser set, plus merged-tree UAT `uat-r19-p2` and controller start-up median
193 ms (193.2 ms recorded, against 2000 ms). These are integrator results,
not browser runs performed by Codex. Review 15's screenshot and acceptance rows
are now transcribed, attributed to the Claude reviewer, in that run's REPORT.md.
Round 19 was integrated at HEAD cefd31bf; round 20 below remains uncommitted.
Randy's OQ-050 choices remain open.


## Round 20 — one measurement per install (CTRL-003, RZ-003, RZ-005, PERF-012)

Part now keys its measurement owner on content, face/face-down state, colour,
disabled state, grid dimensions and placed geometry, rather than the control
object. Selected/plain state-only messages preserve the owner. The initial
ResizeObserver notification is skipped, and already-loaded fonts do not enqueue
a fonts.ready pass. Empty face-down labels skip all style, probe and range work.

The unit regression invokes the actual Part component and compares its effect
dependencies across fresh control objects. Its ResizeObserver fires on observe;
it checks one install pass, none for a selection, one for changed labels, and
later batched resize, loadingdone and theme triggers. The unused single-target
measurement helper is explicitly marked as a test-only legacy oracle; production
and the press-scale DOM assertion use measureLabelGroup. The latter checks both
the step and measureLabelLineWidth at scale(1) and scale(0.97).

New browser test: `apps/web/src/kit-label-performance.dom.test.ts`. It mounts the
shipped interactive Peek Poker 4×4 pick layout and Rabakz four-option layout.
For each it prints a single measureLabelGroup pass and observeLabelGroup install
time from performance.now(), asserting both under 4 ms at CDP 4× CPU throttle,
or under 1 ms if CDP throttling is unavailable. No timing result is claimed here;
Chromium must be run by the integrator. Face-down and four named-label target
counts are checked explicitly.

The R-02 UAT now pauses from the leader phone's Menu while answering, captures
leader and guest Paused veils over the private strip at 667×375, then resumes.
This is separate from the host test clock used to retain question phases.

### Close-out and Requests

Round 20 is uncommitted for integrator review. Run the new kit performance DOM
test and `rabakz-phone.dom.test.ts` (twice), then the existing PeekPoker and
phone-coverage DOM regressions. Run R-02 UAT to capture and inspect the new Paused
stills. No round-20 browser timings, screenshots or visual acceptance are claimed.
No merge, commit, verify, UAT, perf, install, dependency or node_modules changes.


### Validation (round 20)

Every permitted check launched with the preceding uptime one-minute load under 8:
- Requested Vitest selection with PLAYWRIGHT_BROWSERS_PATH=/nonexistent and
  VITEST_MAX_WORKERS=2: load 3.17, exit 0; repeated after changing the regression
  to invoke actual Part dependencies at 3.96, exit 0. Both: 55 files passed,
  715 tests passed, one skipped. The selected paths contain no browser tests.
- TypeScript build: load 4.17, exit 2 (test-only VNode generic); fixed the helper.
  Final launch at 4.29, exit 0.
- Requested ESLint: load 3.81, exit 1 (test-only void union and optional call);
  corrected those types/call. Final launch at 4.27, exit 0.
- Design lint: load 4.09, exit 0; 469 files scanned.
- No source-neighbour .js, .js.map or new .d.ts emissions found. Only the tracked
  Rabakz and Peek Poker host stylesheet declarations remain. git diff --check passed.

Logs: `/private/tmp/r02-r20-{tests,tests-final,tsc,tsc-final,eslint,eslint-final,design}.log`.
Browser tests were deliberately not launched, as instructed. Integrator must run
`apps/web/src/kit-label-performance.dom.test.ts`,
`apps/web/src/rabakz-phone.dom.test.ts` twice, and the existing
`apps/web/src/PeekPoker.dom.test.ts` and `apps/web/src/phone-coverage.dom.test.ts`.

## Round 20 integrator close-out

Round 20 committed at 191ca6be. The four browser files (kit-label-performance.dom, rabakz-phone.dom, PeekPoker.dom, phone-coverage.dom) passed 11/11 at load about 2. Label pass at 4x CPU: Peek Poker 0 ms, Rabakz 1.4 ms (review 16 re-run: 0 and 2.1 ms; one sample per game, not a median: make it a median of 5 if it ever joins `pnpm verify`). `uat-r20-p2` looked at by the integrator and Claude reviewer 16 (run on the round-20 working tree; its Commit line records cefd31bf, the HEAD at run time). Controller start-up after round 20: median 179 ms of 2000 ms (`controller-startup-r20.json`, bcb348a3). Review 16 clean.

Follow-up, not done here: the first ResizeObserver notification is skipped unconditionally (`layout-label.ts`); a size change between `observe()` and the first delivery waits for the next trigger. Font, viewport and theme listeners cover the realistic causes. Better: store the install pass's measured size and skip only a notification of that same size.


`uat-r21-p2` (merged tree 8d397090, C-17 waiting copy) looked at by the integrator: new questions drawn, states and layouts as in uat-r20-p2; "You join at the next question" fits at 667 and 844 (57–60).
