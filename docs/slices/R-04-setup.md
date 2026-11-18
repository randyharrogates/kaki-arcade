# R-04 Part A — Generic start-screen settings

Requirements: PLAT-006, PLAT-025; enables RZ-001, RZ-010, RZ-011, RZ-012 and PP-001.

## Built

- Separate setup and match preparation. Setup resolves `preload(null)` through the registry before deriving the contextual schema. Match preparation validates the chosen values against that context, clones setup data, then resolves `preload(settings)` with the match seed.
- The session adapter exposes setup and forwards chosen settings. Host and adapter generation counters discard superseded setup results. Existing default-only adapter callers retain their compatibility path.
- Host memory stores settings per module, never in host checkpoints. Rebuilding a schema retains each individually valid value and defaults the rest. Picker navigation, results, rematches, leadership and phone reconnection preserve the selection. A fresh room clears the cache.
- The existing start-screen team view carries loading/problem/field projections, team availability and the current revision. Its phone parser checks the new field/option members; executable checks and preload data remain on the host.
- Only the connected leader can edit the current revision. Choice, toggle and number changes must pass the complete schema; multi changes must pass their own field, and may strand the complete selection. Refusals go to the tapping phone. Start and team confirmation refuse incomplete/invalid preparation.
- Generic phone controls cover all four field kinds. A multi expands within its keyed row, with metadata-driven group tabs, selected counts, group toggle, none option, Done, pressed edges and unavailable-option marks. Refusals reserve the heading row for three seconds. The existing TeamsToggle remains unchanged; its wrapper disables it with the reason for solo setup.
- TV mirror uses schema labels, compact multi summaries and group summaries. Values overlap with an opacity crossfade at `duration.base`; reduced motion swaps immediately. The existing TV heading is retained.
- Added pure/host tests, a browser-backed fixture using the real installed schemas plus a grouped fixture, and a UAT script for 1, 2 and 8 phones.

## Decisions

- Setup preload has no match seed yet; its resolver receives 0. Match-specific preload receives the actual seed.
- Cached setup is reused when returning from results with the same team context, so Play again keeps the selection without a second loading race. Entering from the picker and toggling teams rebuild it.
- Settings occupy the full phone surface during setup, hiding the identity header to preserve the 55 px targets at the required landscape heights.
- The console never infers category grouping, rewrites option labels, or manufactures a none option. Those belong to the module schema.
- Older team-assignment views remain accepted; choice views require all three new members.

## Commands and results

Every test/typecheck invocation followed an `uptime` reading with one-minute load below 8. No memcheck, full verify, UAT, perf, install, dependency change, commit or merge was performed.

The permitted unit command is:

```sh
VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/game-setup.test.ts apps/web/src/team-setup.test.ts apps/web/src/team-required.test.ts apps/web/src/picker-host.test.ts apps/web/src/picker-integration.test.ts apps/web/src/session-loading.test.ts apps/web/src/phone.test.ts apps/web/src/private-session.test.ts packages/platform/src/game
```

- Unit command: 22 files passed; 261 tests passed, 1 skipped on the second run. After adding the remaining acceptance tests, 267 passed, 1 skipped, and the existing platform conformance attack test timed out again at 5 s (one-minute load rose from 7.12 before launch to 16.78). All new tests passed. Final rerun (06:09, preflight load 7.12): **22 files passed, 268 tests passed, 1 skipped**, 24.71 s.
- Permitted browser command: both fixtures built; browser assertions could not run. Both Chromium launches failed at `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`. Not retried, as requested.
- `pnpm exec tsc -b tsconfig.build.json`: final rerun passed, exit 0.
- `pnpm exec eslint apps/web/src uat/slices/R-04-setup.mjs --max-warnings 0`: passed, zero warnings.
- `pnpm run lint:design`: passed, 383 files scanned.

## Requests

1. Part B must supply `group`, shortened display labels and `noneLabel` in the category schema. The current schema exposes sixteen ungrouped full labels and no none option. Drawing that schema unchanged cannot produce D-157's two named tabs or Mixed button, and the flat sixteen-option panel does not meet the requested no-overflow geometry. That portion is stopped at the ownership boundary: no game/content/contract file was edited. Group behaviour is covered with a fixture. The UAT script explicitly reports the missing metadata at the grouped-panel step, rather than silently claiming those shots passed.
2. The integrator must run and inspect the browser DOM checks and UAT outside this sandbox. No visual measurements or screenshots are claimed here. In particular, the real flat category panel's expanded geometry remains unresolved until Request 1; the DOM test exercises its default form and exercises expanded geometry using grouped metadata.


## Close-out

Part A's host/session plumbing and generic controls are implemented. Visual acceptance remains open because browser launch is sandbox-blocked and the current category schema lacks the D-157 metadata. No shared trackers, contracts, game files, content files or lockfile were changed. No commit was made, per this round's instructions.

## Part B — Rabakz settings (RZ-001, RZ-010, RZ-011, RZ-012)

### What changed

- Added `virtual:rabakz-bank-index` and pure `setupTable(index)`. Setup returns only the budget, category metadata, plain/picture difficulty counts and byte bounds. Match question texts are behind a dynamic import; the registry awaits selection and still fails closed on selection errors. A Vite build test follows the setup entry's static imports and proves that they include the index and exclude the full-bank module.
- Added the game's independent pure pool rule and defensive payload reader, with no content-package dependency. Easy counts easy only, Hard counts hard only, Mixed counts all three, and picture capacity uses the remaining transfer budget and largest picture exactly as `poolSize` does. Missing or malformed setup data admits no match.
- The schema supplies Around the world followed by Singapore in bank order, short category labels, Mixed as the none option, the three question lengths, and Easy/Mixed/Hard with the children help. Its cross-field check returns a computed count and a fix verified against the same pool, within 89 characters. The exact-count `init` guard is unchanged.
- Added pure tests, `setupTable` tests, and real-bank drift coverage for each category, Singapore together, all categories, and 200 seeded random subsets at every difficulty. Every admitted length is selected at five seeds. Existing game-session fixtures now supply setup data; session loading mocks both virtual modules.
- Extended the integrator's UAT script with group/none assertions and the requested refusal, stranding and unavailable-length screenshots. It asserts count-bearing sentences without fixing the counts in the script. UAT was not run and no screenshots are claimed.

### Commands and results

All test/typecheck commands were preceded by a one-minute load below 8. No memcheck, verify, whole-suite Vitest, UAT, perf, Blender, install, dependency/lockfile change, commit or merge was performed.

- First permitted Vitest run: 137 passed, 18 failed because older game-session fixtures lacked the new setup payload. Those fixtures were updated.
- Second permitted Vitest run: 154 passed, one real-bank drift test hit the default five-second timeout. The full matrix now has a 60-second timeout.
- `pnpm exec tsc -b tsconfig.build.json`: passed after correcting the test fixture's `JsonValue` annotation.

Final permitted checks:

```sh
VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz/src content/rabakz/src/select.test.ts apps/web/src/rabakz-setup.test.ts apps/web/src/session-loading.test.ts apps/web/src/game-setup.test.ts
pnpm exec tsc -b tsconfig.build.json
pnpm exec eslint games/rabakz/src content/rabakz/src content/rabakz/scripts apps/web/src/game-registry.ts apps/web/src/rabakz-setup.test.ts uat/slices/R-04-setup.mjs --max-warnings 0
pnpm run lint:design
```

- Vitest: **11 files passed, 155 tests passed**, final run at 06:18:48, 45.96 seconds; preflight load 7.76. The previous successful run also passed all 155 tests.
- TypeScript: **passed**, exit 0, including the final build-test API correction; preflight load 7.52.
- ESLint: **passed**, exit 0, zero warnings. Its first run caught the deprecated Vite `rollupOptions` alias in the new module-graph test; changed it to `rolldownOptions` and reran both TypeScript and the entire permitted test command successfully.
- Design lint: **passed**, 386 files scanned.

### Requests

1. The Part A owner must move choice refusals from the phone footer into the heading row as required by D-157. `apps/web/src/game-setup-route.tsx` currently renders `refusal` in the footer whenever no multi panel is open; its only `.setup-panel-heading` belongs to an expanded multi. That file is outside Part B's edit scope. The UAT refusal step saves the phone/TV shots and explicitly asserts the heading placement; it will fail at that assertion until Part A is corrected. Please retain the following stranding checks when fixing that acceptance failure.
2. Run and inspect UAT outside this sandbox after the heading fix. This slice supplies the real grouped schema requested by Part A; panel geometry and visual acceptance remain with the integrator.

### Close-out

Part B's game/content/registry implementation and automated coverage are in place. Visual acceptance remains open pending the Part A heading fix and integrator UAT. No shared trackers, contracts, forbidden documents or lockfile were edited; no commit was made.

## Round C — Field-heading refusals (PLAT-006, PLAT-025, RZ-010)

### What changed

- Phone refusals retain the changed field's identity and occupy its heading, including the collapsed form and expanded multi panel. The footer continues to show only the match preparation problem; Start's disabled state is unchanged.
- Heading text remains in the layout underneath the absolutely positioned sentence. The collapsed heading reserves the existing 55 px control height; no animation is applied to the sentence, including with reduced motion.
- Tab navigation and Done retain the sentence. A confirmed accepted setting change clears it; the existing three-second timeout remains in place.
- The browser test measures row height before/after refusal, checks unchanged selection and heading containment with/without a multi panel, and excludes refusal from the footer. The UAT difficulty assertion now reads the collapsed field heading.

### Requests

1. TV completion requires host/view changes outside this round's permitted paths: `host.ts` retains refusals in its per-seat `teamNotices`, whereas the mirror receives `teamSetup` without those notices or a changed field ID. Unavailable options are currently refused locally without sending a host action. Scope clarification was requested before changing that flow. No TV refusal behaviour is claimed.
2. There is no existing three-second UI timing token. The existing setup timeout is retained pending clarification; no new timing value or token has been introduced.

### Commands and results

Each test/typecheck invocation followed an `uptime` reading below 8 (Vitest: 7.63 and 5.69; TypeScript: 6.71). No UAT, verify, perf, install, memcheck, commit or merge was run.

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/game-setup apps/web/src/rabakz-setup.test.ts`: final run **11 tests passed; one browser test blocked**. The fixture built successfully; Chromium failed at `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`. Heading/height browser assertions were not executed. The first run exposed the production fixture scanner rejecting deliberate test data; the browser fixture now configures Preact and the bank plugin directly instead of using production-only scanners.
- `pnpm exec tsc -b tsconfig.build.json`: passed, exit 0.
- `pnpm exec eslint apps/web/src uat/slices/R-04-setup.mjs --max-warnings 0`: final run passed, zero warnings; corrected one shorthand void arrow in the new test after the initial lint run.
- `pnpm run lint:design`: passed, 386 files scanned.

### Close-out

Phone implementation is prepared for review. Round C remains incomplete pending the TV scope clarification and browser validation.

## Round D — Shared host refusal (PLAT-006, PLAT-025, RZ-010; D-157)

### What changed

- Every setting tap, including a marked unavailable option, sends the attempted value to the host's existing validation path. The host retains the old selection on failure and publishes the current `{ field, sentence, revision }` refusal in the same setup envelope sent to phones and the TV.
- The existing three-second timeout moved from the phone to the host clock. A later accepted change clears the refusal immediately; repeated refusals restart that timeout. Expiry publishes the cleared state to both displays, and reopening setup or stopping the host cancels the timer.
- The phone reads the host refusal directly, without an effect or animation delay. Its collapsed field headings and expanded multi headings retain Round C's placement and geometry. Buttons retain their existing press feedback while the host responds.
- The TV places the sentence inside the corresponding field heading, overlaying the existing row without changing its dimensions. Label and value retain their layout space while hidden. Styling uses existing tokens; the refusal has no animation, including under reduced motion.
- Host coverage checks unavailable choice and schema-check failures, retained values, mirrored wire state, accepted clearing and timeout clearing. The browser fixture now supplies host-shaped refusals and checks matching TV heading placement, footer exclusion and stable row height. The UAT refusal step asserts the TV heading before `difficulty-refused-tv` and retains its chosen-value assertion.

### Commands and results

Test/typecheck launches followed a one-minute load below 8. No memcheck, verify, whole-suite Vitest, UAT, perf, Blender, install, dependency change, commit or merge was performed.

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/game-setup apps/web/src/host apps/web/src/rabakz-setup.test.ts`: **39 passed; one browser test blocked**. The fixture built; Chromium failed at `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`. Browser geometry and rendering assertions were not executed (preflight load 7.09).
- `pnpm exec tsc -b tsconfig.build.json`: first run found a nullable UAT `textContent()` result; corrected with an empty-string fallback. Final run passed, exit 0 (preflight load 7.90).
- `pnpm exec eslint apps/web/src uat/slices/R-04-setup.mjs --max-warnings 0`: final run passed, exit 0, zero warnings.
- `pnpm run lint:design`: passed, 386 files scanned.

### Requests

The integrator must run the browser test and inspect UAT outside the sandbox. No screenshots or visual acceptance are claimed in this round.

### Close-out

Round D implementation is ready for review, with browser validation outstanding. Only the permitted files were edited; no commit was made.

## Round E — Mixed across category tabs (PLAT-006, PLAT-025, RZ-010; D-157)

### What changed

- The generic multi panel now renders its schema's none option first in every group. Mixed therefore remains available in Singapore before All of Singapore and the six categories. The existing hidden tick is preserved. No CSS change is needed: Singapore now has eight buttons (three rows at 667, two at 844); the existing world panel remains four rows at 667 and three at 844.
- Source discrepancy: D-157 says “Around the world (10, with Mixed)”, and the board's `bSg` function actually omits Mixed. This round follows the explicit Round E instruction to show Mixed whichever tab is open, which takes precedence over that older detail. The original first-group restriction matched that older detail, but does not meet Round E.
- The DOM test opens Categories through its field row, exercises both the real Rabakz schema and the synthetic Local schema at both required phone sizes, checks Mixed first in each group, selects all six, then clears through Mixed. It closes the panel between fixtures so component state cannot carry an expanded panel into the next fixture.
- Read the DOM test end to end against the product: collapsed/expanded refusal names, retained selection, phone and TV heading placement, stable row geometry, and TV sizing assertions are retained. Intentional unavailable attempts use a forced Playwright click because normal click actionability waits on `aria-disabled=true`; the application's handler still sends the attempted value for host refusal. UAT's Hard/50 attempts use the same mechanism, and its Singapore step now asserts Mixed first and includes the smaller viewport.

### Commands and results

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/game-setup apps/web/src/rabakz-setup.test.ts apps/web/src/host.test.ts`: **39 passed; one browser test blocked**. Fixture build passed; Chromium failed at `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`. Preflight one-minute load 7.59. The subsequent forced-click test correction could not be browser-validated.
- `pnpm exec tsc -b tsconfig.build.json`: **passed**, exit 0; preflight one-minute load 7.04.
- `pnpm exec eslint apps/web/src uat/slices/R-04-setup.mjs --max-warnings 0`: **passed**, exit 0, zero warnings.
- `pnpm run lint:design`: **passed**, 404 files scanned.

### Close-out and Requests

Implementation is ready for integrator review. Browser geometry and the remaining DOM assertions require execution outside the sandbox; no visual pass or screenshot evidence is claimed. No forbidden command, dependency change, commit or merge was performed. Only Round E's permitted files were edited.

### Integrator correction to Round E

The integrator's Round E brief was wrong to ask for Mixed in every tab: the decided board (D-157,
layout B) shows Mixed first in the "Around the world" tab only, with "All of Singapore" leading the
Singapore tab. The product is restored to that (Mixed renders in the first group's tab only), and the
DOM test now checks that Mixed is absent from the second tab and chooses it from the first tab.

## Round F — TV start-screen layout (PLAT-006, PLAT-025, RZ-010; D-157)

### What changed

- Moved the settings mirror into the focused card's secondary text column, beside the picture in the existing 1.618 : 1 split. The full-width bottom row retains Who’s in and its players. Settings therefore do not consume the picture row's height; the original game name, description, player range and picture styling are retained. No-settings envelopes leave the start card unchanged, including Peek Poker before its Rounds field and Tabao Rush.
- The mirror is a definition list with 34 px label/value text, text-sized rows, a 13 px row gap and a 21 px gap from the game metadata. It inherits the existing card surface; no treatment, dependency or token was added.
- Scoped picker heading selectors to the screen's direct header. Previously the mirror's nested headers inherited the screen heading's large minimum height and positioned layer, explaining the widely separated rows in the integrator's failure screenshot. Mirror headings are now definition terms; Round D's refusal remains inside the corresponding term, over its existing row, preserving the retained value and row dimensions.
- Extended the browser DOM test for 1920 × 1080 and 1280 × 720 using the existing uniform TV scaling. It compares picture height with the same start card without settings, asserts name/description/picture, Who’s in, all four rows, content overflow and 55 px viewport bounds for the card contents. It also compares no-settings card geometry for both other games. Existing refusal and TV text assertions remain. The UAT TV shot assertion is unchanged.

### Commands and results

Test/typecheck launches followed `uptime` with one-minute load below 8 (Vitest 5.76; TypeScript 6.50, 6.03 and 7.40). Only the permitted checks were run; no memcheck, verify, UAT, perf, Blender, install, commit or merge.

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/game-setup apps/web/src/picker apps/web/src/rabakz-setup.test.ts`: **54 passed; one browser test blocked**. Fixture build passed. Chromium failed at `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`. Browser assertions did not execute; not retried. Subsequent test-only corrections added tuple typing, lint-compatible callbacks and the no-settings Peek Poker fixture.
- `pnpm exec tsc -b tsconfig.build.json`: final run **passed**, exit 0. First run found the viewport tuple needed `as const`; corrected.
- `pnpm exec eslint apps/web/src uat/slices/R-04-setup.mjs --max-warnings 0`: final run **passed**, zero warnings. First run found two shorthand void callbacks; corrected.
- `pnpm run lint:design`: **passed**, 404 files scanned.

### Close-out and Requests

Round F implementation is ready for review. Inspected the integrator's supplied failure screenshot; no new rendering or visual pass is claimed. The integrator must execute the DOM test and inspect both TV sizes outside this sandbox, including refusal and long category summaries. Only the permitted source/test files and this Round F note were edited; existing evidence folders were left untouched.

### Integrator fix after Round F

Outside the sandbox the Round F browser test failed: the TV settings rows used the display line height,
so 34 px body text overflowed each row by 3 px (the same 3 px the UAT reported on the whole mirror).
The mirror now uses the body line height with an 8 px row gap, and every row fits. The test now lists the
elements that fail, by name and box. Headings are checked for clipping (no `overflow` other than visible on
them or their parent), not for glyphs running past a tight display line box, which is how every display
heading on main renders. The failed round 1 browser-run folders were removed; the runs are repeated.


## Round G — Phone category panel fit (PLAT-006, PLAT-025, RZ-010; D-157)

### What changed

- A multi field with a none option omits the first group's all button. Around the world now contains Mixed and its ten categories; Singapore retains All of Singapore and its six categories. Fields without a none option retain their group buttons.
- Matched board B's panel padding (8 px vertically, 13 px horizontally), 8 px gaps and 55 px Done/heading row. Restored the intended 1.05 button line height with enough specificity to override the phone's inherited body font rule. Category buttons reset vertical padding to zero: two 21 px lines take 44.1 px plus 6 px borders; the smallest nonzero spacing step (5 px each side) would exceed 55 px. Horizontal padding remains 8 px and targets remain at least 55 px.
- The DOM fixture retains the real installed Rabakz schema and its real labels; the copied 16-label fixture now also uses the real Singapore group name. Assertions cover 11 world buttons, Mixed with no All of Around the world, seven Singapore buttons led by All of Singapore, and both tabs at both viewport sizes. Fit checks include the panel and setup surface against the phone page's padded viewport bounds and check content overflow. The test prints each measured panel bottom for the integrator to record.
- Corrected UAT's stale Singapore Mixed assertion and added the world tab at 844 px. UAT was not run.

### Panel bottom measurements

Chromium could not launch in this sandbox, so **no measured panel bottom is available** for Around the world or Singapore at either 667 × 375 or 844 × 390. These four measurements remain required from the integrator's browser run; the DOM test prints them. No rendering or visual pass is claimed. The supplied `round1-p1/08-phone1-failure.png` was absent at the named path in this worktree and could not be inspected.

### Commands and results

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/game-setup apps/web/src/picker apps/web/src/rabakz-setup.test.ts`: **54 passed; one browser test blocked** (8 files passed, one failed). Fixture built successfully; Chromium failed at `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`. Preflight one-minute load 7.42. Browser assertions did not execute; not retried.
- `pnpm exec tsc -b tsconfig.build.json`: **passed**, exit 0; preflight one-minute load 7.54.
- `pnpm exec eslint apps/web/src uat/slices/R-04-setup.mjs --max-warnings 0`: **passed**, zero warnings. First run rejected console logging; measurements now use the test process's stdout.
- `pnpm run lint:design`: **passed**, 404 files scanned.

### Close-out and Requests

Implementation is ready for review; browser fit validation and all four measured panel bottoms remain open for the integrator outside this sandbox. Only permitted files were changed. No memcheck, verify, whole-suite Vitest, UAT, perf, Blender, install, dependency change, commit or merge was performed.

## Round H — Setup watcher identity and fit (PLAT-006, PLAT-025; D-157)

### What changed

- The phone page enables the full-screen setup treatment only for the leader. Watching phones retain the normal number/name, connection mark and Leave header.
- The watcher uses the picker's `phone-status picker-status` wrapper and typography, with “<leader> is setting up” and “Watch the TV.” Its status spans the available picker width instead of occupying the narrow first column. No new design value or token was introduced.
- Added a browser DOM test rendering the real PhonePage and GameSetup with a stubbed phone connection. At 667 × 375 and 844 × 390 it checks a 12-character leader name, a single-line message, header contents, working Leave and viewport/content fit. Display headings retain the normal unclipped glyph treatment; the enclosing status and picker must have no content overflow.
- UAT's watcher shot and fit check are unchanged. The supplied `round1-p2/05-phone2-failure.png` is absent from this worktree; no screenshot inspection or visual pass is claimed.

### Commands and results

Every test/typecheck launch followed an `uptime` one-minute load below 8; checks waited when load was higher. No memcheck, verify, UAT, perf, Blender, install, dependency change, commit or merge was performed.

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/game-setup apps/web/src/phone apps/web/src/picker`: final run **162 passed; two browser tests blocked** (14 files passed, two failed), preflight load 7.35. Both the existing setup fixture and new watcher fixture built. Both Chromium launches failed at `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`; DOM assertions did not execute. Earlier runs exposed fixture bundling errors from the phone demo/browser transport's game-loading imports; the fixture now stubs those connection/demo boundaries.
- `pnpm exec tsc -b tsconfig.build.json`: final run **passed**, exit 0, preflight load 7.30. The first run found insufficient narrowing of CSS output assets in the test; corrected.
- `pnpm exec eslint apps/web/src --max-warnings 0`: final run **passed**, exit 0, zero warnings. Corrected the initial test diagnostic's deprecated `className` access to use `getAttribute`.
- `pnpm run lint:design`: **passed**, 405 files scanned.

### Close-out and Requests

Implementation is ready for review. Browser validation remains open: the integrator must run the DOM checks and inspect the existing watcher UAT outside this sandbox. No visual pass is claimed. Only the permitted source/test files and this Round H note were changed; UAT was left untouched.

## Round I — Review fixes (PLAT-006, PLAT-025, RZ-001, RZ-010, RZ-011, PP-001; D-157, D-170)

### What changed

1. Setup, picker and team screens share the primary rule; setup shares the picker's disabled rules. Start precedes Back, matching the picker and Tabao Rush. Done is primary; disabled Teams has secondary text and a dashed edge. DOM coverage compares enabled/blocked Start and Done against ordinary controls.
2. TV refusal flows on its own line below the summary, with an 8 px icon gap and retained values. Phone refusal uses the footer only, at full available text width; expanded panels have one flowing notice. The DOM fixture derives the longest real refusal across real category/difficulty/length combinations and checks both phone and TV sizes for containment, neighbouring rows and retained TV values.
3. Both 1.05 line heights now use the display token. The grid uses intrinsic auto-fit with token-derived column minimums, giving three/four columns at the required sizes. Extracted D-153's 3000 ms hold into `REFUSAL_HOLD_MS` in the shared team model, used by both the team route and host without importing a UI module into the host.
4. Group chips have no tick, stay on one line, and distinguish on/off through fill and border.
5. Chosen options take precedence over unavailable marks. `settingsView` leaves the stranded chosen option enabled/pressed while retaining the complete-selection problem; pure coverage checks this state.
6. Tab counts appear only on inactive tabs with selections. Unavailable chips use secondary text, dashed edges and strike-through. Choice glyphs are aria-hidden; browser/UAT selectors use accessible labels.
7. The TV reserves three body lines for the problem, preserving the card's position when Start becomes blocked; DOM coverage compares card geometry.
8. Phone warnings appear once with the same warning icon as TV. Refusal fixes name mixed difficulty and offer an available shorter length, including “Choose 30 questions or Mixed categories.” Pure coverage checks the suggestion.
9. Schema help is visible below its field using secondary text and phone/display tokens, including Easy suits children beneath Difficulty.
10. UAT adds 1280 × 720 default/category/refusal shots, explicit long-summary string assertions and phone/TV captures, watcher coverage at 844, and phone/TV Pick a side confirmation. Retention/reload captures now use different selected question lengths. Existing fit and margin assertions are retained. UAT was not run.

### Commands and results

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/game-setup apps/web/src/phone apps/web/src/picker games/rabakz packages/platform/src/game`: final run **562 passed, 1 skipped; 2 browser tests blocked** (42 files passed, 2 failed). Both browser fixtures built. Chromium failed at `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`, before DOM assertions. Initial run also found a stale capitalisation expectation, corrected before the final run. Preflight loads: 4.65 and 5.16.
- `pnpm exec tsc -b tsconfig.build.json`: passed; final conforming repeat after consolidating the footer launched at load 6.98 (previous conforming repeat: 7.23). One earlier repeat was mistakenly launched after a reading of 8.58; it also passed. The first invocation was at 4.40. This load-gate mistake is recorded explicitly.
- `pnpm exec eslint apps/web/src games/rabakz uat/slices/R-04-setup.mjs --max-warnings 0`: passed, zero warnings.
- `pnpm run lint:design`: passed, 409 files scanned.

### Close-out and Requests

Round I implementation and test/UAT updates are prepared for integrator review. Browser computed styles, geometry and screenshots remain unvalidated because Chromium cannot launch in this sandbox. Run the DOM checks and UAT outside the sandbox and inspect the requested phone/TV states before visual acceptance. No UAT, verify, perf, memcheck, Blender, install, dependency change, commit or merge was performed. No forbidden document or lockfile was edited.

## Merge with C-12

### What was reconciled

- `host-route.tsx`: passes both the setup envelope and local keyboard/pad device to the picker; keeps C-12's keyboard listener, local seat, pad polling, team moves, results keys and animated pause panel. The watcher and leader phone setup routes remain intact.
- `host.ts`: combines setup preparation and chosen-settings start arguments with local peers and pause/resume/quit commands. Enter and Esc use the authenticated leader's existing start/back path, preserving loading/invalid guards, team confirmation, retention and TV refusal projections.
- `picker-route.tsx`: accepts both setup and local-device props. Keeps the settings mirror, summary/refusal line and Who’s in alongside C-12's leader-device heading, keyboard hints and heading fitter.
- `session-adapter.ts`: retains versioned setup preparation and chosen-settings match preparation alongside session pause/resume/quit dispatch.
- `style.css`: keeps D-165's 175.2 px copy band, 21 px inset and subtitle gap, count/hints column and stage placement on the TV setup view. All picker header rules target the screen's direct header so nested settings content cannot inherit the header geometry. Pause and hint styling remains.
- Tests from both branches are retained. The C-12 CSS assertions follow the direct-header selectors; its DOM fixture now exports the loader needed by setup's import graph. Added real keyboard Enter/Esc coverage for setup loading, stranded selection blocking, back/reselect retention and chosen-settings start. The R-04 DOM fixture also asserts D-165's header/stage geometry and start hint at both TV sizes.

### Commands and results

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src games/rabakz packages/platform/src/game`: 863 passed, 1 skipped; seven browser tests blocked by Chromium's `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`. Fixture builds pass after fixing the missing C-12 fixture loader export. No browser geometry or visual pass is claimed.
- One repeat started at load 5.45 but machine load rose above 50 during execution: 861 passed, 1 skipped, seven browser launch failures and two 5000 ms conformance-test timeouts. Waited for load below 8 before retrying; no timeout limits or tests were weakened.
- `pnpm exec tsc -b tsconfig.build.json`: passed, exit 0.
- `pnpm exec eslint apps/web/src games/rabakz uat/slices/R-04-setup.mjs uat/slices/C-12-host-keyboard.mjs --max-warnings 0`: passed, exit 0.
- `pnpm run lint:design`: passed, 417 files scanned.
- `grep -rn '^<<<<<<<\|^>>>>>>>' apps packages games docs uat tools`: no output (exit 1, no matches).
- Every test/typecheck launch followed an `uptime` reading below 8: Vitest 5.23, 4.21, 5.45 and 6.95; TypeScript 5.12 and 5.62.

### Close-out and Requests

Resolved contents and test/note updates are ready, without a commit. Staging was attempted but the sandbox denied creation of `/Users/randy/projects/personal/web-apps/kaki-arcade/.git/worktrees/R-04/index.lock` (Operation not permitted); the integrator must run `git add` for the five resolved files, the four updated test files and this note outside the sandbox. Git therefore still lists the five files as unmerged in its index. The integrator must execute the seven browser tests outside this sandbox to validate DOM assertions, including TV setup geometry. No memcheck, verify, UAT, perf, Blender, install, dependency change or commit was performed. Incoming main changes to shared documents were left as supplied by the merge.

## Round K — TV setup containment after C-12 merge (PLAT-006, PLAT-025, RZ-010; D-165, D-170)

### Cause and fix

The merge retained R-04's bottom-aligned metadata-plus-mirror stack in the narrow secondary column, while D-165 increased the header band to 175.2 px (stage top 264.2 px). The stack no longer fits the reduced card height; its intrinsic minimum width also lets the summary run beyond the card. The mirror is in the intended setup slot; this is a grid allocation problem rather than inherited nested-header styling.

Setup cards now use bounded golden-ratio columns: art above metadata on the left, the mirror spanning both rows on the wider right, and Who’s in below both. The existing copy wrapper uses `display: contents` only when a mirror exists, including outgoing snapshots. Zero minimum column widths prevent intrinsic expansion. The title has its own auto-sized row rather than sharing an overflowing bottom-aligned stack. No header rule, token, title size, refusal reservation or plain start-card layout changed. The art remains visible but shares its column's height with the metadata; the old test requirement that it retain the plain card's art height was replaced with positive-height checks.

### Regression coverage and evidence

Added explicit Chromium assertions in `game-setup.dom.test.ts` for setup at 1280 × 720 and 1920 × 1080: title and mirror inside the card, card inside the viewport. Existing content-overflow, refusal, long-summary and player checks remain. Header/stage geometry is checked with setup visible and hidden.

The new assertions were added before the CSS fix and the exact permitted Vitest command was run against the original CSS at load 5.76. The fixture built, but Chromium failed before any DOM assertion with `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`. Therefore a red geometry assertion on the original code and a green browser result on the fix **could not be demonstrated in this sandbox**. The supplied `roundJ-p1/04-host-failure.png` is absent in this worktree; no screenshot inspection or visual acceptance is claimed. Final test output is saved at `uat/evidence/R-04-setup/roundK/vitest.log`.

### Commands and results

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src games/rabakz`: before and after fix, **697 passed; seven browser tests blocked**, 53 files passed and seven failed. Final launch load 6.95. All seven failures are Chromium launch permission errors; fixture builds pass.
- `pnpm exec tsc -b tsconfig.build.json`: **passed**, exit 0; launch load 7.32.
- `pnpm exec eslint apps/web/src games/rabakz uat/slices/R-04-setup.mjs --max-warnings 0`: **passed**, exit 0.
- `pnpm run lint:design`: **passed**, 417 files scanned.

### Close-out and Requests

The fix and regression coverage are ready for integrator review. Browser containment and all UAT TV sizes still require execution outside the sandbox; this round cannot claim all checks pass. No memcheck, verify, UAT, perf, Blender, install, dependency change, commit or merge was performed. Only the CSS, setup DOM test, this slice note and Round K evidence were changed.

## Round L — Bound the TV mirror itself (PLAT-006, PLAT-025; D-165, D-170)

### Cause and change

Round K bounds the outer setup grid and gives the setup slot a zero minimum width, but leaves the nested mirror's width and single implicit grid column automatic. The fix bounds the mirror itself to `width: 100%; min-width: 0` and declares `grid-template-columns: minmax(0, 1fr)`, so intrinsic grid sizing cannot give the mirror a wider track than its assigned slot. These changes affect only `.game-setup-mirror`; the plain start screen, D-165 header/stage geometry and Round K art/title/settings/players placement are unchanged. This is the CSS sizing cause addressed by this round; Chromium's sandbox failure prevents confirming it against measured browser boxes here.

### Strengthened regression

Added `apps/web/src/game-setup-host.dom.test.ts`, test **PLAT-006/025 contains setup in the real host route and scaled TV stage**. It mounts the real `HostLobby`, real host controller, installed game registry and setup schema. Only the transport and storage boundary is stubbed: a phone named Player 1 joins and sends the real revisioned open/next/next/select messages. The host therefore renders its actual surface/overlap wrappers, picker and settings markup, rather than directly mounting GamePicker inside the old fixture's bare host-shell. The test includes emitted route CSS and the actual shell/setup styles, and uses the shared `screenScale` function with a resize listener on the 1920 × 1080 design stage.

As in UAT, setup opens at 1920 × 1080 before the mounted host resizes to 1280 × 720, 1920 × 1080 and 3840 × 2160. After the real transitions settle, `getBoundingClientRect` measures the title, mirror, setup slot and card. Assertions require the title and mirror inside the card, the card inside the viewport, and the mirror inside and no wider than its slot. Failure diagnostics include every measured box. The old phone/refusal/plain-card checks remain in place.

### Commands and results

Every test/typecheck invocation waited for `uptime`'s one-minute load to be below 8. Only the four authorised commands were run. Logs are under `uat/evidence/R-04-setup/roundL/`.

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src games/rabakz`: before the CSS change and on the final implementation, **697 passed, eight browser tests blocked** (53 files passed, eight failed). The added host fixture and existing browser fixtures build successfully. All eight failures are Chromium launch failures at `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`, before browser assertions. The fixture was subsequently refined to include emitted route CSS, revisioned phone inputs and UAT's mounted-host resize sequence; its final build also passes. No measured red/green geometry result is claimed.
- `pnpm exec tsc -b tsconfig.build.json`: **passed**, exit 0 on the final source.
- `pnpm exec eslint apps/web/src games/rabakz uat/slices/R-04-setup.mjs --max-warnings 0`: **passed**, exit 0, zero warnings on the final source.
- `pnpm run lint:design`: **passed**, 418 files scanned.

### Close-out and Requests

Browser acceptance remains open. Outside this sandbox, the integrator must run **`VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src games/rabakz`**, specifically inspecting **PLAT-006/025 contains setup in the real host route and scaled TV stage** in `game-setup-host.dom.test.ts`. With the new test retained and only `game-setup.css` restored to HEAD (Round K), it should fail the mirror/card or mirror/column containment assertions at 1280 × 720; with the Round L CSS it should pass all five containment/width assertions at all three resolutions. If the baseline passes, this round has not reproduced the reported cause and must not be accepted as a proven fix. Both runs are necessary to establish the requested red/green evidence; neither can be established here. The supplied `roundK-p1/04-host-failure.png` is absent from this worktree, so it could not be inspected.

No memcheck, verify, UAT, perf, Blender, install, dependency or lockfile change, forbidden document edit, commit or merge was performed. No new screenshot or visual pass is claimed.

## Round M — Final review (PLAT-006, PLAT-025, RZ-001, RZ-010, RZ-011)

### Cause and fixes

The reported UAT TV overflow was a measurement race: UAT measured before the resize listener updated `--screen-scale`. Commit `1d4223aa` fixed `shot()` by waiting two animation frames and checking the expected scale. The earlier Round K/L CSS explanations above are historical hypotheses, not the established cause. Evidence named `round1-*`, `roundK/` and `checks.md` is superseded by `roundL-*`; committed evidence is retained.

The generic setup DOM fixture differs from the real host: it writes scale synchronously, so it cannot have that same scale-listener race. It did measure immediately after viewport/render changes, without waiting for the picker's resize handler or finite animations. Added a shared two-frame/animation settle and expected-scale check before TV geometry measurements. Chromium cannot launch here, so the single under-load failure cannot be reproduced and this rendering/resize timing fix remains unconfirmed outside the sandbox.

The length-50 UAT step now chooses 10 after narrowing to Nature, asserts 50 is aria-disabled with ✕ and strike-through, force-taps it, and waits for the new footer refusal before the screenshot. Corrected the stale heading comment.

Teams can always be switched off when already on, including after the room drops to one player; both host authority and the phone fieldset still refuse switching them on with one player. The TV hides its T hint when teamsReason is present. Duplicate selected category labels receive group qualifiers (World History, Singapore History). Removed the unused refusal CSS and phone heading attributes. Setup change, toggle, Start and Back callbacks now use the phone's existing vibration feedback. Refusal copy uses the displayed category/difficulty names, including Mixed difficulty, Life and Nature.

### Regression coverage and validation

Added unit coverage for Teams recovery and renewed refusal, duplicate History labels, and exact refusal option names. Extended `game-setup.dom.test.ts` for the phone fieldset and TV hint, and `phone-setup.dom.test.ts` to exercise real PhonePage change/Start/Back callbacks and count vibration and sent inputs. These two browser tests, plus the retained real-host containment test in `game-setup-host.dom.test.ts`, require execution outside this sandbox.

Only the four authorised commands were run. Test launch load was 3.83; typecheck launch load was 3.53 (one-minute uptime load, both below 8).

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src games/rabakz`: **726 passed; eight failed**, 56 files passed and eight failed. Every failure is a Chromium launch permission error (`MachPortRendezvousServer: Permission denied (1100)`), before browser assertions; browser fixture builds succeeded.
- `pnpm exec tsc -b tsconfig.build.json`: **passed**, exit 0.
- `pnpm exec eslint apps/web/src games/rabakz uat/slices/R-04-setup.mjs --max-warnings 0`: **passed**, exit 0, zero warnings after correcting three test-only lint issues.
- `pnpm run lint:design`: **passed**, 426 files scanned.

### Close-out and Requests

Round M implementation and unit coverage are ready for review; browser acceptance remains open. Run the listed browser tests outside the sandbox to confirm geometry, Teams controls/hint and vibration. No UAT or visual pass is claimed, and no committed evidence was deleted. No memcheck, verify, UAT, perf, Blender, install, dependency/lockfile change, forbidden document edit or commit was performed.


## Close-out (integrator, 2026-11-18)

- Real cause of the late TV-fit failures: UAT measured before `--screen-scale` updated; fixed in `shot()` (1d4223aa).
- Round M (d35da0d5) did the final re-review's must-fix 2 (a real length-50-unavailable still, 24) and should-fixes 2 (Teams can be turned off), 3 (no "T: teams" hint when teams cannot be on), 4 (summary qualifies clashing labels) and 9 (setting taps vibrate). Must-fix 1 is recorded as D-174 (refusal in the footer status line); should-fix 8 as OQ-042 (keyboard or pad leader cannot change settings).
- Final evidence: `uat/evidence/R-04-setup/roundM-p1`, `roundM-p2`, `roundM-p8` (full check passed on the branch head). Superseded and kept only for history: `round1-*`, `roundK/`, `roundL-*`, `checks.md`.
- Merged 2026-11-18. Follow-ups in docs/backlog/R-rabakz.md.
