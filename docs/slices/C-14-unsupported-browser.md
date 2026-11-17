# C-14 — Unsupported browser (REL-006)

## Readings

Read CLAUDE.md, AGENTS.md, PLAN §5–6, C-console backlog (C-14 row; no additional C-14-specific notes), PRD (including REL-004/006), DESIGN rules/§2/§4/§6, ARCHITECTURE §2–5, PERFORMANCE (PERF-020/022), WORKFLOW, HANDOFF and STATUS. Read index.html, main.tsx, landing-route.tsx, host-route.tsx, phone-route.tsx, browser.ts, phone-browser.ts, favicon.ts, Overlap.tsx, picker-route.tsx, UI tokens, design lint, budget checker, UAT runner/harness and C-09 UAT.

The current request overrides the normal issue-agent commit/evidence instructions: changes remain in the tree, no commit, no browser run and no evidence directory writes. No shared trackers, phone files, contracts, package manifests, lockfile or check limits were edited. No dependencies or exemptions were added. No node_modules symlinks or manual modifications were made; pnpm itself attempted its automatic dependency bootstrap when the required commands ran.

## Choices and implementation

- `support.ts` exposes injected, pure `missingFeatures(env)` and `supportDecision(env)`. Main checks before rendering and mounts BrowserNotSupported instead of App. The fallback therefore avoids App's layout effect and every route effect (including network creation).
- Feature names are stable keys, with separate plain-word descriptions. Check WebRTC's constructor and prototype createDataChannel, WebSocket, Element.prototype.animate, the exact clip-path syntax and PointerEvent only for /play (also /play/). ES modules are checked separately through nomodule.
- Additional shell dependencies checked: Fetch; AbortController; AbortSignal.timeout (browser adapters); URL and URLSearchParams (route/join parsing); crypto.getRandomValues (host seat tokens); matchMedia and getComputedStyle (shell motion/favicon); requestAnimationFrame/cancelAnimationFrame and performance.now (shell timing); ResizeObserver (picker text fitting). DOM, ordinary ECMAScript built-ins and timers are baseline assumptions of a module-capable browser. Storage access is already caught by platform adapters and is not a new hard blocker; visualViewport is guarded. Wake lock, vibration and motion are optional and never block. No browser identity or user-agent inspection.
- Exact requested British English copy with typographic apostrophe, no controls, quiet missing-feature detail. Reuse the console marble surface and UI tokens; φ spacing, 55 px heading and 34 px guidance on TV, 34/21/13 on phones. Independent responsive layout rather than scaling a 1920 px TV screen down to phone size. Overflow can scroll vertically for unusually long missing-feature lists. No animation is introduced, so reduced-motion preferences require no additional effect.
- Classic nomodule fallback reveals static heading, both guidance lines and a modules detail. Design lint forbids copied raw token colours outside packages/ui, so use user-agent colours and minimal inline font/padding/wrapping instead. No exemption or disguised colour literal. It cannot reproduce the module surface without token CSS; readability takes precedence in this bootstrap-only fallback.
- Demo is a dynamic import behind import.meta.env.DEV, matching existing route demos. It is loaded only after the real check passes, so missing URL APIs cannot break the fallback through demo parsing. Known keys only; `?demo=unsupported&missing=webrtc,animate`. Production DCE must remove the import and fixture. Unit source wiring test checks the guard; the production output test checks fixture chunk absence when build output exists (explicitly skipped here). Production elimination is not yet proven by a build.

## Validation

- Required `VITEST_MAX_WORKERS=2 pnpm verify` attempted. It failed before checks: this worktree has no node_modules/.bin, pnpm attempted automatic dependency fetching, and network DNS is unavailable. Final tail:

```text
Failed to fetch https://registry.npmjs.org/@humanfs/node/-/node-0.16.8.tgz
error sending request: client error (Connect): dns error
failed to lookup address information: nodename nor servname provided, or not known
```

- Direct existing main-checkout Vitest executable with a temporary /tmp config (root remains this worktree, vitest import alias only, maxWorkers 2): `support.test.ts`: **26 passed, 1 skipped** (production output absent). No repo config changes. The normal config could not resolve vitest from this worktree.
- `tools/dev.test.ts` rerun alone using the same temporary-config method: **5 passed**. No recipes timeout was encountered because the workspace suite could not start.
- Dependency-free workspace check, design lint (298 files), trace check (152 requirements), UAT script `node --check`, and `git diff --check`: passed.
- Direct main-checkout tsc also attempted: failed on absent node/Cloudflare type definitions and unresolved workspace packages. Full typecheck and ESLint remain unproven.
- Baseline `pnpm build` attempted before edits; after-build attempted too. Both dependency bootstrap attempts failed on unavailable registry DNS. **PERF-020 before/after: unavailable; PERF-022 host/deploy before/after: unavailable.** Budgets remain 300,000 and 1,500,000 gzip bytes. No numerical size or small-cost claim is made without a production build. No runtime dependency or image is added.

## UAT and what is not proven

`uat/slices/C-14-unsupported-browser.mjs` uses the existing harness: /, /host and /play at 1280×720, 390×844 and additionally 320×568; exact heading/guidance/details, no buttons, no horizontal scroll; normal route without demo; screenshots of each. Separate browser context deletes RTCPeerConnection before page scripts and checks all three real routes, exact missing detail and page errors, with screenshots. Context is closed in finally.

Not executed: browser UAT, screenshots or visual review, real old browsers, non-module fallback in an actual old browser, Safari/Edge, physical TVs/phones, three-metre readability, production fixture elimination or transfer budgets. No evidence was written. A module browser too old to parse the production JavaScript syntax is not detected by nomodule; no claim of coverage for that intermediate population. Real old-browser testing is explicitly required at integration.

## Close-out

REL-006 code: support.ts, BrowserNotSupported.tsx, unsupported.css, main.tsx, index.html; development fixture unsupported-demo.ts. Automated coverage: support.test.ts (all required feature omissions, all-present, play-only pointer requirement, optional APIs, copy, decision and wiring); UAT script above. Status: implementation ready for integrator review, validation incomplete due to dependency availability and the instructed browser restriction.

## Requests

Integrator: provision existing workspace dependencies, run pnpm verify with VITEST_MAX_WORKERS=2, build baseline and branch to record PERF-020/022 raw/gzip deltas, rerun support.test.ts after build to exercise production-output assertion, run this UAT script and inspect every screenshot, and test real old/non-module browsers. Complete independent review and shared trackers only after those checks. No scope expansion requested.


## Round 2 — REL-006 (2026-11-17)

This section supersedes round 1 validation and its intermediate-module-browser limitation. Read the slice note, index.html, support.ts and main.tsx first, then CLAUDE.md, AGENTS.md, PLAN §5–6, WORKFLOW, HANDOFF, STATUS, PRD and DESIGN; inspected vite.config.ts, support.test.ts, the UAT script, package scripts, installed Vite defaults and the budget checker. No rendered-screen CSS or component change, dependency, design-lint exemption, commit, browser run or evidence write.

### Bootstrap and feature agreement

Installed Vite is **8.3.8**, not an older Vite with the Chrome 87-era default. The config does not override build.target. Installed `vite/dist/node/chunks/node.js` defines `baseline-widely-available` as **Chrome 111, Edge 111, Firefox 114, Safari 16.4 and iOS 16.4**. Target remains unchanged.

Classic ES5 preflight precedes the module entry in source and built HTML. Its declared `classicFeatures` comment is checked against the exported support.ts list: **Promise.allSettled, globalThis, String.prototype.replaceAll, RTCPeerConnection, Element.prototype.animate, CSS.supports('clip-path', 'inset(0)'), and PointerEvent only on /play (including trailing slash)**. allSettled/globalThis/replaceAll are syntax-era proxies (replaceAll is newer than optional chaining); they are capability checks, not exact browser-version certification. The detailed in-app checker retains all previous checks and includes these three additional ECMAScript capabilities. supportDecision supplies the runtime values for main's existing environment object, while explicit injected undefined values remain testable.

Vite hoists its production entry into head, so removing a later module tag from the body is insufficient. The post HTML transform replaces the entry tag with an ES5 conditional loader. A failed preflight marks the document, skips creating the module script altogether, and reveals the static message at DOMContentLoaded. A passing preflight inserts the module entry. nomodule remains for browsers without modules. No app CSS/look changed.

Unit tests read index.html, check ordering, parse with new Function (the brief's requested narrow ESLint suppression), reject modern syntax tokens and compare the declared classic list and feature expressions. UAT scopes rendered-screen locators to #app main.unsupported and verifies the static message is hidden. The detailed missing-feature scenario now deletes WebSocket, since missing WebRTC intentionally hits the earlier classic guard. A separate context deletes Promise.allSettled on all three routes, checks the static screen, and checks #app is empty. Fixed existing UAT TypeScript errors without touching phone files.

### Transfer readings (PERF-020 / PERF-022)

Measured with the existing budget checker and production Vite build. Baseline temporarily restored HEAD versions of index.html, support.ts and vite.config.ts, then restored round 2 files; no other source was changed for measurement. Baseline typecheck/verify could not pass due to existing UAT type errors, so the budget checker was invoked directly. Final build was repeated after restoring changes.

| Reading | Before raw / gzip bytes | After raw / gzip bytes | Delta raw / gzip |
| --- | ---: | ---: | ---: |
| PERF-020 controller shared entry | 218927 / 74245 | 220392 / 74778 | +1465 / +533 |
| PERF-022 host | 218927 / 74245 | 220392 / 74778 | +1465 / +533 |
| PERF-022 deploy | 218927 / 74245 | 220392 / 74778 | +1465 / +533 |

All below the unchanged 300000 / 1500000 gzip-byte limits. Earlier commentary quoted an incorrect baseline; these are the captured budget-checker readings.

### Validation and close-out

- `VITEST_MAX_WORKERS=2 pnpm verify` ran sequentially, never concurrently with another verify. Initial run stopped on four existing UAT type errors. Final run passes workspace/typecheck, then stops on **five pre-existing unbound-method lint errors in main.tsx:39, 42 (three), 43**. main.tsx is excluded from the round 2 allowed edit list; no out-of-lane edit or lint exemption was made.
- support.test.ts: **31 passed**, including production fixture check with built output present.
- Production build/budget checker, design lint (298 files), trace check (152 requirements) and git diff --check passed.
- Separate full `VITEST_MAX_WORKERS=2 pnpm exec vitest run`: **151 files passed; 3316 tests passed, 1 skipped** (330.85 s). Isolated `tools/dev.test.ts` rerun: **5 passed**; the reported sandbox launcher failure did not reproduce. Changed-file ESLint passed.

Final verify tail (full log captured during this run in /tmp/c14-final-verify.log):

```text
✖ 5 problems (5 errors, 0 warnings)
[ELIFECYCLE] Command failed with exit code 1.
[ELIFECYCLE] Command failed with exit code 1.
```

- Browser UAT and screenshots remain for the integrator under the round 1 restriction; no real old-browser certification claimed.

### Requests

Integrator: fix the five main.tsx unbound-method errors (wrap the method references) or authorize that file in a follow-up; run full verify and the updated UAT, visually inspect screenshots and exercise real older browsers. Changes remain in the tree as requested. REL-006 changes are ready for review; full verify is blocked by the explicit path boundary.

## Round 3 — REL-006 (2026-11-17)

### Readings and attribution

Read the round 1/2 slice note, index.html, vite.config.ts, main.tsx, support.ts,
support.test.ts, style.css and the UAT script before editing. Also read CLAUDE.md,
AGENTS.md, PLAN §5–6, WORKFLOW, DESIGN (chosen §4 and lint rules), PRD REL-004/006,
HANDOFF/STATUS, tools/uat/runner.ts, run.mjs and harness.ts, package scripts,
tools/lint_design.mjs and tools/check_budgets.mjs.

Correction to round 2: the five unbound-method errors were introduced by this branch's
round 1 main.tsx environment extraction, not pre-existing repository failures. The
integrator supplied the binding fix now at main.tsx:41–46. That fix is the integrator's;
round 3 preserves it and adds only the startup rejection handler in that file.

### Fixes and coverage

- apps/web/index.html:16–35: one classic reveal function first checks that #app has no
  children, hides it before revealing the message, and selects only the current path's
  guidance (/play and /play/ use phone guidance). Failed preflight and nomodule (:47)
  use the same function. The static main (:41) is fixed to the viewport and scrolls
  independently of the app's height/overflow rules. Plain user-agent colours remain:
  copied console colour literals violate design lint; no exemption was added. Explicit
  top/right/bottom/left edges work even before inset shorthand support; the inline
  font and heading size keep the message readable with or without the app stylesheet.
- apps/web/index.html:7–12 and apps/web/src/support.ts:25: preflight now requires both
  the AbortSignal constructor and its timeout method, matching the classic feature list.
  This raises the syntax-era proxy above the ES2022 class-field/logical-assignment
  parse floor. The installed Vite target remains unchanged (see round 2 readings).
- apps/web/vite.config.ts:21: inserted entry onerror plus window error filtering by
  entry URL/target signal the fallback; index.html:32 also checks after load plus one
  animation frame. apps/web/src/main.tsx:57 catches start() rejection. Every route to
  the static fallback uses the empty-app guard, preserving a working rendered page.
- tools/check_budgets.mjs:56: added only unsupportedDemo and unsupported-demo to the
  existing production fixture pattern list. Removed the build-output-dependent unit
  test, which previously skipped when verify ran before build. The build scanner now
  enforces this on every production budget check.
- apps/web/src/support.ts:26–32,51–54 and index.html:43–44: exact D-057 guidance,
  WebRTC described as direct connections between devices, technical feature names
  replaced with plain descriptions/a recent browser engine.
  apps/web/src/BrowserNotSupported.tsx:8 deduplicates displayed descriptions.
- apps/web/src/support.test.ts:56–96 checks the classic feature agreement and syntax,
  executes the classic code with small injected objects in node:vm (no DOM test
  environment), verifies the empty/rendered guard and path guidance, and checks startup
  catch wiring. Targeted run: 32 passed.
- uat/slices/C-14-unsupported-browser.mjs:53–104: a production entry point uses the
  existing runner's production extension (vite build then preview); no harness edit.
  Command for integrator: node uat/slices/C-14-unsupported-browser.mjs --production.
  The ordinary pnpm uat command retains development demos and real missing-WebSocket
  checks. Production steps cover missing allSettled, missing AbortSignal.timeout,
  intercepted entry parse failure, all three paths, load plus animation frame,
  hidden #app, heading bounds, entry insertion count, pageerror capture, and a working
  production page retaining its hidden static message.

### Validation and close-out

Targeted support tests: 32 passed. Changed-file ESLint, typecheck and design lint passed.
One initial verify attempt stopped at typecheck on the newly added UAT launcher's .ts
import. Corrected it to the runner's URL-based import pattern and checked its types/lint
before restarting verification. No concurrent verifies ran.

Browser UAT and visual review remain for the integrator: this request forbids writing
uat/evidence, and the runner writes there. No browser run, screenshots or evidence
writes were made. No dependencies, manifests, lockfile, phone files, packages, trackers,
design-lint exemptions or harness files were changed. Changes remain in the worktree,
as in the previous rounds; nothing pushed or merged.

### Requests

Integrator: run both development UAT and the production command above, inspect all
screenshots and test genuine non-module/older browsers. The production script simulates
failed classic capability checks in Chromium; it does not certify an actual old engine.

### Green verify and transfer readings

Final `VITEST_MAX_WORKERS=2 pnpm verify` exited **0**: workspace, typecheck,
ESLint, design lint (298 files), **151 test files passed; 3317 tests passed,
1 skipped**, production build/scanner/budgets and trace check all passed.
The suite took 415.33 s. Log: /tmp/c14-round3-verify.log. The final HTML-only
compatibility adjustment was separately checked with design lint and all 32 support
tests while the full suite ran; the final production build includes that adjustment.
Inspected built index.html: preflight precedes conditional entry insertion, the
stylesheet is retained, and fixed static layout plus path-specific hidden paragraphs
survive the production transform. No DOM test environment or new suppression was added.

Before readings below are from the existing round 2 dist output, measured before the
fresh verify build (220392 raw / 74778 gzip, matching the recorded round 2 readings).
After readings come from this verify's production budget checker:

| Reading | Before raw / gzip bytes | After raw / gzip bytes | Delta raw / gzip |
| --- | ---: | ---: | ---: |
| PERF-020 controller shared entry | 220392 / 74778 | 222137 / 75190 | +1745 / +412 |
| PERF-022 host | 220392 / 74778 | 222137 / 75190 | +1745 / +412 |
| PERF-022 deploy | 220392 / 74778 | 222137 / 75190 | +1745 / +412 |

Final verify tail:

```text
✓ built in 195ms
PERF-022 host: 222137 bytes raw, 75190 bytes gzip / 1500000
PERF-020 controller (shared entry): 222137 bytes raw, 75190 bytes gzip / 300000
PERF-022 deploy: 222137 bytes raw, 75190 bytes gzip / 1500000
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 90 in progress, 1 later, 61 not started
trace check passed
```

REL-006 round 3 close-out: code and automated verify are green; production and dev
browser UAT, visual review and independent review remain with the integrator. No
uat/evidence writes were made, including no changes visible in git status there.

## Round 4 — REL-006 (2026-11-17)

### Fix and coverage

Replaced the load-plus-animation-frame empty-app heuristic with an entry evaluation
marker. main.tsx sets data-entry=run as its first executable statement, inside the
entry module so parse failure cannot set it. At load, the classic backstop reveals
only for failed preflight or an absent marker. Existing entry error and start()
rejection handlers remain. Every reveal still returns when #app has children and
hides #app only when the static screen is shown.

support.test.ts exercises all 16 combinations of preflight result, marker presence,
error event and rendered children through the actual classic script in node:vm;
there is no separate pure decision function. Targeted C-14 run: 46 passed.
All existing UAT steps remain. Added a page.route delay of 3 seconds for the demo
chunk, asserting the app's own message and using a MutationObserver to record any
static fallback reveal during the delay.

### Validation and Close-out

`pnpm uat -- C-14-unsupported-browser --phones 1` exited 1 before browser launch:
`Memory gate refused: sysctl: sysctl fmt -1 1024 1: Operation not permitted`.
The denied sysctl left the memory-gate arithmetic operand empty. No evidence folder
was created, no evidence was written and no screenshots or visual review are claimed.

Ran full `VITEST_MAX_WORKERS=2 pnpm verify` exactly once after code changes: exit 0.
Workspace, typecheck, ESLint, design lint, 151 test files (3331 passed, 1 skipped),
production build/budgets and trace check passed. No recipes timeout or rerun.
Log: /tmp/c14-round4-verify.log. Final tail:

```text
✓ built in 159ms
PERF-022 host: 222181 bytes raw, 75215 bytes gzip / 1500000
PERF-020 controller (shared entry): 222181 bytes raw, 75215 bytes gzip / 300000
PERF-022 deploy: 222181 bytes raw, 75215 bytes gzip / 1500000
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 90 in progress, 1 later, 61 not started
trace check passed
```

Changes remain uncommitted under the same round 3 rules. No shared trackers,
dependencies, lockfile, contracts, phone files or harness changes.

### Requests

Integrator: rerun C-14 UAT where the memory gate and browser launch are permitted,
inspect screenshots, and complete independent review. Browser regression coverage
is implemented and typechecked but its runtime outcome is not proven here.

## Integrator at merge (2026-11-17)
Review round 2: clean, no must-fix. Integrator's fixes: `<noscript>` message in
apps/web/index.html (JavaScript off no longer gives a blank page) and the production
working-browser check over /, /host and /play with screenshots (uat/slices). Evidence round4
and round5 with the integrator's look. Open: only Chromium is exercised; the load and parse
backstops in WebKit and Firefox are covered at X-05 (browser matrix). If the entry fails to
load in a supported browser, the message says the browser can't run Kaki Arcade, which is
the wrong reason but not a blank page.
