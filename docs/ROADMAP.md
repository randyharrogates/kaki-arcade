# Kaki Arcade — Roadmap

Milestones are the points where Randy sees a demo and says go or no-go (`WORKFLOW.md`, human
gates). They are **not** worked one after another: tracks run concurrently in git worktrees
(`PLAN.md`), and a milestone is reached when the issues behind it have merged. The work itself
is in `backlog/`.

No dates are promised: sizes are honest only after the M2 spikes, and will be added then.

| # | Milestone | Outcome Randy sees | Main requirement groups |
|---|---|---|---|
| **M0** | Repository and docs | This repo: PRD, design rules, architecture, loop, tracking | NN-7, NN-8 |
| **M1** | Design gate | Five artifact boards; Randy's choices locked into `DESIGN.md` §4 | NN-5, NN-6 |
| **M2** | Risk spikes | Three throwaway proofs with measured numbers: 8 phones driving dots on a screen with input delay shown; one rigged cook walking in 8 directions from the Blender pipeline; the same page running on the TCL Q65 | NN-3, NN-4, REL-005 |
| **M3** | Console and controller | Host a room, scan to join, lobby with 8 players, game picker, teams, controller kit, reconnect; a test game proves the interface | PLAT-001 to 033, CTRL-001 to 009, NET-001 to 006 |
| **M4** | Rabakz and Peek Poker | A full trivia match and a full Peek Poker match on the TV, answers and picks private on phones | RZ-001 to 034, PP-001 to 032 |
| **M5** | Tabao Rush core | One level, one dish, co-op for 1 to 8, real art and animation, 8 characters, throwing, tutorial | TR-001 to 031, TR-051, TR-055 to 057, TR-060 to 064 |
| **M6** | Tabao Rush content | 7 dishes, 8 co-op levels across four venues, fires, scaling by player count, bots, stars, sound | TR-010, TR-040 to 054, TR-063 |
| **M7** | Team versus | 3 arenas, two teams in mirrored kitchens that interact, team colours, normalised scoring | TR-052, TR-058 |
| **M8** | Public release | Landing, help and privacy pages; relay limit; nickname filter; rate limits; error counts; browser matrix; live on the `leeseidon.com` subdomain | REL-001 to 006, DATA-001 to 005, NET-004, PLAT-005 |

## Why this order

- **Design before code (M1)** because Randy chooses the direction up front (NN-6), and because
  the Blender style sets sprite sizes that the engine depends on.
- **Spikes early (M2)** because three risks could change the plan: eight phones over WebRTC,
  the art pipeline's real cost, and the TV. They run alongside the design gate, and nothing a
  spike could overturn starts before that spike reports (`PLAN.md` §3).
- **All three games are built at the same time** (Randy, D-036), each against the game
  interface and a dev harness, so none waits for the console or for another game. Rabakz and
  Peek Poker are small and reach their demo (M4) first; that is expected, not a rule.
- **Versus after content (M7)** because it reuses every dish and station and adds only arenas
  and scoring.

## M2 exit questions

The spikes must answer these with numbers, recorded in `STATUS.md` and `DECISIONS.md`:

1. Input delay at 1, 4 and 8 phones on home Wi-Fi: within PERF-010?
2. Does the TCL Q65's browser meet PERF-002? If not, the TV route is "laptop on HDMI" and
   REL-005 is recorded as not met.
3. How long does one fully animated cook take through the pipeline, and how big are its
   atlases? This sizes M5 and M6.
4. Are PixiJS and Preact confirmed, or replaced?

## After v1

- **Phase 2:** remote single-device players (NET-007); Blender polish pass; more levels and dishes.
- **Phase 3:** optional accounts; a third game; possibly a wrapped Android TV app if M2 shows
  the TV's browser is the limit.
