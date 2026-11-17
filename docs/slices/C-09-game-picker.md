# C-09 — Game picker

## Goal and scope

Build the host game picker and its leader phone controls (PLAT-020, PLAT-021),
with authority passing with the room leader (PLAT-006) and host reload returning to
its restored lobby (PLAT-009). PLAT-022/023 are integration hooks only: this slice
adds no results, pause, quit confirmation or game screen.

Acceptance: every installed module supplies its own name, blurb and range; every
tile remains focusable when unavailable and explains why; counts and leadership
update immediately; only the connected leader can navigate/select/start; the same
keyed tile grows and shrinks; reduced motion keeps state with no movement; Start
crosses the session start boundary once; restored rooms return to the lobby.

Out of scope: game art (A-09), settings (C-13), team setup (C-11), controller kit
(K track) and game rendering. Round 2 attempts the requested browser UAT; the
required memory gate is blocked by this sandbox (see Round 2 below).

## Implementation

**Historical: superseded by fix rounds 2–6 below, including the leader hook and FLIP paragraphs.**

The C-console backlog in this checkout carries explicit “For C-09” notes from
C-07 and C-08. It contains no separate C-10 carried-note paragraph. C-10's slice
Requests §3 and its session contracts were also read: preload/setup, authenticated
input routing, room expiry and pause/results/error/picker rendering belong to
the future app session adapter, not to this picker screen.

`game-registry.ts` is the sole list of installed game modules. It reads their real
`meta` objects. Source imports plus TypeScript project references connect the
existing games without manifest, dependency-install or lockfile edits. Selection
snapshot validation now checks the registered module's settings schema instead
of always returning false. No selection settings are invented or persisted by
this picker; its transient focus and screen are discarded on host reload.

`packages/platform/src/picker.ts` is the pure state machine; `host.ts` authenticates its inputs by
connection and forwards the public projection to each connected seated phone.
Revision numbers fence delayed input after navigation and room changes while picking. The lobby projection is deliberately empty and stable: existing room messages carry its player count and leader flag. Existing
room seating/reconnect messages continue on the same ordered channel. A phone
supplies neither a leader flag nor a seat number in a picker input.

`createHost` now exposes room/picker projections, `leaderInput`, `roomInput` and
`returnToPicker`. Optional session hooks receive `start(gameId, room)`,
`updateRoom(room)` and `stop()`. Start changes to `starting` before invoking the
hook and cannot invoke it twice. C-10 has a pure runner, transport contracts and
lifecycle events, but no rendered shell or app preload/setup adapter. The browser
therefore remains at “Starting…”; it does not claim that a game has begun. The
room's protocol phase stays `lobby` during these pre-game screens, so joining
and changing counts remain possible. The future session adapter owns changing it
to playing and feeding `returnToPicker` from runner events.

One platform hook was missing: `HostEvent {type: 'leader', seat}` in
`packages/platform/src/room/room.ts`. It permits trusted shell hand-over only to
a connected existing seat and emits the existing leader-change effect. Phone
room events cannot use it. No reconnect, game or session contracts were edited.
The picker adds no hand-over screen; the trusted room hook makes a hand-over
observable immediately and ordinary leader departure uses existing election.

`picker-route.tsx` keeps each game tile keyed and mounted during focus, expansion
and collapse. Measured rectangles feed the UI token `expand` helper (FLIP);
collapse uses the existing 0.8 exit duration. The surface is one persistent node,
with start details crossfading inside. Lobby/picker screens overlap using 4A.
All surfaces inherit the UI theme's single treatment. Picture and setup slots
are empty and named in the DOM; no placeholder artwork or settings UI is drawn.

## Board readings — sentences for the integrator to record

1. “C-09 uses board 3 option 2A: the focused tile occupies the primary column at
   1.618 : 1 beside the other tiles stacked in the secondary column; focus is
   additionally identified by a heavy outline and the words ‘Focused game’.”
2. “The chosen lobby 1B does not show a picker trigger. A seated connected
   leader's phone offers ‘Pick a game’; returning from the picker uses Back.”
3. “Board 4's leader screen puts navigation on the left and Pick/Back on the
   right. Until the controller kit exists, C-09 uses large Previous, Next,
   Select and Back buttons beside ‘You choose the game’ and ‘Watch the TV.’;
   controls stack when held upright, as D-095 allows.”
4. “Other phones show the current leader's name, the focused game and its
   unavailable reason. Leadership changes replace the controls immediately. The room’s Leave action remains available on every phone while picking.”
5. “The inspected board 3 has no separate start-screen function. The selected
   tile grows across the picker area and shows its declared name, blurb, range,
   seated players in a primary column beside the metadata at 1.618 : 1, and instructions naming Start and Back on the leader's phone;
   settings and team setup remain empty named slots for C-11 and C-13.”
6. **Superseded by rounds 5–6 (the FLIP / one-persistent-node reading).** “Board 5's same-object expansion is implemented with the token FLIP helper
   on the existing tile, ease-in-out at 377 ms, reverse at 302 ms, with a content
   crossfade and no bounce. Reduced motion applies the final layout directly.
   Lobby/picker overlap uses the chosen 4A screen crossfade.”
7. “C-09 retains the Marble table surface and paper-gradient panels on every
   picker tile until game pictures exist. It draws no suits, question marks,
   mock kitchens or other placeholder art.”
8. “Board 6 corrections apply through existing tokens: dark seat numerals,
   corrected secondary ink, scale-only type and no blur. TV metadata and reasons
   are at least 34 px at 1080p, including in the side tiles; the board's smaller
   metadata sample is raised to the required reading floor.”
9. “Installed metadata is authoritative: all three modules, including Tabao
   Rush, currently declare 1 to 8 players. The board's sample Tabao Rush range
   and sample blurbs/durations are not copied into the app.”
10. “Player count means all seated players, including held seats, matching the
    existing room and C-10 runner; disconnected players are labelled ‘Seat held’
    on the start screen.”
11. “Navigation wraps through registry order, including unavailable games. A
    count change keeps the focused or selected tile, updates its reason, and
    prevents Select/Start while unavailable. Phones disable those action buttons;
    the TV tile remains focusable so its reason can be read.”
12. “The registry imports the existing game source entry points and adds only
    app TypeScript project references, because package manifest/lockfile edits
    are outside C-09's authority. No dependency is installed.”

## States and copy

| State | Host | Leader phone | Other phones |
|---|---|---|---|
| lobby | Existing lobby, code and seats | Existing lobby; Pick a game | Existing waiting copy |
| picker | Pick a game; [name] chooses on their phone; Focused game; declared name, blurb, N to N players | You choose the game; Watch the TV.; focused name; Previous, Next, Select, Back | [name] is choosing; Watch the TV.; focused name |
| unavailable | Needs N to N players on the tile | Same reason; Select/Start disabled; navigation and Back remain | Same reason |
| start | Ready to play; declared metadata; Who’s in; seat numbers/names; [leader]: Start or Back on your phone | Start, Back; focused name and any reason | Leader name and chosen game |
| starting | Ready to play; Starting… within the same tile | Starting…; no picker controls | Starting… |
| reload | Existing restored lobby; picker discarded | Reconnect to the restored seat, then lobby | Same |

## Protocol additions (version remains 1, before first deployment)

- Phone → host `picker-input`: `v`, `t`, non-negative integer `revision`,
  `input` in `open | previous | next | select | back | start`.
- Host → phone `picker-state`: `v`, `t`, `revision`,
  `screen` in `lobby | picker | start | starting`, nullable accepted `leaderName`,
  nullable public `game {id, name, blurb, min, max}`, nullable plain `reason`.
- Existing reliable ordered channel and size/version validators are reused.
  Neither payload contains tokens, settings, game state or private views.
- Existing generic protocol round-trip samples include both new messages;
  dedicated tests cover every action/screen and malformed/bounded fields.

## Demo URLs and UAT script

Development only; replace the origin with this worktree's web origin. `players`
accepts 0–8; `focus` accepts `tabao-rush`, `peek-poker`, `rabakz`; `state` accepts
`start` or `starting` (omitting it shows picker). `slow=K` multiplies motion;
`change` performs one change after two seconds. The production build scans for
picker demo/fixture markers in addition to the existing budget scanner.

| URL | Photograph |
|---|---|
| `/host?demo=picker` | Default four-player picker |
| `/host?demo=picker&players=0` | All games unavailable with their reasons |
| `/host?demo=picker&players=1&focus=tabao-rush` | Real solo availability |
| `/host?demo=picker&players=8&focus=peek-poker` | Side tiles and eight-player state |
| `/host?demo=picker&players=8&focus=rabakz&state=start` | Start screen, Who’s in |
| `/host?demo=picker&players=4&focus=tabao-rush&state=starting` | Starting boundary |
| `/host?demo=picker&players=4&focus=peek-poker&slow=4&change=expand` | Expansion frame strip |
| `/host?demo=picker&players=4&focus=peek-poker&state=start&slow=4&change=collapse` | Collapse frame strip |
| `/host?demo=picker&players=4&focus=tabao-rush&slow=4&change=focus` | Focus move frame strip |
| `/play?demo=picker-leader` | Leader controls, landscape and portrait |
| `/play?demo=picker-watcher` | Watcher, focused title and choosing leader |
| `/play?demo=picker-leader&state=start` | Start and Back |
| `/play?demo=picker-watcher&state=starting` | Watcher starting |
| `/play?demo=picker-leader&players=0` | Unavailable reason and disabled Select |

Integrator: photograph the host at 1280×720, 1920×1080 and 3840×2160 with no
scrolling. Photograph leader and watcher at 844×390 and 390×844. Capture expand,
collapse and focus strips at `slow=4`, then reduced-motion final states. With
real pairing, seat two phones, open, move, select, Back, select, Start; check the
watcher after each step. Reload during picker and start, confirm restored lobby;
leave the leader while picking and confirm control passes. Validate focus and
unavailable text with keyboard and a screen reader. All games are available for
real supported room counts; the zero-player demo proves unavailable layout.

## Validation

Automated: pure transition tests; real module range boundaries; wrong/stale
leader input; unavailable selection/start; trusted hand-over validation;
real host/two phones through SignalRoom and PeerHub; watcher focus; Back and
Start; exactly-once session hook; hand-over/leave/reload; protocol validators.
Production bundle measurement (existing budget functions, whole deployed shared
entry): host/controller/deploy each **199,049 bytes raw; 67,052 bytes gzip**.
Controller limit: 300,000 bytes gzip; host limit: 1,500,000. Both production scans
pass. These are transfer sizes, not browser frame-time or interaction measurements.
Final `VITEST_MAX_WORKERS=1 pnpm verify` passed (exit 0): 136 test files,
3,129 tests passed and one existing skip. Workspace, typecheck, ESLint, design
lint (270 files), build budgets, production fixture scans and trace check passed.
The two-worker run had only the known unchanged Tabao Rush recipes conformance
timeout; the one-worker rerun passed without changing the test or its limit.
`git diff --check` passed. See `uat/evidence/C-09-game-picker/verify-tail.txt`.
No browser UAT or screenshots have been performed by this agent.

## Round 1 corrections (supersedes the initial board readings and copy above)

PLAT-020/021, PLAT-006/009 and NFR-A11Y: removed the debug-style tile labels;
focus retains aria-current, the heavy outline, larger primary tile and elevation.
The header caption names the leader and focused game; an empty room waits for a
player. The start header names who can start, without a second instruction line.
The same expanded tile retains its empty picture slot. Picture/metadata versus
Who’s in uses 1.618:1 columns; the contained picture slot has a 1.618:1 aspect.
Seat names and numerals use the TV 34 px token. Settings/team setup is a named,
empty zero-height slot. The unavailable sentence states the current minimum or
maximum violation, with a warning icon, separately from the declared range.

The phone header carries Leave at its far right, outside the controls. Previous
and Next share a row with directional icons; Select/Start use chip fill/ink tokens.
Start names the game in the heading. One persistent live region uses a pure
state/focus selector: unchanged text remains unchanged on unrelated renders.
Unit tests cover that invariant; the UAT script additionally observes live-region
mutations on real focus input. No claim of screen-reader/browser acceptance is made.

Each game now exports `meta` from `src/meta.ts` and re-exports it from its index.
The picker imports only those files. A metadata equality test prevents drift from
the existing module declarations without changing game rules. Only the browser
host start hook calls the dynamic module loader. C-09 still has no game renderer.
Stored selection checks use loaded module schemas and fail closed for unloaded
modules; C-09 writes selection:null, so its room restoration needs no rules.

`uat/slices/C-09-game-picker.mjs` covers real leader/watcher pairing, focus,
select/back/select/start, departure hand-over and picker reload to lobby. All real
supported counts permit every current game; after hand-over, the remaining phone
also leaves to produce a real zero-player unavailable picker. Demos cover its layout too. It captures settled host/phone states, both phone orientations,
720p/1080p/4K host states, slow=10 focus/expand/collapse strips, first-frame
mid-transition and persistent-node assertions, and reduced motion. It asserts no
phone rule requests during the real flow. This script has not been run here.

## Round 1 bundle measurement

Before (measured from the existing dist before replacement): 199,049 bytes raw,
67,052 gzip, all in the initial shared entry graph. After: initial HTML/JS/CSS
147,026 bytes raw, **50,673 gzip** (16,379 bytes / 24.4% less gzip). The production
manifest has no static dependency from that entry to any game index or RNG chunk;
all three game entry points are dynamic. The host start hook alone invokes them.
Including every dynamic chunk, the unchanged conservative budget scanner counts
203,635 bytes raw / **70,155 gzip** for host/controller/deploy. This is the full
deployed inventory, not the phone’s initial transfer. No scanner was changed.
See `uat/evidence/C-09-game-picker/round1-fixes-bundle-{before,after}.json`.

## Round 1 verification

`VITEST_MAX_WORKERS=2 pnpm verify` passed, exit 0: 141 test files, 3,153 tests
passed and one existing skip. Workspace, typecheck, ESLint, design lint (275 files,
no new exemptions), production fixture scans, both bundle budgets and trace check
passed. No check thresholds or timeouts changed. The old phone-message source
assertion required the stale lobby text: it now requires the state-aware selector
while retaining its single-region and clipped-layout assertions. New selector tests
cover current states, focus, leadership, reasons and unrelated render inputs.
Final UAT-script ESLint, final CSS design lint, script syntax and `git diff --check`
also passed. Evidence: `uat/evidence/C-09-game-picker/round1-fixes-verify-tail.txt`.
Browser UAT was not run.

## Close-out

Round 1 implementation is prepared for integrator review. Browser rendering,
real pairing, screenshots, strip timing, screen-reader behaviour and no-scroll
assertions remain unverified here, as requested. The committed round1 evidence
and the integrator’s REPORT.md section were left untouched.

## Requests

Integrator: run `pnpm uat -- C-09-game-picker --phones 2 --out round2 --max-mb 64`
and inspect every screenshot/strip, especially the empty picture area, eight-seat
start screen and phone Leave separation. The larger evidence allowance is for
lossless 4K captures; no verification budget or existing limit was changed.
Record the corrected board readings above instead of the old debug-label/start
composition sentences. C-10 integration must consume the host-loaded module,
provide loading/error rendering and restore saved selections with a schema
strategy before persisting non-null selection; this slice persists none.
Settings and team slots await C-11/C-13. Rules and rendering remain outside scope.

## Round 2 — D-098 (supersedes earlier layout/motion and close-out readings)

Read the integrator's D-098 in the main checkout, board 5's inset-mask example,
and UI `expand`/`collapse` clip mode. Requirements: PLAT-006/009/020/021,
NFR-A11Y, NFR-DES, NFR-TEST; PLAT-022/023 remain C-10 integration work.

Must-fix history: the initial implementation used transform expansion, hid the
other tiles too early, left outgoing start content in flow, and swallowed loader
errors. Round 1 removed debug labels and separated metadata imports, but did not
resolve those motion/failure issues or the D-098 start composition. Round 2:

1. **Motion:** the keyed tile uses `expand(..., {mode:'clip'})` and the reverse
   `collapse` at the helper's `exitDuration('slow')`. Expanded content has its
   final layout immediately. Collapse retains a full-sized mask canvas while its
   incoming content already has the final collapsed dimensions. Only the separate
   `.game-surface` uses FLIP scaling on focus changes; content translates and the
   metadata crossfades between independently sized copies. There is no per-frame
   JavaScript counter-scaling.
2. **Layers:** siblings remain visible beneath expansion until the mask finishes;
   collapse exposes them in its first render. The focused tile stays above them.
3. **Collapse/header:** outgoing start details are absolute and clipped within
   the collapsed tile. Removing them cannot alter metadata layout. Header copies
   crossfade in their own unclipped layer above the tile. A shared header height
   keeps the stage stable between picker, start and starting.
4. **Phone Leave:** both lobby and picker Leave buttons use `ka-panel`,
   `ka-pressable` (UI press scale 0.97), minimum 55×55 and phone type 21. Header
   wrapping and 21 px spacing accommodate the larger button. The harness checks
   geometry/clearance on lobby, leader, watcher, start, starting and disabled
   screens in both orientations; screenshots remain pending below.
5. **Empty room:** platform `pickerRoom` returns picker/start/starting to lobby
   when the final seat leaves; unit coverage covers all three. Real UAT now
   expects the lobby's room code, rather than three unavailable picker tiles.
6. **Loading:** `session.start` returns a promise. Select prefetches the focused
   module; Start shares that promise. Rejected loads are evicted for retry and
   return to start with “Could not load <game>. Try again.” on TV and phone.
   A load attempt remains valid across room revisions; stale attempts cannot
   replace a newer screen. Tests inject a failing loader, exercise prefetch/Start
   sharing and retry, and reject a start while another seat joins. Successful
   loading still stops at the C-10 boundary: no game is rendered or declared playing.
7. **Start:** B is production default: bottom seat strip, picture/text above at
   1.618:1, metadata aligned to the lower baseline. The picture slot has one
   subtle gradient treatment and a visible dashed edge. TV copy is “<Leader>
   starts the game on their phone”; watcher start copy names that leader and the
   chosen game. Visible phone headings no longer repeat the game below them.
   Picker/start headers use type 89. A/C CSS and `art=1` neutral procedural stripe
   pattern are imported only by the dev demo. No bitmap, real art or external
   image file is used. Production scans find no A/C selectors, pattern or hooks.
8. **Ownership:** state machine and transition tests moved to
   `packages/platform/src/picker{,.test}.ts`. They accept metadata, contain no
   installed-game knowledge, and are exported by platform. App code owns registry,
   views, transport and loading wiring; the old app state-machine file is removed.
9. **Revisions:** room updates fence inputs only for leader/count changes.
   Tests cover another player's rename, refused join and the leader pressing with
   the pre-rename revision.
10. **Flood:** one accepted action per leader per UI `fast` duration; extra
    inputs return before state/layout publication or picker broadcast. Tests
    assert no work at `fast - 1` and acceptance at the exact boundary.
11. **Disabled:** Select/Start use secondary text, panel fill, dashed borders and
    a strike-through, with the availability reason on the phone. Both picker and
    start disabled demo states have harness captures. A load failure permits retry.
12. **Metadata:** Rabakz imports `./meta`; Peek Poker and Tabao Rush modules import
    `./meta` pure leaves beside their rules modules. Their public `src/meta.ts`
    entries re-export only those data leaves. This preserves the unchanged
    conformance scanner's import boundary and keeps simulation/content out of
    the metadata dependency graph. UAT excludes exactly `rules/meta.ts` from its
    forbidden simulation-request pattern, retaining every other rules/index check.
13. **Trusted leader event retained:** its requirement is **PLAT-006**, leadership
    transfer and immediate authority changes. `roomInput` remains a trusted shell
    hook; a phone cannot invoke it. There is no hand-over UI in C-09. Automatic
    departure/grace election remains the production path. No room contracts or
    files outside the picker portion of platform were changed in this round.
14. **Real metadata:** each installed game's real metadata passes
    `validateHostMessage` in a picker-state; the 89-character blurb bound is explicit.
15. **Other coverage:** count reads protocol `MAX_PLAYERS`, the same cap used by
    room seating; host picker has a polite live region. Resize remeasures stored
    rectangles after layout. Tests cover grace hand-over, leader reconnects in
    picker/start, joins during picking and phone reloads in picker/start/starting.
16. **Harness:** repeated Back/reselect/starting stills became assertions.
    `picker-demo-change` is a dev-only window event, triggered after settling;
    no picker change races a two-second timer. Strips use four stage-clipped 720p
    frames. Default `--max-mb` remains 12; actual output size is unmeasured because
    the memory gate prevents launch. The 12-image layout/art matrix is a separate
    scenario selected by `C09_DEMO_MATRIX=1`, at 1080p with A/B/C × 1/8 × art 0/1.
17. **Handoff/performance:** the obligations below supersede the old Requests.
    The clip mask's frame time on the actual TV is **unmeasured (PERF-002)**.

No protocol change was necessary: the existing nullable public `reason` carries
load failure copy as well as availability copy. The phone enables retry for the
load-failure sentence; host authority still checks the real player range.

### Round 2 demo URLs

For this worktree the harness derives `http://127.0.0.1:5170` (signal 5171), unless
ports are overridden. For a manually started dev server use its actual origin.

- `/host?demo=picker&state=start&layout=b&players=8&art=0` — production layout.
- `/host?demo=picker&state=start&layout=a&players=8&art=1` — dev option A.
- `/host?demo=picker&state=start&layout=c&players=1&art=1` — dev option C.
- Vary `layout=a|b|c`, `players=1|8`, `art=0|1` for the complete board.
- `/host?demo=picker&state=start&failure=1` — TV load-failure copy.
- `/play?demo=picker-leader&players=0` — disabled Select and reason.
- `/play?demo=picker-leader&state=start&players=0` — disabled Start and reason.
- `/play?demo=picker-leader&state=start&failure=1` — retry on load failure.
- `/play?demo=picker-watcher&state=start` — leader/chosen-game copy and Leave.
- `/play?demo=lobby&leader=1` — lobby Leave.
- `/host?demo=picker&slow=10&change=expand` — after settling, run
  `window.dispatchEvent(new Event('picker-demo-change'))`. Also supports `focus`
  and `collapse` (add `state=start` for collapse). This hook is absent in production.

### Round 2 Close-out

Implementation and automated evidence are prepared for integrator review. The
full one-worker verify passed: 142 test files, 3,160 tests and one existing skip;
workspace, typecheck, lint, design lint, build/budgets, production scans and trace
check passed. No dependency, lockfile, check limit or design-lint exemption changed.
A final verification rerun is recorded in `round2-fixes-verify-tail.txt`.

Bundle measurement: initial HTML + static JS/CSS **151,132 raw / 51,623 gzip**;
full deployed shared host/controller graph **207,365 raw / 70,880 gzip** (limits
1,500,000 / 300,000 gzip). The manifest keeps all three game entries dynamic.
`round2-fixes-bundle.json` records sizes, manifest and zero production marker hits.
`round2-fixes-targeted.txt` records the 30 picker/browser/platform integration tests.

UAT was attempted with the unchanged 12 MB cap. The required memory gate failed
before servers or browsers launched: sandbox `sysctl hw.memsize` is denied.
See `round2-fixes-uat-attempt.txt`. No new screenshot or strip has been captured
or visually reviewed; UI geometry, motion and the evidence-size cap are not
claimed as browser passes. Existing integrator REPORT sections and round folders
were left untouched.

### Round 2 Requests / C-10 obligations

Integrator: run and inspect both scenarios outside this sandbox:

```sh
pnpm uat -- C-09-game-picker --phones 2 --out round2-fixes
C09_DEMO_MATRIX=1 pnpm uat -- C-09-game-picker --phones 2 --out round2-matrix
```

C-10 must use the loaded module returned by `session.start`; await its **preload
and setup** before changing the room phase to `playing`; preserve the plain
failure/retry path; wire `returnToPicker` from results and quit for **PLAT-022/023**;
register settings schemas **before** restoring a stored selection; and ensure
**A-09 pictures preload with the host shell**. C-09 persists selection:null and
successful Start remains at Starting… until that adapter exists. Settings/team
slots remain C-13/C-11 work. Per D-098(e), Previous, Next, Select and Back are
interim phone controls until the K track supplies board 4's stick with Pick/Back.
Measure clip-mask frame time on the real TV under PERF-002 before making a frame
budget claim. The DOM-only layout options add no production payload; eventual
per-game pictures count against PERF-022.

## Fix round 3 — mask lifetime and trailing input (PLAT-020/021, NFR-DES)

The round 3 REPORT and failure images 10, 11 and 12 were read/opened. The TV
retained the collapse mask after temporary full-canvas layout was removed; both
phones remained in picker because the next Select was discarded by the host's
fast-window early return.

`apps/web/src/picker-animation.ts` now owns mask playback and temporary tile/content
geometry. Finish, cancellation, resize and disposal cancel the filled animation,
remove temporary styles and return to CSS layout. No `commitStyles` is used.
Interruption snapshots the current computed inset rectangle before cancellation;
the next animation starts at that rectangle on a canvas containing both endpoints.
Computed CSS shorthand and host coordinate scaling are covered. Cleanup and new
playback happen synchronously in the layout effect, before another painted frame.
Renders that keep the expanded state (including Starting → failed-load Start) do
not restart the mask. Reduced motion changes layout immediately without playback.
The UI expand/collapse helper was inspected: its `fill: both` is deliberate, its
reduced variant has duration zero, and it does not call `commitStyles` or own an
Animation. The fault was in the picker caller; packages/ui is unchanged.

`apps/web/src/host.ts` accepts the first valid press immediately and keeps only
the latest further valid press until the remaining fast window ends. Applying it
rechecks the original revision and current leader. Retirement cancels the timer.
No limit or check was changed. The UAT Select, Back, Select sequence is unchanged:
a passive finish observer asserts clip-path:none and rect equality after each real
settled transition; explicit assertions also cover demo expand/collapse, reduced
motion and the failed-load start state. These assertions do not wait between the
three real presses.

### Regression proof

- Before the host fix, the new Back/Select-at-20ms test ended at picker (expected
  start), and the 100-Next test published zero trailing states (expected one).
- With the original finish behaviour extracted into the controller (remove layout
  styles, retain the filled Animation), the fake-Animation finish tests failed for
  both expand and collapse: cancel was called zero times, expected once. Restoring
  cleanup passes. Tests also cover external cancellation, both reversal directions,
  same-state interruption, resize/disposal, shorthand insets, host scale and reduced
  motion. This is controller-level regression evidence, not browser evidence.
- The existing failed-loader host test returns both host and phone projection to
  start. The route keeps expanded=true across starting → start, and mask completion
  always cancels the fill, so failure cannot retain a stale clip. The UAT failed-load
  assertion now checks the computed clip and final layout as well.

### Round 3 Close-out

Changes stay within apps/web, the C-09 UAT script and this slice note. No evidence
files were written. Verification results are recorded below after completion.

### Round 3 Requests

Integrator: rerun `pnpm uat -- C-09-game-picker --phones 2` and inspect the motion
and failure states. Browser UAT could not start here: the required
`tools/agents/memcheck.sh uat` gate failed because sandboxed `sysctl hw.memsize`
is denied. No browser or visual pass is claimed for this round.

Final `VITEST_MAX_WORKERS=2 pnpm verify`: exit 0; **143 files passed,
3,174 tests passed, one existing skip** (273.70 s). Workspace, typecheck, ESLint,
design lint (281 files), build/budgets and trace all passed. `tools/dev.test.ts`
did not fail; no isolated rerun was needed. The focused controller/host/integration
run passed **21 tests across three files**, including latest queued no-op semantics.
Final verify tail: host/controller/deploy 208,973 bytes raw / 71,479 gzip, within
existing limits; 152 requirements; trace check passed. Logs are outside the repo at
`/tmp/c09-before-input.txt`, `/tmp/c09-before-animation.txt`,
`/tmp/c09-targeted.txt` and `/tmp/c09-verify-final.txt`.

## Fix round 4 — shared phone header and TV start baseline

PLAT-006/020/021, NFR-A11Y and NFR-DES. Read the final REPORT section and
opened `round4-failure/23-phone1-demo-portrait-picker.jpg` before changing layout.

The shared seated header now owns Leave on lobby, rename, leader/watcher picker,
start, starting and failed-load screens. Portrait uses badge/name first, then
right-aligned connection/Leave. Landscape uses one row with an accessible connection
icon. Names wrap without ellipsis. Leave retains 55px minimum dimensions and 21px
text; 13px grid gap plus 8px margin separates it from connection, and 21px separates
header from content. All spacing uses existing tokens. The seated shell lays out
the intrinsic header and the remaining content height, replacing the fixed header
subtraction. Lobby identity is shown once in the header, with leadership in the
content. Narrow portrait and landscape picker controls use the existing 55px floor.

TV copy chosen: “<Leader> starts on their phone”, at the existing 55px heading
token, compensated for TV canvas scaling so the rendered size stays at least
55px at 720p, with a single-line fit assertion. The count sits on the second row
to reserve the full header width for the leader and instruction. Layout B's metadata aligns to the picture
slot's bottom edge; its overlap child no longer centres the metadata vertically.

The harness covers all eight requested dimensions, ordinary and twelve-W names,
leader/watcher picker/start/starting/unavailable/failure, lobby and rename, with
noScroll, full-name and leaveGeometry assertions. Representative stills are kept
instead of a still per geometry case, retaining the evidence cap. TV start stills
use the wide name at 720p/1080p/4K and assert a single line at >=55 rendered pixels and the layout B shared bottom edge.
The CSS-level regression checks prohibit clipped identities and fixed header-height
subtraction and require the Leave minimums and one shared seated header control.

### Round 4 Close-out

Only the authorised paths changed; no evidence files written. The browser memory gate was attempted:
`tools/agents/memcheck.sh uat` fails because sandboxed `sysctl hw.memsize` is denied.
No browser UAT pass is claimed.

### Round 4 Requests

Integrator: run the updated harness and inspect the representative phone stills and
TV start screens, including layout B's shared bottom edge. Browser geometry checks
remain pending in this sandbox.


Final `VITEST_MAX_WORKERS=2 pnpm verify`: exit 0; **143 files passed,
3,175 tests passed, one existing skip** (370.42 s). Workspace, typecheck, ESLint,
design lint (281 files), build/budgets and trace passed. `tools/dev.test.ts` did
not fail, so no isolated rerun was needed. A separate final-layout typecheck and
design-lint run also passed. `git diff --check` passed.

Verify tail:

```text
PERF-022 host: 210501 bytes raw, 71708 bytes gzip / 1500000
PERF-020 controller (shared entry): 210501 bytes raw, 71708 bytes gzip / 300000
PERF-022 deploy: 210501 bytes raw, 71708 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

Log: `/tmp/c09-round4-verify-final.txt`. The earlier full run passed all tests but
caught a new harness assertion's HTMLElement narrowing error at build; that was
fixed before the successful complete rerun. No check or limit was changed.

## Fix round 5 — motion ownership (PLAT-020, PLAT-021; NFR-DES, NFR-A11Y, NFR-TEST)

Read the integrator's final report and opened all three round5 strips plus real
selected shot 07 and demo settled shot 49. Focus now translates/resizes the tile
as one clipped opaque object, with the incoming focused tile above its neighbours.
Content is laid out at its final geometry without text scaling. Outgoing content
is a frozen, inert copy of the previous layout, ghosted at GHOST_OPACITY, with the
D-092(e) outgoing mask; incoming content uses the complementary reveal. Collapse
therefore keeps expanded seat tracks and text geometry, anchored at the tile's top
left, for the existing 80% collapse duration. The expand surface mask and sibling
coverage lifecycle remain in picker-animation.ts; no shared UI helper was changed.

The header discrepancy was CSS, not an early fit measurement: the start rule used
55 divided by screen scale, giving different board proportions at 1080p and 720p.
Real and demo now start from the same 89px token and measure available width with
a canvas, observing layout and rechecking document.fonts.ready. Count stays in the
first grid row alongside the heading in both screens.

The UAT script captures nine stage-clipped frames at 300ms intervals, with the
existing default budget and image quality unchanged. Each frame inspects every
nonempty text node's painted client rectangles after ancestor clips against its
own visible tile rectangle, counts title copies above the ghost token, and checks
outgoing collapse chips against their pre-collapse settled widths (1px tolerance).
Real selected captures now wait for tile settlement. No evidence files were written.

### Round 5 Close-out and Requests

Browser UAT and the resulting byte total need the integrator's run and visual
review. The required memory preflight cannot run in this sandbox: sysctl hw.memsize
is denied. No new browser/visual pass is claimed. Review the nine-frame focus,
expand and collapse strips and real/demo headings, including wide names.

Final `VITEST_MAX_WORKERS=1 pnpm verify`: exit 0. **144 test files passed;
3,177 tests passed, one existing skip** (467.83s). Includes the new outgoing-ghost
and interruption-cleanup tests in `apps/web/src/picker-content.test.ts`.
Workspace, typecheck, ESLint, design lint (283 files), build/budgets and trace pass.
`tools/dev.test.ts` passed; no isolated rerun was needed. No limit was changed.

Verify tail (`/tmp/c09-round5-verify.log`):

```text
PERF-022 host: 212163 bytes raw, 72204 bytes gzip / 1500000
PERF-020 controller (shared entry): 212163 bytes raw, 72204 bytes gzip / 300000
PERF-022 deploy: 212163 bytes raw, 72204 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

The harness additionally compares real/demo header font sizes at the same 1080p
viewport and leader name and checks count/first-line alignment on strip frames.
The load-failure still is now captured at 1080p rather than retaining the previous
4K viewport, leaving more of the unchanged 12 MB default for the nine-frame strips.

## Fix round 6 — review findings N1–N6 and S1/S3/S5/S6/S8–S12

PLAT-006/009/020/021, NFR-DES, NFR-A11Y and NFR-TEST. Opened round6
18/20/22 (twelve-W start headings), 17/19 (zero players), 11 (leader lobby)
and strips 47/58/69 before changing code. The integrator's D-104 rulings in
the brief supersede earlier descriptions of arbitrary header fitting, trusted
leader events, latest-only navigation and sentence-prefix failure detection.

- **N1/S10:** headings measure the first header grid column and choose exactly
  token 89 or 55. The header reserves one selected-size line and the status
  line. UAT compares text-range right edges with count.left − 34 and viewport
  width − 55 at 720p, 1080p and 4K, with twelve W characters.
- **N2 (historical; superseded by D-107/D-108 and round 10 below):** incoming/outgoing use lobbyMotion's complementary masks from time zero.
  Their shared boundary uses the existing ease-out token. The outgoing keyframes
  retain full ink initially and fade to the ghost token over the first third of its keyframes.
  Opacity retains lobbyMotion's own timing independently of the boundary's
  ease-out, so it cannot fade ahead of the wipe. Focus text stays bottom-aligned
  inside the moving tile; different-size copies share one physical boundary. The unchanged third tile moves without a
  wipe. Strips require at least one complete line above opacity 0.5 in each
  visible tile, and full opacity on unchanged tiles.
- **N3:** all painted tile rectangles are read before cancellation or grid
  mutation, including focus translations. Both completion and cancellation
  clear temporary content geometry. Unit regressions cover restarting at the
  painted box and resize cancellation. UAT samples consecutive animation frames
  around two real Next presses 60 ms apart and two interrupted demo focus moves.
- **N4:** the side picture's flexible slot can shrink to zero height; its dashed
  edge is an outline so it imposes no border minimum.
  Copy keeps its 21 px bottom padding. Original text ranges, before clipping,
  are checked against tile padding boxes at all three TV sizes with zero players.
- **N5:** lobby leaders see “Pick a game when everyone's in.”; watchers retain
  their waiting line. Covered by unit tests and real-phone DOM assertions.
- **N6:** nine frames at duration / 8 cover the final frame, clipped to the
  entire picker screen including the header and both columns. CDP sets half
  pixel resolution before animation starts, leaving CSS geometry unchanged;
  stills retain the original resolution and quality. The default cap stays
  12 MB; the integrator must measure the resulting run.
- **S1/S3:** freeze only the two content-changing tiles on focus or the selected
  tile on expansion/collapse; skip cloning under reduced motion. Snapshots
  retain layout via explicit snapshot attributes and CSS, with dimensions on
  the root only. A collapse clones the current open DOM, so joined/renamed
  seats are current. Previous style writes were the sum of every computed
  property count on every node of all three tiles (27P writes for the normal
  zero-warning picker, where P is the browser's computed-property count).
  Now snapshot writes are exactly 7 per root: **14 per focus**, **7 per
  expand/collapse**, **0 under reduced motion**; descendant style writes are 0.
  These counts exclude the unchanged animation geometry writes.
- **S5:** bounded signed navigation segments retain up to the game count of
  Previous/Next presses around the latest non-navigation action, preserving
  its arrival order. Flush publishes once. Original revisions and authority
  are checked before queueing and again when flushing. Tests include three
  rapid Next presses, mixed navigation/Select ordering, a stale phone packet
  via the transport callback, and real leader departure.
- **S6/S8/S9:** public failed flag replaces sentence parsing; retry copy stays
  the same. Disabled Select/Start use panel gradient, dashed secondary edge
  and secondary ink without strike-through; contrast tests cover both gradient
  ends. TV failure copy includes its warning icon; host live copy uses ordinary
  choosing/starting sentences.
- **S11/S12:** original Implementation and board reading 6 are explicitly
  historical. The unused trusted leader event is removed; the two app tests
  that invoked it now exercise departure/grace and departure/rejoin instead.

### Exact protocol changes for integrator acceptance and D-104

In packages/protocol/src/channel.ts, PickerState gains required boolean
`failed`; HOST_SHAPES['picker-state'] requires `failed: bool`. False means
the reason is availability copy (or null); true means the load failed and retry
is available. Version remains 1 before deployment. Missing/non-boolean flags
are rejected. Round-trip fixtures and malformed-flag tests are updated.
No other protocol field, bounds, input action or version changes.

The platform HostEvent union, validator and transition remove the trusted
`{ type: 'leader', seat }` event. This is a platform API deletion, not a wire
message change. Existing departure/grace election owns leadership transfer.

### Round 6 Close-out and Requests

No evidence files were written. Browser launch is blocked: the Vite server
cannot bind 127.0.0.1:5150 (listen EPERM) in this sandbox. Browser assertions,
visual motion correctness and the actual evidence byte count require the
integrator's UAT run and inspection. Run the unchanged default 12 MB scenario
and review every new strip and representative still. Accept/log the protocol
flag and platform event deletion above as D-104 before integration.

Final `VITEST_MAX_WORKERS=1 pnpm verify`: **exit 0**, 144 test files passed;
**3,186 tests passed, one existing skip** (483.30 s). Workspace, typecheck,
ESLint, design lint (283 files), build/budgets, production scans and trace pass.
The two-worker run passed all other files but tools/dev.test.ts observed zero
spawned services under load. Its isolated one-worker rerun passed all five tests;
the final complete one-worker verify also passes it. No check, timeout, size
limit, dependency or design-lint exemption changed. `git diff --check` passes.

Host/controller/deploy graphs are each **214,604 raw / 72,914 gzip bytes**.
Snapshot-write and shared physical boundary tests pass; browser correctness and
the 12 MB evidence result remain explicitly pending integrator UAT.

Verify tail (`/tmp/c09-r6-verify-one-worker.log`):

```text
Test Files  144 passed (144)
Tests  3186 passed | 1 skipped (3187)
PERF-022 host: 214604 bytes raw, 72914 bytes gzip / 1500000
PERF-020 controller (shared entry): 214604 bytes raw, 72914 bytes gzip / 300000
PERF-022 deploy: 214604 bytes raw, 72914 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

Other logs: `/tmp/c09-r6-dev-alone.log`, `/tmp/c09-r6-regressions.log`,
`/tmp/c09-r6-shared-boundary.log`. No evidence directory was modified.

### Round 7 — interrupted focus geometry (PLAT-020)

Tile grid placement and the layout-driving focused/expanded attributes now belong
solely to the layout effect. Previously render owned their update while painted
capture and cancellation were split across render and the effect: an interrupted
transform could be combined with a changed grid base. The effect now reads all
painted rectangles with the previous animation applied, reads any visible clip
before clearing it, cancels and clears temporary geometry, applies all new tile
layouts, then measures all untransformed destinations before starting any move.
Focus keyframes use painted minus destination coordinates and painted sizes.
Interpolation between stage-contained endpoints has no positional overshoot.

The fake element's bounding rectangle includes its active translation and animated
size relative to its current grid base. At 60 ms and 144 ms interruptions, all
three successive presses assert zero difference between the captured painted box
and the replacement's first frame. The existing real Next continuity check retains
its timing and limit and additionally checks stage bounds expanded by 1 px on every
recorded frame for the whole second.

Other paths checked: a focus press during an expand's collapse captures the clip's
visible rectangle before clearing its canvas and changing the grid, then uses the
same focus keyframes. Resize intentionally cancels movement and clears content and
clip geometry, settles to the current resized grid and refreshes the stored boxes;
no old animated transform is used as a destination. Existing clip-interruption,
scaled-inset and focus-resize cleanup tests cover their geometry/cleanup helpers.

### Round 7 Close-out and Requests

No evidence files written; real UAT and visual inspection remain with the integrator.
No dependency, limit or check changed. Verification result is recorded below.

Verification: static checks pass (workspace, typecheck, ESLint, design lint),
all 143 non-launcher test files pass, and separate `pnpm build` and `pnpm trace`
pass. Full verification did not pass inside this sandbox: the final one-worker
run reports 143 passed files / one failed file, 3,186 passed tests / two failed /
one skipped; both failures are tools/dev.test.ts observing zero child services
instead of two. Its first isolated one-worker rerun passed all five tests in
1.94 s; its final isolated rerun reproduces the two launcher failures (three
passed). No launcher code or test was changed. A preceding one-worker run passed
the launcher but the random-byte budget fixture matched the server-only word
scan. That fixture passed in the final full run. No limit was changed.

Logs: `/tmp/c09-r7-verify.log`, `/tmp/c09-r7-verify-one-worker.log`,
`/tmp/c09-r7-verify-final.log`, `/tmp/c09-r7-dev-alone.log`,
`/tmp/c09-r7-dev-final-alone.log`, `/tmp/c09-r7-build.log`,
`/tmp/c09-r7-trace.log`. `git diff --check` passes.

```text
Test Files  1 failed | 143 passed (144)
Tests  2 failed | 3186 passed | 1 skipped (3189)
PERF-022 host: 214669 bytes raw, 72932 bytes gzip / 1500000
PERF-020 controller (shared entry): 214669 bytes raw, 72932 bytes gzip / 300000
PERF-022 deploy: 214669 bytes raw, 72932 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

### Round 8 — first-frame focus geometry (PLAT-020, PLAT-021; NFR-TEST)

The previous tile-width ratio mixed destination rectangles with a different tile
layout, producing reciprocal golden-ratio sizing even on a single uninterrupted
move. An overridden width also retained grid alignment, shifting the larger box
away from the destination cell's left edge. Focus now builds CSS-pixel keyframes
from painted and destination rectangles, with justify-self/align-self start in
both keyframes and transform:none at completion. Rectangles equal within 0.5 px
produce no animation, including the unchanged Rabakz tile.

There is a real ancestor scale: style.css .screen uses
translate(-50%, -50%) scale(var(--screen-scale, 1)), set by main.tsx from the
viewport. The route measures this once per transition from .screen's bounding
width / offsetWidth, never from a tile. At 1920×1080 it is 1. Focus and content
geometry use the same converted destination rectangle; the expansion mask uses
the same ancestor conversion.

The unit regression asserts both complete keyframes for the supplied 1080p
rectangles: Tabao starts translate(-1132px, 0px), 1098×795 and ends none,
678×380; Peek starts translate(1132px, 0px), 678×380 and ends none, 1098×795.
Both endpoints have start alignment on both axes. Rabakz produces no keyframes
and no Animation. The incoming content uses 1098×795 for Peek.
**Superseded by round 10 / D-108(d):** the demo UAT claimed to compare every tile's first animation-frame rectangle to its
pre-event rectangle within 2 px for one move and two moves interrupted at 60 ms,
then checks the destination grid. The real-phone step and its limits are retained.

### Round 8 Close-out and Requests

Only authorised paths changed; no evidence files written. The browser memory
preflight fails because sandboxed sysctl is denied. Integrator: run the UAT and
inspect its motion; no browser or visual pass is claimed here. The focused
animation suite passes all 16 tests. Full verification results follow below.

Final `VITEST_MAX_WORKERS=2 pnpm verify`: exit 0; **144 test files passed,
3,189 tests passed, one existing skip** (223.32 s). Workspace, typecheck,
ESLint, design lint (283 files), build/budgets and trace pass. tools/dev.test.ts
passed; no isolated rerun needed. An initial run caught three numeric template
expressions in the new UAT assertions; explicit String conversions fixed those
before the successful complete run. No check or existing limit changed.
`git diff --check` passes. Log: `/tmp/c09-r8-verify.log`.

```text
Test Files  144 passed (144)
Tests  3189 passed | 1 skipped (3190)
PERF-022 host: 214918 bytes raw, 73015 bytes gzip / 1500000
PERF-020 controller (shared entry): 214918 bytes raw, 73015 bytes gzip / 300000
PERF-022 deploy: 214918 bytes raw, 73015 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

### Round 9 — shared tile-local content boundary (PLAT-020; NFR-TEST)

Reviewed round7-failure/40-host-failure.png: outgoing blurb lines and incoming
copy visibly overlap. Round 7's masks and round 8's geometry work did not resolve
this: the current horizontal pixel masks also ran their boundaries with different
easing. The integrator established the separate tile-jump cause after round 8:
automatic minimums in `1.618fr 1fr` allowed the animated column to grow to 1098 px,
shifting tiles about 420 px. The fixed `minmax(0, 1.618fr) minmax(0, 1fr)` tracks
are preserved verbatim; no UI token was needed by design lint.

Round 9 chooses a vertical boundary sweeping left to right. Both copy roots are
bottom-left anchored. The incoming right inset is incomingWidth - boundary;
the outgoing left inset is boundary. Boundary sweeps 0 to max(copy widths),
using identical duration and easing. **The same-timeline-start claim is superseded:** the integrator removed the startTime assignment because pending startTime is null and pauses the outgoing mask; both animations are created in one task. Negative incoming right
insets deliberately let the shared boundary pass beyond a smaller incoming root.
Outgoing ink is full until clipped; there is no opacity animation. Cleanup on
completion and interruption removes the snapshot and cancels both animations.
Unchanged tiles retain the route's existing no-wipe guard.

Tests sample both orders of 1098/678 widths at seven progress values, converting
clip edges into tile-local x and asserting complementary regions. UAT now
intersects text rectangles with ancestor masks and compares visible rectangles
from different copies, failing overlap over 1 px on both axes. This runs on every
strip frame and after a real phone Next, sampled 150 ms after a snapshot appears.
**Superseded by D-107:** expand/collapse may expose disjoint full-ink title fragments; the overlapping-visible-text check applies there. Focus retains its duplicate-title check.

### Round 9 Close-out and Requests

No evidence outputs were written. Browser UAT remains for integrator execution
and visual review. In particular, the retained strong-title check counts even
partially revealed title fragments: a vertical complementary wipe can expose
disjoint fragments of both full-ink titles. That check may still report duplicate
strong title despite no overlapping text boxes; **This historical claim is superseded by D-107**, which permits disjoint title fragments on expand/collapse while requiring nonoverlapping visible text boxes.
Verification results follow below.

`VITEST_MAX_WORKERS=2 pnpm verify` passed (exit 0, 321.57 s): workspace,
typecheck, ESLint, design lint, all 144 test files, build/budgets and trace.
There were 3,191 passing tests and one existing skip. tools/dev.test.ts passed;
no isolated rerun was needed. The focused content suite passed all six tests.
An initial focused run caught floating-point cancellation at 1.8e-14 px in a new
assertion; its comparison now uses ten-decimal precision. No existing check or
limit changed. `git diff --check` passes. Log: `/tmp/c09-r9-verify.log`.

```text
Test Files  144 passed (144)
Tests  3191 passed | 1 skipped (3192)
PERF-022 host: 214756 bytes raw, 72954 bytes gzip / 1500000
PERF-020 controller (shared entry): 214756 bytes raw, 72954 bytes gzip / 300000
PERF-022 deploy: 214756 bytes raw, 72954 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```


### Round 10 — D-108 review fixes (PLAT-006/009/020/021; NFR-A11Y, NFR-DES, NFR-TEST)

Inspected round7 strips 59/70 and stills 20/21: header sentences overlap and the
wide-name start stage moves upwards. Header heading and status now share the
lobby complementary mask, with equal copy bands reserving an 89 px line plus
status regardless of fitted heading size. Strip assertions include header text
boxes; wide-name picker/start stage rectangles must be identical at 720p/1080p.
The focused tile outline is inset; TV failure text has an 8 px icon gap.

Demo events advance from the latest input. D-108(d) replaces both old demo
continuity steps, including round 8's ineffective two-interruption claim: at
60 and 144 ms, pause all running animations, capture rectangles, advance again,
set new animations to time zero on the next frame, compare within 2 px, then
check the final grid after two advances. Real-phone per-frame bounds use each
tile's own keyframe travel × 2.86 × dt / duration + 2 px (peak about 8.6 px/ms).

Announcements use the failed flag, with true/false prefix regressions. The queued
Select regression captures state before disconnect and requires picker afterwards.
Navigation segments count modulo installed games, including five quick Nexts.
Leader invitation uses everyone’s and the PLAT-009 apostrophe scan includes it.
The mid-move real still pauses animations at 150 ms and bypasses still settlement;
1080p includes a one-seat start still. The slice enriches every REPORT screenshot
row from actual filenames, preserving the written .png extension for 4K stills.

The integrator's minmax(0, 1.618fr) minmax(0, 1fr) grid and removal of the outgoing
startTime assignment are preserved. D-107 supersedes round 9's unchanged-title
claim; D-108 supersedes round 6 N2's fading-to-ghost description for picker copy.
Picker copy remains full ink until its shared boundary clips it. Baseline graphs
reported by the integrator: **214,732 raw / 72,952 gzip bytes**; new figures below.

### Round 10 Close-out and Requests

No evidence outputs written. The integrator must run the updated browser UAT and
inspect the new header strips, interruption checks and one-seat still. No new
browser/visual pass is claimed. No dependency, check or limit changed.

`VITEST_MAX_WORKERS=2 pnpm verify` passed (exit 0). All 144 test files passed;
3,193 tests passed, one existing skip. tools/dev.test.ts passed; no isolated
rerun was needed. Workspace, typecheck, ESLint, design lint (283 files), build,
production scans, budgets and trace passed. The first full run found the new
disconnect test comparing object identity across a legitimate revision increment;
it now compares pre-disconnect screen/focus and explicitly requires picker after
the queued Select would have flushed. No existing limit was changed.

New host/controller/deploy graphs: **215,095 raw / 72,961 gzip bytes**.
Log: `/tmp/c09-r10-verify.log`. `git diff --check` passes.

```text
Test Files  144 passed (144)
Tests  3193 passed | 1 skipped (3194)
PERF-022 host: 215095 bytes raw, 72961 bytes gzip / 1500000
PERF-020 controller (shared entry): 215095 bytes raw, 72961 bytes gzip / 300000
PERF-022 deploy: 215095 bytes raw, 72961 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```
