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

- `pnpm perf` starts a headless host with scripted controllers at 1, 4 and 8 players on the
  heaviest level and writes `uat/evidence/<slice>/perf.json` with frame-time and input-delay
  percentiles.
- Each closed slice records its numbers in `STATUS.md` so a regression is visible as a trend,
  not just a pass or fail.
- TV numbers (PERF-002) come from a manual run on the real set at each milestone, recorded the
  same way.
