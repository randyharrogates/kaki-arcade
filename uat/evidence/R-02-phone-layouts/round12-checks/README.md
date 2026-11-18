## Round 12 — merged fixture and metric assertions (RZ-003, RZ-005, CTRL-002, CTRL-003)

The merged placement/renderer combination is consistent: note-tone text always stays at
13 px, titled panels retain title/body ceilings, and untitled body text retains its
34 px ceiling. The retained hierarchy and PP-020 regression tests pass.

Rabakz views tests supplied question data but no categories.json inventory. Added the
same inventory context as main's rules/harness.test.ts; all 17 views tests pass without
changing their assertions.

263 px is the answer cell width, not a changed natural single-line label width.
With breakable hyphenated labels, placement retains 13 px margins/gaps rather than
reducing gaps to 5 px. At 667 px: (667-26-89-13-13)/2 = 263;
the old 271 px result used 13 px margins and 5 px gaps:
(667-26-89-5-5)/2 = 271.
The natural Skip width remains 89 px. Updated the answer-grid expectation and added
an explicit regression that hyphen/dash/slash lone options reserve their unwrapped
textWidth plus the existing 32 px inset. Production measurement is unchanged.

The Infinity fixture is layoutFixtures.every's note "Every kind", in a 36 × 291 px
box. "Every" is unbreakable and measures 36.01 px at the note's 13 px step; "kind"
measures 24.31 px. Production text controls already permit exactly 1 px overhang
(D-140); the cross-fixture assertion omitted that argument. It now measures with the
same allowance. The separate D-140 test still rejects 1.1 px overhang. This is not
an option-label 21 px / three-line violation; no fixture text or measurement rule
was changed to hide an unbreakable option.

### Validation

Each permitted check started below one-minute load 8:

- Vitest, requested command with PLAYWRIGHT_BROWSERS_PATH=/nonexistent and
  VITEST_MAX_WORKERS=2: exit 0; 109 files passed, 2348 tests passed, 1 skipped.
  Final start load 3.55. Initial diagnostic run (load 3.34) exposed the two
  metric assertions after fixing the Rabakz context.
- ESLint, requested command: exit 0; start load 3.48.
- Design lint, requested command: exit 0, 455 files; start load 3.44.
- TypeScript build not run: tsconfig.build.json references library configs that
  emit JS/declarations (for example packages/platform/tsconfig.lib.json). The
  explicit no-emission instruction takes precedence; no alternative tsc command
  was authorised.
- Browser tests not run: Chromium is unavailable in this sandbox. The requested
  packages/game filter contains no browser test files; the one skip is the
  opt-in simulation benchmark. No browser or visual acceptance is claimed.

Logs: uat/evidence/R-02-phone-layouts/round12-checks/.

### Close-out

All three reported failure groups pass. Changes remain uncommitted. No production
code, protected docs, contracts, dependencies or lockfile changed. No verify, UAT,
perf, install or node_modules linking was run.

### Requests

Integrator: run browser validation outside the sandbox and the TypeScript build
where emitting its configured output is permitted.
