# R-06 — Solo best and recent questions

Requirements: RZ-013, RZ-015, DATA-002.

## Round 3

Removed the host module wrapper and all game-side storage access. Rabakz init consumes only its arguments; pure save(state) returns one record containing recent ids and bests by match length. The app shell reads progress-v1 through C-13 before resolving content and passes the same context.saved to selection and init. Only the app opens the store. The shell defers its results save handler until the frame callback has returned; quit-to-picker also saves from the shell command handler. No platform or protocol contract changed.

History includes only questions shown up to the current round on quit; the final-round introduction does not count its still-hidden question. Quit never updates a best. Joining permanently removes solo eligibility. Completed eligible solo matches update only a strictly beaten best. Missing records permit a first best, without displaying Best 0. Unavailable reads suppress best claims and all writes for that match, even if storage recovers. Corrupt records start empty and may be replaced; a newer-version record is still protected by the store save guard. New best appears only after the shell's write succeeds; failed writes retain only any previously readable Best line.

The record validator caps history at 200 unique ids, each at most 64 characters, and accepts only non-negative integer bests for 10, 30 and 50 questions. Mixed selection prioritises oldest recent ids over difficulty quotas once fresh eligible questions run out. Added a selector regression that forces this trade-off, pure save tests, failed-write/unreadable-record shell coverage, and a cached-console regression checking completion and quit persistence outside frame callbacks.

## Choices for the integrator

- Copy and placement (round 4): `Best N` occupies the header’s right-hand slot beside the category at 34 px. The seat status keeps its normal 34 px size and reveals read `+100 · 100 pts`. This uses no additional seat-row space, preserving the eight-seat board layout. Round 4 evidence covers four-digit fit; round 5 adds the separator and round 6 confirms it rendered (`round6/16`, `round6/36`). No prior positive best means no Best line.
- Final solo screen: `New best · N` after a successful improved-score write; otherwise `Best N` only for a readable previous positive best. Place beneath `N pts`, using the 34 type token and the shared success pulse once, respecting reduced motion.
- Store one game-owned `progress-v1` record, schema version 1, with `{ recent, bests }`. No migration of the review-only separate recent/best keys is proposed. History is oldest first; seeing an id again moves it to the newest end.
- Solo eligibility means one player at init and nobody ever joins. A tie leaves the best unchanged; history still saves.
- Round 5 clarifies the host-device record lifecycle in ARCHITECTURE and the saved comment; no decision document was edited.

## UAT

The script retains two seed-42 matches scoring 100 then 200, unique-question and cross-match no-repeat assertions, and start/end stills. It adds first-start Best absence, a reveal with Best, unbeaten and tied finals (saved best unchanged), a four-digit best seeded through C-13 before a new page load with a single-line/non-overflow and ≥34 px assertion in the header, and two-player no-Best stills at join, fresh match start and final, with absence asserted through all phases. It never replaces game state. The clock is installed once; reinstalls previously reversed accelerated wall time and caused the real peer limiter to drop taps. The integrator's round1 failure evidence was not committed; review-and-fix.md now describes that provenance without broken screenshot citations.

Integrator command: `pnpm uat -- R-06-solo-best --phones 2`. Inspect every still. UAT and performance are to be run and reviewed by the integrator; neither was run here. Removed the stale uat/evidence/R-06-solo-best-recent folder.

## Round 3 validation (historical)

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/rabakz content/rabakz packages/platform apps/web/src`: exit 1; 2,014 passed, 1 skipped, 5 failed across 112 files. All five final failures are sandbox Chromium launch errors (`bootstrap_check_in ... Permission denied (1100)`): Overlap.dom, PeekPoker.dom, host-keyboard.dom, layout-fixtures and team-polish. The new selector, persistence and shell regression tests pass. Final run started at one-minute load 5.78. An earlier fixture build failure was fixed by separating shell storage from session-loading imports.
- `pnpm exec tsc -b tsconfig.build.json`: exit 0; final run started at load 7.91. One intermediate invocation was mistakenly started at 9.67; it failed on UAT typing and was corrected and rerun below 8.
- `pnpm exec eslint games/rabakz content/rabakz packages/platform apps/web/src uat/slices --max-warnings 0`: exit 0; final run started at load 7.12. Earlier lint findings were fixed.
- `pnpm run lint:design`: exit 0; 420 files scanned, starting at load 6.00.

No verify, UAT, perf, Blender, install or commit was run. Every final check was guarded on a one-minute load below 8.

## Close-out and Requests

Prepared for independent review without committing. Integrator: rerun browser tests outside the sandbox, run UAT and performance, inspect the rendered text, and log copy/placement decisions. Round3 browser evidence exists from the integrator, predating the merged Start path; it does not validate round 4. Round4 browser and diagnostic perf evidence now exist; review 5 leaves evidence completion and acceptance with the integrator.

## Round 4 review fixes

- Must-fix 1: checked the merge: prepareSetup remains saved:null; prepareMatch reads progress-v1 once per Start before awaiting lazy questions with recent ids. The adapter regression uses setup() once and start(gameId, room, settings) repeatedly, proves the second match sees the first match’s history and best, and covers quit history plus a failed read followed by recovered storage. Main’s setup and selector tests are retained; select.test.ts already uses the merged pure selector API and needs no async changes.
- Must-fix 2 / should-fixes 4–5: Best moved to the header at 34 px; status stays at its normal size; reveal gain and total have a separator; final best copy is 34 px.
- Should-fixes 1–3, 6: the game exports pure isNewBest and RECORD_VERSION; the registry uses the package import. Results-triggering quit skips the second save. Unavailable initial reads block all match writes; corrupt data may be replaced. Removed the persistence shim and unused host export; codec tests import records directly.
- Should-fix 8: corrected record naming, placement and evidence provenance here and in review-and-fix.md. No backlog edits.
- UAT follows Select → Game settings → Start, checks the header’s four-digit type floor, and adds h.frameStrip captures of the New best pulse. The legacy multiplayer sequence still documents the pre-C-17 duplicate seat; its labels are scenarios, not proof of exactly two occupied seats.
- Known gap (should-fix 7): closing the page mid-match does not save that match’s question history.

Round 4 was committed as f94742d3. Its browser UAT and diagnostic perf evidence exist in round4/ and perf-r4/; review 5 identifies evidence completion and acceptance as integrator work.

## Round 4 validation

See `uat/evidence/R-06-solo-best/round4-checks.md` for exact commands, load readings and limitations. Final TypeScript, ESLint and design lint pass. Vitest passes 1,015 non-browser tests; 12 Chromium tests are not run (launch unavailable). One ESLint invocation mistakenly began at load 8.04; it was reported and rerun at 4.74. Subsequent round4 UAT and diagnostic perf evidence were inspected in review 5; the report tables and closure acceptance remain integrator-owned.

## Round 5 review fixes

- S1 (RZ-013): delay the solo success pulse by the 377 ms results entrance (scaled by slow); reduced motion still skips it. Extend pulse strips to 18 frames and assert a scale above 1 on an opaque frame, followed by scale 1.
- S2 (RZ-013, PERF-001): diagnostic cycles now draw a solo header Best 1550 and a saved solo final New best 1600, with 55 presentation callbacks per fixture to cover entrance and pulse.
- S3 (DATA-002): document per-Start reads, results/quit-to-picker writes, unreadable null versus missing empty(), and the one-key namespace in the saved comment and host-device paragraph.
- S4 (RZ-013): export pure savedView from the game and wire it in the registry; persistence regression checks confirmed improvement, tie and ineligibility without mutating the incoming view.
- S5: remove stale round-4 commit/evidence statements; round4 and perf-r4 evidence pre-existed this round and were left untouched.
- S6 (RZ-013): separate category and Best with a middle dot, keeping 34 px type and removing the old flex gap. Rendered longest-category fit confirmed in round 6 (`round6/36`, asserted on one line).
- S7 (RZ-013): include both header elements in shared overflow checks and remove the duplicate measured still.
- S8 (DATA-002): replace the numbered session-loading decision reference with “see DECISIONS: game records”. Backlog remains untouched as required.

Round 5 close-out: no commit, verify, browser UAT, perf, install or linking performed. Integrator must run and inspect updated captures and the diagnostic scenario, complete evidence acceptance, and commit. TypeScript, ESLint and design lint pass. The initial TypeScript/test attempt caught an introduced registry syntax error, fixed before final checks. A test rerun was inadvertently launched at load 8.03; this violates the requested threshold and is recorded here; no further checks were launched. The final requested Vitest run passed 27 files / 540 tests. Final TypeScript started at load 4.69, ESLint and design lint at 5.75; the first test run started at 2.74.

## Round 6 — integrator close-out (2026-11-18)

Round 5 was committed as d21bce5e, the 12-frame pulse strip as 98cc3435, and the integrator added
ac4f2bfd: an 8 px gap on `.rz-header-detail`, because the flex row dropped the space before
" · Best" ("Sport· Best 1550" in round 5). UAT `round6/` (2 phones) and diagnostic perf `perf-r5/`
are the closing evidence, looked at by the integrator and review 6: the New best pulse peaks on
settled, opaque frames (×1.03 and ×1.05), headers read "Category · Best N" on one line, ties and
unbeaten scores show "Best N" with no pulse, and a join removes Best. round4, round5 and perf-r4
are superseded. ARCHITECTURE keeps the settings save-point clause beside the game-record lines.
