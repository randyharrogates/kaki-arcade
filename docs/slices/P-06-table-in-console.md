# P-06 — Peek Poker table in the console

PP-030, PP-031, PLAT-033. Branch `issue/P-06-table-in-console`.

## What changed

The session registry now loads Peek Poker's host-only `ConsoleScreen` and
`publicViewKey`. The adapter wraps the existing DOM/canvas `PeekPokerScreen`;
its drawing and public-only view-model boundary are unchanged. The console
receives only `publicView`, never simulation state or a private pick snapshot.
The view key retains the last public view and increments a numeric revision only
when `sameTable` detects changed drawing fields, without building a render model
or serialising a snapshot on simulation steps.

The shell supports an imperative host renderer alongside existing Preact screens.
`HostGameScreen` owns mount, resize/view updates and destruction. Start awaits
its mounted readiness callback before subscribing simulation frames. Failed
preparation rejects Start, and stopping a pending start rejects its readiness
wait and releases transport. Existing component registrations retain their path.
The app references Peek Poker's existing host TypeScript project explicitly.
No package dependency, lockfile or simulation rule changed.

## Preload path

The existing game/session-data and asset loading runs first. The shell then
mounts the registered renderer with the initial public snapshot while keeping the
picker’s existing “Starting…” state visible. Once ready, the same mounted root
moves into the shell’s existing `Overlap` surface crossfade; outgoing picker and
incoming table overlap. Reduced motion uses the helper’s instant transition. `ConsoleScreen.mount` fetches `assets/dist/manifest.json`, loads
and decodes every selected card atlas through `preloadCards`, then calls P-04's
`screen.ready`. That gate loads the four table font configurations, waits for
font-set readiness, flushes every restored sprite/masked face and glyph draw,
and warms actual mounted seat pulses, reveal hands and swap rendering. The preparation root remains paintable behind a fully sized opaque Starting
surface; zero opacity or hidden visibility could suppress rasterisation. The table
retains its existing internal warm-up opacity until preparation completes. Updates received during
preparation are retained and applied after warming. Only resolution of this
promise permits round frames; later updates draw without fetching or decoding.
The game-agnostic hook is documented in ARCHITECTURE §4.

## Tests and measurements

New tests cover the registry exports, delayed mounted readiness, failure and
cancellation, and unchanged fetch/decode counts across memorise, picking, locked
and reveal updates. The Chromium test bundles the console's `SessionSurface`
with scripted real public snapshots, a synthetic decoded atlas, fetch/decode
recording, and assertions for actual red face / blue back pixels within the grid canvas
for memorise, pick and reveal, beyond the `.pp-table[data-phase]` checks. It gates
preload to assert “Starting…” remains present and “Loading game” is absent.
It also checks the placeholder is absent. The drawing test explicitly checks
memorise → pick at elapsed zero and at/after `duration.slow`. Adapter tests check
snapshot immutability and renderer cleanup at the cancellation publication boundary. The synthetic atlas tests integration
without claiming visual acceptance of the production art.

Committed validation from round 2 is in
`uat/evidence/P-06-table-in-console/round-2/validation.txt`.
Committed visual evidence is in `uat/evidence/P-06-table-in-console/round4-p1/`,
`round4-p2/` and `round4-p8/`. The integrator's re-review confirms the held
Starting picker, overlap crossfade, reduced-motion switch, 720p fit, hidden
picks and preloaded fonts/assets in those runs. These runs predate merged main;
round 5 will recheck the integrated flow. No accepted performance evidence is
claimed here.

## UAT recipe

`uat/slices/P-06-table-in-console.mjs` joins real phones and plays one console
round. Run separately with 1, 2 and 8 phones. It marks the exact start boundary
using the same source-routing technique as C-16b, records host requests after
that boundary, writes `requests-after-start.json`, and rejects asset requests.
It positively checks that manifest and card-atlas requests were recorded before
Start, then checks for zero asset requests after Start. The pick still advances
the host clock by 500 ms so the hide flip has completed.
It captures memorise, picking, available lock-in markers and reveal; frozen-clock
stills use `settle = false`. A solo last lock can transition immediately to reveal,
so the two/eight-phone runs supply the pick-with-lock-marker captures.

## Console performance recipe

`uat/perf/peek-poker-console.mjs` uses the same browser scenario harness and
budgets as `peek-poker-table`. It joins the requested `--phones` count, selects
Peek Poker through the real picker, starts, waits through memorise, picks and
locks in on every phone, and waits for reveal and its settled frames. Like the
table fixture scenario, it labels the frame/input/feedback coverage diagnostic;
it makes no busiest 180-second round or instrumented input/feedback claim.
A headed run on a quiet machine follows under the integrator; full-match
performance acceptance remains open (P-09).

## Close-out and Requests

Round 2 fixes the premature pick still, adds preload request positive controls,
adds hide-flip drawing coverage, retains “Starting…” until readiness with an
overlapping surface crossfade, replaces the no-op view key, and publishes a
fresh display snapshot when readiness completes. The Chromium test now checks
canvas ink as well as phases. C-12’s host keyboard, pause panel and local-player
behaviour are retained. REPORT.md acceptance tables are recorded by the integrator after visual review.

A production build has no card atlas, so Peek Poker cannot start from it
(P-08): preparation rejects and the TV returns to the picker. Production atlas
publication remains an integrator follow-up.

The integrator will run round 5 at 1, 2 and 8 phones on merged main, inspect the
Start and reduced-motion strips, TV stills and request logs, and perform a headed
console performance run on a quiet machine. Full-match performance acceptance
remains P-09. Round-4 evidence is committed in `round4-p1/`, `round4-p2/` and
`round4-p8/`; historical validation is `round-2/validation.txt` under this slice's
evidence directory. Superseded: see "Closed" at the end of this note.

## Round 3

PP-030, PP-031, PLAT-033: the UAT now holds the real atlas response across
several start-strip frames, showing Start, “Starting…” with the expanded tile,
and the ready table. Before the memorise still it advances the host clock until
all finite host animations have finished (continuous seat pulses are excluded).
The nested picker receives `screen: 'starting'` explicitly; tile focus/expansion
attributes are present on its first render, before layout measurement. Round 3 changed only initial tile data attributes in `picker-route.tsx`; it did
not change the layout effect’s handling of missing previous rectangles. The
existing CSS expanded layout supplies the fresh picker’s geometry. DOM coverage holds both asset loading and mounted
warm-up separately and checks the heading and expanded tile repeatedly in each.
The view key uses `sameTable` and a numeric revision; the regression test checks
120 equivalent views without render-model or JSON work.

The integrator’s round 3 strips at 1, 2 and 8 phones showed a bare surface
through the hold and a ghosted table during preparation, despite the earlier
visibility checks. They do not establish transition acceptance.

## Round 4

PP-030, PP-031, PLAT-033. Confirmed the nested `Overlap` collapsed around the
absolutely positioned picker and clipped its ink. Only the outer shell overlap
had viewport dimensions; the table escaped via its fixed viewport. The new
`mounted-game-screen` fills its containing shell layer and explicitly sizes its
nested overlap. Its opaque token surface covers the preparation root. Removed
the preparation wrapper’s ghost opacity; it remains paintable behind the picker.
The table’s existing sprite uploads/readback, four awaited font loads, mounted
phase draws and animation warm-up still run before ready. Hidden visibility and
zero opacity were deliberately avoided because they can suppress rasterisation.
The browser test now also checks warm-up canvas ink and preparation visibility
while the picker still covers it; GPU rasterisation is not independently proven
inside this sandbox.

M2: both DOM and UAT hold checks hit-test the heading and expanded tile centres,
rejecting clipped/covered ink. The UAT samples screenshot pixels on each Start
strip step and rejects a frame with at least 95% near-surface pixels (18-channel
RGB tolerance includes the subtle dotted treatment). This is sampled evidence,
not a claim to capture every compositor frame. The integrator reviewed the committed round-4 strips and confirmed the held
picker and crossfade without a bare frame.

S1: corrected the round 3 picker-layout claim above; no picker-route change was
needed. S4: the UAT includes a 1280×720 memorise still and repeats Start with
`reducedMotion: 'reduce'`, including hold hit tests, pixel controls and a
zero-duration/finished-animation check immediately after readiness. Four table
FontFaceSet requests and completion times must precede Start and are written to
`font-requests-before-start.json`. The app currently declares no web fonts, so
this positive control checks font loading API requests, including local fallback
resolution, rather than claiming network font downloads.

S5: documented every currently drawn public field at `sameTable`, added mutation
coverage plus the undrawn hand-card exclusion, and documented why the monotonic
module revision is safe: each session has its own last-key comparison, so
interleaving can cause extra publications but cannot suppress a changed view.
A two-session test exercises interleaved changed drawings and a new session.
S6: removed obsolete close-out and validation wording.

## Round 5

PP-030, PP-031, PLAT-033. Reviewed the merged Select → Start → grid flow:
`phone-route.tsx` sends Select through the picker, then renders R-04's
`GameSetup` at the choice/start screen. Its enabled Start button sends the same
start input. P-03's `controllerLayout` supplies 16 face-down grid buttons and
“Lock in” during pick; two selected cells enable locking. Existing UAT selectors
still match these controls. The Starting picker now receives `teamSetup` so its
settings mirror remains present during preparation. This was missing in the
merged source despite the merge commit description.

The DOM fixture now supplies the required Sound interface explicitly; its
source-string fixture is outside TypeScript's normal prop checking. It uses the
existing Rabakz bank Vite plugin so merged main's bank-index import resolves
when bundling the host route. The layout
fixture's Chromium test has a 30000 ms timeout. Picks vary by phone: normally
`i` and `(i + 5) % 16`; at eight phones the first five share cell 0 for a two-row
marker case, with other picks spread across the grid for one-row cases. Existing
assertions are retained.

Round-5 UAT and the headed performance run were run by the integrator (see "Closed"). Commands used:

```sh
pnpm uat -- P-06-table-in-console --phones 1 --out round5-p1 --frames
pnpm uat -- P-06-table-in-console --phones 2 --out round5-p2 --frames
pnpm uat -- P-06-table-in-console --phones 8 --out round5-p8 --frames
```

Round-5 validation (one-minute load below 8 before every invocation):

- `PLAYWRIGHT_BROWSERS_PATH=/nonexistent VITEST_MAX_WORKERS=2 pnpm exec vitest run games/peek-poker apps/web/src`:
  606 passed; 11 browser cases reported failed at the deliberately missing
  Chromium executable, with browser assertions **not run**. Cases: Overlap,
  PeekPoker, game-setup-host, game-setup, host-keyboard, host-peek-poker,
  layout-fixtures (card-back inset), pause-panel, phone-coverage, phone-setup and
  team-polish. The first invocation also found an unresolved Rabakz bank-index
  fixture import; after the plugin fix the second invocation reached the missing
  executable for that case too.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/web/src games/peek-poker uat/slices --max-warnings 0`:
  passed with zero warnings.
- `pnpm run lint:design`: passed, 437 files scanned.

No round-5 UAT, performance run, verify, install or commit was performed by the
implementation agent. Integrator visual review and headed performance remain
required before close-out.

## Closed (2026-11-18)

Merged after review 6 (`_briefs/P-06.review6.md`). Evidence: `uat/evidence/P-06-table-in-console/round5-p1`, `round5-p2`,
`round5-p8` (UAT at 05107482; review 6 confirmed it still holds at merge commit d6c7ad40), with REPORT tables filled,
and the kept headed perf run `perf-8-r5/` (one round at 8 phones, development build: round-only frame p95 17.4 ms,
max 17.7 ms, none over 50 ms; budgets not assessed, D-182). All 11 Chromium browser cases pass (integrator).
Rounds 1–4 evidence folders are superseded and kept only as defect history. At merge the integrator also added
`sound` and `soundHistory` to the mounted screen's update dependencies (review 6 should-fix 1). Open: P-08
(production atlas), P-09 (assessed full-match run), OQ-043 (seat markers), and the review-6 shell items in the backlog.
