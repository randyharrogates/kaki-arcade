# Track C — The console

The platform players never think about: host a room, scan to join, sit in a lobby, pick a game, split into teams, play, see results, pick again. It knows nothing about any particular game.

**Owns:** `apps/signal`, `apps/web` (host and join routes), `packages/netcode`, `packages/platform`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story C1 — I open a page on the TV and my friends join by scanning



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| C-01 | Pairing server: Worker and one Durable Object per room, unguessable codes, handshake forwarding, idle expiry, hibernation | PLAT-001, NET-002, DATA-005 | F-02 | 1 | doing (Codex) |
| C-02 | Relay: short-lived TURN credentials, monthly usage tracking, cut-off at the limit with the same-Wi-Fi message | NET-003, NET-004 | C-01 | 1 | todo |
| C-03 | Rate limits on room creation and joins | DATA-005 | C-01 | 1 | todo |
| C-04 | Netcode: WebRTC data channels, sequenced input state, repeated release, link-quality measurement | NET-001, NET-002, NET-005, PERF-010 | F-02 | 1 | todo |
| C-06 | Room state (pure): seats, colours, nicknames with the blocked-words filter, leader and hand-over, capacity of 8, joining from the lobby | PLAT-003, PLAT-004, PLAT-005, PLAT-006, PLAT-008 | F-02 | 1 | merged |
| C-07 | Host lobby screen: room code and QR, seated players, connection quality | PLAT-001, PLAT-004, PLAT-010, PERF-022 | C-04, C-06, F-06 | 2 | todo |
| C-08 | Join page on the phone: scan or type the code, nickname, seat and colour, room-full message | PLAT-002, PLAT-003, PLAT-004, PERF-021 | C-04, C-06, F-06 | 2 | todo |

## Story C2 — We pick a game together and can always get back



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| C-09 | Game picker: every installed game with name, player range and blurb; unavailable games say why; the chosen tile expands into its start screen | PLAT-020, PLAT-021 | C-07 | 2 | todo |
| C-10 | Session runner: runs a `GameModule` in the host loop, routes inputs, sends layouts and private views only when they change, pause and quit, results then back to the picker | PLAT-022, PLAT-023, PLAT-030, PLAT-031, PLAT-033, NET-001 | C-04, F-04 | 2 | todo |
| C-11 | Team setup: balanced split, players switch on their phones, team colour themes | PLAT-025 | C-10 | 2 | todo |
| C-13 | Settings and host-device storage for scores and stars; the detail-mode benchmark on the lobby | DATA-002, PERF-002 | C-07 | 2 | todo |

## Story C3 — Nobody gets stuck



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| C-05 | Reconnect: a phone returns to its seat within 2 minutes; the host page reloads and the room, players and scores come back | PLAT-007, PLAT-009 | C-04, C-06 | 1 | todo |
| C-12 | Keyboard on the host for setup, and a keyboard or gamepad as one extra player | PLAT-024, CTRL-009 | C-10 | 2 | todo |
| C-14 | Unsupported-browser message | REL-006 | C-07 | 2 | todo |
| C-15 | Console end to end with a test game: 8 emulated phones join, pick, play, pause, a phone reloads, the host reloads | PLAT-030, PLAT-033, NN-1, NN-2 | C-05 to C-13, K-08 | 3 | todo |

## Carried from reviews

- **C-06b nickname filter follow-ups (D-067):** known misses: `sh it`, `sh-it`, `dick`, `cb`
  with a surname, joins of two ordinary words, and unlisted words (spaz, tard, fag, sb, 屎,
  `kn n`). Known wrong blocks: Dykes, Ji Bai, Ka Nina, Cuntapay. Add names as they are found.
- **For C-04 and C-05:** the transport supplies each phone's identity (connection and device);
  the reducer never reads a seat from a message. Seat tokens stay out of `publicRoom`.
- **For C-07 and C-11:** the `team` and `link` fields on a seat are inert hooks. C-08 shows the
  name actually given (`name-suffixed`, `nameReplaced`).
- **For C-10:** the phase event carries the game's mid-game join policy; joiners are marked
  `joinedMidGame`.
