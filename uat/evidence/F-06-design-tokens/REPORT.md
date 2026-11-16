# F-06 design tokens — evidence report

Review round 1, 16 November 2026. All 27 existing PNGs were opened and visually inspected
through labelled contact sheets. They are first-builder captures of the generated specimen,
not new captures of this review's changes. No game, pairing server or real controller is involved.

## D-056 follow-up

All committed screenshots predate D-056 and will be retaken by the integrator. They do
not validate the new dark seat numerals, secondary colours, stick outlines or phone scale.
The observations and acceptance table below describe the historical captures. Current
computed contrast results are listed in the slice note under “After D-056”; generated-file
checks and pnpm verify pass (verify.txt). No new screenshots were taken in this follow-up.

## Captures and observations

For each prefix below there are five separate images; the table names every file by suffix.

| Prefix | Theme | `phone-<theme>-controller.png` | `phone-<theme>-answers.png` | `tv-<theme>-1-surfaces.png` | `tv-<theme>-2-players-phone.png` | `tv-<theme>-3-motion.png` |
|---|---|---|---|---|---|---|
| `01-` | console | Marble controller, four shapes, yellow seat numeral visibly weak | Four filled answers and white shapes | Terrazzo, white panel, kopi text, scale and cards | Seats 1–8, teams, shapes, 844 × 390 inset and golden split | Ten motion sample areas on marble |
| `02-` | rabakz | Plum halftone controller; stick outline faint | Same four answer colours over plum | Plum screen and pale rose panel, type and scales | All player/shape colours over plum | Motion gallery over plum |
| `03-` | peek-poker | Fine green weave controller; dark stick outline faint | Same answers over green | Green screen, pale panel, gold accent and four suit colours | Seats, teams, shapes and phone on green | Motion gallery over green |
| `04-` | tabao-rush | Marble controller with red action and outline | Same answers on marble | Marble and red HUD panel treatment | Seats, teams, shapes and phone on marble | Motion gallery with red outlines |

TV images are 1920 × 1080; ordinary phone captures are 844 × 390. Each table suffix is
combined with its row prefix (for example `03-tv-peek-poker-1-surfaces.png`).

| Other image | What it shows |
|---|---|
| `05-phone-large-932x430-controller.png` | Enlarged controls, outline and four shapes fit the larger landscape phone. |
| `05-phone-small-667x375-controller.png` | Face buttons keep their floors; stick region loses width and its hint wraps. This needs a controller-kit small-phone layout rule. |
| `06-tv-console-3-motion-reduced-held-at-half.png` | Reduced-motion note; final score 1250, full rows, opened Rabakz tile and screen, revealed card. Captured with `rm=1`, not real media emulation. |
| `strip-console-a-press-enter-rows-tile-opens-arc.png` | Nine held points of press, menu, staggered rows, tile opening and parabolic throw on marble. |
| `strip-console-b-pulse-count-up-screen-change-card-turn.png` | Nine held points of pulse, score 300→1250, overlapping screen change and edge-on card face swap. |
| `strip-peek-poker-a-press-enter-rows-tile-opens-arc.png` | Same first five motions on green. |
| `strip-peek-poker-b-pulse-count-up-screen-change-card-turn.png` | Same last four motions on green. |

The four strips are historical: they predate instant press-down and the transform default.
Their tile and press frames must not be used as evidence for the review fixes. `capture.sh`
and `strips.py` describe the original capture process; `frames/` holds its source frames.

## Design checklist and acceptance

| Check | Result and evidence |
|---|---|
| Golden scale, split and safe margin | Token tests pass; TV surface/player images display scales and a 1.618 split. Screenshots alone do not measure every inset. |
| One treatment per surface, all four themes | Visible in every surfaces capture: marble speckles, plum dots or green weave; panels use one soft gradient. Automated recipe tests pass. |
| Type and local fallbacks | Type scale visible in surfaces images; no fonts downloaded. These captures show fallback fonts, not the intended bundled DM families. |
| Player, team and four named shape colours | Player images show all eight numbered seats, both teams and four shapes with no letters. Token-name tests retain seat-1…8 and shape-cross/circle/square/triangle. |
| Button floors and scaling | Phone captures show reference, larger and cramped smaller layouts. TS/CSS tests cover floors, long-side portrait interpretation and svh/vh generation. No real browser-bar or portrait capture was possible this round. |
| Contrast in light/dark themes | Computed tests pass against the unchanged explicit exception list, not universal WCAG compliance. Weak white on seat 3 is visible. Seats 3, 6, 7 and secondary treatment/panel failures remain documented in the slice. |
| Motion timings, no overshoot, reduced state changes | Unit tests cover every helper; strips illustrate original trajectories and end states. Current tests cover instant press-down, eased release and transform default. |
| Render allocation/environment | 10,000 calls reuse point/card outputs and produce primitive scores with zero matchMedia calls. This establishes the API contract, not whole-game GC or timing budgets. |
| Generated files and build | CSS and specimen regenerated with the build script; --check and pnpm verify pass. See verify.txt. CSS sideEffects metadata preserves stylesheet imports. |

## What is not proven

A real `prefers-reduced-motion: reduce` recapture was attempted using installed Playwright and
cached Chromium, with no download. Chromium launch failed in the sandbox:
`bootstrap_check_in ... MachPortRendezvousServer ... Permission denied (1100)`.
The original reduced image is retained. It proves the specimen's forced reduced-state display,
not real OS preference detection. Browser press latency, physical touch feedback, TV repaint
cost, frame budgets, full-round allocation behaviour and final game UAT remain unproven.
Static held frames cannot demonstrate smooth timing or an input-to-paint delay within one frame.
No new pixel-equivalence comparison against the design boards is claimed in this review.
