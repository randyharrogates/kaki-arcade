# Kaki Arcade — Architecture

How the requirements in `PRD.md` are met. Choices marked **(spike)** are confirmed or replaced
by the M2 spikes in `ROADMAP.md`; the reason for each choice is in `DECISIONS.md`.

## 1. Shape

```
 Phone (controller page)  ──inputs──▶  Big screen (host page)  ◀── renders game
          ▲   ◀──controller state──         │  runs the simulation
          │                                 │
          └────────── pairing only ─────────┘
                 Cloudflare Worker + Durable Object (one per room)
                 Cloudflare TURN relay (only when a direct link fails)
```

- **Host page** — authoritative. Runs the simulation and draws the game. (NET-001)
- **Controller page** — draws the kit, sends inputs, shows private panels. Holds no game rules.
- **Pairing server** — creates rooms, relays WebRTC handshakes, mints short-lived relay
  credentials, enforces the relay limit and rate limits. Never carries gameplay. (NET-002, NET-004)

## 2. Repository layout

pnpm workspace, TypeScript throughout.

```
apps/
  web/            Vite app. Routes: /  /host  /play  /help  /privacy
  signal/         Cloudflare Worker + Durable Object (rooms, pairing, relay credentials)
packages/
  protocol/       Message types and validators shared by host, controller and signal
  netcode/        WebRTC transport, reconnect, input sequencing, link-quality measurement
  sim-core/       Fixed-timestep loop, seeded RNG, snapshot helpers, input buffer
  platform/       Room state, lobby, game picker, game interface, results
  controller-kit/ Stick, D-pad, buttons, shoulder, tilt/shake, private display panel
  ui/             Design tokens from DESIGN.md §4, shared shell components, motion helpers
games/
  rabakz/         rules (pure) · host view · controller layouts
  peek-poker/     rules (pure) · host view · controller layouts
  tabao-rush/     rules (pure) · host view · controller layouts · levels · bots
content/
  rabakz/         question bank sources, build and validation script, generated chunks
spikes/           throwaway M2 proofs; never imported by the product
tools/
  blender/        Scripts that render models to sprite atlases and baked backgrounds
  perf/           Headless load harness: N scripted controllers, frame and latency capture
assets/
  src/            .blend sources (Git LFS)
  dist/           Generated atlases and backgrounds (built, not hand-edited)
uat/
  specs/          Playwright UAT scripts, one per requirement group
  evidence/       Screenshots per slice (committed)
docs/
```

## 3. The game interface (PLAT-030 to PLAT-033)

Every game is a module exporting:

```ts
interface GameModule<State, Input, Config> {
  meta: { id: string; name: string; blurb: string; players: { min: number; max: number };
          teams?: "none" | "optional" | "required" };          // PLAT-025
  settings: SettingsSchema<Config>;                            // what the leader chooses before play
  init(config: Config, players: PlayerInfo[], seed: number): State;
  step(state: State, inputs: Map<PlayerId, Input>, dtMs: number): State;   // pure, deterministic
  controllerLayout(state: State, player: PlayerId): ControllerLayout;      // kit parts for this phase
  privateView(state: State, player: PlayerId): PrivateView | null;         // what only this phone sees
  publicView(state: State): PublicView;                                    // what the big screen draws from
  isOver(state: State): Results | null;
}
```

Rules:

- `step` has no access to the DOM, network, timers or `Math.random`. All randomness comes from
  the seed. This is what makes rules unit-testable, bots possible and UAT repeatable.
- The big screen renders from `publicView` only. `publicView` is serialisable, so in phase 2 the
  same snapshot can be sent to a remote player (NET-007) without touching game rules.
- Secrets (Peek Poker picks) exist only in `State` on the host and in that player's
  `privateView`. They never appear in `publicView` before the rules reveal them (PP-020).
- The platform owns: joining, seats, teams, pause, reconnect, leaving, the picker and results
  chrome.
- Every game passes the shared conformance kit (determinism, serialisable public view, no
  private data in the public view). The exact types are published by issue F-04 and are then a
  contract: changed only by the integrator (`PLAN.md` §2).

## 4. Simulation and rendering

- **Fixed timestep** simulation at 60 Hz, decoupled from rendering. Rendering interpolates
  between the last two states for objects the player is **not** directly controlling; a
  controlled cook is drawn at its latest simulated position (design rule: no tween while held).
- **Renderer (spike):** PixiJS (WebGL) for game scenes on the host. Sprites come from texture
  atlases; a level's static kitchen is one baked background image. Shell screens (landing,
  lobby, picker, results) are DOM with CSS and the Web Animations API.
- **Controller rendering:** DOM and Pointer Events, no canvas, so the controller page stays
  small and starts fast. Touch handling is `touch-action: none` with pointer capture.
- **Shell framework (spike):** Preact, chosen for size on a slow TV. Shared-element
  transitions (design rule: expand the same object) use the View Transitions API with a
  FLIP fallback.

## 5. Networking

- **Transport:** one WebRTC data channel per phone, unordered and unreliable for input state,
  plus one reliable ordered channel for events (join, lock-in, pause).
- **Input model:** phones send their full current input state (stick vector and button bitmask)
  with a sequence number at up to 60 Hz while anything is held, and a final "all released"
  message repeated three times. Loss therefore self-heals and a button can never stick
  (NET-005).
- **Host → phone:** the controller layout and private view, sent only when they change.
- **Pairing:** the host opens a WebSocket to the room's Durable Object. A joining phone opens
  one too, the object forwards offer/answer/candidates, and both sockets can close once the
  data channel is up. The Durable Object uses WebSocket hibernation so an idle room costs
  nothing.
- **Relay:** ICE tries direct paths first. The pairing server issues Cloudflare TURN credentials
  with a short lifetime, tracks monthly relay usage, and stops issuing them past the limit
  (NET-004).
- **Reconnect:** phones keep a room token and seat token in `sessionStorage`. On return they
  re-pair and the host restores the seat (PLAT-007). The host keeps room, players and scores in
  `sessionStorage` to survive its own reload (PLAT-009).

## 6. Hosting

- Cloudflare Workers: static assets for `apps/web`, the `apps/signal` Worker and Durable
  Object, on a `leeseidon.com` subdomain (REL-001).
- Known prices, checked 2026-11-15: TURN first 1,000 GB a month free then US$0.05/GB; STUN
  free; Durable Object requests 1 million a month included then US$0.15 per million. Recheck
  before launch.

## 7. Testing

| Layer | Tool | What it proves |
|---|---|---|
| Rules | Vitest | Game rules on the pure simulation; determinism (same seed and inputs give the same state). |
| Protocol | Vitest | Message validation, input sequencing, stuck-button safety under simulated loss. |
| UAT | Playwright | One host context plus N phone contexts with mobile emulation, real WebRTC, screenshots per step. |
| Performance | `tools/perf` | Frame time and input delay under 8 scripted controllers; fails the loop when over budget. |
| Device | Manual checklist | Real iPhone, real Android, the TCL Q65, at milestones (`UAT.md` §5). |

## 8. Risks the spikes must settle (M2)

1. WebRTC data channels from 8 phones to one host tab on home Wi-Fi: delay and stability.
2. Sprite and atlas memory for 8 animated cooks on the TV's browser.
3. Whether the TCL Q65's browser reaches the frame budget at all (REL-005).
4. iPhone Safari: wake lock, motion permission, fullscreen limits, vibration absence.
5. Blender pipeline time per character and per dish, to size M5 and M6 honestly.
