# C-07 — Host lobby

Goal: implement PLAT-001, PLAT-004, PLAT-010, PERF-022 and the host restore wiring of
PLAT-009, following D-090 in the integrator's decision log (read in full).
NN-5 and NFR-A11Y apply to presentation and motion.

Acceptance: authenticated room creation/restore; eight numbered coloured seats, names,
leader and measured link labels; public join QR; creating/restoring/unreachable/expired/
replaced states; automatic retries; clean deploy output and a complete transfer budget.
Out of scope: phone controller, picker, game sessions, landing-page design, browser UAT,
shared trackers, dependencies and contracts.

## Close-out

D-090 (a–h) replaces the earlier requested board readings. The join panel and seat strip
have bounded 1.618:1 tracks. Badges are 55 px; held badges keep the seat-colour ring on a
panel background with secondary-ink names and a countdown. Codes keep the working 233 px
composition and 144 px group gap. Empty seats show Scan to join only while the join code is visible.
The root route is a plain not-built-yet notice and one host link.

Routes live in host-route.tsx and landing-route.tsx; Overlap.tsx is shared, and join-link.ts
exports normaliseCode/joinLink for C-08. Overlap retains the latest rendered content,
finishes the current mask before coalescing an interruption to the newest identity, and
excludes countdown ticks from seat identity. Single-seat changes have no stagger;
multiple-seat updates and initial reveal use index × 30 ms. Status icons are currentColor
inline SVGs at token sizes. QR paths are pure and memoised by payload. The favicon is an
inline SVG constructed from the active UI tokens, without raw HTML colours.

Names use measured browser font widths and grapheme boundaries: one or two lines at
34 px, then three at 34 px, never 21 px. Each card reserves three name lines. Status
rows align across cards; the connection row reserves its second line only when a label
needs it. Internal gaps use 5 px, padding 8/13 px. Error actions focus once on entry,
including when a mask delays insertion. The QR accessible name includes the URL and
individually spaced code characters; polite announcements omit countdown ticks.

Quality rule: the first measured label is shown immediately; subsequent changes require
three consecutive reports of the same new quality. Matching the current label clears the
candidate. Reports that do not change the shown label do not publish to the view.

Retry rule: failed creation and retryable restore wait 1, 2, 4, 8, 16 then 30 seconds,
capped at 30 seconds, resetting after success. An injected browser online event retries
immediately, subject to creation limits and Retry-After. After eight creation attempts,
further creations wait at least one minute; a 429's Retry-After (seconds or HTTP date)
is also respected by manual, online and automatic retries. Definitive expired/replaced
states never reopen automatically. Production signalling defaults to same-origin;
KAKI_SIGNAL_URL must be an absolute HTTP(S) URL if supplied. Dev retains localhost:5151.
Phones require a LAN-reachable signalling endpoint.

TypeScript output is under ignored apps/web/.tsbuild/dist/, with build info under .tsbuild/.
Vite empties dist on each build. PERF-022 reports the host manifest closure separately,
and enforces the existing 1,500,000-byte gzip budget on every deploy file except .vite/.
The build check rejects source maps, build info and demo fixture strings. A regression test
uses an incompressible 2 MB public asset referenced from CSS and absent from the manifest.

Headless tests: browser.test.ts covers injected transport error mapping, socket failure after
start and Retry-After; host.test.ts covers creation/restore, replaced restore, hysteresis,
back-off and online retry; review-r2.test.ts covers exact QR modules/quiet zone/correction,
countdown text, countdown-independent identity and CJK/compound-emoji boundaries.
lobby-motion.test.ts checks complementary masks, the outgoing fade to 8% opacity within
the first third, token timing and reduced motion. The card surface stays outside the mask; only contents and their dashed/solid border
wipe, with the outgoing contents using the ghost-opacity token. Weak uses a currentColor
warning triangle; all connection icons are 34 px with an 8 px gap.

View-model rule: ready and reconnecting retain the live room; creating, restoring, unreachable,
expired and replaced use secondary ink at full opacity and suppress connection text and
icon. Badges and numerals retain full strength. Fixed connection slots preserve alignment. View-model tests
cover every pairing state and per-name wrapping with injected font measurements. Join-panel
helper copy, action labels, the player count and alternative join URL are explicitly 34 px
at 1080p; buttons retain the 89 px minimum height.
Evidence and the per-screenshot completion table are in uat/evidence/C-07-host-lobby/REPORT.md.

## Integrator browser URLs

Start the dev server with the worktree's web port. These paths are dev-only; the demo module
and all its fixtures are absent from production output. Query parameters can be combined.

| URL | Purpose |
|---|---|
| `/host?demo=0` | Empty seats |
| `/host?demo=1` | Single player and leader |
| `/host?demo=8` | Full room, held seat, weak and relayed links |
| `/host?demo=8&names=long` | Twelve-grapheme CJK and twelve-emoji names |
| `/host?demo=0&state=creating` | Creating |
| `/host?demo=8&state=restoring` | Restoring |
| `/host?demo=8&state=unreachable` | Try again action |
| `/host?demo=8&state=expired` | Create a new room action |
| `/host?demo=8&state=replaced` | Other host tab notice |
| `/host?demo=3&change=join&slow=10` | One join after two seconds; slow mask |
| `/host?demo=3&change=leave&slow=10` | One leave after two seconds |
| `/host?demo=3&change=held&slow=10` | One held seat after two seconds |
| `/host?demo=8&change=return&slow=10` | One held seat returns after two seconds |

Capture 1280×720, 1920×1080 and 3840×2160; inspect physical 3 m readability, all name/status
slots, held colour rings, keyboard focus, reduced motion and mid-transition strips. Real
pairing UAT must scan the QR with a phone, join eight phones, reload, interrupt signalling,
restore, expire and duplicate the host tab. Demo error actions are presentation fixtures;
real retry behaviour must be checked with real pairing.

## Requests

- C-08: implement `/play` reading `?code=` using shared join-link.ts helpers; configure a
  LAN-reachable KAKI_SIGNAL_URL for real phones. Confirm whether controller code shares the
  host entry against the separate 300 KB JavaScript budget before wiring its route.
- C-09: extend createHost to expose the room and authenticated leader input, selection and
  session hooks; add an app-level screen state machine for lobby/picker/session/results.
  Current createHost intentionally projects lobby data and keeps credentials private.
- C-13: createHost must next expose read-only room updates and measured link snapshots,
  plus lifecycle hooks for benchmark start/stop without credentials. Provide a place for the lobby benchmark in the performance harness, including eight
  phone reports, joins/holds/returns, QR stability and worst-case names on the target screen.
- Integrator: complete and inspect the screenshot table, real-phone scan and browser checks;
  record acceptance and update shared trackers after independent review.

Final round 2 validation: `VITEST_MAX_WORKERS=2 pnpm verify` passed: workspace check,
TypeScript, ESLint, design lint (216 files, no new exemptions), 105 test files with
2,550 passing tests and one existing skip, production build, complete PERF-022 budget
and trace check. Host closure and complete deploy output are both 105,609 bytes raw /
38,457 bytes gzip against 1,500,000 allowed. `git diff --check` passed. Full output:
`uat/evidence/C-07-host-lobby/verify-round-2.txt`; exact per-file measurements and production
content checks: `uat/evidence/C-07-host-lobby/bundle-round-2.json`.


Round 3: reference screenshots inspected: round2/c07-15-longnames-1080p.png,
round2/strip-join-slow10.png and round2/c07-17-restoring.png. Browser recapture remains with
the integrator; the memory preflight cannot query sysctl in this sandbox. The evidence REPORT
screenshot table is unchanged. Targeted regression run: 37 tests passed across view-model
and lobby-motion tests. Final verification is recorded in verify-round-3.txt.

Round 3 final validation: `VITEST_MAX_WORKERS=2 pnpm verify` passed: workspace check,
TypeScript, ESLint, design lint (216 files, no new exemptions), 105 test files with
2,559 passing tests and one existing skip, production build, PERF-022 budget and trace check.
Host closure and complete deploy output are both 107,116 bytes raw / 38,954 bytes gzip
against the unchanged 1,500,000-byte gzip limit. `git diff --check` passed. Full output:
`uat/evidence/C-07-host-lobby/verify-round-3.txt`; per-file bundle measurements:
`uat/evidence/C-07-host-lobby/bundle-round-3.json`.

Round 4 (PLAT-001, PLAT-009): forwarded Durable Object responses bypassed the
worker's route-local CORS headers, hiding unknown-room probe status from the browser.
All admitted responses now pass one worker exit decorator, including routing errors,
forwarded errors and caught worker failures; existing headers and WebSocket upgrades
are preserved. Retry-After is exposed and silent-saturation 429 responses supply it.
The smoke script now checks an unknown host room's 404 and allowed-origin header.

A probe is terminal only when a 404 or 410 carries X-Kaki-Room: gone; bare 404,
5xx, rejected probes and unreadable status remain unreachable. Before the room opens,
the browser host owns creation/restore retries. Once acknowledged, netcode reconnects
signalling in place with the injected 1/2/4/8/16/30 second delay, resets on success,
honours Retry-After and wakes on online. It never retires the room or phone peers for
a signalling blip. Probes learn only authoritative expiry or retry pacing.

Regression coverage: worker response/error status table, routing errors, collision
exhaustion, thrown storage errors, disallowed origins and header preservation;
saturation Retry-After; real browser adapter + host + netcode restore against
404/410/network/status-0/429, simultaneous error/close callbacks, exact attempt
times, online retry and saved-room retention/clearing; real phone pairing/rejoin
404/410 with no further attempt after a minute or wake. Six network-failure attempts
occur in the first minute (0, 1, 3, 7, 15, 31 seconds); the next would be at 61 seconds.

Round 4 Requests: integrator to run the updated smoke script and real Chromium restore
check against Wrangler. No Wrangler process or browser recapture was run here.
Round 3 screenshots and the evidence screenshot table are unchanged.

Round 4 final validation: `VITEST_MAX_WORKERS=2 pnpm verify` passed: workspace check,
TypeScript, ESLint, design lint (217 files), 106 test files with 2,584 passing tests
and one existing skip, production build, PERF-022 and trace check. Host and deploy
output: 107,577 bytes raw / 39,057 bytes gzip against the unchanged 1,500,000-byte
limit. Full output: `uat/evidence/C-07-host-lobby/verify-round-4.txt`.


Round 5 Close-out (D-092, PLAT-001/004/009/010, NFR-A11Y): reapplied the worker CORS
exit decorator over main's admission paths without changing any limiter order or budget.
Unknown and expired room probes carry the exposed X-Kaki-Room header. Bare 404 and 5xx
retain saved credentials on both host and phone paths. The smoke assertion includes the
header. Added error-path tables, dropped-socket/keep-alive recovery, bounded request-count
and peer-channel survival tests, token generation checks and token-based seat contrast.
The stale REPORT introduction/template was removed; the integrator section is unchanged.

Netcode API: PairingOptions.retryDelay(failure) supplies in-place pacing; online.subscribe
supplies wake notifications; upgradeStatus accepts { status, gone?, retryAfterMs? }.
Legacy numeric probe statuses remain accepted but cannot declare expiry. externalRetry
applies only before the host's created acknowledgement.

Round 5 Requests: integrator to rerun smoke on Wrangler and retake/inspect the screenshots,
including three-line names, non-live seat contrast, focus and mid-wipe static surfaces.
C-09 needs createHost room subscriptions, authenticated leader actions, selection setters,
phase/session hooks and results/checkpoint updates so signalling recovery preserves the
running phase. C-13 needs the read-only room/link and benchmark lifecycle hooks above.

Round 5 final validation: `VITEST_MAX_WORKERS=2 pnpm verify` passed: workspace check,
TypeScript, ESLint, design lint (238 files, no new exemptions), 121 test files with
2,803 passing tests and one existing skip, production build, PERF-022 and trace check.
Host closure and complete deploy output: 108,400 bytes raw / 39,211 bytes gzip against
1,500,000 allowed. `git diff --check` passed. Full output:
`uat/evidence/C-07-host-lobby/verify-round-5.txt`. Wrangler and browser recapture remain
with the integrator as requested.
