# F-07 — UAT harness

## Goal

Provide repeatable player-side UAT with real local pairing, isolated Chromium phones, trusted touch input and evidence awaiting human visual review.

## Requirement IDs

NFR-TEST. C-07 and C-08 scripts exercise the platform IDs named in their headers; this slice does not close those requirements or claim browser UAT passed.

## Acceptance

- Memory refusal happens before servers or Chromium start.
- Worktree ports and explicit environment overrides select isolated local servers.
- All owned server process groups stop on success, failure, interruption and timeout; surviving descendants receive SIGKILL after SIGTERM.
- Each phone has its own context, touch emulation and device scale factor 3.
- Real page interactions create and join rooms; screenshots and browser-composited JPEG contact sheets go to the owned run folder; individual frames are retained only with --frames.
- Steps, join timings and expected/unexpected page errors are recorded; unexpected errors fail execution.
- Reports leave visual findings and reviewer attribution blank.

## Implementation and helper API

Plain Node 24 ESM entry point: `tools/uat/run.mjs`. The existing TypeScript checks cover the library. A narrow Node resolve hook maps the library's `.js` specifiers to `.ts` sources; Node strips types without a dependency or compilation step. The built-in slice registry imports both `.mjs` scripts for typechecking. Direct glob coverage is requested below; ESLint already selects both tools and slices.

| Helper / property | Use |
|---|---|
| `step(name, async () => ..., timeoutMs = 60000)` | Persist timing and failures; race the action against a deadline; capture every open page on failure |
| `createRoom()` | Navigate real `/host`; return accessible room code |
| `joinPhone(name)` | Join through `/play`; return `{page, ms}` and record Join-to-seat timing |
| `newPhone('landscape' \| 'portrait')`, `openJoin(page, name)`, `waitSeated(page, name)` | Isolated phone, join form, phone acknowledgement plus host seat; one extra context permitted for ninth-phone refusal |
| `host`, `phones`, `code`, `origin`, `maxPhones` | Current host page, phone pages and run configuration |
| `hostText()`, `phoneText(page?)` | Visible body text |
| `thumbs(page)` | CDP finger driver: `down(point, id?)`, `move(points, {id, steps, everyMs}?)`, `up(id?)`, `tap`, `hold`, `drag`, `dispose`; hold finger 2 while moving finger 1 for multi-touch |
| `shot(name, page?, clip?, settle = true, allowUnsettled = false)` | Return {file, unsettled}; record settling and fail unsettled stills unless explicitly allowed |
| `frameStrip(name, page?, {frames, everyMs, clip}?)` | JPEG contact sheet; individual frames only with --frames; 2–12 frames, default 6 |
| `slowMotion(factor, path?)` | Navigate demo URL with `slow` query parameter |
| `reducedMotion(on)` | Media preference for current pages and future phones |
| `network.stopSignal()`, `network.startSignal()` | Stop/restart only owned pairing process group, retaining durable state |
| `network.resetSignal()` | Stop pairing, discard temporary server state, restart; used to prove genuinely missing saved room |
| `closeHost()`, `reopenHost()` | Close/reopen host, restoring captured sessionStorage before app code in the new tab |
| `reloadPhone(page)` | Real reload in its existing context |
| `expectError(stringOrRegex, pageLabel, urlPattern?)` | Register inside a step before action; required host/phone label, optional exact/regex URL; cleared when the step ends |
| `hostSeatContent()`, `hostSeat(name)` | Active host content excluding aria-hidden copies; exact nickname match across line spans |
| `expectSignalError(pattern, pageLabel = 'host')` | Step-scoped expectation restricted to this run’s signal URL |
| `save(status?)`, `assertNoUnexpectedErrors()` | Persist evidence manifest/report; reject unexpected console and page errors |

Use `hostPresets` from `tools/uat/core.js` for 720p, 1080p and 4K via `host.setViewportSize()`. Phone default is landscape as specified in UAT.md; portrait is also available. Device emulation does not claim to prove real-device touch feel.

## Running and UAT script

The root script is available. On a fresh machine first run `pnpm exec playwright install chromium`:

```sh
pnpm uat -- C-07-host-lobby
pnpm uat -- C-08-join-page --phones 8 --headed
KAKI_UAT_HEADED=1 pnpm uat -- C-07-host-lobby --keep
```

Direct entry point: `node tools/uat/run.mjs <slice>`; `--help` lists every flag.

Ports honour `KAKI_PORT_WEB` / `KAKI_PORT_SIGNAL`; otherwise the current worktree directory's issue ID uses `worktree.sh` arithmetic (F-07: 4880/4881). The host origin and signal URL use 127.0.0.1 consistently. A random admission secret and a temporary Wrangler config live outside the repository; persistence lives in that same temporary directory. Existing `apps/signal/.wrangler` causes refusal rather than deletion of somebody else's state. Cleanup removes owned temporary files and any newly created signal `.wrangler` folder.

Each run replaces only a folder carrying its `.uat-run` signature. An existing unmarked folder is refused, and run names must never be shared with human evidence. By default a run uses `uat/evidence/<slice>/auto/`. `--out run-2` selects another harness-owned child (letters, digits and dashes only). Parent files and sibling runs are preserved; linked parents and traversal are refused. `--max-mb 12` sets the evidence ceiling in MiB; run.json records every file size and the total. `--keep` keeps successful runs visible until Ctrl-C, subject to the overall 10-minute timeout. Failures clean up immediately. A successful automated run records `completed-awaiting-visual-review`, never visual acceptance.

C-07: real room, reload, outage preserving room, genuinely missing saved room; demo empty/one/three/eight players, long names and error states at 720p/1080p; 4K lossless PNG only for the full lobby and longest names; other captures and individual frames use quality-90 JPEG to keep git evidence compact (contact sheets are JPEG after round 3). Join, held, leave and return strips use K=10, clipping the changed seat plus one neighbour each side (where available), at DPR 1. Nine samples span the changed seat's actual Web Animation end time plus 100 ms, ending settled. Round 4 loads at normal speed, waits for the initial reveal to settle, then updates the URL to slow=10 before the independent 2000 ms change timer. Capture starts when the changed seat gains an outgoing copy and samples through removal, with first/last-frame assertions. Sheets use original captured dimensions, with at most three columns and as many as fit within 1920 px. No second whole-row overview is generated. Reduced motion polls the current seat list immediately with a 10-second deadline, normalising line-split nickname text, then checks computed opacity and seat-list Web Animations on the next frame. All page.evaluate calls on harness pages (including the compositor) are raced against a 15-second deadline. Steps default to 60 seconds with a third-argument override; the whole asynchronous run, including setup, is raced against abort with a default 10-minute deadline (`--timeout-min N`). Timeout errors identify the active step, failure screenshots are attempted for each open host/phone before cleanup, and whole-run abort persists the active step as failed. C-08: eight joins, one-player/eight-player host evidence, ninth refusal, reload, host close/reopen, pairing-only 25-second outage with live rename, and join timings. C-08 explicitly requires eight phones. Demo evidence names include `demo`; real-server evidence includes `real`.

## Out of scope

Performance instrumentation (`perf.json`, F-08), game seeds before game-launch controls exist, real hardware and release browser checks. No shared documents, manifests, dependencies, lockfile or contracts changed. No browser, Wrangler or network run in this sandbox.

## Close-out

- NFR-TEST code: `tools/uat/{core,harness,thumb,runner}.ts`, `tools/uat/run.mjs`; scripts: `uat/slices/C-07-host-lobby.mjs`, `uat/slices/C-08-join-page.mjs`.
- Unit tests: `tools/uat/core.test.ts` (arguments, ports, memory refusal, evidence naming/report, thumb paths, matching, process groups with SIGTERM-resistant descendant and unrelated survivor); `harness.test.ts` (page-scoped error expectations, failed-step persistence, distinct phone contexts); `thumb.test.ts` (simultaneous CDP fingers, retained button touch, tap/hold/release).
- Validation: `VITEST_MAX_WORKERS=2 pnpm verify` passed; Test Files  129 passed (129); Tests  2945 passed | 1 skipped (2946); Duration  348.74s (transform 2.28s, setup 0ms, import 8.60s, tests 671.39s, environment 10ms). Final library/slice lint and typecheck also passed.
- Evidence: `uat/evidence/F-07-uat-harness/verify.txt`, `unit.txt`, `REPORT.md`. Browser evidence and independent visual review remain pending with the integrator. No screenshots were generated or looked at for this slice.

## Round 1 correction close-out (NFR-TEST)

- Read the integrator's `/tmp/claude-502-f07-run1-out/{run.json,REPORT.md}` and opened its strip: it shows the initial Creating reveal and crops seat content, confirming the report.
- Output ownership is tested using parent human-report and sibling-run sentinels, replacement of stale run content, unsafe names, and linked-parent refusal. Tests also cover configurable byte ceiling, embedded grouped reports, metadata and error counts. Existing distinct-context tests remain.
- C-07 now explicitly asserts reload room code, outage chip, expired heading/storage clearance, viewport scroll bounds, seat status-row alignment and reduced-motion settlement. No C-07 or C-08 browser run was made in this correction: authorised evidence writes are restricted to F-07; browser capture and visual acceptance remain with the integrator.
- `node tools/uat/run.mjs --help` succeeds and lists both slices, output/size flags and existing options. Focused typecheck, lint and 11 harness tests pass.
- Full verification evidence: `uat/evidence/F-07-uat-harness/verify-round1.txt` `VITEST_MAX_WORKERS=2 pnpm verify` exited 0: 129 test files passed; 2946 tests passed, 1 skipped (2947); duration 231.90s; build budgets and trace check passed. Final focused harness tests, direct typecheck and lint passed after the last edits. Help output and focused test output are saved alongside it in `help-round1.txt` and `unit-round1.txt`.


## Round 2 correction close-out (NFR-TEST)

- Read `uat/evidence/C-07-host-lobby/auto/run.json` and opened all four strip sheets without writing there. The run records 389 seconds in the reduced-motion step before SIGINT; sheets show full cards but only their first frame is mid-transition at the old scale.
- Hang cause: the old slice lines 56–66 created an unbounded observer promise and required `seats.textContent.includes('Waffle Fern')`. `apps/web/src/host-route.tsx:32` renders name lines in adjacent spans, producing `WaffleFern` when wrapped. The observer also lacked an immediate check and held a node reference across asynchronous demo rendering. Bounded polling reselects the list each time, handles already-settled state and normalises whitespace. Settlement uses existing data attributes, computed opacity and `document.getAnimations`, without private transition classes.
- Deadline regression coverage: fake never-resolving step with per-step override, fake never-resolving page evaluation, named persisted failure and screenshots for both host and phone. CLI tests cover default/custom whole-run deadline and invalid values. Existing process-group cleanup tests remain.
- Exact validation commands: `pnpm exec tsc --noEmit --pretty false`; `pnpm exec eslint tools/uat uat/slices`; `pnpm exec vitest run tools/uat/harness.test.ts tools/uat/core.test.ts`; `VITEST_MAX_WORKERS=2 pnpm verify`; `node tools/uat/run.mjs --help`. Full verification takes several minutes on this shared machine; focused tests take about one second.
- Integrator rerun command: `pnpm uat -- C-07-host-lobby --out round-3 --timeout-min 10`. Expect about 1–2 minutes (the first full run took about one minute; K=10 adds capture time). Inspect all revised strips and reduced-motion screenshot and check total evidence size; revised browser capture remains pending. Only F-07 evidence was written during this correction.
- Keep the exact root tsconfig include-line request in Requests item 6 below; no tsconfig change is made here.

- Round-2 verification: `VITEST_MAX_WORKERS=2 pnpm verify` exited 0; full unit totals, duration, bundle budgets and trace-check tail are saved in `uat/evidence/F-07-uat-harness/verify-round2.txt`. Focused deadline tests passed (11 tests in 2 files); help output includes `--timeout-min 10`.

## Round 3 correction close-out (NFR-TEST)

- Every generated run has `.uat-run` with the `kaki-uat-v1` signature and Wrangler ownership metadata. Existing unmarked folders, including human evidence named `round5`, are refused before writes. Evidence preparation follows the existing-state, memory and all port checks. Main checkout ports are 6700/6701; issue worktrees retain their arithmetic.
- Touch release sends a move containing remaining fingers, and an empty end only on the last release. Cancel carries no points. Tests assert the corrected sequence.
- Host seat helpers exclude aria-hidden outgoing content and match names across adjacent wrapped spans. Both slices use the helper; the C-07 reduced-motion step is unchanged. Seated acknowledgement targets a heading; rename uses the Your name label; quality accepts Connected/Good/Weak/Relayed. Read C-08 source read-only; no product code changed.
- Expected errors are confined to a step, page and optional location URL. Outage expectations apply only to host requests on the signal port, including HTTP/WebSocket URLs. Crashes and failed web/signal requests are recorded; phone pairing failures remain unexpected. Server exits abort immediately with the server and current step named.
- SIGINT (including a second interrupt), SIGTERM, SIGHUP, uncaught exceptions and unhandled rejections initiate process-group cleanup. A browser returned after an aborted launch is explicitly closed. Successful kept runs preserve completed status and exit zero on interrupt or deadline; fatal failures remain failures.
- Captures enforce the configured byte cap, including failure captures and failed-run manifests. Contact sheets are JPEG with correctly typed frame sources; separate frames are removed unless `--frames` is set. Phones have isMobile, touch, independent contexts and a mobile Safari-like user agent. This is **Chromium emulation, not Safari**.
- No browser UAT was run: authorised evidence writes remain limited to this slice, and C-07's reduced-motion failure is a known product fault fixed in C-08. Integrator browser reruns and visual inspection remain required.

### Round 3 validation

- `pnpm exec tsc --noEmit --pretty false` and `pnpm exec eslint tools/uat uat/slices` passed.
- Focused regression suite: 20 tests in 4 files passed; covers evidence sentinels/refusal ordering, corrected CDP releases, error page/URL/step scoping, crashes/failed requests, phone contexts, readiness identity, keep interruption/deadline, launch abort, server exits, frame retention and capture limits (including rejected-frame cleanup).
- Final `VITEST_MAX_WORKERS=2 pnpm verify` exited 0: 130 test files passed; 2955 tests passed, 1 skipped (2956); duration 330.42 seconds; build budgets and trace check passed. No checks or limits changed.
- Evidence: `uat/evidence/F-07-uat-harness/verify-round3-final.txt` (final full verification), `verify-round3.txt` (earlier passing full verification), `unit-round3.txt` (20 focused tests), `help-round3.txt` (CLI flags). Browser UAT and visual review remain with the integrator.


## Round 4 close-out (NFR-TEST)

- Read both integrator run.json files. Reason-specific WebSocket expectations retain connection refusal for outages and 404 handshake for expiry; ERR_ABORTED is confined to saved-room expiry, and ERR_FAILED is removed.
- C-07 settles its initial reveal at normal speed before setting slow=10 through history.replaceState. The independent 2000 ms timer applies the change; frame capture waits on the changed seat's outgoing copy. First/last-frame assertions check outgoing presence/removal and incomplete incoming reveal. Until the requested configurable demo timer exists, capture start is derived from the fixed timer’s applied change, observed on the changed seat via requestAnimationFrame polling. Contact-sheet unused cells use the page background colour.
- C-08 targets the room-full heading, requires measured Good/Weak/Relayed quality before outage, accepts Connected afterwards, and observes a real reduced-motion rename through its next frame before taking evidence.
- shot() returns {file, unsettled}, persists shotStates in run.json, marks UNSETTLED in REPORT.md, and throws unless allowUnsettled is explicitly true (fifth argument). Strips bypass settling deliberately. Removed the redundant 500 ms wait.
- Regression tests exercise pairing addresses in message text versus APP addresses and unsettled capture failure/opt-in/reporting.
- Integrator's existing run folders are preserved. These corrections have not been run in a browser here. --headed is unproven: requestAnimationFrame may be throttled in covered windows. Visual review remains with the integrator.

### Round 4 validation

- Focused tests: 16 passed in 2 files (`uat/evidence/F-07-uat-harness/unit-round4.txt`). Final lint, typecheck and diff whitespace checks passed.
- `VITEST_MAX_WORKERS=1 pnpm verify` exited 0: 136 test files passed; 3120 tests passed, 1 skipped (3121); duration 600.35 seconds. Build budgets and trace check passed. Evidence: `uat/evidence/F-07-uat-harness/verify-round4-single-worker.txt`.
- Earlier two-worker logs retain the known recipes conformance timeout; the first also caught report whitespace, corrected before the passing focused and final runs. No check or existing timeout/acceptance limit changed.

## Requests

1. Replace CLAUDE.md's `pnpm uat` row exactly with:

   | `pnpm uat -- <slice>` | Playwright UAT (works today); output in `uat/evidence/<slice>/auto/` or `--out <name>`; replaces marked run folders only; automated completion awaits visual review |

2. Replace docs/UAT.md section 2 with:

   ## 2. Evidence

   Install Chromium on a fresh machine: `pnpm exec playwright install chromium`. Run `pnpm uat -- <slice>` using scripts in `uat/slices/*.mjs`. Generated evidence goes to `uat/evidence/<slice>/auto/`, or `uat/evidence/<slice>/<name>/` with `--out <name>`. Only run folders carrying the harness's `.uat-run` signature may be replaced; existing unmarked folders are refused. Keep human evidence outside generated run folders. Named `--out` runs are for keeping and must use distinct names when preserving earlier evidence.

   Flags include `--frames` (retain individual strip frames), `--max-mb <MiB>` (default 12), `--timeout-min <minutes>` (default 10), `--keep` (keep successful runs open until interrupt or deadline), `--phones <1..8>` (default 8), `--headed` (unproven in covered windows), `--out <name>` (letters, digits and dashes), and `--help`.

   | File | Content |
   |---|---|
   | Numbered host/phone `.jpg` screenshots (`.png` for full 4K) | Player-visible states |
   | Numbered `strip-<name>.jpg` contact sheets | Animation samples; individual frames only with `--frames` |
   | `run.json` | Steps, Join-to-seat timings, expected/unexpected errors, screenshot manifest, per-shot unsettled flags and evidence sizes |
   | `REPORT.md` | Generated image index, timings and expected errors; UNSETTLED marks captures that missed settling; visual findings and acceptance await human review |
   | `perf.json` | Frame-time and input-delay percentiles when supplied by F-08 |
   | `.uat-run` | Harness ownership marker; keep with the run folder |

   Expected browser errors must be registered inside a step before the action and scoped to the page and pairing address with a reason-specific pattern. Unexpected errors fail execution. Stills fail if motion has not settled within 3 seconds unless the caller explicitly passes allowUnsettled. A completed automated run awaits visual review; open every screenshot and strip before recording acceptance. Commit reviewed evidence as the record of what was seen.

3. Replace .claude/agents/uat-runner.md's Do steps 1, 2 and 6 exactly with:

   1. Run `pnpm uat -- <slice>`. If no script exists, write `uat/slices/<slice>.mjs` following docs/UAT.md sections 1 and 4, naming requirement IDs in its header. Install Chromium first with `pnpm exec playwright install chromium` if needed. Use `--out <name>` to preserve another run.
   2. Inspect the generated `uat/evidence/<slice>/auto/REPORT.md` (or `<slice>/<name>/REPORT.md` with `--out <name>`), run.json, screenshots and contact sheets. The `.uat-run` marker identifies replaceable generated folders; keep human evidence separate. Performance evidence comes from F-08 when available. Automated completion awaits visual review; investigate UNSETTLED rows.
   6. Fill the generated report's visual review and acceptance tables after opening every image. Record reviewer, pass/fail, evidence links and observed problems, including any assertion-green visual failures. Preserve earlier reviewed runs with distinct output names.

4. Add this line to the integrator-owned .gitignore:

   `uat/evidence/**/.uat-run`

5. Retain these earlier shared-document corrections: docs/UAT.md section 1 scripted-thumb bullet: `- **Scripted thumbs:** a helper dispatches trusted Chromium touch events through CDP (press, hold, drag along a path, multi-touch). Chromium derives pointer events from those touches, so the controller kit itself is under test.` Replace section 6's final paragraph with: `Each UAT script names the requirement IDs it exercises in its header. tools/trace_check.py verifies done rows against their listed evidence paths; it does not parse script headers or establish visual acceptance.`

6. In root tsconfig.json include, add `"uat/**/*.mjs",` immediately after `"uat/**/*.ts",` so the scripts receive direct checkJs coverage as well as registry imports. Existing ESLint globs already cover them.


7. apps/web has no on-demand demo change hook. In host-route.tsx's DEV demo branch, support `&changeAfter=<milliseconds>` by replacing the fixed setTimeout delay `2000` with `Math.max(0, Number(params.get('changeAfter') ?? 2000))` (reject non-finite input or fall back to 2000). Default behaviour stays 2000 ms. This lets UAT load with slow=10 and defer the change until the initial reveal is fully settled. Until then C-07 loads normally, settles before the fixed timer, sets slow through history.replaceState, and starts capture at the observed frame that timer applies the change.
