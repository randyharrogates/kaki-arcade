# Kaki Arcade — Handoff

Written 2026-11-15 at the end of the planning conversation, for the Claude Code session that
will build this in this repo. That conversation happened in a different session (Randy's
personal agent, "Jarvis"); **none of it is in your context.** Everything you need from it is in
this file and the docs it points to.

Read order for a new session: this file → `CLAUDE.md` → `docs/PRD.md` → `docs/WORKFLOW.md` →
`docs/DESIGN.md` → `docs/STATUS.md`. Then start M1 (§6 below).

When this file's content has been absorbed into the other docs and M1 is closed, mark it
historical at the top; do not delete it.

---

## 1. Where things stand

- **Done (M0):** the repo, the PRD (118 tracked requirements), both game specs, design rules,
  architecture, performance budgets, art pipeline, the build loop, the tracker and its check.
  One commit on `main`, pushed to the private GitHub repo `randyharrogates/kaki-arcade`.
- **No application code exists.** No `package.json`, no workspace, no pages, no Worker.
- **Next: M1, the design gate.** Randy chooses from artifact boards before any UI or game code
  (PRD NN-6). Board 0 (art finish) is decided: route D, Blender.
- `python3 tools/trace_check.py` passes. Keep it passing.

## 2. How the plan came about

Randy asked for a browser game where phones are controllers and the TV is the screen, for
family games. Over the conversation it grew, by his choices, into:

1. A co-op cooking game in the style of the genre → an **original** hawker-centre game.
2. "Mimic a console controller so we can add other games" → a **platform** with a controller kit.
3. "Platform with game picker + 2 games; the other should be memory poker."
4. **Public release**, with **remote players** wanted but deferred to phase 2.
5. Blender art after seeing four finishes side by side.

Every decision is in `docs/DECISIONS.md` (D-001 to D-021) with who made it. Treat anything
marked "Claude" there as provisional and anything marked "Randy" as fixed.

### What Randy said, in his words

These carry more weight than any paraphrase in the docs:

- On lag: "i strictly cannot have lag so you need to help me optimize the best method."
- On art: "I want my final game to have a standard of graphics. Doesn't need to be state of the
  art, but it should not be too primitive too." and "i need the right graphics like correct
  movement etc."
- On motion in gameplay: "NO, motion should apply to gameplay as well... Unless you are telling
  me that the browser won't be able to support this type of games." (It can. It applies.)
- On design process: "make sure the designs and artistic routes are determined from the start
  with artifact examples and choices for me to choose from."
- On design rules: "make sure that the frontend design rules and restrictions follows our
  current ones as well. Put it in the repo rules too."
- On process: "your plan should allow for continuous loop of code-verify-test (UAT with
  screenshots)-review-code" and "strictly track the implementation and PRD using a local
  documentation in the new repo."
- On who builds: "For this build, do everything on claude. only use codex if image generation
  is needed (like background image, landing page images etc) or something that claude can't do
  but codex can."
- On the browser: "We must support the game as long as it is over the browser. Including the
  use of handphone as the controller."
- On Peek Poker: "4 x 4 grid. 20 secs to remember. best hand wins." · "the players all share a
  pool of shared 3 cards. Like Texas holdem" · "Two players may pick the same cards. 1 match
  will be multiple rounds with increasing difficulty. At the end of the match scores will be
  added up."
- On size: 8 players ("Ideally, I want to support up to 8"); launch content "slightly more"
  than 6 levels / 2 arenas / 5 dishes, set at 8 / 3 / 7.

## 3. Working with Randy

- **He wants to be grilled.** Ask until the requirement is exact; do not guess. Put unanswered
  things in `docs/OPEN-QUESTIONS.md`.
- **Explain in chat, not only inside a question dialog.** When a multiple-choice dialog was
  open he could not see the explanation written above it, and answered "please explain to me
  on chat". Put trade-offs in a normal message first, then ask; keep each question
  self-contained.
- **Show, don't describe.** For anything visual he asks for examples and pros and cons. Publish
  an artifact with real options (see §7).
- **Verify before asking.** He pushed back on being asked to choose a budget before prices had
  been checked. Look facts up first.
- He answers numbered question lists point by point. Short, direct messages; expect typos.
- His global Claude Code instructions load in every session and include the same design rules
  as `docs/DESIGN.md` §1 to §3. They also describe a default "Claude plans, Codex implements"
  split: **that split is overridden for this repo** by D-018. Claude implements here.
- Recommendations are welcome: when he asked "what do you recommend?", a clear pick with one
  reason was what he wanted.

## 4. Environment facts

**Machine:** Apple M3, 16 GB, macOS. Node v24.21.0, pnpm 12.8.1, Homebrew, Python 3.

**GitHub — two accounts are logged in.** `gh auth status` shows `ranjam-tap` (work) as the
**active** account and `randyharrogates` (personal) as inactive. This repo belongs to
`randyharrogates`. Do not switch the active account (it would affect Randy's work repos). Use
the personal token per command instead:

```bash
export GH_TOKEN=$(gh auth token --user randyharrogates)   # then gh / git push work for this repo
```

That is how the repo was created and pushed. If `git push` is refused, this is why.

**Commits:** Conventional Commits naming requirement IDs. Randy's preference in his other
repos is no co-author trailer and no Claude or Anthropic references in commit messages; follow
that here unless he says otherwise.

**Blender:** 5.2.3 LTS at `/Applications/Blender.app`, on `PATH` as `blender`
(`/opt/homebrew/bin/blender`). Driven headlessly:

```bash
blender -b --factory-startup -P tools/blender/sample_stall.py -- /abs/path/out.png
SAMPLES=24 RES=0.6 blender -b ...   # quick low-quality iteration (env vars the sample script reads)
```

Notes from making the sample (`tools/blender/sample_stall.py`), all on Blender 5.2:

- Cycles with the Metal GPU device works. First run took about 110 s (kernel compile); later
  runs about 10 s for 960 × 720 at 128 samples with denoising.
- Principled BSDF input names that worked: `Base Color`, `Roughness`, `Metallic`,
  `Emission Color`, `Emission Strength`.
- The default AgX view transform looks flat; the look `AgX - Medium High Contrast` fixed it.
  The `Standard` transform blew out highlights with the first light setup.
- Lighting that exposed well: sun 3.6 (slightly warm), one large area light at 220 W, world
  strength 0.28.
- Gotcha: `transform_apply(scale=True)` leaves the object's origin at its location, so setting
  `rotation_euler` afterwards rotates in place as expected, but printing
  `matrix_world.translation` straight after creation shows zeros until the depsgraph updates.
  Do not debug placement from that print; look at the render.
- A bowl (the wok) was made by deleting the top half of a UV sphere with `bmesh` and adding a
  Solidify modifier.
- Scripts and outputs were kept in separate folders, and Blender was run with
  `--factory-startup` so no user add-ons or startup files are involved.

**Blender is driven by script, not through an MCP connection.** Randy asked to "connect
Blender"; since it was already installed, scripting it from the shell did the job with no
setup. If a task ever needs interactive Blender, raise it with him.

**The TV:** Randy wrote "hcl q65". It was taken to be a **TCL Q65** (Q651G), which runs Google
TV with Chromecast built in. TCL does not publish its chipset or memory; a sibling model
(65Q650G) is listed with a quad-core processor and 2 GB RAM. Google TV has no good built-in
browser, so the TV route is either a browser installed from the Play Store or a laptop on HDMI
(with the TV input in **Game Mode**). Whether the TV itself can run the game is unknown and is
an M2 exit question (REL-005, PERF-002). Confirm the model with Randy when it matters.

**Hosting:** Randy is on Cloudflare's US$5/month Workers plan and owns `leeseidon.com`. Whether
its DNS is on Cloudflare is not confirmed (OQ-004). Nothing has been deployed, no DNS touched.

## 5. Research already done (so you do not repeat it)

Checked on 2026-11-15. Recheck prices before launch.

**Existing products in this space**
- **Pizza Peers** (Pandaqi): a co-op browser game with phones as controllers, described by its
  own developer as a simplified take on the Overcooked idea. It has a public devlog on building
  it peer-to-peer: https://pandaqi.pages.dev/blog/videogames/the-peerful-project/pizza-peers/devlog-pizza-peers/1-how-i-created-pizza-peers
  Worth reading in M2 for the networking lessons. Do not copy its design.
- **AirConsole:** the established platform for this model (browser on the big screen, phones
  join by code, games commonly 2 to 8 players, a developer kit). Its free tier caps at 2
  players with ads. Randy chose to build his own pairing instead (D-005).
  https://developers.airconsole.com/
- **Overcooked! All You Can Eat on Netflix** pairs phones as controllers by QR code, but runs
  through Netflix, not a browser.

So the concept is proven. Tabao Rush must still be original (PRD §1, CLAUDE.md rule 7).

**Cloudflare prices**
- TURN relay: first 1,000 GB a month free, then US$0.05/GB; the allowance is shared with
  Cloudflare's SFU. Billed on data sent from Cloudflare's edge to the TURN client.
  https://developers.cloudflare.com/realtime/turn/faq/
- STUN (`stun.cloudflare.com`): free and unlimited.
- Durable Objects: 1 million requests a month included on the paid plan, then US$0.15 per
  million; requests include WebSocket messages. Inactive objects accrue no duration charge.
  https://developers.cloudflare.com/durable-objects/platform/pricing
- Workers paid plan: about 10 million requests and 30 million CPU-ms included. This figure came
  from third-party calculators that agree with each other, **not** confirmed on Cloudflare's
  own page. https://developers.cloudflare.com/workers/platform/pricing/
- **Not found:** the included Durable Object duration allowance (a calculator said 400,000
  GB-seconds, unverified) and how hibernated WebSockets are billed. Verify both in M3.

**Estimates behind the 800 GB relay limit (Claude's, not measured):** a relayed phone
controller uses roughly 10 MB an hour; a relayed remote player in phase 2 perhaps 70 to 180 MB
an hour. Measure real figures in M2 and correct `docs/DECISIONS.md` D-014 if they are far off.

**Platform limits noted for the design**
- iPhone Safari: motion sensors need a user tap to grant permission and need HTTPS; no
  vibration API; fullscreen is limited. Android Chrome supports vibration.
- Screens sleep unless the page holds a wake lock.
- Casting a Chrome tab to a TV adds roughly 0.1 to 0.3 s of display delay: unsuitable for
  Tabao Rush, acceptable for Peek Poker.

## 6. Your first task: M1, the design gate

Nothing else may start first (CLAUDE.md rule 5). `docs/DESIGN.md` §5 lists the boards.

**Board 1 — 3D art style (do this first; it sets sprite sizes the engine depends on).**
Render the same small scene three ways in Blender and publish them side by side for Randy to
choose. The scene: one hawker stall with a wok station, chopping board and a plated chicken
rice, plus one cook. Vary, between the three options:

- character proportions (for example chunky and toy-like, rounder and softer, slightly taller
  and more realistic),
- material look (clay-like matte, glossy plastic, lightly textured),
- lighting mood (bright daytime hawker centre, warm evening),
- camera tilt (near top-down against a three-quarter view), stating the trade-off: a steeper
  tilt shows more character but hides what is behind counters.

Use properly modelled objects, not the simple solids of `tools/blender/sample_stall.py`. Randy
judged that sample on lighting and depth only and was told a real pass would look considerably
better; this board has to deliver that. Include one cook in a walk pose to show the movement
standard. Show each option at real game size on a 1920 × 1080 frame as well as close up, since
legibility from the sofa is a requirement (TR-041, NFR-A11Y).

**Then boards 2 to 5** as listed in `docs/DESIGN.md` §5: visual identity, big-screen layouts,
phone controller, motion. Each offers two or three options, includes a golden-ratio variant
and says which proportions use it.

**For every board:** explain the trade-offs in chat, publish the artifact, ask Randy to choose,
then record the choice in `docs/DECISIONS.md`, write the values into `docs/DESIGN.md` §4, mark
the board done in §5 and in `docs/STATUS.md`, save the board's source in `docs/design-gate/`,
and commit. When all five are done, the gate is closed and M2 can start.

## 7. Artifacts

Design boards are published with Claude Code's Artifact tool (load the `artifact-design` skill
first; it sets the page rules, including light and dark themes and phone width). Images are
embedded as data URIs.

- The art finish board from the planning conversation is published at
  https://claude.ai/artifact/Jz2sSWxnFJ1mQptvYU11t6 (private to Randy). Its source is saved at
  `docs/design-gate/00-art-finish-samples.html`, and the Blender render it embeds is
  `docs/design-gate/00-blender-sample.png`.
- That artifact was published from another session. To update it from here, read it first with
  the Artifact tool and pass its URL; otherwise a publish creates a new artifact. New boards
  should simply be new artifacts.

## 8. Things that are easy to get wrong

- **Starting to code.** There is a lot of design to settle and M2 spikes to run before the
  platform. The order in `docs/ROADMAP.md` is deliberate.
- **Treating the performance budgets as measured.** They are targets until M2.
- **Loosening a check to get green.** Never. A budget or threshold change is Randy's decision.
- **Claiming a pass without looking.** Open every screenshot (CLAUDE.md rule 4).
- **Letting the tracker drift.** Update `docs/TRACEABILITY.md`, `docs/STATUS.md` and
  `CHANGELOG.md` in the same slice.
- **Live 3D in the browser.** Decided against (D-011) for TV performance. Blender output is
  pre-rendered sprites and baked backgrounds.
- **Copying an existing game.** Same genre and mechanics are fine; name, characters, art,
  music, levels and look must be original.
- **Applying motion rules to the interface only.** They cover gameplay too (D-012).
- **Switching the active GitHub account.** Use the token export in §4.
- **Deploying, touching DNS, making the repo public or spending money** without Randy's word.

## 9. Open with Randy

All in `docs/OPEN-QUESTIONS.md`. The ones that will bite soonest:

- OQ-004: is `leeseidon.com` DNS on Cloudflare, and is `arcade.leeseidon.com` acceptable?
  Needed for HTTPS testing on real phones in M2 and M3.
- OQ-005: how to get HTTPS on the local network for motion-sensor testing on a real iPhone.
- OQ-002 and OQ-003: Peek Poker's difficulty ramp and points are Claude's proposal.
- Confirm the TV model (assumed TCL Q65).

## 10. A prompt to start the new session

> Read `docs/HANDOFF.md`, then `CLAUDE.md`, `docs/PRD.md`, `docs/WORKFLOW.md`, `docs/DESIGN.md`
> and `docs/STATUS.md`. Confirm in a few lines what stage we are at and what you will do first,
> then start M1 board 1.
