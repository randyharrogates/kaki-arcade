

**D-043 · 2026-11-16 · Randy** — Board 2B: Rabakz **R1 Bandung**, Peek Poker **K1 Green baize**,
Tabao Rush **T1 Order chit** (closes OQ-023). **Go to start the build** (closes OQ-021), with
standing orders: Claude builds everything, Codex only for image generation; concurrent
sub-agents where needed; memory checked before each; the loop applied to every issue; a
10-minute check that no sub-process is stuck; do not stop until v1 is up and playable, asking
him whenever a decision is his. Affects: DESIGN §4.2, PLAN.

**D-044 · 2026-11-16 · Randy** — Board 1: **option C**, matte finish, daylight, camera tilted 60°
("go with C as recommended"). He did not answer whether light should change by venue, so every
level uses daylight until he says otherwise (Claude's assumption). Closes OQ-024. Unblocks S-02
and the art track. Affects: DESIGN §4.6, ART-PIPELINE, A-02 onwards.

**D-045 · 2026-11-16 · Claude** — F-01 dependencies (all dev-only, exact versions): `typescript`
6.0.3 (held below 7 because typescript-eslint 8.72.2 supports only below 6.1), `vitest` 4.1.12
(held below 5, which would make Vite a direct dependency before the S-04 decision; Vite 8.3.8
is present only as Vitest's own dependency), `eslint` 10.15.0, `typescript-eslint` 8.72.2,
`@eslint/js` 10.0.1, `@types/node` 24.19.2. Also: issue branches may register their own new
package and add `workspace:*` dependencies (PLAN §5 amended), and code that cannot draw is
exempt from the design lint. Affects: PLAN §5, WORKFLOW §2.

**D-046 · 2026-11-16 · Randy** — Board 3: lobby **1B**, picker **2A**, Rabakz question **3A**,
Peek Poker table **4B** (he typed "4v" and confirmed 4B), Tabao Rush HUD **5A**; versus
interaction: **all four forms, not all at the same time**. He did not comment on the versus
screen or the single-design screens; taken as accepted. **Rabakz rules changed by Randy:** not
timed; the question moves on once someone answers correctly and that player scores; players
answering at the same time all score; a wrong answer locks the player out until everyone else
has taken a turn; scoring stays in hundreds with the streak bonus and the double final round;
the leader can skip and the game moves on after 30 s with no answer. Claude's own readings,
to be confirmed (OQ-026): the same-time window is 0.25 s; wrong options are marked on the TV;
team mode gives the question to the winner's team; solo scores only a first answer; the streak
counts questions won in a row. Closes OQ-019. Affects: `games/rabakz.md`, TR-058, DESIGN §4.3,
R-01 onwards, PRD §1 wording.

**D-047 · 2026-11-16 · Randy** — Board 4: Tabao Rush buttons **1A** (diamond of four equal
buttons) "use playstation buttons instead of xbox", so the buttons carry cross, circle, square
and triangle, not letters; stick **2B** floating; button style **3A** filled; Peek Poker picker
**4B**. Claude's reading: the shapes sit where that layout puts them (triangle top, circle
right, cross bottom, square left), drawn by us in the kit's colours, not copied artwork or
that maker's colours (rule 7). The golden-ratio variant 1B was offered and not chosen.

**D-048 · 2026-11-16 · Randy** — (1) Shape buttons are drawn in Kaki Arcade's own colours, not
the PlayStation colours. (2) `PERFORMANCE.md` §2 amended: a simulation step may return a new
state that shares unchanged parts ("allow it, then measure"); Tabao Rush must prove it in the
performance harness. Closes OQ-030. (3) Rabakz: "same time" is within 0.25 s of the first
correct answer, and a wrongly chosen option is marked wrong on the TV for everyone (RZ-005,
RZ-006 stand as written).

**D-049 · 2026-11-16 · Randy** — Rabakz: (1) **no true-or-false questions**; the bank is
multiple choice and picture only (RZ-002 rewritten). (2) Team mode: a question's points go to
the winner's team once (RZ-012 stands). (3) Nicknames: 12 visible characters (PLAT-004).
(4) Singapore questions use romanised names only. Closes OQ-029 and OQ-026 items 3 and 6.

**D-050 · 2026-11-16 · Randy** — (1) Rabakz answers carry the same four shapes (cross, circle,
square, triangle) with a colour each, no letters. (2) Sound for v1: **effects and music**
(TR-063 and RZ-033 are to be built, not skipped); effects are synthesised in code; the music
source is still to be chosen (OQ-006). (3) Spacing may also use 144, 233 and 377 px, plus 0,
and 1 to 3 px on corner radii (closes OQ-025; `DESIGN.md` §1 updated). (4) Rabakz solo: only
the first answer scores; a wrong answer reveals the correct one and the match moves on
(RZ-013 stands).

**D-051 · 2026-11-16 · Randy** — Board 5: "go as recommended", so tempo **1B** (144, 233,
377 ms), easing **2A**, card reveal **3A** (turn over), screen change **4A** (crossfade).
"note the buttons just not be too small": Claude's reading is a floor of 110 px for the four
face buttons at 844 × 390, 89 px for other in-play controls and 55 px for anything tappable
(`DESIGN.md` §4.4). **The design gate is closed**; `DESIGN.md` §4 is locked.

**D-052 · 2026-11-16 · Randy** — "please also use codex for subagent work from now on", and
"Please use opus 5.5 for subagents where you deem better". Supersedes D-018 and the Claude-only
part of D-043: issues may be built by Claude sub-agents (Opus 5.5 where it fits) or by Codex
(`gpt-6.1-sol`, workspace-write, in the issue's worktree). Claude still leads, briefs and
merges; every issue keeps an independent Claude review. `CLAUDE.md` rule 8, `AGENTS.md` and
`PLAN.md` updated.

**D-053 · 2026-11-16 · Claude** — Correction to my reading in D-051: the floor for an in-play
control other than a face button is 89 px wide by 68 px tall, not 89 px square. A square floor
would have made the Peek Poker grid Randy chose on board 4 (4 × 4 cells of 89 × 68 px) 380 px
tall, which does not fit a 390 px phone. Found by the F-04 review.

**D-054 · 2026-11-16 · Randy** — No Git LFS. Every model is built by a script, so the scripts
are the source and `.blend` files are not committed ("go with ur recommendation"). Closes
OQ-008; `ART-PIPELINE.md` §1 and §7, the A-01 backlog line and `.gitignore` updated.
