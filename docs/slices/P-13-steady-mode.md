# P-13 — Steady difficulty

Requirements: PP-033, PP-011; Randy's D-299 choice, round 1 every round.

The settings schema now offers Difficulty beside Rounds, with Rising (default) and
Steady. Existing generic setup controls supply the leader phone, TV mirror and host
keyboard navigation without layout, copy hints or token changes. Missing difficulty
in older fixtures and states retains Rising behaviour.

Steady selects difficulty row zero both when dealing and when hiding the grid:
20 seconds to memorise, then pick directly, with no generated swaps. The seeded,
pure simulation and Rising table remain unchanged.

In round 1, solo personal bests were not stored per settings: the host record was one
`{ best }` per game, read by game ID and written to `progress-v1`. Rising
and Steady shared the existing best, as did different round counts. Round 2 below
supersedes this behaviour.

## Validation

Rules tests cover all rounds of 3-, 5- and 7-round Steady matches, deterministic
steps, unchanged grids and direct transitions to pick. Existing tests cover the
Rising ramp and swaps. Schema tests cover the default and rejected values. Setup
integration tests send a leader phone action through the host and check the settings
passed to session start. The generic DOM fixture checks the rendered choice at
667 and 844 px; it is excluded from the requested test run.

`uat/slices/P-13-steady-mode.mjs` follows P-07's public-view observation seam and
setup-script selectors: three real phones, TV at 1920 × 1080, setup stills on both
screens, then round 3 memorise and pick stills. It checks 20 seconds each round and
observes every public update to reject swaps. See the UAT section below for run
folders; visual results are to be filled in by the lead.

Checks ran one at a time, each under the ten-minute limit, with
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`:

- Requested Vitest command, `VITEST_MAX_WORKERS=2`: passed, 155 files,
  2,725 tests passed and one skipped. The initial run found two reconnect failures
  from a fixture missing the new schema field; adding explicit Rising to that
  saved-settings fixture resolved both on the full rerun.
- `pnpm exec tsc -b`: passed; no emitted files outside dist folders to remove.
- Requested ESLint command with `--max-warnings 0`: passed.
- `pnpm run lint:design`: passed, 542 files scanned.

DOM tests for the lead to run: `apps/web/src/game-setup.dom.test.ts` (updated
rendered choice and fit coverage), `apps/web/src/phone-setup.dom.test.ts` (phone
setup shell regression). These were not run here.

## Close-out

Reviewed clean after round 4 and two merges of main (P-12, C-29, K-12); see the UAT section.
Closure waits on the merged-tree perf runs (bare `pnpm perf` and the 8-phone
`peek-poker-console`), recorded as Chromium slice gates with PERF-001 not assessed.

## Requests

Lead: run `apps/web/src/game-setup.dom.test.ts` and the three-phone UAT script,
inspect its stills, and review before integration. No setup hint is needed. No
copy question is outstanding. Solo bests are now separate by difficulty (Round 2).


## Round 2

PP-033, PP-012; D-299. Solo records now save `{ bests: { rising, steady } }`.
Round counts still share a best within each difficulty, matching the prior behaviour.
Initialisation selects the match difficulty's best for the existing public view,
results and successful-save “New best” comparison. Saving preserves the other
mode's best, including incomplete and multiplayer matches.

The version-1 schema accepts both the original `{ best }` and new format, allowing
the existing host storage adapter to load either without app or platform changes.
The game migrates the original best to Rising on read, with Steady starting at zero.
Missing or malformed records give empty bests; a null (unreadable storage) record
continues to suppress best claims. No new UI copy was added.

Display audit: the TV results and solo score-attack best both use the selected
match's best through `soloBest`. Setup and phone views do not display a best.
Question for lead: the TV's `Best` and `New best` labels have no visible difficulty
context (in `host/Screen.tsx` and `host/results.ts`). Should these identify Rising
or Steady? Copy remains unchanged pending that decision.

Tests cover separate bests at every round count, migration to Rising only,
difficulty-specific new-best claims, preservation of the other difficulty's record,
and malformed/unreadable records. Existing persistence tests now expect both bests.

Round 2 checks (one at a time, ten-minute timeout, dependency verification disabled):

- Vitest: passed, 71 files and 743 tests. The initial run failed the purity scan
  because record helpers were outside the rules folder; moving them inside resolved
  it on the full rerun.
- `pnpm exec tsc -b`: passed; no emitted files outside dist folders to remove.
- `pnpm exec eslint games/peek-poker --max-warnings 0`: passed.

DOM tests for lead: `apps/web/src/poker-results.dom.test.ts` (best/new-best results),
`apps/web/src/host-peek-poker.dom.test.ts` (TV rendering),
`apps/web/src/game-setup.dom.test.ts` and `apps/web/src/phone-setup.dom.test.ts`
(difficulty setup regression). DOM tests and UAT were not run.

Round 2 close-out: no commit, verify, UAT, install or tracker edits performed.
Request: review the difficulty-context copy question above before integration.

## Round 3

PP-033, PP-012. Integrator's copy decision for P-13: Steady records read
`Steady best 42` and successful saves read `New steady best · 42`. Rising retains
`Best 42` and `New best · 42`. This resolves Round 2's copy question; the integrator
should log this choice with P-13's decision.

The public view now carries the match difficulty (defaulting older fixtures and states to
Rising). Both TV best locations share the label formatter. The renderer's snapshot
comparison includes difficulty so a changed label is published and drawn. Phone
private views and controller layouts show no best, so require no copy change.

Unit tests cover both labels for both difficulties, public/saved-view difficulty
at each round count, and the renderer's difficulty change detection. Added
`apps/web/src/peek-poker-best.dom.test.ts` for the lead to run: at 1920 × 1080 and
1280 × 720 it compares three-digit Rising/Steady labels in the mounted TV's live,
scoreboard and final slots, including `New steady best · 999`. It asserts one line,
equal height to Rising, viewport/summary containment and no neighbouring-content
overlap. It reuses the web app's installed Vite, with no dependency added.
DOM tests were not run, so rendered fit remains for lead validation.

Round 3 checks ran sequentially, each with a ten-minute timeout and
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`:

- Requested Vitest run with `VITEST_MAX_WORKERS=2` and all three exclusions:
  passed, 72 files and 745 tests.
- `pnpm exec tsc -b`: passed, including after the DOM test adjustments.
- `pnpm exec eslint games/peek-poker --max-warnings 0`: passed. Initial attempts
  found build-tool type resolution issues in the new DOM fixture; reusing the
  installed web build tool and validating its output as unknown resolved them.

Round 3 close-out: changes remain within Peek Poker and this note. No commit,
verify, UAT, install or tracker edits performed.

Round 3 requests: log the copy choice with P-13's decision and run
`apps/web/src/peek-poker-best.dom.test.ts`, plus existing
`apps/web/src/poker-results.dom.test.ts` and
`apps/web/src/host-peek-poker.dom.test.ts` for TV regressions; review before integration.


## UAT

- `uat/evidence/P-13-steady-mode/round3/`: three phones on the merged tree (P-12, C-29);
  Steady chosen on the leader phone and mirrored on the TV; rounds 1–3 at 20 s with no
  swap; shared cards face down while memorising.
- `uat/evidence/P-13-steady-mode/solo5/`: one phone, record seeded
  `{ bests: { rising: 40, steady: 12 } }`; "Steady best 12" in play and
  "New steady best · N" after seven Steady rounds. The stills wait for Web Animations
  in real time, since Playwright's fake clock does not advance them.

The TV keyboard can navigate setup and start, but cannot change setup settings;
Difficulty is changed on the leader phone.
Three- and seven-round match coverage comes from unit tests; the round3 UAT run
covers rounds 1–3 of a five-round match, and solo5 completes a seven-round match.

## Round 4

PP-033, PP-011, PP-012 review fixes: added the one-phone best-label scenario to
`P-13-steady-mode.mjs`, using the real host localStorage version-1 envelope before
room creation. Seven rounds with locked picks guarantee at least 28 points, beating
12. Both TV labels are asserted before their stills. The empty registry record now
uses both bests, and the label DOM test lives in apps/web with a direct Vite import.
Literal Rising timing and swap expectations match the real table exactly.
`validGameSelection` is unchanged; compatibility wording refers to fixtures and states.

Round 4 checks ran one at a time, each with a ten-minute limit and
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`:

- Requested Vitest command with `VITEST_MAX_WORKERS=2`: passed on rerun,
  215 files, 3,515 tests passed and one skipped (377.44 seconds). The initial run
  found the registry test still expecting the legacy empty shape; its expectation
  now matches the requested per-difficulty empty record.
- `pnpm exec tsc -b`: passed; no new emitted files outside dist folders.
- Requested ESLint command with `--max-warnings 0`: passed.
- `pnpm run lint:design`: passed, 558 files scanned.

No UAT, DOM tests, perf, verify, installs or commits were run in this round.
Lead: run and inspect the solo case:

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- P-13-steady-mode --phones 1 --out solo
```

DOM tests for the lead (including the relocated label test):

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm exec vitest run apps/web/src/peek-poker-best.dom.test.ts apps/web/src/poker-results.dom.test.ts apps/web/src/host-peek-poker.dom.test.ts apps/web/src/game-setup.dom.test.ts apps/web/src/game-setup-host.dom.test.ts apps/web/src/phone-setup.dom.test.ts
```
