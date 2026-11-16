# C-08 — Phone join page

## Goal

A phone opens `/play`, joins a room by code and nickname, and returns to its seat after sleep or reload.

## Requirements and acceptance

PLAT-002, PLAT-003, PLAT-004 and PERF-021 are the issue's requirements. The phone integration also exercises PLAT-005, PLAT-006 (leader identity only), PLAT-007, PLAT-009, PLAT-010 (host quality label), CTRL-004 (shell viewport and wake lock only), CTRL-005 (touch sizes only), CTRL-006 (press feedback), CTRL-008 and PERF-020. Gameplay controls, selection and sessions belong to later issues. There is no CTRL-010 row in the current PRD.

- QR `?code=` prefills the code; manual codes accept case, whitespace and hyphen separators. Only the server's eight-character alphabet is valid; ambiguous characters are not substituted.
- The shared nickname validator warns about 1–12 graphemes, forbidden content and the 48-code-point safety cap. The host remains authoritative; its refusals appear in plain words.
- Eight players receive a seat, colour, accepted name and leader indicator. The ninth sees “This room is full”. Duplicate names are accepted with the room's suffix, with a “Name taken” notice; blocked names show a replacement notice.
- Reload, background return and host restoration use the existing C-05 seat store and reconnect driver. No seat secret enters the view, logs or URLs.
- Only the signed-gone probe marks an HTTP failure as a missing room. Bare 404, 5xx and network failures remain unreachable. Socket attempts are gated at 1, 2, 4, 8, 16, 30 seconds; Retry-After is capped at 30 s and survives online/wake. C-05 retains ownership of peer reconnection, deadlines and seat holds; there is no parallel network retry loop.
- Every state has a DOM-free projection and dev demo. Production eliminates the demo module. All visible values use UI tokens.
- Controller and host share the entry. The budget tool reports each separately and enforces both the 300,000-byte controller and existing 1,500,000-byte host gzip limits. Tests exercise the controller boundary and an over-budget bundle that still fits the host budget.

## Implementation

`phone.ts` owns the DOM-free shell, public projection and a dial gate; `phone-browser.ts` binds WebRTC, signalling, signed probes and lifecycle events; `phone-route.tsx` and `phone.css` render the board's joining/lobby composition. `phone.ts` reuses `join-link.ts` normalisation, then validates the actual eight-character generated alphabet. The shared host helper retains its tested legacy 4–8-character wire compatibility. `Overlap` gains an opt-in phone fade using UI entrance/exit helpers; existing host masks remain its default, and outgoing content is inert.

Round 1 changes packages/netcode/src/pairing.ts to recognise phone joined acknowledgements. packages/platform/src/reconnect/phone.ts ignores signalling presence while seated, retries on actual channel loss, and includes the shell admission delay in the negotiation deadline. `browser.ts` exports its existing RTC adapter for reuse.

The local launcher is `tools/dev.mjs`, defaults to web 5150 / signal 5151, honours KAKI_PORT_WEB / KAKI_PORT_SIGNAL, creates a private temporary admission-secret file, supplies the matching allowed web origin and reachable signal URL, prints host/phone/pairing URLs and terminates both process groups on exit. Set KAKI_HOST to the laptop's LAN address for phone access. Wrangler's installed CLI source was inspected for `--env-file`; the launcher was syntax/type/lint checked, never started.

## Board readings

1. Landscape keeps the board's introductory/seat column and main column at 1 : 1.618, with 34 px joining gap and 21 px lobby gap. Portrait stacks those same contents instead of blocking joining behind “Turn your phone sideways”. The user explicitly requires portrait usability.
2. The four sample code boxes become one editable eight-character monospace field, 68 px high. This fits the actual C-01 alphabet and code length, works with paste and keeps one accessible label. It does not guess substitutions for excluded look-alike characters.
3. D-056's 13 px labels/help replace the board's old 15 px labels. Inputs/body use 21 px, the code 34 px, and landscape headings 55 px. Portrait headings use 34 px. Names wrap without truncation or smaller type.
4. The connection word is 21 px with an inline SVG check or warning triangle; disconnected is also bold and underlined. Keep the board's 55 px identity badge and 110 px main seat badge, dark numeral, no white ring, and explicit “Seat N”; the seat and connection label make colour redundant. The room's boolean leader flag becomes “You’re the leader”. No game picker/controller is added for the leader in this slice.
5. Round 3 supersedes the original “Watch the TV.” lobby reading: the phone's room message contains a leader boolean but no other player's name. Keep “You’re in.”, Change name and Leave. D-095 supersedes the original shared form: Change name has its own name-only view, Save name and Cancel; it only sends set-name.
6. The joining composition has a panel surface with 21 px token padding, covering both its heading and form. Fields/buttons use the token panel gradient instead of the board's flat white field. The page retains Marble table terrazzo; each panel has its single token treatment. The shared host font stacks are reused, including their system fallbacks.
7. Joining/lobby and status changes crossfade without blur using the UI slow entrance (ease-out) and its 20% shorter exit. Seat identity changes crossfade within the fixed panel; successful seating pulses the badge. Reduced-motion tokens/helpers remove movement. Press scale is immediate; supported haptics use the existing fast-duration token, with no new duration token. Outgoing forms are inert.
8. The shell can scroll while the keyboard needs space; keyboard-closed landscape keeps the two-column composition within the viewport; safe-area padding stays at least 21 px. VisualViewport resize constrains the page height and reveals the focused name/button row. This is a joining/lobby accommodation; gameplay's no-scroll controller is outside C-08. Wake lock is requested while connected and reacquired on foreground where supported.
9. A duplicate name is a successful lobby state with the room-assigned suffix and a notice, rather than an invented refusal. A missing room on a first join says “Room not found”; the same signed response for a stored seat says “This room has closed”. Error screens retain a real assigned seat; without a seat they show only the message and applicable action, with no empty badge. Retryable server failures have automatic retry and no button that can hammer the server. Replaced tabs direct the player to the winning tab without reconnecting.

## Demo URLs (dev only)

Every state URL is listed below. Use the browser viewport for orientation (390×844 portrait, 844×390 landscape); no orient flag is needed. Optional `&names=long`, `&leader=1` and `&slow=4` exercise names, leadership and motion. Production ignores these flags; demo actions are photographic controls only.

- `/play?demo=entry`
- `/play?demo=rename`
- `/play?demo=invalid-code`
- `/play?demo=blank`
- `/play?demo=too-long`
- `/play?demo=bad-characters`
- `/play?demo=connecting`
- `/play?demo=lobby`
- `/play?demo=name-taken`
- `/play?demo=name-replaced`
- `/play?demo=room-full`
- `/play?demo=room-not-found`
- `/play?demo=room-gone`
- `/play?demo=unreachable`
- `/play?demo=host-disconnected`
- `/play?demo=replaced`
- `/play?demo=hold-over`
- `/play?demo=seat-expired`
- `/play?demo=waiting-for-lobby`
- `/play?demo=out-of-date`
- `/play?demo=cannot-connect`
- `/play?demo=left`
- `/play?demo=lobby&names=long&leader=1`
- `/play?demo=rename&names=long`
- `/play?demo=host-disconnected&slow=4`
- `/host?demo=8&names=long`

## States and copy

| State | Heading | Detail | Action |
|---|---|---|---|
| entry | Join the room on the TV | Enter the room code and your name. | Join |
| invalid-code | Check the room code | Use the 8-character code on the TV. | Join |
| blank | Enter your name | Use 1 to 12 visible characters. | Join |
| too-long | Your name is too long | Use 1 to 12 visible characters. | Join |
| bad-characters | Check your name | Remove hidden characters or unsupported marks. | Join |
| connecting | Joining the room… | Connecting to the host. | — |
| lobby | You’re in. | Waiting for the leader to pick a game. | Change name / Leave |
| name-taken | Name taken | The room has added a number to your name. | Change name / Leave |
| name-replaced | Your name was changed | The room has given you a neutral name. | Change name / Leave |
| room-full | This room is full | All 8 seats are taken. Try another room. | Join another room |
| room-not-found | Room not found | Check the code on the TV and try again. | Join another room |
| room-gone | This room has closed | Ask the host for a new room code. | Join another room |
| unreachable | Can't reach the room. We'll keep trying. | — | Automatic retry |
| host-disconnected | Host disconnected | We’ll rejoin your seat when the host returns. | Automatic rejoin |
| replaced | You’re connected in another tab | Use that tab to stay in your seat. | — |
| hold-over | Your seat hold has ended | We’re still trying. You can also join again. | Join again / Leave |
| seat-expired | Your seat has expired | Join again to take a new seat. | Join again |
| waiting-for-lobby | Waiting for the lobby | You can join when the current game ends. | Leave (automatic join continues) |
| out-of-date | This page needs updating | Reload to use the current version. | Reload |
| cannot-connect | Cannot connect to this room | Check the code and try again. | Join another room |
| left | You’ve left the room | Enter a code to join a room. | Join |

Entry/validation/left states are shown in the editable form, with errors as inline feedback. Successful name notices keep the lobby's seat and identity.

## UAT script

Integrator runs browser UAT. This repair inspected all ten supplied round1 screenshots; fresh browser captures remain with the integrator.

1. Run pnpm dev using the integrator's root dev script. Open /host and scan its QR on a real phone. Enter a nickname; photograph both host and phone and measure scan-to-seat (≤5 s) and phone interactivity (≤2 s).
2. Repeat with a typed lower-case, spaced/hyphenated code; try 7 characters and excluded look-alike characters. Try blank, 13-grapheme, control-character, twelve-grapheme CJK and emoji names. Photograph each refusal.
3. Join two phones with the same name and one blocked name; check notices and host-accepted names. Change a seated name and leave.
4. Seat eight phones, check every number/colour and host quality label; a ninth sees full. Check leader changes after the first phone leaves.
5. Reload a phone; background/foreground it within two minutes; verify original seat/name/colour. Reload the host and check Host disconnected → same seats and lobby. Stop only signalling with data channels connected; check the host lobby and phones stay usable, restart and recover. Check signed missing room versus a bare proxy 404 and 503, and Retry-After pacing in network tools. Never expose stored secrets in evidence.
6. Photograph portrait 390×844 and landscape 844×390, long names, keyboard open on each field, notched safe areas and a short viewport. All fields/buttons must be reachable at ≥55 px, with no focus zoom. Check the wake lock if supported.
7. Photograph every dev state, including long names/leader; capture join/lobby, seat and status transitions as frame strips at normal speed and slow=4. Check reduced motion, instant press feedback and keyboard focus (no outgoing hidden form can receive focus).
8. Check a second tab using the same stored seat replaces the first, which stops retrying. Check past-hold rejoin, out-of-date reload and production ignoring demo parameters.

## Round 1 repair

- Live names were already correct in host.ts's publish and lobbyView. The host Seat measured the new nickname in local state while Overlap cached the incoming vnode containing its previous measured text. With no subsequent name change, that cached text stayed “Seat N”. Nickname now owns its measurement inside the transition, so its own state update reaches the rendered text. The full-card model assertion checks the first occupied publication and a rename; browser confirmation remains required because the model test cannot exercise Preact transitions.
- Pairing's roomOpened flag handled created but omitted joined. With phone-browser's externalRetry enabled, losing an acknowledged phone socket therefore ran the initial-admission probe; its unreachable feedback changed the phone view, then socket-unavailable closed the healthy peer. Recognising joined routes the failure to the existing socket-closed/connected-peer guard. This reproduces without Vite or a browser; Vite reload is not required to cause it.
- Phone reconnect treats signalling host-presence as advisory while in its seat and retries when the channel actually closes. The optional attemptDelayMs hook adds the shell gate wait to the 15 s negotiation deadline, preventing that deadline from repeatedly cancelling the 30 s outage retry wait. No host seat-hold or room logic changed: held seats still arise only from dropped peers.
- The production-model fixture now uses externalRetry and unreachable feedback just like the browser. It checks the entire first occupied card, rename, eight live channels for two minutes after signalling goes away (including host-absent before phone sockets close), delivery of rename during the outage, one channel loss holding only seat 1, and socket attempts at +250 ms then intervals of 1, 2, 4, 8, 16 and 30 s. Round 2 supersedes the initial 250 ms: D-095 requires channel-loss retries at 1 s doubling to 30 s. Leader reassignment after its normal grace is expected.
- Host “Joining” was removed: an occupied non-held seat says “Connected” without an icon until Good/Weak/Relayed is measured. Entry and error presentations follow the revised board readings above. The contrast test checks heading and small helper text against both gradient endpoints and every panel treatment paint at ≥4.5:1.

For an isolated server outage run **KAKI_DEV_KEEP=1 pnpm dev**. The launcher prints labelled Pairing and Web process-group PIDs. Stop the Pairing group with **/bin/kill -TERM -- -PID** (substitute its printed numeric PID), leaving Vite alive; Ctrl-C on the launcher still terminates both groups. Restart the launcher after that test for a fresh paired stack. Without KAKI_DEV_KEEP the original stop-both-on-child-exit behaviour remains.

Round 1 launcher verification: mocked pnpm children confirm Pairing can stop while Web survives, and launcher SIGINT still removes both groups; see uat/evidence/C-08-join-page/LAUNCHER-round1.txt. The phone unit test now models host loss by closing its channel, and explicitly proves absent/present signalling alone retains the lobby.

## Round 2 repair — D-095

D-095 was read in full from the lead worktree. This pass implements its phone rulings (a–g); host handling of definitive signalling refusals remains C-10/C-15.

1. Rename is a separate name-only form, prefilled/focused, with Save name and Cancel. It retains the accepted name on cancellation and plain host refusal copy. The join handler returns immediately throughout renaming; saveName has no call to begin, edit, rejoin or leave. Probe B is ported into phone unit and production-transport fixture tests (including an adversarial different code).
2. Open data channels ignore room-not-found, room-expired and not-allowed in the transport and reconnect driver. Tests cover before seating, after seating, closed-channel terminal handling, stored identity and unchanged phone presentation through fixture sockets. Probe A now proves unattended return to the same seat/name before any reload.
3. Phone retries start at 1 s, double to 30 s, and retain the 15 s negotiation deadline after the shell wait. Retry-After is bounded to 30 s; negative, invalid, past-date and timer-overflow values are exercised. The existing host parser keeps its uncapped behaviour.
4. A pasted URL supplies its code query. The phone reads the alphabet from the signal generator's existing source through Vite's raw import, avoiding a copied alphabet or edits to another package's contract. A future shared protocol export can replace this source dependency.
5. Correct overscroll-behavior and input specificity remove the three important overrides. The production budget scan rejects British-spelled CSS properties while permitting custom property names and values.
6. Plain room-unreachable copy, Leave while waiting/held, and neutral Watch the TV copy cover accepted mid-game joins.
7. An unmeasured host seat says Connected with no SVG. Measured Good gets its tick. The dead branch is removed.
8. Host connection rows have a non-shrinking fixed slot and an additional 5 px margin beyond the existing 5 px gap. Fresh 720p visual confirmation is required.
9. Launcher binds the exact requested address, with localhost mapped to loopback. Explicit wildcard binding advertises an available LAN IPv4 address for phone/QR/signalling URLs. Mocked lifecycle tests cover localhost, 127.0.0.1, a LAN address and 0.0.0.0, keep-on-pairing-exit and full cleanup on SIGINT.
10. Platform unit tests cover the open-channel/inSeat guard and attemptDelayMs. Budget tests cover phone demo markers and an incompressible public file exceeding the unchanged 300 KB controller budget.
11. One persistent polite live region sits outside Overlap. The header reserves its connection slot and truncates only the header name; the card contains the full accepted name.
12. Short landscape keeps the board's two columns and token spacing, compacting headings, gaps and badges. The sandbox rejected local listen (EPERM) and Chromium launch (SIGABRT); fresh 844×390 no-scroll and 720p confirmation remain with the integrator. No screenshot pass is claimed.
13. REPORT's agent section is rewritten for current evidence and coverage; the integrator section is preserved verbatim.

## Close-out

Round 1 final verification: **VITEST_MAX_WORKERS=1 pnpm verify passed**, 127 files, **2,924 passed / 1 existing skipped**, 468.33 s. Typecheck, ESLint, design lint (252 files, no new exemptions), production build, both budgets and trace check passed. Shared host/controller entry: **127,926 bytes raw / 44,799 bytes gzip**, +406 raw / +102 gzip from the initial build. The first two-worker run hit the unchanged 120 s recipe conformance timeout and the old signalling-as-host-loss phone expectation; that phone test now explicitly checks signalling alone preserves the lobby before driving real channel loss. No checks or limits were weakened. See VERIFY.txt and MODEL-round1.txt under the evidence folder; 54 focused phone tests passed. Launcher syntax and mocked lifecycle checks, and git diff --check, passed. At that round, fresh browser rendering/transition UAT remained with the integrator; the committed integrator section in REPORT now records those captures.

Initial build, before round 1: `VITEST_MAX_WORKERS=2 pnpm verify` passed: 127 test files; 2,923 tests passed and 1 existing test skipped; typecheck, ESLint, design lint (252 files), production build, both transfer budgets and trace check all passed. The full test run took 252.12 s. The latest focused web and budget run passed 157 tests across 13 files; the phone-specific tests cover 59 cases across three files. No new design-lint exemptions were added.

Historical initial shared entry (superseded by round 2 below): host **127,520 bytes raw / 44,697 bytes gzip** against 1,500,000; controller **127,520 bytes raw / 44,697 bytes gzip** against 300,000. The deploy total is identical. Production output was scanned for phone/host demo markers and none were present. `node --check tools/dev.mjs` and `git diff --check` passed. The verification summary/tail is saved in `uat/evidence/C-08-join-page/VERIFY.txt`.

Automated tests: `apps/web/src/phone.test.ts`, `phone-browser.test.ts`, `phone-integration.test.ts` and `tools/check_budgets.test.ts`; existing host tests remain passing. The in-memory integration uses the production pairing-room reducer and real host/phone transports with simulated RTC/data channels. It proves seating, ninth-player refusal, host quality label, phone reload and host restoration; it is not real-device or browser evidence. Browser UAT, screenshots, PERF-020 interactivity / PERF-021 wall-clock measurements and independent review remain for the integrator.

## Requests

- The integrator has added the root dev script; no package.json changes are needed.
- Record this sentence in DECISIONS.md: “C-08 keeps the host and phone on a shared entry, enforces a separate 300 KB controller transfer budget, and interprets board 4 joining/lobby as the nine numbered readings in docs/slices/C-08-join-page.md; these remain reviewable in the integrator's screenshots.”
- Update CLAUDE.md's command table to state that pnpm dev launches web and local pairing after adding the requested script; update shared status/traceability/backlog/changelog only after browser UAT and review.
- Publish the phone artifact and inspect every requested screenshot/frame strip before marking the issue done. Run tools/dev.mjs against the real local Wrangler runtime; it was not launched in this sandbox. LAN HTTP enables join testing, but browser secure-context features such as wake lock remain browser-dependent.


### Round 2 Requests — exact documentation text

In `docs/ARCHITECTURE.md` §5, replace this exact sentence:

> Retries start at 250 ms and double to 8 s, each attempt abandoned after 15 s; after the hold the phone shows a distinct state with a rejoin action and retries every 8 s.

with:

> Every phone retry starts at 1 second and doubles to a maximum of 30 seconds, including retries after the 2-minute seat hold; after the hold the phone shows a distinct state with a rejoin action. Retry-After can lengthen a wait, capped at 30 seconds; past or zero values mean the 1-second minimum, and invalid values use the bounded fallback. Each attempt’s 15-second negotiation deadline starts after its admission wait, so the deadline cannot cancel a longer retry wait. Signalling presence is advisory and ignored while the data channel holds the seat. While the phone’s data channel is open, in-band room-not-found, room-expired and not-allowed from the pairing server do not tear down the channel, clear the stored seat or change the phone’s presentation. Only with no open data channel do they mean the room is gone or the phone has been replaced. Known gap carried to C-15: an ICE “disconnected” state still counts as channel loss. Host handling of those reports while playing belongs to C-10/C-15 (D-095 f).

Add to `docs/UAT.md`:

> Run `KAKI_HOST=<laptop-LAN-IP> pnpm dev` for phones on the same LAN, and open the launcher’s printed Phone URL. KAKI_HOST must be an IP literal; hostnames, including localhost, are refused with a clear message. The default 127.0.0.1 is for local browser testing. The launcher binds the literal address supplied: 127.0.0.1 stays loopback, a LAN IP binds only that IP, and 0.0.0.0 binds all IPv4 interfaces only when explicitly requested. With KAKI_HOST=0.0.0.0 the advertised address may be a VPN or Docker interface, so pass the laptop’s LAN IP explicitly for phone testing. Ports can be selected with KAKI_PORT_WEB and KAKI_PORT_SIGNAL. For a signalling-only outage run `KAKI_DEV_KEEP=1 pnpm dev`, then stop the printed Pairing process group with `/bin/kill -TERM -- -PID`, substituting its numeric PID. Web stays alive; Ctrl-C on the launcher still stops both process groups. Restart the launcher for a fresh stack. Without KAKI_DEV_KEEP, either child’s exit stops both. LAN HTTP does not prove secure-context features such as wake lock.


### Round 2 current bundle and validation

Host: **132,117 bytes raw / 46,202 bytes gzip** against 1,500,000. Controller and deploy: **132,117 bytes raw / 46,202 bytes gzip**, including public output, against the controller's unchanged 300,000-byte limit. The source-alphabet import, dedicated rename view, live region and responsive corrections add 1,403 gzip bytes to round 1. Production demo-marker and CSS-property scans pass. Typecheck, focused UI ESLint and launcher syntax pass. **VITEST_MAX_WORKERS=2 pnpm verify passed**, exit 0: 128 test files, **2,952 passed / 1 existing skipped**, 264.84 s. Workspace check, typecheck, ESLint, design lint (252 files, no new exemptions), build, budgets and trace check passed. REPORT includes the verify tail.

Fresh visual coverage remains required as listed in REPORT: the sandbox cannot listen or launch Chromium. The integrator's committed evidence section is preserved byte for byte.


## Round 3 repair — two scoped faults

- PLAT-002/006/008: retain the authoritative room phase in the phone view-model. A seated lobby player sees “You’re in.” and “Waiting for the leader to pick a game.” The leader uses the same waiting line until C-09 gives them something to do; “Pick a game on the TV when everyone has joined.” is not available yet. Accepted players in playing/paused see “Watch the TV.”; refused mid-game joiners retain “Waiting for the lobby”. New joins reset the phase to lobby.
- PLAT-004 / NFR-A11Y: the visible status renders the title and detail once, without the redundant notice paragraph. The persistent polite atomic live region uses one text value and the standard absolute, one-pixel, overflow-hidden clip/clip-path rule, with no padding or border and no layout space. It stays exposed to assistive technology; unchanged message text does not change its text node.
- Tests: phone.test.ts covers lobby, leader in lobby, accepted playing/paused and return to lobby, and refused mid-game. phone-message.test.ts checks the clipping declarations, persistent single announcement node and the visible duplicate-name message markup/count.
- Evidence inspected: round3/c08-36-phone-lobby.png and round3/c08-32-duplicate-name.png. These are the integrator’s pre-fix captures; fresh browser and screen-reader confirmation remain with the integrator. Existing REPORT.md sections are untouched.

### Round 3 Close-out and Requests

Code: apps/web/src/phone.ts, phone-route.tsx, phone.css. Tests: apps/web/src/phone.test.ts and phone-message.test.ts. Verification log: uat/evidence/C-08-join-page/VERIFY-round3.txt. No contract, dependency, budget or design-lint exemption changes. Requests: integrator to confirm the two repaired screens and announcements in a browser.

Round 3 validation: `VITEST_MAX_WORKERS=2 pnpm verify` passed (exit 0): 129 test files, 2,958 passed / 1 existing skipped. Workspace, typecheck, ESLint, design lint (253 files, no new exemptions), build, budgets and trace passed. Controller gzip: 46,262 bytes / unchanged 300,000-byte limit. Full log and verify tail are in VERIFY-round3.txt.


## Round 4 repair — review findings

- PLAT-004/007: rename ends as soon as the phone is disconnected. A failed set-name send has plain visible feedback. Probe C’s host-stop/rename/host-return case is ported into the production-transport integration test and a focused view-model test; the old accepted name returns in the lobby.
- PLAT-003: protocol now exports only the code alphabet and length. Phone and pairing generator consume those exports; the raw server-source import is removed. Production scanning rejects the server filter marker and quoted filter words; tests import the server list only in the test graph.
- PLAT-007/008: expired, closed, waiting-for-lobby and left views clear seat identity, including demos; possibly held states retain it. No-seat views render neither header nor seat card.
- PLAT-009: unreachable title/detail use separate lines and typographic apostrophes. Past and zero Retry-After values use 1 second for host and phone. Hostname launcher inputs fail before starting children; the default is the loopback IP literal.
- Requests above now explicitly replace the obsolete retry sentence and include the C-15 ICE gap and LAN interface caveat. REPORT.md and shared trackers are untouched.

### Round 4 Close-out and Requests

Verification evidence: `uat/evidence/C-08-join-page/VERIFY-round4.txt`. Integrator: confirm the repaired disconnect/return and no-seat screens in browser UAT; apply the full replacement ARCHITECTURE and UAT texts above. No dependencies, budgets, checks, limits or design-lint exemptions changed.

Round 4 validation: `VITEST_MAX_WORKERS=1 pnpm verify` passed (exit 0): 130 test files, **3,026 passed / 1 existing skipped**, 366.38 s. Workspace, typecheck, ESLint, design lint (255 files, no new exemptions), production build, server-filter/demo scans, unchanged budgets and trace passed. Host, controller and deploy each measure **130,315 bytes raw / 45,415 bytes gzip**. The preceding two-worker run passed every C-08 test but exceeded the unchanged Tabao Rush recipe conformance timeout; the one-worker rerun passed without changing a check or limit. Focused phone/message/production-transport regression run: 77 tests passed. `git diff --check` passed.
