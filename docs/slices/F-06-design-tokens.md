# Slice F-06 — Design tokens and motion helpers

Issue F-06 in `docs/backlog/F-foundation.md`, wave 2. Branch `issue/F-06-design-tokens`.
Owns `packages/ui/` only.

## Goal

One package holds every design value chosen at the gate (`docs/DESIGN.md` §4) as typed
TypeScript, as a generated stylesheet, and as small motion functions, so that no other track
ever writes a colour, a spacing value, a duration or an easing by hand.

## Requirement IDs

| ID | Covered | Which part |
|---|---|---|
| NN-5 | partly | The design rules exist as tokens and helpers and are tested (scale, splits, one treatment per surface, motion values, no overshoot, reduced motion). Screens that use them are other issues. |
| NFR-DES | partly | The values the §6 checklist asks for are in one place; a contrast test measures every declared pair. Each screen still has to pass the checklist at its own review. |

## Acceptance

1. Typed tokens exist for: the spacing scale; TV and phone type sizes and three font stacks with
   real fallbacks and no remote font; corner radii; the console theme and the three game themes
   as complete sets; 8 player colours with seat numbers; two team themes; four shape buttons
   (cross red bottom, circle blue right, square amber left, triangle green top, no letters);
   button-size floors with a helper that scales them with the phone; 1.618 : 1 helpers and the
   55 px TV safe margin; motion tokens.
2. The named colour tokens `seat-1` to `seat-8`, `team-red`, `team-blue`, `shape-cross`,
   `shape-circle`, `shape-square`, `shape-triangle` exist, and the list of valid names is
   exported with a checker (asked for by F-04).
3. `tokens.css` is generated from the typed tokens, exposes them as custom properties with a
   block per `data-theme`, and handles `prefers-reduced-motion` once. A test fails when the
   committed file differs from what the tokens produce.
4. Motion helpers `enter`, `exit`, `staggerDelay`, `pressScale`, `expand`/`collapse`, `arc`,
   `pulse`, `countUpAt`, `crossfade`, `cardTurn` return deterministic output when reduced is explicit, are usable with the Web Animations API,
   and each returns a zero-duration state change under reduced motion.
5. No easing curve leaves 0 to 1 (control points and sampled output); no helper scales past its
   end value except the one pulse, which returns to exactly 1.
6. A contrast test measures every declared text and background pair and fails under 4.5 : 1
   (body) or 3 : 1 (large text and symbols), except decided pairs listed by name with their
   measured ratio.
7. `specimen.html` is generated, self-contained, and shows every theme's surfaces, the type
   scale, player and shape colours, the button sizes at true 844 × 390, and every motion helper
   live with a replay button.
8. `pnpm verify` passes.

## UAT

No pairing or server is involved: the specimen is one static file. Headless Chromium, 1920 ×
1080 and 844 × 390, each of the four themes; a larger and a smaller phone; reduced motion; and
frame strips of every motion held at nine points. Script: `uat/evidence/F-06-design-tokens/
capture.sh` then `strips.py`. The written report is now `uat/evidence/F-06-design-tokens/REPORT.md`; it records visual
inspection, acceptance coverage, and the limits of these captures.

## Out of scope

- Any real screen, component or controller (C, K, R, P, T tracks).
- Font files (see Requests 3). Rubber-band past bounds and icon crossfade + blur (no caller yet).
- A UI library. None is used or needed here.

---

## How to use the tokens (C, K, R, P, T and X tracks)

**Depend on it.** `"@kaki/ui": "workspace:*"`, plus the project reference
(`docs/slices/F-01-workspace.md`, "Adding a package"). Import from `@kaki/ui`; load
`@kaki/ui/tokens.css` once per page.

**Pick a theme.** Put `data-theme="console|rabakz|peek-poker|tabao-rush"` on the screen's root.
With none, the console applies. A theme can be nested (a Rabakz tile inside the console).

**Surfaces: use the three recipes, never write a background.**

| Class | Gives |
|---|---|
| `.ka-surface` | The screen: base colour plus its ONE treatment, ink, body font |
| `.ka-panel` | A panel: soft gradient, 3 px edge, 13 px corners, panel ink |
| `.ka-chip` | A pill: chip fill, white mono text |

Text on the screen uses `--ka-ink` / `--ka-secondary`; text on a panel uses `--ka-panel-ink` /
`--ka-panel-secondary`. They differ in the dark themes. The main action is `--ka-accent` with
`--ka-accent-ink`. Tabao Rush: the kitchen is rendered art; the theme is for HUD panels and the
phone.

**Spacing, corners, type.** `var(--ka-space-21)` or `space[21]`; `var(--ka-radius-corner)`;
`var(--ka-type-34)` on the TV (34 is the smallest text read in play), `var(--ka-phone-type-21)`
on the phone; `var(--ka-font-display|body|mono)`.

**Golden ratio.** `grid-template-columns: var(--ka-golden-columns)` (or `-reversed`);
`goldenSplit(total, gap)` for pixels; `safeArea()` for the TV's 1810 × 970 inside the 55 px
margin; `var(--ka-golden-aspect)` for media panels.

**Players, teams, shapes.** A layout or a game names a colour, never a value:
`COLOUR_TOKEN_NAMES`, `isColourTokenName(x)`, `COLOUR_TOKENS[name]`, `colourTokenVar(name)` →
`var(--ka-seat-3)`. `PLAYER_COLOURS` carries the seat number: always draw it. `SHAPE_BUTTONS`
gives each shape its colour, its place in the diamond and its SVG path (24 × 24 box, stroke
`SHAPE_STROKE`, white, round caps, no fill, no letter). Text and symbols on these colours are
`ON_COLOUR`.

**Button sizes (K track).** `BUTTON_FLOOR`: face 110, in play 89 wide × 68 tall, anything
tappable 55. In CSS use `var(--ka-button-face)`, `--ka-button-in-play-width`,
`--ka-button-in-play-height`, `--ka-button-minimum`: they are the floor, or larger on a larger
phone. The controller is landscape-only: both CSS and TypeScript interpret the long
viewport side as width, even for a portrait viewport. CSS uses svh with a vh fallback;
pass the corresponding visible viewport size to TypeScript. In script: `buttonSizes(viewport)`, `inPlaySize(viewport)`. `*-floor` variants are the
fixed values.

**Motion.** CSS: `transition: transform var(--ka-duration-fast) var(--ka-ease-out)`; exits use
`--ka-duration-*-exit`. `.ka-pressable` gives the 0.97 press. Durations become 0 under reduced
motion without any code. Script:

```ts
const m = enter({ kind: 'popover', origin: { x: 21, y: 0 } });
Object.assign(el.style, m.style);
el.animate(m.keyframes, m.options);
```

| Need | Use |
|---|---|
| Menu, order card, result panel appears / goes | `enter` / `exit` with `origin` at the trigger |
| List rows | `enter({ kind: 'row', index })` or `staggerDelay(i)` |
| Game tile opens into its start screen | `expand(tileRect, screenRect, { mode: 'transform' })`, `collapse` |
| Throw, deal, serve | `arc(from, to)`; in a canvas renderer `arcPoint(from, to, t)` |
| Served, locked in, won | `pulse()` (and `pulseRing()`) |
| Score | `countUpAt(from, to, elapsedMs)` each frame |
| Lobby → game → results | `crossfade()`: new screen on top, old one stays until it finishes |
| Card reveal | `cardTurn()`; in a canvas renderer `cardTurnAt(t)` |
| Stick thumb | `knobStretch(travel)` applied directly while held; never tweened |

Environment reads are limited to `reducedMotion()` and, when `reduced` is omitted,
`enter`, `exit`, `staggerDelay`, `press`, `expand`, `collapse`, `arc`, `pulse`, `pulseRing`,
`countUpDuration`, `crossfade` and `cardTurn`. Explicit reduced input makes these deterministic.
`arcPoint`, `cardTurnAt`, `countUpAt`, `pressScale`, `knobStretch` and `arcHeight` never read
the environment. `cardTurnAt` and `countUpAt` require `{ reduced: boolean }`; resolve the
device or room preference before rendering. Reuse outputs in render:

```ts
arcPoint(from, to, progress, height, pointOut);
cardTurnAt(progress, reducedOption, cardOut);
countUpAt(fromScore, toScore, elapsedMs, reducedOption); // returns a number
```

`press(true)` is instant; release eases out at `fast`. `expand` and `collapse` default to
transform: content scales unevenly while it opens. Clip remains available, but repaints the
whole element each frame: measure on the TV before using at full screen.

Pure game logic (`src/rules`, `src/sim`) must not
import motion helpers: they are for drawing.

**Do not** write a hex colour, a px spacing value off the scale, a `ms` duration or a
`cubic-bezier()` outside `packages/ui`. If a value is missing, ask for it (Requests), do not
inline it.

**Rebuilding.** After changing any token: `node packages/ui/scripts/build.mjs`. `pnpm verify`
fails if `tokens.css` or `specimen.html` is stale.

---

## Close-out

### Requirement IDs → code, tests, evidence

| ID | Code | Tests | Evidence |
|---|---|---|---|
| NN-5 (golden ratio) | `packages/ui/src/scale.ts`, `type.ts`, `buttons.ts` | `tokens.test.ts`: "has exactly the φ scale…", "splits 1.618 : 1…", "gives the TV a 55 px safe margin", "holds face 110, in play 89 wide by 68 tall…", "grows with the phone…" | `01-tv-console-1-surfaces.png`, `01-tv-console-2-players-phone.png`, `05-phone-*.png` |
| NN-5 (no flat backgrounds) | `packages/ui/src/themes.ts`, `css.ts` (`.ka-surface`, `.ka-panel`) | `tokens.test.ts`: "gives every surface exactly one treatment", "holds the decided values"; `generated.test.ts`: "has a block per theme…" | `0N-tv-<theme>-1-surfaces.png` for all four themes |
| NN-5 (motion) | `packages/ui/src/motion-tokens.ts`, `motion.ts` | `motion.test.ts`: "holds the decided tempo…", "keeps every easing curve inside 0 to 1…", "never scales past the end value…", "returns a zero-duration state change from every helper…", "exits back to the trigger in 0.8…", "stops exactly on the number…", "swaps the face exactly while the card is edge-on", and the rest | `strip-*.png`, `06-tv-console-3-motion-reduced-held-at-half.png` |
| NFR-DES (contrast) | `packages/ui/src/contrast.ts` | `contrast.test.ts`: "meets 4.5 : 1 for body text and 3 : 1…" | Requests 1; every screenshot |
| Colour token names (F-04) | `packages/ui/src/colour.ts` | `tokens.test.ts`: "exports the list of colour token names a layout may use" | — |
| Generated files | `packages/ui/src/css.ts`, `specimen.ts`, `scripts/build.mjs`, `tokens.css`, `specimen.html` | `generated.test.ts` (all) | `verify.txt` |

Evidence folder: `uat/evidence/F-06-design-tokens/` (27 images, `verify.txt`, the two scripts).

### Dependencies requested

None from npm. The build script runs on Node 24 alone (type stripping and
`module.registerHooks`). Pillow is used only by the evidence script `strips.py`, not by the
repository.

### Requests

1. **Contrast: decided pairs that measure under the minimum (Randy; §4 is locked).** Colours
   were not changed. They are pinned by name and ratio in `contrast.test.ts` (`KNOWN_FAILURES`),
   so the list cannot grow unnoticed; remove an entry when its fix lands.

   | Pair | Measured | Needs | Smallest fix |
   |---|---|---|---|
   | Console and Tabao Rush: secondary `#7A6A58` on marble `#EFEAE2` | 4.35 | 4.5 | Darken secondary on the background to `#776756` (4.54). Panels are unaffected (5.21 on white). |
   | The same text where it crosses a terrazzo chip: on `#D6CBBB` / `#C7B6A2` / `#B9C6B6` | 3.26 / 2.64 / 2.93 | 4.5 | The chips are 8 to 12 px dots, so no letter sits wholly on one. To clear 3 : 1 over every chip: `#706151` (4.99 on marble). To clear 4.5 over every chip would need `#53483C`, which stops reading as secondary. Suggest `#706151` and accepting the chips, or keeping secondary text on panels. |
   | Peek Poker: panel secondary `#5E7A6E` on the panel's darker end `#F6F1E7` | 4.16 | 4.5 | `#597469` (4.52 there, 5.09 on white). |
   | White seat number on seat 3 `#F2B21B` | 1.88 | 3 | Dark numeral `#2B2118` on this seat (8.37). Changing the yellow instead would need `#BE8C15`, which is no longer yellow. |
   | White seat number on seat 6 `#F07C2A` | 2.76 | 3 | Dark numeral (5.72), or orange `#E57628` (3.02). |
   | White seat number on seat 7 `#22A6A6` | 2.97 | 3 | Dark numeral (5.30), or teal `#22A5A5` (3.00). |

   A per-seat numeral colour (dark on seats 3, 4, 6, 7; white on the rest) would fix all three
   without touching a player colour. It is a design choice, so it is not made here. Seat 3's
   white numeral is visibly weak in `01-phone-console-controller.png`.

2. **`docs/DESIGN.md` §4.2, exact text change (integrator, with Randy; D-047, D-048, D-050).**
   Replace

   > - Answer and face-button colours are fixed everywhere: A red, B blue, X amber `#B87D0C`,
   >   Y green `#2E9A5B`, each with its letter and its own shape.

   with

   > - Answer and face-button colours are fixed everywhere: cross red `#D9483B`, circle blue
   >   `#2F7FD6`, square amber `#B87D0C`, triangle green `#2E9A5B`, each with its own shape and
   >   no letter (D-047, D-048, D-050).

   The header of `docs/DESIGN.md` also still says "Section 5 (the design gate) is **not yet
   complete**… no game or shell UI code may be written", which §5 now contradicts.

3. **Font files (integrator: an asset, and a line in `DECISIONS.md`).** Add woff2 files for DM
   Serif Display 400, DM Sans 400/500/700 and JetBrains Mono 500/700 (all SIL OFL) to
   `packages/ui/fonts/`, with their licence texts. I downloaded nothing. The plan for
   `fonts.css` is in the header of `packages/ui/src/type.ts`. Until then every page shows
   fallback fonts, as every screenshot here does (the serif is Iowan Old Style, the sans is the
   system font; JetBrains Mono happens to be installed on this Mac).

4. **`tools/lint_design.mjs` should additionally enforce, outside `packages/ui/`** (root tooling,
   not my lane):
   - `motion-duration`: no literal `ms` or `s` time in `transition*`, `animation*`, and no
     numeric `duration:` / `delay:` in an `animate()` options object; only `var(--ka-duration-*)`,
     `var(--ka-stagger)` or values from `@kaki/ui`.
   - `motion-easing`: no `cubic-bezier(`, `steps(`, `ease`, `ease-in`, `ease-out`,
     `ease-in-out` or `linear(` literal; only `var(--ka-ease-*)` or `easing.*`.
   - `font-family`: no literal family name; only `var(--ka-font-*)` or `fontStack.*`.
   - `font-size`: px sizes only from 13, 21, 34, 55, 89, 144.
   - `token-definition`: no `--ka-*` custom property defined outside `packages/ui/`.
   - `press-scale`: a `scale(` literal other than `scale(1)` is suspect (0.97, 0.95 come from
     tokens).
   - Named colours (`white`, `red`, …), which F-01 left undetected, now that `ON_COLOUR` exists.
   - `no-remote-font`: no `fonts.googleapis.com`, `fonts.gstatic.com` or other font URL.
   - Note for the rule set: `68px` (the in-play height floor, D-053) is a size, not spacing, and
     is not flagged today; keep it that way if sizes are ever linted.
   - A `pnpm verify` step is not needed for stale generated files: `generated.test.ts` covers it.

5. **Trackers (integrator).** `docs/TRACEABILITY.md` rows NN-5 and NFR-DES; `docs/STATUS.md`;
   `CHANGELOG.md`; F-06 status in `docs/backlog/F-foundation.md`; `CLAUDE.md` command table
   could list `node packages/ui/scripts/build.mjs`.

6. **K track.** At 667 × 375 the 1 : 1.618 stick-to-button split cannot hold the floors: the
   four face buttons need 288 px and an in-play button 89 px more. In the specimen the stick
   side gives way (`05-phone-small-667x375-controller.png`). The kit needs a rule for small
   phones; the tokens only guarantee the floors.

7. **A UI library is not needed for this package.** Nothing here should force the choice.

### Unsure

- **Phone type sizes.** Board 4 uses 13 to 15 px for small labels and 17, 19, 25, 28 and 44 px
  for badge numerals fitted by eye. I took the phone scale as 13, 21, 34, 55 and read the odd
  sizes as the nearest step. If 15 px labels were intended, that is a token to add.
- **Two extra easing curves and two extra durations.** Board 5 uses `cubic-bezier(.6,0,1,1)`
  and `cubic-bezier(0,0,.4,1)` for split moves, and 610 ms / 987 ms for the throw and the
  count-up (377 × 1.618 and × 2.618). §4.5 names only `out`, `inOut`, and fast/base/slow. I
  kept the board's values as `easing.in`, `derivedDuration.arc` and
  `.countUp`; review round 1 removes unused `rise`. The arc is a true parabola in one animation
  instead of the board's two nested elements.
- **The pulse goes to 1.05** and back to 1, as on board 5. It is the one place a scale passes
  its end value; the test allows exactly that and nothing after it.
- **Crossfade.** The old screen stays fully opaque under the new one instead of fading out, so
  the two never add up to less than a full picture. This matches board 5's sample.
- **Treatment contrast.** I treat each colour a treatment paints as a background the text must
  clear. That is strict for 8 px terrazzo chips (see Request 1).
- **Chip-coloured outlines on dark themes** (the stick area on Rabakz and Peek Poker) are faint.
  The board draws them in the chip colour, so I kept it; visible in
  `02-phone-rabakz-controller.png` and `03-phone-peek-poker-controller.png`.
- **Main has moved** (D-052, D-053) since this branch was cut; I did not rebase. The 89 × 68
  in-play floor from D-053 is in.


## Review round 1

- M1: `arcPoint(..., height, out)` and `cardTurnAt(progress, { reduced }, out)` write into and
  return caller-owned outputs. `countUpAt` returns a primitive number. The latter two require
  reduced explicitly, so no per-frame helper reads matchMedia. The 10,000-call regression
  test proves returned identity and zero matchMedia calls; it is not a heap profile.
- M2: press-down duration is zero, including CSS active/data-pressed states with no transition.
  Release retains fast (144 ms) ease-out. Helper and generated-CSS tests cover both paths.
- SHOULD 1–3: transform is the expand/collapse default, both mode tradeoffs are documented,
  environment-reading helpers are named above, board-5 pulse/ring/card values and sampling
  precision are named tokens, unused rise is removed, and ease-in is restricted in its comment.
- SHOULD 4–6: landscape-only sizing uses long/short sides in TS and CSS; feature-gated svh
  overrides vh fallback. CSS is marked as a package side effect. Seat contrast is recomputed
  from all eight actual colours; the exact known-failures list and all shape/seat tokens remain.
- SHOULD 7: inspected all 27 existing images (including four strips) and wrote REPORT.md.
  A Playwright launch using locally cached Chromium failed inside the sandbox at
  MachPortRendezvous bootstrap_check_in: Permission denied (1100). The existing reduced image
  remains a specimen-flag capture; no real media-emulation screenshot is claimed.
- No decided colour, size or duration changed. Generated CSS/specimen were rebuilt from source.
  `node packages/ui/scripts/build.mjs --check` and `pnpm verify` pass (see evidence verify.txt).
- Changes remain uncommitted in the working tree; no rebase, install, dependencies or fonts.


## After D-056

Applied the owner’s decision from the newer main checkout’s DESIGN §4.2 and DECISIONS:
all seat numerals use `SEAT_NUMERAL` (`#2B2118`); marble secondary is `#706151`
(including the Tabao Rush phone); Peek Poker panel secondary is `#597469`.
Each theme declares `stickOutline`: console `#6B4426`, Tabao Rush `#B5371F`,
Rabakz `#E9B7C8`, Peek Poker `#BFE3D2`. The specimen uses these outlines and
seat numeral colour in every badge, including the phone header. `TEAM_TEXT_WEIGHT`
is 700 and used in the team blocks; small team text must be bold and at least 21 px
(the 19 px bold WCAG large-text threshold rounds up to the next chosen scale step).
Phone type is 13 / 21 / 34 / 55 / 89 px. The crossfade helper documents opacity-only
icon swaps. No helper or generated CSS applies a filter effect.

Re-measured every declared pair. The exact KNOWN_FAILURES list shrinks from 12 to 11:

| Remaining pair | Ratio | Minimum |
|---|---:|---:|
| Console secondary on terrazzo `#D6CBBB` | 3.73 | 4.5 |
| Console secondary on terrazzo `#C7B6A2` | 3.03 | 4.5 |
| Console secondary on terrazzo `#B9C6B6` | 3.36 | 4.5 |
| Tabao Rush secondary on terrazzo `#D6CBBB` | 3.73 | 4.5 |
| Tabao Rush secondary on terrazzo `#C7B6A2` | 3.03 | 4.5 |
| Tabao Rush secondary on terrazzo `#B9C6B6` | 3.36 | 4.5 |
| Seat 3 fill against marble | 1.57 | 3 |
| Seat 4 fill against marble | 2.53 | 3 |
| Seat 6 fill against marble | 2.30 | 3 |
| Seat 7 fill against marble | 2.48 | 3 |
| Seat 8 fill against marble | 2.95 | 3 |

The badge-fill check compares all eight fills with the shared marble base `#EFEAE2`;
it measures the fill independently of the retained white ring. Seats 4, 6 and 8 also
fail this check, beyond the expected seats 3 and 7. No further decided colour was changed.
All dark seat numerals pass 3, all stick outlines pass 3 over their backgrounds and
treatments, and white bold team text passes 3. Marble secondary clears 4.5 on the base;
Peek Poker panel secondary clears 4.5 at both gradient ends. Historical Requests and
Unsure entries above are superseded by D-056 on these points.

Generated CSS and specimen were rebuilt, never hand-edited. Existing screenshots predate
D-056 and will be retaken by the integrator; no new visual acceptance is claimed here.
Build, build --check and pnpm verify pass; the verify output is in the evidence folder.
Changes are left in the working tree without a commit, dependency change or install.
