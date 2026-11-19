# C-29 — Rejoin your seat and pause for missing players

Requirements: PLAT-007, PLAT-034, PLAT-035; preserves PLAT-009, PLAT-023 and PLAT-011. Decisions: D-298, D-301, D-247, D-302.

## Implementation

- `packages/platform/src/room/room.ts`: browser identity wins before fresh admission, including a connected stale tab; takeover closes the old connection. A name claim binds only a disconnected phone seat. Running/paused matches retain disconnected seats; lobby holds still expire after two minutes. Local seats cannot be removed or block-listed.
- `packages/platform/src/reconnect/host-room.ts`: offers a public name/seat/colour list to unmatched joining phones, refreshes it as membership changes, checks claims against current connectivity, and retains ordinary admission for “I'm new”. Expiry scheduling respects match holds and avoids a repeated expired leader timer.
- `packages/platform/src/reconnect/phone.ts`: the name-choice screen cancels the connection-attempt timeout while the player chooses.
- `packages/platform/src/session/index.ts`: host elapsed time drives the three-second disconnect grace and three one-second countdown states. Existing pause hooks, input fencing and simulation gating apply. New drops cancel countdown; carry on ignores only the current missing connections; a chosen pause never auto-resumes. Rejoining changes connection ownership without game join/leave or score resets.
- `packages/platform/src/game/types.ts`: optional pure `pauseOnDisconnect(state)` eligibility hook. All three games declare it. This absent-player hook was missing: the platform otherwise cannot distinguish an inter-round scoreboard/final from live play without knowing game-specific state. Existing absent-player simulation handling is unchanged.
- `games/peek-poker/src/rules/game.ts`, `games/rabakz/src/index.ts`, `games/tabao-rush/src/rules/game.ts`: pure, game-owned eligibility excludes scoreboards/final screens without exposing game-specific phase logic to the platform.
- `apps/web/src/view-channel.ts`, `session-links.ts`, `session-adapter.ts`, `rejoin.ts`: reserved shell views carry only public reconnect names/status, outside the game's private-view revision space. No protocol change: existing opaque `action` and `view` messages suffice; no identity crosses into a layout, public view or another phone.
- `apps/web/src/phone.ts`, `phone-route.tsx`, `phone.css`: disconnected-name choices, seat colour/number, exact heading and “I'm new”; connected phones show waiting/countdown, and the leader can carry on.
- `apps/web/src/pause-panel.tsx`, `host-route.tsx`, `style.css`: existing TV pause panel extended with reconnect information; existing resume, quit, Effects and Music controls retained.
- `apps/web/src/host.ts`: waiting events are presentation-only and cannot end a match or return the room to the lobby.
- Tests cover reducer/transport/session/phone behaviour, local removal and recursive identity checks. Older reconnect/replay assertions account for disconnect countdown and authoritative disconnect time.
- `uat/slices/C-29-rejoin-seat.mjs`: three-phone Rabakz scenario, both TV sizes, same-context new-page return, fresh-context name claim, carry on, reduced motion and a countdown frame strip.

## Test files

| File | Change |
| --- | --- |
| `packages/platform/src/room/rejoin.test.ts` | Same-browser lobby/running rejoin, stale-tab takeover, hold expiry, crafted claims and local removal guard. |
| `packages/platform/src/room/invariants.test.ts` | New deterministic roster hash after extending match holds; invariants still checked on every generated event. |
| `packages/platform/src/reconnect/rejoin.test.ts` | Disconnected-only name lists, race-safe claims, new-player admission, stale callbacks, recursive public/admission identity walk. |
| `packages/platform/src/reconnect/reconnect.test.ts` | Existing transport return assertions wait through the new countdown and check fresh layout/private output. |
| `packages/platform/src/session/session.test.ts` | Three-second boundary, frozen simulation, multiple missing players, leader-only carry on, countdown/cancellation, manual-pause ownership, screen exclusions, non-zero score preservation, recursive output walk. |
| `packages/platform/src/session/c10r2-replay.test.ts` | Disconnect stamped at its actual elapsed time; recordings still replay identically. |
| `apps/web/src/host.test.ts` | Three-phone shell/roster identity walk and regression guard against waiting events ending a match. |
| `apps/web/src/phone.test.ts` | Name choices and room claim action. |
| `apps/web/src/phone-private.test.ts` | Waiting/countdown messages preserve private game revisions. |
| `apps/web/src/view-channel.test.ts` | Reserved reconnect views preserve action fencing; only room claims bypass private revisions. |
| `apps/web/src/rejoin-panel.dom.test.ts` | New, unrun: 1920/1280 panel bounds, lobby code type size and reduced-motion countdown. |

## Waiting-panel layout for Randy's options

Proposed implementation for integration review, not a recorded design choice:

- Existing centred `.host-pause.screen` with the 55 px TV safe margin and the same `.ka-panel` treatment. One existing panel gradient; no added backdrop, texture, blur or additional surface treatment.
- Waiting panel fills the safe width. Inner padding 55 px. Information and controls split **1.618 : 1**, separated by 34 px. Ordinary vertical gaps are 21 px.
- Information column: waiting heading at 55 px; code uses the lobby's **233 px JetBrains Mono bold** style, preserving two four-character groups. Groups wrap vertically inside the information column with a 21 px gap. The join address follows at existing 34 px body type.
- Countdown replaces the waiting heading with **144 px mono** numbers, keeping the room code and join address visible. Each number lasts one second, enters from the existing 0.95 scale with base 233 ms ease-out, and has no animation under reduced motion.
- Controls column: Paused heading, “Carry on without them”, Effects, Music, Quit to picker, using existing button/slider tokens. TV keyboard focus/navigation uses existing pause controls. A chosen pause retains normal Resume.
- Waiting phones use 34 px headings; the longer carry-on button uses a 233 px width and at least 89 px height so its copy can wrap.
- Phone name selection reuses the existing join-panel golden columns and spacing; names have seat-coloured numbered badges and at least 55 px targets. Existing native scrolling accommodates the list.
- Rendering, overflow, sofa readability and performance remain for the integrator's DOM/UAT review. No visual acceptance or performance claim is made.

## Checks

Commands use `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`, run sequentially and are limited to ten minutes each. No check reached the limit. No verify, UAT, installation or commit was run.

- Requested Vitest command, final full rerun: **215 files passed; 3,522 tests passed, one skipped**, 376.10 s. Includes the Tabao Rush, Peek Poker and Rabakz conformance checks. An earlier full run exposed eight assertions in older reconnect/replay/golden fixtures; those were updated for the new requirements and all pass in the final full run.
- Focused integration rerun: **31 files, 1,027 tests passed**, including room/reconnect/session, host, phone, view channel, session adapter and session links.
- `pnpm exec tsc -b`: **passed**. Supplementary affected-project build (`apps/web`, `packages/platform`, all three games): **passed**. Emitted compiler caches outside dist folders were removed; no source-adjacent JavaScript/declarations/maps remain.
- Requested ESLint command: **passed**, zero warnings.
- `pnpm run lint:design`: **passed**, 555 files scanned.
- `git diff --check`: **passed**.
- DOM/UAT: **not run**, per the brief. No screenshots or visual acceptance are claimed.

## DOM tests for integration

Run `apps/web/src/rejoin-panel.dom.test.ts`, `pause-panel.dom.test.ts`, `phone-coverage.dom.test.ts`, `phone-setup.dom.test.ts`, `phone-timeout.dom.test.ts`, `host-keyboard.dom.test.ts`, `rabakz-phone.dom.test.ts`, `rabakz-host.dom.test.ts` and `host-peek-poker.dom.test.ts`. Then run the C-29 UAT script and inspect all stills and the frame strip before accepting the panel.

## Close-out

Implementation remains uncommitted for integrator review. UAT and DOM tests are intentionally unrun under the brief. No shared trackers, locked design/requirements documents, protocol fields, dependency files or pairing server were changed.

## Requests

- Integrator: run and visually inspect DOM/UAT evidence, present the waiting-panel layout options to Randy, and record the selected layout and any architecture-contract documentation update.

## Round 2 — claim safeguards (PLAT-034, PLAT-011)

- Name claims mint and bind a fresh seat token before sending admission; the previous token is never sent to the claimer and cannot resume without the original browser identity. Running-match holds are unchanged.
- The seat retains its original browser identity, including when the claimer resumes with the rotated token. The original browser can therefore retake a connected claimed seat, closing the claimer. Replaced phones return to the normal join screen with cleared seat, waiting and name-choice state; a subsequent join offers only other disconnected seats.
- Successful name claims publish the exact TV copy, “⟨name⟩ is back on a new phone”, for five seconds. Ordinary same-browser returns do not publish a notice. Leadership follows the existing seat rejoin behaviour. The notice sits above lobby/play/pause, uses the existing panel surface and token-based fade entrance/shorter exit, and respects reduced motion through the shared motion helpers.
- Regression coverage includes token rotation/non-disclosure and old-token refusal, original-browser takeover after a claimer resumes, stale-close fencing, leadership, one notice per claim, same-browser suppression, five-second expiry, the phone's normal join screen, and the recursive identity walk through claim admission.
- The C-29 UAT script now requests `claimed-seat-notice`; its later original-browser return no longer expects a name-choice screen. The existing rejoin-panel DOM fixture includes the notice at both TV sizes. DOM/UAT remain unrun; no still has been generated or visually accepted.

Round 2 checks ran sequentially with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; none reached the ten-minute limit.

- Requested Vitest suite: **215 files passed; 3,526 tests passed, one skipped**, 422.19 s.
- Requested `pnpm exec tsc -b`: **passed**, 6.02 s. Supplementary `pnpm exec tsc -b apps/web packages/platform`: **passed**, 13.56 s on the final run, after fixing an optional-property type error in the new notice state. Removed the emitted root compiler cache and three web compiler caches outside dist folders; no emitted source-adjacent JavaScript/declarations/maps remain.
- Requested ESLint: **passed**, zero warnings, 21.44 s on the final run. The first run found two import-style errors in the additions; both were fixed.
- Requested design lint: **passed**, 556 files scanned, 0.27 s.
- `git diff --check`: **passed**.
- DOM/UAT: **not run**, per the brief. The added notice still is scripted only; no visual acceptance is claimed.

### Round 2 close-out and requests

No commit, verify, UAT, installation or tracker change. Integrator: run `apps/web/src/rejoin-panel.dom.test.ts` (including the notice), `pause-panel.dom.test.ts`, `phone-coverage.dom.test.ts`, `phone-setup.dom.test.ts`, `phone-timeout.dom.test.ts`, `host-keyboard.dom.test.ts`, `rabakz-phone.dom.test.ts`, `rabakz-host.dom.test.ts` and `host-peek-poker.dom.test.ts`; then run C-29 UAT and inspect the notice still and existing evidence.

## Round 3 — removal blocks the browser holding the seat (PLAT-034, PLAT-011)

- Seats retain the original owner's `browserId` and separately record the current name claimer in host-private `claimedBy`. Claimer resumes retain that field; the owner's return clears it.
- Host or leader removal records both browser identities and the current seat token in one block entry. Join, claim and resume enforce that block. The local-seat removal guard remains in place. After owner takeover, removal no longer blocks the former claimer's browser.
- Host snapshots preserve and validate the optional claimer identity for seats and block entries. Recursive outbound admission/public-room and session-output walks reject both the `claimedBy` key and its private value.
- Regressions cover host and leader removal after claim/resume, owner and claimer join/claim refusal, token refusal, owner takeover clearing the field, former claimer admission after removal, and claimer blocking after host snapshot restore.

Round 3 checks ran one at a time with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false` and a ten-minute limit each; none reached the limit.

- Requested Vitest suite: **215 files passed; 3,532 tests passed, one skipped**, 319.04 s on the final run. The initial run passed 214 files and failed one snapshot regression because an absent `claimedBy` was emitted as `undefined` in a block entry; omitting the absent field fixed it.
- Requested `pnpm exec tsc -b`: **passed**. Removed the emitted `node_modules/.cache/tsc/root.tsbuildinfo` outside dist folders; no source-adjacent emitted maps or compiler caches remain.
- Requested ESLint: **passed**, zero warnings.
- Requested design lint: **passed**, 557 files scanned.
- `git diff --check`: **passed**.

### Round 3 close-out and requests

Changes are limited to `packages/platform` and this slice note. No commit, verify, UAT, installation or tracker change. Integrator review remains requested; DOM/UAT evidence remains unrun under the brief.

## Round 4 — claim notice clearance and waiting roster (PLAT-034, PLAT-035)

- The TV claim notice is centred in the lower title-safe band, at the existing 34 px rendered type size at both TV sizes. The pause layout reserves a 144 px token band below its panel. The existing five-second lifetime, shared fade entrance/shorter exit and reduced-motion handling remain in place.
- The reserved public room roster now reaches every phone with a connected boolean, seat and name only. Waiting lists put disconnected seats first with a dashed, token-coloured “Away” chip, followed by connected seats labelled “Here”. Rows use a 55 px minimum height, 13 px internal gaps and 8 px list gaps. Leaders retain removal controls; other phones receive the same list as text rows.
- `rejoin-panel.dom.test.ts` checks notice/pause-panel and notice/text-range intersections at 1920 × 1080 and 1280 × 720, in waiting and countdown states, including a background question heading and title-safe bounds. `phone-coverage.dom.test.ts` checks Away-first ordering, explicit labels and leader/non-leader row controls.
- The live phone integration harness now uses the production reserved-view wrapper. Its outage comparison normalises the roster on both sides and separately checks every remaining phone receives all seats and the correct connected flags.
- UAT pre-tap TV stills are renamed `tv-waiting-before-carry-on-1920` and `tv-waiting-before-carry-on-1280`; `tv-after-carry-on-1920` is captured after the leader taps and `.host-pause` detaches.

### Round 4 checks

All commands use `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`, run one at a time and have a ten-minute limit.

- Requested full Vitest suite, final rerun: **215 files passed; 3,532 tests passed, one skipped**, 502.44 s. The initial run passed 214 files and failed three live phone integration cases; the harness corrections described above resolved them. Focused rerun: **three tests passed**.
- Requested `pnpm exec tsc -b`, final run: **passed**. Removed the emitted `node_modules/.cache/tsc/root.tsbuildinfo` outside dist folders; no other output was reported.
- Requested ESLint, final run: **passed**, zero warnings. An initial nullish-coalescing style error in the waiting-list condition was corrected.
- Requested design lint, final run: **passed**, 557 files scanned.
- `git diff --check`: **passed**. No command reached ten minutes. DOM/UAT remain intentionally unrun.

### Round 4 close-out and requests

Changes are limited to `apps/web`, the C-29 UAT script and this note. No platform change, private identity field, dependency, tracker, commit, verify, UAT or installation. DOM tests remain unrun; no new screenshot or visual acceptance is claimed. Integrator: run `apps/web/src/rejoin-panel.dom.test.ts` and `apps/web/src/phone-coverage.dom.test.ts`, plus `pause-panel.dom.test.ts` and `removal-layout.dom.test.ts` for layout/removal regression coverage; then inspect the C-29 UAT stills.

## Round 5

PLAT-034 / PLAT-011: session identity now uses the host-private admission seat key,
which survives token rotation. Name claims preserve the game player, score and private
state without calling game leave/join. Owner retakes mint a fresh token; former claimers
remain in the seat and removal snapshot so removal blocks their browsers too. Claims
without a hello browserId are refused. Removed claimers bypass the name-list pre-check
and receive the terminal removal refusal.

PLAT-035 / PLAT-023: countdown controls read Resume; leader phones omit the leader-only
quit hint. Disconnect detection uses a connected fast path, a missing-seat bit mask and
only rebuilds waiting copy when that set changes. The grace boundary is strictly greater
than 3000 ms. Pause bottom space is reserved only for waiting or a visible claim notice.
ARCHITECTURE §3 and networking describe these behaviours and reserved messages.

The UAT script now earns points before the drop, checks score and Thinking after a
name claim, and adds the requested waiting, countdown, two-missing-player, 1920 notice,
keyboard carry-on and chosen-pause captures. Token revocation is covered by unit tests.
No UAT, performance run, full verify, installs or commits were run in this round.
M4/M5/S5/S6 remain deferred to Randy's design choice. Shared trackers remain untouched.

### Close-out

Checks and remaining DOM verification are recorded below after the requested runs.

### Requests

Claude should run and visually review the updated UAT and the DOM tests, then perform
any required performance checks and tracker updates. This round does not close the slice.

Round 5 check results (sequential, each bounded to ten minutes; every pnpm invocation
used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`):

- Non-DOM Vitest command with `VITEST_MAX_WORKERS=2`: final run passed, 218 files,
  3560 tests passed and 1 skipped, 400.19 seconds. An earlier incomplete run exposed
  the expected deterministic host-state hash change; the regenerated golden includes
  the new admission and claim metadata, and the final run passed it.
- `pnpm exec tsc -b`: passed, including the final repeat. No new emitted files outside
  dist were present to remove.
- `pnpm exec eslint packages/platform apps/web games uat/slices --max-warnings 0`:
  final run passed after correcting the initial six lint errors.
- `pnpm run lint:design`: passed.

DOM tests still to run (not executed in this round):
`apps/web/src/rejoin-panel.dom.test.ts`, `apps/web/src/phone-coverage.dom.test.ts`,
`apps/web/src/pause-panel.dom.test.ts`, `apps/web/src/host-keyboard.dom.test.ts`.
The first two include updated assertions for the countdown label and leader quit hint.
