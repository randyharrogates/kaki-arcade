# Kaki Arcade — Design Rules

Binding for every screen: landing page, big-screen shell, phone controller **and gameplay**
(PRD NN-5). A breach fails review the same way a failing test does.

Sections 1 to 3 are Randy's standing design rules, copied from his global instructions on
2026-11-15. If his global rules change, update this file and log it in `DECISIONS.md`.

Section 5 (the design gate) is **not yet complete**. Until it is, sections 4.x marked
*pending* have no values and no game or shell UI code may be written.

---

## 1. Golden ratio (1 : 1.618)

- **Spacing scale**, in φ steps: **5 · 8 · 13 · 21 · 34 · 55 · 89 px**. Used for all padding, gaps,
  row and field spacing. Large layout gaps may continue the sequence: **144 · 233 · 377 px**
  (Randy, D-050). 0 is allowed, and 1 · 2 · 3 px and full pills on corner radii only. No other
  spacing values.
- **Proportions:** primary : secondary panel splits are **1.618 : 1**. Media panels are 1.618 : 1.
- **Artboards:** 1440 × 890 for design boards.
- **Fixed device sizes** (a phone at 390 × 844, a TV at 1920 × 1080) stay as they are; apply the
  ratio inside them.
- When a design offers options, **include a golden-ratio variant and say which proportions use it.**

## 2. No flat backgrounds

- No plain flat fills on hero sections, cards or empty areas. Give each surface depth with
  **one** subtle treatment, kept low-contrast so text stays readable.
- Menu of treatments: felt, paper or grass texture · fluted glass · thermal, grainy or stippled
  gradients · water ripples · speckled graphite · single-hue landscapes · blueprint or square-dot
  grids · contour lines · halftone · dithered images · pixel mosaics · ASCII/pixel art · cloud sky ·
  lens distortion · blurred photos · iridescent shapes · impressionist paintings.
- Pick the treatment to fit the product's mood, check contrast in light and dark, and **never
  stack several on one surface.**

## 3. Motion

Applies to interface and gameplay alike.

**Do**
- Ease-out for entrances; ease-in-out for moves.
- Dropdowns and menus 150 to 250 ms.
- Stagger list rows by 30 ms; stagger details as they settle.
- Scale to 0.97 on press.
- Popovers start at scale 0.95.
- Stretch moving knobs and thumbs about 12%.
- Move objects along arcs.
- A pulse to confirm success.
- Enter from, and exit back to, the trigger element.
- Exits about 20% shorter than entrances.
- Overlap old and new states (no blank frame).
- Masks for reveals and colour changes.
- Crossfade + blur to swap icons.
- Rubber-band past scroll or drag bounds.
- Expand the **same** object for detail views (shared element); never swap in a disconnected
  replacement.

**Don't**
- Bounce or spring overshoot.
- Tween while a control is held or dragged: track the pointer 1:1.

**Reduced motion:** respect `prefers-reduced-motion`. Drop the motion, keep the state change.

### How this reads in gameplay

| Rule | In the games |
|---|---|
| No tween while held | A cook's position follows the stick directly every simulation step. No acceleration curves, no camera lag on a controlled object. The controller's stick thumb tracks the finger 1:1. |
| No bounce or overshoot | Items placed on counters ease out and stop. Score numbers count up and stop. Nothing wobbles or springs. |
| Arcs | A tossed wok ingredient, a dealt or swapped card, a served dish travelling to the counter all move on arcs. |
| Pulse to confirm | A served order, a locked-in pick and a completed station each pulse once. |
| Enter from the trigger | An order card grows out of the serving window it belongs to; a result panel grows from the scoreboard row. |
| Masks for reveals | Card flips and the Peek Poker reveal use masks, not a cut. |
| Overlap states | Screen changes (lobby → game → results) overlap; there is never a blank frame on the TV. |
| Same object expands | Selecting a game in the picker expands that game's tile into its start screen. |

Character animation (walk cycles, chopping) is authored in Blender and is not UI tweening, but
it obeys the same spirit: feet match ground speed, actions settle without overshoot.

---

## 4. Chosen direction

### 4.1 Art route — **decided**

**Route D: Blender.** 3D models rendered ahead of time to sprites and baked backgrounds
(Randy, 2026-11-15). Process in `ART-PIPELINE.md`. The first comparison board is kept at
`design-gate/00-art-finish-samples.html`.

Standard: must look finished, not primitive; characters move correctly (PRD NN-4).

### 4.2 Visual identity — **decided** (boards 2 and 2B)

**General rule: direction C, Marble table** (Randy, 2026-11-16, D-042). It is the strict
golden-ratio variant. Source of the values: `design-gate/02-visual-identity.html`.

- Console surfaces: white marble `#EFEAE2` with a terrazzo speckle; panels `#FFFFFF` to
  `#F6F1E7` with a 3 px `#D8CDBB` edge; ink `#2B2118`; secondary text `#7A6A58`; kopi brown
  `#6B4426`; accent red `#B5371F`.
- Lettering: DM Serif Display for headings, DM Sans for everything else, JetBrains Mono for
  codes and numbers.
- Type sizes on screen: 21, 34, 55, 89 and 144 px at true size. Corners 13 px.
- Player colours 1 to 8: `#D9483B` `#2F7FD6` `#F2B21B` `#39A85B` `#8E5BD0` `#F07C2A` `#22A6A6`
  `#D95C9A`, always with the seat number. Team themes: red `#D9483B`, blue `#2F7FD6`.
- Answer and face-button colours are fixed everywhere: cross red `#D9483B`, circle blue
  `#2F7FD6`, square amber `#B87D0C`, triangle green `#2E9A5B`, each with its own shape and no
  letter (D-047, D-048, D-050).
- **Each game has its own theme variant**: it keeps the lettering, corners, spacing and panel
  style above and changes only colours and surface pattern. Chosen on board 2B (Randy,
  2026-11-16, D-043); exact values are the `.tR1`, `.tK1` and `.tT1` blocks in
  `tools/boards/board2b_template.html`:
  - **Rabakz — R1 Bandung:** plum `#4A1F3D` with halftone dots `#5C2A4D`; text `#FFF1F4`;
    secondary `#E9B7C8`; accent rose `#FF9DB8`; chips `#7A3563`; panels white to `#FBEFF2`.
  - **Peek Poker — K1 Green baize:** felt `#1D5741` with a fine diagonal weave; text `#F6EFE2`;
    secondary `#BFE3D2`; accent gold `#E0A63A`; card backs red `#B5371F`; four suit colours.
  - **Tabao Rush — T1 Order chit:** the kitchen keeps its rendered look; HUD panels are white
    paper to `#FBF7F0` with red-brown print `#8E2A18` and a 3 px dashed `#B5371F` edge; the
    phone controller uses the console marble with red accents.
- Trivia pictures are real photographs under a free licence; Codex-generated images only where
  no suitable photograph can be found (D-042).

### 4.3 Big-screen layouts — **decided** (board 3)

Chosen by Randy on 2026-11-16 (D-046). Source: `design-gate/03-big-screen-layouts.html`; the
layout functions named below are in `tools/boards/board3_template.html`. Every screen is
1920 × 1080 with a 55 px safe margin and never scrolls.

- **Landing** (`landing`): title, one line, one button, the three games listed. Split 1.618 : 1.
- **Lobby: 1B** (`lobbyB`): join panel on top with the QR code at 440 px and the room code at
  233 px; eight seats in a row along the bottom.
- **Game picker: 2A** (`pickA`): the highlighted game 1.618 times the width of the others.
- **Team setup** (`teams`): red left, blue right, unassigned in the middle.
- **Rabakz question: 3A** (`rzA`): picture beside the question at 1 : 1.618, answers in a
  2 × 2 block matching the phone. **No timer is drawn** (RZ-004 as changed); the "Answered"
  row also shows who is locked out.
- **Rabakz reveal** (`rzReveal`), **results** (`results`): as shown.
- **Peek Poker table: 4B** (`ppB`): players down the left with Picking or Picked, the grid in
  the centre, round, shared cards and timer on the right.
- **Tabao Rush HUD: 5A** (`trA`): order cards bottom left, time, score and stars bottom right.
- **Tabao Rush versus** (`vs`): team scores in the top corners, each team's orders under its
  kitchen, one clock in the middle. Not explicitly confirmed by Randy; taken as accepted.
- **Versus interaction:** all four forms, one or two per arena (TR-058).

### 4.4 Phone controller — **decided** (board 4, D-047)

- **Tabao Rush buttons: 1A**, a diamond of four equal buttons, marked with the four shapes
  **cross, circle, square and triangle** in place of the letters A, B, X and Y. Cross (bottom)
  picks up and puts down, circle (right) acts, square (left) dashes, triangle (top) throws. The
  shapes are drawn by us in the kit's own colours, not the PlayStation colours (Randy, D-048).
- **Stick: 2B**, floating: it appears where the left thumb lands, inside an outlined area.
- **Button style: 3A**, filled colour; a press is shown by scale 0.97 and a vibration.
- **Peek Poker picker: 4B**, grid in the centre with 89 px cells and a 144 px Lock in button
  under the right thumb.
- The single-design phone screens on board 4 stand as shown.
- **Buttons must not be too small** (Randy, D-051). The four face buttons are at least the
  110 px shown on board 4 at 844 × 390, and scale up with the phone; any other control a
  player taps during play is at least 89 px wide and 68 px tall (the Peek Poker grid cell on
  board 4, where a 4 × 4 grid of 89 × 68 px cells with 8 px gaps is 296 px tall), and nothing
  tappable anywhere is under 55 px.

### 4.5 Motion tokens — **decided** (board 5, D-051)

Chosen by Randy on 2026-11-16. Source: `design-gate/05-motion.html`.

- **Tempo 1B, golden:** `fast` 144 ms (press, small changes), `base` 233 ms (menus, rows),
  `slow` 377 ms (tiles, screens, throws). Each step is 1.618 times the last. Exits run at 0.8
  of the entrance.
- **Easing 2A, soft landing:** entrances `cubic-bezier(.16,1,.3,1)`; moves
  `cubic-bezier(.65,0,.35,1)`.
- **Card reveal 3A:** the card turns over; the face changes while the card is edge-on.
- **Screen change 4A:** crossfade with old and new overlapping, at `slow`.
- Stagger 30 ms, press scale 0.97, popovers from 0.95, knob stretch 12%, as in §3.

### 4.6 3D art style — **decided** (boards 1A and 1)

Decided on board 1A (Randy, 2026-11-16, D-037): **chunky toy** cooks about two heads tall,
modelled and animated by script, **one shared body with at least 8 different heads**, colour
carried by apron and cap.

**Board 1: option C** (Randy, 2026-11-16, D-044). Reference frame: `b1_C_full` from
`tools/blender/board1_style.py`.

- **Finish: matte.** `kalib.STYLE = "matte"`: roughness 0.78, a trace of subsurface, no clear
  coat on props.
- **Light: day.** `kalib.lights()`; the same light in every level until Randy says otherwise.
- **Camera: orthographic, tilted 60° down**, 120 px per tile at 1080p. Screen position of a
  world point: `x = 960 + 120·X`, `y = 540 − ((Y − Y0)·0.866 + Z·0.5)·120`, with `Y0` the
  level's look-at depth.

---

## 5. The design gate

**The gate closed on 2026-11-16 (D-051). Every board is decided and §4 is locked: changes go
through Randy.** Visible work may now be built.

Nothing visible is built until Randy has chosen from every board below: no shell UI, game
screen, controller styling or final art. Code that draws nothing may proceed (PRD NN-6 as
amended, D-039). Each board is published as an artifact with two or three options, includes a
golden-ratio variant, and says which proportions use it. The source of each board is saved in
`design-gate/`.

| # | Board | Options to show | Status |
|---|---|---|---|
| 0 | Art finish | Plain / flat vector / rich vector / Blender | **Done** — D chosen |
| 0B | End-goal vision | Not a choice: one page showing the aim for every screen of the console, controller and three games, with rendered Tabao Rush kitchens. Source `design-gate/00b-end-goal-vision.html`, built by `tools/blender/vision_*.py` and `kalib.py` | Published 2026-11-16 |
| 1A | Modelling approach | How stylised (toy / clay / realistic), where models come from (scripted / CC0 / paid AI), how many characters, with memory cost. Source `design-gate/01a-modelling-approach.html`, built by `tools/blender/board1a_*.py` | **Done** — A1 chunky toy, B1 scripted, C2 one body with 8 heads (D-037) |
| 1 | 3D art style | Four looks of the same kitchen and eight cooks at true game size: finish (glossy or matte), lighting (day or evening), camera tilt (42°, 50°, 60°). Source `design-gate/01-art-style.html`, built by `tools/blender/board1_style.py` and `tools/boards/build_board1.py` | **Done** — C: matte, day, 60° (D-044) |
| 2 | Visual identity | Three directions: palette, type pairing, surface treatment; plus where trivia photos come from. Source `design-gate/02-visual-identity.html`, built by `tools/boards/build_board2.py` | **Done** — C Marble table as the general rule; real photographs, Codex only as a fallback (D-042) |
| 2B | A theme for each game | Three variants each for Rabakz, Peek Poker and Tabao Rush inside the Marble table console. Source `design-gate/02b-game-themes.html`, built by `tools/boards/build_board2b.py` | **Done** — R1 Bandung, K1 Green baize, T1 Order chit (D-043) |
| 3 | Big-screen layouts | Landing, lobby, picker, team setup, Rabakz question and reveal, Peek Poker table, Tabao Rush HUD, versus and how the two kitchens interact, results. Source `design-gate/03-big-screen-layouts.html`, built by `tools/blender/board3_scenes.py` and `tools/boards/build_board3.py` | **Done** — 1B, 2A, 3A, 4B, 5A, all four versus interactions in rotation (D-046) |
| 4 | Phone controller | Joining, lobby, leader, team and cook pickers, Tabao Rush buttons and stick, button style, Rabakz buzzer states, Peek Poker picker and hand, paused and reconnecting, at 844 × 390. Source `design-gate/04-phone-controller.html`, built by `tools/blender/board4_scenes.py` and `tools/boards/build_board4.py` | **Done** — 1A with shape buttons in our colours, 2B, 3A, 4B (D-047, D-048) |
| 5 | Motion | Live samples of the key transitions, with tempo, easing, card reveal and screen change to choose. Source `design-gate/05-motion.html` | **Done** — 1B, 2A, 3A, 4A (D-051) |

**Any design or graphics choice, not only these boards, goes to Randy as an artifact** with real
options to choose from (Randy, 2026-11-16, D-022). Each option states its cost against the
budgets in `PERFORMANCE.md`; an option that cannot meet a budget is marked as such.

When a board is decided: record the choice and date in `DECISIONS.md`, write the values into
§4, and mark the board done here. After the gate closes, §4 is locked; changes go through
Randy.

---

## 6. Review checklist

The reviewer checks every UAT screenshot against this list.

- [ ] Every spacing value is on the φ scale.
- [ ] Panel splits are 1.618 : 1 where there is a primary and a secondary.
- [ ] No flat-filled hero, card or empty area; exactly one surface treatment per surface.
- [ ] Text contrast holds over the treatment, on the TV and on the phone.
- [ ] Colours, type and motion use the tokens in §4, with no one-off values.
- [ ] No bounce or overshoot anywhere; nothing tweens while held.
- [ ] Entrances ease out; exits are about 20% shorter; no blank frame between states.
- [ ] Press states scale to 0.97; touch targets are at least 55 px.
- [ ] Players are distinguishable without colour.
- [ ] Big-screen text is readable from 3 m (minimum 34 px at 1080p for anything players must read in play).
- [ ] `prefers-reduced-motion` drops motion and keeps state changes.
