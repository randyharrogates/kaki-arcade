# R-19 — Rabakz phone polish

## Goal and requirements

Polish the Rabakz phone status and results without changing the wire contract.
Covers RZ-016, RZ-031, RZ-032 and PLAT-022 under D-221, D-222 and D-235.

## Acceptance and implementation

- Only Right opts into success feedback. The generic kit reads
  `--ka-status-pulse: success` on a title and runs the existing UI pulse token;
  Rabakz's stylesheet owns the title selectors. No text matching lives in the kit.
  Reduced motion suppresses the animation and keeps the rendered state.
- All title blocks in a private strip use its smallest measured type step. The
  kit's label helpers measure on content, box and font changes, without a frame loop.
- Scoreboard Continue contains only words, with no face shape.
- Place is labelled, followed by the individual Score. Both modes use a Place stat above its value, then Score. Teams use team totals
  for the Place stat (e.g. `1st` or `=1st`) and a separate body line (`Red team`).
  This keeps Place available to the shell Results screen under D-210. A teamless
  player sees `No team` and no Place; tied free-for-all places also use `=`.
- The bare locked-out number is the chosen option's text, not a count. It remains
  useful answer feedback and now reads `Your answer: 4` when that option is `4`.

No game rules, trackers, contracts, dependencies or lockfile changed. No commit,
verify, UAT, performance run or install was made, per the round-1 brief.

## Tests and UAT

Unit coverage:

- `packages/controller-kit/src/status-title.test.ts`: success token, absent pulse,
  reduced motion and cancellation.
- `packages/controller-kit/src/layout-label.test.ts`: shared minimum, recovery on
  resize and failure at the smallest step.
- `games/rabakz/src/phone-polish.test.ts`: only Right opts in.
- `games/rabakz/src/rules/views.test.ts`: Continue metadata, team places,
  free-for-all and team ties, labelled locked-out number.
- `games/rabakz/src/rules/phone-render.test.ts`: rendered Continue has no SVG.

DOM tests to run (not run by this agent):

- `apps/web/src/rabakz-phone-polish.dom.test.ts`: real kit layout, equal title sizes
  at 667/844/932 px, success/failure/neutral titles and reduced motion; the
  new team layout (`=1st`, `Blue team`, Score) beside leader Continue at 667 px.
- Existing regression suite `apps/web/src/rabakz-phone.dom.test.ts`.

`uat/slices/R-19-rabakz-phone-polish.mjs` uses three real paired phones. It plays
one free-for-all match with two players tied for second, then one team match ending level at 100–100.
It captures Locked out, Wrong, Right, Continue, each player's Place at the
scoreboard and final results, and one Right pulse frame strip in each mode.
It uses R-08's public-view observation seam and host-only shipped-answer oracle.
Round 2 also consulted the R-15 script in its sibling worktree for JSDoc page
arrays, required indexed values and typed public-view access. Sparse checkout
was unchanged.

Integrator command (requires the existing generated question bank and dependencies):

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5810 KAKI_PORT_SIGNAL=5811 KAKI_PORT_UAT=5812 pnpm uat -- R-19-rabakz-phone-polish --phones 3 --host-browser chromium --phone-browser chromium --out round1 --frames --max-mb 24 --timeout-min 10
```

## Check results

Run sequentially, each with a 600-second process deadline:

- Requested unit suite: blocked immediately, `Command "vitest" not found`.
- `pnpm exec tsc -b`: blocked, TS2688: cannot find type definition file `node`.
  Git status showed no emitted files outside dist to remove.
- Requested ESLint: blocked immediately, `Command "eslint" not found`.
- `pnpm run lint:design`: passed.

All pnpm commands used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`. Unit suite
also used `VITEST_MAX_WORKERS=2` and the three requested exclusions. Logs are in
`uat/evidence/R-19-rabakz-phone-polish/checks/`. No browser evidence exists yet.

## Close-out

Implementation and test/script authoring complete; round-2 validation is recorded
below. DOM, real-console UAT, visual review and
integration review remain for the requesting agent. No requirement is claimed closed.

## Requests

Run both DOM files and the UAT command above. Review every still and pulse strip before integrating. No contract
change is needed: the generic CSS opt-in resolves the initially raised flag question.

## Round 2

- Added real JSDoc types to the UAT phone array, animation hook and public-view /
  question-bank reads; checked required indexed values before use.
- Moved the DOM test to `apps/web/src/rabakz-phone-polish.dom.test.ts`, where the
  existing Vite dependency resolves, and typed the saved animation method.
- Updated the older Continue regression test to require words and no shape.
- Conformance exposed team Place strings exceeding the 13-character stat-value
  limit. Team places now use a Place note and title; free-for-all retains a stat.
- Included tie status in results-view revisions so tied/untied content changes
  invalidate the private view even when a player's numerical place stays the same.
  Added a regression assertion for that case.

Final round-2 checks (sequential, each capped at 600 seconds; none timed out):

- Unit suite: 215 files passed, 3 failed; 3,522 tests passed, 1 failed, 1 skipped
  (294.48 seconds). All Rabakz tests, including conformance, passed. The only
  remaining failures are Tabao Rush `atlas.test.ts`, `item-model.test.ts` and
  `station-cue.test.ts`, all ENOENT for `assets/dist/manifest.json`. Those generated
  assets are absent from this worktree; unrelated source and assets were untouched.
  Full final log: `/tmp/R-19-round2-unit.log`.
- `pnpm exec tsc -b`: passed after the final script edits. No emitted files
  outside dist appeared in git status.
- Requested ESLint over games/rabakz, packages/controller-kit, apps/web and
  uat/slices with `--max-warnings 0`: passed; no rule disables added.
- `pnpm run lint:design`: passed again after the final edits (561 files scanned).
- `git diff --check`: passed.

Round-1 code was reviewed again against all five brief points. DOM tests, UAT,
verify, performance runs, installs and commits were not run. The full unit suite
needs the existing generated asset manifest restored by the integrator before
it can pass completely.


## Round 3 — review fixes

- Must-fix 1 / should-fix 2 (RZ-016, PLAT-022): team Place is again a stat,
  with the team name on a separate body line. Both modes share the stat layout.
  Unit tests assert complete scoreboard and over blocks, including Score.
- Must-fix 2 (RZ-016): UAT gives one fresh correct answer to each team in the
  first two questions, then skips. The 2:1 split can finish level because a
  team's award is the largest winning award, not a per-member total. It asserts
  `=1st` at the scoreboard and Results, checks every phone's Results Place and
  individual Score, and retains final-place stills after leader Continue.
- Should-fix 1: a teamless player gets `No team` with no Place, covered for
  scoreboard and over.
- Should-fix 3: removed the unused New best CSS selector and invented DOM title;
  the CSS regression test now expects Right only.
- Should-fixes 4/5 (RZ-031, RZ-032): the DOM fixture includes the longest real
  team name with tied Place, Score and leader Continue at 667 px, checking fit.
  DOM and UAT count all animations on Wrong and Locked out. UAT waits for real
  Web Animations before stills, except the intentionally scrubbed Right pulse.
- Findings 6–8 remain with the integrator, as requested. No shared tracker,
  contract, dependency or lockfile edits; no installs, commits or browsers.

Close-out: code and script changes are ready for review; no new visual evidence
is claimed. The integrator must run both DOM files listed above, UAT and the
controller performance gate before closure. Record the option-(a) decision and
any follow-up for findings 6–8 in the integrator-owned documents.


Round-3 checks (one at a time; 600-second deadlines; no timeout):

- Requested Vitest scope `games/rabakz packages/controller-kit apps/web`, with
  `VITEST_MAX_WORKERS=2` and exclusions `**/*.dom.test.ts`,
  `**/layout-fixtures*`, `**/team-polish*`: 89 files, 1,103 tests passed (61.29 s).
- After extending the teamless fix to late-join notes, the affected
  `views.test.ts` rerun passed: 25 tests (1.13 s).
- `pnpm exec tsc -b`: passed after the final view and DOM fixture edits.
  No emitted files outside dist appeared in git status.
- ESLint on all changed TypeScript/JavaScript files, `--max-warnings 0`: passed
  after replacing an empty rejection handler in the animation-wait helper.
- `pnpm run lint:design`: passed. `git diff --check`: passed.

Every pnpm command used `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`; all checks
used `VITEST_MAX_WORKERS=2`. Logs: `/tmp/R-19-round3-unit.log`,
`/tmp/R-19-round3-unit-followup.log`, `/tmp/R-19-round3-tsc.log`,
`/tmp/R-19-round3-eslint.log`, `/tmp/R-19-round3-design.log`.
DOM tests, UAT and performance checks were not run (no browsers requested).
