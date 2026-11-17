# Kaki Arcade — Performance Budgets

"No lag" (PRD NN-3) is defined here as numbers. They are hard requirements. The performance
harness (`tools/perf`) runs in the verify step of every loop and **fails the loop** when a
budget is exceeded.

The numbers below are the agreed starting targets (2026-11-15). The M2 spikes measure what is
achievable; any change to a budget is Randy's decision and is logged in `DECISIONS.md`.

## 1. Budgets

### Frame time on the big screen (8 players, busiest level)

| ID | Screen class | Budget |
|---|---|---|
| PERF-001 | Reference laptop (the dev Mac, Chrome, 1080p output) | 95th-percentile frame time ≤ 16.7 ms (60 fps); no frame over 50 ms in a 3-minute round |
| PERF-002 | TV-class device (the TCL Q65's browser) | 95th-percentile frame time ≤ 33.3 ms (30 fps) in lower-detail mode; no frame over 100 ms |

### Input delay

Measured from the touch event on the phone to the simulation step that applies it on the host.

| ID | Link | Budget |
|---|---|---|
| PERF-010 | Direct, same Wi-Fi | 95th percentile ≤ 50 ms |
| PERF-011 | Relayed | 95th percentile ≤ 120 ms; the big screen marks the player as relayed (PLAT-010) |
| PERF-012 | Phone feedback | The controller shows the press within one frame of the touch, independent of the network |

### Loading

| ID | What | Budget |
|---|---|---|
| PERF-020 | Controller page | ≤ 300 KB transferred; interactive ≤ 2 s on a mid-range phone on Wi-Fi |
| PERF-021 | QR scan to seated in lobby | ≤ 5 s |
| PERF-022 | Host shell (landing to lobby) | ≤ 1.5 MB transferred |
| PERF-023 | One Tabao Rush level, all assets | ≤ 8 MB transferred; loaded before the round starts, never during it |
| PERF-024 | Texture memory in a round | ≤ 256 MB decoded on the host |

### Stability

| ID | Budget |
|---|---|
| PERF-030 | 30-minute 8-player session: no crash, memory growth under 10%, no stuck input (NFR-REL) |

## 2. How the game is built to meet them

- **Pre-rendered art.** Blender renders ahead of time; the browser draws flat sprites. No live
  3D, no runtime lighting.
- **Baked level backgrounds.** Floor, counters, walls and static shadows are one image per
  level. Only moving and changing things are sprites.
- **Atlases.** All sprites for a level sit in a small number of texture atlases so the renderer
  batches draws. Target: under 20 draw calls a frame.
- **One body, eight heads.** All cooks share one set of body animation frames; each character
  is a small head sprite placed on a per-frame anchor (Randy, D-037). Player or team colour is
  a tint over a mask layer on the apron and cap.
- **No allocation in the render loop.** Object pools for particles and order cards; no per-frame
  array or object creation in render. A simulation `step` may return a new state that shares
  every unchanged part with the old one (Randy, D-048); it must not copy the whole state, and
  Tabao Rush must still meet its frame budget and show no garbage-collection pause over a full
  round in `pnpm perf`.
- **Fixed timestep.** Simulation cost is constant and independent of frame rate.
- **Everything loaded before play.** No network requests, decoding or shader compilation during
  a round.
- **Lower-detail mode** for PERF-002: half-resolution atlases, 30 fps render, particles and
  blur effects off. Chosen automatically from a short benchmark on the lobby screen, and
  overridable in settings.
- **Tiny input messages**, sent over an unordered unreliable channel so a lost packet is
  replaced by the next one instead of stalling the queue.
- **No blur or filter effects at runtime.** Soft shadows and glows are baked into sprites.

## 3. What code cannot fix

Stated on the help page (REL-003):

- A TV in a normal picture mode adds display delay. Use **Game Mode** on the HDMI input.
- Casting a browser tab to the TV adds delay; use a cable.
- Phones on mobile data or a far-away router will have a worse link than phones on the same
  Wi-Fi as the big screen.

## 4. Measurement

- `pnpm perf` runs every installed game at 1, 4 and 8 players with seeded bots at the fixed
  timestep until the match ends, and reports step time, allocation per step (whole run and
  game only) and observed garbage-collection pauses. These are diagnostics: no simulation
  budget has been set (OQ-034). The heaviest level remains the aim; default settings are what
  is measured until T-05.
- `pnpm perf -- <scenario> [--phones 1|4|8]` uses the local pairing stack, one 1920 × 1080
  host and separate phone contexts in a visible browser (Playwright Chromium, not branded
  Chrome). It records host frame times, frames over 50 ms, long tasks, the display's refresh
  rate, whether every phone link is direct (read from the host's WebRTC statistics for the
  local and remote candidates of every selected pair) and, where a game screen is
  instrumented, touch-to-apply and touch-to-feedback times. Timing hooks exist only in
  development builds, so production runs assess frames only. Contexts on one machine do not
  prove real phone or Wi-Fi delay.
- A scenario may set `hostPage` to open a local development page instead of a room, with no
  phones (`uat/perf/rabakz-screen.mjs`). It runs only against development builds, reports zero
  phones, still lands in `perf-<phones>` (default `perf-8`) and assesses no budget.
- A budget is assessed only where it applies. PERF-001 needs a marked round of at least 180 s
  with at least 600 visible frames; PERF-010 and PERF-012 need 100 observations each. Fewer is
  "insufficient samples"; a budget that does not apply is "not assessed"; neither is a pass.
  A run under detected contention never reports a pass. These minima are measurement-validity
  rules, not budgets (D-100).
- `pnpm verify` enforces the transfer-size budgets and runs a short smoke of the harness.
  `pnpm perf` is run by the integrator on a quiet machine before any slice that draws a game
  screen is closed, and a failure there blocks the slice (D-100).
- Reports (`perf.json`, schema in `tools/perf/README.md`, and `PERF.md`) go to marked run
  folders that each run replaces; a reviewed run is copied to an unmarked folder to keep it.
- Each closed slice records its numbers in `STATUS.md` so a regression is visible as a trend,
  not just a pass or fail.
- TV numbers (PERF-002) come from a manual run on the real set at each milestone, recorded the
  same way.
