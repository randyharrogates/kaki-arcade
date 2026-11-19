# Kaki Arcade — Decision Log

Append-only. Newest at the bottom. A decision that changes a requirement is made by Randy;
Claude records it here and then edits the affected doc.

Format: **D-NNN · date · who decided** — decision. *Why.* Affects.

---

**D-001 · 2026-11-15 · Randy** — Build a browser games platform where phones are the
controllers and one big screen shows the game. *Family and party play on the TV with no
installs.* Affects: whole PRD.

**D-002 · 2026-11-15 · Randy** — Public release, not family-only. Affects: REL, DATA, NET-004,
PLAT-005.

**D-003 · 2026-11-15 · Randy** — Up to 8 players. Affects: NN-2, PLAT-003, performance budgets.

**D-004 · 2026-11-15 · Randy** — Remote players are wanted; ship them in phase 2 as
single-device players, but design for them from the start. Affects: NET-007, PLAT-032,
ARCHITECTURE §3.

**D-005 · 2026-11-15 · Randy** — The host browser runs the simulation; phones connect by
WebRTC through a small pairing server we own (not AirConsole, not a server-run game). *Near-zero
running cost for a public game, lowest delay in the room, no third-party platform or
subscription.* Trade-off accepted: a round is lost if the host tab closes. Affects: NET-001 to
003, PLAT-009.

**D-006 · 2026-11-15 · Randy** — The phone mimics a console controller built from a standard
kit, so future games can be added. Each game declares the parts it uses. Affects: CTRL-001 to
003.

**D-007 · 2026-11-15 · Randy** — v1 is a platform with a game picker and two games: an original
hawker-centre co-op cooking game and a memory poker game. Affects: PLAT-020, PLAT-033, both
game specs.

**D-008 · 2026-11-15 · Randy** — Hawker game modes at launch: co-op for 1 to 8, team versus,
solo with bots. Launch size 8 co-op levels, 3 versus arenas, 7 dishes ("slightly more" than
the 6 / 2 / 5 first proposed). Affects: TR-040, TR-050 to 053.

**D-009 · 2026-11-15 · Randy** — Memory poker rules: 4 × 4 grid shown for 20 seconds then
hidden; 3 shared face-up cards; each player secretly picks 2 from memory; best five-card hand
wins; two players may pick the same card; a match is several rounds of rising difficulty with
scores added up. Affects: PP-001 to 011. *The exact difficulty ramp and point values are
Claude's proposal, see OQ-002 and OQ-003.*

**D-010 · 2026-11-15 · Randy** — Art route D: Blender, pre-rendered. Must look finished, with
correct character movement, and must not cause lag. *Chosen after comparing four finishes on
the art samples board.* Affects: NN-4, ART-PIPELINE, PERFORMANCE §2.

**D-011 · 2026-11-15 · Claude, following D-010** — Blender output is pre-rendered sprites and
baked backgrounds, not live 3D in the browser. *Live 3D is the likeliest cause of stutter on a
TV-class chip; flat sprites are the cheapest thing to draw.* Affects: ARCHITECTURE §4,
ART-PIPELINE §3. To be confirmed by the M2 spike.

**D-012 · 2026-11-15 · Randy** — Randy's design rules (golden ratio, motion, no flat
backgrounds) are binding and are written into the repo rules. They apply to gameplay as well
as the interface. Affects: NN-5, DESIGN §1 to §3, TR-062, PP-031.

**D-013 · 2026-11-15 · Randy** — Design and art direction are decided at the start from
artifact option boards he chooses from. Affects: NN-6, DESIGN §5, ROADMAP M1.

**D-014 · 2026-11-15 · Randy** — Relay on. The pairing server stops issuing relay access at
800 GB a month to stay inside Cloudflare's free 1,000 GB. *Prices checked the same day: first
1,000 GB free then US$0.05/GB; Randy is on the US$5/month Workers plan.* Affects: NET-003,
NET-004, REL-001.

**D-015 · 2026-11-15 · Randy** — No accounts in v1; nickname only; scores on the host device;
anonymous error counts only. Affects: DATA-001 to 004.

**D-016 · 2026-11-15 · Randy** — Names: platform **Kaki Arcade**, hawker game **Tabao Rush**,
memory game **Peek Poker**. *Trademark and domain availability not checked, see OQ-001.*

**D-017 · 2026-11-15 · Randy** — English only in v1. Hosted on a subdomain of `leeseidon.com`.
Supported devices: current Chrome, Edge and Safari on the big screen; phones from about the
last four years; nothing older needed. Affects: REL-001, REL-004.

**D-018 · 2026-11-15 · Randy** — Built entirely by Claude. Codex only for image generation or
for something Claude cannot do. *This overrides Randy's usual Claude-plans, Codex-implements
split, for this repo only.* Affects: NN-9, AGENTS.md.

**D-019 · 2026-11-15 · Randy** — Work runs as a continuous loop of code, verify, test (UAT with
screenshots), review, code, with implementation strictly tracked against the PRD in local repo
docs. Affects: NN-7, NN-8, WORKFLOW, TRACEABILITY.

**D-020 · 2026-11-15 · Claude** — Repository at `~/projects/personal/web-apps/kaki-arcade`,
private on GitHub under `randyharrogates` (Randy chose location and visibility). pnpm
workspace, TypeScript. Renderer PixiJS and shell Preact are provisional pending the M2 spike.
Affects: ARCHITECTURE §2, §4.

**D-021 · 2026-11-15 · Claude** — Peek Poker is built before Tabao Rush. *It is small, uses
private phone screens, and proves the game interface cheaply.* Affects: ROADMAP. Randy can
reverse this at the M3 demo.

**D-022 · 2026-11-16 · Randy** — Every design or graphics choice is put to him as an artifact
with real options, and each option states its performance cost (no lag is allowed). Written
into `CLAUDE.md` rule 5 and `DESIGN.md` §5. Affects: NN-6, all later boards.

**D-023 · 2026-11-16 · Randy** — Tabao Rush presentation: several different cook characters,
not one cook in eight colours (how many is choice C on board 1A); no customer characters,
orders are cards at a serving window; strictly no scrolling, every arena fits the screen,
including team versus. Affects: TR-060, TR-061, TR-001, TR-050, TR-052, PERFORMANCE §2 ("one
cook, eight colours"), ART-PIPELINE §2. *Doc edits pending, OQ-013.*

**D-024 · 2026-11-16 · Randy** — Audience is any age. Affects: difficulty tuning, tutorial,
text size.

**D-025 · 2026-11-16 · Randy** — Peek Poker: the proposed difficulty ramp (20, 16, 12, 10, 8
seconds; swaps from round 3) and hand points are confirmed, and the leader chooses 3, 5 or 7
rounds (default 5). Closes OQ-002, OQ-003, OQ-007. Affects: PP-001, PP-009, PP-011. *Spec edit
pending, OQ-013.*

**D-026 · 2026-11-16 · Randy** — Two rule additions accepted in principle, details still to
agree: Tabao Rush gets throwing items and kitchen fires in v1 (OQ-009); Peek Poker scoring
counts speed (OQ-010). Affects: both game specs, CTRL layouts, ART-PIPELINE cook actions.

**D-027 · 2026-11-16 · Randy** — Process: gate boards one at a time in order, mixing options
allowed, then one confirmation render; no deadline; the TV's own browser is tried first, with
this MacBook on HDMI as the fallback; real-phone HTTPS in development uses a Cloudflare quick
tunnel that Claude sets up itself (closes OQ-005), with `arcade.leeseidon.com` going live only
at M8 (DNS confirmed on Cloudflare by lookup, closes OQ-004); push to GitHub only when all is
done; **no implementation starts until Randy confirms the plan.**

**D-028 · 2026-11-16 · Claude** — Board 1A added ahead of board 1 to settle the modelling
approach. It uses one third-party file for comparison only: Kenney "Mini Characters" 2.0
(CC0), downloaded to a scratch folder, rendered once, not committed and not used in the game.

**D-029 · 2026-11-16 · Randy** — Board 1A: "the ones that take least resources, and the
cutest". Read by Claude as A1 chunky toy, B1 scripted by Claude, C2 one shared body with
different heads (several characters at about the memory of one). *Reading to be confirmed by
Randy; board 1 then refines the toy look.* Affects: DESIGN §4.6, TR-060, ART-PIPELINE §2.

**D-030 · 2026-11-16 · Randy** — Tabao Rush v1 stays in the Singapore hawker world, with the
venue varying by level (kopitiam, hawker centre, pasar malam, roadside zi char). Other worlds
are later content. Affects: TR-050, board 2.

**D-031 · 2026-11-16 · Randy** — Throwing (closes OQ-009): Y throws the held raw or chopped
ingredient about 4 tiles on an arc in the facing direction; a teammate in its path catches it,
otherwise it lands on a counter or the floor and can be picked up; plates and finished dishes
cannot be thrown. Fires: food left burning 5 more seconds catches fire; fire spreads to a
neighbouring station every 6 seconds; a burning station is unusable and its food is lost; any
cook puts it out by holding B with the extinguisher, kept at a fixed spot in the level. Fires
appear only in the more difficult levels. *Spec edit pending, OQ-013.*

**D-032 · 2026-11-16 · Randy** — Peek Poker speed (closes OQ-010): among players tied for the
round's best hand, the fastest to lock in gets +3 and the rest +1. Affects: PP-009.

**D-033 · 2026-11-16 · Randy** — Players choose their cook in the lobby, with a default by
seat. Push to GitHub only when the whole of v1 is done; commit locally along the way. The TV is
confirmed as the TCL Q65. Eight real phones are only available at a UAT session with his other
players, so Claude tests 8 players by emulation first.

**D-034 · 2026-11-16 · Randy** — A third game joins v1: a simple trivia night game. *Rules,
question source and name not yet agreed, OQ-015.* Affects: PRD §1, §5, ROADMAP, PLAT-033.

**D-035 · 2026-11-16 · Randy** — The trivia game (closes OQ-015): named **Rabakz**; bundled
question bank from the Open Trivia Database plus a Singapore pack written by Claude, no live
generation; a mix of multiple choice, true or false and picture questions, no typed answers;
correct plus speed scoring with a streak bonus and a double-points final round; 10, 30 or 50
questions; all ages; free-for-all and teams; solo allowed; cook characters are not used
outside Tabao Rush. *Point values, final-round lengths, bank size and the Easy / Mixed / Hard
difficulty choice are Claude's proposals, OQ-020.* Affects: `games/rabakz.md`, PLAT-025.

**D-036 · 2026-11-16 · Randy** — Build all three games, the controller and the console at
once, with concurrent agents in git worktrees, in a continuous loop until the whole game is
done; the work is documented as stories and issues. *Replaces D-021 (Peek Poker first).*
Affects: `PLAN.md`, `backlog/`, ROADMAP, WORKFLOW.

**D-037 · 2026-11-16 · Randy** — Confirms board 1A as A1 chunky toy, B1 scripted by Claude,
C2 one shared body with different heads (closes OQ-017), with **at least 8 heads so every
player has a unique character**, and **team colour themes** (for example red and blue) in team
play. Versus uses two mirrored kitchens side by side, designed so the two kitchens interact.
Randy has an iPhone and an Android phone and can test with up to 3 players for now. Affects:
DESIGN §4.6, TR-052, TR-058, TR-060, TR-061, TR-064, PLAT-025, PERFORMANCE §2, ART-PIPELINE §2.

**D-038 · 2026-11-16 · Claude** — PRD raised to v1.1 with the changes in D-023 to D-037: new
IDs PLAT-025, TR-009, TR-010, TR-057, TR-058, TR-064 and RZ-001 to RZ-034; reworded PLAT-033,
TR-001, TR-050, TR-052, TR-060, TR-061, PP-001, PP-009. 152 requirements tracked. Closes
OQ-013.

**D-039 · 2026-11-16 · Randy** — (1) Code that draws nothing may be written while the design
gate is open; PRD NN-6 amended (closes OQ-018). (2) The proposed values for Rabakz, Peek Poker
rounds 6 and 7, and fires from level 5 are accepted (closes OQ-020). (3) For concurrency, free
memory is checked before every agent, UAT run, render or performance run is started; written
into `PLAN.md` §5. (4) Before the build starts he wants an artifact showing what the games
will look like and the end goal, as detailed and real as possible: published as board 0B.

**D-040 · 2026-11-16 · Randy** — Rabakz picture questions use real photographs, not Blender
renders: either freely licensed photos or images generated with Codex. RZ-025 reworded. Which
source (or a mix) is choice 2 on board 2. He also asked that colour scheme, patterns and the
like are put to him as an artifact with variations; board 2 was published ahead of board 1 for
that. Affects: RZ-025, R-13, G-02.

**D-041 · 2026-11-16 · Claude** — Codex used once for image generation (permitted by D-018),
for a comparison sample on board 2 only; the image is not used in the game. Model
`gpt-6.1-sol`, run in a scratch folder outside the repo. Prompt: "Generate one photorealistic
photograph ... a bowl of Singapore Katong laksa on a hawker-centre table, seen from about 45
degrees above, natural daylight, shallow depth of field, thick rice noodles in orange coconut
curry broth with prawns, fishcake slices, cockles and laksa leaf. No text, no logos, no
people. Landscape, about 1200x900 pixels." Output: 1200 × 900 PNG, embedded in
`docs/design-gate/02-visual-identity.html`. The real-photo sample beside it is "Bowl of Katong
Laksa" by JaventheAlderick, Wikimedia Commons, CC BY-SA 4.0.

**D-042 · 2026-11-16 · Randy** — Board 2: direction **C, Marble table**, is the general rule,
and **each game has its own theme variant** within it. Trivia photos: **P1, freely licensed
real photographs; P2, Codex-generated, only when no photograph can be found.** He asked to see
the per-game themes before anything else; published as board 2B. Closes OQ-022. Affects:
DESIGN §4.2, RZ-025, R-13, G-02, G-03, G-04.

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

**D-055 · 2026-11-16 · Randy** — "Use codex only for implementation." Narrows D-052: every
builder is Codex from now on, including fix rounds on issues a Claude agent started. Claude
plans, briefs, reviews (Opus 5.5 where it fits), runs and looks at UAT, integrates and merges.

**D-056 · 2026-11-16 · Randy** — Token-review fixes: **1C** dark seat numbers on all eight
seats, **2C** marble secondary text `#706151`, **3B** Peek Poker panel secondary `#597469`,
**4B** stick outline in the theme's secondary text colour, **5B** bold small text on team
colours, **6B** phone type 13/21/34/55/89, **7A** icon swaps crossfade with no blur anywhere.
Closes OQ-033. Also by Claude under PERF-012: a press shows at once (no ease into 0.97); the
release eases.

**D-057 · 2026-11-16 · Randy** — Standing order: "From now on, please go with everything as
recommended by fable 5.2 best reocmmendation." Claude decides open design and product choices
by its own recommendation without waiting, records each in this log, and still publishes
design choices as artifacts for the record so Randy can overrule. Claude's reading: this does
not lift the hard gates in `CLAUDE.md` rule 9 (spending money, publishing publicly, DNS,
pushing the repository) or the real-device tests only Randy can do.

**D-058 · 2026-11-16 · Claude (under D-057)** — Closes OQ-026 and OQ-032 by recommendation:
the Rabakz streak counts questions won in a row; static question files that a determined player
could read are accepted for a game played in one room; phones send 60 ticks a second always,
including through the relay (a 30-a-second tick caused false releases in review).

**D-059 · 2026-11-16 · Claude (under D-057)** — Dependency: Pillow 11.1.0 (with libwebp 1.5.0),
pinned in `tools/assets/requirements.txt`, for packing and encoding atlases in `pnpm assets`.
A build tool only; nothing ships to the browser.

**D-060 · 2026-11-16 · Claude (under D-057)** — Room state (C-06), where the PRD is silent:
(1) the nickname filter is our own curated list in the repository (English, Singlish and
Hokkien, Malay, romanised Tamil, pinyin and Chinese), not a third-party list, matched after
normalising look-alike and invisible characters; common Singapore names (Kok, Fook, Sim, Wang,
Dick Lee) must never be blocked, and `dick` is a known, accepted gap. (2) Leadership passes at
once when the leader leaves, and after 10 seconds when the leader's phone drops; a returning
ex-leader does not take it back. (3) A host reload keeps the same leader. (4) Names that look
the same are treated as the same name.

**D-061 · 2026-11-16 · Claude (under D-057)** — Dependencies for the pairing server
(`apps/signal`, dev only): `wrangler` 4.162.0 to run and bundle the Worker locally and
`@cloudflare/workers-types` 4.20251014.0 for types. Install scripts are allowed for `esbuild`
and `workerd` only (`allowBuilds` in `pnpm-workspace.yaml`); every other package's install
script stays refused. Nothing is deployed and no Cloudflare account is touched until Randy
says so (rule 9).

**D-062 · 2026-11-16 · Claude (under D-057)** — Game interface (F-04) rulings from its second
review. (1) Mid-game joiners: results mark them `joinedMidGame`; in co-op they share the team
score and a join must not change it; in competitive play they start at 0. (2) Button bits follow
the wire order in `packages/protocol`; the protocol's letter names `a/b/x/y` mean bottom, right,
left, top and are to be renamed to positions (F-02b). (3) Each player's private view carries its
own revision so the host can tell cheaply that it changed. (4) The determinism promise is "same
inputs, same result on the same browser engine"; `Math.sin` and friends stay allowed because the
host alone runs the simulation. (5) Peek Poker's picker is tap-to-pick with a Lock in button
(board 4, 4B); the D-pad cursor in its spec does not fit beside the grid at the size floors and
is dropped, and letter button names in the game specs are replaced by the shapes. (6) Bots
(TR-053) live inside the game's own state; the interface does not know about them.

**D-063 · 2026-11-16 · Claude (under D-057)** — Pairing server (C-01) rulings from its review.
(1) A room is created by an HTTP POST, not by a `create` message on a socket: it is the natural
place for the rate limit (C-03). `ARCHITECTURE.md` §5 and the protocol's comments are amended
at merge; the protocol's socket `create` message is retired in F-02b. (2) The host keeps its
signalling socket open for the whole life of the room (free while hibernating), so reloads and
re-pairing always work; a room is deleted 10 minutes after its last socket closes and at most
12 hours after creation. (3) Room codes are 6 characters from the 28-character alphabet (about
480 million), shown as two groups of three; the QR code is the main way in, and the join rate
limit in C-03 is what makes guessing impractical. (4) Seat accept and refuse stay on the data
channel; signalling gets no new messages.

**D-064 · 2026-11-16 · Claude (under D-057)** — Refines D-060 (3): after a host reload the
leader is kept, but if their phone has not come back 20 seconds after the first other phone
returns, leadership passes on, so a lobby never waits two minutes for an absent leader. The
nickname filter matches strong words anywhere in a name and across spaces and hyphens; short
or ambiguous words only as whole words; protected names are checked per word.

**D-065 · 2026-11-16 · Claude (under D-057)** — Reverses D-063 (3): room codes stay at 8
characters (shown as two groups of four) until the per-client limit on failed joins exists
(C-03). Six characters leaned on a rate limit that is not built yet; shortening the code is
reconsidered when C-03 merges.

**D-066 · 2026-11-16 · Claude (under D-057)** — The host proves its secret when it opens its
socket, not in a first message: it offers the WebSocket subprotocols `kaki.v1` and
`kaki.host.<secret>`; the server checks the secret before accepting and answers with `kaki.v1`.
So no unproven connection can ever hold or block the host's place. Phones offer `kaki.v1` only.
The protocol's `reopen` message is retired with `create` in F-02b.

**D-067 · 2026-11-16 · Claude (under D-057)** — Nickname filter, final matching rule after four
review rounds (refines D-064). A strong root blocks when it lies inside one word, or spans
neighbouring words of which at least one has two letters or fewer (a split-up swear word);
it does not block when it only appears by joining two ordinary words ("Habit Change", "Mother
Fong", "Bit Chan"). `porn` and `phuk` match whole words only (Thai names, Phuket). A run of three
or more single letters anywhere is checked as a word. A protected name excuses only its own
match. Accepted: a filter of this kind is never complete; what it misses is a follow-up list,
and names it wrongly blocks are fixed as they are found.

**D-068 · 2026-11-16 · Claude (under D-057)** — Input buffer (F-03b): a deferred button tick
waits at most 4 simulation steps (about 67 ms). After that the rest of the queue is collapsed
to its net state, keeping at most one press and one release per button. A tap lost after a long
network stall is better than a burst of second-old taps replayed late, above all for the
Rabakz buzzer.

**D-069 · 2026-11-16 · Claude (under D-057)** — Peek Poker rule details the spec left open
(review of P-01): (a) the +3 speed bonus goes only to the earliest player who pressed Lock in
among those with the round's best hand; a best hand that was never locked in earns +1, and
seat order never breaks a tie. The same rule applies to a lone best hand and to solo play.
(b) Pick time is fixed at 20 seconds; there is no leader setting for it (no requirement asks
for one). (c) Each swap takes 2 seconds, one after another, and the pick timer starts after
the last. (d) The reveal lasts 8 seconds, then a scoreboard phase of 5 seconds before the next
round or the end. (e) A player who joins before the first step plays round 1; later joiners
wait for the next deal. (f) Grid faces are secret whenever face down. (g) A personal best is
saved only for a match that ended with one player and never admitted another.

**D-070 · 2026-11-16 · Claude (under D-057)** — The protocol version stays 1 (`kaki.v1`)
through the F-02b clean-up, although two socket messages were removed and an error code added:
nothing is deployed and no client exists, so a bump would protect no one. Version 1 is frozen
at the first deploy; any wire-visible change after that needs a version bump.

**D-071 · 2026-11-16 · Claude (under D-057)** — Rabakz rule details the spec left open (review
of R-01): (a) after a reveal the game moves on by itself after 4 seconds; the final-round
announcement shows for 4 seconds; the leader continues only from the scoreboard (every 5
questions) and the end, and a scoreboard continues by itself after 20 seconds so a match can
never hang. (b) Disconnected players and players who joined during a question are not waited
for. (c) The 30 seconds run from when the question appears; a wrong answer does not restart
them. (d) When team-mates tie, the team receives the largest of their awards once. (e) A
question skipped or revealed with no winner does not end a streak. (f) A player who leaves and
rejoins is a new joiner and cannot win the question in progress; a joiner during the
final-round announcement plays its first question. (g) Answers arriving in the same step as
the leader's skip are counted before the skip. (h) If a multiplayer match falls to one player,
solo rules apply from that question. (i) The game takes questions in the bank's own shape,
including picture file, alt text and credit, so credits can be shown (RZ-025).

**D-072 · 2026-11-16 · Claude (under D-057)** — Tabao Rush movement (review of T-01): facing
keeps its current direction until the stick is more than 8 degrees past the edge of its
sector, so the highlighted station does not flicker with ordinary thumb noise (TR-021). This
is not movement smoothing: position still follows the stick on the next step (TR-020). A cook
steps aside only when another cook blocks it, never because of a wall. All movement constants
(walk speed 3 tiles a second, dead zone 0.12, cook radius 0.20, reach 0.85 and the rest) are
provisional until they can be judged on a screen and shown to Randy.

**D-073 · 2026-11-16 · Claude (under D-057)** — Replaces D-071 (g), which broke the game
interface contract: taps in a step are taken in the order the host received them; a leader's
skip reveals at once and later taps in that step do nothing. Also (Tabao Rush, refining
D-072): on the first press from rest a cook faces the nearest direction; the 8-degree hold
applies only while the stick was already deflected.

**D-074 · 2026-11-16 · Claude (under D-057)** — Adds to D-073: in Rabakz a leader's skip has
no effect once someone has answered correctly, so the 0.25 s tie window always runs out
(RZ-006).

**D-075 · 2026-11-16 · Claude (under D-057)** — The game dev harness (F-05) lives in
`packages/platform/src/harness`, imported as `@kaki/platform/harness`, so it needs no new
package. F-05 is split: F-05 builds the headless runner (scripted and recorded controllers,
replay, text dumps of views) now; F-05b adds the bare dev page with keyboard controllers once
a game has a big-screen view to draw, since a page with nothing to draw proves nothing.

**D-076 · 2026-11-16 · Claude (under D-057)** — Netcode (review of C-04): a phone's identity
across reconnects is its seat token, already carried in the resume message; no separate device
id is added. The host paces its own signalling below the pairing server's rate limit; sizing
the server's bucket for eight phones joining at once is part of C-03. A peer that has not
connected within 15 seconds is abandoned. Both signalling sockets send the protocol's
keep-alive ping.

**D-077 · 2026-11-16 · Claude (under D-057)** — `packages/netcode` takes a test-only
dependency on `@kaki/signal` (workspace link, no new external package) so its tests run
against the pairing server's real room logic instead of a stand-in; the first build's
stand-in hid five connection faults.

**D-078 · 2026-11-16 · Claude (under D-057)** — Tabao Rush item rules the spec left open
(review of T-02), all provisional until seen on a screen: (a) a crate gives one raw item per
cross press to an empty-handed cook, never takes one back, and gives nothing while 24 items
lie on the floor, so a round cannot grow without bound (PERF-001); (b) counters hold one item,
no swapping; (c) cross never puts an item down on the floor; an empty-handed cook with nothing
highlighted picks up the oldest item on its own tile, and the public view says which; (d) a
throw flies for the `slow` motion token, 377 ms (23 steps, D-051), up to 4 tiles, passes over
counters and stops at walls and stations; (e) a throw is never caught on the step it is
thrown, so every throw is seen in flight; the thrower cannot catch its own throw; full hands
let it pass; (f) an uncaught throw rests on its endpoint counter if that is free, otherwise on
the last free floor tile back along its path; (g) presses by several cooks in one step resolve
by ascending seat, cross before triangle (buttons are never taps); (h) a leaving cook's item
drops by rule (f) from where it stood; (i) plates and finished dishes cannot be thrown
(TR-009); the conflict with the sabo "dirty plates thrown across" in TR-058 is OQ-029.

**D-079 · 2026-11-16 · Claude (under D-057)** — Session runner (review of C-10), where the
PRD and the game contract were silent or the first build was wrong:
(a) **Layout delivery.** A game's layout revision covers only what a player can tap, so
greying out or selecting must still reach the phone. The host keeps the last layout and private
view sent to each phone and sends again whenever the content for that phone differs, found by
an allocation-free structural comparison (not JSON text). Each phone has its own wire revision
that goes up by one per layout sent; a tap's wire revision is translated back to the game
revision it was drawn from, and the game contract's rule then applies unchanged. This amends
"the host compares revisions, never JSON" in `ARCHITECTURE.md` §3.
(b) **Pause and resume.** Any player can pause; only the connected leader resumes; quitting
to the picker needs a second press to confirm (PLAT-023 says only who may pause and quit).
Taps arriving while paused are dropped; on resume the input buffers discard their edges and
play continues at once. No acknowledgement from the phone is waited for; a wire
acknowledgement may tighten this later but must have a step-count timeout.
(c) **Reconnect.** A returning phone's buffer is reset and it plays at once.
(d) **Host is the authority on inputs.** Buttons and axes the phone's current layout does not
draw are cleared before the game sees them. A disconnected player sends no frames, as the
game contract says; the dev harness and the runner must agree on both.
(e) **Short of players.** The match pauses. If the game's minimum is not restored within the
two-minute seat hold, the match ends with results; the leader quitting while short also ends
it with results.
(f) **Teams.** In a team match a mid-match joiner is not seated in the game until the room
has given them a team; the game's player details are rebuilt from the room on every update.
(g) Recordings of a console match use the dev harness's event format and never contain seat
tokens.

**D-080 · 2026-11-16 · Claude (under D-057)** — Tabao Rush station rules the spec left open
(review of T-03), all timings provisional until seen on a screen: (a) stations hold one item,
no swapping; chopping, pulling a drink and washing take 3 s of circle with empty hands, and
progress is kept when interrupted; cooking takes 5 s; the grill waits half-way for one turn;
stirring doubles the wok's speed; a tap of circle counts as well as a hold. (b) Finished food
warns for 2 s from 3 s after it is done, then is burnt; burnt food can only be binned; food
left burnt for 5 more seconds sets its station on fire (TR-010 read as burnt plus 5 s). (c)
While any fire burns, one more station catches fire every 6 seconds, on one clock for the
whole kitchen, not one per fire: the lowest-numbered unlit neighbour of the oldest fire.
Neighbours are typed stations on the same counter run with at most one plain counter between;
crates never burn; T-06 lets a level state its fire neighbours. Fire destroys food and keeps
plates. (d) A fire is put out by 1 s of circle with the extinguisher, restarting if let go.
There is one extinguisher, kept on its rack; it cannot be thrown, binned or loaded, and its
rack is not a place a throw can land. A level with fires must have an extinguisher. (e) The
bin takes food only; plates cannot be binned and a plated dish leaves its plate. (f) An item
records the steps done to it in order (chopped, grilled, and so on), so recipes can check
order (TR-003). (g) Everything recipes need beyond this — plates that hold several things,
pots with two ingredients, mixing, spreading, cups, a clean-plate supply, a serving counter —
belongs to T-04.

**D-081 · 2026-11-16 · Claude (under D-057)** — Pairing server limits (review of C-03).
(a) Clients are counted by IPv4 address or IPv6 /64, with a second failure counter per IPv6
/48. (b) A full limiter never refuses a client it has not seen: it evicts the
least-recently-seen clean entry, and if none is clean new clients share one generous overflow
bucket. No refusal asks a client to wait more than 60 seconds (600 for room creation). (c) A
room that is full of unidentified sockets closes the oldest one for a newcomer; an
unidentified socket has 3 seconds to send its join. A room's own "full" answer is never
counted against the client. (d) A guess is charged when admitted and refunded on success, so
parallel guessing gains nothing. Only real failures count; a refused request is not a
failure. (e) The limiter keeps its counters in memory only: nothing about a client is written
to storage, which also removes the storage cost. Counters are lost when an idle limiter is
evicted; that only helps a client who was quiet anyway. (f) If the limiter fails, room
creation and joins answer 503 with a short retry, and a room never fails because the limiter
did. (g) A request with no client address is refused with 400. (h) Room codes stay at 8
characters (D-065 confirmed: about 2 in 10,000 over a 12-hour room against 1,000 addresses;
6 characters would be about 774 times worse). (i) Cloudflare's rate-limiting binding goes in
front where it is available, so repeated refusals cost nothing. Deploy remains Randy's call
(OQ-030).

**D-082 · 2026-11-17 · Claude (under D-057)** — Session runner (C-10 review round 2): a
seated player's team is fixed for the rest of the match; a team change in the room takes
effect at the next match. Only a player's name and colour are refreshed mid-match, without
calling the game's join again. While paused the runner does not sample the input buffers, so a
button released or pressed during a pause is seen correctly on resume. The layout comparison
of D-079 (a) first checks whether the game returned the very same object as last time and
only then compares by shape; it must not allocate.

**D-083 · 2026-11-17 · Claude (under D-057)** — Pairing server limits, second review of C-03;
replaces D-081 (b) and (c) and extends (a). (a) Room creation and connection attempts are also
metered per IPv6 /48 (64 rooms at once, then one a second), checked before the /64. (b) A full
limiter evicts the least-recently-seen entry whose meters are full; failing that, the entry
with the fewest failures that has no live block or lease; only when every entry is blocked or
leased do new clients go to overflow buckets, split by key bits, with normal budgets, never
larger. An entry that has used up its room creations is not clean. (c) A room full of
unidentified sockets closes one for a newcomer only if it belongs to the same client or has
been silent for at least 1.5 seconds, and that closure counts as a failure for its owner;
otherwise the newcomer is refused, not charged. (e) stands: counters stay in memory only. An
attacker who waits for an idle limiter to be dropped gets at worst about 500 guesses an hour,
about 2 in 100,000 over a 12-hour room against 1,000 clients; storing offenders would bring
back an attacker-driven storage write and long retention.

**D-084 · 2026-11-17 · Claude (under D-057)** — Pairing server limits, third review of C-03;
narrows D-083 (b). A limiter entry may be evicted only when its expired leases have first been
settled into failures, its failures after quiet-time decay are zero, it has no lease, live
probe or block, and its creation meter is full; least recently seen first; otherwise new
clients use the overflow buckets. The edge rate limit is keyed like the first-seen client
(IPv4 address or IPv6 /64), never by /48, so a university or carrier is not refused by it.
Accepted and recorded: anyone on the same address as a phone (a housemate, or a stranger on a
shared mobile-carrier address) can push out its fresh connection, since they could already
take the seats; and one abuser with several /64s in a carrier's /48 can keep that /48's joins
backed off.

**D-085 · 2026-11-17 · Claude (under D-057)** — Tabao Rush recipe rules the spec left open
(review of T-04); counts and timings provisional until seen on a screen. (a) A crate press
gives one raw portion. A station takes an ingredient only when that station is the next step
in its recipe, so food cannot be ruined by a press the game allowed. (b) Each rack holds one
kind of container, set by the level: plates, bowls or cups (4, 2 and 2 to start). A plate
holds 4 portions, a bowl 2, a cup 1. Things are combined only at plating counters; emptying a
container leaves it clean in hand; binning a dish leaves its container clean in hand. (c) The
order in a recipe applies to each ingredient, not across ingredients. Cucumber is chopped in
every dish that uses it, satay included. Char kway teow's noodles are chopped, then tossed in
the wok. Rojak's three ingredients are pineapple, turnip and cucumber. (d) Laksa: adding
noodles to finished broth completes it, with no second cooking. (e) Mix (rojak) and spread
(kaya toast) are circle work on the plating counter with the food already on its plate, 1 s,
shown as station progress like chopping; spread applies only to grilled bread; adding food
undoes a mix. (f) Kopi and teh are interchangeable. The kaya toast set is the toast on a plate
with a filled cup standing on the same plate; a plate may carry one cup. (g) A served dish's
containers come back dirty at the kitchen's return counter 5 s later, not in the server's
hand; a level has one return counter per kitchen, which holds any number and does not burn.
(h) Serving counters, racks and return counters do not burn. A dish caught in a station fire
loses its food and its container comes out dirty. (i) Rejection reasons, checked in this
order: nothing to serve, dirty, burnt, wrong container, not a dish we serve, missing
ingredient, extra ingredient, missing step (names the ingredient and the step), extra step
(names the ingredient); shown for 3 s; a rejected dish is never consumed or changed.

**D-086 · 2026-11-17 · Claude (under D-057)** — Reconnect (review of C-05). (a) PLAT-009 is
read as: a host reload loses the running match for all three games and restores the room,
seats, names, colours, teams, leader and the results of the last finished match, then returns
to the lobby. The game contract has no checkpoint or resume hook, so the totals of an
interrupted Peek Poker or Rabakz match are not kept; whether "scores so far" must include
them is OQ-031. (b) Reconnect data is stored in sessionStorage under
`kaki.phone-reconnect.v1` and `kaki.host-reconnect.v1` at format version 1; any other version
is discarded. Caps are 2 KiB per phone record and 64 KiB per host snapshot, and what is kept
is bounded (the last results only) so a legal session never reaches the cap; a good snapshot
is never erased because a newer one could not be written. (c) Host checkpoints write at most
once a second, coalesced, plus a flush at every page exit; nothing runs per step. (d) A host
restore waits 15 s for the server; a timeout or network error keeps the snapshot for another
attempt, and only a definitive refusal erases it. A snapshot older than the room's 12-hour
life is discarded. (e) A host reload keeps each phone's original drop time; only phones
connected at the reload start a new two-minute hold. (f) Phone retries start at 250 ms and
double to 8 s, each attempt abandoned after 15 s, within the two-minute hold; after the hold
the phone shows a distinct state with a rejoin action and retries slowly. (g) A code the
player has just entered always wins over a stored seat for another room. (h) The hold is
inclusive: a return at exactly 120,000 ms keeps the seat.

**D-087 · 2026-11-17 · Claude (under D-057)** — Tabao Rush recipes, second review of T-04;
adds to D-085. (a) A container takes food only when that food's steps are complete apart from
a final mix or spread, so half-prepared food cannot be trapped on a plate. Noodles may be
added to finished broth in the pot or in a bowl. (b) A cup can be lifted off a plate with an
empty-handed cross press at a plating counter; binning or washing a plate that carries a cup,
or a fire under it, puts the cup down beside it (in the cook's free hand, else on the
counter, else the floor), never fused to the plate. (c) Toast without its filled cup is
rejected as missing ingredient: drink.

**D-088 · 2026-11-17 · Claude (under D-057)** — The web app starts now, on the laptop, ahead
of the TV spike. `apps/web` is a Vite app with Preact for the shell screens (landing, lobby,
join, picker, results), as `ARCHITECTURE.md` §4 proposed; S-04 still decides the renderer for
game scenes from the TV numbers and may replace Preact if the TV cannot carry it (the shell is
small, so the risk is a few days). *Why now:* every rules-side dependency of the lobby and
join page has merged and the design gate is closed; waiting for the TV test would idle the
build. Dependencies added: `preact` (shell, about 5 KB compressed), `vite` and
`@preact/preset-vite` (build only), `qrcode-generator` (the lobby's QR code, MIT, no
dependencies, about 4 KB compressed; drawing a QR code by hand is not worth the risk of a code
phones cannot scan). Screens are checked by the integrator in a real browser through
Playwright until the UAT harness (F-07) exists.

**D-089 · 2026-11-17 · Claude (under D-057)** — Pairing server limits, fifth review of C-03.
A smoke test on a real local server showed that an idle limiter was dropped from memory after
about ten seconds, forgetting its failures (D-081 e assumed minutes). The limiter keeps its
counters in memory only and now holds each touched shard in memory for its ten-minute
retention window with one bounded timer. Whether Cloudflare's edge honours that is unproven
(the reviewer puts it at about 40%): before any public deploy, a staging probe must show a
shard still remembers failures after 590 seconds idle. If it does not, the fallback is to
persist only entries with confirmed failures or a live block, at most one coalesced write per
shard every 5 seconds, deleted at expiry. Even with no fix at all, 8-character codes hold
(about 2 in 10,000 over a 12-hour room against 1,000 clients at ten seconds). The keep-alive
is billed by duration: nothing for a few game nights a month, up to about US$60 a month if
every shard is kept alive all month, which an attacker can force with about 2,300 requests a
day; this is added to OQ-030. Lesson recorded: the pairing server's fakes are not the runtime;
every signal issue is smoke-tested on a real local server by the integrator before merge.

**D-090 · 2026-11-17 · Claude (under D-057)** — Host lobby (review of C-07): readings of
board 3 option 1B where it was silent or could not hold what the requirements ask. (a) The
seat strip is taller than on the board (about 305 px at 1080p against 178) so each seat can
show link quality, the leader mark and a held seat's countdown, which the board itself noted
it had no room for; the join panel and seat strip split 1.618 : 1. (b) Seat badges are 55 px
with a dark numeral and no white ring (board 6, D-056). A held seat keeps its seat colour as
a ring round a panel-coloured badge, with the name dimmed and the seconds left shown. (c) The
room code is shown as two groups of four at 233 px with a 144 px gap (on the large-gap scale,
D-050) and no letter-spacing: the board's .08em tracking does not fit eight characters. (d)
Empty seats show "Seat N" and "Scan to join" at the 3 m reading size. (e) Seat and panel
changes use a mask wipe so two labels never show in one place; the outgoing and incoming
halves share one duration, so this one exit is not 20% shorter. (f) A single join or leave
animates at once; the 30 ms stagger applies only when several seats change together. (g) The
landing page is not part of C-07: `/` is a plain link to the host page until X-01 builds
REL-002. (h) Status icons are inline SVG, not font glyphs, so a TV's font cannot drop them.
These are shown to Randy in the lobby artifact with the screenshots; he can overrule any.

**D-091 · 2026-11-17 · Claude (under D-057)** — Tabao Rush orders and scoring (review of
T-05). The spec gives no numbers for these, so all are provisional until the game can be
played (OQ-032). (a) Base points follow effort: kopi or teh 40, laksa 80, char kway teow 80,
chicken rice 100, satay 100, kaya toast set 120, rojak 120. The speed tip is up to 20% of the
base, in proportion to the patience left. No combos. (b) Patience depends on the dish: kopi or
teh 40 s, laksa and char kway teow 55 s, chicken rice and satay 60 s, kaya toast set and rojak
75 s; a warning in the last quarter. (c) An expired order loses 25% of its base points; the
score never goes below zero (a kind reading of "expired orders lose points" for a party
game). (d) Crew factor e = n^0.8 for n cooks (1, 1.74, 2.41, 3.03, 3.62, 4.19, 4.74, 5.28):
a new order every 24/e seconds; the queue holds n+1 orders, at most 6; star thresholds are
the level's solo base (200, 400, 600 by default) times e. (e) The n used for stars is the
time-weighted average of cooks over the round, so leaving near the end cannot earn stars. (f)
When the board is empty the next order arrives within 3 seconds. (g) The first order opens at
step zero; orders are drawn uniformly from the level's dishes on a seeded stream per kitchen;
service takes the oldest matching order, by seat, and beats expiry on the same step; kopi and
teh are one order; mid-round joiners watch and share the team score; no penalty for orders
still open at the end. (h) In versus each kitchen will scale by its own cooks (T-14).

**D-092 · 2026-11-17 · Claude (under D-057)** — Host lobby, second review of C-07. (a) Once
a room is open, a dropped connection to the pairing server never closes the links to the
phones: the host reconnects to the pairing server in place, paced by the one back-off (1 s
doubling to 30 s), and the game carries on over the open links. (b) A room is declared gone
only on the pairing server's own signed reply (a 404 carrying the header `X-Kaki-Room: gone`);
a bare 404 or any 5xx, for example from a proxy or a static host, means unreachable. (c) A
name too long for two lines at the 34 px reading size takes a third line at 34 px; names
never step down in size. (d) Seats in a state that is not live (restoring, unreachable,
expired, taken over) use the secondary ink at full opacity and keep their badges at full
strength; nothing is dimmed by opacity. Empty seats say "Scan to join" only while a join code
is on screen. (e) During a seat change the card's surface stays put and only its contents
wipe; the outgoing contents fade to the new token `--ka-opacity-ghost` (0.08). (f) New tokens
in `packages/ui`: `--ka-type-233` (the room code, DESIGN §4.3) and `--ka-opacity-ghost`.

**D-093 · 2026-11-17 · Claude (under D-057)** — Tabao Rush levels (review of T-06); all
provisional until levels are seen and played. (a) Screen fit: the validator reserves 144 px at
the bottom for the 5A HUD and 120 px for prop height at the fixed 120 px tile and 0.866 depth,
so a kitchen is at most 15 by 6 tiles; T-07 confirms this on a rendered frame. (b) Level
rounds are 60 to 600 s; the default stays 210 s. (c) Seed levels use the D-091 default solo
star base (200, 400, 600) until tuning (T-16); a level sets its own only with a stated reason.
(d) Supply: each kitchen starts with at least one clean container of every kind its dishes
need, and at least 6 clean plates when it serves plated dishes (the board's largest size);
supply beyond that is tuned in T-16. The "no reuse" plate rule is dropped. (e) Chopping: boards
times round length divided by 3 s must cover the worst chop count of the orders that can
arrive at 8 cooks; a floor for sanity, not a fairness proof. (f) Until the floor fallback is
made kitchen-aware (T-14), every level has one connected floor; split kitchens and separated
versus arenas wait for that. (g) A twist counts toward TR-050 only once its behaviour exists:
the validator refuses a twist kind that has no behaviour, which today is every kind, so the
seed levels declare none; the twist data shapes stay in the format for T-11. (h) Levels carry
a venue (kopitiam, hawker centre, pasar malam, zi char) for the background and music.
(i) Extinguisher within 15 four-way steps of every burnable station's access tile; fires only
on levels with ordinal 5 or more. (j) The two seed levels are test kitchens, not final
levels: with one chopping board and one plating counter, three stars is out of reach at
8 cooks; the eight real layouts are T-11's work.

**D-094 · 2026-11-17 · Claude (under D-057)** — Dependency: `playwright` 1.64.0 (dev only,
pinned, released 2026-10-07) for the UAT harness (F-07). It drives the Chromium build already
on this machine; nothing is added to any shipped bundle. WebKit and Firefox are not installed
yet: Safari and Firefox UAT wait for K-07 and Randy's real devices.

**D-095 · 2026-11-17 · Claude (under D-057)** — Phone join page (review of C-08). (a) The join
and lobby screens on the phone work held upright as well as sideways, stacking board 4's
landscape composition; the turn-sideways prompt applies only once a game controller is shown.
(b) An occupied seat whose link quality is not yet measured says "Connected" with no quality
icon; "Good", "Weak" and "Relayed" appear once measured (amends D-090). (c) A phone whose data
channel is lost paces its attempts to rejoin at 1 s doubling to 30 s, honouring Retry-After
capped at 30 s; each attempt's 15 s deadline starts after that wait; while a phone's data
channel is open it ignores whether the pairing server is reachable (amends D-086 f, extends
D-092 a to phones). (d) Host and controller share one entry for now; the 300 KB controller
budget counts that whole entry and everything in `public/`; the controller gets its own entry
before any game renderer or art joins the host's. (e) Changing a name is its own screen: the
name only, "Save name" and "Cancel"; it can never leave the room or dial another. (f) OQ-033
decided: while its links to the phones are open, a room the pairing server reports as gone,
expired or not allowed keeps playing. Phones with an open data channel ignore those reports.
The host stops offering the join code and offers a new room once the game is over. The phone
side is built in C-08; the host side is carried to C-10 and C-15. (g) Players are never told
about "the pairing server": the phone says "Can't reach the room. We'll keep trying."

**D-096 · 2026-11-17 · Claude under D-057** — (a) RZ-003 and RZ-030 still said Rabakz options
carry a letter; D-050 (Randy) and DESIGN.md §4.2 say shapes and colours with no letters, and the
phone row of the game spec already agreed. The two requirement lines are corrected to match
D-050; nothing is decided anew. Found by Codex stopping on the conflict in R-03. (b) Harness run
folders (`uat/evidence/<slice>/auto/`) are regenerable and are not tracked in git; evidence a
person has looked at is copied or kept in a named folder beside them. (c) `@kaki/game-rabakz`
depends on `preact` (the version the web app uses) and `@kaki/ui` for its big-screen view; games
draw their own host views (ARCHITECTURE §2).

**D-097 · 2026-11-17 · Claude under D-057** — Rabakz big screen, four design readings after the
R-03 review; a board with real screenshots of each goes to Randy so he can overrule. (a) No
clock-like icon beside "Thinking": a quarter-filled clock face reads as a countdown, and RZ-031
says no timer. Three dots are used. (b) The reveal does not re-lay the screen out. The options
stay in their 2 × 2 grid and the players strip stays where it is; each seat in the strip gains
its result (a tick and "+100", then its total). Nothing is unmounted and re-entered, which is
the "same object" rule, and it costs no layout work at the reveal. This replaces the
single-column options with a separate awards column. (c) Between questions the surfaces stay
and only their contents change, each with the outgoing copy ghosted and masked as the lobby
does (D-092 e); no full-frame crossfade, so old and new text are never both legible. (d) A
picture stays on screen at the reveal, which follows from (b). (e) RZ-031's "a correct answer
pulses once" means the correct option's card pulses once after its mark is revealed; the
outcome sentence does not pulse.

**D-098 · 2026-11-17 · Claude under D-057** — Game picker, readings after the C-09 review; the
start-screen board with real screenshots of each option goes to Randy so he can overrule.
(a) Start screen: "Who's in" is a seat strip along the bottom of the grown tile, as the lobby
does, with the picture and the game text above it split 1.618 : 1 (option B). Options A
(picture and text 1.618 : "Who's in" 1 at the side) and C (picture fills the tile, text on a
panel) are built behind a demo parameter only so the board can show them. Cost of all three:
DOM only; the per-game picture counts against PERF-022 and is preloaded with the host shell.
(b) The tile grows and shrinks by a clip mask at its final layout, as board 5 shows, never by
scaling its text; focus moves shift the surface by transform and crossfade the text. The mask's
frame time on the TV is unmeasured until PERF-002 is run on the set. (c) The other tiles stay
visible under the growing tile and are hidden when it finishes. (d) The picker and start
headers are 89 px, as board 3. (e) The leader's phone keeps four buttons (Previous, Next,
Select, Back) until the K track builds board 4's stick with Pick and Back; this is interim.
(f) With nobody seated the TV returns to the lobby, so the join code is always on screen.
(g) The picker's state machine lives in `packages/platform`, as ARCHITECTURE says.
(h) PLAT-020 is read as: the picker is opened from the lobby by the leader.

**D-099 · 2026-11-17 · Randy** — "go as recommended" on OQ-033. When the pairing server says a
room is gone while a game is running over working phone links (after an outage longer than
the ten-minute idle limit, or at the twelve-hour room limit), the host keeps the game and its
links, stops accepting new joins, and offers a new room after the game. This confirms
D-095 (f). The host does not yet do this: today it ends the room. It is built with C-10 and
C-15, where the session is wired to the host.

**D-100 · 2026-11-17 · Claude under D-057** — Where performance budgets are checked (OQ-034).
`pnpm verify` enforces the budgets it can measure without a browser (transfer sizes) and runs
a short smoke of the performance harness. Budgets that need a real browser (PERF-001, PERF-010,
PERF-012, PERF-030) are checked by `pnpm perf`, which the integrator runs on a quiet machine
before any slice that draws a game screen is closed; a failure there blocks the slice exactly
as a verify failure does. No budget is changed. "Not assessed" and "insufficient samples" are
never a pass. Sample minima (180 s and 600 visible frames inside the round for PERF-001; 100
observations for PERF-010 and PERF-012) are measurement-validity rules, not budgets. Randy may
overrule; rule 6's wording in CLAUDE.md is his to change and is left as it is.

**D-101 · 2026-11-17 · Claude under D-057** — Rabakz big screen, readings after the second
R-03 review; they go on the same board as D-097 for Randy to overrule. (a) An option's shape
sits to the left of its text in every layout, as on the phone's answer buttons (RZ-003); the
picture layout no longer puts it underneath. (b) Answers are at most one step of the TV type
scale below the prompt (prompt 89 px, answers 55 px), except where both are at the 34 px
floor; spare height goes to padding. This replaces the round-4 request to grow answer text to
89 px. (c) The correct card does not pulse when nobody got it right: the pulse confirms a
success. (d) While a question is open a seat that has answered correctly keeps reading
"Thinking" until the reveal, which follows within 0.25 s (RZ-006); only a wrong answer changes
a seat, to "Locked out" (RZ-005). The TV therefore never names a winner before the reveal.
(e) Each seat keeps its own place in the strip by seat number; a player leaving does not move
the others. (f) When the layout differs between two questions (a picture appears or goes, text
sizes change) the picture is masked in or out and the boxes move and resize with an
ease-in-out move over `duration.slow`; nothing cuts.

**D-102 · 2026-11-17 · Claude under D-057** — Rabakz answer size, replacing D-101 (b) after
the third R-03 review. Answers take the largest step of the TV type scale that fits, never
larger than the prompt and never more than one step below it (89/55, 55/55, 55/34, 34/34).
D-101 (b) alone left 34 px answers in 212 px cards beside a picture, which read small. Layout
changes between questions animate transform only, with boxes laid out at their final geometry
and size differences shown by a clip; nothing animates width, height or grid tracks, so the
cost on the TV is compositor work (still to be measured for PERF-002).


**D-103 · 2026-11-17 · Claude under D-057** — Performance harness readings (F-08). The
simulation layer measures complete default matches with seeded bots; this is repeatable
diagnostic coverage, not a claim that defaults or random bots exercise the busiest level. The
timing hook is opt-in and absent from production; game, controller and shell code may import
it only behind `import.meta.env.DEV`, and it adds no bytes to the wire. Frame budgets are
assessed only in a visible browser; headless frame timing is unproven. A run under detected
contention never reports a pass. The harness's bot driver bypasses `expandInput`, so its
allocation figures cannot justify a reused input buffer; that is decided from a real session.

**D-104 · 2026-11-17 · Claude under D-057** — Game picker, readings after the second C-09
review. (a) Picker and start headers are 89 px, or 55 px when 89 does not fit; never a size
between the two. (b) Content inside a tile changes with the lobby's timing (D-092 e): both
masks start together on one boundary, the outgoing copy starts at full ink, and a tile whose
content does not change does not wipe. (c) The host accepts one picker press per `fast`
duration; presses inside the window are kept as a bounded count of Previous/Next plus the
latest of Select, Back and Start, and applied in order when it ends. (d) A failed game load
is an explicit flag in `picker-state`, not read from the message text. (e) The host event
that set the leader directly is removed; leadership passes on only through the existing
election when the leader leaves (PLAT-006). (f) The leader's lobby phone reads "Pick a game
when everyone's in."; other phones read "Waiting for the leader to pick a game."
(g) The `picker-input` and `picker-state` messages on the control channel are accepted as
part of the protocol contract; ARCHITECTURE §5 records them when C-09 merges.

**D-105 · 2026-11-17 · Claude under D-057** — Rabakz big screen, after the round-7 browser
check. (a) When the layout differs between two questions (picture to no picture, or a
different text size), nothing travels: the whole question block (picture, prompt, four
answers) changes by one mask boundary, old wiped out and new wiped in together, at final
layout. This replaces the transform-only rule in D-102 for layout changes; D-102's size rule
stands. (b) The success pulse is one pulse of the whole correct card's edge that ends
invisible; nothing is left drawn on the card. (c) A winner's tick sits after the name, so the
name does not move when it appears.

**D-106 · 2026-11-17 · Claude under D-057** — Rabakz big screen, after the fourth R-03 review.
(a) The success pulse is drawn in the correct option's own shape colour, 8 px wide, peaking at
full strength: the panel-ink ring built under D-105 b could not be seen (1.16 : 1 against the
background). Accent and secondary pink are not used; they are under 2 : 1 on the card.
(b) The block wipe of D-105 a plays only when the question itself changes. A re-measure of the
same question (fonts arriving, the first measurement replacing the estimate) installs the new
layout with no motion. (c) The winner's tick always occupies its place after the name and is
masked in at the reveal, so a name that fills its line never re-wraps.

**D-107 · 2026-11-17 · Claude under D-057** — Game picker, after the browser runs of fix
rounds 6 to 9. (a) When a tile grows to the start screen or shrinks back, its two layouts sit
either side of one boundary, so the game's title may be visible once in each for part of the
move; text from the two layouts never overlaps. During a focus move a tile shows one copy of
its text at full strength. This matches D-105 a for Rabakz. (b) The picker stage's columns are
`minmax(0, 1.618fr) minmax(0, 1fr)`: a golden split that does not grow with its content.

**D-108 · 2026-11-17 · Claude under D-057** — Game picker, after the third C-09 review.
(a) The TV heading and its status line change together by the lobby's shared-boundary mask,
never by a cross-fade: two sentences are never printed over each other. (b) The picker header
always reserves one 89 px line plus the status line; a 55 px heading sits inside that band, so
the tile area is in the same place on the picker and on the start screen. (c) Queued Previous
and Next presses count modulo the number of games. Inside one `fast` window only the latest
of Select, Back and Start is kept; that is accepted at human tap rates. (d) The interrupted-
move check does not depend on frame time: pause, read the rectangles, send the interrupting
change, seek the new animations to their start, and require the rectangles to match within
2 px.


**D-109 · 2026-11-17 · Randy** — Picker start screen: layout **B** ("go with B", chosen from the board) (picture on
the left, name, blurb and range beside it sharing its bottom edge, picture : text 1.618 : 1,
seats in one row of cards along the bottom). Options A (seat list first; as built its picture
does not show) and C (full-width picture under a text panel) stay in the development build
only. Board: https://claude.ai/artifact/AXvSn8hMfRUDRa6g1A67E8. Why: B keeps the picker tile's
reading order, so nothing jumps during the grow, and it is the golden-ratio variant. None of the three is measured for frame time yet (PERF-001, PERF-002).

**D-110 · 2026-11-17 · Claude (integrator)** — `packages/controller-kit` depends on `preact`
11.2.0, the same pinned version `apps/web` and `games/rabakz` use, so the kit can render its
shell; one Preact instance in the bundle. No new package enters the repository.

**D-111 · 2026-11-17 · Claude (under D-057)** — Lower-detail benchmark measurement rule
(PERF-001, PERF-002; no budget changed). Frame times come from the browser's frame timestamps
(the `requestAnimationFrame` argument, as `pnpm perf` uses), not a clock read in the callback;
the first frames after the lobby paints are discarded; a frame counts as dropped when its
interval exceeds 1.5 × the display's median interval. "Full" holds when the share of dropped
frames meets the 95th-percentile reading of the budget (at most 5 % dropped) and no frame
exceeds 50 ms; otherwise "lower" is checked the same way against 100 ms. Why: a fixed 16.7 ms
line misjudges healthy 60 Hz screens because timers are rounded to 1 ms or 0.1 ms (C-13 review
M1). The benchmark takes an injected workload; until one exists, "auto" means full (OQ-036).

**D-112 · 2026-11-17 · Claude (under D-057)** — Rabakz scoreboard layout A, one list (RZ-032;
R-05). Board: https://claude.ai/artifact/HG5drCHVwaxyf5V5CGBC1S (A, B golden-ratio variant,
C). Why: placing order reads top to bottom, names are largest (55 px at 1080p), and nothing
wraps or clips at 720p, 1080p or 4K; B breaks long names mid-word and its list sits at the
reading floor; C puts last place beside first. The podium is common to all three. Randy may
overrule; B and C stay buildable from the round-4 commit.

**D-113 · 2026-11-17 · Claude (under D-057)** — Addendum to D-111 (PERF-002; no budget
changed). "Full" also requires the median frame interval under the workload to be at most
20.5 ms, so a steady 50 Hz display (TVs in 50 Hz mode) counts as full and a steady 40 to 48 Hz
cadence does not. The refresh rate kept with a cached verdict is the idle display cadence,
measured by a short idle probe, never the median under the workload, so a slow TV that drops
frames under load is not re-measured at every launch (C-13 review round 2).

**D-114 · 2026-11-17 · Randy** — "one list, but make it more aesthetic please. do with ur
design judgement and my rules." Confirms D-112 (layout A) and asks for a visual pass decided by
Claude within DESIGN.md §1 to §4. Direction taken (Claude): rows sit on the plum, not in eight
white slabs; the leader's row alone is a white panel; columns split name : score at 1.618 : 1;
"pts" moves to one column heading; the change since the last scoreboard is a rose chip; team
totals as two panels split 1.618 : 1, leader first; rows enter staggered 30 ms, ease-out,
and each non-zero chip pulses once; reduced motion drops both. The result is published as an
artifact for Randy to see.

**D-115 · 2026-11-17 · Claude (under D-057)** — How PERF-020 (controller download) is measured;
the 300 KB budget is unchanged. The check counts what a phone loads: `index.html`, the entry
chunk and its static import closure (JS, CSS and assets, following `imports` recursively in
the Vite manifest), any chunk the phone route imports, and public files that CSS references.
It does not follow host-only dynamic imports (game modules, the TV game screens, the Rabakz
question bank). Why: counting the whole deploy put the controller at 291 KB when a phone
downloads 67 KB (C-16 review), and would fail as the bank grows. The whole deploy stays
measured against PERF-022.

**D-116 · 2026-11-17 · Claude (under D-057)** — The floating stick near the edge of its
area. The base is drawn where the thumb lands but kept wholly inside the area (inset by the
outline), so it never spills off the phone or over the header. The knob is always under the
thumb, from the first frame: a landing near the edge, where the base had to be moved inward,
reads at once as a push toward that edge, and every later move is measured from the same
base. In the deep corner, more than one radius from the moved base, the knob is rubber-banded
toward the thumb like any drag past the edge. Why: K-02's re-review found that measuring from the moved base but starting at zero made
the first 1 px move jump from nothing to nearly full speed, which breaks "tracks the thumb
1:1" (CTRL-005). The other choice, not moving the base, puts part of it off the phone for a
thumb within 42 px of the edge and cannot reach full deflection toward that edge.

**D-117 · 2026-11-17 · Claude** (under D-057) — The phone's play area keeps a 13 px margin to
its edges and to the "Keep your screen on" note. Where a layout cannot keep 13 px at the
control floors (D-051, D-053), the margin falls to the next spacing step, 8 px, and never
lower; controls never shrink below their floors to keep a margin. Why: K-04's UAT found the
Peek Poker grid (4 × 4 cells of 89 × 68 px) and its Lock in fit a 667 × 375 phone only with an
8 px margin above the note; the alternatives were cells below the D-053 floor or dropping the
note.

**D-118 · 2026-11-17 · Claude** (under D-057) — Extends D-117: when a layout still does not fit
at the floors with an 8 px margin, the gaps between controls fall from 8 px to 5 px (the next
spacing step), and never lower. Controls still never go below their floors. Why: measured on
a 667 × 375 phone, the play area is 307 px tall and the Peek Poker grid needs
8 + 4 × 68 + 3 × 8 + 8 = 312 px; with 5 px gaps it needs 303 px.

**D-119 · 2026-11-17 · Claude** (under D-057) — Relay cut-off when usage is unknown (NET-003,
NET-004). The pairing server withholds relay access only when the last good usage reading is
over the monthly limit, or when no good reading has arrived for longer than the grace period
(30 minutes) since the meter's last good reading or first attempt. While there is no reading
yet, it offers the relay and retries the reading on a short backoff. Why: C-02's review found
that failing closed on "no reading yet" left every new room's host without a relay and let one
failed analytics call withhold it for ten minutes, which defeats NET-003 (a MUST). The cost
risk is bounded: the 800 GB limit sits 200 GB under the 1,000 GB monthly free allowance
(D-014), far more than a few unknown minutes can use.

**D-120 · 2026-11-17 · Claude** (under D-057) — Console results (board 3) use the board's
sizes: the chip names the game ("Rabakz · final scores") and sits at its own width; headline
144 px, winner badge 144 px, score 89 px mono bold. A tie headline ("A and B share first",
"3 players share first") keeps 144 px when it fits in three lines in the winner column and
otherwise steps down to 89 px, never smaller. Why: C-16's re-review found the build at
89/55/55 with a full-width chip, against board 3 as chosen (D-046), and long tie headlines
cannot hold 144 px in a 1 : 1.618 column.

**D-121 · 2026-11-17 · Claude** (under D-057) — Narrows D-119. Relay usage is metered per room
in v1, so "no reading yet" is every new room's starting state. A room's first relay grant
waits up to 2 seconds for the room's first usage reading: it offers the relay if that reading
is under the limit, fails, or times out, and withholds it if the reading is over the limit.
After that, D-119 applies. A shared account-wide meter stays a later choice. Why: C-02's
re-review showed that under D-119 alone every new room's host got a one-hour relay credential
even when the account was far over the limit, so any room shorter than an hour bypassed
NET-004.

**D-122 · 2026-11-17 · Randy** — Phones are for controls only; the main play area is on the big
screen (as designed). On phones narrower than 844 px, face buttons scale down with the phone
but never below 89 px; at 844 px and wider the 110 px floor of D-051 holds. Peek Poker keeps
its private pick grid on the phone (PP-005): it is a control, only private. Asked because
board 4's square diamond with 110 px faces needs 316 px of height and a 667 × 375 phone's play
area is 307 px (K-04). C-16 and R-05, past three review rounds, continue to a final review
(Randy's answer to the WORKFLOW §4 stop).

**D-123 · 2026-11-17 · Claude** (under D-057) — Amends D-120: any console results headline,
not only a tie, steps from 144 px to 89 px when the winner column would otherwise overflow the
screen's safe area; never smaller than 89 px. Why: C-16's final review rendered "Cloud Noodle
wins!" at 144 px and the column ran to 1,139 px on a 1080 px screen, cutting off "Back to game
picker".

**D-124 · 2026-11-17 · Claude** (under D-057) — Browser-backed unit tests (a Vitest test that
launches headless Chromium, such as `apps/web/src/Overlap.dom.test.ts`) are allowed in the main
suite when a DOM behaviour cannot be tested otherwise (no DOM environment in Vitest). Costs
accepted: `pnpm verify` needs Playwright's Chromium installed, as `pnpm uat` already does; Codex's
sandbox cannot launch Chromium, so issue briefs exclude these files and the integrator runs
them. Each such test must close its browser in a `finally`.

**D-125 · 2026-11-17 · Claude** (under D-057) — Disabled controls on the phone use an opaque,
greyed fill and reduced-contrast ink from `@kaki/ui` tokens: no CSS `filter` and no element
opacity, so the play surface's dots never show through and nothing is drawn with a runtime
filter. Board 4's `.lockd` look (opacity 0.4 plus `grayscale(1)`) cannot meet PERFORMANCE §2
("no blur or filter effects at runtime"), so it is ruled out by that budget, and it stacked
the surface treatment under the control (DESIGN §2). Found by K-04's re-review. To be shown
to Randy as a before and after.

**D-126 · 2026-11-17 · Claude** (Randy approved the round) — Amends D-123. The console results
winner column must end inside the 55 px safe margin in every case, including a tie of two
12-character names with the keyboard hint. It frees room in this order: the keyboard hint sits on
one line and the two action hints share a row; then the headline steps 144 → 89 → 55 px (55 is
the last step on the type scale and only used when 89 cannot fit). The fit compares the column's
first and last child with the safe area rather than `scrollHeight`. The ranking list fits its
grid row (`minmax(0, 1fr)`) at 8 players in teams by using smaller spacing-scale gaps.

**D-127 · 2026-11-17 · Claude** (under D-057) — A phone control label that does not fit its
button at 34 px steps down to 21 px (the next step on the type scale) and wraps there; the layout
engine decides the size by measurement before the control is shown. Rabakz answers run to 40
characters (RZ-022), and "Modular Interface of Digital Instruments" breaks into four lines at
34 px in a 667 px phone's answer button and is cut. Same approach as D-123 on the TV. Found by
K-04's final review and confirmed in the UAT.

**D-128 · 2026-11-17 · Randy** — "Can you do this autonomously. Make ur decisions based on your
jusgement", asked whether R-05 gets another round past WORKFLOW §4's three rounds. Claude now
decides what happens to an issue whose review does not converge (one more round, a follow-up
issue, or parking it), logs the choice here, and reports it. Claude's choices under it:
R-05 gets one small round 22 (prompt descender room and prompt overflow checks); C-02 gets a
round 4 (credentials fetched only after validation, role and rate checks, at most one in flight
per socket; the first-reading wait once per room, kept across hibernation); if C-02's fourth
review is not clean it is parked as a follow-up before release (M8), since the relay is only
needed for phones that cannot connect directly.

**D-129 · 2026-11-17 · Claude** (under D-057) — How PERF-020's start-up half is measured until a
real phone is tested. "A mid-range phone on Wi-Fi" is Chromium with CPU throttling 4× (the
common mid-tier mobile setting) and a network of 30 Mbit/s down, 15 Mbit/s up and 20 ms
round-trip, loading the production build with an empty cache, at 844 × 390. "Interactive" is the
first moment the controller's controls are drawn and a press on one is accepted (its handler
fires). The check takes the median of 5 cold loads and fails above 2 s. Randy's real-phone test
(K-07, X-09) remains the final word.

**D-130 · 2026-11-17 · Claude** (under D-057, D-128) — On the console results screen, names in the
ranking list stay on one line and end with an ellipsis when they do not fit; the two columns keep
their 1 : 1.618 split whatever the names (`minmax(0, …)` tracks), so a wide 12-character name
cannot squeeze the winner column. The winner column shows at most 4 player badges; with 5 or
more tied it shows 3 badges and a "+N" badge. The keyboard hint reads "Enter: play again · Esc:
game picker". Found by C-16's round 8 review with valid wide-script names (for example Tamil
conjuncts) at the 12-character limit.

**D-131 · 2026-11-17 · Claude** (under D-057, D-128) — Amends D-126. If the console results
headline does not fit at 55 px with the names in it, it drops the names: a tie reads "N players
share first" (team ties "Both teams share first" stays as is if it fits) and a single winner reads
"Player N wins!" with their seat number, stepping 144 → 89 → 55 again for that text. The names
are always in the ranking list beside it. This bounds the column for any valid name, whatever
the script. The "+N" badge for 5 or more tied players uses the chip's brown surface, not the
accent, so it never reads as a seat colour, and is announced as "N more players".

**D-132 · 2026-11-17 · Claude** (under D-057) — Private panel space on the phone. Controls keep
priority: the layout engine places the game's controls first (with D-118's margins and gaps), and
the private panel takes the space left. In that space the panel grows its parts to fill it like
the engine does (cards up to their natural size, text at 34 px); when space is short, panel text
steps 34 → 21 → 13 px and wraps, and cards scale down to a 55 px-wide floor. A layout plus private
view that still cannot fit at a 667 × 307 play area fails the game conformance check, so a game can
never send it, and the engine never draws a clipped panel.

**D-133 · 2026-11-17 · Claude** (under D-057, pending Randy) — Peek Poker card faces (A-08,
PP-030, PP-031): **B "TV first"**: one large central rank over a large suit, small two-way
corner indices, standard card proportions, on the K1 baize with the decided red back and the 3A
flip (face changes edge-on). Chosen over A "Classic" (small pips and indices read poorly at 3 m)
and C "Golden ratio" (the 1 : 1.618 card is narrower on the table, so its rank is smaller at the
same table height: 127 vs 150 px wide at 1080p). Board: https://claude.ai/artifact/8TSLSGhH5LdE2EvdxfyjQy
(Blender renders from tools/blender/board_cards.py in the A-08 branch). Cost: one 2048² atlas page,
about 1.2 MB lossless WebP estimated, within budget. Randy may overrule; until then A-08 stage 2
builds the 52 faces in style B.
*Amended 2026-11-17:* the stage 2 court cards add a small original badge under the suit (Jack a
pennant, Queen a crown, King a battlement), not shown on the options board. Final rendered deck,
with a greyscale check, the back and the flip frames: https://claude.ai/artifact/NTj5G1mnDyevGiVNeF9RRX.
Measured cost: one atlas 1926 × 1100, 958 KB; 8.5 MB decoded plus 2.1 MB half size.

**D-134 · 2026-11-18 · Claude** (under D-057) — Tabao Rush order-card icons (A-04) use a 55°
camera tilt instead of the decided 60° (D-044). They are HUD pictures on a white ticket, never
beside kitchen sprites, and from 60° flat food (noodles, rice, cucumber) read as slivers at 55 px.
Recorded as an exception in ART-PIPELINE §3.

**D-135 · 2026-11-18 · Claude** (under D-128) — A-04 continues to a sixth Codex round past PLAN
§5's three-round limit: every round has fixed real, measured problems and none has repeated. Two
scope choices from the round-5 review: (1) the 12 ingredient-step icons are dropped; the decided
order card 5A shows one 55 px dish icon with the steps as 21 px text, and step icons would need
Randy's word; (2) partly built dishes are drawn by the renderer from container sprites plus
smaller portion sprites placed on named slot anchors per container in the asset manifest, so
every reachable partial plate can be shown (T-07 consumes them).

**D-136 · 2026-11-18 · Claude** (Randy asked why the renderer could not be unblocked with his
laptop) — S-03 is split. PERF-001 (MUST) is measured on the dev Mac in Chrome at 1080p; the TV's
own browser is REL-005 (SHOULD), and a laptop on HDMI is its supported fallback (PRD REL-005). So
the renderer decision (S-04) needs only the laptop numbers: S-03a builds the sprite stress page and
runs it on the dev Mac now; S-03b runs the same page on the TCL Q65 when Randy is at the TV and
decides only whether the TV can run the host without the laptop. Dependency for the spike:
`pixi.js` 8.22.0 (exact, released 2026-10-01, more than two weeks old), a root dev dependency
until S-04 decides where the renderer lives.

**D-137 · 2026-11-18 · Claude** (S-04, from the S-03a numbers on the dev Mac, D-128) — Tabao Rush
draws with **PixiJS 8** (WebGL), not Canvas 2D; Preact stays the shell. Stress scene: 8 cooks (body,
tinted apron mask, head), 80 items, 10 stations with timer rings, 6 order cards, fire, 200
particles, HUD digits; 1920 × 1080; headed Playwright Chromium; 60 s capture after 5 s warm-up.
| Run | Frames over 16.7 ms p99 / max | Update + draw work median / p99 / max | Draw calls | Decoded textures |
|---|---|---|---|---|
| PixiJS full | 18.7 / 18.8 ms, 0 long tasks | 0.5 / 0.8 / 1.1 ms | 1 | 126 MB |
| PixiJS lower | 18.7 / 18.8 ms, 0 long tasks | 0.5 / 0.7 / 1.1 ms | 1 | 38 MB |
| Canvas full | 18.7 / 18.8 ms, 0 long tasks | 0.9 / 1.7 / 2.3 ms | 373 | 663 MB |
| Canvas lower | 18.7 / 18.8 ms, 0 long tasks | 0.6 / 1.2 / 1.4 ms | 273 | 172 MB |
Both keep every frame on the display's refresh (measured 59.9 Hz in the test browser although macOS
reports 75 Hz), so frame intervals do not separate them. They are separated by memory: Canvas keeps
a tinted copy of every cook sprite per player, 663 MB at full detail against the 256 MB of
PERF-024, while PixiJS tints on the GPU (126 MB). PixiJS also does about half the main-thread work
with one batched draw call. Cost: 168 KB gzip (657 KB raw) against Canvas's 1 KB, loaded only when
Tabao Rush starts (lazy chunk, as the Rabakz bank), so the first page (PERF-022) is unchanged.
Caveats: the work time is main-thread submission, not GPU completion; the frame intervals are the
end-to-end check and show no frame over 18.8 ms. S-03b (the TV's own browser) still decides only
TV against laptop on HDMI. `pixi.js` moves from a root dev dependency to a dependency of the Tabao
Rush renderer package when T-07 builds it.

**D-138 · 2026-11-18 · Claude** (D-057) — A-04 gets a seventh round. The round-6 re-review found
three measurable defects: the rim ink is written as linear values into a display-space buffer, so
every outline is (6, 4, 2) instead of #2B2118; the portion composition check passes with no portions
at all (the container alone scores IoU 1.0) and composed partial dishes carry their own rims and a
different layer order from the finished dish; and the slice note describes an earlier tree. These
change what players see on every plate, so they are fixed before merge rather than deferred. Round 7
also covers the loose drink that looks served, rojak sauce drawn before the mix, the kway teow
pinwheel, the faint burnt-rice cue, per-container anchors and a guard that the item folder matches
the manifest. Test-only rule duplication and the non-atomic publish are recorded as known limits.

**D-139 · 2026-11-18 · Claude** (correcting D-137 after the S-03a review) — PixiJS 8 stays the Tabao
Rush renderer, but D-137's main reason was wrong. The Canvas run's 663 MB came from the spike's
tinting method (a full tinted copy of every mask page for all 8 seats), not from Canvas 2D:
recolouring each cook's current frame into one small scratch canvas when it changes would cost
about 0.66 MB and put Canvas near PixiJS's 126 MB. The decoded figures are estimates computed by the
page, and PixiJS's real footprint is nearer twice 126 MB (source canvases plus GPU textures), which
still fits PERF-024. The reasons that stand: about half the main-thread work (0.5 against 0.9 ms
median, 0.8 against 1.7 ms p99), one batched draw against 373 per frame, and tinting on the GPU
through the mask sprite with no per-cook canvases to manage. The cost is about 150 KB gzip (an
app-mode build of the spike entry; the 168 KB in D-137 was a lib-mode upper bound), to be loaded
as a lazy chunk when Tabao Rush starts; that chunk is a plan for T-07, not built yet. Also
corrected: the frame columns in D-137 are animation-callback intervals, p95 was 18.6 to 18.7 ms in
every run (OQ-038), and the lower-detail rows did not hold 30 fps (the cap rendered about 26 fps; to
be fixed before S-03b).

**D-140 · 2026-11-18 · Claude** (D-057) — K-05 gets a seventh round, past the three-round limit: the
round-6 re-review found that a second private-view change during a crossfade leaves a stray copy of
the dotted background on live blocks for good (236 of 624 live transitions), a visible defect on
every phone. Two smaller choices decided by recommendation: (1) the labels in one private grid step
down together, to the largest size that fits every label, so peers keep one size (today "Dumplings"
drops to 13 px beside five labels at 34 px); option buttons keep stepping one by one, since each is
its own control. (2) A card-perspective token of 610 px joins `@kaki/ui`, matching the approved
specimen, and replaces the one-off value in the private panel.

**D-141 · 2026-11-18 · Claude** (D-057) — A-04 gets an eighth round. The round-7 re-review confirmed
the rim colour, layering, unique states and pruning, but found visible defects players would meet:
the finished rojak reads as a grid of dark bars and hides the turnip; a served teh is drawn as kopi
when the kopi-teh order completes; drinks placed on a plate become a puddle and plate-sized food
overflows a cup; the completion check still passes a dish with one portion missing. Decided by
recommendation: drinks on a plate use the side-cup slot (no liquid on a bare plate); food in a cup
or bowl is drawn scaled to that container's opening; kopi-teh is drawn as the cup plus the served
drink's portion, never from one fixed dish sprite. If round 8 is not clean on these, the remaining
art polish moves to a follow-up issue and A-04 merges with the defects listed.

**D-142 · 2026-11-18 · Randy** — "Please always go with ur recommendations." Claude now goes ahead
with its own recommendation on design and graphics choices too, after building the options as an
artifact (CLAUDE.md rule 5), instead of waiting; Randy may overrule after seeing it. Under this rule
OQ-039 is decided as recommended: cook sprites are stored as lossy WebP at quality 90 with exact
alpha (outlines, colour masks and head anchors unchanged), projected at about 2.0 MB for all cook
animations against the 8 MB level budget (PERF-023); other sprites stay as ART-PIPELINE says.
Comparison: https://claude.ai/artifact/8zURC9EUKPeTs6Ajaxz5t6.

**D-143 · 2026-11-18 · Randy** — Team setup (PLAT-025, C-11) uses **option C, the centre line**: one
field split down the middle by a line, red on the left and blue on the right, players standing on
their side; the phone shows two big team buttons in equal halves, the current team ticked. Board:
https://claude.ai/artifact/DdL2wQo2WGzNH6aFnfHCZw (Claude had recommended B; Randy chose C).

**D-144 · 2026-11-18 · Claude** (correcting D-142's numbers after the S-02 re-review) — The cook
storage comparison was first encoded with Pillow's default exact=False, which the pipeline never
uses (`tools/assets/pipeline.py` emits WebP with exact=True so the edge padding under transparent
pixels survives). With the pipeline's settings, all cook animations project to about 7.3 MB stored
lossless as packed today (not 6.3 MB) and about 2.8 MB at lossy quality 90 (not 2.0 MB); quality 95
is 3.4 MB and quality 85 is 2.5 MB. Option C, lossy quality 90 with exact colour and alpha quality
100, still stands. "Outlines exact" was an overclaim: transparency, masks and anchors are exact, but
opaque edge pixels may change by up to 44 levels. The comparison page now shows images made with
the pipeline's settings: https://claude.ai/artifact/8zURC9EUKPeTs6Ajaxz5t6.

**D-145 · 2026-11-18 · Claude** (under D-057 and D-141) — A-04's round-8 review was not clean.
Two defects break decided behaviour or the art's own frame, so they are fixed before merge in a
round 9: kaya toast served with teh was drawn with kopi, and the side cup and satay sticks crossed
the plate rim with no check to catch it. The rest is polish and moves to a follow-up issue, A-10:
rojak not yet a mixed heap; chopped turnip reading as white shards; chicken in chicken rice reading
as pegs at 1×; broth on a bare plate drawn as a puddle; food in a cup barely legible at 0.36
scale; the new manifest fields (servedComposition, contentCompositions, portionScales) to be
documented in ART-PIPELINE.md and read by the game (track T); and a 1× evidence sheet.

**D-146 · 2026-11-18 · Claude** (under D-057) — The Tabao Rush recipe conformance test
(`games/tabao-rush/src/rules/recipes.test.ts`) runs the kit at 1 and 8 cooks in one run, which the
kit requires (its min-players rule fails if the two counts are split), and takes about 90 s of
work. At a 120 s test-runner timeout it failed under load (121.5 s), so its timeout is now 240 s.
This is the test runner's limit, not a performance budget in PERFORMANCE.md; no budget changes.

**D-147 · 2026-11-18 · Claude** (under D-142) — Peek Poker card ranks (A-08) are drawn in
**JetBrains Mono Bold**, DESIGN §4.2's numbers face, instead of Blender's built-in font, which the
A-08 review found was an unrecorded one-off. Source asset, not a code dependency:
`assets/src/fonts/jetbrains-mono/JetBrainsMono-Bold.ttf` from the official JetBrains Mono v2.304
release, with its `OFL.txt` (SIL Open Font License 1.1) beside it; the file is identical to the one
installed on the build Mac. D-133 is settled under D-142 (no longer pending Randy). Randy may
overrule after seeing the re-rendered deck.

**D-148 · 2026-11-18 · Claude** (under D-142; amends D-129, keeps D-100) — PERF-020's start-up half
(median of 5 throttled cold loads of the join page, K-08) runs as a **blocking `pnpm perf` check**
(`pnpm perf -- controller`), not inside `pnpm verify`. Reasons from the K-08 review: verify must
stay browser-free under D-100; Chromium cannot launch in the Codex sandbox, so a browser step in
verify would fail every issue agent's verify; and a fixed port and the 3 GB browser memory gate
would make verify fail for reasons unrelated to the budget. PERF-020's size half (transfer size of
the phone closure, D-115) stays in verify. Like other browser budgets, the start-up check must
pass before any slice that changes the phone's entry or controller closes; the budget itself is
unchanged.

**D-149 · 2026-11-18 · Claude** (under D-142; C-11 review) — Team setup (PLAT-025, D-143):
(1) No team-size cap. The only rule is that each team keeps at least one player; teams may be
uneven (TR-052). The cap of ceil(max / 2) came from Claude's C-11 brief, not from a requirement,
and at 8 players it refused every switch and leader move. (2) Only a chip that changes team moves
on an arc; chips that reflow within their side move straight with ease-in-out, so nothing passes
its rest position. (3) The TV screen uses the TV type and spacing tokens at true size, not a one-off
`zoom` scaling the 1440 board to 1920. (4) A refused switch is shown only on the phone that tapped,
naming the team, with the picker's refusal style; the TV names who was refused. Showing team names
and colours during play is for the games' own issues (Rabakz R-04/R-08, Tabao Rush versus), so
PLAT-025 stays in progress after C-11.

**D-150 · 2026-11-18 · Claude** (under D-142; replaces D-147's face) — Peek Poker card ranks are
drawn in **DM Sans Bold** (DESIGN §4.2, "DM Sans for everything else"), not JetBrains Mono Bold.
The re-review of the JetBrains render measured the cost: bold monospaced glyphs are width-limited,
so central ranks fell from 49 to 40 px cap height (33–36 px for the 10s) and the 10's corner index
fell to 8 px, unreadable; the dotted zero also read as a code font. DM Sans is narrower, is the face
the phone already uses for card text, and has a plain zero. Source asset:
`assets/src/fonts/dm-sans/DMSans-Bold.ttf` from the official googlefonts/dm-fonts repository with
its `OFL.txt` (SIL Open Font License 1.1); the JetBrains files are removed from A-08. Indices are
fitted to one shared cap height and central ranks to another, the 10 included.

**D-151 · 2026-11-18 · Claude** (under D-142; C-11 round-4 review) — Team setup's Start button, on
the TV and the phone, uses the console primary (kopi brown `--ka-chip`, as on "Ready to start?"),
not team red: on the phone a red Start sits under the Red team button and reads as a team colour.
Team colours are kept for teams only. Notices on the team phone (moved by the leader, refusals) use
21 px. Follow-up C-11b (backlog): grid labels that wrap at 667 and 844, and a visible pressed style
for the Teams on/off toggle.

**D-150 correction · 2026-11-18 · Claude** — D-150's measurements came from a mismeasured review.
Measured by ink runs at 1080p: round 2 (Blender's default font) central ranks 56 px, indices
24–27 px (10: 21 px); JetBrains Mono central 56 px (the 10: 44 px), indices 15–19 px (the 10:
7 px); DM Sans central 49 px and indices 19 px for every rank. The decision stands (one shared
height, a readable 10 index, a plain zero, the phone's face); its cost is central ranks 56 → 49 px
and indices 24–27 → 19 px, both above PP-030 and the 34 px rule.

**D-133 cost note · 2026-11-18 · Claude** — D-133's "958 KB" was an earlier render. The merged deck
(A-08, DM Sans, D-150): one atlas 1926 × 1100, 915,460 B full and 235,742 B half transferred;
8,474,400 + 2,118,600 B decoded. PERF-023/024 pass.

**D-152 · 2026-11-18 · Claude** (under D-142; C-11b review) — The leader's "Move players" grid on
the phone is split into two labelled halves, Red and Blue, mirroring the TV's centre line (D-143),
so a player's team reads without colour (DESIGN §6). Each grid button fits its own label, as D-140
says for option buttons, and never goes below 21 px: a name that does not fit at 21 px is truncated
with an ellipsis (the full name is in its accessible label and on the TV). The pressed Teams toggle
does not use the console-primary fill (that reads as a second Start); it shows a tick with the
panel's pressed style.

**D-153 · 2026-11-18 · Claude** (under D-142; C-11b review) — A refusal in the leader's "Move
players" grid takes the heading row. At 667 × 375 with 8 players in a 7-1 split the grid needs
three rows, so a refusal line between the grid and the action row pushed Done, Back and Start past
the phone's clipped edge (C-11b rounds 5 and 6). While a refusal shows it replaces the "Red" and
"Blue" heading row at the same height, so the grid and the action row never move; the headings
return 3 seconds later or at the next tap. Each button still names its team in its accessible
label and carries the team colour on its seat disc. Crossfade with the motion tokens; reduced
motion swaps instantly. Randy may overrule.

**D-154 · 2026-11-18 · Claude** (under D-142; A-02 plan) — The cook body (A-02). (1) Walk cadence:
stride 0.72 tiles per 8-frame cycle with 3 stance frames and one flight frame per step (option B of
three: 0.48 / 0.72 / 0.96), so feet do not slide at the provisional 3 tiles/s (D-072) while the
legs reach only slightly further than the S-02 spike's; walk frames advance by distance
(`floor(distance × 8 / strideTiles) mod 8`), not by a fixed fps. The two numbers are constants in
`tools/blender/cook_poses.py`; the integrator renders all three options side by side as an
artifact after A-02's first renders, and Randy may overrule. (2) Cook sprites ship lossless for
now: the packer refuses lossy pages with more than one frame (A-01b), which conflicts with D-142's
lossy q90 for cook sprites. Estimated 6.0–7.0 MB of the 8 MB level budget at full size, so a
storage decision (for example lossy pages with frames on a 32 px grid, or fewer frames) is needed
before A-05 and A-06 add stations and backgrounds. (3) One render job per action plus one head
job, each publishing only its own folder and writing its own `frames.json`; cook jobs no longer
write `pipeline.json`. The S-02 spike set is retired (its evidence stays). A-02 publishes the cap
head; A-03 adds the other seven. (4) A-02 may edit A-01's `tools/assets/pipeline.py`, its tests and
`manifest.d.ts` for `frameFiles`, animation fields and `--no-pack`, and ART-PIPELINE §5 and a new §9.

**D-155 · 2026-11-18 · Claude** (under D-142; P-04 review) — Peek Poker swaps. (1) A swap uses one
ease only: the motion token's in-out curve over the rules' 2 seconds, with linear progress along the
arc, so the movement is visible and slow across the whole swap (peak speed at most about 3 times the
average). (2) In a row swap the two rows set off 20% of the swap apart, and the row moving up is
drawn lifted: above the other, 5% larger, with a deeper baked-style shadow, so it reads as passing
over the other row instead of a single band of overlapping cards; arcs stay within the grid and
its 55 px gaps (P-04 round 3). (3) `perpendicularArcPoint` joins the shared motion helpers in
`packages/ui` (any game may use it). Randy may overrule; the round-4 strip is put to him as an
artifact.

**D-156 · 2026-11-18 · Claude** (under D-142; C-12 review) — The host keyboard and gamepad add no
persistent action bar to the TV. They move focus through the controls each screen already shows.
One hint line in the D-130 style (34 px, bottom-left at the 55 px safe margin) appears on the
lobby ("J: join from this keyboard · Arrows and Enter: choose"), picker and team setup, and
results (the existing D-130 hints); nothing keyboard-related is drawn during play. Escape during
play opens a centred "Paused" panel (K1 panel surface and edge, Resume and Quit to picker at the
34 px type with targets of at least 89 px, focus on Resume; enters from 0.95 ease-out 200 ms,
exits 160 ms; none under reduced motion). The TV's own results actions call the host directly, so
results never need a connected leader. Reason: the review found the round-3 bar inside the safe
margin, over seat cards, with 21 px text during play, and new UI without a choice. The rendered
screens go to Randy as an artifact after the round; Randy may overrule.

**D-157 · 2026-11-18 · Claude** (under D-142; R-04 plan) — Rabakz setup is chosen on the leader's
phone and mirrored read-only on the TV's setup slot (one row per setting at 34 px); other phones
read "<leader> is setting up". There is no setup phase or setup controller layout in the game: the
console draws a generic settings form from `settingsSchema` before `init`, which also makes Peek
Poker's Rounds (PP-001) reachable. Categories use layout B of board
https://claude.ai/artifact/8ayoa7P7swXm9oJbWdqiuK (`tools/boards/board_r04_setup.html`): two tabs,
"Around the world" (10, with Mixed) and "Singapore" (6, short names, an "All of Singapore" button
that ticks or clears all six), 3 across at 667 × 375 and 4 across at 844 × 390, Done in the heading
row (choices apply as tapped), every button at least 55 px with 21 px text, measured with nothing
cut off. Layout A needs scrolling at 667; C bends RZ-010; the golden-ratio variant (choices to
summary 1.618 : 1) loses two buttons at 667, so it is not used. A choice that would leave too few
questions is refused with the reason in the heading row (D-153 pattern); a category change is always
accepted, and Start is then disabled with the reason until the match can be filled. Settings are kept
per game in host memory for the room's life, not in the host snapshot. Contract additions (by the
integrator before Codex): `MultiField.noneLabel` and `ChoiceOption.group`. Randy may overrule.

**D-158 · 2026-11-18 · Claude** (under D-155; P-04 review) — A row swap's peak speed may be up to
3.5 times its average (card swaps stay at 3): each row moves over 0.8 of the swap with the 20%
stagger, which measures 3.43 times. The lifted row's shadow uses the ink colour, not the panel
edge.

**D-159 · 2026-11-18 · Claude** (under D-142; amends D-156; C-12 review) — The host keyboard adds no
buttons to the lobby or picker: the board-3 layouts (D-046) stay as decided. In the lobby, Enter
opens the picker once a player is in (hint "Enter: pick a game · J: join from this keyboard", which
becomes "L: leave" once the keyboard player has joined, and "Start on a game pad: join"). In the
picker, Left and Right move between games, Enter selects and then starts, Escape goes back (hint
"Left and Right: choose · Enter: select · Esc: back"). Team setup, results and the pause panel keep
their focusable controls; there, Enter or Space runs the focused control, and a screen-wide Enter
acts only when nothing is focused. Quit keeps the keyboard player's seat and leadership, as it does
for phones. Reason: round 4 added a lobby button and a picker button row that no board covers.

**D-160 · 2026-11-18 · Claude** (under D-142; R-02 plan) — On a phone, a one-option `options` part
placed beside other parts (Rabakz's leader Skip, a lone Continue) takes only the width its label
needs, at least 89 px, instead of an equal share of the spare width; the spare width goes to the
other parts. When an option label would still not fit 3 lines at 21 px, the gap steps from 13 to
8 and then 5 px. Reason: as an equal-share column, Skip shrank the leader's four Rabakz answers to
190 px at 667 × 375, where 107 real bank options cannot fit; at its own width they are about
276 px and none fails (R-02 planner's measurement with the kit's own placement, to be confirmed).

**D-161 · 2026-11-18 · Claude** (under D-142; C-16b review) — While a game is playing or paused, a
Tabao Rush phone uses the `tabao-rush` token block (console marble with red accents: red stick
outline, chip and dashed edge), which is what DESIGN §4.2 describes, not the plain `console` block.
Every controller-kit surface drawn on a panel (targets, kit buttons, cards, grid cells) uses
`--ka-panel-ink`, so text stays dark on light in every game theme.

**D-162 · 2026-11-18 · Claude** (under D-142; C-12 round 5 review) — Amends D-156/D-159 for hint
placement. On the lobby and the picker the host's keyboard hint line sits in the header row,
right-aligned before the player count (lobby) or under it (picker), not bottom-left: there the
lobby hint sat about 8 px under the seat cards, and in the header it keeps at least 21 px from every
other element (C-12 round 5 shots 02, 03, 11). Team setup keeps its phone sentence ("Tap your side on
your phone. ⟨leader⟩ starts.") with the keyboard hints beside it; results keep D-156's place. A hint
names only keys that act on that screen: no "Enter: pick a game" with no player seated; the start
screen shows "Enter: start · Esc: back", with "T: teams" only when the game has teams (T is D-159's
Teams key). The game-pad hint reads "Start on a game pad: join" (D-159 wording).

**D-163 · 2026-11-18 · Claude** (under D-142; D-154(1) follow-through) — The cook walk stride
comparison D-154 promised is published: https://claude.ai/artifact/644EAwnxQzuatXbfCNRh9S (three real
renders at 0.48, 0.72 and 0.96 tiles, animated at 3 tiles/s with frames advanced by distance). 0.72
stands: 0.48 turns frames over at 50 a second and judders on a 60 Hz TV; 0.96 reads as lunging for a
short-legged cook; all three cost the same atlas and memory. Randy may overrule. A-02 evidence ships as
JPG contact sheets at 1× (UAT.md), not full PNG strips, to limit repository growth while cook frames are
lossless.

**D-164 · 2026-11-18 · Claude** (under D-142; P-03 plan) — Peek Poker's phone (P-03). (1) Grid cells
may be drawn face down: `GridCell.faceDown?: boolean` joins the layout contract and its checker; a
face-down cell carries no label or mark, is named "Card N" (row by row, 1–16) for assistive tech, and
its selected outline must reach 3 : 1 against both the card back and the felt at 667 × 375. (2) A large
lone option (Lock in) keeps at least the 144 × 144 large-button size (DESIGN §4.4) under D-160's lone-
option sizing. (3) There is no D-pad cursor on the pick grid (D-062(5)); the backlog wording "tap and
D-pad" is corrected to "tap". (4) Seconds show on the phone only while memorising; a one-line note at
the reveal says when picks were filled at random; locked, scoreboard and over states read "Locked in /
Watch the TV for the reveal", "Scores on the TV" and "Match over", never "Your hand". (5) Whether Lock
in carries the cross shape is put to Randy as an artifact at P-03's first render; until then, no shape.


**D-165 · 2026-11-18 · Claude** (under D-142; C-12 round 8 review) — Amends D-156 and D-162 for the
host keyboard. (1) The paused panel's entrance and exit use the motion tokens (entrance
`duration.base`, exit by `EXIT_FACTOR`), not D-156's 200 ms and 160 ms: a Claude decision cannot set a
one-off timing under DESIGN §4.5. (2) L (leave as the keyboard player) acts only in the lobby and on
the picker and start screen, never during play, pause or results, so a stray press cannot drop a
player from a running game. (3) The picker header is built as D-162 says: heading left with main's
fitter (89 px, down to 55 px), player count right, the hint right-aligned directly under the count,
the game stage where main has it. Round 8's extra row was the integrator's brief, not a decision, and
is withdrawn. (4) The lobby header keeps one height: the game-pad and keyboard hints share one line,
so seats never move when a pad connects. Randy may overrule.
Addendum (C-12 round 10): the heading and its subtitle are 21 px apart, not 8, because the 89 px
display face's descent otherwise reaches the subtitle line; the picker stage therefore starts 13 px
lower than main's (≈ 243 px at 1080p, not 230).
Addendum (C-12 round 11): the heading block's 21 px inset is real layout space inside both crossfade
bands, not a visual offset, so the copy band is 175.2 px and the picker stage starts at ≈ 264 px at
1080p, with the subtitle's drawn text at least 21 px above it. When a game pad is connected, phones
are seated and there is no keyboard seat, the lobby's hints share one line and the "Kaki Arcade"
title steps down to the 55 px display size so the header stays one line inside the safe margin.

**D-166 · 2026-11-18 · Claude** (under D-142; K-09 round 3) — Completes D-164(1). The selected
outline on a face-down card is drawn in the card back's own border colour (`--ka-card-back-border`,
white, the same in every theme), inset 8–13 px so it lies only on the card back: 5.95 : 1 against
the red back and 4.46 : 1 against its stripe. No single colour can clear 3 : 1 against both the felt
and the marble backgrounds, and the inset outline never touches either, so only the card back
counts. The rendered pick grid is shown with P-03's Lock in artifact (D-164(5)). Randy may overrule.

**D-167 · 2026-11-18 · Claude** (under D-057 and D-142) — A-02 merges after its round-6 review
was clean of blockers. Two visible art points are carried to Randy rather than fixed before merge,
because neither breaks a requirement and the cook body unblocks the big-screen renderer (T-07):
(1) in chop, the knife hand passes behind the torso for one frame (about 100 ms per loop) in most
directions; (2) extinguish is a one-handed hold with the arm out to the side, not two-handed,
because the fixed shoulders cannot keep a two-handed grip at a reach that shows from the north.
Both go to Randy as an artifact with the current frames beside the alternatives, together with
the cook-art storage choice (lossless now, 5.14 MB of 8 MB). Randy may overrule.

**D-168 · 2026-11-18 · Claude** (under D-057 and D-050) — Rabakz sound effects (RZ-033, R-07):
set **A, Mallet**, chosen from three playable sets (A Mallet, B Studio chime, C Golden ratio) in the
artifact https://claude.ai/artifact/TfLhgkcpWUR6HUHTJuUQT5. Warm wooden notes with a 4 ms attack and
short decay: answers open = two notes up; buzz in = one note, each seat on its own note of a major
pentatonic scale (C5 D5 E5 G5 A5 C6 D6 E6) so eight seats never clash; right = four notes up 89 ms
apart; wrong = two low notes down 144 ms apart, never a harsh buzzer. Synthesised in code (D-050),
0 KB download, scheduling well under 1 ms. Volume controls: placement **1**, Effects and Music
levels in the TV pause panel under Resume and Quit, shared by every game (TR-063 needs both), kept
on the TV's own device. Randy may overrule.

**D-169 · 2026-11-18 · Claude** (under D-057; R-07 review) — When Rabakz's sounds play (RZ-033,
D-168): (1) a wrong answer plays that seat's buzz note, then "wrong" 233 ms later; (2) a skip, or a
reveal with no winner after the time runs out, plays nothing, because it is not a wrong answer (as
D-071 treats it); (3) a correct buzz is not heard when it is pressed: the winner's seat note plays
at the reveal, then "right" 233 ms after the last seat note, because before the reveal the TV
must not show or sound who was right; (4) seat notes that land together are staggered 30 ms apart,
and the effects bus has a limiter created with the engine, so eight seats plus "right" never
distort; (5) the last wrong press that unlocks everyone again is heard, so the public view carries
the seats that pressed wrongly in that step (public anyway: the TV shows who has answered,
RZ-005). Volume levels are read and saved from the TV's device before any sound has played.

**D-170 · 2026-11-18 · Claude** (under D-057 and D-157; R-04 review) — Choices R-04 made that D-157's
board does not cover: (1) the TV shows a settings refusal too (the board shows it only on the
phone), on its own line under the summary with the value kept visible, because everyone at the TV
needs to know why Start is blocked; (2) the leader's phone header is hidden while setting up, so the
settings panel has the whole screen (D-157); watchers keep their header (round H); (3) no new line
height: headings use the display line-height token, not 1.05; (4) the group chip ("All of …")
shows its on state by fill and border only, with no tick, so it stays on one line; (5) the chosen
value always shows a tick, never a cross, even when another setting has made it unavailable.
Randy may overrule.

**D-171 · 2026-11-18 · Claude** (under D-057; closes D-164(5)) — Peek Poker's Lock in carries **no
shape**: a 144 × 144 option with only its words (option A of three real renders: A no shape, B the
cross, C a golden-ratio 144 × 233, at 844 × 390 and 667 × 375, before and after two picks;
https://claude.ai/artifact/J5bbQJhLzmMi7bJNLSvKxq). The phone is tap-only (D-062(5)); with the cross
the enabled button fills with the cross's red, the same red as the card backs, and grows wider. The
memorise phone reads "Watch the TV" with the seconds, as docs/games/peek-poker.md §2 says (P-03's
brief wrongly asked for "Memorise the grid"). Randy may overrule.

**D-172 · 2026-11-18 · Claude** (under D-057 and D-142; resolves D-167) — Cook art choices, from the
artifact https://claude.ai/artifact/2PQqWkkwd2uykNRRaUBU8N (real renders, current beside alternative):
(1) **chop: B, the side raise** (A-02b round 4): the knife hand is visible in all eight facings, the
head stays still, hand travel 17–26 px; it replaces the current overhead chop. (2) **extinguisher: A,
keep the current one-handed hold**: the two-handed alternative hides the canister from N, NE and NW,
and reading who is fighting the fire matters more than the grip. (3) **cook sheets: B, lossy WebP at
quality 90**: 4.90 MB → 1.40 MB for the cook sheets, level art about 1.6 of 8 MB, no visible change at
3×; the pipeline gains a check that each lossy sheet stays within a set difference of its lossless
source. A follow-up issue (A-02c) makes the side raise the default chop and switches cook storage.
No golden-ratio variant applies (art and storage, not layout). Randy may overrule.

**D-173 · 2026-11-18 · Claude** (under D-057 and D-142; for D-145) — Rojak's chopped turnip
(TR-041, A-10): **B, cream**, from the artifact https://claude.ai/artifact/2R3vwa8mZnQyt4g3f9zkfE
(three Blender renders on both counters: A tan, B cream, C cream with a faint purple edge). Cream
top face with darker warm-beige sides and edge: it matches the raw turnip, and the darker edge
keeps it visible on the white plate. Round 2's tan matched the peanuts and fried dough and read
as croutons. All three cost the same (same pixels, same atlas size). No golden-ratio variant
applies to a colour. Randy may overrule.

**D-174 · 2026-11-18 · Claude** (under D-057 and D-142; amends D-157) — On the phone's start
screen a refused choice (too few questions for that difficulty or length) shows its reason in the
footer status line, at full text width, the same line that gives the start-blocked reason; not in
the field's heading row as D-157 said. A heading row at 667 px has room for a few words only and
cut the count and the fix in half; one status line also means one place to look. The TV mirror
shows the refusal as D-170 records. Evidence: `uat/evidence/R-04-setup/roundL-p8/19-phone1-difficulty-refused-leader-667.jpg`.
Randy may overrule.

**D-175 · 2026-11-18 · Claude** (under D-057 and D-142; refines D-164(4) and D-056) — Notes in a
phone's private panel stay at 13 px on a 21 px line (`packages/controller-kit/src/layout.css`,
`packages/platform/src/game/private-placement.ts`). Board 4 drew notes at 15 px, but D-056 removed
15 px type and private panels are narrow, so the note keeps the smallest step instead of growing
with the panel. First used by Peek Poker's random-fill note (P-03). Randy may overrule.


**D-176 · 2026-11-18 · Claude** (D-057, A-09; image generation logged as AGENTS.md requires) — Codex
generated eight shell pictures in the A-09 worktree (prompts in `assets/src/images/shell/prompts.json`,
all original, nothing copied from an existing game or brand). Chosen by recommendation: landing **B**
(friends holding real phones as controllers; A's handheld consoles misstate how the product works and
lean toward a console's look), Tabao Rush **B** (the whole kitchen from the game's own angle, cooks
working together), Peek Poker **A** (the face-down 4 × 4 grid on felt, as played; no chips or money),
Rabakz **B** (standing answer cards and a phone buzzer). They ship as compressed WebP at 1× (about
0.3–0.5 MB for the four, inside PERF-022), never as the 2–3 MB source PNGs. The start-screen picture
slot becomes 1.618 : 1 (about 656 × 405 at 1080p) and the start screen must still fit without
scrolling. Board: https://claude.ai/artifact/Jc2My5M8t4J4XoikpY8mr2. Randy may overrule.

**D-177 · 2026-11-18 · Claude** (A-02b; corrects D-172) — After round 6's attached shoulder, the
side-raise chop's knife is hidden by the cap facing SE during the hold frames (0, 3, 4 and 5 of 6);
it shows only in the raise. The cook sheets are 1.79 MB at full size (0.81 MB more at half size),
not 1.40 MB; still well inside PERF-023's 8 MB per level, and about 49 MB decoded against
PERF-024's 256 MB. The one-handed extinguisher is mostly hidden facing E. A-02c's scope (side raise
as default chop, lossy cook storage) landed in A-02b, so A-02c is closed as absorbed. The walk meets
TR-060 (feet do not slide: 0.0 px; each foot 19–22 px with a 9 px lift; each hand 10–12 px; the
1.2 px "hands" figure is the midpoint of two arms swinging in opposite phase), but carry-walk reads
weakly from N, NE and NW; A-02d adds gait sway and a walk gate, shown to Randy as rendered strips
first. Randy may overrule after seeing the SE and E strips
(`uat/evidence/A-02b-cook-alternatives/round7/chop-composed-light-1x.jpg`,
`extinguish-composed-dark-1x.jpg`).

**D-178 · 2026-11-18 · Claude** (D-057, X-03; DATA-004, RZ-021) — The Privacy and Credits pages
split their sections into columns at 1.618 : 1 (option B), not two equal columns. On a 1080p TV
the wider left column lets the longest section (anonymous counts) read in five lines instead of
six, both columns end at a similar depth, and the page clears its bottom edge by 122 px (equal:
78 px; 34 px needed); at 1280 × 720, 81 px (equal: 52 px). Phones keep one scrolling column either
way. Static pages loaded only when opened, so neither option has a frame or transfer cost worth
noting. Board with both options from the round-4 run:
https://claude.ai/artifact/NHhKG9eiGbGD495MXQpuYT. The limiter wording stays open under OQ-030.
Randy may overrule.

**D-179 · 2026-11-18 · Claude** (X-02; REL-003) — The help page's phone advice says only "Phones need an internet connection. If a phone cannot join, connect it to the same Wi-Fi as the big screen and scan again.", which holds both with today's empty ICE-server list and after C-02's relay, and promises no NET-004 prompt. The TV-browser line shows `location.host` in the mono face after an "Address:" label in DM Sans; on a loopback host it says "the address in this laptop's address bar" in DM Sans (DESIGN §2: mono for codes and numbers only). The route uses the same useState + import() pattern as the other lazy routes, so preact/compat stays out of the shared entry.

**D-180 · 2026-11-18 · Claude** (X-04; DATA-003, DATA-001) — Anonymous counts: (a) exactly eight kinds: `error:host:session`, `error:host:load`, `error:signal:unavailable`, `reconnect:signal` and `perf:host-frame-p95:{le17,le34,le50,gt50}`; controller start-up and touch latency are not counted, because phones send nothing. (b) `reconnect:signal` counts outages: one each time the TV's signalling goes from connected to reconnecting, not the retry notifications, which netcode sends twice per attempt and which would grow with outage length and backoff; a first connection that never succeeds is left to `error:signal:unavailable`. (c) Only the TV sends: once after results, and with one keepalive fetch when the page is hidden or left; every request omits credentials and referrer; nothing is sent during play, a batch is never retried, and the first failure switches collection off. (d) The pairing server keeps daily totals in reserved `ROOMS` objects named `counts:YYYY-MM-DD`, with a limit separate from the pairing budgets and keyed by rotating HMAC; no new binding or product. (e) Daily totals never expire: a few bytes a day, with no way to tell users apart; revisit at X-06. (f) Additive contract change to `packages/protocol` (`counts.ts`). (g) The UAT harness accepts `--signal-var` for local worker variables and treats only the web origin's `/favicon.ico` 404 as expected, rather than routing it, so the HTTP cache stays on. Randy may overrule.

**D-181 · 2026-11-18 · Claude** (P-06; PLAT-033, PP-031; ARCHITECTURE §4) — Host screens may be mounted renderers ({ mount(root, props) → { ready, update, destroy } }) as well as Preact components. Start publishes the initial public view, waits on ready before subscribing simulation frames, rejects Start on failure and destroys the renderer on cancel. The preparation root stays paintable behind the opaque "Starting…" picker, not hidden, so the browser actually rasterises it. Why: Peek Poker's canvas table must fetch and decode its atlas, load fonts and warm its draws before the round, so nothing loads during play.

**D-182 · 2026-11-18 · Claude** (P-06; PERF-001) — P-06 closes on a headed diagnostic run of one console round (no budget assessed), as P-04 did. The assessed full-match run, with a round of at least 180 s on a quiet machine and a production build, is P-09. Randy may overrule.

**D-183 · 2026-11-18 · Claude** (C-15; PLAT-023) — The phone Paused veil says "Quit to picker", not board 4's "Quit to lobby": it matches PLAT-023's wording, the TV's Paused panel and where the quit lands. Chosen by recommendation; Randy may overrule.

**D-184 · 2026-11-18 · Claude** (C-15; PLAT-023, D-051) — Phone Menu is an ink pill inside the 47 px ID bar over an unpainted 89 × 68 target that no game control intersects at the three phone sizes; it is disabled and covered while a veil shows. Opening a veil moves focus into it (Resume for the leader, the dialog otherwise, with no visible ring on the dialog); closing it returns focus to Menu. Board 4 draws no Menu control. Chosen by recommendation; Randy may overrule.

**D-185 · 2026-11-18 · Claude** (C-15; PLAT-007, D-095 f) — An ICE "disconnected" state counts as link loss only after 3 s; failed, closed or data-channel close stay immediate. This rides out brief Wi-Fi blips without dropping a seat.

**D-186 · 2026-11-18 · Claude** (C-15; PLAT-009) — The host snapshot keeps cumulative per-seat scores from completed rounds, counted once per results screen; an interrupted round adds nothing, and a freed or expired seat loses its score. Not yet split per game (OQ-044).

**D-187 · 2026-11-18 · Claude** (X-03; DATA-004, DATA-003; follows D-180) — The privacy page's counts section names D-180's kinds in players' words: "matches stopped by an error", "games that fail to load", "times it cannot reach our server (under-counted, as counts go there too)", "lost connections (one per outage)" in place of the backlog's "signalling outages" (X-release.md), and "one of four smoothness bands: nearly every frame within 17, 34 or 50 milliseconds, or slower" in place of the p95 band notation. A 720-character cap per section replaces the three-sentences-per-section test; rendered fit in legal.dom stays the real guard. The OQ-030 limiter sentence is unchanged. Randy may overrule.

**D-188 · 2026-11-18 · Claude** (X-03; DATA-004; corrects D-178's figures) — D-178's clearances (122 px at 1080p, 81 px at 720p) were measured on the round-4 copy; the round-6 copy measured 77.9 and 52.0 px. With today's copy, Privacy clears the panel bottom by 47.4 px at 1080p and 31.6 screen px at 720p against 34 and 22.7 needed (uat-r9/fit.txt). The 13.4 px margin is under one 44.19 px body line, so added Privacy text must remove as much, and fit is re-measured when fonts ship and on X-09's laptop. D-178's 1.618 : 1 columns stand.

**D-189 · 2026-11-18 · Claude** (X-03; DATA-004, DESIGN §6) — Until A-09's landing merges, the placeholder landing has a phone flow: at ≤ 1000 px it drops the scaled TV board for an unscaled scrolling column (`.landing-page`), so the Privacy and Credits footer sits in normal flow below the content with 55 px targets, 34 px below the content. A portal was tried and rejected, because the transformed board painted over the footer and took its taps. A-09 must keep `<LegalFooter/>` and a phone flow that passes legal.dom's centre-point hit test. The legal pages focus their back link on mount only on the TV layout (≥ 1001 px).

**D-190 · 2026-11-18 · Claude** (A-07; TR-010; ART-PIPELINE §3) — The effect fire is rendered
unlit (an Emission shader) with the Standard view transform, an exception to "one light rig for
every asset". Why: fire is a light source. Under the matte day rig the round-1 fire washed to
peach and did not read as fire, while the unlit palette colours (#E0A63A, #F07C2A, #B5371F) read
from 3 m and in greyscale. Steam, sparks, spray and shadow keep the shared rig for now. The same
exception may extend to sparks in A-07b, since the rig dulls #F2B21B to about #CEA865. ART-PIPELINE
§3 gains this exception under D-134. Cost: none against PERFORMANCE (the same pixels and atlas).
Randy may overrule.

**D-191 · 2026-11-18 · Claude** (A-07, A-05, T-07; TR-010) — A-07's `effect-fire` is the only
animated fire. T-07 draws it at the station's effect point, A-05 drops its animated flame samples,
and A-05 keeps its static on-fire cue and its burnt-food smoke. Why: two animated fires stacked
on one station would double the draws and clash. Randy may overrule.

**D-192 · 2026-11-18 · Claude** (A-07b; TR-010, DESIGN §6) — Sparks on the light counter are fixed
in A-07b without a board: render sparks unlit like the fire (D-190), give each spark an edge-red
#B5371F rim (4.97 : 1 on cream), and grow the dots to 6×8 px, at no atlas cost. Why: their best
contrast on cream is about 1.9 : 1 and they nearly vanish at 3 m; no rule clause rests on sparks,
so it is a readability fix within D-057. The rendered strips on both counters go in A-07b's
evidence. Randy may overrule.

**D-193 · 2026-11-18 · Claude** (P-08; PERF-022, PERF-023, PERF-024) — PERF-022 counts the host
shell, not round atlases. PERF-022 is "Host shell (landing to lobby)"; the atlases a pipeline
manifest (`manifest-*.json`) names are fetched only after Start, from a lazy host chunk. So
`tools/check_budgets.mjs` excludes those `.webp` files from the 1.5 MB shell figure, still reports
the whole deployment total, and fails on a missing, malformed, non-WebP or undeployed atlas. Round
atlases stay bounded per round at pack time by `tools/assets/pipeline.py` (8 MB transfer, 256 MB
decoded). The threshold is unchanged; only the measured scope now matches the requirement's
wording. Randy may overrule (OQ-046).

**D-194 · 2026-11-18 · Claude** (P-08; PP-005, PP-031) — The controller kit repaints its layout
surface when the shell theme changes. `LayoutEngine` copies the shell paint onto an opaque
surface; in production the layout arrived before the playing/theme update, leaving console paint
under Peek Poker's cream text (prod-r2). A `MutationObserver` on the shell's `data-theme` in
`packages/controller-kit/src/layout-renderer.ts` re-copies the paint in place. It is game-agnostic;
held controls, revision history and crossfade ghosts survive, and the swap is a hard cut, like the
shell's.

**D-195 · 2026-11-18 · Claude** (R-06; RZ-013, DATA-002) — A game opts into host-device records
through `SessionRegistration.record` (version, validate, empty, savedView). The shell keeps one key
per game, `kaki.host-device.game.<id>.progress-v1`, and reads it into `context.saved` in
`prepareMatch` on every Start, never from the cached setup. A missing or corrupt record arrives as
`empty()`; an unreadable one arrives as `null`, and that match writes nothing. The shell writes
`save(state)` once, after the results frame or on quit to the picker when results have not fired;
the game's pure `savedView(view, state)` claims a best only after a successful write. Why: one key,
a pure codec, and the store stays in the shell. P-05 reuses this, so its `empty()` must not be null.

**D-196 · 2026-11-18 · Claude** (R-06; RZ-015) — Question history is capped at 200 unique ids of at
most 64 characters, oldest first; an id seen again moves to the newest end. Once fresh questions
run out, the oldest recent ones win over Mixed difficulty quotas. Questions shown up to a quit
count; a final question that is still hidden does not.

**D-197 · 2026-11-18 · Claude** (R-06; RZ-013) — "Best N" follows the category in the header's
right-hand slot as "Category · Best N" at 34 px, same ink, a middle dot and an 8 px gap. The reveal
reads "+N · N pts". The solo final shows "New best · N" or "Best N" at 34 px beneath the score. The
success pulse waits for the results crossfade (`duration.slow`) so it plays on the settled screen.
Chosen by recommendation; Randy may overrule with a rendered board.

**D-198 · 2026-11-18 · Claude** (R-06; PERF-001) — R-06 closes on the diagnostic `rabakz-screen`
run (perf-r5), as R-05 and P-06 did; the run now includes the solo header and the solo final with
its pulse. Development build, headless, no budget assessed: max 33.4 ms, 0 frames over 50 ms, 0 long
tasks. The assessed Rabakz run comes with the full-match performance issue. Randy may overrule.

**D-201 · 2026-11-18 · Claude** (C-17; PLAT-008, ARCHITECTURE §3) — Mid-game joining is a per-game declaration, `GameMeta.midGameJoin: boolean`, required by the conformance kit. Each game owns its join point and keeps the joiner on a safe waiting layout and private view until then. Rabakz, Peek Poker and Tabao Rush declare true; the development console fixture declares false so the holding path stays testable. The reconnect host keeps a refused `hello` for each live connection and replays it through the same reducer when the room becomes eligible (lobby, results, or `allowRunningJoin`), so admission does not depend on the phone sending again; Leave, disconnect and stop cancel the request.

**D-202 · 2026-11-18 · Claude** (C-17 review; PLAT-008, RZ-014, PLAT-025, D-079(f)) — Until Randy answers OQ-048, a running match that uses teams holds a new phone on "Waiting for the lobby", even when the game declares `midGameJoin`; the phone is let in when the TV returns to the picker or results. `teamsInUse` comes from the host's confirmed team setup, with no game ids, and RZ-014 stays in progress for team mode. The host captures the running game's admission (`midGameJoin && !teamsInUse`) when Start succeeds and reuses it for pause and resume, instead of rereading `picker.focus`. A held-hello replay re-checks, after every synchronous callback, that the request is still pending and the room still eligible, and skips connections already seated, so one held phone gets one new seat; a later duplicate hello from that phone gets only a `resumed` seat acknowledgement. Chosen by recommendation; Randy may overrule.

**D-199 · 2026-11-18 · Claude** (A-09; REL-002, REL-003, DATA-004, PLAT-020, PERF-020/022; extends D-176 and D-189) — Shell pictures are WebP q82 at 1× (landing 678 × 419; tiles 656 × 405), 148,452 B in all, made by `tools/assets/shell_images.py` with the already-declared Pillow; no new dependency. At 1000 px wide or less the landing is an unscaled scrolling column with no picture, the legal footer in flow below the TV help link and every link at least 55 px; this replaces X-03's interim `.landing-page` flow (D-189). "Put this on your TV" is a secondary link below the games line; X-01 keeps arrow and remote reach. The picker mounts after all three pictures decode: they are preloaded with the lobby and kept for the session, a ready flag gives later mounts a ready first frame, and a failure offers Try again. The landing and host pages are lazy routes, as in D-179; a cold load shows "Loading…". "Loading settings…" is plain status text; problems and refusals keep the warning icon. The picker wipe has one frame at about 100 ms showing a sliver of the outgoing picture and possibly a cut-off word of the outgoing copy (uat-r16 strip 19); it is accepted as part of the tile-local mask, and the frozen columns stay clipped to their own boxes. Chosen by recommendation; Randy may overrule.

**D-200 · 2026-11-18 · Claude** (A-09; PLAT-004, PLAT-006/025, PLAT-020; DESIGN §1, §3, §4.3; amends R-04 item 7 and refines D-170(1)) — The TV safe margin is 55 board px at every size. Every start card uses one grid: content-sized rows, 13 px top and bottom padding, 34 px sides, and "Who's in" 13 px below the taller of the picture and the visible copy. An empty feedback row takes no height (the three-line reserve made the Rabakz strip drop about 130 px on every entry). The TV's setup feedback is drawn in a band across the card's content width, 13 px above its bottom padding and outside the flow, so the strip never moves when a refusal or problem appears, changes or clears; it stays below the settings rows as D-170(1) requires. It fades in with ease-out over `duration.base` and out over `exitDuration('base')`; a change of text crossfades, the old text being a decorative `aria-hidden` copy anchored to the band's bottom so it fades where it stood; under reduced motion it changes instantly and the live region stays mounted. On the TV a player tile is at most two lines: the name on one line, cut short with an ellipsis (full name in `title`), and "Seat held" on its own second line in place of the " · Seat held" suffix, so the strip stays clear of the band for 8 players with 12-character names at 1080p and 720p. Chosen by recommendation; Randy may overrule (OQ-049).

**D-208 · 2026-11-18 · Claude** (P-05; PP-012, DATA-002) — Peek Poker's solo best uses the shell's record store (D-195): version 1, record `{ best }` (non-negative safe integer), `empty()` = `{ best: 0 }`, schema in `games/peek-poker/src/records.ts`. The best is read once at match start into pure state (`bestAtStart`); `save(state)` improves it only for a completed match that was one player from start to finish, otherwise returns `bestAtStart`. An unreadable store sets `recordable: false`: no Best line, no New best, nothing written. `publicView.newBest` is always false; the pure `savedView` sets it only after a successful write, and the TV updates the best line in place without replaying the podium. Review 1's identity `savedView` was withdrawn because it claimed a best before the write. The New best pulse waits until the podium's row entrance has settled, as Rabakz does (D-197). Chosen by recommendation; Randy may overrule.

**D-209 · 2026-11-18 · Claude** (P-05; PP-032) — Peek Poker draws its own final podium (`finalScreen: true`), as Rabakz does. On final screens only the shell's hint ("The leader continues on their phone") gives the hand-off; Peek Poker drops its own line (the scoreboard keeps "Next round in 5 seconds"). Because the shell hint is not scaled with the 1920 × 1080 board, the final board reserves 89 + 55 artboard px at its foot; scaling the hint is C-18.

**D-210 · 2026-11-18 · Claude** (P-05; PP-032) — Phones keep their own Place and Score from the last private view on Results and clear them on the next match, the lobby or a disconnect. The shell selects them by the stat labels "Place" and "Score" (ARCHITECTURE §4) until the private-view contract gains a declared result-stat flag. Tied places travel as string values ("=2"), with no contract change.

**D-211 · 2026-11-18 · Claude** (P-05; PERF-001) — P-05 closes on the diagnostic `peek-poker-console` run at 8 phones through five scoreboards and the podium (perf-r7), as D-198 did for R-06: development build, headless, load 3.1–6.2, median 16.7 ms, max 33.3 ms, 0 frames over 50 ms, 0 long tasks; the slow frames fall in Start preparation and round-1 memorise. Round 8 adds no per-frame work. The assessed full-match run is P-09's. Randy may overrule.

**D-203 · 2026-11-18 · Claude** (R-02; RZ-003, CTRL-003) — When the visible controls are exactly one four-option grid plus at most one single option without a face glyph, and every private block is text, the text blocks go in a 55 px strip above the grid, with 13 px margins and separation and 8 px gaps; the strip reserves the action's width plus 34 px, or 5 px when there is no action. This layout is preferred over side-panel packing, not used as a fallback, and is accepted only if every box lies inside the area and overlaps no other box; other combinations keep side-panel packing. It replaces Rabakz's CSS overrides of placed boxes, so the type-step cap and the conformance check measure the box that ships. Chosen by recommendation; Randy may overrule (OQ-050).

**D-204 · 2026-11-18 · Claude** (R-02; CTRL-003) — Option-label metrics break after ASCII and Unicode hyphens, figure, en and em dashes, slashes and zero-width spaces, and before an em dash; they do not break between a hyphen, dash or slash and a following digit ("Catch-22", "A350-1000", "3/4"), and non-breaking spaces and hyphens stay whole. This keeps the estimate at or below browser wrapping.

**D-205 · 2026-11-18 · Claude, integrator** (R-02 rounds 17–20; CTRL-003; PERF-012; refines D-127) — All targets in one placed options group or interactive grid share one label step: the smallest any of them needs. Each label is measured at 34 px in a hidden probe sized from the placed cell box, with borders, padding, shape and the drawn gap removed (5 or 8 px for grids), at most three lines; the group applies 21 px if any label needs it. Separate controls such as Skip and Lock in are measured on their own. The group container owns the measurement: it measures once, synchronously before paint, when installed; the install is keyed on the group's labels, faces, colour, disabled state, grid size and placed box, so a selection-only update does not reinstall it; ResizeObserver's initial notification is ignored and an already-resolved `fonts.ready` adds no pass; later triggers (placement, font, viewport, group size, shell theme) are batched to at most one pass per frame, each writing all probes, then reading them all, then applying the step; targets with empty labels (face-down cards) are skipped. Measured at 4x CPU in Chromium: Peek Poker 4 × 4 grid 0 ms, Rabakz 1.4–2.1 ms per pass. Reason: a grid mixing 34 px regular and 21 px bold looks broken (R-02 round 16). Cost: one long answer shrinks its short neighbours.

**D-206 · 2026-11-18 · Claude** (R-02; DESIGN §6, D-056) — The bold weight for 21 px option labels applies only to shape-coloured targets and targets with an explicit background colour, not to every 21 px target.

**D-207 · 2026-11-18 · Claude** (A-07b; TR-009, TR-010, TR-062, ART-PIPELINE §3) — The thrown-item shadow is no longer rendered through Cycles. The effect script writes it as an analytic soft ellipse: 23 × 11.5 px radius, alpha .5·(1−r²)², which falls to zero with zero slope at the rim, in palette #2B2118 written as sRGB bytes. The PNG is exactly RGB (43, 33, 24) with peak alpha 127/255. That gives 3.00 : 1 on the light counter and 1.39 : 1 on dark (main: 4.67 and 1.38), with no grain or banding (largest alpha step between neighbouring pixels: 9 horizontally, 17 vertically). The A-07 metadata height rule (scale and opacity 1/(1+height)) is unchanged; at one tile the shadow measures 1.64 : 1 and 1.18 : 1.

Sparks render unlit per D-192 but larger than D-192 said: a 7×9 px #B5371F ring around a 4×6 px #F2B21B core, peak alpha 1. Measured best contrast on cream is 4.4–4.8 : 1 per frame, with 20–38 px at 3 : 1 or more (main: 1.8–2.0 : 1 and none). On dark it is 4.2–4.6 : 1.

Steam and spray gain a faint #2B2118 edge (+.5 px, 18% alpha) that greys the whole lobe slightly. Peak contrast on light rises from about 1.7 to about 2.2 : 1; on dark it falls from about 5.1 to about 4.4 : 1.

Every PNG text chunk is stripped. A full re-render gave byte-identical fire, steam and spray.

Cost: effects atlas +1,278 B transferred and +6,944 B decoded at full size (39,096 B and 181,184 B), and 14,666 B at half. The Tabao Rush round is 2.06 MB (PERF-023 limit 8 MB) and 51.0 MB decoded (PERF-024 limit 256 MB). Randy may overrule.

**D-212 · 2026-11-18 · Claude, integrator** (X-05; REL-004, REL-006) — X-05 part 1 is the automated
half of the browser matrix on this Mac: Playwright Chromium 156 and branded Chrome 157 (channel
"chrome") on the TV, and Playwright Chromium (Pixel 7) or Playwright WebKit 27.2 (iPhone 13) on the
phones. No package is added; the owner installed the WebKit binary. Playwright WebKit cannot stand
in for Safari's networking here. With the local pairing grant (no ICE servers), a same-page loopback
in WebKit gathers no ICE candidates and its data channel never opens, while Chromium opens at once
with an mDNS host candidate (`uat/evidence/X-05-browser-matrix/webkit-rtc-diagnosis/`). In the
matrix, no WebKit phone is ever seated, whether the TV is WebKit or Chrome. The cause inside the
build is not established, and whether real Safari connects is unproven either way. The WebKit runs
therefore show only that supported pages load without the unsupported message, and C-14 shows the
message itself in WebKit. REL-004 and REL-006 stay in progress until Edge, real Safari, iPhone,
Android and TV browsers (K-07, X-09) and Firefox (no runner option yet) are checked. The UAT harness
excuses no request failure for being "cancelled" by an engine; a cancelled request is fixed at its
cause in the slice (X-05 review 2: C-14 had waited for the route's loading placeholder).

**D-213 · 2026-11-18 · Claude, integrator** (C-19; PERF-012, CTRL-003) — The label-cost test measures `measureLabelGroup` and the `observeLabelGroup` install once on each of 7 fresh mounts per game (new container and Preact tree each time; code and font caches are warm, because the renderer's own install pass has run first), and checks the median against the unchanged threshold: under 4 ms at 4x CPU, or 1 ms unthrottled. Every sample must also be at most 3× that (12 ms, inside PERF-012's one frame). The threshold and the throttling are unchanged; the estimator change means a single sample between 4 and 12 ms no longer fails on its own, which is intended: one interrupted sample failed 1 run in 3 at load 5, at a 0.1 ms timer resolution. Precedent: D-148 (median of 5 at 4x CPU). Load shifts the whole distribution (Rabakz median 1.5 ms at load 2, 3.4 ms at load 10), so this check is valid only on a quiet machine; it is a component check and not the 100-observation PERF-012 assessment. Verify evidence (D-213 note): on C-19 at 012ecc93 the full `pnpm verify` test stage ran 4,030 tests green; its one failure was `tools/assets/pipeline.test.ts` killed by its 60 s child-process limit at load 8 (status null; C-20 sizes those limits), which then passed alone (5 of 5), and the stages after the test stage (`pnpm run build` with transfer budgets, `pnpm run trace`) passed when run directly. Every verify stage has therefore passed on this commit, though not in one invocation.

**D-214 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (A-03; TR-061, TR-064) — Of the three committed head renders, round 6 ships for bun, turban and specs; rounds 4 and 5 fail the review gate on bun/specs (0.027–0.178 and 0.008–0.227 against 0.20). The options board (rounds 4, 5, 6 side by side, colour and greyscale, heads 198,428 B vs 202,586 B, round 5 marked failing) is published for the record. Randy may overrule.

**D-215 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (A-05; TR-030, TR-031, TR-010; replaces the "recorded only from Randy's answer" entry drafted in A-05 review 6) — Station cue board: bar A (under the cue) with gold cells on an ink track and the empty-cell outlines kept; the drawn 42 px square cue with a three-tongue flame for on fire; burnt-food smoke as one still frame that rises from the food to below the plaque (the four-frame loop only if the re-rendered still does not read as rising smoke). The 42 px plaque, 4 px border and 10.5 px cell pitch are accepted as sprite geometry at 120 px per tile, not interface spacing. Steam, sparks and smoke are not clipped; the painter order (body, food, fire, effect, progress, cue) draws them behind the bar and the plaque. All options cost within 1 KB of 2.26 of 8 MB and 52.1 of 256 MB. Board: `design-gate/A-05-station-cues/` (published for the record after the round-6 render). Randy may overrule.

**D-216 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (R-15; PLAT-025, RZ-012, DESIGN §6) — Teams during play are shown with one team chip: a full pill in the team colour with ink bold text "Red team" or "Blue team" (phone 21 px on 34 px, TV 34 px on 55 px). Phones carry it in the header beside the nickname on every play view. On the TV the "Answered" row splits at the centre line, red left and blue right as on team setup (D-143), each half led by its chip with the team total; the header is unchanged; reveal names carry their chip and the award reads "+100 to Red team"; scoreboard team panels use the same chip. The word is the non-colour cue, because team colours equal seat colours 1 and 2. Rendered for the record before R-15 merges. Randy may overrule.

**D-217 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (R-16; RZ-009, D-071) — The final round is announced for 4 s on a full TV card: "Final round" at 144 px, "The last question scores double" (or "The last 3 / 5 questions") at 55 px and a "×2" badge, on a 1.618 : 1 panel, crossfading in and out at `slow`. Each final question's header carries a "Double points" chip; phones show "Final round · Double points" during the card. Rendered for the record before R-16 merges. Randy may overrule.

**D-218 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (K-10; PP-005, D-164, D-166, DESIGN §6) — A selected face-down card on the phone keeps the white inset frame and adds a centred tick (34 px cream disc, 21 px ink tick, 5.1 : 1 on the red back), crossfading in from 0.95 over `fast`. A gold outline (2.75 : 1) and a lift (needs blur) were rejected. D-164(1)'s "no mark" means nothing that identifies the card. Randy may overrule.

**D-219 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (T-07; TR-001, TR-004, TR-005, DESIGN §4.3 5A) — The Tabao Rush HUD is board 5A as chosen: Time (m:ss), Score and Stars panels and no Tips line. The tip shows in a 34 px score pop rising from the served card ("+100 · tip +12") and as a line in the round results. Order cards carry no seconds; the patience bar is coloured by urgency and adds a warning triangle in its last quarter. Randy may overrule.

**D-220 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (A-11, T-07; TR-001; supersedes T-07 review's interim text-placeholder entry) — Recipe steps are icons as TR-001 says: each card shows its dish's processes in order, then the container, as 34 px one-colour glyphs (print red-brown #8E2A18) 13 px apart, at most four per card. Eleven glyphs (chop, wok, pot, grill, rice, drinks, mix, spread, plate, bowl, cup) are rendered by a Blender script in A-11 and packed with the round (about 51 KB decoded). T-07 shows a labelled text placeholder until then. Randy may overrule.

**D-221 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (R-19, R-20; RZ-012, RZ-016, RZ-032; supersedes R-08 review's OQ-0xx assumption) — In Rabakz team mode only teams are placed. The TV shows each team's place with its total; the podium has a step per team place (one shared "Tied for first" step when the teams tie), each listing its players by score with no place numbers, names at 34 px or more. The phone's Place reads "1st · Red team". In free-for-all, phones mark shared places with "=" as the TV does. RZ-016 is reworded. Randy may overrule.

**D-222 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (R-19; RZ-032, PLAT-022) — Rabakz's Continue carries no shape, only its words, like Peek Poker's Lock in (D-171); the red cross read as "close". `docs/games/rabakz.md` §3 is updated to match. Randy may overrule.

**D-223 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (P-11; PP-008, PP-009, D-069; closes OQ-052) — Equal hands at the reveal are ordered by this round's points, then by lock-in time (random fills last); seat order is used only between hands equal in all three. The speed winner therefore always sits above the players it beat. Randy may overrule.

**D-224 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (C-18; RZ-032, PP-032, DESIGN §6) — Final and results screens keep ranked names at 34 px or more at 1080p; no game may scale its results body below the type tokens. Space for the hand-off band is found within φ tokens. DESIGN §6's reading-distance line is clarified to say so. Randy may overrule.

**D-225 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (T-14; TR-009, TR-058; closes OQ-029) — Plates and dishes are never thrown. Versus sabo is a hatch on the centre line: a cook places a dirty plate on it and it travels on an arc into the other team's sink. TR-058's wording is changed to match. Randy may overrule.

**D-226 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (C-22; PLAT-009, D-086, D-186; closes OQ-031 and OQ-044) — A host reload loses the running match in every game and restores the room, seats, teams, leader and the last results. Scores carried across a reload are kept per game, not added across games, and no new screen draws them in v1. PLAT-009's wording is changed to match. Randy may overrule.

**D-227 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (F-10; PERF-001, PERF-010, PERF-012, new PERF-040; closes OQ-034; keeps D-100) — New budget PERF-040: a simulation step at 8 players takes at most 1.67 ms at the 95th percentile and 3.34 ms at the 99th (10% and 20% of a 60 Hz frame; measured about 0.005 ms), assessed by `pnpm perf` and blocking. No allocation budget; §2's Tabao Rush no-GC-pause rule stands as written. PERF-001 is assessed on production builds, input delay on development builds. The reference display rate is 60 Hz. Milestone PERF-001 runs use branded Chrome; slice gates may use Chromium. Randy may overrule.

**D-228 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (C-25; PERF-002, PERF-023, D-111, D-113, D-181; closes OQ-036) — The detail benchmark runs once per game per TV during Start preparation behind "Starting…": about a second of the game's busiest scene drawn off-screen, judged by D-111/D-113; "lower" loads half atlases before the round. Games declare an optional benchmark scene in the game contract (ARCHITECTURE §3 updated in the same slice). Randy may overrule.

**D-229 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (C-24; RZ-033, TR-063, D-168; closes OQ-040) — The TV unlocks audio on the landing's "Host a game" click, which becomes a same-document navigation. If audio is still blocked, the lobby header's hint row reads "Click or press a key on this screen to turn on sound" until it runs, and the pause panel's volume row says sound is off; nothing is drawn during play. Rendered for the record. Randy may overrule.

**D-230 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (C-27; CTRL-009, PLAT-021, PP-005, RZ-005; closes OQ-041) — The TV's keyboard or pad seat plays only games with no private phone view (Tabao Rush); in Peek Poker and Rabakz it watches, marked "Watching". If it is the only seat, those games refuse Start with "⟨game⟩ needs a phone. Scan the code to join." Games declare whether a local seat may play. Randy may overrule.

**D-231 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (C-27; CTRL-009, PLAT-006, PLAT-024, D-157; amends D-159; closes OQ-042) — When a phone is seated, the leader is always a phone player (the earliest seated); the TV's keyboard or pad seat leads only when no phone is in the room and then starts with defaults or kept values. The TV keys of D-159 keep working under a phone leader. PLAT-006 is reworded. Randy may overrule.

**D-232 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (X-10; RZ-021, DATA-004; closes OQ-045) — The adapted bank is offered by a "Download our questions (CC BY-SA 4.0)" link on Credits to the files the game already ships; no separate package. Randy may overrule.

**D-233 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (R-20; RZ-016, RZ-032; closes OQ-047) — On the Rabakz free-for-all podium every player tied for a place stands on that step at 34 px or more, the step sized to them within the safe area, and tied players are not repeated below. When everyone ties for first the single step is labelled "Tied for first". Built on C-18 round 4's layout. Rendered for the record. Randy may overrule.

**D-234 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (C-21; RZ-014, PLAT-025, PLAT-008; replaces D-202's hold; closes OQ-048) — A phone joining a running team match is put on the smaller team (equal: the team behind on points; still equal: Red) and plays from the next question with 0; its phone names its team. Randy may overrule.

**D-235 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (R-19; RZ-031, DESIGN §3, §4.4, D-203; closes OQ-050) — The Rabakz phone keeps its built departures from board 4 (Locked out pill and note, "Right" at 34 px, the "Connected" header with Menu, Skip in the play area). The kit pulses a status title only on success (Right, New best). Titles in one status strip share the smallest size any needs at that width. DESIGN §4.4 records the departures. Randy may overrule.

**D-236 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (T-15; TR-063, RZ-033, D-050; closes OQ-006) — Music is synthesised in code: one loop per Tabao Rush venue, 0 KB to download, default Music level 0.4 under Effects 0.8, chosen from a playable artifact by recommendation. Peek Poker and Rabakz have no music in v1, since no requirement asks for it. Randy may overrule, including by adding a music requirement for them.

**D-237 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (R-08; RZ-006) — Only the leader may skip a Rabakz question; in solo that is the player. The R-08 sighting of Skip on every phone did not reproduce. No change. Randy may overrule.

**D-238 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (RZ-005, RZ-006, D-101(d); closes OQ-035) — Before the reveal the TV marks only wrong answers ("Locked out"); a correct answerer reads "Thinking" until the reveal, which follows within 0.25 s. RZ-005 is reworded to say so. Randy may overrule.

**D-239 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (DESIGN §4.4, D-122; closes OQ-037) — DESIGN §4.4 now states D-122's floor for narrow phones. Randy may overrule.

**D-240 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (RZ-010, RZ-011, D-157; closes OQ-039) — `docs/games/rabakz.md` §3 now describes setup as built under D-157: the leader taps settings on the phone; watchers read "⟨leader⟩ is setting up"; teams are chosen in the lobby. Randy may overrule.

**D-241 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (P-06, P-07; PP-008; closes OQ-043) — The reveal keeps the two-row seat-marker block on a shared card; with up to eight markers the rank and corner suit stay readable (P-06 round5-p8/22; P-07 8-phone reveals). Randy may overrule.

**D-242 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (PERF-023, PERF-024, D-193; closes OQ-046) — PERF-023's 8 MB per round applies to one round of any game, with all its assets; RZ-020's 2 MB for a Rabakz match stays as well. No budget is loosened. Randy may overrule.

**D-243 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (A-09; PLAT-004, PLAT-006, PLAT-025; confirms D-200; closes OQ-049) — The setup feedback band and two-line player tiles stay as built. The comparison stills (reserve kept, reserve hidden, band) are rendered for the record. Randy may overrule.

**D-244 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** — The five working assumptions in OPEN-QUESTIONS.md are confirmed as working rules; the real-device sign-off of input delay stays with Randy's UAT session (OQ-028). Randy may overrule.

**D-245 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (part of OQ-001) — The four names stay as working names through v1 and nothing is renamed pre-emptively; the trademark and existing-game check stays with Randy before public release (M8). Randy may overrule.

**D-246 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (PERF-010, PERF-011, NET-004, D-014, D-058; part of OQ-028) — PERF-010's clock and 50 ms figure are unchanged; if real phones exceed it, the host moves to a 120 Hz step with step-based rules re-expressed in time. Phones keep sending 60 ticks a second (D-058). D-014's relay estimate is corrected to the measured 22 MB an hour per phone; the 800 GB limit is unchanged. The real-phone run, the HTTPS tunnel and the relay run wait for Randy. Randy may overrule.

**D-247 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (PLAT-011 new, NET-002, DATA-004, D-081, D-089; part of OQ-030) — Recommended for the first deploy: Workers Paid with a US$10 billing alert, the ten-minute limiter hold, all logging off, and a staging probe first. The privacy sentence stays as shipped if the probe shows memory holds; otherwise it gains the stored-for-ten-minutes clause of D-089's fallback. A host kick that blocks rejoining is added as PLAT-011 and built in C-23, rendered for the record. Plan, spend, secrets, staging and public deploy and DNS wait for Randy. Randy may overrule.

**D-248 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (TR-005, TR-006, D-091; part of OQ-032) — D-091's tuning stays as the baseline, judged at T-16 against: 1 star for a first-time crew of 2 to 4 on level 1, 3 stars for clean play, the board not full for over 30 s at 8 cooks, plates a bottleneck only where a level intends it. Settled by playtest. Randy may overrule.

**D-249 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (PERF-001; part of OQ-038 and OQ-034(d)) — Assessed PERF-001 runs need the display in a 60 Hz mode as reported by the system, and the harness assesses PERF-001 only then; the budget and wording are unchanged. Counting work plus dropped refreshes was rejected as a loosening. If a 60 Hz run still fails with no dropped frames, it goes to Randy. Randy may overrule.

**D-250 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (REL-004, REL-006, D-179, D-212; part of OQ-051) — Firefox is checked by hand at X-09; no runner option. A phone whose link has not opened after 15 s says "This phone could not connect to the big screen. Connect it to the same Wi-Fi as the big screen and scan again." with Try again (K-11). Safari and iPhone remain unproven until Randy's real-device runs. Randy may overrule.

**D-251 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (C-15; PLAT-023, DESIGN §6) — The Paused veil tells the leader "Resume or quit to the picker." and others "Only the leader can quit."; disabled buttons are drawn at half opacity with a "Leader only" note. Rendered for the record. Randy may overrule.

**D-252 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (X-01; D-180(g)) — No favicon is added in v1, as no requirement covers it; the UAT harness keeps treating the web origin's `/favicon.ico` 404 as expected. Randy may overrule.

**D-253 · 2026-11-18 · Claude (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** — Every open-question placeholder drafted in issue reviews up to 2026-11-18 is decided in D-219 to D-252; none is added to OPEN-QUESTIONS.md except OQ-052, opened and closed at once. Randy may overrule.

**D-254 · 2026-11-18 · Claude, integrator** (R-08; RZ-001–RZ-016, RZ-032, PLAT-025, PLAT-033) — R-08 closes with two recorded known gaps: PLAT-025 (no team colour during play) and RZ-009 (no final-round announcement). They are named UAT steps that write JSON evidence instead of failing, so the rest of the match is still tested; every other assertion stays a hard failure. In teams, seven phones are seated so the late joiner has a free seat (D-202). The RZ-008 TV streak was found missing at review and moved to R-18. Team-mode placings are D-221. Randy may overrule.

**D-255 · 2026-11-18 · Claude** (X-01; REL-002, follow-up from X-02 review) — The landing's four links (Host a game, Put this on your TV, Privacy, Credits) form one linear list in reading order on both axes: Down and Right go forward, Up and Left go back, and the ends stop without wrapping; there is no spatial (2-D) navigation. An arrow with no landing link and no editable field focused focuses Host a game; Space with the page body focused opens Host a game (as D-156). Enter is the browser's own; Space activates the focused link and ignores key repeat. Arrows and Space with Alt, Ctrl or Meta pass through to the browser. Host a game is focused on mount on the TV layout only (≥ 1001 px, preventScroll), as the legal pages do (D-189), so phones show no ring at load. The landing keeps the shared 5 px ink focus ring (style.css); DESIGN.md names no focus token. The ring crossing the footer pill's edge is left for X-09. Merged without a second verify after main moved on: main's commits since the branch's last merge of main touch no file the branch changes and nothing in apps/web, and the merge was conflict-free (verify passed on the branch at 7a95ec26). Chosen by recommendation; Randy may overrule.

**D-256 · 2026-11-18 · Claude, integrator** (P-10; PP-032; refines D-209) — The Peek Poker scoreboard shown after the last round says "Final scores in 5 seconds"; earlier scoreboards keep "Next round in 5 seconds"; the podium shows neither, leaving the shell's hint as the only hand-off (D-209 otherwise stands). Five seconds matches the rule (scoreboard 5 s after every reveal, `SCOREBOARD_STEPS`). Phone copy stays "Scores on the TV". The hint is a fixed line and does not count down (P-05 behaviour, unchanged). Randy may overrule.

**D-257 · 2026-11-19 · Claude, integrator** (T-07; TR-001, TR-030, DESIGN §6; exception to the 34 px in-play floor for station names only) — On the Tabao Rush TV, a station or crate name that will not fit its tile at 34 px is drawn at the largest TV type token that fits, never below `tvType.label` (21 px). It is never split, never overflows its tile and is never omitted; two-word names wrap first where the band has room (station bands have one line). Names are inset 5 px on each side facing another labelled tile. Dish names on cards, station state words, rejection notes and HUD text stay at 34 px. `tvType.label` is documented as for text nobody must read in play, so this is an explicit, temporary exception: single words such as "Extinguisher", "Cucumber" and "Pineapple" cannot fit a 120 px tile at 34 px without splitting or overflowing, and the A-05 station art and A-06 baked levels are what identify a tile in play. Revisit when A-05/A-06 land. Randy may overrule.

**D-258 · 2026-11-19 · Claude, integrator** (C-18; PLAT-022, PLAT-024, PP-032, RZ-032; refines D-209) — Game-drawn final screens share one hand-off line from the shell, drawn on a 1920 × 1080 layer at the board's `--screen-scale` in an 89 artboard px band at the foot (55 px inset plus a 34 px line, `FINAL_HINT_BAND`). Games keep every final row above the band without scaling text below 34 px at 1080p; Rabakz drops its own "Leader can continue" on the final screen (the scoreboard keeps its automatic-continuation line) and, for an all-tied team final, sets the podium's member and player gaps and the group-label extra gap to 0 (allowed by DESIGN §1) to recover 46 px, keeping the body centred with 55 px margins. Peek Poker's 89 + 55 reserve is replaced by the band. Review 1's top-left body scale was rejected. Untied 8-player team lists sit at a 0 px row gap (legal; carried to OQ-047 polish). Randy may overrule.

**D-259 · 2026-11-19 · Claude, integrator** (C-20; PLAT-030–033, PERF-023, PERF-024; supersedes D-146 for the recipe conformance test) — Conformance tests run whole simulated matches; their run time grows with machine load, and verify failed at load 7–12 when an attack test hit Vitest's default 5 s and the Python asset suite was killed at 60 s. Each conformance test now carries `conformanceTimeout(measuredMs)` from `@kaki/platform/kit`: max(15 s, ceil(4 × the slower of two single runs taken alone at load under 8) s), with the measurement written beside the test and the table in `docs/slices/C-20-conformance-timeouts.md`. The asset-pipeline child gets 156 s (4 × 39 s at load 10.9), its test 13 s more so a kill is reported as a kill, and every Python child in that file reports status, signal and timeout. These are test-runner wall-clock limits for correctness tests, not performance budgets; no PERFORMANCE.md threshold and no global Vitest timeout changed, and no conformance check or scenario was removed. The kit was made cheaper where that was safe (one graph walk per step for size and sharing; phone placement cached after full validation; borrowed-object paths built only on a hit), which roughly halves the fixture tests; the whole-match game tests were not measurably cheaper and rely on the larger limits. Vitest fails a synchronous test only after it returns, so these limits bound slow runs, not hangs. Randy may overrule.

**D-260 · 2026-11-19 · Claude, integrator (delegated by Randy, 2026-11-18: "make the decisions for all outstanding questions")** (R-18; RZ-008, RZ-009, RZ-012, D-216) — The TV shows the streak in the reveal's full-width outcome line, not in seat tiles (a seat tile at 8 players has about 133 px and the name plus points already take 132.6 px). When exactly one player won and their streak is 2 or more, the line adds " · Streak N"; from 3 on it also adds " · +B bonus", where B is 50, or 100 in a final-round question (RZ-009). The text is measured with the line's own 34 px bold token; if it does not fit, the bonus goes first, then the streak; the winner's name is never shortened or squeezed. Several simultaneous winners (a tie, or team-mates together), nobody-won reveals and streak 1 show no streak on the TV; every player's streak stays on their phone. This meets RZ-008's "the big screen shows the streak" for a single winner by this decision rather than to the letter. In team matches a single winner's streak shows as in free-for-all, because streaks are individual (RZ-012); R-15's team chip and team award must keep this line and its measurement. Randy may overrule.

**D-261 · 2026-11-19 · Claude, integrator** (P-11; PP-008, PP-009, PP-010; D-223) — In D-223's tied-hand order, "random fills last" puts a hand with any randomly filled pick after every hand its owner picked in full, including a full pick that was never locked in. Among unlocked hands with equal hand and points, full picks come before random fills, and seat decides only between hands equal in all of these. Randy may overrule.

**D-262 · 2026-11-19 · Claude, integrator** (R-17; RZ-006, RZ-007) — On a Rabakz reveal, a phone with no pick this question reads "Skipped" only when that player's own accepted leader Skip ended the question; every other phone without a pick (idle players, guests when the leader skips, mid-game joiners) reads "No answer". A recorded pick still reads Right or Wrong and takes precedence. The flag is one private boolean per seat, reset each question, and never in `publicView`. Same-step rule: an accepted solo wrong answer from a connected player reveals inside the step's tap loop, so a later Skip in that step does nothing (rabakz.md rule notes: taps in the order received; conformance repeat-taps). Picks, points, streak and reveal timing are unchanged. Considered: "Skipped" for everyone on a skipped question (RZ-007's "a skipped question"); rejected because a guest's own outcome was no answer, and only the leader skipped. Randy may overrule.

**D-263 · 2026-11-19 · Claude** (A-03; TR-061, TR-064) — Only the cap head carries the player or team tint. The board-1 bun's accent ribbon sits wholly inside its hair (kalib.py:208 against :206), so no facing shows it and the seven new heads' masks are empty; the apron carries the colour for every character (DESIGN §4.6). From behind no apron shows, so only the cap cook shows colour there; the seat marker (T-07) carries TR-061's colour clause. Heads are added as sibling `pipeline.*.json` extensions so the published body, cap and items stamps stay unchanged. The review gate also scores the cap tinted in each PLAYER_COLOURS entry (lowest 0.241, seat-3 yellow against specs s).

**D-264 · 2026-11-19 · Claude** (under D-142; A-03; TR-061, DESIGN §6) — The bun is enlarged to radius 0.45hr at 1.35hr above the head centre (head-local in cook_heads.py; kalib.py unchanged), making the cook 1.86 tiles tall. Its knob breaks the outline from s, se and sw, slightly from e and w, and shows as a knob inside the dome from ne, n and nw. Review gate: every pair of heads at least 0.20 greyscale difference in every facing (lowest bun/songkok n 0.230; the 0.25 margin target is missed by that pair and auntie/bun sw 0.249). Board: https://claude.ai/artifact/UBC7KrsbjrgXn5uRMRH4ty (rounds 4, 5, 6). Randy may overrule.

**D-265 · 2026-11-19 · Claude** (under D-142; A-03; TR-061) — The turban is kopi brown #6B4426 (the DESIGN §4.2 console token) instead of board 1's #2F5FA8, which was close to team blue #2F7FD6; it is outside PLAYER_COLOURS and reads brown beside orange, red and blue caps. Board: https://claude.ai/artifact/UBC7KrsbjrgXn5uRMRH4ty. Randy may overrule.

**D-266 · 2026-11-19 · Claude** (under D-142; A-03; TR-061, DESIGN §6) — Specs hair is muted brown #997C63 (a new art colour, not a §4 token) instead of #1F1A17, because bun and specs read as one black dome from behind (round 5: 0.008–0.227). Authored luma 129.8/255 against bun 35.4, uncle 182.0 and turban 76.2; rendered bun/specs 0.927–0.984. The existing secondary #706151 was too close to the turban. Board: https://claude.ai/artifact/UBC7KrsbjrgXn5uRMRH4ty. Randy may overrule.

**D-269 · 2026-11-19 · Claude** (K-10; PP-005, D-218, DESIGN §6) — D-218's 5.1 : 1 is measured against the card back's base colour (#B5371F); over the lighter stripes the disc measures about 4 : 1, above the 3 : 1 needed for non-text marks. K-10's own two-phone stills at 667 × 375 and 844 × 390 replace the planned P-07 re-shoot as the evidence for selected backs. Randy may overrule.

**D-270 · 2026-11-19 · Claude** (C-22; PLAT-009, D-186, D-226) — The host snapshot stores `scores[seat-N][gameId]` under the unchanged key `kaki.host-reconnect.v1`. A results screen adds to the selected game's total once. On read, a snapshot whose scores are one number per seat (from before C-22) keeps its room, seats, leader and last results and has its scores emptied, because those totals may mix games and nothing says which game earned them. Any other score shape fails validation and the snapshot is discarded. ARCHITECTURE updated to match. Left for later (not a v1 risk, since only registered game ids are written): a cap on game ids per seat so the write fallback can never be blocked by scores, and a non-empty guard on the UAT's captured score string. Randy may overrule.

**D-267 · 2026-11-19 · Claude, integrator** (K-11; REL-006, D-250) — The 15 s could-not-connect window is measured from the start of a join, and only for a phone that has never been seated in that page. A phone that was seated keeps Host disconnected and the hold-over states. For a never-seated phone, the driver's host-absent signal shows Joining the room…, not Host disconnected, since there is no seat to rejoin. Once shown, the advice stays through automatic retries and the reconnect hold window ending; it gives way only to a seat or a terminal state (room closed, room full, out of date, cannot connect, replaced). Can't reach the room (pairing server unreachable) keeps its own copy and does not start the window. A screen lock during connecting keeps the original deadline. Try again starts a new window. Randy may overrule.

**D-268 · 2026-11-19 · Claude, integrator** (X-10; RZ-021, DATA-004; applies D-232) — The game ships its question bank only inside a hashed JS chunk, so the build also writes `/rabakz/questions.json`, which Credits offers as `kaki-arcade-rabakz-questions.json`. It is made from the same validated bank in the same build (no second build or validation, no separate package), a second copy in another format. It holds only the adapted Open Trivia Database (`otdb-`) questions, 2,342 today, and their CC BY-SA 4.0 notice (source, licence link, what was changed, same-licence offer), because CC BY-SA 4.0 covers only those (CREDITS.md). The Singapore pack and other Kaki Arcade-written questions are not in the file and are not offered under that licence unless Randy says so. The file is never preloaded. It counts against the PERF-022 deploy-shell figure (+151,868 B gzip, 684,398 of 1,500,000) and is not exempted. Serving the path on production hosting is checked when web hosting exists. Randy may overrule, including by licensing the Singapore pack too.

**D-271 · 2026-11-19 · Claude, integrator** (T-07; TR-030, TR-031; closes D-215 on the TV) — Each station shows a 44/42/34 plaque with five glyphs (empty, working, done, fire, burnt) and an eight-cell bar, with no text or ring. Draw order: fire 19999.5, cue 20000, rejection note 20002, seat markers 30000. Randy may overrule.

**D-272 · 2026-11-19 · Claude, integrator** (T-07; TR-030, TR-061; A-05 anchors) — Cue anchors are taken relative to the A-05 root [96,128] at tile/120 scale on the tile centre. North-wall cues sit above the counter in the screen margin, as in the A-05 art; their pulse box is clamped to the 5 px screen safe area, all other cues to the level box. The seat marker's x always equals its cook's x. Its y is min(normal + 54.5, max(normal, band + 26)), where the band is the lowest cell bottom over every north station that can show a cue; the cap keeps the disc's centre at feet −62 or higher, above every head socket, and the disc may then touch the bar's border. The fallback is used only by levels of 8 rows or more; no fixture level uses it, and a 7-row level would bring a north cue near the dev caption. The disc has a 2 px ink edge, at least 3 : 1 by token against caps and floor; it renders at about 2.9 : 1 at 1280 (JPEG), left open as a should-fix. Why: rounds 10 and 11 showed a per-cue push either jumps or covers the cook. Randy may overrule.

**D-273 · 2026-11-19 · Claude, integrator** (T-07; TR-004) — The rejection note is sized to its text at 34 px and placed once when the rejection appears, inside the level, clear of cards, HUD, cooks, every visible cue at pulse size and every counter-item spot; then it holds. The text is the round-7 sentence for each code. Randy may overrule.

**D-274 · 2026-11-19 · Claude, integrator** (T-07; TR-001; extends D-220) — Recipe steps use `tvType.label` (21 px), up to two lines, until A-11's step icons. Randy may overrule.

**D-275 · 2026-11-19 · Claude, integrator** (T-07, A-05; TR-030) — The cue gold is #E0A63A, taken from `THEMES['peek-poker'].accent.fill`, equal to A-05's unlit cells (round 8), until A-05's packed cue sprite replaces the drawn placeholder. Risk: a change to Peek Poker's accent would recolour Tabao Rush cues until then. Randy may overrule.

**D-276 · 2026-11-19 · Claude, integrator** (T-07; TR-001) — Placeholder steps are capitalised words separated by a single space; " · " needs three lines on a 123 px card by mock measure (not checked in the real font). Placeholder until A-11. Randy may overrule.

**D-277 · 2026-11-19 · Claude, integrator** (F-10; PERF-040, PERF-001; keeps D-100, D-227, D-249) — **Sample minimum:** PERF-040 is judged per game on at least 10,000 eight-player step samples (about 100 in the top 1%), gathered after one warm-up match by repeating complete matches on successive seeds from 808. This is a validity minimum, not a budget. A module that cannot seat eight players fails. **Contention:** contention is read at the start and end of the run. If either is detected (one-minute load above the logical CPUs), a pass becomes "not assessed" and a fail stays a fail. Either way the run exits non-zero, as browser scenarios and the controller check do. "Unknown" contention does not block; a quiet machine remains the integrator's duty. **60 Hz guard:** a 60 Hz mode is a reported rate within 59.94–60.06 Hz inclusive. The guard passes only when every online display reports a rate, all report the same qualifying rate, and the rate is unchanged at round end. A display with no reported rate (the built-in panel) gives "not assessed". A Chromium pass is slice-gate evidence only. No budget changes. Randy may overrule.

**D-278 · 2026-11-19 · Claude, integrator** (under D-142; A-05, A-07, T-07; TR-010, TR-030, TR-031; amends D-191) — Station art covers only the states the rules reach (wok, pot, grill, rice: all five; chop, drinks, sink, plating: empty, working, done, on fire; bin: empty, on fire; serving, dish rack, return counter: empty). Fire has its own anchor [96,120], so A-07's fire origin [48,77] lands low on the station and the flame clears the plaque by at least 4 px. D-191's 'effect point' now means this fire anchor. Steam and sparks start at the effect anchor [96,77] and are not clipped. The painter order (body, food, fire, effect, progress, cue) draws the bar and plaque over them, so working steam is mostly hidden (114 / 170 / 150 / 179 of 187 px visible on wok / pot / grill / rice). Closed vessels show no food. The bin has a light lip. All overlays share root [96,128]; named anchors are feature positions, not offsets; half detail halves every anchor and draws at 2×. The convention is in docs/ART-PIPELINE.md, Station frames. Randy may overrule.

**D-279 · 2026-11-19 · Claude (delegated by Randy, 2026-11-18)** (A-05; TR-030, TR-031; closes D-215's open conditions) — Burnt-food smoke ships as the four-frame loop at 8 fps, because the still did not read as rising smoke; reduced motion shows smoke-2. The bar's cells, track and marks are rendered unlit, so the gold is #E0A63A, matching T-07's placeholder (D-275), and the ink is #2B2118. In greyscale, filled cells read about 171 and empty cells about 230 with an ink mark of about 37. The 42 px plaque, 4 px border and 10.5 px cell pitch are sprite geometry. The φ plaque is for the board only and is not packed. Accepted as-is from review 9: the plaque ring stays lit, a slight brown step from the unlit track; the crate's ink rails fade on a very dark floor (for the A-06 scene review); kalib's AgX look assignment still fails and is caught, guarded by test_committed_progress_palette. Randy may overrule.

**D-280 · 2026-11-19 · Claude (delegated by Randy, 2026-11-18)** (T-08, T-08b, T-17; TR-020, CTRL-007) — The Tabao Rush controller (T-08) ships with the stick and the A, B, X, Y and Start buttons on K-04's parts, without waiting for tilt and shake (K-06), which needs Randy's real-phone capability check (S-05). The optional wok shake moves to a new issue, T-08b, after K-06; the button stays its fallback, so no rule changes. This unblocks the first end-to-end round (T-17) and everything after it. Randy may overrule.

**D-281 · 2026-11-19 · Claude (delegated by Randy, 2026-11-18)** (A-06, A-06b; TR-050, TR-052, TR-057) — A-06 is split. Only two level layouts exist today (the kopitiam first shift and the zi char test kitchen in `games/tabao-rush/src/levels/catalogue.ts`); the other six co-op levels and the three arenas are designed in T-11 and T-14. A-06 now builds the background pipeline (bake from a level definition, export and check the collision map and anchors) and those two backgrounds, with the venue look put to Randy as a board, so the first end-to-end round (T-17) has real art. A-06b renders the rest through the same pipeline after T-11 and T-14. Randy may overrule.

**D-282 · 2026-11-19 · Claude (integrator, C-27 review; delegated by Randy, 2026-11-18)** (C-27; CTRL-009, PLAT-006, PLAT-021, PLAT-024; amends D-230 and D-231) — (1) Copy: with only the TV seat, a watch game's start screen heading reads "Waiting for a phone", the hints drop "Enter: start", and the feedback band carries the one message "⟨game⟩ needs a phone. Go back and scan the code in the lobby to join." (replacing D-230's "Scan the code to join.", because no code shows on the start screen; Back goes start → picker → lobby, where the code is). The tile shows no minimum-player reason and is not aria-disabled; Select and the tile use the same participation count; "N of 8 players" still counts every room seat. (2) Leadership: after the leader grace (10 s) or restore wait, the leader is elected from connected phones in seating order; when no phone is connected, any connected seat, the TV seat included, leads, and a connected phone takes the lead back. For leadership, "seated" in D-231 and PLAT-006 means connected: a held (disconnected) phone neither leads nor blocks the TV seat from leading, so the host is never stuck (PLAT-024). Snapshot capture uses the same rule. (3) A held phone still counts as a game player for Start (held seats count as seated), so a TV seat beside a held phone may start a watch game; the refusal applies only when no phone seat exists. PLAT-006's wording ("leads only while no phone is seated") should read "while no phone is connected": logged in OPEN-QUESTIONS for Randy. Randy may overrule.

**D-284 · 2026-11-19 · Claude, integrator (A-11 review; delegated by Randy, 2026-11-18)** (A-11; TR-001; extends D-220) — Step icons take only their coverage (alpha) from Blender; `ink_png` writes the RGB as exact #8E2A18, and the packer gives half detail exact ink and normalises each frame's alpha to a 255 core, with the ink read from the set's options rather than hard-coded. Glyphs sit inside a 2 px clear margin (1 px at half) and are centre-anchored at [17,17]. The distinctness gate requires at least 6% of the 34 × 34 box to differ between every pair, after aligning for shifts, at full detail and at half detail reconstructed to 34 px; it catches near-duplicates, it does not prove recognition. The glyphs are for light order cards only (1.87:1 on the dark ground), so T-07/T-18 never draw them on a dark ground. Spread is the weakest glyph and is the first to redraw if the 3 m check finds it unclear. D-283 is reserved for R-15. Randy may overrule.

**D-286 · 2026-11-19 · Claude, integrator (T-18 review; delegated by Randy, 2026-11-18)** (T-18; TR-040, TR-041; reads ART-PIPELINE §10). (1) The TV renderer reads `composition`, `servedComposition`, `contentCompositions` and `portionScales`. `containmentFootprints` is validation data and is not read; `bakedOutline` means the picture already carries its ink, so no outline is added — the T-18 backlog row's "containment footprints, outline flags" therefore add no code. (2) The reader works only in full-resolution source coordinates (89 × 89 canvas, anchor [44.5, 44.5], manifest `rect` and `trim`); no anchor is halved, and half-detail textures draw at twice the sprite scale. (3) Item layers share one depth with a small per-layer offset; held items keep the cook's hands-in-front convention. (4) Each pooled item has a fixed number of draw records, derived from the largest reachable composition (9); layers past it are counted as overflow, not dropped silently. A held dish is mostly hidden by the cook's cap and hand at game size; that is carried to T-17 and the 3 m TV check, and any fix (larger or offset held items) goes to Randy as a board. Randy may overrule.

**D-289 · 2026-11-19 · Claude, integrator (C-25 review; delegated by Randy, 2026-11-18)** (C-25; PERF-002, PERF-023; amends D-113's cache key; under D-228). The benchmark scene is an optional host-only `GamePresentation` (`benchmarkScene`, `loadBenchmarkAssets`), separate from the pure `GameModule`; each frame it forces its drawing work at viewport × devicePixelRatio. Start runs it after round assets and before the host screen mounts, through the platform's `runDetailBenchmark`: 1 s of rAF intervals after 5 warm-up frames, with a 1.4 s wall time-out. A visible run with fewer than two intervals counts as Lower with the Lower budget unmet, and is cached. A hidden page, an invalid sample, a cancel or any benchmark error falls back to Full, uncached; a failed half-atlas load still fails Start. The verdict is cached per game in the platform host store (`detail-benchmark-<id>-v2`), keyed by user-agent hash, screen width × height and devicePixelRatio. Unlike D-113 it does not run the idle-cadence probe or key on refresh rate, because the probe costs about 0.5 s on every Start; a TV that switches between 50 and 60 Hz keeps its verdict until the setting changes. On Lower, a real game's scene must release its full benchmark resources before Ready (owed by T-17). Randy may overrule.

**D-290 · 2026-11-19 · Claude, integrator (R-16 review; delegated by Randy, 2026-11-18)** (R-16; RZ-009, RZ-030; settles D-217's open details; DESIGN §4 4A, §6) — The final round as merged. (1) The ×2 badge is plain text in the mono face at 144 px, with no chip or extra treatment, so the panel keeps one surface treatment. (2) The "Double points" chip (34 px, chip tokens) stays on each final question's header through its reveal, not only while the question is open, so the doubled award is explained when it lands. (3) Into and out of the card, the screen change is DESIGN 4A's paired crossfade at `slow`: the incoming screen fades 0 → 1 above the outgoing screen, which stays fully drawn and is removed when the fade ends; reduced motion has no fade. This departs from DESIGN §6's "exits about 20% shorter": a shorter fade-out of the outgoing screen would expose the plum ground mid-change and break §6's "no blank frame". Randy may ask for a timed exit instead. (4) Every Rabakz screen change isolates its screen layers (`.rz-block { isolation: isolate }`), so the incoming screen always draws above the outgoing one; before this the outgoing question's z-indexed option layer could draw over an incoming card or podium. Crossfade timing is unchanged. (5) Eight-phone R-08 full-match runs may use `--max-mb 18` instead of docs/UAT.md's default 12 MiB (the four 1920 × 1080 card and podium strips are about 1.8–1.9 MB each; the r16 runs used 16.8 and 15.9 MB); single-phone runs keep the default; superseded run folders are removed when their replacements are committed. The hand-off line drawing over the outgoing screen before the final-results crossfade belongs to C-28. The screen's outgoing exit animation is dead code (the outgoing layer is inert) and its unit test mocks `closest`; a follow-up removes it. Randy may overrule.

**D-291 · 2026-11-19 · Claude, integrator (T-07b review; delegated by Randy, 2026-11-18)** (T-07b; TR-061, TR-001; amends D-271, D-272, D-276) — Seat markers draw at z 30000 plus the cook's screen y, so the nearer cook's marker is on top; everything else in D-271's draw order is unchanged. The disc has a 3 px console-ink edge at radius 19.5 (outer 21), replacing D-272's 2 px edge; on lossless 1280 captures the edge/cap contrast is 3.58:1 (seat 1) and 3.30:1 (seat 5). The numeral is centred on its measured canvas ascent and descent. At the rules' minimum cook separation (0.36 tile) two markers may overlap: a vertical pair at the north band sits 33.66 px apart, an 8.3 px overlap with both numerals clear; swept over every angle, the nearer disc's edge covers the far numeral's glyph box by at most 1.92 px. This is accepted because the numerals stay legible, and pushing markers apart would break "marker x equals cook x" (D-272). Recipe-step placeholders are now checked in the real browser font (`text.dom.test.ts`), closing D-276's "not checked in the real font". Randy may overrule.

**D-292 · 2026-11-19 · Claude, integrator (A-06 review 3; delegated by Randy, 2026-11-18)** (A-06; TR-050, TR-057; extends D-281) — (1) Default look. The two level backgrounds ship the Terrazzo look until Randy chooses from the A-06 board (https://claude.ai/artifact/P83XXGhgt7WvVbrHAuzzYX). Tile and Golden stay rendered but are never preloaded. Choosing a look changes only the set's folder and look in assets/src/pipeline.levels.json; the render jobs stay. Golden differs from Terrazzo only in the counter-front band (cream : jade 1.618 : 1 against about 1.86 : 1, about 3 px on screen; 3,320 and 3,809 pixels differ by more than 12 levels). (2) Floor band. A Terrazzo or Golden render passes only if its empty floor at full resolution, measured by tools/assets/level_floor.py --crop 800 450 1100 550, has a greyscale standard deviation of 3–9 levels (0–255): visible depth, never louder than cooks and items. test_level_pipeline.py checks the committed renders. Measured: kopitiam 4.78, zi char 4.35. The band does not apply to Tile, whose treatment is its joints (2.36 and 1.51). A new venue picks a crop clear of fixtures and shadow. (3) Venue colours. Trim jade #5E9C84 (VENUE_JADE) and the zi char floor #E6DCC3 are defined in tools/blender/levels.py and kept out of station_geometry.PALETTE, so A-05's approved station renders and stamps do not change. They are art colours, not UI tokens (DESIGN §4.2). (4) Bodies. Only static fixture bodies are baked. Carried and consumable items (the extinguisher today) are never baked; their tile keeps a counter with an inset steel top inside the trim edge. Low bodies (the crate) have no counter surround. Plates inside A-05's static bodies are baked for now (OQ-055). (5) Frame. The floor top ends at y=826; the slab's front edge shows to about y=835, about 46 px above the HUD cards. Randy may overrule.

**D-293 · 2026-11-19 · Claude, integrator (A-02d review; delegated by Randy, 2026-11-18)** (A-02d; TR-060; amends the A-02d backlog wording). The cook's walk and carry-walk take the proposed gait from the rendered current-against-proposed board (artifact 7rXBPszMUUozLTHPRgprtz; source docs/design-gate/A-02d-cook-gait/). As built in tools/blender/cook_gait.py: (1) the spine translates on a once-per-stride circuit of ±0.05 tiles sideways and ±0.05 tiles fore-and-aft and rotates ±0.04 rad in pitch and yaw (no roll); the backlog's "about ±0.10 rad" was not used, because the torso shift carries the sideways read and larger rotation broke the 6 px head-anchor limit. (2) Bob 0 to 0.03 tiles, once per stride (lowest frame 0, highest frame 4), so the two steps differ by about 3.6 px at 120 px per tile. (3) Walk arm swing falls from ±0.18 to ±0.06 rad, so the arms do not cancel torso travel in the east-facing projection; carry arms keep the fixed hold and ride the torso. (4) Keys smoothstepped with zero velocity at each key: no overshoot; head upright. Feet, stride, counts, fps and frame size unchanged. (5) The gait lives only in the walk jobs: cook_walk.py loads cook_poses.py into a private namespace; cook.py, cook_poses.py and the other cook jobs stay byte-identical, so none is restamped. (6) Walk gate (cook_strips.py --check-motion): each foot ≥ 15 px, each hand ≥ 8 px, head sideways ≥ 8 px, opposite-phase change ≥ 1.5 × idle, 8 facings, both walk actions; all pass (E/W head sideways 8.8 px). Cost: cook sheets +62,440 B transferred and +1,838,304 B decoded; Tabao Rush round 2,491,936 of 8,000,000 B and 57,289,584 of 256,000,000 B decoded. Cook-body page 2 grows from 1560 × 1954 to 2046 × 1954. The walk gate also holds each head-anchor step within 6 px (largest 5.56 px) and fails on a missing walk landmark. Randy may overrule; the board's alternative is main's current gait.

**D-294 · 2026-11-19 · Claude, integrator (C-24 review; delegated by Randy, 2026-11-18)** (C-24; RZ-033, TR-063; settles D-229's open details; DESIGN §4.2, §6)

The TV sound unlock as merged.
1. Host a game stays an `<a href="/host">`. Only an unmodified primary click is intercepted: it starts the shared engine synchronously, then calls `pushState` and fires `popstate`. The engine is module-scoped and survives landing → host and Back. It is never closed by the lobby's unmount.
2. One capture-phase callback on click and keydown is removed while the context runs. It is re-armed on any other state (suspended, or WebKit's interrupted). A game pad is not a gesture, so a pad-only TV stays blocked until a click or key.
3. While blocked, each pause level row keeps its grid:
   - the number column (`--ka-space-55` + `--ka-space-13`, enough for "100") is left empty;
   - "Sound is off" (body font, `aria-valuetext`) takes the row's second line, which is `--ka-type-34` × `--ka-line-body` tall in both states;
   - the bar is hidden.
   So nothing moves on unlock. In return, the running row is about 37 px taller than R-07's, and the 1080p panel is about 740 px instead of 668 px. The bar sits centred in that line.
4. The swap is a same-frame state change, with no new motion.
5. Chromium 156 in UAT does not block a context created without a gesture. The block is shown by DOM and unit fakes, and by suspending the context programmatically. A real TV is checked on X-09.
6. The UAT measures pause rects only after finite animations finish, because the popover's 0.95 entrance gave sub-pixel differences. The DOM test compares rects with no wait under reduced motion.

Shown to Randy as a side-by-side board (https://claude.ai/artifact/6M8MpCePLFZ5yfXzCiSc31). Randy may ask for R-07's tighter running row or a placeholder in the empty column instead. Chosen by recommendation; Randy may overrule.

**D-295 · 2026-11-19 · Claude, integrator (R-20 review; delegated by Randy, 2026-11-18)** (R-20; RZ-012, RZ-016, RZ-032; refines D-221 and D-233; supersedes D-258's zero-gap clause)

The Rabakz final podium as merged:
1. One step per place holds all its players in 55 px rows at 34 px with a 0 px row gap. This replaces D-258's tied-team zero member and player gaps and its untied 0 px list gap; steps keep 144, 89 and 55 px surfaces.
2. In teams only teams are placed, by authoritative team totals. A total may be lower than the sum of its members, because a question scores once per team (RZ-012). The screen never adds up members.
3. The team header stays C-18's 55 px colour mark plus the 34 px bold name, with the total in "pts" below. The full-width team-colour pill tried in round 1 was dropped rather than put to Randy. Whether the podium takes R-15's team chip is left to Randy as a rendered board.
4. Podium individual scores drop the repeated "pts" (kept in the accessible label); team totals keep it.
5. Team totals count up from the previous standings, like player scores.
6. Every results title, scoreboard included, reserves 13 px below its 55 px line, because the display face's scroll box measured 65 px in Chromium.
7. The final header is an `h1`, as on the other results screens (R-16).

8. The 8-player free-for-all and late-joiner scoreboards are checked at 1920 and 1280 (round 5). Randy may overrule.

**D-287 · 2026-11-19 · Claude, integrator (T-09 review; delegated by Randy, 2026-11-18)** (T-09; TR-064, TR-056, CTRL-003, CTRL-009, PLAT-008; reads D-231, D-282).
1. **TV seat in pickers.** A keyboard or pad seat at the TV takes part in a phone picker through the generic local mapping.
   - A press of Space, Enter or pad A taps the first single-option control whose audience includes the seat, if that control is not disabled.
   - Each press counts once. Key auto-repeat is ignored. A key or button already held when the seat's input is bound is not counted until it is released. Presses count only once round preparation has finished.
   - A fresh key press is kept until the next input sample, so a quick tap between two samples still counts once.
   - The tap goes through the same authenticated, revision-checked action path as a phone.
   - In the Tabao Rush cook picker the seat keeps its seat-order default and readies.
   - No game-specific code goes into apps/web or the packages.
2. **Picker joiners.** They play the whole first round but are marked joinedMidGame, because platform conformance treats any join after step zero as mid-game; results may flag them.
3. **Kit selection crossfade.** It applies to every cell of a grid in which any cell declares a picture, and to single-option controls.
   - Its outgoing snapshots are inert and aria-hidden and carry `ka-layout-ghost`.
   - They lose `aria-pressed`, `data-state`, `data-target` and `data-control`.
   - Other grids and option groups change state without a crossfade, as before.

Randy may overrule.

**D-285 · 2026-11-19 · Claude, integrator (C-21 review; delegated by Randy, 2026-11-18)** (C-21; RZ-014, PLAT-008, PLAT-025; implements D-234; replaces D-202's hold for games that name a team). (1) A game may implement optional, pure `joinTeam(state) → TeamId`; only a game that declares `midGameJoin` and implements it admits a phone to a running team match, and a team game without it keeps D-202's hold. No `GameMeta` field is added; the host reads admission from the loaded module when Start succeeds (`allowsRunningJoin`) and keeps it for pause and resume. (2) The session leaves an unassigned newcomer out of the game, asks `joinTeam` for one newcomer at a time after the normal joins and output, remembers the request by seat token until the room seat carries a team, and the host records it with the room's existing `team` event; `join` then runs with `player.team` set and is recorded with it, so replays stay deterministic. (3) Rabakz counts the players in its state (including any within their two-minute hold) for team size and uses `teamScores` for points; ties go to Red. (4) Until R-15's team chip lands, a late team joiner's private view ends with "You're on Red team" / "You're on Blue team" in every phase; R-15 removes this line when the chip appears. (5) The conformance kit places newcomers through `joinTeam` when a game has it, and a team request that has not landed by the next sync is asked again, so it cannot block later newcomers. (6) The C-21 UAT advances the paused TV clock to apply answers and settle the count-up before stills. Randy may overrule.

**D-296 · 2026-11-20 · Randy (home test, 2026-11-20)** (P-12; PP-004) — Randy, after playing on the TV: "The common cards should be covered until the countdown finishes. Only when the grid cards are covered then the common cards are open." PP-004 now reads: the 3 shared cards are face down while the grid is shown, flip face up as the grid flips face down, and stay face up for the rest of the round. Built as P-12. (Integrator's note: Randy asked for this change in chat; this entry records his words.)

**D-297 · 2026-11-20 · Randy and Claude, integrator** (K-12; CTRL-004) — Randy asked whether the browser's top bar can close by default when the phone turns sideways. Browsers allow a page to hide its bar only after a touch, so on Android Chrome the controller's first touch in landscape enters fullscreen with navigation UI hidden, and turning back to portrait leaves it. A web app manifest (`display: fullscreen`, landscape) makes "Add to Home screen" open with no bar. iPhone Safari offers no page fullscreen, so on iPhone only the home-screen route hides the bar. This falls within CTRL-004 ("fills the screen"); no PRD change. Randy may overrule.

**D-298 · 2026-11-20 · Randy (home test)** (PLAT-034, PLAT-007) — Randy: "I couldn't find the qr anymore because the game was on going. But I entered the same code and my name became randy 2 instead of randy. We need it make it easier for players to reconnect." New PLAT-034: joining again never makes a new player. The same phone (device id from C-23) goes straight back to its seat; another browser can pick its name from the room's disconnected seats (only seats that are disconnected, so nobody can take a connected player's place). A disconnected seat is held until the running match ends, beyond PLAT-007's 2 minutes. The room code stays readable on the TV during play; its placement is a design choice put to Randy as an artifact. Built as C-29 after C-23 merges.

**D-299 · 2026-11-20 · Randy** (PP-033, PP-011) — Randy: "we could have two modes, one where it gets more difficult each round (which is currently how it is) or one where the timing stays constant for each round." Asked what stays constant, Randy chose round 1 every round: Steady mode gives every round 20 s to memorise and no twist. Rising stays the default. A setup choice for the leader beside Rounds. Built as P-13.

**D-300 · 2026-11-20 · Randy** (PP-034, RZ-035, TR-063) — Randy asked for background music in the games and chose original music for all three: one loop each for Peek Poker and Rabakz and one per Tabao Rush venue (TR-063), composed for Kaki Arcade by a script in the repo so every track is original and reproducible, played through the existing Effects and Music levels. Two or three style samples go to Randy as an artifact before the full set is made. Built as A-12 (composer and samples), then wired per game.

**D-301 · 2026-11-20 · Randy, details by Claude, integrator** (PLAT-035; PLAT-023, PLAT-034) — Randy: "Maybe we should also pause the game if someone disconnects." Built with C-29. Details (Claude's recommendation, delegated 2026-11-18): the pause starts after 3 seconds without the phone, so a Wi-Fi blip does not stop play; the TV shows "Waiting for ⟨name⟩ to rejoin" with the room code in large type (this also gives PLAT-034's code during play); when every missing player is back the game resumes after a 3-2-1; the leader can choose "Carry on without them" (in Tabao Rush their cook stands still; in Peek Poker and Rabakz they are skipped as today); their seat stays held until the match ends. The lobby, scoreboards between rounds and the final screen do not pause; a drop there is shown only on the seat. The paused simulation does not step, so `step` stays pure. Randy may overrule.

**D-302 · 2026-11-20 · Claude, integrator (C-23 review; delegated by Randy, 2026-11-18)** (C-23; PLAT-011, PLAT-024, CTRL-009; settles D-247's build details; DESIGN §4.3, §6; OQ-054)

Removal as merged:

1. **Who can remove.** The host can remove any phone player, including the leader. The connected leader can remove anyone but themselves. Each request is bound to the sender's connected seat and checked against current leadership; a request from anyone else is ignored and reaches neither the game nor team setup. Removal frees the seat through the ordinary leave path: the running game's leave hook, then leader election. The TV's own keyboard seat has no Remove.
2. **Contract.** `hello` and `resume` carry an optional `browserId`: a random 32-byte hex id in localStorage `kaki.device`, with a per-tab id when storage is denied. `refused` gains `removed`. The leader receives a `room-players` view containing only seat numbers and names, never the TV's own seat. `room-players` is a reserved view kind and sits outside the private-view revision space: the view channel neither bumps nor stores its revision, and netcode's `sendHost(message, revisioned = false)` neither de-duplicates nor fences it. Removal is an `action` whose data is `control: 'remove-player'`. There is no new wire message and no pairing-server change.
3. **Block list.** The host keeps removed browser ids and seat tokens in a private block list in the room snapshot, keeping the last 64. A match on either is refused on join and on resume. A connected removed phone is sent the refusal before its channel closes, and its phone stops retrying.
4. **Accepted v1 limits.** A private window, cleared site data, or a modified client that omits `browserId` can join again. The block is per room. This meets PLAT-011 against ordinary rejoining only.
5. **TV layout.** The confirmation opens inside the same seat card. The card rows, in board px:
   - seat number 55;
   - name, up to three 34 px body lines (135.34 available against 132.6 needed);
   - status with Remove 55;
   - Leader 44.2 (34 × 1.3);
   - 5 px gaps and no block padding.

   Card height (310.54) does not change and the card ends at 1025, inside the 55 px safe margin. Remove and the confirmation buttons are at least 55 px tall with 21 px type and an inset focus ring. Occupied-seat status text, Remove and the confirmation text are 21 px: below DESIGN §6's 34 px reading floor, which is written for play, results and final screens. This is legible on a large TV from 3 m but small, and goes to Randy with OQ-054. Empty seats and the TV seat keep 34 px text and icons.
6. **Phone.** The phone list is a column of 55 px rows that scrolls natively (secondary column, 1.618 : 1 in landscape). The selected row expands into the column through a mask, starting at scale 0.95 with ease-out base timing; the exit is shorter; reduced motion has no animation. The leader's own row is listed but cannot be removed; whether it should look different waits on a copy decision.

Randy may overrule.

**D-303 · 2026-11-20 · Claude, integrator (A-12; delegated by Randy, 2026-11-18)** (A-12; PP-034, RZ-035, TR-063; D-300) — Tool dependency: the music composer (`tools/music/`) is pure Python 3 standard library and renders WAV itself; the system `ffmpeg` (Homebrew 8.x, libopus and AAC) encodes the loops to Opus in WebM and AAC in M4A at build time only, as Blender is used for art. Nothing ships ffmpeg and no npm or Python package is added. Each loop must stay well inside PERF-023 (≤ 8 MB a round, all assets). Randy may overrule.

**D-304 · 2026-11-20 · Claude, integrator (C-28 review; delegated by Randy, 2026-11-18)** (C-28; PLAT-022; DESIGN §4 4A, §6; follows D-290)
- The shell's final-screen hint enters with the game's final screen on DESIGN 4A's crossfade entrance: opacity 0 → 1 at `slow` with the in-out curve, started when the hint mounts. It is not a separate ease-out entrance.
- On Rabakz the final screen is a 4A crossfade, so the hint and the podium fade together (strip 86 in `c28-ffa3`). On Peek Poker the final board redraws with ease-out row entrances. There the hint keeps the crossfade timing so it looks the same in both games. This departs from §6's "entrances ease out" for this one line.
- The hint fades only once while the final screen is up. When the screen leaves, it stays at full strength with the outgoing screen, as in D-290 (3).
- Reduced motion shows it at once. The finished entrance keeps `fill: both`, and the layer rests at opacity 1.
- Randy may overrule.

**D-305 · 2026-11-20 · Claude, integrator** (P-09; PERF-001, PERF-010, PERF-012; keeps D-100, D-227, D-249, D-277)
- Peek Poker has no single round of three minutes: one round is about 45–60 s. For PERF-001 its marked window is the whole match, from the first memorise phase appearing on the TV until the final podium appears. This is a measurement window, not a rules or budget change. The 180 s and 600-frame minimums still apply.
- The scenario holds each pick phase open for 15 s of its 20 s timer.
- Two runs are needed: a production build in branded Chrome for frames only, which assesses PERF-001; and a development build for PERF-010 and PERF-012, using timing hooks that exist only when `import.meta.env.DEV` is set and the perf harness installs them.
- Local browser contexts do not prove phone or Wi-Fi delay.
- P-09 merges as in progress: the production p95 (18.3 ms) is over PERF-001's 16.7 ms on the built-in panel and cannot be assessed until a 60 Hz display run.
- Randy may overrule.

**D-306 · 2026-11-20 · Claude, integrator (T-08 review; delegated by Randy, 2026-11-18)** (T-08; TR-020, CTRL-004, CTRL-005; follows D-280)
- A layout with a stick and exactly four face buttons and no private panel has its own placement in `@kaki/platform/private-placement`. The conformance kit and the phone use this one function, so they always agree on whether a layout fits. Other layouts keep the general packer.
- The stick sits on the left and the four buttons form a diamond on the right. Every ring, and the stick, keeps 13 px from the header rule and the screen edges.
- When the play area is too short, things give way in this order: first the gap between rings shrinks (34 → 21 → 13 px); then the buttons shrink from their preferred size down to the floor; then the edge space shrinks (13 → 8 → 5 px). The button floors never give way: 110 px at widths of 844 px or more, 89 px below (the in-play control floor). The stick must also be at least the button floor in width and height. Only when even 5 px of edge space with floor-size buttons cannot fit does the layout report that it does not fit.
- At 844 px wide this means a play area of 310 px or more keeps 13 px of edge space. A real iPhone in landscape (about 301 px after its bottom inset) gets 8 px, and below about 290 px the layout does not fit.
- The reported gap is the gap actually used between rings.
- The phone takes its play-area size from its own controller's board. It reads the size live on mount, on ResizeObserver, on window resize and on visual-viewport resize, and an unchanged size causes no re-render. Nothing runs per frame.
- T-08 merges with TR-020 in progress: it still needs real phones and T-08b (wok shake), which also traces to TR-020.
- Randy may overrule.

**D-309 · 2026-11-20 · Claude, integrator (P-12 review; delegated by Randy, 2026-11-18)** (P-12; PP-004, PP-020, PP-031, CTRL-003; follows D-296; keeps D-305)
- **Public view in memorise.** Peek Poker's public view gives the shared cards as `shared: null` with `sharedCount` and `sharedFaceDown: true`. The faces are declared secrets and scrambled while hidden. From the first view after memorise they are public for the rest of the round.
- **The TV turn.** The TV draws three backs, then turns them face up at the moment the grid hides, using the grid flip's atlas frames, `slow` duration, in-out curve and face mask through one shared helper. Reduced motion swaps to faces at once. Layout and the "Shared cards" label are unchanged; no new copy.
- **The lift token.** The 6 px lift during a card turn comes from A-08's turn and is now the token `cardLift.turnY`. It is motion geometry, not spacing, so it sits outside the φ spacing scale.
- **Phone exits.** A layout or private-panel exit is removed when its fade ends. If the animation timeline stops moving (a background browser window, seen in UAT), it is removed after the fade's duration and delay plus one frame; a late first frame only delays removal and never shortens a fade. A new screen replaces any running exit rather than stacking on it. When layout and private panel change together, only the layout keeps an outgoing copy. A private-view change alone never ends a running screen crossfade, so a layout exit and a private exit may briefly overlap.
- **P-07's privacy check** allows the leader's `room-players` view (C-23, D-302) only to seat 1, and only as `{kind, players:[{seat, name}]}` with whole-number seats from 1 to 8 and string names, which the TV already shows.
- **Perf at 8 phones** (development build, Chromium, slice gate only): frame p95 18.2 ms, max 33.4 ms, no long tasks; PERF-010 pass; PERF-012 160 of 160; unchanged from P-09's development run. PERF-001 stays not assessed, as in D-305.
- Randy may overrule.


**D-310 · 2026-11-20 · Claude, integrator (C-29 review)** (PLAT-034, PLAT-035, PLAT-007, PLAT-011, PLAT-023; D-298, D-301, D-302)
- **Rejoining.** Joining again keys on the browser id first: the same browser always retakes its seat and closes any other connection.
- **Name claims.**
  - A claim is allowed only for disconnected seats and only from a phone that sends a browser id.
  - It gives the seat a fresh token. The game player is kept through a private seat key that is set at admission and never rotated, so score, eligibility and private view survive.
  - The claiming browser is recorded privately as `claimedBy`, and the TV shows "⟨name⟩ is back on a new phone" for 5 s.
  - When the owner's browser retakes the seat, the token rotates again and the claimer moves onto a private former-claimers list.
  - Removal blocks the owner, the claimer, every former claimer and the current token.
  - Browser ids, tokens, seat keys and claimer records never reach a phone or the TV.
- **Holds.** Running and paused matches hold disconnected seats until results.
- **Pausing.**
  - The session pauses after more than 3 s without a phone, when the game's new optional, pure `pauseOnDisconnect(state)` allows it. This keeps game phases out of the platform; all three games exclude scoreboards and final screens.
  - The 3-2-1 button reads Resume.
  - A chosen pause is never auto-resumed.
- **Views.**
  - The reserved view kinds `rejoin-seats` (seat, colour and name only) and `rejoin-waiting`, and the `rejoin-seat` action, sit outside the private-view revision space.
  - `room-players` now goes to every phone, with only seat, name and a connected flag.
  - ARCHITECTURE §3 and the networking section are updated.
- **Accepted risk.** Anyone with the room code can take a disconnected seat, and with it its score and private view. Randy accepted this under D-298; the safeguards are the fresh token, owner win-back, removal of every browser involved, and the TV notice.
- **Open.**
  - PLAT-034 and PLAT-035 stay in progress until Randy chooses, from an artifact, the room code's placement during play and the waiting-panel layout.
  - A console perf run is still to come.
- **T-10's "phones follow the TV into a new room".** This is the PLAT-009 restore of the same room, because the step cleared localStorage while the host snapshot lives in sessionStorage. A phone joins only the code it holds (signal `core/room.ts:208`).
- Evidence: round4 UAT ran before main's P-12 merge; after merging main, tsc and the overlapping unit and DOM tests passed (2029 and 4). Randy may overrule.
