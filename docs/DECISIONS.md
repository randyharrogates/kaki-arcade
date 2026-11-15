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
