# C-23 — Host and leader removal

Requirement: **PLAT-011** (D-247), with the C-23 round 1b contract clarification.

The TV lobby and current leader's phone can remove another player using a confirmation
inside the same player card. The host can remove the leader; the ordinary leave path frees
the seat, calls the running game's existing leave hook and hands leadership over. A phone
request is bound to its connected seat, checked against current leadership, and cannot target
itself. The paused leader's menu also exposes the player actions.

The phone sends its random `kaki.device` localStorage browser id with every hello and resume.
Storage denial uses a per-tab fallback. The host keeps browser ids separately from transport
identities. Removed browser ids and seat tokens stay in a host-private room block list and
survive snapshot restore; seated browser ids also survive so removal after a host reload
works. Neither the identifiers nor the block list enter `publicRoom`, game public views or
another phone. The console player menu uses the existing private `view` path and carries only
names and seat numbers. The contract adds `browserId` to hello/resume and `removed` to refusal
reasons; existing local-seat/legacy messages without browserId remain accepted. No new wire
message or pairing-server change is needed. Removed phones receive `refused: removed` before
connection closure, stop retrying and show “You were removed from this game”,
“You can’t rejoin this room.” and Join another room. A reload
resumes with the retained seat token and is refused again.

Accepted v1 limit: a private window or cleared site data gets a new browser id and can join
again. The block is per room. Host snapshot storage denial retains the existing best-effort
persistence behaviour. Carried-score representation is unchanged (C-22's scope).

## Acceptance and coverage

- Host removal, leader removal, non-leader and self rejection, freed seat, handover, browser-id
  and token refusal on join/resume, snapshot restore and public-room privacy: room/removal tests.
- Transport notification, target closure, stale disconnect safety and fresh connection refusal:
  reconnect/removal tests. Terminal phone state and stable identity on hello/resume: phone tests.
- Running removal invokes the game's existing leave hook once: session/c10-round3 test.
- Persistent localStorage identity and storage-denied fallback: phone-browser test.
- DOM test (written, not run here): same-card open/cancel/confirm, Enter, Escape, restored focus,
  and the removed phone screen with “You were removed from this game”,
  “You can’t rejoin this room.” and Join another room.
- UAT script: `uat/slices/C-23-host-kick.mjs`, three phones, TV confirmation at 1920 × 1080 and
  1280 × 720, lobby after removal, removed screen, reload refusal, leader confirmation and lobby.

## Validation

Every pnpm command uses `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; Vitest uses
`VITEST_MAX_WORKERS=2`. No verify, UAT, perf, install or commit was run, as instructed.

Launch loads (one-minute average; chronological, including development iterations):

| Check | Load | Result |
| --- | --- | --- |
| Initial TypeScript | 3.30 | Found contract union syntax error; fixed |
| TypeScript retry | 3.39 | Found optional-property typing issues; fixed |
| App/platform tests | 5.71 | 1,605 passed; three roster assertion failures fixed; one Chromium sandbox failure |
| TypeScript retry | 9.65 | Found UAT tuple typing and protocol sample errors; fixed. This launch exceeded the requested threshold in error |
| Protocol tests | 7.76 | 362 passed before removing the extra roster wire message |
| ESLint including protocol | 7.40 | Found test lint issues; fixed |
| TypeScript retry | 7.57 | Found fixture return and test-variable issues; fixed |
| App/platform tests | 6.95 | 1,613 passed, one skipped; only Chromium sandbox failure |
| Design lint | 6.99 | Passed, 492 files |
| TypeScript and ESLint including protocol | 7.39 | Both passed |
| App/platform and final protocol tests | 7.38 | Protocol: 361 passed; app/platform: 1,612 passed, one assertion about message order fixed, one Chromium failure |
| Final app/platform tests | 6.39 | 1,613 passed, one skipped; only the known Chromium sandbox failure |
| Final TypeScript, ESLint including protocol, design lint | 7.65 | All passed; design lint scanned 492 files |
| Remove TypeScript emitted files (`tsc -b tsconfig.build.json --clean`) | 6.83 | Passed |

Final protocol run: **361 tests passed in 10 files**. Final app/platform run: **1,613 passed, one skipped, one Chromium sandbox failure** across 100 files. TypeScript, ESLint (including protocol), design lint and `git diff --check` pass; TypeScript emitted files were cleaned. The browser-dependent DOM tests are
reserved for the integrator. `team-polish.test.ts` launches Chromium despite not having the
`.dom.test.ts` suffix; Chromium fails with MachPortRendezvous `bootstrap_check_in` permission
denied in this sandbox. This existing test is not suppressed or changed.

## UAT command

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5310 KAKI_PORT_SIGNAL=5311 pnpm uat -- C-23-host-kick --phones 3
```

The harness serves the TV on 5310 and signalling on 5311. No screenshots or visual-pass claim
are supplied: the brief explicitly reserves browser execution and review for the integrator.

## Close-out

Implementation and the test/UAT artefacts are ready for independent review. No trackers,
backlog, PRD, DESIGN, PERFORMANCE, DECISIONS, lockfile or carried-score code were edited.
No commit, push, merge or deployment was performed.

## Requests

Integrator: run the new DOM test and full verify outside the sandbox; run the three-phone UAT
above, inspect every still (including card expansion/focus at both TV sizes), save evidence
under `uat/evidence/C-23-host-kick/`, and record the contract decision at merge.

## Round 2 — real browser wiring and compact leader lobby

**Cause:** `browser.ts` wraps every host peer in `viewChannel`. Its receive gate required
an action's `viewRev` to equal the latest private-view wire revision. The phone correctly
sent the room-seat removal action with `viewRev: null`, so the gate returned null before
`createHost` or the reconnect room could process it. The original app integration test
connected transport straight to the host and missed this wrapper.

**Fix:** `viewChannel` now passes only `remove-player` actions with a null view revision
through unchanged. Other stale/private-view actions retain their revision gate. The room
still authenticates the connected actor, checks current leadership and rejects self removal.
No protocol or identifier changes were needed.

`removal-integration.test.ts` connects the real phone and host constructors through the
production view-channel wrapper and the existing in-memory signalling/RTC doubles. It
seats Fern, Moss and Cloud, checks an ordinary non-leader request and a forged non-leader
wire action, removes Cloud on TV, then removes Moss from Fern's phone. Both removed phones
reach the terminal removed state; restoring their stored seat and making a fresh hello
with their blocked browser identity are refused. Before the fix, this test failed at
Moss remaining in `lobby` instead of `removed` (load 3.56); after the fix it passed.
A focused view-channel test also checks that unrelated null/stale actions stay rejected.

**Layout:** the landscape leader lobby uses `--ka-golden-columns` (primary : secondary
1.618 : 1), with lobby copy and actions primary and compact player rows secondary. Names,
row gaps and small Remove pressables use phone type/spacing tokens. Confirmation opens
at the same row's trigger, retaining the existing scale-from-0.95 ease-out entrance,
base/base-exit timing and reduced-motion state behaviour. The paused player menu shares
the compact row styling. The new DOM test checks all eight names, lobby controls,
viewport/content bounds and the golden split at 667 × 375, 844 × 390 and 932 × 430,
including an open Moss confirmation. The integrator runs this DOM test.

The round-1 stills 01–06 were opened and reviewed: TV removal, terminal removal and reload
refusal were present; the leader confirmation occupied the full width above the lobby.
The UAT slice now adds `leader-lobby-667-before-removal`,
`leader-lobby-844-before-removal` and `leader-lobby-after-removing-moss` (phone stills).
No round-2 browser execution or visual-pass claim is made here: **the integrator runs round 2's UAT to round2**.

Security note from the integrator: browserId is client-supplied, so the block stops casual
rejoins only. A hello without a browserId after a block exists is a possible follow-up
(not in scope). The existing accepted private-window/cleared-site-data limit still applies.

### Round 2 validation

Every pnpm launch used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; Vitest used
`VITEST_MAX_WORKERS=2`. Each launch was below load 8 and each command had a ten-minute
limit. No verify, UAT, perf, install, commit, push or merge was run.

| Launch | One-minute load | Result |
| --- | --- | --- |
| Initial regression fixture | 4.10 | Failed before seating: fixture browser id too short; corrected |
| Regression fixture iteration | 4.24 | Failed roster assertion: missing browser view-channel wrapper |
| Direct transport regression diagnostic | 4.04 | Passed, isolating the missing browser wrapper |
| Regression with production wrapper, before fix | 3.56 | Failed: Moss stayed in lobby after leader removal |
| Regression after fix | 3.68 | Passed |
| Requested app/platform suite, excluding DOM/layout-fixtures/team-polish | 3.74 | 100 files passed; 1,614 passed, one skipped |
| TypeScript build (root includes UAT slice) | 4.45 | Passed |
| ESLint | 5.39 | Two unnecessary optional chains in new test; corrected |
| Design lint | 5.41 | Passed, 494 files |
| Final integration/view-channel regression tests | 4.96 | Three tests passed, including forged non-leader action |
| ESLint retry | 5.37 | Passed |
| Final TypeScript build | 5.78 | Passed |
| Final design lint | 5.43 | Passed, 494 files |
| TypeScript clean | 5.43 | Passed; emitted files removed |

`git diff --check` passes. DOM tests and UAT remain for the integrator.

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5310 KAKI_PORT_SIGNAL=5311 pnpm uat -- C-23-host-kick --phones 3 --out round2
```

### Round 2 close-out and requests

Ready for independent review. Changes stay within app host/phone wiring, their layout and
tests, this slice note and the authorised UAT slice. No shared trackers, contracts, PRD,
DESIGN, PERFORMANCE, DECISIONS, backlog or lockfile were edited. Integrator: run the new
DOM coverage and round-2 three-phone UAT, inspect every still, and record acceptance.

## Round 3 — touch-sized names and column confirmation

PLAT-011: the leader's secondary column now contains name rows with a 55 px minimum
height. Each other player's whole row is the removal pressable; the leader's own row is
plain text. The column uses native touch scrolling with contained overscroll: the finger
tracks the list directly, the browser retains its boundary rubber-band affordance, and
scrolling does not chain to the page. The landscape lobby retains its 1.618 primary to
secondary split and the integrator's body line height on the lobby heading.

Selecting a name expands its panel into the list column using a mask measured from that
row, scale from the popover token and the base ease-out timing. The underlying list remains
painted but inert during confirmation, so the expanding panel overlaps it. Cancel/Escape
reverses the mask into the row with the shorter base-exit timing. A completed removal
returns after the authoritative roster update. Both return focus to the next available
removal row, wrapping at the end; when only the leader remains, focus returns to the plain
leader row. Reduced motion swaps state immediately. Confirm controls each retain the 55 px
floor and fit inside the column rather than spilling from an individual row.

`removal-layout.dom.test.ts` covers eight players at 667 × 375, 844 × 390 and 932 × 430:
viewport/content bounds, the unchanged golden split, all seven pressable row heights,
scrollable list with a stationary page, column bounds before/during confirmation, both
confirm button heights, Cancel, Enter/Escape, removal, focus on the next row and reduced
motion. Browser execution remains reserved for the integrator.

The UAT slice retains the two leader-list stills before removal and the open-confirm still,
uses the whole-name row, and waits for confirmation to close before recording the lobby
after removing Moss; **the integrator runs round 3's UAT to round3**:

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5310 KAKI_PORT_SIGNAL=5311 pnpm uat -- C-23-host-kick --phones 3 --out round3
```

### Round 3 validation

`git diff --check` passes. The requested app/platform suite, TypeScript build/clean,
ESLint and design lint **did not launch**: the one-minute load remained above 8 during
roughly nine minutes of waiting. Observed readings during this turn ranged from 9.85 to
23.18; the final pre-close reading was 18.43. The load-gated waiting process was stopped
before any pnpm command started, so there are no check-launch loads or test-pass claims.
No TypeScript files were emitted. No Chromium, verify, UAT, perf, install or commit was run.

Integrator: run the four round-2 checks sequentially below load 8, using
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`, `VITEST_MAX_WORKERS=2` for Vitest and the
ten-minute command limit. Validation remains blocked by machine load.

### Round 3 close-out and requests

Integrator: run round 3's DOM test and UAT, inspect the two before-removal leader-list
stills, the expanded confirmation and the lobby after Moss's removal, then record acceptance.
No visual-pass claim is made here. Shared trackers, contracts, PRD, DESIGN, PERFORMANCE,
DECISIONS, backlog and lockfile are unchanged. No commit, push or merge is performed.

## Round 4 — TV card bounds

PLAT-011: the TV seat content now uses the existing card's available grid space. The
55 px Remove pressable shares a row with the quality line, using 21 px type and 5 px
padding tokens. The name retains room for its three lines. Confirmation occupies the
name/action area inside the same card, with its question above side-by-side Remove and
Cancel controls. The seat number and Leader line stay visible. The absolute-positioned
confirmation expansion is removed; normal and confirmation states have equal card height.
The lobby row split, QR panel and 55 px board safe margin are unchanged. All new rules
are scoped to the TV lobby; phone layouts and interactions are unchanged.

`host-kick-layout.dom.test.ts` covers three and eight players at 1920 × 1080 and
1280 × 720, checking every card and descendant against its card and the viewport minus
the scaled bottom margin, and checking scrollHeight ≤ clientHeight. It also checks that
confirmation keeps all card heights unchanged. The UAT slice adds the same bounds and
overflow assertions in normal and confirmation states at both TV sizes.

### Round 4 validation

Checks run sequentially without load gating, with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`
and `VITEST_MAX_WORKERS=2` for Vitest. No load readings were taken.

- App/platform suite with the brief's DOM/layout-fixtures/team-polish exclusions: 100 files
  passed; 1,614 tests passed and one skipped.
- TypeScript: initial run found viewport-loop tuple typing errors; corrected, retry passed.
  Build outputs were removed with TypeScript clean.
- ESLint: initial run found the new DOM assertion's Element.className typing; corrected.
- ESLint retry: passed with no warnings.
- Design lint: passed, 495 files scanned.
- `git diff --check`: passed.

### Round 4 close-out and requests

**the integrator runs DOM tests, verify and UAT to round4**. Browser execution and visual
review remain pending; no visual-pass claim is made. Run the new TV DOM test alongside
existing removal DOM tests, inspect every round-4 still, and record acceptance.

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5310 KAKI_PORT_SIGNAL=5311 pnpm uat -- C-23-host-kick --phones 3 --out round4
```

No verify, UAT, perf, install, commit, push or merge was run. Shared trackers, contracts,
PRD, DESIGN, PERFORMANCE, DECISIONS, backlog and lockfile are unchanged.

## Round 4b — TV nickname descenders

PLAT-011: the lobby nickname now uses `--ka-line-body`, including its three-line maximum,
so one-line glyphs such as Peggy's descenders fit inside the clipping box. The taller name
line uses the existing space between the seat number and quality/Remove row; no padding
is added. The round-4 grid, card height, confirmation layout, phones and QR panel are
unchanged.

The TV DOM fixture now includes Peggy at both player counts. Its existing coverage still
checks three and eight players, 1920 × 1080 and 1280 × 720, normal and confirmation states,
and equal card heights. Both integrator changes are retained: the Rabakz bank build plugin
and scroll assertions restricted to cards and non-visible-overflow boxes. No assertion was
loosened in round 4b.

### Round 4b validation

Checks ran one at a time without load gating. Every pnpm launch used
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; Vitest used `VITEST_MAX_WORKERS=2`.

- App/platform suite with the standing DOM/layout-fixtures/team-polish exclusions: passed,
  100 files; 1,614 tests passed and one skipped.
- TypeScript build (including UAT): passed.
- TypeScript clean: passed; emitted files removed.
- ESLint for apps/web, packages/platform and the UAT slice: passed, no warnings.
- Design lint: passed, 495 files scanned.
- `git diff --check`: passed.

### Round 4b close-out and requests

The CSS correction and descender regression fixture are ready for independent review.
The standing briefs reserve browser execution for the integrator: **the integrator runs
DOM tests, verify and UAT to round4** with this round-4b correction, including all eight TV
layout combinations. Browser results and visual review remain pending; no visual-pass
claim is made. No verify, UAT, perf, install, commit, push or merge was run. Round-4 work
and the integrator's DOM-test changes are retained. No shared trackers, contracts, PRD,
DESIGN, PERFORMANCE, DECISIONS, backlog or lockfile were edited.

## Round 4c — TV confirmation independent of nickname sizing

PLAT-011: the TV confirmation is now positioned inside the existing seat-content box,
from below the 55 px seat number to above the 34 px leader line, with the existing 8 px
padding and 5 px gaps. It no longer participates in the nickname/status grid's track
sizing. Its question wraps above a single row of two existing 55 px small pressables.
All dimensions use the existing design tokens and permitted spacing scale.

This removes the confirmation's contribution to the name row's minimum size at the
1280 × 720 screen scale. Round 4b's body line height and three-line nickname maximum
are retained, including Peggy's descender room. Card height, the lobby/QR layout, phones,
motion and test limits are unchanged. All uncommitted round-4 and round-4b work is retained.

### Round 4c validation

Checks run one at a time without load gating. Every pnpm launch uses
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; Vitest uses `VITEST_MAX_WORKERS=2`.

- App/platform suite with the standing DOM/layout-fixtures/team-polish exclusions: passed,
  100 files; 1,614 tests passed and one skipped.
- TypeScript build (including UAT): passed.
- TypeScript clean: passed; emitted files removed.
- ESLint for apps/web, packages/platform and the UAT slice: passed, no warnings.
- Design lint: passed, 495 files scanned.
- `git diff --check`: passed.

### Round 4c close-out and requests

The correction and updated slice note are ready for independent review. The integrator
re-runs `apps/web/src/host-kick-layout.dom.test.ts` in Chromium for three and eight players,
normal and confirm states, at 1920 × 1080 and 1280 × 720. The existing Peggy fixture,
Rabakz build plugin and all bounds/scroll limits are retained without changes.
**The integrator runs DOM tests, verify and UAT to round4** with the round-4c correction.
Browser results and visual review remain pending; no visual-pass claim is made.

No verify, UAT, perf, install, commit, push or merge was run. No shared trackers, contracts,
PRD, DESIGN, PERFORMANCE, DECISIONS, backlog or lockfile were edited.

## Round 5 — reserve TV confirmation outside the Remove row

PLAT-011: the confirmation overlap is now absolutely positioned against seat-content in
both states, including retained outgoing fade layers after Cancel. Previously only the
open confirmation's parent was positioned outside the tracks; a retained confirmation
could contribute its 115 px minimum plus the trigger and gap to the normal 55 px Remove
row. This accounts for the probe's 175 px remove-player box before the next click.
The Remove container now retains a 55 px minimum in either state. The confirmation uses
the existing space below the number and above the leader line. Pointer events pass
through the empty overlap; the active confirmation remains interactive.

Vertical card padding tightens from 8 to 5 px. This leaves room for all three body-height
name lines, preserving descenders. No component, phone, QR panel or test was changed.
No spacing outside the token scale was introduced; TV buttons retain their 55 board-px
minimum height. Card tracks and height do not depend on whether confirmation is open.

### Final Round 8 computed layout (CSS reasoning, not a browser measurement)

At 1920 × 1080 the card track is `(1080 - 2×55 - 89 - 2×34) / 2.618`
= 310.54 board px. At 1280 × 720 the uniform scale is 2/3:

| Box | Board px | Screen px at 1280 × 720 |
| --- | ---: | ---: |
| Card, unchanged in both states | 310.54 | 207.03 |
| Name track available | 135.34 | 90.23 |
| Leader row and flex-aligned star | 44.20 | 29.47 |
| One-line name block (Fern/Peggy) | 44.20 | 29.47 |
| Three-line name block maximum | 132.60 | 88.40 |
| Remove container/button minimum | 55.00 | 36.67 |
| Confirmation overlap band | 195.34 | 130.23 |
| Fern confirmation group, one question line + gap + buttons | 87.30 | 58.20 |
| Two-line question confirmation group | 114.60 | 76.40 |

The name track subtracts 6 px of borders, zero vertical padding, fixed rows
55 + 55 + 44.2 and three 5 px gaps from the card. The confirmation band subtracts
6 px of borders and top/bottom insets of 60/49.2 px. Its group needs `21×1.3×lines + 5 + 55`.
Even three question lines require only 141.90 board px (94.60 screen px).
The unchanged card bottom is 1025 board px, or 683.33 screen px, matching the scaled
55 px safe margin. Three and eight players share the same eight-column card geometry.

### Round 5 validation

Checks ran one at a time without load gating, each pnpm launch prefixed with
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; Vitest used `VITEST_MAX_WORKERS=2`.

- App suite with the requested DOM/layout-fixtures/team-polish exclusions: passed,
  52 files and 529 tests.
- TypeScript build: passed; TypeScript clean passed and removed emitted files.
- ESLint for apps/web: passed with no warnings.
- Design lint: passed, 495 files scanned.

### Round 5 close-out and requests

**the integrator runs the DOM test, verify and UAT to round4**. The height calculations
above explain the CSS budget; browser bounds, scroll checks and visual acceptance remain
pending. No DOM test, verify, UAT, perf, install or commit was run. No shared trackers,
contracts, PRD, DESIGN, PERFORMANCE, DECISIONS, backlog or lockfile were edited.


## Round 6 — roster revisions, LAN identity and C-27 integration

PLAT-011: roster-only views pass through viewChannel without changing its revision or
latest action mapping. The regression sends a game view, a roster view and an action
against the game revision. Integration coverage exercises a leader teams action after
roster changes. Removal returns immediately through room authority, without reaching
teams, picker input or session control. Removed browser identities retain only the newest
64 entries, with reducer coverage for eviction.

Phone identities use 32 getRandomValues bytes encoded as hex, including LAN HTTP contexts
without randomUUID; storage denial still keeps a stable tab identity. The removed screen
uses the ordinary status template, the requested title and detail, and Join another room.
The existing phone-copy test exempts this exact requested apostrophe from its typographic
apostrophe rule. Re-entry remains subject to the existing browser-id refusal.

The TV card has one panel treatment on its outer seat; seat-content keeps its layout and
border. Only cards with Remove use the 21 px connection text; empty cards retain 34 px.
A body-height leader track would be 44.20 px, reducing the name track to 125.34 px,
which cannot contain the 132.60 px three-line name. Therefore the requested fallback
keeps the leader track and confirmation inset at 34 px, explicitly gives Leader display
line height and centres its block SVG in a flex row, avoiding an inline descender box.
The Round 5 table above now names this fallback and includes the leader height.
These are CSS calculations; browser fit and visual review remain for the integrator.

C-27: the local TV seat has no Remove control and is omitted from the leader phone's
roster. A local leader receives no roster view; host coverage checks this and local input
coverage confirms that a roster view cannot affect its mapping. Existing removal-test
expectations need no changes: their candidates are all connected phones, so seat 2 still
follows seat 1. New cases cover a local seat 2 preceding phone seat 3: removing leader 1
chooses connected phone 3; with phone 3 disconnected, local seat 2 is the fallback.

The UAT fit check waits for the resize listener's min(width/1920, height/1080) root scale,
loaded fonts and two identical consecutive geometry/scroll measurements before asserting
once. Failure screenshots use h.shot and therefore the run's evidence folder. The TV
removal step uses arrows to focus Remove, Enter to open, an arrow from Cancel to the
confirmation Remove, and Enter to confirm, then asserts removal and the lobby remaining.

### Round 6 validation and remaining blocker

Checks run one at a time with the requested pnpm environment and exclusions. The
repeat suite passed 111 files and 2,000 tests, skipped one, and failed one integration
test. packages/platform/src/room/removal.test.ts passed, including the cap and C-27
phone-first election cases. TypeScript clean/build/clean passed. ESLint passed without
warnings; design lint passed (521 files). git diff --check passed. No forbidden DOM,
layout-fixtures or team-polish test was run.

**B1 remains blocked by the allowed path boundary.** packages/netcode/src/peer.ts
sendHost suppresses consecutive view messages with the same revision and retains that
revision for every view kind. With roster views correctly passed through at revision 0,
subsequent revision-0 rosters are dropped; a roster can also suppress a game view with
that revision. The real transport integration test now exposes this: leader roster lacks
Moss after the roster changes. A complete fix needs that transport's view deduplication
to ignore room-players for both comparison and retained revision, plus its regression
test. Permission for those extra netcode files was requested; they remain unedited.
The integration action and local-roster assertions remain in place beyond that failure
for the integrator to rerun once the transport is corrected. No complete B1 pass is claimed.

Round 6b (PLAT-011): B1 resolved with a generic optional revision-space flag on peer.sendHost, forwarded by the production app wrapper and integration fixture; roster views neither compare nor retain private-view revisions, ordinary duplicate checks are unchanged, and netcode names no view kind; consecutive-roster/ordinary-duplicate regression and real integration pass (116 files, 2,118 tests passed, one skipped); TypeScript passed after fixing test literal typing, clean passed, ESLint passed without warnings, and git diff --check passed; all checks ran sequentially with 600-second limits; prior round-6 changes remain uncommitted and DOM tests remain for the integrator.

### Round 6 close-out and requests

DOM files changed, not run: apps/web/src/host-kick-layout.dom.test.ts and
apps/web/src/removal.dom.test.ts. The integrator runs them and reviews UAT screenshots.
No verify, UAT, install, commit, push, merge or sparse-checkout change was performed.
No shared trackers, PRD, DESIGN, PERFORMANCE, DECISIONS, backlog, lockfile or contracts
were edited.

Integrator UAT command:

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5310 KAKI_PORT_SIGNAL=5311 KAKI_PORT_UAT=5312 pnpm uat -- C-23-host-kick --phones 3 --out round6
```

## Round 7 — leader row font overflow (PLAT-011)

The `Seat` span at `host-route.tsx:60` contains the leader star and label, a held-seat
countdown, or a non-breaking space. Round 6 introduced a 34 px height and display
line-height (1.0) in `remove-player.css`, replacing the body line-height. The reported
37 px scroll extent on every card, including non-leaders, is consistent with text font
metrics exceeding that tight line box; neither padding nor the leader SVG explains the
non-leader failures. Git history identifies the round-6 override, rather than a font
change from main, as the regression.

The leader grid track and box now use `--ka-space-55`, with `--ka-line-body` (1.3).
The confirmation bottom inset reserves the same enlarged row. Leader type stays 34 px;
the OQ-054 status-line exception remains scoped beside Remove. No type approval is expanded.
The existing DOM test now waits for fonts and rejects leader scroll overflow even when
CSS overflow is visible, for three/eight players at both TV sizes before/during confirmation.
It remains for the integrator to execute; the requested unit run excludes browser tests.

### Round 7 checks

Commands ran sequentially with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`, all well below
ten minutes. Vitest used `VITEST_MAX_WORKERS=2` and the requested exclusions.

| Check | One-minute launch load | Result |
| --- | --- | --- |
| App/UI unit tests | 4.19 | 613 passed, 57 files |
| TypeScript build | 6.78 | Passed, no diagnostics |
| TypeScript clean | 6.14 | Passed |
| Requested ESLint | 5.80 | Passed, zero warnings |
| Design lint | 5.83 | Passed |

### Round 7 close-out and requests

Layout fix and DOM regression assertion are ready for review. Integrator: run the DOM test
and three-phone UAT to confirm loaded-font geometry and inspect the remaining nickname and
confirmation space. No browser test, verify, UAT, perf, install or commit was run here.

## Round 8 — review 3 fixes (PLAT-011, PLAT-024, PLAT-009)

M-1 restores space for three nickname lines: the leader track and box use
`calc(var(--ka-type-34) * var(--ka-line-body))` (44.2 board px), with zero block
padding reclaiming 10 px. The confirmation reserves that same leader track plus the
5 px gap at its bottom (49.2 px); its top inset is 60 px. The corrected geometry table
above supersedes the intermediate Round 6 and Round 7 numbers (M-3).

The card remains 310.54 board px high, ending at 1025, with a 135.34 px name track
for the 132.6 px three-line name. At 1280 × 720 these are 207.03 px high, bottom
683.33, name track 90.23 and three-line name 88.4. These are computed values,
not browser measurements; geometry is unchanged before and during confirmation.

M-2 limits 21 px connection icons to cards with Remove. Empty seats and the local TV
seat retain 34 px icons and use the whole connection row. The confirmation buttons
use an inset focus outline (should-fix 1). The DOM fixture now includes three-line
CJK leader and emoji non-leader names, a local TV seat without Remove, and icon-size
assertions, with safe-margin and scroll checks before/during confirmation at both
TV sizes and three/eight players. Confirmation buttons explicitly reject horizontal
overflow (should-fix 2 and 4).

The host regression sends removal from a connected non-leader and spies on session
control and the team notice-map deletion at the team-input boundary. A real team
action first proves the latter spy target; unauthorised removal must reach neither
path or change the players (should-fix 3). Removed-phone copy now uses “can’t”, and
the unfiltered apostrophe assertion covers every phone state (should-fix 5).
`view-channel.ts` adds only the reserved-view-kind comment requested for should-fix 7.
Should-fix 6 remains deferred for a copy decision. The UAT leader phone now joins
with the three-line CJK nickname; the existing flow and assertions are retained.

### Round 8 checks

Checks run sequentially with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`, with a
ten-minute limit each. The unit run uses `VITEST_MAX_WORKERS=2` and all three
requested exclusions. All runs finished below ten minutes.

| Check | Final result |
| --- | --- |
| App/platform unit tests | Passed: 102 files, 1,641 tests; 1 existing skip (71.18 s final run) |
| TypeScript build (`pnpm exec tsc -b`) | Passed, no diagnostics; no newly emitted files outside dist |
| Requested ESLint | Passed, zero warnings |
| Design lint | Passed, 521 files scanned |

The first unit run exposed an over-broad revision getter spy in the new regression;
it was replaced with the notice-map input spy. The first ESLint run found an unnecessary
null guard in that test; it was removed. The final unit rerun includes that correction.
`git diff --check` also passes.

### Round 8 close-out and requests

Integrator: run `host-kick-layout.dom.test.ts`, `removal.dom.test.ts` and
`removal-layout.dom.test.ts`, then the three-phone C-23 UAT. Inspect both TV sizes,
the three-line leader mark, inset focus rings and confirmation button labels.
The browser regression was not run against either the old or new CSS because this
round expressly forbids browser execution. No verify, UAT, browser test, install,
commit, tracker, PRD, DESIGN, DECISIONS or backlog change was performed.

## Round 9 — review 4 should-fixes (PLAT-011, PLAT-024)

The unauthorised-removal regression retains the session-control spy and player count,
and checks visible team setup, enabled state and player assignments before and after
removal instead of spying on Map internals. A notice is unsuitable here: the ordinary
room-sync callback clears notices even for a refused removal. The TV Remove column fits its label with 5 px token padding
inside the border; its focus ring is inset, clear of Good. Vertical tracks and card
height are unchanged. Browser layout and visual acceptance remain for the integrator.

The UAT non-leader uses twelve emoji, the three-line worst-case fixture name. Reload
awaits `third.reload()`, asserts a changed document `performance.timeOrigin`, waits for
the refused state, then takes the still. There is no honest visible reload marker in
the built screen: the still may match the pre-reload picture; the document assertion
proves reload. No page content is fabricated. Should-fixes 1 and 4 remain with the
integrator and deferred respectively.

### Round 9 checks

All four requested checks ran one at a time with a 600-second timeout and
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; Vitest also used `VITEST_MAX_WORKERS=2`
and the three requested exclusions. All finished below ten minutes.

| Check | Final result |
| --- | --- |
| App/packages unit suite | Passed: 143 files, 2,579 tests; one skipped (33.22 s) |
| `pnpm exec tsc -b` | Passed; emitted root build metadata outside dist removed |
| Requested ESLint | Passed, zero warnings |
| `pnpm run lint:design` | Passed, 551 files scanned |

Initial unit runs exposed an overly strict nested-view matcher and the room-sync
notice-clearing behaviour described above; the final suite covers the visible team
state assertion. TypeScript initially caught a possibly undefined UAT array lookup;
a named non-leader constant fixes it. `git diff --check` passes.

### Round 9 close-out and requests

Integrator: run `apps/web/src/host-kick-layout.dom.test.ts`,
`apps/web/src/removal.dom.test.ts` and `apps/web/src/removal-layout.dom.test.ts`;
check card heights, safe margins, three-line names, button padding and focused Remove
at 1280, then run and visually review the three-phone UAT into round9. No DOM tests,
verify, UAT, install or commit were run here.
