# P-08 — Production atlas publication

## Goal and requirements

Publish the generated atlas manifest's full and half WebPs in production so Peek Poker
reaches its memorise phase: PP-030, PP-031, PERF-020; preserve PERF-022/023/024.

## Acceptance

- Every atlas named by the emitted pipeline manifest exists relative to that manifest,
  including Tabao Rush assets and both detail levels.
- Development and the existing preparation/decode/warm-up sequence remain unchanged.
- No atlas enters the controller import closure; no asset loading is added during play.
- A deployed manifest naming a missing atlas fails the budget scanner.
- One phone can start Peek Poker against a production build and reach memorise.

## Implementation

A build-only Vite plugin reads the packed manifest, locates its emitted asset by exact
source bytes, and emits each referenced WebP beside it. The pipeline's existing content-hashed
filenames remain intact, so no manifest rewrite is necessary. Missing source files fail the
build. Generated assets/dist is untouched. No dependencies were added.

The deployment scanner validates every atlas reference and excludes only these round assets
from PERF-022 shell transfer accounting; it still reports the complete deployment total and
counts unrelated public assets. Controller accounting is unchanged.

Unit tests exercise emission, deduplication, both games/details, unsafe names, missing source
files, deployed missing-atlas rejection and exclusion from the controller closure.

## UAT script

Run `node uat/slices/P-08-production-atlas.mjs --out prod-r4` from the worktree (Node 24).
The slice directly uses the existing UAT runner's production extension to build and preview;
there is no UAT CLI production switch. It seats one phone, chooses Peek Poker, presses Start,
waits for `.pp-table[data-phase="memorise"]`, and captures TV and phone screenshots.
It rejects development HTML. Evidence goes under `uat/evidence/P-08-production-atlas/prod-r4/`.

## Out of scope

P-06's other follow-ups (scoreboard view keys, crowded seat markers and readiness-await room
revalidation), full-match/performance assessment, art changes and shared tracker updates.

## Close-out

Production build passed. The emitted `assets/manifest-BCRbkQ2N.json` has all 14 referenced
WebPs beside it (2 Peek Poker, 12 Tabao Rush). The complete listing is in
`uat/evidence/P-08-production-atlas/build-output.txt`. Type-check passed.
The requested unit command returned 867 passing tests and 12 Chromium-launch failures
with the mandated nonexistent browser path; no browser test could run. ESLint and design lint passed. Browser UAT and perf are reserved
for the integrator: Chromium cannot run here and this brief prohibits running either.
No commit, verify, dependency installation or node_modules linking performed.

## Requests

Integrator: run the production UAT command above, inspect both screenshots, then perform
independent review and the remaining integration checks before closure.

## Round 2 — stale phone felt (PP-030, PP-031)

Cause: the production build contains both the K1 `[data-theme="peek-poker"]`
variables in `packages/ui/tokens.css` (`--ka-bg: #1D5741`, diagonal weave) and the
`.ka-controller-shell` background declarations in
`packages/controller-kit/src/shell.css`. Inspected the emitted
`apps/web/dist/assets/index-uO83OHgy.css`: these rules survive minification;
there is no felt URL to rewrite or fetch. The supplied production still also
shows green felt in the shell footer beneath the cream play area.

The covering `.ka-layout-surface` gets inline computed paint from
`LayoutEngine`'s `refreshSurface` in `packages/controller-kit/src/layout-renderer.ts`.
That mount effect has empty dependencies and refreshes only on resize. The phone
accepts layout and room/playing messages separately (`apps/web/src/phone.ts`),
so a controller can mount with console paint before its theme becomes Peek Poker.
Its shell and text then update, while the opaque copied surface keeps console
paint. Production timing exposes the stale snapshot; the CSS cascade is intact.

Fix: `apps/web/src/phone-route.tsx` keys `LayoutEngine` by controller theme, so a
theme transition recreates its copied surfaces and private paint snapshots.
This applies equally in development and production and uses the existing tokens.
No controller-kit files or styles were changed.

The production UAT now waits for the memorise phone text, checks the actual
`.ka-layout-surface` computed base against development's green RGB value and its
image for the diagonal weave, and calculates WCAG relative luminance from the
computed foreground/background RGB colours. It requires at least 4.5:1 for
“Watch the TV”, “Seconds” and the numeric countdown, with presence checks so an
empty text selection cannot pass. This measures contrast against the base colour.

The existing phone coverage browser test now mounts a memorise controller with
console theme, changes it to Peek Poker, checks the old copied surface was
removed, compares the new computed colour and image to a probe using the shared
K1 theme recipe, and checks all three memorise text contrasts. It then switches
to picking and retains its existing viewport, target and paint coverage checks.

Checks: initial production build passed, permitting emitted CSS inspection.
The mandated Vitest command returned 630 passes and 12 missing-Chromium launch
failures; browser assertions therefore await the integrator. Type-check, ESLint
and design lint passed after corrections; no emitted files beside sources were
found. No UAT, preview, perf, verify, install, linking or commit was performed.
One check batch was mistakenly launched after uptime printed 9.68; subsequent
checks use an executable load gate before each command. This was a breach of
the requested load guard, not a successful under-threshold check.

Close-out: implementation and assertions are ready for browser review; runtime
confirmation of the message-order reproduction and production still is pending.
Requests: integrator runs the amended browser test and production UAT, inspects
the phone still, and confirms cream text on green felt before closure.

## Round 3 — repaint without remount (PP-005, PP-030, PP-031, PERF-022)

The merged C-15 connection/menu flow is retained. LayoutEngine now observes its
closest controller shell's data-theme attribute and re-copies the computed surface
paint when it changes. The observer disconnects on cleanup. The route no longer
keys LayoutEngine by theme, preserving mounted controls, revision history and
crossfade ghosts. The controller-kit fixture checks repaint, ghost retention and
observer cleanup.

The phone browser test again starts memorise with console paint, switches to
Peek Poker, compares the copied colour and treatment with THEMES['peek-poker'],
and requires all three memorise text contrasts to be at least 4.5:1. It continues
through C-15's picking/menu tests and compares the reverse disconnect paint with
THEMES.console. These assertions inspect paint, with no isConnected check.

The production slice derives its expected felt colour and treatment from the UI
theme source, using a scoped Node source-resolution hook. It passes its actual
direct invocation to the runner's existing command override, so future run.json
and REPORT.md records identify the production command. Historical prod-r2/prod-r3
records are untouched under this round's path restrictions. The next command is
`node uat/slices/P-08-production-atlas.mjs --out prod-r4`; output is
`uat/evidence/P-08-production-atlas/prod-r4/`.

The budget scanner recognises only manifest-*.json as pipeline manifests for atlas
exemptions. It validates atlas/detail/file shapes and deployed file existence with
the named “Missing or invalid atlas” error. Tests cover unrelated JSON remaining
in the shell total and malformed entries. Thresholds are unchanged.

The top-level evidence report distinguishes prod-r2's defect, prod-r3's remount
workaround and pending prod-r4's in-place repaint. Per-image review fields are left
for the integrator; no new visual pass is claimed.

Validation: every check launched with the measured 1-minute load below 8.
The final requested Vitest run returned 671 passes and 13 sandbox failures:
12 missing-Chromium launches and one denied local-port bind in legal.dom.test.ts.
Controller-kit, budget and UAT runner unit tests passed. TypeScript build, ESLint
on changed code and design lint passed. No untracked source-adjacent JS, maps or
declarations were produced. Initial validation caught a missing observer stub and
TypeScript/lint issues; those were corrected before these final results.

Close-out: all requested code and documentation changes are ready for review.
No commit, verify, UAT, perf, install or node_modules linking performed.
No perf.json is claimed: full-match performance assessment remains P-09.

Requests: integrator runs the browser tests and production prod-r4 command, opens
both stills, and fills per-image visual notes and acceptance before closure.

## Round 4 — close-out (integrator, 2026-11-18)

prod-r4 was run after the main merge on c8d44592 with
`node uat/slices/P-08-production-atlas.mjs --out prod-r4`; both stills were looked at by the
integrator and review 2 (TV atlas cards readable; phone felt with readable cream text). On that
build: shell 369,995 B gzip of 1.5 MB, controller 108,898 B gzip of 300 KB with no atlas, whole
deploy 4,429,561 B gzip reported. At merge the scanner also requires each manifest-named atlas
file to be a `.webp` (review 2 should-fix 1), so a malformed manifest cannot exempt a script from
the shell budget. The atlas count in `build-output.txt` grows when `assets/dist` is regenerated
with later sets (A-07's effects atlas). Evidence: `uat/evidence/P-08-production-atlas/REPORT.md`.
