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
  blender/        Scripts that render models to sprite frames and baked backgrounds
  assets/         `pnpm assets`: packs frames into atlases, writes the manifest, checks budgets
  perf/           Headless load harness: N scripted controllers, frame and latency capture
assets/
  src/            Asset set configs and small hand-made inputs (no .blend, no Git LFS: D-054)
  dist/           Generated atlases and backgrounds (built, not hand-edited)
uat/
  specs/          Playwright UAT scripts, one per requirement group
  evidence/       Screenshots per slice (committed)
docs/
```

## 3. The game interface (PLAT-030 to PLAT-033)

Every game is a module exporting the interface below. The exact types are in
`packages/platform/src/game/types.ts`, which is the contract; this is a summary.

```ts
interface GameModule<State, Settings, View> {
  meta: { id; name; blurb; players: { min; max }; teams: 'none' | 'optional' | 'required'; coop; solo };
  stepMode?: 'returns-new' | 'in-place';          // default returns-new (D-048)
  settings: SettingsSchema<Settings> | ((context: SetupContext) => SettingsSchema<Settings>);
  preload?(settings: Settings | null): AssetManifest;
  save?(state: State): JsonValue;                 // what the console may store at any time
  init(seed: number, players: PlayerInfo[], settings: Settings, context: InitContext): State;
  step(state: State, inputs: StepInputs, dtMs: number): State;   // pure, deterministic
  join(state: State, player: PlayerInfo): State;  // mid-match (PLAT-008)
  leave(state: State, player: PlayerId): State;
  pause?(state: State): State;  resume?(state: State): State;
  publicView(state: State): View;                 // what the big screen draws from
  privateView(state: State, player: PlayerId): PrivateView | null;       // carries a revision
  controllerLayout(state: State, player: PlayerId): ControllerLayout;    // carries a revision
  isOver(state: State): boolean;
  results(state: State): Results;                 // callable at any step; marks joinedMidGame
  assets(state: State): AssetManifest;            // everything loaded before the first step
  secrets(state: State): Secret[];
  scrambleSecrets?(state: State, viewer: PlayerId | null, salt: number): State;
}
```

Rules:

- `step` has no access to the DOM, network, timers or `Math.random`. All randomness comes from
  the seed. Same inputs give the same result on the same browser engine (D-062). Games count
  steps (`STEPS_PER_SECOND`, `secondsToSteps`), never milliseconds.
- `StepInputs` gives sampled stick and button frames per player in seat order, the taps of this
  step, the leader, and who is connected. The console's pause button never reaches a game.
  Button bits follow the wire order in `packages/protocol` and are named by position
  (`FACE_BOTTOM`, `FACE_RIGHT`, `FACE_LEFT`, `FACE_TOP`), never by letter (D-047, D-062).
- A layout names controls by position and carries a per-player revision that changes only when
  what that player can tap changes; the host compares revisions, never JSON. At most the first
  accepted tap per player per control per step counts, and a tap the layout after the step
  refuses has no effect. Layouts must fit a 844 × 390 phone at the decided size floors
  (`PHONE_LIMITS`, `DESIGN.md` §4.4).
- The big screen renders from `publicView` only. `publicView` is serialisable, so in phase 2 the
  same snapshot can be sent to a remote player (NET-007) without touching game rules.
- Secrets exist only in `State` on the host and in that player's `privateView`. A game declares
  them in `secrets` and provides `scrambleSecrets`; nothing a player must not see appears in the
  public view, another phone, a layout or `results` before the rules reveal it (PP-020). A game
  stops declaring a secret once the screen gives it away.
- Mid-game joiners are marked `joinedMidGame`; in co-op they share the team score, in
  competitive play they start at 0 (D-062). Bots live inside a game's own state.
- The platform owns: joining, seats, teams, pause, reconnect, leaving, the picker and results
  chrome. Nothing in `packages/platform` knows about a particular game.
- Every game passes the shared conformance kit, imported from `@kaki/platform/kit` so it never
  ships in the console bundle. It runs 25 checks (determinism, serialisable views, secrets,
  revisions, taps, joins and leaves across a whole match, phone size limits, a source scan for
  impurity). The types are a contract: changed only by the integrator (`PLAN.md` §2).

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

- **Transport:** two WebRTC data channels per phone, both created by the host, which always
  makes the offer: `kaki-input`, unordered and unreliable, for input state, and `kaki-control`,
  reliable and ordered, for everything else (join, taps, layouts, views, pause). Message
  shapes, sizes and validators live in `packages/protocol` (F-02).
- **Input model:** the phone sends one small binary frame per tick: a 16-bit sequence number,
  the stick, optional tilt, the current button mask and the masks of the previous 8 ticks,
  run-length encoded (7 bytes when nothing changes, 25 at most). It ticks 60 times a second
  while anything is held, **and must also tick at once on every touch**, capped at 120 a
  second (a capped tick is deferred, never dropped). After a release it keeps sending until
  the released state has gone out nine times. The host expands each frame with `expandInput`
  and feeds the ticks to the simulation core's input buffer, which ignores what it has seen.
  A tap is lost only if every frame carrying it is lost, there is no added delay, and a button
  cannot stick: silence for 15 steps releases it (NET-005). Two presses of one button that
  arrive inside one step both count: the second waits for the next step (F-03b). A waiting
  tick waits at most four steps (about 67 ms); after a longer stall each button reports at
  most one press and one release for everything that happened in it, and ends in its newest
  state (D-068). After a silence release, a button still held gives no new press until it
  has been seen up, so a delay spike cannot repeat a tap (F-03c); a game then sees released,
  held with no pressed, and a second released when the player lets go.
- **Link checks:** binary ping and pong on the input channel, one a second and a burst of 12
  on connect. Relay credentials (ICE servers) arrive in the pairing server's `created` and
  `joined` replies.
- **Host → phone:** the controller layout and private view, sent only when they change.
- **Pairing (`apps/signal`, C-01):** the host page creates a room with an HTTP POST, which
  returns an 8-character room code and a host secret (D-063, D-065). The host then opens a
  WebSocket to the room's Durable Object, proving the secret in the upgrade itself with the
  subprotocols `kaki.v1` and `kaki.host.<secret>` (D-066), and keeps that socket open for the
  whole life of the room. A joining phone opens a socket with `kaki.v1`; the object forwards
  offer, answer and candidates between a phone and its own host only, and never gameplay. A
  phone's socket can close once its data channel is up. The object uses WebSocket hibernation,
  so an idle room costs nothing. A room is deleted 10 minutes after its last socket closes and
  at most 12 hours after creation. Clients treat the errors `not-allowed`, `bad-message` and `opening-timeout`
  as final and do not wait for a close event. Request headers are never logged.
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
