# P-04 — Peek Poker TV table

PP-003, PP-004, PP-008, PP-021, PP-030 and PP-031. Branch `issue/P-04-table`.

## What changed

`games/peek-poker/host/` contains the public-only view model, atlas preloader,
DOM/canvas screen, seeded demo fixtures, dev driver and view-model tests.
`games/peek-poker/dev/index.html` opens the demo. Package exports and local
TypeScript projects include the host entry; no dependency or lockfile changed.
`src/rules/views.ts` adds the already-public player name to each public seat,
so drawing names requires no access to simulation State or a private roster.

The 4B composition has seat rows at left, a 4 × 4 grid centrally, and round,
shared cards and countdown at right. K1 tokens supply the weave and panel paper.
Spacing uses 5/8/13/21/34/55/89. The 663 px grid content width is 1.618 times
the seat-column width. Source sprites remain 176 × 231 around 150 × 205 cards;
manifest source size, trim and centre anchor restore packed frame placement.

`preloadCards(manifestUrl, detail)` decodes every atlas in `peek-poker-cards`,
checks all 58 frame IDs and prepares face masks before returning a `CardDeck`.
Only the selected full/half detail loads. Nothing in the screen fetches or decodes.
The opaque neutral-paper alpha mask excludes the baked shadow. The 377 ms turn
uses all five baked angular frames, with the actual face masked onto the neutral
paper in the first half; the face changes at the edge. Turns sample the shared
monotonic ease-in-out curve. Reveals wipe faces and their seat markers with masks.
Two-second card/row swaps use the shared arc helper, opposite paths and no
overshoot; unmoving cells stay still. Reduced motion applies destinations
immediately and responds to preference changes while mounted. Lock-ins pulse once.
Up to eight picks on a cell occupy two rows of four numbered colour markers.
Reveal hands retain the rules' best-to-worst order.

Tests cover visible/hidden phases, permanent shared faces, lock-in seat states,
private-pick mutation leaving public snapshots unchanged, rejection of pre-reveal
pick markers even in a malformed public snapshot, eight overlapping reveal marks,
and both directions of card and row swaps.

## Demo and integration

From the worktree root, start the existing web dev server on port 5930. For a
standalone demo the existing Vite executable can serve this workspace without
adding packages:

```sh
apps/web/node_modules/.bin/vite games/peek-poker --host 127.0.0.1 --port 5930
```

Standalone URL: `http://127.0.0.1:5930/dev/index.html?players=8`.
Through the web app's Vite server, use
`http://127.0.0.1:5930/@fs/Users/randy/projects/personal/web-apps/kaki-arcade-wt/P-04/games/peek-poker/dev/index.html?players=8`.
Use `players=1`, `4` or `8`; `state=memorise|swap|picking|locked|reveal` selects
an initial snapshot. Press N to advance. `reduced=1` forces immediate state changes.
Dev-only `window.__ppState(phase, elapsedMs?)` seeks deterministic frame captures.
The fixture really swaps its seeded round-three cards before scoring the reveal.
`manifest=<URL>` overrides the generated `assets/dist/manifest.json` location.

Mount `PeekPokerScreen(element, deck)` after awaiting `preloadCards`; call its
`update({ view: peekPoker.publicView(state), width, height })` method with public
snapshots and call `destroy()` when leaving. The production host entry imports
neither the dev fixture nor State. Screen mounting differs from Rabakz's Preact
component: this package has no installed Preact/UI dependency links, and the brief
forbids adding dependencies or linking node_modules. It uses DOM/canvas and the
existing shared UI source directly. The file/module separation follows Rabakz.
The integrator owns connecting it to the host session route.

Choices closest to 4B where the contract is silent: display `Round N` because the
public snapshot supplies no match length; place ranked hand descriptions below
the timer; use a two-by-four marker group rather than overlapping discs. No new
art or palette choices were introduced. Font stacks use the shared fallbacks;
this checkout has no bundled `packages/ui/fonts.css`.

## Integrator UAT and performance

```sh
pnpm uat -- P-04-table
pnpm perf -- peek-poker-table --phones 8 --slice P-04-table
```

`uat/slices/P-04-table.mjs` captures all five phases at 1920 × 1080 with
1, 4 and 8 seats, composite strips of the flip/swap/reveal, and a system
reduced-motion run. `uat/perf/peek-poker-table.mjs` retains the mounted table
through repeated eight-seat fixture transitions, including complete two-second
swaps. As with Rabakz, this is a host-only diagnostic: no phones, input/feedback
budget or marked 180-second gameplay budget is claimed. D-100 requires the
integrator's quiet-machine run before closure.

Inspect every still and strip: rank/suit readability at 3 m; source shadows and
anchors; no face ink at the turn's edge; shared cards remaining face up; fixed
stationary cards during swaps; clear opposite arcs; the reveal mask and all eight
readable markers on cell 5; seat names/status at the 34 px floor; ranked hand text
inside the safe margin; immediate reduced-motion destinations. Check atlas requests
finish before the first table paints and that no network request occurs on N.
Check frame cost and decoded memory on the laptop and real TV.

## Close-out and Requests

Implementation is uncommitted as requested. No shared tracker, contract document,
lockfile or dependency changed. No UAT, perf, asset build, Blender or `pnpm verify`
was run. This worktree has no `assets/dist`: the integrator must supply the A-08
packed output before opening the demo or running visual/perf checks. Visual
acceptance and D-100 closure remain pending; no screenshots are claimed here.

The allowed check logs are in `uat/evidence/P-04-table/`. Typecheck, ESLint and
design lint pass. The scoped Vitest run has 497 passing tests and one existing
browser test blocked before execution: `apps/web/src/Overlap.dom.test.ts`,
Chromium `bootstrap_check_in … MachPortRendezvousServer: Permission denied (1100)`.
The P-04 tests pass. Run the same scoped command outside the sandbox to complete
that browser check. One-minute load was checked below 8 before each test/typecheck
invocation; the memcheck script was never run.

## Round 2

PP-003/004/008/021/030/031 review fixes:

- Swaps use the shared perpendicular elliptical arc helper with shared in-out easing.
  Reversing endpoints reverses the bow. Token-sized clearance keeps adjacent cards
  and opposite row groups apart; path projection is monotonic and bounded. Moving
  cards paint last. Duration comes from the rules' `SWAP_SECONDS`, not screen literals.
- Reveals reverse the five baked turn frames. `cardTurnAt` gates and scales the
  pre-masked face and its foot-band seat marks through one rounded card-space clip;
  backs and the edge-on frame carry no seat ink. Hands appear after the edge.
  Reduced reveals show faces immediately. Reduced swaps show destination cards,
  panel-edge outlines and “Swapped” until the rules' swap duration expires.
- Board 4B's three-column grid uses 55 px gaps and safe margins. Canvas positions
  come from measured grid/shared DOM boxes. Seat panels use the K1 edge, the timer
  is an 89 px gold badge, and the vertically centred side uses 34 px gaps.
  Public views now carry `totalRounds`; the heading reads “Round N of M”.
- Picking status is phase-specific; waiting seats read “Next round”. Hand names
  are fitted with canvas text measurements and ellipses beside the hand description;
  one point uses “pt”. Hands are diffed, marks live in the card renderer, and equal
  public snapshots return before model allocation or DOM changes. Reveal updates
  retain their entrance clock. Half-detail offscreen canvases stay at half resolution;
  the main backing canvas uses that resolution too.
- Pure render tests sample adjacent horizontal/vertical, diagonal and row swaps,
  bounds, foreground order, turn frames/seat ink and reduced states. Browser coverage
  checks lock-in pulses, reduced lock-ins, equivalent-update DOM stability, retained
  hand nodes and measured twelve-character-name fitting within the safe margin.
  The UAT recipe adds round-four row swaps, reduced swaps, a lock-in pulse strip,
  and exact half-duration edge-on samples. UAT was not run.

Closest-to-4B choices: keep equal flexible side columns around the intrinsic card
size, and fit ranked hands on single lines below the timer, truncating the player
name rather than shrinking required text. Seat marks occupy one 34 px foot band
so they do not cover the central suit pip. The checkout's ART-PIPELINE §6 is
“Where Codex comes in”; it contains no A-08 drawing contract. The explicit reverse
frame order in the round-two request and the checked-in `tools/blender/cards.py`
angle-sample authoring were used. No contract document was changed.

Final allowed checks (one-minute `uptime` load was below 8 before every test
and typecheck invocation):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/peek-poker packages/ui apps/web`
  — 577 passed; two browser tests failed before executing assertions because Chromium
  cannot register its Mach port in this sandbox (`bootstrap_check_in … Permission
  denied (1100)`). These are `Overlap.dom.test.ts` and `PeekPoker.dom.test.ts`.
  All pure P-04 and shared motion tests pass. The DOM assertions still require the
  integrator's run outside the sandbox.
- `pnpm exec tsc -b tsconfig.build.json` — pass, exit 0.
- `pnpm exec eslint games/peek-poker packages/ui apps/web uat` — pass, exit 0.
- `pnpm run lint:design` — pass, 390 files scanned, exit 0.

Logs: `uat/evidence/P-04-table/round-2/{vitest,tsc,eslint,design}.log`.

No commit, merge, UAT, performance run, dependency installation, asset generation,
Blender, memcheck or `pnpm verify` was performed. Visual acceptance remains with
the integrator; no screenshot evidence is claimed.

## Round 3

PP-031: row and card swaps now cap the perpendicular bow by the available grid
clearance on both axes. The cap includes the full 176 × 231 sprite rectangle,
including its 13 px border beyond the card paper: row bows are 42 px each way,
so their outer edges remain within the grid plus its 55 px gap. Card arcs use
the same conservative cap. Shared in-out easing, exact endpoints, monotonic
path projection and moving-card foreground order remain in place.

`Screen.test.ts` samples rows 1 and 4 and far-corner cells 0 and 15 at 1, 4
and 8 players, from progress 0 through 1 in 20 steps. It checks full sprite
bounds on every sample, distinct simultaneous moving positions and exact start
and end positions. The earlier pairwise check now requires distinct positions,
as requested, rather than complete rectangle separation, which cannot fit two
whole rows side by side inside this clearance.

Allowed checks all passed:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/peek-poker packages/ui`
  — 13 files, 177 tests passed, exit 0; no browser failure.
- `pnpm exec tsc -b tsconfig.build.json` — exit 0.
- `pnpm exec eslint games/peek-poker packages/ui uat` — exit 0.
- `pnpm run lint:design` — 390 files scanned, exit 0.

The one-minute load was 3.36 before Vitest and 3.22 before typecheck.
No memcheck, UAT, perf, asset build, install or `pnpm verify` was run.
The existing UAT captures and strips are unchanged; the integrator should run
with `--max-mb 16` and visually review the updated round-four row swap.

Close-out and Requests: changes remain uncommitted. Integrator visual review
is pending; no new browser evidence is claimed for round 3. No dependency,
lockfile, shared tracker or contract document changed.

## Round 4

PP-008 / PP-031, D-155:

- Shared perpendicular arcs now project caller progress linearly, removing the
  second cosine ease. Card swaps retain the prescribed in-out token over 2000 ms.
  A 100-step test bounds peak speed to three times average. **Brief discrepancy:**
  the prescribed `.65,0,.35,1` token projects 7.0797% at 500 ms and 92.9203% at
  1500 ms, so the requested 10% / 90% thresholds cannot also hold. The token is
  retained pending direction; tests explicitly record its actual quarter values.
- Rows depart 400 ms apart, downward first, each moving for 1600 ms. The upward
  row paints last with a centre-based sinusoidal lift to 1.05 and a larger,
  lower-alpha second shadow using shared motion tokens. Row bows reach their
  bounded clearance early and hold it through crossing. Sampled rectangles test
  the 50% overlap ceiling, draw order and exact completion.
- Ranked hands wipe top-to-bottom from edge-on using token easing, with immediate
  reduced-motion display, and include explicit rank numbers. Face overlays share
  the baked frame's 6-sine lift; a 45-degree test checks alignment.
- Seat digits use bold unsquashed text, four per row in one or two foot-band rows.
  Reduced swaps have an external outline and an inset label on a foot band.
  Drawing helpers, turn-frame keys, turn scratch state and fonts are hoisted.
- UAT card and round-four row strips use 0/400/800/1200/1600/2000 ms, cropped to
  the table grid to limit strip size for `--max-mb 16`. Flip/reveal strips include
  exact eased 45-degree samples. Integrator must run and inspect these artifacts.

### Round 4 Close-out and Requests

No UAT, perf, Blender, install, memcheck, full verification or commit was run.
No dependency, lockfile or protected document changed. Visual acceptance remains
with the integrator. Resolve the token/quarter-progress discrepancy above before
claiming every requested acceptance condition is met.

Allowed validation: scoped Vitest passes (13 files, 186 tests); build TypeScript
passes; scoped ESLint passes; design lint passes (390 files). No browser failure
occurred in this scoped run. Load was below 8 before each test/typecheck command.

## Round 5

PP-003/004/008/021/030/031, PERF-001: the supplied performance evidence has
one 350 ms frame at index 394, on the first eight-seat lock-in, and no long
script task. Inspection found that atlas decoding was already awaited and all
58 sprites were restored before mount. The readiness gap was mounted rendering:
the demo signalled ready after only its initial draw; the first lock-in created
eight Web Animations and promoted/rasterised their textured rows for the first
time. Fonts and later-phase canvas glyphs also had no explicit preparation gate.
This makes first-use pulse/layer preparation the leading cause; the trace does
not isolate the exact browser rendering operation, and no new browser/perf run
was authorised here, so elimination of the measured stall still needs the
integrator's headed run.

Changes:

- `screen.ready(initialOptions)` is now the mounted readiness gate. It awaits all
  four font configurations used by CSS/canvas (body regular/bold at 34 px, bold
  timer at 55 px, display regular at 89 px), draws and flushes every restored
  sprite and masked face once on a scratch canvas, and warms text glyphs.
- Preparation paints the actual seat rows for two frames, runs and awaits their
  shared pulse, exercises reveal hands/seat marks and the reduced row-swap band,
  then restores the initial snapshot and transition clocks before resolving.
  The table stays at low nonzero opacity during preparation so rendering is not
  skipped; the host should keep its loading UI up until this promise resolves.
  Rows reserve transform layers from mount with `will-change: transform` (at
  most eight rows), retaining them across rounds to avoid repeated promotion.
- The demo awaits that gate before setting `ppReady`. **Host integration:** after
  awaiting `preloadCards` and mounting `PeekPokerScreen`, await
  `screen.ready({view, width, height})` before signalling round readiness. The
  actual host session wiring remains integrator-owned, as in rounds 1–4.
- `pulse` is passed through unchanged: its keyframes animate only `transform`,
  with an `offset` timing marker. No shadow or colour animation was found; no
  packages/ui change or request is needed.
- Browser-free tests hold both atlas decodes, every font load, font-set readiness
  and mounted warm-up independently; the ready marker remains absent until all
  resolve. They check all 110 sprite/face warm-up draws, CSS font-family coverage,
  regular/bold canvas fonts, demo gate usage, failure withholding readiness, and
  the pulse property allowlist.
- PP-031 samples both directions of `rows/from:0/to:3` at 100 intervals with the
  accepted 3.5 × average peak bound, using the actual varying row arc height.
- UAT now seeks reveal at 280 ms and captures the side column without settling
  away the wipe. It retains the harness-tracked shot and also writes the requested
  exact filename `54-hands-wipe.jpg`. The recipe was not executed here.

### Round 5 commands and results

One-minute load was below 8 before every test/typecheck invocation (initial
3.72/3.28; final 2.31/2.36). No memcheck script was run. Initial typecheck and
ESLint found warm-up fixture typing and callback-style errors; those were fixed.
Final allowed checks:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/peek-poker packages/ui`
  — 14 files, 190 tests passed; no browser failure.
- `pnpm exec tsc -b tsconfig.build.json` — pass, exit 0.
- `pnpm exec eslint games/peek-poker packages/ui uat` — pass, exit 0.
- `pnpm run lint:design` — pass, 392 files scanned, exit 0.

Logs: `uat/evidence/P-04-table/round-5/{vitest,tsc,eslint,design}.log`.

### Round 5 Close-out and Requests

Changes are uncommitted as requested. No protected document, shared tracker,
lockfile or dependency changed. No full verification, UAT, perf, Blender, install,
commit or merge was run. The integrator must await the new screen readiness gate
in the real host and run/review the headed performance scenario and UAT capture;
this round supplies regression coverage and the rendering preparation, not a
claim of newly measured PERF-001 compliance.
