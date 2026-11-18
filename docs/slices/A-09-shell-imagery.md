# A-09 — Shell imagery options

Requirements: **REL-002, PLAT-020**. Image-generation-only handoff, 2026-11-18; no option approved.

## Options

Eight original raster sources under `assets/src/images/shell/`: landing A (four friends, centred TV), landing B (three friends, diagonal sofa/TV); Tabao Rush A (two-cook close-up), B (three-cook kitchen); Peek Poker A (memory grid), B (card swap); Rabakz A (2 × 2 cards), B (standing cards and phones).

[Review gallery](../../assets/src/images/shell/options.html), [per-image report](../../assets/src/images/shell/REPORT.md), [exact prompts](../../assets/src/images/shell/prompts.json). The report records native dimensions, suggested near-1.618:1 crops, byte/decode costs and design uncertainties. All sources exceed 1312 px wide; native tool aspect ratios vary slightly. All source PNGs exceed the 1.5 MB total host-shell transfer budget individually and must not ship unchanged.

## Slot-size issue

At 656 px wide, 1.618:1 requires about **405 px height** in both picker and start states. Current measured 257/213 px heights are too short. Integration must reserve the ratio and review expansion transitions, metadata and settings fit. A 2× delivery crop is at least 1312 × 811. Landing art is landscape media within the secondary column of the 1.618:1 split; do not force it into a tall cover crop.

## Close-out

Generated using the built-in image tool and visually inspected. Read AGENTS/CLAUDE and DESIGN §4; inspected cook body/cap source renders and board source template (published board HTML absent). Saved eight unmodified PNGs, prompts and review artefacts. No app wiring, generated dist changes, tracker edits, dependencies or commits. Verify, UAT, perf and Blender were not run, as instructed. This handoff does not close A-09 or claim budget compliance.

## Requests

Integrator: put the real options to Randy, record his choice and image generation in DECISIONS, then derive compressed delivery assets through the existing pipeline. Wire the chosen landing and three tile images, correct picture-slot geometry in both states, and run the integration checks. Review cook-model consistency, generated camera/palette approximations, phone hardware resemblance and TV-distance legibility before acceptance.

## Round 2 — D-176 integration (2026-11-18)

Requirements: REL-002, PLAT-020, PERF-022; DESIGN §4.3 2A. Selected sources are
landing B, Tabao Rush B, Peek Poker A, Rabakz B. No source PNG or assets/dist was edited.

### Delivery and files

`python3 tools/assets/shell_images.py` uses the already-declared Pillow 11.1.0
(libwebp 1.5.0, verified present), RGB, LANCZOS, WebP quality 82 / method 6.
Its explicit crop rectangles reproduce the round-one REPORT's centred integer cuts.
No dependency was installed. Outputs are imported from `apps/web/src/images/` and
Vite emits hashed delivery files. There was no prior standalone shell image step;
the existing atlas pipeline remains unchanged.

| Delivery file | Pixels | Bytes |
|---|---:|---:|
| `apps/web/src/images/landing.webp` | 678 × 419 | 66,760 |
| `apps/web/src/images/tabao-rush.webp` | 656 × 405 | 32,744 |
| `apps/web/src/images/peek-poker.webp` | 656 × 405 | 26,248 |
| `apps/web/src/images/rabakz.webp` | 656 × 405 | 22,700 |
| **Total** | | **148,452 / 500,000** |

`landing-route.tsx` was a placeholder, with no split or existing displayed image size.
It now implements the specified title, line, single **Host a game** link, game list and
1.618:1 split. `style.css` derives secondary width at 1080p as
(1920 − 2×55 − 34) / 2.618 = 678.38 px; landscape media is about 419.27 px high.
The 678×419 delivery is rounded to whole pixels. On phones ≤600 px wide the
illustration is hidden and the copy uses the phone tokens: the action stays readable
and the decorative scene does not consume the narrow viewport. Alt text describes
friends using real phones together; each game image also has descriptive alt text.

`picker-route.tsx`, `host-route.tsx`, `shell-images.ts` and `style.css` wire the tiles.
Host entry starts decoding all three; the picker mounts only after every decode
resolves. Failures show a retry action; a failed attempt can be retried. Decoded Image
objects are retained. No tile/image is replaced when entering the start screen;
the existing shared tile expansion and content snapshot animation remain in place.

### Layout effect and limitations

Focused picker media is capped at 656 px wide with an explicit 1.618:1 slot.
Unfocused tiles put smaller landscape media beside their existing metadata, rather
than consuming the short tile's height above the text. Start-screen media occupies
the secondary-width left column (about 657×406 after padding), with metadata on the
right. For R-04, metadata and settings now stack in that right column; the player
strip remains below both columns. This avoids stacking a 405 px picture, metadata
and players in one short column. **No type size was reduced.**

Browser geometry and visual fit remain unverified: Chromium cannot launch in this
sandbox. No precise rendered overflow amount is claimed. The smallest proposed
layout adjustment (moving metadata alongside the art, above settings) is implemented
for review; the DOM test and UAT slice assert containment at both TV sizes. Phone
host screens retain the existing uniformly scaled TV stage; landing alone adapts
its copy to the phone viewport.

### PERF-022 production measurement

`pnpm run build` passed. Built-file totals below use exact output bytes and Node gzip
per file, matching `tools/check_budgets.mjs`. Static route sets are index.html, shared
entry JS/CSS, plus landing WebP for `/`, or the three predecoded tile WebPs for
`/host`. No game module is required just to enter the lobby. HTML response duplication,
HTTP headers, signalling traffic and cache policy are excluded; these are **static
fetch accounting**, not an observed browser network trace (Chromium is blocked).

| Set | Raw bytes | Gzip bytes |
|---|---:|---:|
| `/` cold static files | 402,421 | 171,496 |
| `/host` cold static files | 417,353 | 186,469 |
| `/` → `/host`, shared files counted once | 484,113 | 253,272 |
| Full deployment, including every lazy game/content chunk | 1,339,696 | **465,045 / 1,500,000** |

The conservative deployment bound leaves **1,034,955 gzip bytes** in PERF-022.
The existing shared-entry controller budget also passes: **253,272 / 300,000**.
Uncompressed WebPs total 148,452 bytes; compressing already-compressed WebP is not
needed for the image target. Build invokes the existing asset validation internally;
no separate assets, verify, UAT, perf or Blender command was run.

### Tests, evidence and handoff

Added `apps/web/src/shell-imagery.dom.test.ts`: real Preact components, held decode
promises to test gating, all three game highlights and start states, shared tile
identity, nonempty alt text and decoded image presence, 1.618 ±0.02 image geometry,
and viewport/content containment at 1920×1080 and 1280×720 (eight-player fixture,
including a four-row settings mirror). Existing real-host R-04 DOM coverage remains.

Added `uat/slices/A-09-shell-imagery.mjs`: landing and each highlighted game in picker
and start states at 1920×1080, 1280×720 and 390×844 (21 stills), with real phone
selection and actual settings mirrors. UAT was not run as instructed. Exact command:

```sh
pnpm uat -- A-09-shell-imagery --phones 1 --out round2
```

Close-out: implementation and compressed delivery are ready for Claude review;
A-09 is not visually closed. No commit, tracker edit, dependency or lockfile change.
Evidence/check results: `uat/evidence/A-09-shell-imagery/REPORT.md` and
`vitest-round2.log`. Requests: run the above UAT outside this sandbox, inspect all
stills and run the Chromium DOM tests. Verify the actual cold production network
request set if a browser trace is required in addition to the conservative build bound.

## Round 3 — content-sized setup rows (2026-11-18)

Requirements: PLAT-020, PLAT-006/025. The supplied 720p measurement shows the
mirror exceeding its slot by 55.4 screen pixels (83.1 design pixels). The nested
copy grid allowed its settings track to shrink; the outer first row also had a
zero minimum. Both now use content minima: explicit max-content metadata/settings
tracks and a max-content minimum for the outer row. The player strip follows that
row in normal grid flow.

Keep the picture beside the metadata/settings column, at the existing approximately
657 × 406 design pixels and 1.618:1 ratio. No picture reduction or further wrapping
is needed for the reported fixture by sizing arithmetic: recover 87 design pixels
vertically with token spacing (vertical card padding 34→13, outer row gap 21→13,
copy gap 21→8, metadata gaps 8→5, player-content gaps 13→8 and removal of its empty
trailing setup slot). Horizontal padding, column split, type and the three-line
feedback reserve remain intact. At 1920×1080 these are design pixels; at 1280×720
the same stage scales by 2/3, recovering 58 screen pixels against the reported
55.4-pixel deficit. These are arithmetic expectations, not browser measurements.

The real-host browser test retains the supplied slot containment assertion and now
also checks the player strip inside the card and below both mirror and picture,
content overflow, picture ratio and the 656-design-pixel picture-width floor at
720p, 1080p and 4K.

### Close-out

All permitted checks started below one-minute load 8 (2.23–2.69). TypeScript,
ESLint and design lint passed. Vitest: **468 passed; 11 browser tests not run**:
each stopped at the missing Chromium executable under `/nonexistent`, before any
browser launched. Runner exit status is 1. Log:
`uat/evidence/A-09-shell-imagery/round3/vitest.log`. No verify, UAT, perf, install
or commit was run. No visual pass is claimed.

### Requests

Integrator: run the Chromium assertions and inspect 1080p/720p start screens,
including the densest long-summary/refusal fixture and eight-player strip. Confirm
the content sizing and compact token spacing visually before accepting round 3.


## Round 4 — player-strip safe margin (2026-11-18)

Requirements: PLAT-020, PLAT-006/025. Setup-only outer rows now use
`max-content max-content` with start alignment, rather than letting `1fr`
redistribute recovered spacing. Top padding and the picture/copy-to-player gap
both change 13→5; bottom padding is 21. Nested metadata/settings content minima,
three-line feedback reserve, picture dimensions/1.618 ratio and typography stay
intact. Plain start cards keep their existing rules.

### Design-pixel budget at 1920×1080

Header/stage geometry stays unchanged: stage top 264.2, bottom 1025, available
height **760.8**. A checkable allocation for the reported eight-player fixture is:

| Allocation | Design px |
|---|---:|
| Top padding | 5 |
| Picture or metadata/settings row (maximum budget) | 540.6 |
| Gap before Who’s in | 5 |
| Who’s in row: heading 34 + gap 8 + players 139.2 | 181.2 |
| Bottom padding | 21 |
| Unused space below the content | 8 |
| **Total available** | **760.8** |

The 540.6 row budget follows from round 3’s fitting card: 760.8 − 26 padding
− 13 gap − 181.2 player block. The new content-sized row can be shorter; its
unused budget also stays below the strip. List bottom is at most
264.2 + 5 + 540.6 + 5 + 181.2 = **996 design px**, or **664 screen px** at
1280×720, inside the 665 boundary. At 1080p it is inside 1025. The media row
keeps its approximately 657×406 picture. These are layout budgets and arithmetic
bounds based on the integrator’s measurements, not new browser measurements.

### Close-out

Only the four permitted checks ran, each starting at one-minute load below 8
(2.34, 2.44, 2.46, 2.43). TypeScript, ESLint and design lint passed. Vitest:
468 passed; **11 browser tests not run**, because Chromium was absent at
`PLAYWRIGHT_BROWSERS_PATH=/nonexistent`; runner exit 1. Log:
`uat/evidence/A-09-shell-imagery/round4/vitest.log`. No verify, UAT, perf,
install or commit.

### Requests

Integrator: run Chromium containment assertions for both setup suites and shell
imagery at 1080p/720p, including long refusal and all game fixtures. Confirm the
rendered content row fits the allocation and inspect the tighter spacing.

## Round 5 — restore tall-board spacing and neutral loading (2026-11-18)

Requirements: PLAT-020, PLAT-006/025. Setup cards use 13 design px top padding
and a 21 design px picture/copy-row-to-player-heading gap at viewport heights
of at least 990 px. Shorter viewports retain round 4's 5/5 values, including
1280×720 and 390×844; the phone's existing stage scaling is unchanged.
At 1280×720 the row gap is 5 design px = 3⅓ screen px. At 1920×1080 it is
21 design px = 21 screen px. The actual picture-to-heading distance may be
larger when the adjacent settings column is taller than the picture.

Using round 4's conservative 540.6 design-px first-row bound, the player-list
bottom at 1080p is 264.2 + 13 + 540.6 + 21 + 181.2 = 1020, inside the
1025 safe boundary. At 720p the retained bound is 996 × 2/3 = 664 screen px,
inside 665. This budgets the player list; the full content overflow assertion,
including bottom padding, still requires Chromium and the actual first-row height.
At height 990 the scale is at most 990/1080, giving a safe inset of at least
60 design px and a list boundary of 1020. Wider spacing is not enabled below it.
These are computed bounds, not fresh rendered measurements.

Loading settings now displays plain status text. Problems and validated refusals
retain the warning icon. The shell DOM fixture checks all three states; the
real-host geometry test adds a >=13 design-px row-to-heading gap assertion at
1080p. Existing fit assertions remain. UAT capture waits for the loading status
to disappear before every start-screen still.

### Close-out

Only the four authorised checks ran, each starting below load 8 (4.32, 4.63,
4.39, 4.22 respectively). TypeScript, ESLint and design lint passed. Vitest:
468 passed; 11 Chromium tests not run because the executable under /nonexistent
is absent (runner exit 1). Log: `uat/evidence/A-09-shell-imagery/round5/vitest.log`.
No verify, UAT, perf, install, node_modules linking or commit.

### Requests

Integrator: run the Chromium suites and UAT; inspect the 1080p spacing, 720p and
390 portrait fit, and loaded settings in each start-screen still. No rendered
fit or visual pass is claimed for this round.

## Round 6 — review corrections (2026-11-18)

Requirements: REL-002/003, PLAT-020, PLAT-006/025, PERF-020/022.

1. The integrator's merge retained “Put this on your TV” below the games line.
   Its secondary colour and type now use tokens, with no inline styling. The DOM
   suite asserts its presence, destination, placement below the games and viewport
   containment at 1920×1080, 1280×720 and 390×844.
2. Unfocused outgoing snapshots use the same row, picture and copy rules as live
   unfocused tiles. Removed the superseded empty-slot dashed outline rules.
3. Picture readiness is retained synchronously after successful decode. Warm picker
   mounts initialise from that flag and skip the loading effect; a DOM assertion
   checks tiles immediately after a second mount, before effects.
4. D-200: the setup-card safe margin test now uses `55 * innerWidth / 1920`
   for every edge. Setup cards with settings use 13 design-px top padding,
   13 bottom padding and 13 row gap at every viewport size. Removed the 990 px
   media query. For historical accuracy, the integrator's round-5 code actually
   had 5 top / 21 bottom padding, with a 5 gap below 990 px and 13 gap at or
   above 990 px; the preceding round-5 prose described superseded values.
5. Host and landing imports now sit behind dynamic route imports in `main.tsx`.
   Thus landing.webp and shell-images.ts are reached through those routes rather
   than eager shared-entry imports. HostLobby still preloads/decodes the three
   game pictures in the lobby and retains them for the session; this change adds
   no play-time import. No production build or new byte measurement was run.
6. The landing action uses inline-flex and vertical centring; its phone minimum
   height is the 55 px token.
7. All expanded copy is top-aligned, including Tabao Rush without settings.
8. Unfocused pictures use 38.2% width, including outgoing snapshots.
9. Missing pictures leave an empty slot rather than throwing during render. A
   non-browser test asserts every installed gameMetas id has a shellPictures entry.
10. Removed superseded setup grid/metadata/slot placements and display:contents;
    the current setup grid no longer needs either !important declaration.
11. The round-2 performance numbers above came from that round's production build,
    using exact output bytes and per-file Node gzip, not a browser network trace.
    Review 6 independently recomputed 253,272 B controller gzip and 465,045 B
    deployment/host gzip from the existing 13:53 round-2 dist. That dist predates
    rounds 3–5 and main's help/count changes; none is a round-6 closing figure.

### Close-out

Only the permitted Vitest, ESLint and design-lint commands were run, each after
uptime showed one-minute load below 8 (3.61, 3.99 and 5.45 respectively).
Vitest: 493 passed; 13 browser cases could not launch Chromium at the deliberately
nonexistent browser path and are **not run**, not visual failures or passes.
The installed-game picture coverage test passed. ESLint passed with zero warnings;
design lint passed (451 files). TypeScript was not run: the permitted build command
inherits composite/declaration emission into .tsbuild/dist/types, conflicting with
this round's explicit prohibition on emitting tsc. No verify, UAT, perf, install,
node_modules linking, merge or commit was performed. Existing uat-r5 evidence was
left untouched.

### Requests

Integrator: run typechecking in the authorised environment, execute the DOM
assertions and inspect landing containment at all three sizes. Capture and inspect
1920 px Left/Right and Select/Back frame strips; no new browser or visual evidence
is claimed here. Rebuild and measure controller/host closures before recording
closing performance figures. Record the safe-margin decision and tracker changes
in integrator-owned documents as appropriate.

## Round 7 — review corrections (2026-11-18)

Requirements: REL-002, PLAT-020, PLAT-006/025.

1. Must-fix 1: every expanded start card and expanded snapshot now uses content-sized
   rows, 13 px top/bottom padding, 34 px sides and a 13 px row gap. All games use
   the 5 px metadata gap and hide the empty setup slot below the player strip.
   The Rabakz feedback reserve is retained. D-200 records
   the shared grid and board-coordinate safe margin. The real-host DOM test now
   covers all three games at 1920×1080, 1280×720 and 3840×2160, checking that
   “Who's in” is 13 ± 1 design px below the taller of picture and copy column,
   and that the picture top inset is 13 ± 1 design px.
2. Must-fix 2: the UAT script explicitly disables reduced motion and adds six-frame,
   100 ms strips at 1920 for picker Right/Left and Select/Back on Tabao Rush and
   Rabakz. Capture starts before each input. These strips have not been run or
   visually reviewed in this sandbox.
3. Must-fix 3: the phone help link uses inline-flex, vertical centring and a 55 px
   minimum height. The existing help-link DOM loop asserts that phone height.
4. Should-fix 7: round 6 now cites D-200, replacing “Option 1”.

### Close-out

All permitted checks started with one-minute load below 8: Vitest 7.52;
TypeScript 7.51, then 6.98 for the corrected rerun; ESLint 6.38; design lint 7.58.
Vitest passed 493 tests; 13 browser tests could not launch Chromium at
`PLAYWRIGHT_BROWSERS_PATH=/nonexistent` and are **not run**. TypeScript passed
(`pnpm exec tsc -b tsconfig.build.json`) after replacing an unchecked viewport-array
access in the new UAT helper with the explicit 1920×1080 size. No compiler output
was left beside sources. ESLint passed with zero warnings; design lint passed
(451 files). No verify, UAT, perf, install or node_modules linking was run.
No evidence files were changed; no commit was made.

### Requests

Integrator: run the browser assertions and UAT, inspect all six motion strips and
phone help-link containment, and assign D-200 in the integrator-owned decision log.
Verification and performance measurements remain with the integrator.

## Round 8 — idle feedback row height (2026-11-18)

Requirements: PLAT-020, PLAT-006/025.

Cause: `.setup-mirror-problem` remains a grid item when its status paragraph is
empty. Its three-line minimum is 34 × 1.3 × 3 = 132.6 design px, plus the mirror's
8 px gap. Rabakz's four settings rows therefore acquire an invisible trailing
track that makes the copy column taller than the picture. The round-7 test used
the stretched copy-column bottom, so it accepted this extra height as real copy.

Fix: CSS hides only the feedback row with an empty paragraph, removing its track
and gap. Nonempty loading, error and refusal feedback retains the three-line
reserve. The existing split, picture dimensions, content-sized start rows,
13 px padding/gap, typography and snapshot rules remain unchanged. No new values
or tokens were introduced.

The real-host browser assertion now waits for loaded, empty feedback and measures
the actual “Who's in” heading against the picture bottom. At 1920×1080,
1280×720 (and the existing 4K case), each game's gap must equal 13 ± 1 design px,
plus any genuine visible-copy excess. Picture-height fixtures also compare gaps
across games within 1 px. Visible metadata/settings bounds determine copy excess;
the stretched column and empty feedback cannot justify extra space. At 720p,
13 design px becomes 8⅔ screen px through the existing stage scale.

### Close-out

Permitted checks started below one-minute load 8: Vitest 4.19, TypeScript 5.36,
ESLint 5.49 (rerun after removing an unnecessary optional chain: 6.77), design
lint 5.84. Vitest: 493 passed; 13 browser cases stopped at the deliberately missing
Chromium executable under `/nonexistent` (exit 1), so no rendered pass is claimed.
TypeScript passed; no .js/.js.map/.d.ts outputs were found beside sources.
ESLint passed on rerun; design lint passed (451 files). No verify, UAT, perf, install, node_modules linking
or commit was performed. Existing evidence directories were left untouched.

### Requests

Integrator: run the browser assertions and inspect all three loaded start cards at
1080p/720p; also review nonempty feedback with its retained reserve.

## Round 9 — stable setup-feedback band (2026-11-18)

Requirements: PLAT-020, PLAT-006/025, NFR-A11Y.

Round 8 removed the jump on entry: collapsing the empty reserve stopped Rabakz's
player strip dropping when its four settings rows arrived. It also added a jump
on refusal: nonempty feedback restored the reserve and moved the strip down,
then clearing it moved the strip up. Round 9 removes that refusal jump by taking
TV feedback out of the grid flow, keeping round 8's empty collapse.

Chosen implementation: an absolute footer band across the start card's content
width, inset 34 board px horizontally. Its bottom is 13 px above the card's
13 px bottom padding. The mirror, metadata and player-strip tracks no longer
include feedback height. The review's measured strip bottom (~877) and content
bottom (~1012) leave ~135 board px: a two-line 34 px sentence uses 88.4 px and the
13 px footer gap, leaving separation from the tiles. The same board geometry
scales to 1280×720. This supports choosing the fixed band over FLIP movement;
rendered fit is still awaiting the integrator's browser run, not claimed proven.
D-199/D-200 and OQ-049 remain integrator-owned records; no tracker was edited.

The empty `<p role="status">` stays mounted without display/visibility hiding.
Entrances fade with `duration.base` and `easing.out`; clearing retains only an
aria-hidden decorative copy for `exitDuration('base')` (186 ms versus 233 ms),
then removes it. Reduced motion changes the text immediately without a fade.
Only opacity animates. The decorative copy has no status role.

The DOM case now records `.game-detail` top before, during and after clearing
the longest supported refusal at 1920×1080 and 1280×720, asserting ≤1 px change.
With eight seats it also checks notice containment, no overlap with any player
tile, placement below settings and the still-mounted empty status. The fixture's
clear operation now removes its injected persistent schema problem too, so it
actually exercises an empty feedback state.

UAT recipe: Rabakz selects Singapore Life and refuses Hard through the real
phone controls. It adds `rabakz-refusal-start-1920`, and six-frame, 100 ms strips
`rabakz-refusal-appear-1920` and `rabakz-refusal-clear-1920`. Accepting Mixed clears
the refusal for the second strip. No UAT or new screenshot was run here.

Picker sliver (review 8 should-fix 3): inspected the supplied `r8-right-f2.jpg`.
It is the intended wipe, retained unchanged. `freezePickerContent` keeps the
outgoing focused column layout and its large picture; the incoming side tile
already has its small picture and horizontal copy layout. `pickerContentMasks`
uses one tile-local vertical boundary, moving at ease-out across the maximum of
the two content widths. At 100 ms the old picture's rightmost strip remains to
the right of that boundary while the new small picture is revealed on the left.
The old snapshot is bottom-left anchored and clipped by the moving tile, which
also explains the incoming Peek Poker picture's visible bottom edge. This is
not a detached image or a mask gap; existing partition/timing unit tests pass.
No claim is made about whether it predates A-09.

### Close-out

Permitted checks began with one-minute load below 8: Vitest 3.69, TypeScript
3.79 (corrected rerun 3.83), ESLint 3.91 (source-only rerun 3.76), design lint
3.56. Vitest: 493 passed; 13 browser cases failed at the deliberately missing
Chromium executable, so rendered assertions remain unrun. TypeScript passed
after correcting the effect's return path. ESLint passed; CSS was ignored by
ESLint's configuration and is covered by design lint (451 files passed).
No verify, UAT, perf, install, node_modules linking or commit was performed.
Existing evidence directories were left untouched.

### Requests

Integrator: run the browser cases to confirm the fixed footer band fits the
longest sentence with eight seats at both TV sizes; inspect the new refusal
still and both strips, including reduced-motion behaviour. If the band fails
those measurements, use the requested transform-only FLIP fallback rather than
restoring a reserve. Review the documented picker wipe at 100 ms. Record the
D-199/D-200/OQ-049 decision and round-7/8/9 refusal comparison in owned documents.

## Round 10 — landing and legal footer phone flow (2026-11-18)

REL-002, REL-003, DATA-004, NFR-DES; follows D-189. The landing now uses
its unscaled phone layout at every width ≤1000 px, matching the legal footer.
It is a scrolling flex column with non-shrinking content, token typography,
no picture, and 55 px minimum targets for Host a game, TV help, Privacy and
Credits. The footer follows TV help in normal flow with the existing 34 px
landing gap; its additional phone margin is removed on this landing. The
unused placeholder `.landing-page` rules were removed. No markup change was
needed, and LegalFooter and every legal.dom assertion remain unchanged.

At 390×844 the copy and footer use the phone column. At 844×390 the same
column scrolls vertically instead of shrinking the board and its links.
1000×720 remains unscaled; 1001×720 and larger retain the existing TV board,
picture and bottom-left footer placement, clear of TV help.

The shell DOM test covers all six legal-test viewport sizes, adding checks
for the unscaled layout, hidden picture, horizontal containment, exact 34 px
footer gap, and minimum height and centre-point hit testing for every landing
link on phones. Help is scrolled into view before checking viewport containment.
The UAT recipe adds `landing-844`, plus `landing-footer-390` and
`landing-footer-844` after scrolling to the footer. Its phone landing check
allows vertical scrolling while retaining horizontal and internal containment
checks; TV and picker containment checks remain intact.

### Close-out

Each permitted check started below one-minute load 8: Vitest 2.85,
TypeScript 2.65, ESLint 2.68, design lint 3.17. Vitest: 514 passed,
14 failed before browser assertions: 13 missing Chromium executable failures
and legal.dom's sandbox `listen EPERM` on 127.0.0.1:6732. TypeScript passed
and left no .js, .js.map or .d.ts beside sources. ESLint passed with CSS
ignored by its configuration; design lint passed across 459 files.
No verify, UAT, perf, install, node_modules linking or commit was performed.
No new rendered evidence is claimed.

### Requests

Integrator: run the legal and shell imagery browser tests, then capture and
inspect the landing stills, including 844×390 and both phone footer views.
Confirm the 34 px gap, 55 px targets and centre-point hits at 390×844,
844×390 and 1000×720, and unchanged footer/help separation above 1000 px.

## Round 11 — review 9 corrections (2026-11-18)

Requirements: PLAT-004, PLAT-006/025, PLAT-020, REL-002, DATA-004.

- Applied the integrator's TV player-tile decision: the name occupies one line with
  ellipsis at the tile width, with the full name in title only; the full name text also remains in the DOM.
  A held seat adds “Seat held” on a separate second line. The name/status block
  therefore has at most two lines. The eight-seat DOM fixture now uses
  “MOHAMMAD ALI”, “Wan Ting Lim” and “WWWWWWWWWWWW”, including a disconnected
  seat. At 1920 and 1280 the existing refusal-band overlap and containment checks
  now also check each tile's card containment and its two-line text-height bound.
- Frozen outgoing picture and copy columns clip their own contents. The tile-local
  wipe mask and timings remain in place. The picture sliver and detached copy seen
  in historical strips 13/20 were introduced by A-09. Review 11 of uat-r15
  found the fragments reduced but still present, outgoing notices dropping 22 px
  onto the border, and the missing 844×390 footer still (findings 1–3).
- MirrorProblem retains the old non-empty text in an aria-hidden exit copy during
  replacement as well as clearing, overlapping the incoming text. The live region
  stays mounted; reduced motion swaps instantly. DOM coverage checks replacement,
  exit cleanup, live-region identity and the instant reduced-motion path.
- Filled uat-r14's image descriptions and acceptance table from review 9 and added
  “Looked at by: Claude reviewer 9”. These are the reviewer's historical findings,
  not a claim that round 11 has been rendered. uat-r8 now explicitly says r14
  supersedes it.
- The UAT script compares scroll position before/after footer scrolling and skips
  duplicate captures. It waits for four Rabakz settings rows before a loaded still.
  A second phone joins, changes its name to “WWWWWWWWWWWW” in the lobby, and
  disconnects on the Rabakz start screen for held-seat stills at 1920 and 1280.
- Updated historical A-09 references to D-199, D-200 and OQ-049, the integrator's
  assigned identifiers. Shared decision/question records were not edited.

### Close-out

Only the permitted checks were run. One-minute load from uptime at each launch:

| Check | Load | Result |
|---|---:|---|
| Vitest apps/web/src; PLAYWRIGHT_BROWSERS_PATH=/nonexistent, VITEST_MAX_WORKERS=2 | 2.80 | 48 files / 514 tests passed; 14 files / 14 tests failed on browser launch |
| TypeScript build check | 2.97 | Passed |
| ESLint apps/web/src and UAT script | 3.42 | One unnecessary optional-chain error in the new DOM test |
| Design lint | 4.24 | Passed, 459 files |
| ESLint after correction | 4.14 | Passed |
| TypeScript after correction | 4.04 | Passed |

No generated .js, .js.map or .d.ts files were left beside sources. No verify, UAT,
performance run, install, dependency linking, merge or commit was performed.

### Requests

Integrator: run the browser tests and fresh UAT, inspect the long-name held-seat
stills and outgoing wipes, and confirm the replacement notice crossfade. OQ-049's
round-7/8/band refusal comparison still requires fresh historical renders as
review 9 describes; the existing evidence cannot supply those missing stills.

## Round 12 — review 11 corrections (2026-11-18)

Requirements: PLAT-004, PLAT-006/025, PLAT-020, REL-002, DATA-004.

- Anchored outgoing feedback to the band's bottom with left/right/bottom only.
  DOM assertions record the live status rectangle before clearing and replacing,
  compare all outgoing rectangle dimensions within 1 px, and check card containment
  at 1920 and 1280. The eight-seat fixture asserts exactly one held label.
- Footer captures now compare `.landing-screen.scrollTop`, preserving the
  844×390 footer still while skipping the duplicate at 390. Removed the duplicate
  Rabakz 1920 start capture after settings-loaded; kept 1280 and 390.
- The integrator accepts the picker wipe's one frame around 100 ms with an outgoing
  picture sliver and possible cut-off word (widened D-199(g)); frozen columns retain
  their clip. No shared decision record was edited.
- Corrected round 11's title-only name metadata and review 11 findings from r15.
  Recorded r14 supersession and copied review 11's r15 report verbatim, including
  its historical Fail rows. r14/06 still supplies the landscape footer evidence
  until the next run, which supersedes r15.

### Close-out

| Check | 1-minute load at launch | Result |
|---|---:|---|
| Vitest (requested environment) | 6.73 | 48 files / 514 tests passed; 14 files / tests failed: 13 browser-launch failures, legal.dom local-server EPERM |
| TypeScript | 7.64 | Passed |
| ESLint | 7.83 | Failed: forbidden non-null assertion |
| ESLint after missing-card guard | 8.33 | Passed; launched above the requested limit in error |
| Design lint | 6.21 | Passed, 459 files |
| TypeScript after guard | 5.95 | Passed |
| ESLint repeated under load limit | 5.57 | Passed |

No generated .js, .js.map or .d.ts files were left beside sources.
Browser geometry and new footer images remain for the integrator's browser tests and UAT; no fresh visual pass
is claimed. No verify, UAT, perf, install, linking, merge or commit was performed.

### Requests

Integrator: run browser tests and fresh UAT, review the outgoing notice on clear
and replacement and the 844×390 footer, and supersede r15 with the new evidence.
OQ-049's historical refusal comparison remains outstanding.

uat-r16 (a3b33efc), reviewed by Claude reviewer 12: exit copy holds at the band (strip 73), 844×390 footer captured (05), no duplicate stills, wipe as accepted (strip 19); strip 55 does not reach the loaded rows within 501 ms. Review 12 clean; closed at merge (D-199, D-200, OQ-049).
