# T-09 — Cook picker

## Goal and requirements

TR-064: before every Tabao Rush round, each seated player picks a unique cook and readies on their phone. TR-060/TR-061: that head drives the shared animated body; co-op aprons use seat colours and versus aprons use team colours (TR-052). CTRL-003/PLAT-031: generic phone pictures and seat badges. PERF-020/PERF-023: selection-only picture preloading and bounded packed art.

## Acceptance

- Eight defaults in seat order; taken choices refused; free choices switch; Ready locks and toggles until everyone connected is ready. Disconnect retains the choice and counts as ready. Picker joins take the lowest free head; leaving releases it. Rules remain pure and deterministic.
- Phone: board 4's 4 by 2 grid, cream panels, selected outline, seat badges and ready ticks; a primary/secondary split of 1.618:1; 13 px explanatory note. Pick your cook appears in the shell header. The co-op note says “Faded ones are taken. Your apron stays your seat colour.” Versus substitutes “team”.
- TV: same grid at TV scale, “Pick your cook on your phone”, seat badges and ready ticks, then the selected heads in the kitchen. Reduced motion retains every state change.
- Pictures declare accessible labels and optional token badges. Missing pictures display their labels. A companion alpha mask uses the existing cell colour for the apron, retaining shading and leaving the cap untouched. Every picture preload settles before Ready becomes available; failed pictures retain their text fallback; declarations are loaded on game selection rather than cold start.

## Implementation and tests

The pure rules live in `games/tabao-rush/src/rules/cook-picker.ts`; `game.ts` enters that phase at init, publishes the selections and maps them to renderer head names. Picker elapsed steps are separate from the cooking clock. Existing gameplay tests explicitly begin after selection through `playing.fixture.ts`; the real picker has separate unit and conformance coverage at 1, 4 and 8 players. The conformance picker fixture uses a five-second cooking round so that the unchanged whole-match checks also complete.

Generic contract, validation, placement and rendering changes live in `packages/platform/src/game` and `packages/controller-kit`. Image identity and badge ownership/ready state participate in the grid signature, so changed picker badges are sent through the existing session revision mechanism. The app registry imports only the game’s data-only picture declaration, never its host simulation or private content. The app resolves declared source keys through the packed manifest and preloads the URLs. The build publisher includes packed portrait files.

`tools/assets/cook_portraits.py` combines the committed south-facing idle body and heads on their shared socket. It emits eight WebP portraits and eight aligned apron masks, within a combined 60,000-byte cap, at no more than 202 by 256 px. The pipeline includes these files in the existing round totals. No Blender run, new dependency or hand-edited dist file.

Unit checks: `cook-picker.test.ts`, `cook-picker-conformance.test.ts`, `picture-grid.test.ts`, and `test_cook_portraits.py`. DOM checks for the integrator: `apps/web/src/tabao-cook-picker.dom.test.ts`, covering 667×375, 844×390, 932×430, 1920×1080 and 1280×720. Existing controller cold-start budget tests remain unchanged.

## UAT

For round 3, the integrator runs UAT to round1:

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- T-09-cook-picker --phones 3 --out round1
```

The script pairs three phones, starts Tabao Rush, captures default phone selections at all three phone sizes and the TV at both sizes, refuses phone 2's attempt to take phone 1's cook, picks Songkok, readies all three and captures the running kitchen with the chosen heads. Frame strips cover the TV pick badge and the picker-to-kitchen crossfade. The integrator must inspect every still and confirm apron colours, head identity and motion; scripted completion is not visual acceptance.

## Source precedence applied

- Note: 13 px from DESIGN/type tokens, replacing the brief's 15 px.
- Badge numerals: 21 px phone token, replacing board 4's 17 px.
- Selected outline offset: 0 px (explicitly permitted by DESIGN), replacing the board/brief's 2 px spacing value; 5 px outline width retained; the outline remains clear of the next card.
- Taken portraits fade to 0.3 while seat badges retain full contrast, following the decided board 4 rendering rather than dimming the entire cell.
- Versus aprons and caps in gameplay: team colours under TR-052/TR-061; the picker note says team colour in versus. Co-op retains seat colours. Phone portrait cap pixels remain untinted as requested in r1b; apron masks carry the applicable colour.

## Close-out

Implementation is awaiting the integrator's full verify, DOM tests, UAT, visual review and cold-start performance check. No commit, verify, UAT or perf run by this worker, per the round briefs. Exact targeted results and packed sizes are recorded in `uat/evidence/T-09-cook-picker/round1d-checks.md`.

## Requests

- Run the full verify and the new DOM test, then the three-phone UAT command above and inspect the screenshots/transition.
- Re-run the existing controller cold-start budget check unchanged; this worker is explicitly prohibited from running perf.
- Python has no pytest module. No dependency was installed; the existing unittest discovery command is used as the available asset-suite runner.
- Versus setup/kitchens remain outside T-09: the existing module advertises co-op only. Team-aware apron rendering and picker copy are covered with team-bearing game fixtures; integrate the versus arena/selection work separately.

## Round 3 — TV badge entrance (TR-064)

The integrator's probes found the CSS badge entrances pending at time zero, holding the
seat badges transparent and preventing the TV screenshot from settling. Badge creation now
uses `element.animate` with `packages/ui`'s `duration.fast` and `easing.out`, one iteration
and opacity 0 → 1 with no overshoot. The CSS resting opacity is explicitly 1 and the
animation has no retained fill, so completion, cancellation or skipping the entrance leaves
the badge opaque. Reduced motion creates the badge and ready state without an animation.
The CSS animation and keyframes have been removed.

`games/tabao-rush/host/cook-picker.test.ts` covers one finite entrance per new badge, the
opaque end and resting states, unchanged-update deduplication, and no animation under
reduced motion while preserving the seat label.

Round 3 close-out: targeted Vitest passed (85 files, 921 tests). TypeScript build passed;
emitted files were deleted using the build clean command. ESLint passed with zero
warnings; design lint passed (521 files scanned). Commands ran one at a time without load gating, each prefixed with
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`. No commit, full verify, UAT or installation was
performed by this worker.

Round 3 request: the integrator runs UAT to round1 using the three-phone command above,
then inspects the TV badges and entrance/crossfade evidence.

## Round 4 — review fixes (TR-064, CTRL-008, PERF-001)

`HostGameScreen` now keeps a stable attachment callback and checks the renderer root's
parent before appending. Prop updates leave the mounted renderer and its animations in
place. The unit regression checks callback identity and a repeated attachment; the new
motion-enabled browser test continuously re-renders `HostGameScreen` at 1920 × 1080,
re-picks seat 2 to cook 8, readies everyone, checks opaque badges and no pending animations
after 300 ms, and samples the exit crossfade before checking that the picker is hidden.
It also counts callback identities: making the attachment callback unstable fails even
if the parent guard remains. Removing the guard and restoring the original callback
would additionally reproduce the pending badge animations under continuous renders.
The integrator runs this browser test; it has not been executed by this worker.

The picker uses the shared exit-only crossfade and waits for its finish before hiding;
subsequent play views no longer hide it mid-fade. Reduced motion hides immediately.
The phone uses the game theme from `starting`. The generic controller header retains
Connected / Reconnecting / Lost in its status element, alongside a separate heading.
Taken pictures use the shared `--ka-opacity-taken` token (0.3). The picture-grid Ready
font rule retains `!important`: the generic label fitter writes an inline font size
(`layout-label.ts`), so the cascade does not allow its removal within this round’s scope. The generated token CSS and specimen were rebuilt from the typed token.

Same-tick free-cook races are tested in both input orders (first wins), as are two-way
swaps (both refused). When every picker participant is disconnected, the picker remains
open with its selections retained and its cooking clock at zero. It may advance once at
least one connected player is ready and all other connected players are ready; disconnected
players still count as ready. Joins pass only the cooking tick to participant creation. The joined-mid-game flag is
computed separately from elapsed picker/cooking steps; picker joins remain active, and
joins after Ready spectate even before the first cooking tick.

Round 4 UAT adds the re-pick strip, all-Ready TV still, exit strip, phone-after-Ready
still and locked-choice attempt, fourth-phone lowest-free-cook join, and reduced-motion
TV still. The all-Ready still pauses the exit at its start and completes badge entrances
for inspection, then the exit strip resumes it. This controlled still is distinct from
the motion-enabled browser test's natural badge-settling assertions. Phone still 01 waits
for the game theme. Measurements remain owned by the harness REPORT tables.

The join evidence requires four phones; run:

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=6252 KAKI_PORT_SIGNAL=6251 pnpm uat -- T-09-cook-picker --phones 4 --out round4
```

Round 4 close-out and requests: no commit, full verify, UAT, perf or installation by this
worker. The integrator runs the DOM tests, full verify, UAT and controller cold-start perf,
then inspects the stills and strips before acceptance. Targeted check results follow below.

Remaining round-4 request: `games/tabao-rush/src/cook-picker-conformance.test.ts` is
outside the authorised host / src/rules paths. Its scenario sends Ready only at step zero.
Membership replay can disconnect everyone at that step; the picker now correctly waits,
but the script never readies the returning players. Update that fixture to inspect each
phone's `ready` options control each step and send Ready only when its option is not
selected. This preserves the reconnect case without toggling already-ready players off.
A scope extension was requested; the fixture remains unchanged pending authorisation.

Round 4 targeted results (commands run one at a time, without load gating, all under ten
minutes, with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`):

- Requested Vitest selection: 98 files / 1,110 tests passed; one test failed in the
  out-of-scope picker conformance fixture described above (262.60 s final run). Its
  join-leave check now passes; only the four/eight-player membership replay's minimum-player
  completion checks remain blocked by its tick-zero-only Ready script.
- `pnpm exec tsc -b tsconfig.build.json`: passed, including the UAT slice. Build emissions
  deleted with `tsc -b tsconfig.build.json --clean` afterwards.
- Requested ESLint selection with `--max-warnings 0`: passed.
- `pnpm run lint:design`: passed, 523 files scanned.

The new/updated unit regressions pass. DOM tests, verify, UAT and controller perf remain
for the integrator. This round is not a clean unit gate until the fixture is updated.

Round 4b: authorised conformance fixture now checks every phone's Ready option each step and readies only unselected options; kit checks remain unchanged; all-disconnected picking cannot start empty, and permanent departures end through the platform's empty-roster results path (disconnected seats expire after the two-minute reconnect window), so no game outcome change is required; sequential checks with `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`, each under ten minutes: requested Vitest passed (32 files, 392 tests, 252.63 s), TypeScript build and subsequent clean passed, and requested ESLint passed with zero warnings; no commit, verify, UAT or installation.


## Round 5 re-review

Commit-message correction: b7524b45 should name TR-064, not TR-055;
2fa3c591 should name TR-064, TR-056 and PLAT-008. No history rewrite or commit was made.

The portrait mask now composites the south-facing head mask with the body mask on
the shared source head socket before cropping and resizing. This supersedes the
round-1 note that cap pixels remain untinted. The cap regression checks head-only
pixels; other heads remain transparent. `cook_portraits.py` is pure Python/Pillow,
with no Blender import or subprocess, but has no command-line entry point. The
integrator regenerates portraits and packs with `python3 tools/assets/pipeline.py`
(the default pack path does not render or invoke Blender). Generated assets were
not changed here.

The host picker starts hidden, so a first play view cannot trigger an exit from a
never-shown picker. Picker joiners remain active with joinedMidGame false. Ready
now reads "Ready ✓" when selected and uses the panel treatment with accent ink
and border. Selection changes crossfade using inert snapshots, including while a
pointer is held; reduced motion changes state immediately. The numeral and tick now sit side by side in a token-spaced pill. The connection wrapper has its own class. The re-pick strip
requests 21 ms between captures; action and screenshot overhead also contributes to the actual cadence. A separate unsettled badge still captures the re-pick fade.

Close-out / Requests: integrator must run the DOM tests
`apps/web/src/tabao-cook-picker.dom.test.ts` and
`apps/web/src/tabao-cook-picker-motion.dom.test.ts`, regenerate/pack portraits,
run full verify and UAT, inspect the new stills and strips, and write the evidence
REPORT. Quiet-machine perf re-runs (controller cold start and the affected Tabao
Rush renderer/PERF scenario) remain owed. No verify, installs, UAT, perf, Blender,
commits or tracker changes were made by this worker.


Round-5 scope request still pending: the generic local seat implementation now
exposes `bindControl(send)`, sends the current wire layout/view revisions, ignores
key repeat while held, and keeps its default cook. Tests manually bind the existing
`sessionLinks.control` channel and prove TV+phone and solo play for Space, Enter and
pad A. Production has no binding callback in its current SessionPeer registration.
Completing item 1 requires an authorised change in `apps/web/src/session-links.ts`
(or the browser registration): bind the local peer's optional `bindControl` to
`message => links.control(id, message)`. Without that wiring, the production TV
seat remains blocked. No game-specific infrastructure code was introduced.

The requested joinedMidGame change conflicts with the shared conformance assertion
at `packages/platform/src/game/conformance.ts:1787`: it requires all joins after
simulation step zero to be mid-game, even while the game is picking. The new picker
regression correctly expects false. Integrator must reconcile this assertion with
picker phases; no shared contract/check was modified or weakened here.

Round-5 check results (all processes finished within ten minutes):

- Final focused Vitest: 5 files / 58 tests passed (0.48 s).
- Tabao Rush: 32 files / 394 tests passed; 1 file / 1 test failed
  (`cook-picker-conformance.test.ts`, the joinedMidGame conflict above), 217.57 s.
- Controller-kit: 9 files / 111 tests passed (0.60 s).
- Apps/web: 54 files / 547 tests passed (7.34 s).
- Vitest used `VITEST_MAX_WORKERS=2` and the requested DOM, layout-fixtures and
  team-polish exclusions. The three package suites ran one at a time. One short
  local-player focused recheck overlapped the Tabao suite; final focused checks
  ran separately.
- `PYTHONPATH=tools/assets python3 -m unittest tools/assets/test_cook_portraits.py`:
  both tests passed.
- TypeScript project build passed; subsequent `--clean` passed.
- ESLint on changed TypeScript/JavaScript paths passed with `--max-warnings 0`.
- `git diff --check` passed. DOM tests were added/updated but not run, as instructed.

## Round 5b

**D-287 · 2026-11-19 · Claude, integrator (T-09 review; delegated by Randy, 2026-11-18)** (T-09; TR-064, TR-056, CTRL-003, CTRL-009, PLAT-008; reads D-231, D-282). (1) TV seat in pickers: a keyboard or pad seat at the TV takes part in a phone picker through the generic local mapping. A press of Space, Enter or pad A taps the first single-option control whose audience includes the seat, if that control is not disabled. Each press counts once: key auto-repeat is ignored, a key or button held from Start is not counted, and presses count only once round preparation has finished. The tap goes through the same authenticated, revision-checked action path as a phone. In the Tabao Rush cook picker the seat keeps its seat-order default and readies. No game-specific code goes into apps/web or the packages. (2) Picker joiners play the whole first round but are marked joinedMidGame, because platform conformance treats any join after step zero as mid-game; results may flag them. (3) Kit selection crossfade: it applies to every cell of a grid in which any cell declares a picture, and to single-option controls. Its outgoing snapshots are inert and aria-hidden, carry ka-layout-ghost, and lose aria-pressed, data-state, data-target and data-control. Other grids and option groups change state without a crossfade, as before. Randy may overrule.

This supersedes round 5's joinedMidGame false change and conformance reconciliation
request. Picker joiners remain active, with the mid-game flag restored.
SessionPeer now binds optional generic local controls to the same authenticated,
revision-checked action channel as phones. The generic non-DOM readiness test
uses production registration for TV plus phone and TV solo (Space, Enter, pad A).
This completes the round-5 item-1 scope request. No game names remain in that test.

Close-out / Requests: the integrator's outstanding DOM, asset, verify, UAT and
performance work listed above remains owed. No commits or trackers changed.

Round-5b checks: focused Vitest passed (3 files / 27 tests); Tabao Rush passed
(33 files / 395 tests, including platform conformance, 165.53 s); apps/web passed
(54 files / 548 tests, 7.73 s). Suites ran separately, with two workers and the
requested DOM, layout-fixtures and team-polish exclusions; none reached ten minutes.
TypeScript build and subsequent clean passed. ESLint on the changed TypeScript
and JavaScript paths, including the restored rules/test, passed with zero warnings.
Initial check failures were confined to the new test callback/mock typing and
were corrected before final focused, typecheck and lint passes.

## Round 6 final review fixes

TR-064 / CTRL-003: phone badges use a growing pill with a token gap between the
numeral and ready tick; the DOM regression compares the tick bounds with a Range
around the numeral text. Selection crossfades are limited to picture grids and
single-option buttons. Their inert, aria-hidden snapshots carry `ka-layout-ghost`
and omit `aria-pressed`; a plain 16-cell grid appends no snapshot. RZ-003 / RZ-005:
Rabakz targets the explicit single-option marker. CTRL-009: the host keyboard ignores
repeated Space/Enter keydowns, including a key held from Start into the picker.

UAT script additions (not executed): `badge-fade` holds the badge halfway through
its token-defined fade for the immediate clipped still, then resumes it. A fresh
room adds a keyboard seat plus one phone, captures `tv-seat-ready` after Space,
and captures `tv-seat-round` after the phone readies.

Checks used the requested pnpm environment, two Vitest workers and exclusions;
all suites ran sequentially and finished within ten minutes:

- Focused: 4 files / 59 tests passed; final recheck passed (3.44 s).
- Controller-kit: 9 files / 113 tests passed (0.58 s).
- Tabao Rush: 34 files / 404 tests passed (217.39 s).
- Rabakz: 19 files / 333 tests passed (28.16 s).
- Apps/web: 54 files / 550 tests passed (10.24 s).

Close-out / Requests: integrator must run
`apps/web/src/tabao-cook-picker.dom.test.ts`,
`apps/web/src/tabao-cook-picker-motion.dom.test.ts` and
`apps/web/src/host-keyboard.dom.test.ts`, then execute and inspect the updated UAT.
The earlier outstanding asset, verify and performance checks remain with the integrator.
No trackers, contracts, lockfile, commits, verify, installs or UAT were changed/run.

TypeScript build and subsequent clean passed, including the final recheck. ESLint
on changed TypeScript/JavaScript paths passed with zero warnings; initial fixture
style findings were corrected. `git diff --check` passed. DOM tests were not run.

Round-6 integrator results: UAT round6 passed with four phones; DOM tests passed;
verify7 passed (reported in the round-7 brief).

## Round 7 should-fixes

CTRL-009: the first bound input tick establishes the primary held state, including
after close/rebind. A held Start button cannot tap Ready; release followed by a
new press taps once. The existing keyboard/phone/solo tests begin with a released
sample, representing a key pressed after preparation.

CTRL-003: single-option controls crossfade both into and out of selected state;
multi-option groups append no ghost. Selection ghosts also lose `data-state`,
so selected-state locators count only live targets. The picture-grid fade check
is computed once per control rather than once per cell.

TR-064 / CTRL-003: the UAT badge-fade still now pauses the TV badge entrance at
half its animation duration, asserts opacity strictly between zero and one,
captures its whole cell and resumes the animation. Reduced motion is enabled
before a phone re-pick; the TV still asserts all four badges are present and opaque.

Close-out / Requests: integrator must run
`apps/web/src/tabao-cook-picker.dom.test.ts`,
`apps/web/src/tabao-cook-picker-motion.dom.test.ts` and
`apps/web/src/host-keyboard.dom.test.ts`, then run and inspect the updated four-phone
UAT. No trackers, contracts, lockfile, commits, verify, installs, UAT or browser
tests were changed/run by this worker.

Round-7 checks: focused Vitest passed (2 files / 33 tests, 1.17 s),
controller-kit passed (9 files / 115 tests, 1.59 s), and apps/web passed
(55 files / 564 tests, 14.14 s). Final runs were sequential, with two workers,
the three requested exclusions and a 600-second timeout per run.
TypeScript build and subsequent clean passed; ESLint on all changed code paths
passed with zero warnings. The initial readonly fixture assignment was corrected
before these final passes. `git diff --check` passed.

Asset evidence request: `python3 tools/assets/pipeline.py` passed (10 atlases;
PERF-023/024 passed). The packed manifest confirms
`portrait-cap-mask.3f2688b9cd6918b4.webp` at 1,744 bytes and a 53,018 / 60,000-byte
portrait total. Round 1's `portraits.png` and `seat-and-team-aprons.png` were made without a
script and predated the cap mask, so the integrator removed them; UAT stills
round11/01, 04 and 29 show the current portraits, aprons and caps. The integrator
regenerated `portrait-files.md` from the packed manifest (16 files, 53,018 /
60,000 B).

## Round 8 — retain quick TV key taps (CTRL-009, TR-064)

Round 7 UAT lost Space because keydown and keyup could both arrive between the
60 Hz keyboard samples during a main-thread stall after round preparation.
The integrator reports that round 8's diagnostic passed: the handler saw and
prevented the press, and the held press readied the TV seat at 104 ms.

Fresh gameplay keydowns now latch until the active local input source samples
them. The sample reuses a set containing held and latched codes, then clears the
latch. The keyboard interval consumes it without a bound pad; the gamepad loop
consumes it with a bound pad. Clear, hidden visibility, leave and pause clear both
sets. Repeated Start Space/Enter still return before being held or latched.
Plain unit regressions cover an instant Space tap, repeat rejection, and clearing
latched taps through clear and hidden visibility; the existing held-Start tests
remain unchanged.

Evidence plan / Requests: the integrator runs UAT to round9 and inspects the
TV-seat ready and round stills. The script now sends one instant Space press,
waits for “Seat 1, Ready” and retains the host/phone failure screenshots.
No diagnostic hold, second press or key listener remains.

Draft sentence for the integrator's D-287 update: “A fresh gameplay press is
latched until the next sample, so a quick tap between input ticks counts once;
a repeated key held from Start still does not count as a fresh press.”

Close-out: no commit, verify, UAT, perf or install was run by this worker.

Round-8 checks: focused Vitest passed (2 files / 38 tests); apps/web passed
(55 files / 568 tests, with the requested exclusions). TypeScript build,
including the UAT slice, and subsequent `--clean` passed. ESLint passed with
zero warnings; design lint passed (534 files scanned). All requested commands
ran one at a time from the worktree root with
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`, two workers for Vitest, and completed
within ten minutes. `git diff --check` passed.

## Close-out (integrator, 2026-11-19)

- Rounds 9 to 11 followed round 8: the TV keyboard tap latch (d0af8c93) and its UAT probe (289a2749). These are CTRL-009 work; the commits say TR-009 in error.
- Main was merged at a75214c6 and again at cd6e13fb. The one conflict, in `tools/assets/pipeline.py`, kept both sides. Each Tabao Rush round grows by the portraits only (+53,018 B sent, +3,016,704 B decoded).
- On the merged tree: verify passed, UAT round11 passed with 4 phones, and the DOM tests passed. The narrow re-review (round 11) is clean on code.
- The integrator extended the asset cleanup to stale portrait files.
- Superseded evidence (rounds 1 to 10, round1d-checks.md and the round-1 worker logs) was removed. `round11/` is the evidence.
- Open:
  - a still that shows the badge fade (still 16 is asserted only);
  - a test pinning a tap on the first tick after a bind;
  - perf on the merged tree;
  - a real pad;
  - versus colours in play.

