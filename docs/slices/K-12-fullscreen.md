# K-12 — Phone fullscreen

Requirement: CTRL-004. Decisions: D-297, D-307.

The generic phone route tracks active pointer ids in passive capture listeners. A seated
phone in landscape requests fullscreen with navigation UI hidden when its last non-mouse
pointer lifts; mouse requests on press. Cancellation removes an id without requesting.
The guards require /play, a seat, landscape, fullscreenEnabled and no current fullscreen.
Failures are ignored and the next release retries. A player exit in landscape disarms
requests until portrait and back to landscape. Portrait changes leave fullscreen.
Blur, pagehide and hiding the document clear active pointers. Control routing is unchanged.

The app uses one shared index.html. PhonePage adds the manifest link and both mobile web
app capability meta tags at runtime and removes them on unmount. The manifest starts at
/play, scopes to /, and requests fullscreen and landscape. Both JSON colours are exactly
#EFEAE2: packages/ui/src/themes.ts console.background.colour (--ka-bg).
No icons are supplied: installs use the browser's generated icon.

Limitations: iPhone Safari has no page fullscreen. Its home-screen launch can hide the
browser bar. A browser always needs one touch first for page fullscreen; rotating alone
cannot enter it. Browser permission or policy can refuse fullscreen silently. Installed
web app display/orientation handling remains browser dependent.

## Original implementation validation (historical)

These results predate review round 1; the Round 2 section supersedes pending-work notes.

- Unit run: 65 files, 694 tests passed (including four fullscreen tests).
- TypeScript build: passed; no emitted source files outside dist were found in git status.
- ESLint: passed after correcting test typing issues.
- Design lint: passed (545 files scanned).
- DOM test for integrator: apps/web/src/phone-fullscreen.dom.test.ts. Real trusted tap and
  kit button event binding; stubs only the fullscreen API and checks one request and one output.
- UAT for integrator: uat/slices/K-12-fullscreen.mjs, --phones 1 --phone-browser chromium.
  Uses Android Pixel emulation resized to 844 × 390, real pairing, counts the received
  picker-open message on the host, asserts fullscreen, then portrait exit; before/after stills.
- DOM tests, UAT, verify, perf, install and commits were not run, as instructed.
- Controller cold-start bundle size change: unmeasured. No production build or perf run
  was authorised. Small inline route/helper code is added; no dependencies or icons.
  PERF-020 remains ≤300 KB transferred and ≤2 s interactive; pnpm perf -- controller is
  still required by the integrator before closure.

## Round 2

Review found that touch-down lacks browser activation, and hiding the browser bar while a
stick is held can cancel that hold through the resize handler. Requests now use the last
non-mouse release. Unit coverage includes touch-down/release, overlapping fingers,
cancellation, mouse press, manifest/meta mount and unmount, and manifest token colours.
The UAT script obtains the button centre before a 5.5 s interval without phone page scripts,
then sends raw CDP touchStart/touchEnd. It checks fullscreen and the TV picker afterwards,
waits 500 ms before checking exactly one open input, and checks phone-only installation tags.

Round 1 evidence, as reported by the reviewer: DOM tests and emulated UAT ran, but the
fullscreen-entry result was invalidated by Playwright's artificial activation. Portrait
exit and the single lobby input passed. Controller startup measured 170.4 ms median
(five runs, CPU 4x); the measured tree was not recorded. Transfer size remains unmeasured.
Round 2 checks (run sequentially, each within ten minutes, with
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false):

- Requested non-DOM unit suite: 215 files passed; 3,515 tests passed, one skipped (408.38 s).
- pnpm exec tsc -b: passed; no emitted files outside dist required removal.
- Requested ESLint scope with --max-warnings 0: passed.
- pnpm run lint:design: passed, 557 files scanned.

No round 2 DOM tests, UAT, verify, perf, installs or commits were run, as instructed.

## Round 3

Implemented review should-fixes 1–5: the D-307 user-exit latch, pointer cleanup on
blur/pagehide/hidden visibility, touch-release guards and refusal retries, synchronous
throw and undefined-return coverage. Our portrait exit is distinguished from a player
exit even if the phone returns to landscape before fullscreenchange arrives.
The UAT script now asserts no installation tags on / and fetches the served manifest,
checking fullscreen display, landscape orientation and /play start URL.

Reviewer-reported round 3 validation of the preceding merged tree: fullscreen unit tests
10/10 and DOM test 1/1 passed; verify passed 294 files and 4,372 tests. Controller transfer
was 162,006 B gzip of 300,000. Chromium Android emulation with raw CDP touch after 5.5 s
idle proved fullscreen entry, exactly one host input and portrait exit. Phone-only tags
passed; desktop Chromium parsed the manifest without errors. Evidence:
uat/evidence/K-12-fullscreen/round3/. These browser results were reported by the reviewer,
not rerun or visually reviewed in this implementation pass.

The review requests an integrator controller perf rerun on the merged tree. The available
startup.json records 170 ms median of 2,000 but has no tree identity and predates the merge;
this pass does not claim a new perf result. A home-screen launch starts at code entry.

Current round 3 checks ran one at a time, each within ten minutes, with
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false:

- Requested non-DOM unit suite: 217 files passed; 3,543 tests passed, one skipped (411.91 s).
- pnpm exec tsc -b: passed, including a rerun after typing corrections; no emitted source
  files outside dist required removal.
- pnpm exec eslint apps/web uat/slices --max-warnings 0: passed after typing corrections.
- pnpm run lint:design: passed, 560 files scanned.

## Close-out

Round 3 fixes are ready for integrator review; all four permitted checks passed. Only
real-device acceptance checks (S-05) remain: Android browser-bar hiding and held-stick
behaviour, and Android/iPhone home-screen launches, including runtime tag handling on iPhone.
CTRL-004 remains in progress until those checks pass.

## Requests

Integrator: rerun apps/web/src/phone-fullscreen.dom.test.ts after these changes and review
the revised UAT assertions. The merged-tree controller perf rerun identified above belongs
to integration validation. Complete real-device checks under S-05 and update shared
trackers after review. No DOM tests, UAT, verify, perf, installs or commits were run in this pass.
