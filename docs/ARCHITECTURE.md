# Kaki Arcade — Architecture

How the requirements in `PRD.md` are met. Choices marked **(spike)** are confirmed or replaced
by the M2 spikes in `ROADMAP.md`; the reason for each choice is in `DECISIONS.md`.

## 1. Shape

```
 Phone (controller page)  ──inputs──▶  Big screen (host page)  ◀── renders game
          ▲   ◀──controller state──         │  runs the simulation
          │                                 │
          └────────── pairing only ─────────┘
                 Cloudflare Worker + Durable Objects (one per room; one per day for anonymous counts)
                 Cloudflare TURN relay (only when a direct link fails)
```

- **Host page** — authoritative. Runs the simulation and draws the game. (NET-001)
- **Controller page** — draws the kit, sends inputs, shows private panels. Holds no game rules.
- **Pairing server** — creates rooms, relays WebRTC handshakes, mints short-lived relay
  credentials, enforces the relay limit and rate limits, and accepts the host's anonymous daily counts (DATA-003). Never carries gameplay. (NET-002, NET-004)

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
  controller-kit/ Shell (header, page lock, wake lock), stick, D-pad, buttons, shoulder, tilt/shake, private display panel
  ui/             Design tokens from DESIGN.md §4, shared shell components, motion helpers
games/
  rabakz/         rules (pure) · host view (host/: view-model, Screen) · controller layouts
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

- Controller placement dependency: controller-kit imports the pure `@kaki/platform/{layout,phone-placement,phone-placement-types,private-placement}` exports; conformance imports those same modules. They depend on the phone contract and the pure UI line-height token, never the renderer or DOM.

## 3. The game interface (PLAT-030 to PLAT-033)

Every game is a module exporting the interface below. The exact types are in
`packages/platform/src/game/types.ts`, which is the contract; this is a summary.

```ts
interface GameModule<State, Settings, View> {
  meta: { id; name; blurb; players: { min; max }; teams: 'none' | 'optional' | 'required'; coop; solo; localSeat: 'play' | 'watch'; midGameJoin: boolean };
  stepMode?: 'returns-new' | 'in-place';          // default returns-new (D-048)
  settings: SettingsSchema<Settings> | ((context: SetupContext) => SettingsSchema<Settings>);
  preload?(settings: Settings | null): AssetManifest;
  controllerImages?: Readonly<Record<string, string>>; // picture id → packed asset source key
  save?(state: State): JsonValue;                 // what the console may store at any time
  init(seed: number, players: PlayerInfo[], settings: Settings, context: InitContext): State;
  step(state: State, inputs: StepInputs, dtMs: number): State;   // pure, deterministic
  join(state: State, player: PlayerInfo): State;  // mid-match (PLAT-008)
  joinTeam?(state: State): TeamId; // running team match (PLAT-008, D-285)
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

The optional host presentation contract `GamePresentation<Target, Assets>` lives alongside
these pure types in `packages/platform/src/game/presentation.ts`. A host screen may declare
`benchmarkScene(target, { width, height, assets }) → { draw(timestamp), destroy() }` and
`loadBenchmarkAssets(detail)`. The loader resolves already decoded round resources; the
scene draws the busiest scene synchronously on each shell-owned frame, forcing drawing work
with WebGL flush or a 1-pixel read. Width and height are TV viewport dimensions multiplied
by devicePixelRatio, in backing pixels. It runs without fetching,
scheduling frames or changing simulation. This host-only function is separate from the pure
`GameModule`. No game-specific renderer lives in platform.

During Start, after round assets and before Ready, Auto runs this scene on a detached
TV-sized target for about one second, discarding five warm-up frames. A 1.4 s timeout bounds
sampling when rAF stalls (a synchronous draw must itself be bounded). The existing cadence
judge selects full when at most 5% of intervals exceed 1.5 times the median, the
median is at most 20.5 ms, and no interval exceeds 50 ms. Otherwise it selects lower
and checks the lower cadence against 33.3 ms and a 100 ms maximum; lower waits for half-atlas decoding before the host screen
mounts. The TV stores the verdict per game at
`kaki.host-device.platform.detail-benchmark-<id>-v2` using the validated host-store wrapper
and size limit, keyed by UA hash, screen width × height and devicePixelRatio (no idle probe); changing or reselecting the detail setting
through `setDetailSetting` clears these verdicts. A missing scene keeps Auto at full.
Hidden pages and failed benchmarks stay full without caching; visible timeouts with too
few valid intervals select lower. Cancellation never caches. Measurements retain whether
the lower budget was met. Asset loading time is additional to the sampling window, as with normal Start preparation.

Grid cells may declare `image` (an id in `controllerImages`, with a required accessible
`label`) and `badge: { colour: ColourToken; text: string; tick?: boolean }` (at most two
characters). Pictures fill the cell with contain sizing and a 5 px inset; until decoded,
the label remains visible. A declared companion picture named `<id>-mask` is an optional
alpha mask for tinting with the cell's existing `colour`; the mask uses the same source
box as the base image and multiplies only those pixels, retaining their shading. Badges are 34 px with a 3 px edge. Existing `disabled` cells
refuse taps; picture contents fade to 0.3 while their badges remain legible. Selected picture cells use a 5 px accent outline
with zero offset so the outline fits inside the grid gap. The phone preloads declared pictures on game selection,
never at cold start; the build resolves asset references to hashed URLs. The app registry
loads each game's data-only picture declaration (the same value referenced by the module),
without importing host rules or private content onto a phone.

Rules:

- `step` has no access to the DOM, network, timers or `Math.random`. All randomness comes from
  the seed. Same inputs give the same result on the same browser engine (D-062). Games count
  steps (`STEPS_PER_SECOND`, `secondsToSteps`), never milliseconds.
- `StepInputs` gives sampled stick and button frames per player in seat order, the taps of this
  step, the leader, and who is connected. The console's pause button never reaches a game.
  Button bits follow the wire order in `packages/protocol` and are named by position
  (`FACE_BOTTOM`, `FACE_RIGHT`, `FACE_LEFT`, `FACE_TOP`), never by letter (D-047, D-062).
- A layout names controls by position and carries a per-player revision that changes only when
  what that player can tap changes. The session runner keeps the last layout and private view
  sent to each phone and sends again whenever the content for that phone differs, by a
  shape-aware comparison that does not allocate; each phone has its own wire revision, which
  is translated back to the game's revision for taps (D-079, D-082). At most the first
  accepted tap per player per control per step counts, and a tap the layout after the step
  refuses has no effect. Layouts must fit a 844 × 390 phone at the decided size floors
  (`PHONE_LIMITS`, `DESIGN.md` §4.4).
- The big screen renders from `publicView` only. `publicView` is serialisable, so in phase 2 the
  same snapshot can be sent to a remote player (NET-007) without touching game rules.
- Secrets exist only in `State` on the host and in that player's `privateView`. A game declares
  them in `secrets` and provides `scrambleSecrets`; nothing a player must not see appears in the
  public view, another phone, a layout or `results` before the rules reveal it (PP-020). A game
  stops declaring a secret once the screen gives it away.
- `meta.localSeat: 'play' | 'watch'` declares whether the TV keyboard/pad seat plays (CTRL-009; D-230). A watching seat stays in the lobby, marked Watching, but never enters game membership, private output, scores or results. With only that seat, the start screen reads “Waiting for a phone” and Start refuses with “⟨game title⟩ needs a phone. Go back and scan the code in the lobby to join.” Connected phones lead in seating order; the local seat leads only while no phone is connected (after the leader grace or restore wait), and a connected phone takes the lead back (D-282) (D-231). TV setup keys still work through the current leader; local-only starts use defaults or kept settings.
- `meta.midGameJoin` declares running admission (PLAT-008; D-201). The host applies the running
  game’s declaration in both playing and paused phases. With it enabled, the room seats a
  new phone immediately and the session calls `join` once for its new seat token; the game
  sends only a safe waiting layout/private view until its next join point, then enables play
  at its starting score (RZ-014 next question; PP-013 next round; TR-056 spectates until the
  next round). The normal per-phone output comparison sends the changed controls at that point.
  With it disabled, the reconnect host retains the refused request for that live connection
  and retries admission when the room becomes eligible (including picker/lobby or results),
  without requiring another phone send. Disconnect and explicit leave cancel that request.
  While a match uses teams, a game that declares `midGameJoin` and implements `joinTeam(state)`
  admits a new phone: the session asks `joinTeam` before `join`, the host records that team on
  the room seat, and `join` follows with `player.team` set; the joiner plays from its next join
  point with 0 (Rabakz: smaller team, then the team behind on points, then Red; D-234, D-285).
  A team game without `joinTeam` keeps D-202's hold: the phone waits on “Waiting for the lobby”
  and is let in at the picker or results.
  A resumed seat token retains its existing membership and score without another `join`.
- Mid-game joiners are marked `joinedMidGame`; in co-op they share the team score, in
  competitive play they start at 0 (D-062). Bots live inside a game's own state.
- The platform owns: joining, seats, teams, pause, reconnect, leaving, the picker and results
  chrome. Nothing in `packages/platform` knows about a particular game.
- Games are driven in tests through the dev harness, `@kaki/platform/harness` (F-05): a
  headless match runner over `driveStep`, scripts, bots, record and replay. Its command-line
  entry lives in `packages/platform/scripts`, a Node-only project, so platform source still
  cannot use timers or Node globals.
- The session runner (`packages/platform/src/session`, C-10) is what the console uses to run a
  match: it drives `driveStep` from the host loop, masks inputs a phone's layout does not draw,
  pauses (any player; the connected leader resumes; taps while paused are dropped), holds a
  match short of players and ends it after the two-minute seat hold, fixes teams for a match,
  and records matches in the dev harness's format with no seat tokens. It steps the three real
  games to the same state hash as the harness at every step.
- Every game passes the shared conformance kit, imported from `@kaki/platform/kit` so it never
  ships in the console bundle. It runs 25 checks (determinism, serialisable views, secrets,
  revisions, taps, joins and leaves across a whole match, phone size limits, a source scan for
  impurity). The types are a contract: changed only by the integrator (`PLAN.md` §2).

### Text strip with four-option controls (CTRL-003; D-203)

When the visible controls consist solely of one four-option grid and optionally one
single option without a face glyph, text-only private blocks prefer a horizontal
55 px strip above the grid. Placement uses 13 px outer margins and strip separation,
8 px internal gaps, and reserves the action's measured width plus 34 px beside the
grid (5 px at the unused edge without an action). Each private block must fit its
share of the strip. Every placed box must remain inside the phone area and be
disjoint from every other box before this candidate can report a fit. Other control
combinations retain side-panel packing; the strip never relocates a subset of them.
The renderer uses these same placed boxes to cap option type size. Option wrapping
metrics follow D-204. Each options or interactive-grid group shares its smallest
measured step (D-205), with one frame-deduplicated, batched measurement pass per
group on placement, font, viewport, group-size and shell-theme changes. Separate
controls keep their own step; 21 px bold applies only to coloured targets (D-206).

## 4. Simulation and rendering

Phone Results retains only private-view stats labelled **Place** and **Score**, clearing them
on the next match, lobby or disconnect (P-05; D-210). These English labels are the shell convention until the private-view
contract declares a result-stat flag; tied places use string values such as "=2".

- **Fixed timestep** simulation at 60 Hz, decoupled from rendering. Rendering interpolates
  between the last two states for objects the player is **not** directly controlling; a
  controlled cook is drawn at its latest simulated position (design rule: no tween while held).
- **Renderer (spike):** PixiJS (WebGL) for game scenes on the host. Sprites come from texture
  atlases; a level's static kitchen is one baked background image. Shell screens (landing,
  lobby, picker, results) are DOM with CSS and the Web Animations API. Peek Poker's table
  (P-04) draws its cards on one 2D canvas from the card atlas, with the seat list and hands
  list in DOM beside it; everything it draws is decoded and warmed before the table reports
  ready, so the first flip, swap or lock-in costs no frame (one 350 ms first-use frame was
  measured and removed in P-04).
- **Controller rendering:** DOM and Pointer Events, no canvas, so the controller page stays
  small and starts fast. Touch handling is `touch-action: none` with pointer capture.
- **Shell framework (spike):** Preact, chosen for size on a slow TV. Shell motion uses the
  Web Animations API, not the View Transitions API. The picker (C-09) expands the chosen tile
  into its start screen by a clip-path mask at final layout; a focus move animates the tile's
  translate, width and height from its painted rectangle (read before any animation is
  cancelled); content inside a tile and the TV heading change by two masks that meet at one
  boundary (D-092 e, D-107, D-108). The cost of animating tile width and height and of the
  masks on the TV is not measured yet (PERF-001, PERF-002).
- **Game host views (R-03 first):** a game's TV screen lives in `games/<game>/host/`, exported
  as `"./host"`. A pure `view-model` turns the game's `publicView` (and nothing else) into
  what the `Screen` draws, so a secret cannot reach the TV by mistake. Text is fitted by
  measurement; layout changes between questions use one block mask (D-105, D-106).
- **Mounted readiness (P-06):** host registrations may supply an imperative `mount`
  renderer as well as a Preact component. The shell mounts it with the initial public
  view while Start is pending, awaits its `ready` promise, and only then subscribes
  simulation frames. Rejection fails Start; cancellation destroys the mounted renderer.
  Peek Poker uses this gate to fetch/decode the card atlas and await P-04's fonts,
  sprite uploads and mounted phase warm-up. Updates after readiness only draw public
  snapshots; no assets are loaded during play.
- **Picker state:** `packages/platform/src/picker.ts` is the pure picker state machine (no
  game knowledge); `apps/web/src/game-registry.ts` is the only list of installed games. A
  game's index module is fetched when it is selected and loaded at Start.

The TV sound service (R-07, RZ-033) lives in `packages/platform/src/sound.ts`:
`apps/web/src/host-sound.ts` creates one context and its master, Effects and Music gain
nodes on the first TV click, pointer press or key, resumes it on gestures, and passes a
`Sound` API to the active game's host screen. Levels default to 70 and 55, persist in the
TV's local storage with blocked-storage fallback, and expose `getLevel`/`setLevel` for the
pause panel. Games provide scheduling functions to `sound.play`; Rabakz's Mallet synthesis
and pure public-view transition selection live only in `games/rabakz/host/sound.ts`.
D-169 adds a pre-created limiter on the Effects bus; cues may be scheduled while
context resume is pending. Levels load/save before the first audio gesture.
Rabakz's public view includes `wrongPresses: Record<number, number>` (RZ-005,
RZ-033): running accepted wrong-press counts per seat for the current question,
including the press that clears every pick and unlocks all players. Counts reset on
the next question; the screen compares counts to retain presses across simulation steps. It exposes
no correct press before reveal. Session-owned view history prevents replay across
screen remounts and inactive layers; together-arriving seats sound 30 ms apart,
with right or one wrong starting 233 ms after the final seat note (D-169).
Only the cue's oscillators and envelope gains are created during playback; no files load.

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
- **Picker messages (C-09, D-104 g):** `picker-input` (phone → host on `kaki-control`: a
  revision and one of open, previous, next, select, back, start) and `picker-state` (host →
  every connected phone: revision, screen, leader name, the focused game's id, name, blurb and
  player range, a reason of at most 144 characters and a required `failed` flag). Unlike game
  views, `picker-state` is sent on every room change. The host accepts picker input from the
  leader only, drops input carrying an old revision, accepts one press per `fast` duration and
  keeps the presses inside that window as a count of Previous and Next (modulo the number of
  games) plus the latest of Select, Back and Start, applied in order (D-108 c). Leadership
  changes only through the room's election when the leader leaves (PLAT-006).
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
- **Replies and reconnecting (C-07, D-092):** one wrapper at the Worker's exit adds CORS
  headers to every reply for an allowed origin, errors included, and exposes `Retry-After`
  and `X-Kaki-Room`. A room the pairing server does not have, or has expired, answers 404
  with `X-Kaki-Room: gone`; clients treat a room as gone only on that header, and any other
  failure as unreachable. Until a room is open the host app paces its own attempts (1 s
  doubling to 30 s, honouring `Retry-After`, at once when the browser comes online). Once
  it is open, netcode reconnects the signalling socket in place at the same pace and never
  closes a phone's data channel because signalling dropped.
- **Limits (`apps/signal`, C-03, D-081 to D-089):** a Worker-side admission check runs before
  any room lookup. Clients are counted by IPv4 address or IPv6 /64, with second meters per /48,
  under a rotating HMAC so no address is stored; counters live in memory only, in 16 limiter
  objects each held in memory for ten minutes after its last use. Room creation: 8 at once,
  then one a minute. Connection attempts: 96 at once, then two a second. A wrong or abandoned
  join is charged when admitted and refunded on success; after 16 failures the client backs
  off (1 s doubling to 60 s). At most 12 silent sockets per client per room and 17 unresolved
  in all. A room holds 16 silent sockets, each with 3 seconds to send its join; when full it
  closes one for a newcomer only if it is the same client's or has been silent 1.5 seconds,
  and charges its owner. A full limiter evicts only clean entries; otherwise newcomers share
  overflow buckets with normal budgets. If the limiter fails, creation and joins answer 503
  and rooms keep working. Unproven on the real edge (D-089).
- **Anonymous counts (`apps/signal`, X-04, DATA-003, D-180):** the host page alone keeps an
  in-memory map of eight count kinds (three error kinds, signalling reconnects and one
  per-match frame-time p95 band). It POSTs that map to `/counts` once after a match's
  results, and uses fetch with keepalive when the page is hidden or left. It never sends
  during play, and every request omits cookies and referrer. Phones send nothing.
  The Worker checks the origin, reads at most 512 bytes and accepts only the eight kinds
  as integers from 1 to 65,535. It charges a separate admission budget (8 at once, then
  one a minute per IPv4, IPv6 /64 and /48, rotating HMAC, memory only). It then adds the
  counts to a `ROOMS` object named `counts:<UTC day>`, which stores one `counts` map
  and nothing else. `GET /counts` answers only on localhost with `COUNTS_DEV_READ=true`.
  No address, header or URL is stored.
- **Connection lifecycle (`packages/netcode`, C-04):** the host paces its own signalling
  below the pairing server's rate limit, offers and answers ahead of candidates and phones in
  rotation. A peer that has not connected within 15 seconds is abandoned; a phone's clock
  starts at the host's first offer. A host signalling reconnect or a phone's signalling socket
  closing never drops an open data channel. A new offer always gets a new peer connection on
  the phone. Both signalling sockets send keep-alive pings. A relay refresh with no answer in
  3 seconds falls back to the existing grant. A phone's identity across reconnects is its seat
  token (D-076). All of this is proven against the pairing server's real room logic with
  simulated connections; real browsers and phones are the checklist in
  `docs/slices/C-04-netcode.md`.
- **Relay:** ICE tries direct paths first. The pairing server issues Cloudflare TURN credentials
  with a short lifetime, tracks monthly relay usage, and stops issuing them past the limit
  (NET-004).
- **Reconnect (`packages/platform/src/reconnect`, C-05, D-086):** a phone keeps its room code,
  seat token, accepted nickname, signalling room token and the time it dropped in
  `sessionStorage` (`kaki.phone-reconnect.v1`, at most 2 KiB). On return it re-pairs and sends
  `resume`; the host gives back the same seat, colour, name, team and score, sends its layout
  and private view at once and counts its first input (PLAT-007, D-079 c). The hold is 2
  minutes, inclusive; the newest connection presenting a seat token wins and the older one is
  closed. Every phone retry starts at 1 second and doubles to a maximum of 30 seconds; after the
  2-minute seat hold the phone shows a distinct state with a rejoin action and retries every
  30 seconds. Retry-After can lengthen a wait, capped at 30 seconds; past or zero values mean
  the 1-second minimum, and invalid values use the bounded fallback. Each attempt's 15-second
  negotiation deadline starts after its admission wait, so the deadline cannot cancel a longer
  retry wait. Signalling presence is advisory and ignored while the data channel holds the
  seat. While the phone's data channel is open, in-band room-not-found, room-expired and
  not-allowed from the pairing server do not tear down the channel, clear the stored seat or
  change what the phone shows; only with no open data channel do they mean the room is gone or
  the phone has been replaced (D-095 f). An ICE 'disconnected' state counts as channel loss only if it lasts 3 seconds. On the host, a room reported gone while a game is running over open links enters a closed state: play continues, no new phone or local join is accepted, the code is hidden and nothing more is checkpointed; after the game the TV offers a new room (D-099). A newly
  entered valid room code wins over a stored seat. The host keeps its credentials, the room
  (seats, names, colours, teams, leader and each phone's original drop time), the last results, completed-round totals keyed by seat and then by game id (a results screen adds to the selected game's total once; an interrupted round adds nothing; a freed seat loses all its totals; a stored snapshot from before C-22 with one number per seat keeps its room and results and drops its scores, D-226, D-270)
  and the game selection with its `save()` output in `sessionStorage`
  (`kaki.host-reconnect.v1`, at most 64 KiB). It writes at most once a second plus at every
  page exit, never per step, and a good snapshot is never erased because a newer one could not
  be written. On reload the host reopens signalling with the stored secret (D-066) and waits up
  to 15 s; only a definitive refusal erases the snapshot, while a timeout or network error
  keeps it for another attempt. The restored room returns to the lobby and the running match
  is lost for every game (PLAT-009, OQ-031). Phones connected at the reload start a new hold;
  phones already away keep their original drop time. No game state, private view, layout or
  recording is stored. A snapshot older than 12 hours, from another room, of another version,
  or more than 5 s ahead of the clock is discarded. `sessionStorage` survives a reload and
  reopening a closed tab, not a new tab.
- **Host-device storage** (DATA-002, C-13): scores, stars and settings live behind injected,
  versioned codecs in `packages/platform/src/storage`, in the TV browser's `localStorage`. Only
  the host shell opens that store, at explicit save points (settings when idle; game records as
  below), never through phone or server transports. Game records
  use one key per game, `kaki.host-device.game.<id>.progress-v1`, read on every Start and
  saved after results and on quit to the picker. An unreadable record arrives as `null`
  (nothing is written that match); a missing record arrives as the game's `empty()`. A record newer than the running code is ignored
  on read and never overwritten. Each schema sets its own size cap (16 KiB by default). The
  lower-detail benchmark (`benchmark.ts`, D-111, D-113) judges dropped frames under an
  injected workload and keys its cached verdict on the user-agent hash, the screen and the
  idle refresh rate; with no workload yet it answers "full" (OQ-036).

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
