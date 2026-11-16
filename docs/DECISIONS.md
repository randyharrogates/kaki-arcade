

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
