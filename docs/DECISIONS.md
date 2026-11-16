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
