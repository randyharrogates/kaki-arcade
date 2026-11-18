# X-05 browser matrix — part 1, round 5 close-out

Goal: prepare and automate the Mac browser subset of REL-004 and confirm supported
routes do not show the REL-006 unsupported message.

## Plan and acceptance

- Runner accepts host chromium, branded chrome or webkit, and phone chromium or webkit;
  both default to chromium. Each distinct selection launches once and is closed on success,
  failure or interruption, including interruption during launch.
- Host and phone browser selections and versions appear in run.json and the REPORT header.
  Chrome uses Playwright's chrome channel; WebKit uses the installed Playwright binary.
- Phones use isolated Pixel 7 (Chromium) or iPhone 13 (WebKit) contexts, including touch,
  mobile and DPR settings, with the existing landscape viewport of 844 × 390.
- One room, two phones, lobby and picker; Peek Poker start, picks, reveal and scoreboard;
  phone Menu, Paused, Resume, then quit to picker; Rabakz question 1, one answer and reveal.
  Capture the TV and both phones at every recorded step.
- Unexpected console errors and all page errors fail. Only the harness's existing exact
  local /favicon.ico 404 exception is expected; no slice-specific exceptions.
- Chrome and WebKit supported routes must load without either unsupported message.
  C-14 remains the unsupported-browser proof for REL-006.
- Unit tests cover parsing, shared and distinct launches, cleanup, aborts, failed launches,
  phone emulation and metadata. Integrator runs UAT and opens every still before acceptance.

## Run matrix for the integrator

Use web 6750, signal 6751 and reserved UAT port 6752. Run sequentially on a quiet Mac.
The owner installs the Playwright WebKit browser binary beforehand; no package is added.

| Host | Phones | Evidence output |
|---|---|---|
| Playwright Chromium | Playwright Chromium / Pixel | r3-chromium-chromium |
| Branded Google Chrome | Playwright Chromium / Pixel | r3-chrome-chromium |
| Playwright WebKit | Playwright WebKit / iPhone | webkit-webkit |
| Branded Google Chrome | Playwright WebKit / iPhone | chrome-webkit |

For each row, run:
`KAKI_PORT_WEB=6750 KAKI_PORT_SIGNAL=6751 KAKI_PORT_UAT=6752 pnpm uat -- X-05-browser-matrix --phones 2 --host-browser <host> --phone-browser <phones> --out <output> --max-mb 24`

Evidence lives under uat/evidence/X-05-browser-matrix/<output>/.
The 24 MiB cap accommodates stills on all three pages; it changes no product budget.

## Not covered

REL-004 stays in progress. Edge is not installed. Playwright WebKit exercises a Safari
engine, but does not prove the real Safari application. Real Safari, iPhone and Android
hardware, browser chrome, touch feel and device networking are X-09 / K-07 work.
TV browsers and HDMI behaviour need X-09 hardware checks (including REL-005);
this automated Mac subset cannot prove them. Firefox is not covered: the runner has no
Firefox option (follow-up X-09). No performance claim is made.
This is a matrix pass with no awkward-path step (UAT.md §4).

## Close-out

The round-3 runs `r3-chromium-chromium/` and `r3-chrome-chromium/` at
`dc3e2e79` completed the two-phone matrix pass and were visually reviewed by the
integrator. Both use Pixel 7-emulated Chromium phones. They predate the round-4
harness change and logged no cancellations. They replace the deleted superseded
merged runs; the empty original Chromium output folders were also removed.

The WebKit rows (`webkit-webkit/` and `chrome-webkit/`) ran on the older tree
`2aad56d9` and failed at joining, before game code. The saved loopback diagnosis is
at `uat/evidence/X-05-browser-matrix/webkit-rtc-diagnosis/` (rtc.mjs and output.txt).
Playwright WebKit cannot seat phones here; whether real Safari connects is not
established either way.

C-14 was re-run by the integrator under Chromium and WebKit on clean tree
`9e56fd4f`: `uat/evidence/C-14-unsupported-browser/x05-chromium/` and `x05-webkit/`.
Both completed 22 steps with `errors: []`. All 22 stills per run have been opened
and described in their REPORTs; 04, 10 and 16 show the full lobby in both engines.
These replace the older C-14 runs and their provenance notes. Development build
only: the `productionChecks` selector edit has not been run under `--production`.

Review 2 found that round 4's cancellation exception could hide application fetch
timeouts and did not fix the C-14 race. The integrator removed it in `9e56fd4f`:
no request failure is excused for cancellation, and a unit test pins that behaviour.
C-14 now waits for `.lobby` on `/host`, rather than accepting the route-loading
`.room-status` placeholder and navigating away while modules are still loading.

REL-004 and REL-006 remain in progress with the coverage limitations above.

## Requests

Integrator: update the shared trackers and record the agreed partial scope at merge.
Retain REL-004 and REL-006 in progress until the missing browser, production and
real-device checks are done. Keep C-14 as the REL-006 unsupported proof.

## Round 1 validation

One-minute loads from uptime immediately before each launch:

| Check | Load | Result |
|---|---:|---|
| VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/uat | 7.50 | 4 files, 34 tests passed |
| pnpm exec tsc -b tsconfig.build.json | 6.64 | Failed: missing JSDoc parameter type in slice |
| pnpm exec tsc -b tsconfig.build.json | 6.48 | Passed after annotation fix |
| pnpm exec eslint tools/uat uat/slices/X-05-browser-matrix.mjs --max-warnings 0 | 5.63 | Passed |
| pnpm run lint:design | 4.97 | Passed, 464 files |
| pnpm exec tsc -b tsconfig.build.json | 4.76 | Passed after fixing game seed to 42 |
| pnpm exec eslint tools/uat uat/slices/X-05-browser-matrix.mjs --max-warnings 0 | 4.77 | Passed after seed change |

No generated .js, .js.map or .d.ts files were left beside sources. No browser run or
visual review was performed. REL-004 remains in progress.

## Round 2 — strip-only launch and phone compatibility

REL-004 / REL-006: replaced the Harness constructor parameter property with a declared
field and assignment. A regression test reads every tools/uat TypeScript source (including
harness.ts and runner.ts) through Node's stripTypeScriptTypes in strip mode. The actual
Node run.mjs usage path also printed usage and exited 0 without starting browsers.

parseRunnerArgs records phoneBrowserExplicit. Without --phone-browser, phone contexts
retain exactly the legacy viewport preset, touch/mobile flags, iPhone Safari user agent,
DPR 3 and reduced-motion setting. Explicit chromium uses Pixel 7; explicit webkit uses
iPhone 13 on the selected WebKit browser. Both override the descriptor viewport with the
preset and retain reduced motion. Tests compare complete context options, cover portrait
and landscape legacy presets and reduced motion, and check explicit flag parsing.
This supersedes round 1's unconditional descriptor selection; the four matrix commands
above already pass the flag explicitly and remain applicable.

One-minute loads from uptime immediately before each launch:

| Check | Load | Result |
|---|---:|---|
| VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/uat | 2.15 | Passed: 4 files, 36 tests |
| node tools/uat/run.mjs --help | 2.22 | Usage printed; exit 0; no browser launch |
| pnpm exec tsc -b tsconfig.build.json | 2.28 | Failed: exactOptionalPropertyTypes field assignment; fixed |
| pnpm exec tsc -b tsconfig.build.json | 2.78 | Failed: missing generated declarations after cleanup mistake |
| pnpm exec tsc -b tsconfig.build.json | 3.03 | Passed after invalidating generated build caches and regenerating declarations |
| pnpm exec eslint tools/uat uat/slices/X-05-browser-matrix.mjs --max-warnings 0 | 3.19 | Passed |
| pnpm run lint:design | 3.57 | Passed: 464 files |

Cleanup initially included ignored generated declarations in build directories by mistake;
the successful final TypeScript build restored those outputs. The final cleanup was limited
to outputs beside TypeScript sources; none were found. No tracked files outside X-05's
owned paths changed. Round-1 work is retained. No commit, UAT, perf, verify, installation
or dependency change was made. Browser matrix execution and visual review remain with
the integrator; REL-004 remains in progress.

## Integrator: first matrix runs (2026-11-18)

- chromium-chromium and chrome-chromium (branded Chrome 157 host): passed end to end, no page or
  console errors except Chrome's own `/favicon.ico` 404 (declared expected; the site has no favicon,
  logged for X-01). Both ran on a tree from before A-09, P-05 and R-02 merged; they are re-run on the
  merged tree before close.
- webkit-webkit and chrome-webkit: the TV page and the phone join page load in WebKit 27.2 and the
  unsupported message does not show, but no phone is ever seated ("Joining the room… Connecting to
  the host."). A same-page loopback check in this Playwright WebKit build on macOS shows why:
  `RTCPeerConnection` exists, but it gathers no ICE candidates and a data channel never opens
  (state stays "new"); Chromium opens the same channel at once with an mDNS host candidate. So
  Playwright WebKit cannot stand in for Safari's networking here; the cause inside the build is not
  established. Phones on iPhone Safari and a Safari big screen stay unproven until real devices
  (S-05, K-07, X-09).

## Round 3 — review 1 corrections

REL-004 / REL-006: both settings captures wait for fields on the TV and leader phone.
Rabakz resolves right and wrong options from the shipped question bank: phone 2 answers
wrong first, with phone lock-out and TV seat/option marks asserted before the answered
stills; phone 1 then answers correctly. Reveal stills wait for the TV's final 100 pts and
the phone's matching Score 100, Right and Wrong states. Peek Poker waits for all 16
face-down phone cards and the full TV canvas flip duration plus a paint boundary.

REPORT and run.json identify implicit phone selection as
"chromium (legacy iPhone emulation)". Empty coverage is omitted from run.json and REPORT;
other slices receive no extra blank lines. Regression tests cover implicit and explicit
metadata and absent coverage formatting.

Harness follow-up for a later tools/uat issue: the still settle check cannot see
requestAnimationFrame count-ups (packages/ui/src/motion.ts countUpAt), and the Peek Poker
canvas card flip also got past it. Both need coverage; harness settle logic is unchanged
in round 3.

Only the four requested checks are authorised this round; browser runs and visual review
remain with the integrator. Validation results follow below.

One-minute loads from uptime immediately before each round 3 launch:

| Check | Load | Result |
|---|---:|---|
| VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/uat | 3.16 | Passed: 4 files, 39 tests |
| node tools/uat/run.mjs --help | 3.15 | Usage printed; exit 0; no browser launch |
| pnpm exec eslint tools/uat uat/slices/X-05-browser-matrix.mjs --max-warnings 0 | 3.15 | Failed: four typing/style findings; corrected |
| pnpm run lint:design | 3.15 | Passed: 484 files |
| VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/uat | 2.37 | Passed after corrections: 4 files, 39 tests |
| pnpm exec eslint tools/uat uat/slices/X-05-browser-matrix.mjs --max-warnings 0 | 2.37 | Passed |
| pnpm run lint:design | 3.06 | Passed: 484 files |
| pnpm exec eslint tools/uat uat/slices/X-05-browser-matrix.mjs --max-warnings 0 | 2.83 | Passed after using Vite's workspace /@fs path for motion tokens |

No UAT, verify, performance run, installation or dependency change was performed in round 3.

## Round 4 — engine request cancellations (removed after review 2)

Historical round-4 implementation, removed in `9e56fd4f` as explained in Close-out:
the harness ignored only the exact request failure strings
`cancelled` (WebKit), `net::ERR_ABORTED` (Chromium) and `NS_BINDING_ABORTED`
(Firefox), which identify engine cancellation of an in-flight request. Each stays
in run.json's errors list with `expected: true`, the original text and URL, and
`ignored: "Engine cancelled an in-flight request"`. Every other same-origin
request failure remains unexpected; existing signal-error scoping is retained.

Parameterised unit tests cover all three engine strings, a real
`net::ERR_CONNECTION_REFUSED` failure and a non-exact `cancelled by server`
string. They check error counting and the persisted run.json entries and reasons.

One-minute loads from uptime immediately before each round 4 launch:

| Check | Load | Result |
|---|---:|---|
| VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/uat | 6.83 | Passed: 4 files, 44 tests |
| pnpm exec eslint tools/uat --max-warnings 0 | 6.52 | Passed |

Both commands completed well within ten minutes. Only these two checks were run
in round 4; no browser run or visual review was performed then. The cancellation
rule and its tests were subsequently replaced by the integrator's review-2 fix;
see Close-out for the completed C-14 reruns.

## Round 5 — docs and evidence review

Corrected the two r3 phone-emulation descriptions, recorded provenance, filled both
C-14 REPORT reviews and acceptance tables after opening all 44 stills, and removed
the superseded merged evidence and empty original Chromium folders. No code changed;
no browser, UAT, verify or other test command was run, and no commit was made.
