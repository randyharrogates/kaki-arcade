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
  row and field spacing. No other spacing values.
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

### 4.2 Visual identity — *pending (gate board 2)*

Palette, typefaces, surface treatment per surface type.

### 4.3 Big-screen layouts — *pending (gate board 3)*

Landing, lobby with join code, game picker, in-game HUD for each game, results.

### 4.4 Phone controller — *pending (gate board 4)*

The kit's look, sizes and the layouts each game uses.

### 4.5 Motion tokens — *pending (gate board 5)*

Named durations and easings implementing §3.

### 4.6 3D art style — *partly decided (board 1A done, board 1 pending)*

Decided on board 1A (Randy, 2026-11-16, D-037): **chunky toy** cooks about two heads tall,
modelled and animated by script, **one shared body with at least 8 different heads**, colour
carried by apron and cap. Still to choose on board 1: glossy against matte finish, lighting
mood, camera tilt.

---

## 5. The design gate

No shell UI or game code is written until Randy has chosen from every board below
(PRD NN-6). Each board is published as an artifact with two or three options, includes a
golden-ratio variant, and says which proportions use it. The source of each board is saved in
`design-gate/`.

| # | Board | Options to show | Status |
|---|---|---|---|
| 0 | Art finish | Plain / flat vector / rich vector / Blender | **Done** — D chosen |
| 1A | Modelling approach | How stylised (toy / clay / realistic), where models come from (scripted / CC0 / paid AI), how many characters, with memory cost. Source `design-gate/01a-modelling-approach.html`, built by `tools/blender/board1a_*.py` | **Done** — A1 chunky toy, B1 scripted, C2 one body with 8 heads (D-037) |
| 1 | 3D art style | Three Blender looks for the same stall and cook: character proportions, materials, lighting, camera tilt | Pending |
| 2 | Visual identity | Three directions: palette, type pairing, surface treatment | Pending |
| 3 | Big-screen layouts | Lobby, picker, Tabao Rush HUD, Peek Poker table, results | Pending |
| 4 | Phone controller | Kit styling and both games' layouts at 390 × 844 landscape | Pending |
| 5 | Motion | Live samples of the key transitions | Pending |

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
