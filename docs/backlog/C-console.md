# Track C — The console

The platform players never think about: host a room, scan to join, sit in a lobby, pick a game, split into teams, play, see results, pick again. It knows nothing about any particular game.

**Owns:** `apps/signal`, `apps/web` (host and join routes), `packages/netcode`, `packages/platform`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story C1 — I open a page on the TV and my friends join by scanning



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| C-01 | Pairing server: Worker and one Durable Object per room, unguessable codes, handshake forwarding, idle expiry, hibernation | PLAT-001, NET-002, DATA-005 | F-02 | 1 | merged |
| C-02 | Relay: short-lived TURN credentials, monthly usage tracking, cut-off at the limit with the same-Wi-Fi message | NET-003, NET-004 | C-01 | 1 | parked (D-128): branch `issue/C-02` kept; resume before M8 |
| C-03 | Rate limits on room creation and joins | DATA-005 | C-01 | 1 | merged |
| C-04 | Netcode: WebRTC data channels, sequenced input state, repeated release, link-quality measurement | NET-001, NET-002, NET-005, PERF-010 | F-02 | 1 | merged |
| C-06 | Room state (pure): seats, colours, nicknames with the blocked-words filter, leader and hand-over, capacity of 8, joining from the lobby | PLAT-003, PLAT-004, PLAT-005, PLAT-006, PLAT-008 | F-02 | 1 | merged |
| C-07 | Host lobby screen: room code and QR, seated players, connection quality | PLAT-001, PLAT-004, PLAT-010, PERF-022 | C-04, C-06, F-06 | 2 | merged |
| C-08 | Join page on the phone: scan or type the code, nickname, seat and colour, room-full message | PLAT-002, PLAT-003, PLAT-004, PERF-021 | C-04, C-06, F-06 | 2 | done |

## Story C2 — We pick a game together and can always get back



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| C-09 | Game picker: every installed game with name, player range and blurb; unavailable games say why; the chosen tile expands into its start screen | PLAT-020, PLAT-021 | C-07 | 2 | merged |
| C-10 | Session runner: runs a `GameModule` in the host loop, routes inputs, sends layouts and private views only when they change, pause and quit, results then back to the picker | PLAT-022, PLAT-023, PLAT-030, PLAT-031, PLAT-033, NET-001 | C-04, F-04 | 2 | merged |
| C-11 | Team setup: balanced split, players switch on their phones, team colour themes | PLAT-025 | C-10 | 2 | done |
| C-11b | Team setup polish: grid labels on one line or with a team mark instead of "· Red" at 667 and 844; a visible pressed style for the Teams on/off toggle (D-151) | PLAT-025 | C-11 | 1 | done |
| C-13 | Settings and host-device storage for scores and stars; the detail-mode benchmark on the lobby | DATA-002, PERF-002 | C-07 | 2 | part 1 merged (store, settings, benchmark); part 2 (settings screen, lobby benchmark wiring) to do |

## Story C3 — Nobody gets stuck



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| C-05 | Reconnect: a phone returns to its seat within 2 minutes; the host page reloads and the room, players and scores come back | PLAT-007, PLAT-009 | C-04, C-06 | 1 | merged |
| C-12 | Keyboard on the host for setup, and a keyboard or gamepad as one extra player | PLAT-024, CTRL-009 | C-10 | 2 | merged (CTRL-009 open: real game pad, held keys with T-07) |
| C-14 | Unsupported-browser message | REL-006 | C-07 | 2 | merged |
| C-16 | Start a game from the picker: Start loads the chosen game's module, runs it in the session runner, shows its TV screen and sends phones their controller; quit and results return to the picker | PLAT-022, PLAT-023 | C-09, C-10, R-03, K-01 | 2 | merged |
| C-16b | Phones draw the game's private view beside the controls and take the game's phone theme while a game is playing or paused (console otherwise); kit surfaces on panels use the panel ink | CTRL-003, PLAT-031 | C-16, K-05 | 2 | merged |
| C-15 | Console end to end with a test game: 8 emulated phones join, pick, play, pause, a phone reloads, the host reloads | PLAT-030, PLAT-033, NN-1, NN-2 | C-05 to C-14, C-16, K-08 | 3 | done (merged 85e6bb48, 2026-11-18) |
| C-17 | Late join for games that allow it: a game declares mid-match joining; a phone that joins during such a game is seated at the game's next join point with its starting score, instead of waiting for the lobby; other games keep the lobby wait; and a phone held on "Waiting for the lobby" is let in when the TV returns to the picker or lobby (today it never is, although its copy says "You can join when the current game ends"; found in R-06) | RZ-014, PP-013, TR-056, PLAT-008 | C-15, R-01 | 3 | done (merged 2026-11-18; D-201, D-202, OQ-048) |
| C-18 | Scale the shell's final-screen hint (`apps/web/src/game-final-hint.tsx`, `style.css`) with the 1920 × 1080 board so at 1280 × 720 it is not drawn at 1080 size beside a scaled podium (Peek Poker, Rabakz); then drop Peek Poker's 89 + 55 bottom reserve (D-209); decide whether Rabakz's own "Leader can continue" goes too | PLAT-022, PLAT-024, PP-032, RZ-032 | — | 1 | done (merged 2026-11-19; C-18 round 4; D-258) |
| C-19 | The label-cost test (`apps/web/src/kit-label-performance.dom.test.ts`) timed one pass and failed 1 in 3 verify runs at load 5 with 4.0 ms; it now takes the median of 7 fresh mounts per game against the unchanged 4 ms at 4x CPU, with every sample at most 3× the budget | PERF-012, CTRL-003 | R-02 | 3 | done (merged 2026-11-18; D-213) |
| C-20 | Conformance and pipeline test limits: verify failed at load 7–12 when a conformance attack test (5.7–6.7 s) hit Vitest's default 5 s and the Python asset suite was killed at 60 s; the kit now reuses its per-step graph walk, caches phone placement after full validation and builds borrowed-object paths only on a hit (fixture tests about 2× faster, same checks and cases); each of the 62 conformance tests carries `conformanceTimeout(measured ms)` = max(15 s, 4 × slowest measurement taken alone, load under 8); the asset-pipeline child is limited to 156 s (4 × 39 s at load 10.9), its test 13 s longer, and a killed child reports status, signal and timeout | PLAT-030, PLAT-031, PLAT-032, PLAT-033, PERF-023, PERF-024 | F-04, C-19 | 2 | done (merged 2026-11-19; D-259) |
| C-21 | Late joiner's team: a phone joining a running team match goes to the smaller team (equal: the team behind on points; still equal: Red) and plays from the next question with 0, its phone naming its team; conformance test; R-08's teams joiner assertion flipped (D-234) | RZ-014, PLAT-025, PLAT-008 | C-17, R-15 | 3 | todo |
| C-22 | Split the host snapshot's carried scores by game id (D-186): a host reload loses the running match and restores the room, seats, teams, leader and last results; no new screen draws the scores in v1 (D-226) | PLAT-009 | C-15 | 3 | done (merged 2026-11-19; D-270) |
| C-23 | Host kick with rejoin block: a seat-card action on the TV and on the leader's phone, with a confirm step, removes a player, and the removed phone cannot rejoin that room; built before any deploy (D-247) | PLAT-011 | C-15 | 3 | todo |
| C-24 | Sound on a TV nobody has touched: the landing's "Host a game" becomes a same-document navigation whose click starts the shared sound engine; while sound is still blocked, the lobby hint row reads "Click or press a key on this screen to turn on sound" and the pause panel's volume row says sound is off; nothing drawn during play (D-229) | RZ-033, TR-063 | R-07, X-01 | 3 | todo |
| C-25 | Detail benchmark in Start preparation: an optional benchmark scene in the game contract (ARCHITECTURE §3 updated), about 1 s of the game's busiest scene drawn off-screen behind "Starting…" once per game per TV, judged by D-111/D-113, half atlases decoded before Ready on "lower"; the Tabao Rush scene is supplied by T-07/T-17 (D-228) | PERF-002, PERF-023 | C-13, C-16 | 3 | todo |
| C-27 | Local seat: watches games with private views (marked "Watching"; with only the TV seat the heading reads "Waiting for a phone" and Start is refused with "⟨game⟩ needs a phone. Go back and scan the code in the lobby to join."; declared per game in `GameMeta.localSeat`); a connected phone leads in seating order, and the TV seat leads only while no phone is connected (D-230, D-231, D-282) | CTRL-009, PLAT-006, PLAT-021, PLAT-024 | C-12 | 3 | done (merged 2026-11-19; D-282) |
| C-28 | The shell's final-screen hint ("The leader continues on their phone", `apps/web/src/game-final-hint.tsx`) enters with the game's final screen: it fades in on the crossfade's entrance timing instead of appearing at full strength over the outgoing screen (R-16 review 3); reduced motion shows it at once | PLAT-022 | C-18 | 3 | todo |

## Carried from reviews

- **From C-12 (2026-11-18):** a 12-letter name with no spaces ("WWWWWWWWWWWW") breaks mid-word over three lines in its lobby seat (main's `overflow-wrap: anywhere`); fit long names by size or ellipsis instead.

- **C-06b nickname filter follow-ups (D-067):** known misses: `sh it`, `sh-it`, `dick`, `cb`
  with a surname, joins of two ordinary words, and unlisted words (spaz, tard, fag, sb, 屎,
  `kn n`). Known wrong blocks: Dykes, Ji Bai, Ka Nina, Cuntapay. Add names as they are found.
- **For C-04 and C-05:** the transport supplies each phone's identity (connection and device);
  the reducer never reads a seat from a message. Seat tokens stay out of `publicRoom`.
- **For C-07 and C-11:** the `team` and `link` fields on a seat are inert hooks. C-08 shows the
  name actually given (`name-suffixed`, `nameReplaced`).
- **For C-10:** the phase event carries the game's mid-game join policy; joiners are marked
  `joinedMidGame`.
- **From C-01:** C-02 swaps the single `iceGrant()` in `apps/signal/src/core/room.ts`. C-03 adds
  admission at room creation in `worker.ts` and counts failed joins (404, wrong code, 429) per
  client in the Worker before the room object is reached; shortening codes to 6 characters is
  reconsidered then (D-065). C-04 offers both subprotocols, keeps the host socket open, and
  does not depend on a close event after a host replacement or an opening deadline; check on
  the real edge whether server-initiated closes complete. Before any deploy: confirm logging is
  off and headers are not recorded (the host secret travels in `Sec-WebSocket-Protocol`).
- **F-02b (protocol):** merged 2026-11-16 (D-070).
- **C-03 must also close this (security review of C-01):** anyone who knows a room code can
  keep the four unidentified phone slots full with silent sockets (each lasts 10 s) and so stop
  new phones joining; the host is unaffected. Count unidentified slots and connection attempts
  per client in the Worker (by `CF-Connecting-IP`) before the room object is reached, and back
  off a client whose sockets are repeatedly closed without a `join`. The pairing server is not
  to be deployed publicly before C-03 merges.
- **From C-04:** C-05's reducer must verify the seat token before accepting a resume as an
  identity. C-10 needs the resume acknowledgement on the wire (a protocol change, allowed until
  the first deploy, D-070). C-03 sizes the server's rate bucket for eight phones joining at
  once. F-07 and the real-phone test carry the browser checklist in the slice note. When F-08
  measures garbage, decide on an `expandInput` that fills a reused buffer. Offers take priority
  over candidates in the pacing queue; `take()` copies the queue per send (fine at signalling
  volumes).
- **From C-10 (session runner):** the shell must send room expire events while paused, keep
  frames advancing, check `Action.viewRev`, bind callbacks to the current authenticated
  connection, preload assets and draw the pause, results, error and picker events. Open: an
  optional resume-fence wire message (wording in `docs/slices/C-10-session-runner.md`); a
  per-game mid-match join flag in `GameMeta`; a way for a game to learn a changed name or
  colour mid-match. Tidy: `c10r2-replay.test.ts` imports two games by relative path from the
  platform package (move it); a type-level check that `compare.ts` covers every layout field.
  The per-step allocation of about 500 bytes sits in the input buffer and `drive.ts`: F-08
  measures it.
- **From C-05 (reconnect):** `rejoin()` in `phone.ts` sends hello without trying resume first,
  so a rejoin in the 15 s before the host notices the drop holds two seats until the old one
  expires: resume first, then hello. Invalid settings also discard valid results in the
  snapshot (`host-store.ts`): drop each part on its own. Add a test that an invalid typed code
  keeps a stored seat (fixed at merge without one). Game tests import `findSecret` and
  fixtures by relative path across packages: give tests a proper shared entry point. The shell
  wiring list for C-07 and C-08 is in `docs/slices/C-05-reconnect.md`. Real phones and browsers
  must prove: sessionStorage across reload and reopen-closed-tab, the page lifecycle events, a
  Wi-Fi drop with no online event, duplicate tabs, re-pairing time for 8 phones after a host
  reload.
- **From C-03 (rate limits):** netcode should retry once on `opening-timeout` and honour
  Retry-After on room creation, and the host page should show the wait. The shell needs a host
  kick that blocks rejoining (anyone with the code can take all 8 seats). Before a public
  deploy: the staging probes in D-089 and the eight-point checklist in
  `docs/slices/C-03-rate-limits.md`. Accepted trade-offs: someone on the same address can push
  out a housemate's fresh connection; one abuser with several /64s in a carrier's /48 can keep
  that /48's joins backed off. Every change to `apps/signal` is smoke-tested on a real local
  server before merge (`scripts/smoke.mjs`, needs `ADMISSION_SECRET` in `.dev.vars`).
- **Automated security review of the C-03 merge, acknowledged:** (1) memory-only counters can
  be lost if the edge drops an idle limiter: known, D-089, staging probe before deploy with
  storage of offenders as the fallback. (2) A phone silent for 1.5 s can be pushed out by
  another client while the room's pool is full and is charged one failure: accepted in the
  third review (one failure against a budget of 16, only under attack; not charging would
  make holding a room's pool full free again). Revisit both at the staging probe.
- **From C-09 (game picker), merged 2026-11-17 after ten Codex fix rounds, four reviews and
  two integrator fixes found in a browser.** **For C-10:** a successful Start still stops at
  "Starting…" (no input is accepted in `starting` and there is no timeout); use the loaded
  module, await preload and setup, wire `returnToPicker` and settings (PLAT-022, PLAT-023).
  **Start screen is layout B (D-109):** remove the development-only options A and C
  (`apps/web/src/picker-demo.css`, the `layout` demo parameter) in C-15.
  **For C-15 (motion polish):** focus moves travel in straight lines (DESIGN §3 asks for arcs);
  during expand and collapse half-glyphs of the two header sentences abut at the mask edge and
  the focus ring loses its right side, snapping back at the end of collapse; the outgoing
  heading dims before the incoming one shows (collapse frame 3); the status line is revealed
  last; still 04 clips the focused tile's blurb mid-move; add a UAT check that the focus ring's
  `::after` box-shadow is drawn (round 8 passed with the ring missing); assert the interrupt
  step read some animations; `--picker-heading-size` is written but no longer read.
  **For the K track:** the leader's phone keeps four buttons (Previous, Next, Select, Back)
  until the stick and Pick/Back exist (D-098). **For A-09:** (resolved by A-09, 2026-11-18) picture slots are not 1.618 : 1
  (the primary about 2.05 : 1, expanded about 2.36 : 1, side slots collapse when a reason
  shows); pictures must be preloaded. **For the F follow-up (packages/ui):** make
  `GOLDEN_COLUMNS` and `GOLDEN_COLUMNS_REVERSED` `minmax(0, …)` so `.picker-stage` can use the
  token again (D-107 b); other users are `style.css` (expanded tile grid) and `phone.css`.
  **Measure (PERF-001, PERF-002):** 20 focus moves, expands and collapses at 1080p on the Mac
  and on the TV: tile width and height animate every frame and the masks repaint about 1.7
  megapixels. There is no picker `pnpm perf` scenario yet.
- **From C-07 (host lobby).** **For C-08:** the phone's probe adapter must return
  `{status, gone, retryAfterMs}` with `gone` true only when the reply carries
  `X-Kaki-Room: gone`; use `apps/web/src/join-link.ts` for the code and link; add a `/play`
  route reading `?code=`; dev phones need a LAN-reachable `KAKI_SIGNAL_URL` (production
  defaults to same origin); decide whether the controller shares the host entry against the
  300 KB budget; add the root `pnpm dev` launcher (web, pairing server with its local secret
  and allowed origin) and keep the command table in CLAUDE.md true; retake the lobby
  evidence with real phones seated, including an outage with phones connected. **For C-09:**
  `createHost` exposes only start and stop and `validateSelection` is fixed to false: it needs
  room and leader input, selection and session hooks and an app-level screen state machine
  with the 4A crossfade; `Overlap` can be reused with the surface kept outside it. **For
  C-10/C-15:** D-099, ruled by Randy: when the server says the room is gone while phones are still linked, keep the game and its links, refuse new joins, offer a new room after the game.
  **For C-13:** a place for the lobby benchmark. **Polish, optional:** reach the ghost
  opacity sooner in the wipe; put the card edge on the list item; assert in the smoke that a
  Worker-made 404 has no gone header; tidy the netcode test that passes `gone` with 426.
  **Edge check (OQ-030):** the WebSocket pass-through in the CORS wrapper is proven only on
  `wrangler dev`.

- **From C-08 (phone join page).** The controller shares the host's entry for now (45 KB gzip);
  give it its own entry when a game's controller code would push it towards 300 KB.
  **For C-09:** the leader's phone says the same waiting line as everyone until the picker
  gives the leader something to do; "Watch the TV." is for a player a running game accepted.
  **For C-10 and C-15:** the host side of D-095 f (a room reported gone keeps playing while
  links are open, stops offering the code, offers a new room after the game); a grace period
  before an ICE "disconnected" counts as loss; the mid-game controller layout. **For C-07
  polish:** an empty seat's "Scan to join" wraps to two lines at 1080p and crowds the leader
  mark. **For F-07:** a DOM render test for the phone route and the name component
  (`phone-message.test.ts` matches source text today). Not done anywhere: real phones, a QR
  scan, Safari, Firefox, the on-screen keyboard, a screen reader on the announcement region.
### From C-15's reviews (2026-11-18)

- **C-15a · Menu overlap against every game's layout (PLAT-023, D-051).** Check the 89 × 68 Menu target against Tabao Rush's diamond and stick, the Rabakz answer grid and the Peek Poker grid at 667 × 375, 844 × 390 and 932 × 430. Depends on T-*, R-*, P-*.
- **C-15b · Non-leader Paused copy and state (PLAT-023).** A non-leader sees "Waiting for Phone 1 to resume" with no live-looking buttons, instead of disabled buttons at 0.92 opacity (C-15 round6-p8 stills 27, 29).
- **C-15c · Reconnect backoff resets when the host returns (PLAT-009).** Phones mid-backoff (cap 30 s) retry promptly once the host is back.
- **C-15d · Host restore first paint (PLAT-009, DESIGN §3 "never a blank frame on the TV").** Show "Restoring your room" and the held seats from the first frame; hide "J: join" and "Enter: pick a game" until pairing is ready; never show "8 of 8" over placeholder seats (strip 78).
- **C-15e · Closed-room copy and seat badge (D-099).** Phones keep their seat badge; copy matches what the TV offers before and after "Create a new room" (still 91).
- **C-15f · D-099 signal reset can surface as ERR_CONNECTION_RESET (UAT harness).** The C-15 slice expects REFUSED and ABORTED when the signal server goes away; round7-p8 saw a host `requestfailed net::ERR_CONNECTION_RESET` instead. Expect it, or find why the reset sometimes shows as RESET. Until then a full re-run can fail at the same point.
- **C-15g · Raw z-index values in `apps/web/src/phone.css` (veil stack).** Move to tokens or DOM order.

### C-02 parked (2026-11-17, D-128)
Four review rounds did not converge, so C-02 is parked with its branch `issue/C-02` and worktree
kept (round 4 is commit 9c6153a). Resume before release (M8); the relay only matters for phones
that cannot reach the host directly. The fourth review's open items, to brief on resuming:
- **M1:** the join's fallback grant (`room-object.ts:150`, STUN only, ttlS 60) is not refreshed
  before the host's first offer (`netcode/src/transport.ts:131, :141` refresh only 30 s before
  expiry), so a phone that needs TURN times out at 15 s and every redial falls back again while
  the provider is slower than 500 ms. Use a fallback TTL of 30 s or less, or refresh on the first
  offer when relay is off; add an end-to-end test that the peer is rebuilt with TURN servers.
- **S1:** test 60 back-to-back relay messages all get `ice` (the `bucketReserved: false` mutant
  survives). **S2:** test grants equal the messages the bucket allowed. **S3:** reuse one grant
  per room for a short window (also closes the redial gap). **S4:** slice note is stale (round 4
  commit exists; `*.log` evidence is git-ignored).
- Still needs Randy's real Cloudflare check before NET-003 and NET-004 can be done.
