# T-07 TV renderer — T-07b round 3 (review 2)

Scope: TR-001, TR-004, TR-030, TR-031, TR-061, TR-062, PERF-001.
Main `ef115c86` brings T-18 served dishes, C-25 and R-16. This round addresses
review 2 for TR-061 with shared marker geometry and diagonal pair coverage.
All requirements remain in progress. Round14-uat was shot before main’s merge;
the integrator reruns UAT to round15-uat on the merged tree and reruns perf.
No new visual acceptance is claimed.

## Changes

North-wall cues use the screen margin above the counter, with their maximum pulse
box clamped to the screen safe area (5 px inset), rather than the level box.
The dev caption moves to y=55. The band includes every north-wall station capable
of a cue (`hasCue(type, 1)`), even if its cue is initially hidden. Marker x remains
exactly cook x; y is max(normal, band + 5 + 21). A fallback caps the centre at
feet minus 62 px, above every real packed body head socket; in insufficient top
margin the disc may touch the bar border. The fallback depends on level rows, not
viewport size: it is used at ≥ 8 rows;
a hypothetical 7-row level would bring a north cue near the dev caption. Current
game rules cap kitchens at 6 rows, so this is a note for future levels only.
Neither fixture level uses the fallback at 1920 × 1080 or 1280 × 720 (both use the same scaled 1920 × 1080 scene).
The y=1.2 margin-path push is at most 5 px. Seat depths start at 30000, ordered by cook y.

The reachability sweep checks both fixture levels on a 0.01-tile grid, square cook
collision footprint, cue scales 1 and 1.05, head/hands anchors from the real manifest,
and continuity. Marker horizontal separation remains identical to cook separation.
At MIN_SEPARATION (0.36 tile cook separation, not marker gap), the vertical
marker centres are 33.6552 px apart with the 3.756 px (rounded 3.76) north-band
push, versus 37.4112 px (37.41) unpushed. Both levels now sweep 0–90° at 0.01°
steps with the real 120 / 103.92 px projection and marker placement.
Worst disc overlap is 8.3448 px at 90° in band and 4.5888 px at 90° outside.
Worst nearer-disc cover of the far numeral glyph box is 1.91687 px at 65.28°
in band and 0 px at every angle outside. Cover measures radial penetration
to the nearest point of the centred glyph box. Its half-width is conservatively
11 px (SFNS bold 34 digits are 16–22 px wide); its half-height is 25/2 px.
Both numerals clear the other disc for the vertical pair only. SFNS bold 34 px
measured with Pillow/FreeType has a 24 px glyph height for seats 1–8; the
integrator DOM test checks the real canvas envelope (≤ 25 px). Numerals now centre
using actual canvas glyph ascent/descent. Markers draw in cook y order, nearer on top.
The disc has a 3 px console-ink edge at radius 19.5 (outer radius 21), including at
normal height. Contrast is tested
against all seat cap colours, the reviewed red cap samples and the floor (at least 3:1).

Rejection obstacles now include every station's counter-item spot, in addition to
cards, HUD, cooks and every visible cue's maximum pulse box. Text stays fixed for
its rejection lifetime. The string scan follows functions reachable from update/render,
recognises only named publication guards, and catches String(), padStart, templates,
and typed string addition (including +=), toFixed, join, toString and toLocaleString.
The allocation scan shares that reachability walk, including station-cue.ts. Planted
failures exercise each added string rule and a reachable object literal.
Known limit: the allocation scan does not flag allocating method calls
(`.slice`, `Array.from`, or `.map` without an arrow); today all such calls are
at module load or behind a guard.
The allocation scan exempts the guarded redraw functions `layers`, `rebuild`,
`fitHud`, `fittedText`, `rejectionText` and `displayName`; these may allocate.
The card redraw guard fires about every 40 ticks per card (about 0.67 s at 60 Hz),
as well as on identity/urgency changes. HUD redraws follow changed values; station
and rejection redraws follow their publication guards. Numeral glyph measurement
allocates only when seat/colour changes. The production perf run judges these costs.
Dataset strings remain behind the explicit DEV guard.
The dead HUD-width hook and doubled A-11 comment are removed.

The chop → done fixture preserves level identity for a live transition. The UAT slice
asserts the gold span from each lossless strip frame: normal about 80 → 84 → 80,
reduced steady. Existing strips 36 and 61 keep their numbering. New evidence at the
end includes the existing north-facing y=1.2 stills and a 2.0 → 1.2 approach
strip. At the north counter a held item shows only when the cook faces s, se or sw;
otherwise it is behind the body by design (depth −0.1). East/west shots remain;
new south-facing shots at y=1.2 at 1920 and 1280 show the item. The disc lower edge
is at worst feet −90.5; hands are −31.4 (e/w) and −18.5 (s), so the item anchor
is at least 59 px below the disc. The UAT coverage writes this clarification to REPORT.
Lossless PNG checks assert the sampled cap equals the seat colour before checking
≥ 3:1 edge contrast. The seat-5 fixture recolours seat 1, so its disc reads “1”.
No visual acceptance is claimed before the integrator inspects it.

The A-05 placeholder retains root-relative anchors, tile/120 scale and 44/42/34 plaque
stack with eight cells. Departures remain: track 90×14 versus 89×13, tick path 1 px
off reference, and an empty-state track. Gold is the approved Peek Poker accent
placeholder. Recipe steps retain single spaces until A-11.
The mock measurement remains a unit wrapping check only. A new text.dom.test.ts
transpiles the production text module into Chromium with the actual recipe labels and measures
all step placeholders with the same body font stack/load as the renderer, asserting
no omissions, at most two lines and width ≤ 123 px at 21 px. The default Node Vitest
environment has no real canvas/font engine; the integrator ran this DOM test
successfully in verify3 (256 files).
The renderer currently uses the platform fallback from that stack (no bundled DM
Sans face is installed by this fixture). Perf-r7 is diagnostic only (dev p95 18.4 ms).

## Validation and evidence

All checks used PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false, ran one at a time
without load gating, and completed within ten minutes. Vitest used two workers.

| Check | Round 3 result |
|---|---|
| Full Tabao Rush suite, briefed exclusions, two workers | Passed: 391 tests, 31 files, 325.84 s. Includes both-level diagonal sweeps and geometry regression assertions. |
| Build typecheck including UAT slice | Passed: `tsc -b tsconfig.build.json`. |
| Emitted-file cleanup | Passed: `tsc -b tsconfig.build.json --clean` after typecheck. |
| ESLint | Passed, zero warnings, including the UAT slice. |
| Design lint | Passed, 520 files scanned. |

DOM tests were not run by this implementation round. The integrator’s verify3 passed
text.dom.test.ts (256 files). Historical evidence stays in its original folders.
The round 3 full-suite pass includes the final marker geometry and diagonal sweep assertions.

## Close-out and Requests

The integrator reruns UAT to round15-uat on the merged tree and reruns perf;
inspect every still and strip, fill REPORT
and obtain independent review. Check the south-facing held item, east/west depth
ordering and lossless cap-colour/contrast assertions. The integrator’s verify3 already passed text.dom.test.ts (256 files).

No brief conflict with the PRD, game rules or DESIGN was found in this follow-up.
Existing departures remain in progress: recipe words until A-11, cue placeholder
until A-05 sprite integration, cap-only heads until T-09 and unassessed production PERF-001.
No UAT, perf, verify, install, Blender, commit, merge or push was run by this round.
Trackers, contracts, lockfile and design documents remain with the integrator.
