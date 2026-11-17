# C-16b — Phone private panel and game theme

Requirements: CTRL-003 (private display panel), PLAT-031 (per-player private view);
DESIGN §4.2 and §6; binding decision D-161.

The phone validates non-team private views with the platform checker, retains their
wire revision, ignores duplicate/older replacements and passes the retained view to
LayoutEngine. Team setup keeps its existing routing. Null views, lobby/picker/results,
seat loss, leave and connection loss clear private content.

A dropped malformed view leaves the phone's view revision behind the host's. Taps
fail closed until the next valid view supplies the current revision.

## Round 2

The phone theme map now lives in `phone-themes.ts`, a leaf importing only the UI
`ThemeName` type. The phone no longer imports the registry and its dynamic game
imports through this map. Play and pause use each game's named theme, including
`tabao-rush` under D-161. The phone page also takes `view.theme`, including while
waiting for a layout. Team setup, results and disconnected screens use console.

Panel ink is explicit on `.ka-layout-card`, `.ka-layout-card-face` and
`.ka-private-grid-label`. The audit of every controller-kit stylesheet also found
`.ka-stick-base` and `.ka-stick-knob`; both now use panel ink. Targets, kit buttons
and the shell header already used panel ink. Card-back and disabled surfaces retain
their dedicated treatments. Disabled card faces/grid labels explicitly use disabled
ink so their new explicit panel colour cannot mask the parent override. The shaped
target on-colour rule remains in place. A CSS regression test pins these rules.

Pure phone tests cover connection loss clearing private content with `connected`
false, then reconnect through retry, control-open, resumed seat and picker-state,
restoring the game theme and accepting a fresh private view.

The UAT script asserts themes on the active page main during question, pause and
results. Rabakz's private view does not change before the reveal, so the separate private-panel shot was dropped; 05 shows the panel while paused. The page now paints its own themed surface (`ka-surface`), and the disabled rule paints only the card, with its inner face and label taking the disabled ink alone (integrator, from the round 2 review).
Shots 05–08 cover pause at 667, a five-card Peek Poker demo at 667 with computed
panel-ink equality on cards and faces, Tabao Rush play at 844, and console team setup
at 667. The poker demo returns to its real seat before subsequent scenarios. Because
pause controls are not wired in the current shell, the script intercepts the host's
dev session-adapter response to expose a UAT-only event driving the real session
pause/resume/confirmed-quit API. It checks the session's paused state and real phone
theme; no product hook is added.

## Validation

Only the four requested commands are run. Test/typecheck starts wait for uptime's
1-minute load below 8; no memcheck is run.

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src/phone apps/web/src/team-setup.test.ts apps/web/src/team-required.test.ts apps/web/src/private-session.test.ts packages/controller-kit`: passed, 18 files / 206 tests. The first run exposed a reconnect fixture missing transport reopening; corrected.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/web/src packages/controller-kit uat/slices/C-16b-private-panel.mjs --max-warnings 0`: passed.
- `pnpm run lint:design`: passed, 396 files scanned.

## Close-out

Round 2 implementation and UAT script are ready for integration validation. Existing
round 1 evidence and its integrator review were read; new browser evidence is for the
integrator to produce. UAT and performance commands are not run under this brief.

## Requests

Integrator: run the revised UAT and inspect all eight screenshots, including its
UAT-only session source seam. Save evidence under `uat/evidence/C-16b-private-panel/`.
Confirm the controller transfer budget (PERF-020, 300,000 B gzip) through normal
integration checks. Trackers and commit messages remain with the integrator.
