# C-12 — Host keyboard

## Goal and requirements

PLAT-024: drive host setup with a keyboard. CTRL-009: one local keyboard or standard gamepad player alongside phones.

## Behaviour and acceptance

- Landing arrows focus Host a room; Enter or Space opens it. Main's heading copy is preserved.
- Setup controls follow DOM order. Arrows move focus; Enter activates; Escape goes back. Focus survives room/link updates and honours hidden, outgoing, inert and disabled controls.
- Unmodified J joins a local keyboard seat only in a ready lobby; L leaves. Standard gamepad Start (button 9) joins only in the lobby. Only the bound pad's Back (button 8) leaves, once per press.
- Both devices share one seat and normal room capacity, naming, colours and leader validation. A refused join never binds a pad. Removal, leave and unplug clear the binding. Quit retains the seat, leadership and binding.
- Arrows/WASD drive the stick; Space/E/Q/R and Z/X map to face/shoulder actions allowed by the current layout and audience. Browser shortcuts and unrelated gameplay keys remain uncaptured. Blur and hidden-tab transitions clear held keys.
- Setup uses the connected leader's validated handlers. The TV's own results actions call returnToPicker, playAgain and continueResults directly, including with every phone disconnected (D-156).
- Local peers use the authenticated room join and session-links input receiver. Private views are acknowledged and discarded; no private information is projected on the TV. Local seats are omitted from reconnect snapshots.

## Earlier rounds

Rounds 1–2 introduced the local input adapter, stable keyboard listener, authoritative phase reads, pause focus and visible-control filtering. Round 3 added focus recovery through repeated room updates and a real HostLobby browser regression. Round 4 supersedes its persistent action bar with D-156 screen controls.

## Round 4

PLAT-024 / CTRL-009: removed `.host-actions` and the global bottom-padding override. Lobby and picker have screen controls and a D-130-style hint inside the safe area. Team cards are keyboard-focusable move targets while retaining the existing grid; the existing footer carries the setup hint. Results retain their existing D-130 layout and hint, with focusable action hints and direct TV callbacks. Landing retains only its keyboard focus behaviour change relative to main.

Escape opens a centred K1-compatible panel with Paused, Resume and Quit to picker, token typography/spacing and 89 px targets. Resume receives focus. Entrance/exit use D-156's 200/160 ms timings, token easing and 0.95 scale, with immediate state changes under reduced motion. Nothing keyboard-related is drawn during play.

`gamepad-poll.ts` consumes reusable button history and output buffers. Press edges drive actions; an unbound pad can only request a lobby join. HostLobby commits the binding only after joinLocal returns success and clears it on leave/removal/unplug. The local input adapter reuses its frame and history without per-tick mapping arrays; idle polling skips unseated/no-pad ticks. Picker headings distinguish keyboard and controller origins. Retry/new-room autofocus and pairing readiness checks are restored. The DOM build uses `codeSplitting: false`, which the installed types accept.

Snapshot fallback chooses the lowest connected seat. The brief names an exported platform election helper, but this checkout's `packages/platform/src/room/room.ts` implements `elect` privately with an inline minimum at lines 121–129; no importable helper exists. The host mirrors that fallback without changing the platform's public contract.

Automated coverage: `host-keyboard.test.ts` covers direct results actions with disconnected phones, modifiers, game-code capture, hidden-tab clearing and focus recovery; `gamepad-poll.test.ts` covers held Back, another pad's Back, refused/unbound joins, unplug and lobby-only joins; `local-player.test.ts` covers frame/history identity. The round 4 DOM fixture covered focus through 24 updates; round 5 replaces its removed picker controls with key navigation and results-action coverage.

UAT script: `uat/slices/C-12-host-keyboard.mjs` retains keyboard start and two-phone seating flows, adds named pause/team/results/no-leader/settled-heading shots (06–10), and asserts safe-area/seat separation. Eight-phone team evidence uses `--phones 8`.

## Round 5

PLAT-024 / CTRL-009, D-159: Quit now only sends the validated quit command; neither a successful nor a refused Quit removes the local seat or gamepad binding. Starting a pad in the lobby accepts the existing keyboard seat without adding another player. Bound pad Start pauses play; up/down/A use the same focus and activation handling as keyboard input in the pause panel.

Removed the added lobby button and picker control row, and restored main's lobby/picker grid declarations exactly. Lobby Enter requests the picker (the host rejects it with zero players); picker Left/Right, Enter and Escape send previous/next, select/start and back. Main has no focusable Teams toggle in the picker, so T toggles Teams on the start screen. Team setup retains its existing focusable controls. Focused controls own Enter/Space, including both results hints and pad A; screen-wide results Enter applies only with no focusable element focused.

Hints use 34 px type. Since the approved board 3 content occupies the bottom safe edge, hints move into free header space rather than moving the content: lobby between the status chip and count, picker at the right below the heading, with the pad join hint above the lobby line. The lobby changes J/Start to L after either device joins. The requested 21 px content separation still needs browser visual review, including pad-connected and long-heading cases.

The UAT script retains the named captures, replaces lobby/picker button steps with keys, adds `11-host-lobby-hint-joined.jpg` and `12-host-quit-keeps-seat.jpg`, checks seat 1/name/leadership after Quit and Back, and asserts focused Back to game picker + Enter returns to the picker. Named shots are renamed once and the harness manifest is updated instead of copying duplicate JPEGs. Existing round 4 evidence is untouched; the next authorised run retakes `02-host-lobby-focus.jpg` with hints and seats. No new screenshots were captured in this round.

Another owner: Rabakz's eight-player team final screen has an Enter: Continue hint overlapping the last ranking row, visible in `uat/evidence/C-12-host-keyboard/round4/16-host-host-before-results-enter.jpg`. This round does not modify that game screen.

## Round 6

PLAT-024 / CTRL-009, D-162: restored the team footer's phone sentence in its status region, with separate keyboard hints beside it. Picker and start hints now name their own actions, with T only for games supporting teams. Empty lobbies omit Enter; connected pads show exactly “Start on a game pad: join”. Lobby hints and the player count reserve their actual widths in a wrapping header. Start headings occupy their own row above hints and count, with token gaps; results focus rings use ink.

Coverage adds empty/seated/pad lobby copy, picker/start/team hints, the phone status sentence and authoritative room/picker transitions for focused Back and Play again. UAT retains every named shot, adds 13-host-lobby-pad-hint using a mocked connected standard pad through navigator.getGamepads (the production polling state), and 14-host-picker-long-name with phone leader Abcdefghijkl. Both run the safety check, now including the pad hint. UAT was not run, as instructed; no new screenshots or real game-pad evidence are claimed.

PLAT-024's remaining implementation items are closed by this round, pending the integrator's browser and visual review. CTRL-009 stays in progress: held-key movement awaits T-07; there is no real game-pad evidence; the local seat cannot play phone-private games, noted for OPEN-QUESTIONS by the integrator (shared documents remain untouched).

### Round 6 validation (moved from evidence REPORT.md)

Only the four authorised validation commands were run. No UAT or screenshots were run/captured. No real game pad was tested. The UAT script simulates a connected standard pad through navigator.getGamepads and the normal production polling state for shot 13; shot 14 uses a 12-character phone leader.

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web packages/platform packages/controller-kit`: final run 1,537 passed, one skipped, five failed (84 files passed, five failed). Four failures are Chromium launch denial: Overlap.dom, PeekPoker.dom, host-keyboard.dom and team-polish. Chromium reports MachPortRendezvousServer bootstrap_check_in Permission denied (1100). DOM fixtures bundle successfully but browser assertions cannot execute here. The existing conformance-attacks five-second timeout occurred in the first and final runs; the middle run passed it and all other non-browser tests (1,538 passed, one skipped, only four browser launch failures). Loads before the runs: 4.68, 7.47 and 7.74.
- `pnpm exec tsc -b tsconfig.build.json`: passed (exit 0). Loads before the initial and final commands: 4.66 and 7.44.
- `pnpm exec eslint apps/web packages/platform packages/controller-kit uat/slices --max-warnings 0`: passed after adding fixture comments to empty test ports.
- `pnpm run lint:design`: passed, 400 files scanned.

The results DOM fixture additionally checks actual createHost room/picker state after focused Back and Play again; the non-browser state tests passed. Integrator must run browser coverage and UAT outside this sandbox and inspect all screenshots, including the connected-pad and long-heading safety checks. PLAT-024 remaining implementation items are closed; CTRL-009 remains in progress for T-07 held-key movement, real game-pad evidence and phone-private-game accessibility (for OPEN-QUESTIONS).


## Round 7

PLAT-024 / CTRL-009, D-162: the start heading now occupies explicit grid row 1 across both columns. Its incoming layer uses intrinsic height instead of inheriting the fixed 100% copy band, so every wrapped line reserves space above row 2's hint and count. Removed the canvas font fitter: the 89 px heading wraps naturally at the available full-row width rather than shrinking against the first column. The 34 px row/column gaps leave more than 21 physical pixels at both 1920 × 1080 and the uniformly scaled 1280 × 720 board.

The lobby hint found by the browser test was an outgoing screen during the 377 ms crossfade, read after only 250 ms. FadeLayer already marks that screen `.outgoing`, `aria-hidden` and `inert`. The fixture now waits for an active picker hint and excludes outgoing/hidden/inert ancestors when reading picker/start hints. Added a real-box assertion at 1280 × 720 alongside the existing 1920 × 1080 check. New pure tests read the production CSS declarations and tokens to check intrinsic wrapped heading rows, explicit grid placement and heading/hint/count box separation at both scales; they model grid geometry, not browser font shaping.

Moved the Round 6 report text above and deleted the round6 folder (including its ignored log), leaving the integrator free to create that evidence run. No UAT or screenshots were run in Round 7. Browser/visual confirmation remains with the integrator.

Validation: the authorised scoped Vitest command passes 91 pure tests; its one browser test cannot launch Chromium here (MachPortRendezvousServer permission denied 1100). The fixture bundles successfully. TypeScript build, scoped ESLint and design lint pass (401 files scanned). Test/typecheck starts used load readings below 8 (7.37, 5.22, 4.48, 3.75 and 3.60). No commits, dependencies or shared trackers changed.

## Round 8

PLAT-024, D-162: consolidated picker/start header CSS into one layout, removing conflicting early rules and start-only overrides. The full-width heading/copy band grows intrinsically for wrapped 89 px headings. The choosing/error subtitle stays below the heading inside that band. Hints occupy column 1 of row 2 and the count column 2. A 55 px token row gap allows for glyph overhang at the scaled 1280 × 720 size; the column gap remains 34 px. Lobby rules are unchanged.

The crossfade band's minimum height and the header's minimum height now share `--picker-copy-band` arithmetic; the header adds the same row gap and the lower row's body line height. Pure CSS tests cover common picker/start placement, intrinsic rows, band arithmetic and absence of conflicting row-1 count/nowrap declarations. Browser assertions and UAT thresholds are unchanged.

Validation (only the authorised commands; all starts below load 8):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/host-keyboard apps/web/src/picker apps/web/src/host.test.ts`: final run 92 passed, one failed solely at Chromium launch (`MachPortRendezvousServer`, permission denied 1100); fixture bundle succeeds. Initial run exposed the pure CSS helper treating comments as selector text; stripping comments corrected that helper, and all three layout tests pass on the final run. Loads: 7.70 initial, 7.67 final.
- `pnpm exec tsc -b tsconfig.build.json`: passed, load 7.24.
- `pnpm exec eslint apps/web uat/slices/C-12-host-keyboard.mjs --max-warnings 0`: passed, load 6.19.
- `pnpm run lint:design`: passed, 404 files scanned, load 7.82.

No UAT, screenshots, dependencies or commits were made. Integrator browser/UAT visual review remains required; the actual rendered safety checks are not claimed as passing in this sandbox.

## Round 9

PLAT-024 / CTRL-009, D-165 supersedes the round 7–8 header layout and round 4 pause timings.

1. HostLobby leaves results Escape and Enter untouched. The DOM regression keeps HostLobby mounted alongside Results, checks authoritative picker/start transitions for Escape and Enter, and feeds pad B through `gamepadPoll` to Escape. Pad keys dispatch to the focused element so Results' own focused-action handlers also run.
2. Restored main's 89/55 px `PickerHeading` fitter and fixed 4A copy-band arithmetic. The heading stays left; a right column holds count then hints, with body line height shared by both. The 34 px column gap reserves at least 21 physical pixels at 720p. Scoped CSS coverage checks the band and stage origin; DOM and UAT measure drawn heading separation from hints/count.
3. Lobby pad and keyboard hints share one non-wrapping line in a fixed 89 px header. When phones are seated and an unseated pad adds the third hint, the title uses the 55 px token to keep that line inside the count. UAT checks the join panel and all seat cards against the safe margin, with and without the pad, compares seat tops across connection, and adds 720p lobby captures.
4. Pause entrance uses `duration.base`; exit uses `exitDuration('base')` and therefore EXIT_FACTOR. Reduced motion keeps immediate state changes without animation.
5. Gamepad polling starts on a connection event or an already-present pad at mount and stops on the last disconnect. Predicates are hoisted and the connected state is published only on changes. Unit coverage checks idle, connect, second pad, last disconnect, cleanup and mount with an existing pad. Keyboard input sampling remains separate and does not query gamepads.
6. Playing keys enter the held set and prevent browser defaults only when a local seat exists; unit coverage compares seated and unseated input.
7. L acts only in lobby/picker/start, excluding team setup, loading, play, pause and results. Unit coverage checks the phase gate; Quit still retains the seat.
8. Team footer uses a shared baseline for the phone sentence and keyboard hints; CSS coverage checks baseline alignment.
9. UAT uses the widest 12-character phone name, `WWWWWWWWWWWW`, adds eight-player start captures at 1080p/720p and a 720p picker capture, checks the heading-to-hint/count separation, exercises results Enter then Escape on a second pass, and removes the keyboard-stick strip. No held-key movement evidence is claimed.

Validation results follow in Close-out. No UAT was run or screenshots captured in round 9.

### Round 9 close-out (historical)

Round 9 implementation and validation were completed; subsequent review corrections are recorded in rounds 10–11. Only the four authorised validation commands were run:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/host-keyboard apps/web/src/picker apps/web/src/host.test.ts apps/web/src/gamepad-poll apps/web/src/local-player`: 98 passed; one browser test failed at Chromium launch with `MachPortRendezvousServer` permission denied (1100). The fixture bundle succeeds; browser assertions remain unexecuted. The initial run also caught a misplaced nowrap edit, corrected before the final run.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/web uat/slices/C-12-host-keyboard.mjs --max-warnings 0`: passed after correcting three lint findings in the poll helper/disconnection fixture.
- `pnpm run lint:design`: passed, 404 files scanned.

Test/typecheck starts used one-minute loads below 8 (Vitest 7.90 / 6.99 / 6.19; TypeScript 7.15 / 7.23 / 6.07 / 6.89). No UAT, new screenshots, commits, dependencies, shared trackers or lockfile changes. Existing untracked round 8 evidence is untouched.

At the round 9 handoff, PLAT-024 awaited browser/UAT review; the integrator subsequently performed that review and supplied the corrections below. CTRL-009’s real-pad, T-07 held-key and private-phone-view gaps carry forward to Round 11.

### Round 9 requests (superseded)

The integrator ran browser/UAT review and supplied the round 10 evidence and fixes below. Round 9 has no separate implementation request remaining; current integration requests are in Round 11. CTRL-009 still needs real game-pad and T-07 held-key evidence, and tracking of local seats with private phone views.

## Round 10

PLAT-024, D-162 / D-165: changed the picker/start header side column's gap from the 8 px token to `--ka-space-21`, keeping the hints right-aligned under the count. Count + gap + hint occupies 109.4 px of main's existing 141.2 px copy band. The heading is inset down by `--ka-space-13` within its existing fixed row so its drawn text clears the top safe margin. The 89/55 px heading fitter is unchanged. The 4A copy-band expression, overlap height and crossfade row arithmetic are unchanged from main; the stage moves **0 px**, retaining y = 230.2 px at 1080p (153.47 px at 720p).

The DOM fixture now renders picker and start at both 1920 × 1080 and 1280 × 720, with the start heading “WWWWWWWWWWWW starts on their phone”. It measures the heading with a text Range, and count/hint boxes as `checkSafe` does. Assertions cover scaled 55 px safe margins, count-to-hint and heading-to-count/hint gaps of at least 21 × scale, right alignment and the unchanged stage origin. The UAT safety check is untouched.

### Round 10 close-out

Only the four authorised validation commands were run, with one-minute loads below 8 before each start:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/host-keyboard apps/web/src/picker apps/web/src/host.test.ts`: 91 passed; one DOM test failed at Chromium launch (`MachPortRendezvousServer`, permission denied 1100). Fixture bundling succeeds; browser geometry assertions remain unexecuted in this sandbox. Load: 5.12.
- `pnpm exec tsc -b tsconfig.build.json`: passed; initial load 5.58, final load 6.12.
- `pnpm exec eslint apps/web uat/slices/C-12-host-keyboard.mjs --max-warnings 0`: initial run found test typing/non-null-assertion lint errors; corrected in the fixture. Final run passed. Loads: 5.42 / 6.22.
- `pnpm run lint:design`: passed, 404 files scanned. Load: 6.48.

No UAT, screenshots, dependencies, commits or shared-document edits.

### Round 10 requests

Integrator: run the scoped DOM test outside the sandbox and repeat the eight-phone picker/start safety checks at both viewport sizes; inspect the rendered headings and hints before closing PLAT-024. Browser geometry is not claimed as verified here.

### Integrator fix after Round 10

Outside the sandbox the picker heading's drawn text box started at y = 52 at 1080p: the 89 px display face at a 1.0 line height overhangs its line box by about 16 px. The heading now sits 21 px (not 13 px) below the header top, so its text box starts at 60, inside the 55 px margin; the game stage does not move.

### Integrator fix after the round 10 UAT

The heading moved alone overlapped the subtitle; the heading block (heading and subtitle) now moves 21 px as one, and heading and subtitle are 21 px apart (was 8), because the 89 px face's descent reached the subtitle line. The copy band grows 13 px to match, so the 4A crossfade still lines up, and the stage starts at about 243 px at 1080p instead of main's 230 (D-165 addendum). The UAT safety check now also fails on any heading/subtitle overlap.

## Round 11

PLAT-024 / CTRL-009, D-162 / D-165: replaced the heading block’s relative top offset with 21 px padding inside both crossfade bands and included that inset in the copy band. The band is now 175.2 px; stage top is 264.2 px at 1080p and 176.13 px at 720p (34 px below main in design coordinates). Heading/subtitle row gap remains 21 px. CSS and DOM regressions use the new arithmetic; DOM coverage checks equal outgoing/incoming band heights and drawn subtitle clearance from the stage at both viewport sizes. UAT checks subtitle clearance too.

The keyboard timer samples only unbound input and the pad poll samples only bound input through a shared source gate. Unit coverage checks one received input per frame with an unbound connected pad, a bound pad, and after unbinding. UAT restores ArrowRight before shot 08 and adds shots 23/24 plus checkSafe for phones seated with a mocked pad and no local keyboard seat at 1080p/720p. No UAT was run and these new shots have not been captured.

Round 10’s existing images were inspected in a contact sheet and every report “What it shows” cell filled; “Looked at by” remains for the integrator.

### Round 11 close-out

Only the four authorised validation commands were run:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/host-keyboard apps/web/src/picker apps/web/src/host.test.ts apps/web/src/gamepad-poll apps/web/src/local-player`: 99 passed; one DOM test failed at Chromium launch with MachPortRendezvousServer permission denied (1100). Fixture bundle succeeded; browser assertions did not execute. One-minute load before start: 7.35.
- `pnpm exec tsc -b tsconfig.build.json`: passed. One-minute load before start: 7.30.
- `pnpm exec eslint apps/web uat/slices/C-12-host-keyboard.mjs --max-warnings 0`: passed after fixing a test dot-notation finding.
- `pnpm run lint:design`: passed, 404 files scanned.

No UAT, new screenshots, dependency changes, commits or shared-document edits. Browser geometry and the new crowded-state evidence await integrator execution.

### Round 11 requests

Integrator: update the D-165 addendum with the 175.2 px copy band / 264.2 px stage top and record the crowded lobby title shrink to the 55 px token. Run browser coverage and UAT outside the sandbox, inspect all new shots and subtitle spacing, then complete independent review and tracking. PLAT-024 and CTRL-009 remain in progress; real pad, T-07 held movement and private-phone-view limitations remain as previously recorded.
