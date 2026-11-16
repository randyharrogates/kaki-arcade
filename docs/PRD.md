# Kaki Arcade — Product Requirements

**Status:** v1.1, changed by Randy on 2026-11-16 (D-022 to D-037): a third game, teams, throwing,
fires, several cook characters, no scrolling. v1.0 baseline was agreed on 2026-11-15.
**Owner:** Randy. Only Randy changes a requirement. Claude proposes changes in
`OPEN-QUESTIONS.md`; an accepted change is logged in `DECISIONS.md` and then edited here.

Every requirement has a stable ID. Code, tests and UAT evidence are tracked against these IDs
in `TRACEABILITY.md`. A requirement ID is never reused or renumbered.

Priority: **MUST** (v1 cannot ship without it) · **SHOULD** (v1 unless it threatens a MUST) ·
**LATER** (designed for, not built in v1).

---

## 1. What this is

Kaki Arcade is a browser games platform for a room full of people. One **big screen** (a TV,
driven by a laptop or by the TV itself) shows the game. Every player joins by scanning a QR code
and their **phone becomes a console-style controller**. Nothing is installed.

v1 ships with a game picker and three original games:

- **Tabao Rush** — a real-time co-op cooking game set in a Singapore hawker centre.
  Spec: `games/tabao-rush.md`.
- **Peek Poker** — a turn-based memory game using poker hands. Spec: `games/peek-poker.md`.
- **Rabakz** — a trivia night game where everyone answers at once on their phone.
  Spec: `games/rabakz.md`.

The platform exists so more games can be added later without rebuilding rooms, pairing or
controllers.

### Audience and release

- Public release: anyone with the link can host and play. No accounts in v1.
- Hosted on a subdomain of `leeseidon.com` (proposed: `arcade.leeseidon.com`).
- English only in v1.

### Originality (binding)

Tabao Rush is an original game in the co-op cooking genre. It must not reuse the name,
characters, art, music, levels or look of any existing game. Peek Poker uses standard playing
cards and standard poker hand rankings only, with play scoring and no real-money element.
Rabakz uses openly licensed and original questions only, credited as their licences require.

---

## 2. Non-negotiables

These came directly from Randy and override convenience.

| ID | Requirement |
|---|---|
| **NN-1** | Everything runs in a web browser: the big screen and the phone controllers. No app install for players. |
| **NN-2** | The phone is the controller. Up to **8 players** in one room. |
| **NN-3** | No perceptible lag in play. The budgets in `PERFORMANCE.md` are hard requirements, tested on every loop. |
| **NN-4** | Art is produced through Blender (route D) and must look finished: not primitive, with correct character movement and animation. |
| **NN-5** | The design rules in `DESIGN.md` (golden ratio, motion, no flat backgrounds) are binding for the interface **and** for gameplay. |
| **NN-6** | Visual and art direction is chosen by Randy from artifact option boards **before** anything visible is built: no shell UI, game screen, controller styling or final art until the design gate closes (`DESIGN.md` §5). Code that draws nothing (rules, protocol, netcode, pairing server, tooling) may be written while the gate is open (amended 2026-11-16, D-039). |
| **NN-7** | Implementation is tracked against this PRD in local repo docs at all times (`TRACEABILITY.md`). |
| **NN-8** | Work proceeds in the loop **code → verify → test (UAT with screenshots) → review → code** (`WORKFLOW.md`). |
| **NN-9** | Built by Claude. Codex is used only for image generation or for a task Claude cannot do (`AGENTS.md`). |

---

## 3. Platform requirements

### 3.1 Rooms and joining

| ID | Pri | Requirement |
|---|---|---|
| PLAT-001 | MUST | Opening the host page creates a room with a short room code and a QR code that encodes the join link. |
| PLAT-002 | MUST | A phone that scans the QR code (or types the code at the join page) lands in the lobby as a player, with no install and no account. |
| PLAT-003 | MUST | A room holds 1 to 8 players. A ninth joiner sees a clear "room is full" message. |
| PLAT-004 | MUST | Each player picks a nickname (max 12 characters) and is assigned a distinct colour and seat number shown on both the big screen and their phone. |
| PLAT-005 | MUST | Nicknames pass a blocked-words filter. A blocked name is replaced with a neutral default and the player is told. |
| PLAT-006 | MUST | The first player to join is the room leader and can start games, change settings and return to the picker. Leadership passes on if the leader leaves. |
| PLAT-007 | MUST | A player whose phone sleeps, reloads or drops is put back in the same seat with the same state when they return within 2 minutes. |
| PLAT-008 | MUST | Players can join mid-session from the lobby. Joining during a running game is decided per game (each game spec says). |
| PLAT-009 | MUST | If the host page closes or reloads, phones show "host disconnected" and reconnect automatically when the room returns. A running round is lost; the room, players and scores so far are restored. |
| PLAT-010 | SHOULD | The big screen shows connection quality per player (good, weak, relayed). |

### 3.2 Game picker and sessions

| ID | Pri | Requirement |
|---|---|---|
| PLAT-020 | MUST | The lobby shows a game picker listing every installed game with name, player range and a one-line description. The leader navigates and selects with their controller. |
| PLAT-021 | MUST | Each game declares its supported player range. A game that cannot run with the current player count is shown as unavailable with the reason. |
| PLAT-022 | MUST | After a game ends, the room returns to a results screen and then the picker, keeping the same players. |
| PLAT-023 | MUST | The leader can pause a running game and quit to the picker. Any player can pause. |
| PLAT-024 | SHOULD | The big screen can be driven without a phone for setup (keyboard) so the host is never stuck. |
| PLAT-025 | MUST | A game may declare team play. Before such a game starts, players are split into two teams: balanced automatically by default, changeable by each player on their own phone and by the leader. Each team has a colour theme and a name (for example red and blue), shown on the big screen and on every phone. |

### 3.3 Game interface (extensibility)

| ID | Pri | Requirement |
|---|---|---|
| PLAT-030 | MUST | Games are modules behind one documented interface. Adding a game requires no change to room, pairing, controller transport or lobby code. |
| PLAT-031 | MUST | The interface covers: metadata, player range, controller layout per player and game phase, simulation step, big-screen rendering, per-player private view for the phone, and results. |
| PLAT-032 | MUST | Game simulation is a pure, deterministic function of state, inputs and a seed, with no access to rendering, network or wall-clock time. (This is what makes automated UAT, bots and phase 2 remote play possible.) |
| PLAT-033 | MUST | All three v1 games use this interface with no private back doors. Peek Poker, Rabakz and Tabao Rush being different in kind (turn-based with secrets, simultaneous answers, real-time shared space) is the proof. |

### 3.4 Controller kit

| ID | Pri | Requirement |
|---|---|---|
| CTRL-001 | MUST | The phone shows a console-style controller assembled from a standard kit: left stick, D-pad, A/B/X/Y face buttons, L and R shoulder buttons, Start/Pause. |
| CTRL-002 | MUST | Each game declares which kit parts it uses per phase. Unused parts are not drawn, and used parts grow to fill the space. |
| CTRL-003 | MUST | Optional kit parts a game may request: tilt, shake, swipe area, and a private display panel (text, cards, choices). |
| CTRL-004 | MUST | The controller works in landscape, fills the screen, prevents page scroll, zoom, text selection and pull-to-refresh, and keeps the screen awake while in a room. |
| CTRL-005 | MUST | Touch targets are at least 55 px. The stick tracks the thumb 1:1 with no smoothing and re-centres on release. Multi-touch works (stick and two buttons together). |
| CTRL-006 | MUST | Every press gives feedback on the phone within one frame: visual always, vibration where the browser supports it. |
| CTRL-007 | MUST | Motion parts (tilt, shake) ask for permission with a clear tap-to-enable step on iPhone and degrade to a button alternative if refused. |
| CTRL-008 | MUST | The controller shows the player's colour, seat and nickname, and a connection indicator. |
| CTRL-009 | SHOULD | A physical keyboard or gamepad attached to the host can act as one extra player for development and accessibility. |

### 3.5 Networking

| ID | Pri | Requirement |
|---|---|---|
| NET-001 | MUST | The host browser is authoritative: it runs the simulation. Phones send inputs and receive only what their controller needs. |
| NET-002 | MUST | Phones connect to the host directly (WebRTC data channels). A small pairing server only introduces devices and never carries gameplay. |
| NET-003 | MUST | When a direct link is impossible, the connection falls back to a relay (Cloudflare TURN) automatically. |
| NET-004 | MUST | The pairing server stops issuing relay access once monthly relay usage passes a configured limit (default 800 GB). Affected phones are told to join the same Wi-Fi as the big screen. |
| NET-005 | MUST | Input messages are small, sequenced and tolerant of loss; a dropped packet never leaves a button stuck down. |
| NET-006 | MUST | All pages are served over HTTPS (required for motion sensors, wake lock and WebRTC). |
| NET-007 | LATER | Phase 2: a remote player on a single device sees the game view and plays with on-screen or keyboard controls. v1 must not block this: state the host sends is already expressed as serialisable snapshots. |

### 3.6 Data, privacy and safety

| ID | Pri | Requirement |
|---|---|---|
| DATA-001 | MUST | No accounts, no email, no personal data collected in v1. |
| DATA-002 | MUST | Scores, stars and settings are saved on the host device only. |
| DATA-003 | MUST | The only telemetry is anonymous error and performance counts with no nicknames, IPs or device identifiers stored. |
| DATA-004 | MUST | A short privacy page states the above in plain English. |
| DATA-005 | MUST | Room codes are unguessable enough to prevent casual gate-crashing, rooms expire when idle, and the pairing server rate-limits room creation and joins. |

### 3.7 Public release

| ID | Pri | Requirement |
|---|---|---|
| REL-001 | MUST | Deployed on Cloudflare under a `leeseidon.com` subdomain, within the existing US$5/month plan under normal use. |
| REL-002 | MUST | A landing page explains what it is in one screen and has a single "Host a game" action. |
| REL-003 | MUST | A "how to put this on your TV" help page: laptop over HDMI (recommended, with Game Mode), and the TV's own browser. |
| REL-004 | MUST | Supported big screens: current Chrome, Edge and Safari on a laptop or desktop. Supported phones: iPhone and Android from roughly the last four years, current Safari and Chrome. |
| REL-005 | SHOULD | Runs in a browser on Randy's TCL Q65 (Google TV). Pass or fail is decided by test (`PERFORMANCE.md`); a laptop on HDMI is the supported fallback. |
| REL-006 | MUST | Unsupported browsers get a clear message, not a broken page. |

---

## 4. Quality requirements

| ID | Pri | Requirement |
|---|---|---|
| NFR-PERF | MUST | All budgets in `PERFORMANCE.md` are met and tested automatically. |
| NFR-DES | MUST | Every screen passes the checklist in `DESIGN.md` §6 at review. |
| NFR-A11Y | MUST | Colour is never the only way to tell players apart (colour plus shape or number). Text on the big screen is readable from 3 m. `prefers-reduced-motion` is respected. |
| NFR-REL | MUST | A 30-minute 8-player session completes with no crash, no stuck input and no desync between the big screen and any phone. |
| NFR-TEST | MUST | Game rules have unit tests on the deterministic simulation. Every user-facing requirement has a UAT script with screenshots. |
| NFR-DOC | MUST | `TRACEABILITY.md`, `STATUS.md` and `CHANGELOG.md` are updated in the same loop as the change they describe. |

---

## 5. Game requirements

Game rules live in the game specs and carry their own IDs:

- `games/tabao-rush.md` — IDs `TR-xxx`.
- `games/peek-poker.md` — IDs `PP-xxx`.
- `games/rabakz.md` — IDs `RZ-xxx`.

Launch size for Tabao Rush: **8 co-op levels, 3 versus arenas, 7 dishes, 8 cook characters**,
with co-op (1 to 8), team versus, and solo with bots. Launch size for Rabakz: at least 1,500
questions (RZ-024).

---

## 6. Out of scope for v1

- Remote players (phase 2, NET-007).
- Accounts, cloud saves, leaderboards across devices.
- Languages other than English.
- Native apps, app-store listings, a wrapped Android TV app (may follow REL-005 results).
- Real-money or wagering features of any kind.
- Linked living rooms (several big screens in one game).

## 7. Phases after v1

- **Phase 2:** remote single-device players; Blender polish pass; more Tabao Rush content.
- **Phase 3:** optional accounts for cross-device progress; a third game to re-prove PLAT-030.
