# Slice F-01 — Workspace, checks and `pnpm verify`

Issue F-01 in `docs/backlog/F-foundation.md`, wave 0. Branch `worktree-agent-a626d0e1516bd2edd`.

## Goal

A pnpm workspace with strict TypeScript, ESLint, a design lint, Vitest and one `pnpm verify`
command that every later issue runs before UAT.

## Requirement IDs

| ID | Covered | Which part |
|---|---|---|
| NN-7 | partly | `pnpm verify` runs `tools/trace_check.py`, so a PRD ID missing from `TRACEABILITY.md` fails the build. The tracker itself already exists. |
| NN-8 | partly | The **verify** step of the loop now exists as a command: workspace check, typecheck, lint, design lint, unit tests, build, trace check. UAT and performance harnesses are F-07 and F-08. |
| NFR-TEST | partly | Vitest runs unit tests across the workspace from the root, and test files are type-checked. No game rules exist yet, so no simulation tests; the UAT half is F-07. |

## Acceptance

1. `pnpm install` on a clean checkout succeeds with Node 24 and pnpm 12.8.1, and refuses a
   Node version outside `engines`.
2. `pnpm verify` runs, in this order and stopping at the first failure: workspace check,
   typecheck, ESLint, design lint, unit tests, build, trace check. It exits 0 on the committed
   tree from a clean state (no `node_modules`, no `dist`, no `.tsbuildinfo`).
3. `pnpm check:workspace` fails, naming the file and the exact line to add, when a workspace
   folder with a `tsconfig.json` is missing from `tsconfig.build.json`, when a folder holds
   TypeScript but no `tsconfig.json`, when a `tsconfig.<name>.json` is not referenced from its
   folder's `tsconfig.json`, or when a `workspace:` dependency has no project reference.
4. `pnpm typecheck` fails on any TypeScript error in any package source file, any test file,
   any root config file and any file under `tools/`, with `strict`, `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes` and `noImplicitOverride` on. It works with one package
   depending on another and nothing built beforehand.
5. `pnpm lint` fails on any ESLint error or warning.
6. `pnpm lint:design` fails, printing `file:line:column`, on an off-scale spacing or radius
   value, on rem or em in a spacing declaration, and on a raw colour literal outside
   `packages/ui/`. The exact rules are in the header of `tools/lint_design.mjs`.
7. `pnpm test` runs every `*.test.ts(x)` under `apps/`, `packages/`, `games/`, `content/` and
   `tools/`, and fails if it finds none.
8. `pnpm build` compiles every package and calls the size-budget hook.
9. The nine stub packages exist and compile. `@kaki/netcode` depends on `@kaki/protocol`, so
   every clean verify exercises a cross-package reference.

## UAT script

There is no interface in this issue, so there are no screenshots. The evidence is text, in
`uat/evidence/F-01-workspace/`:

| File | Shows |
|---|---|
| `verify.txt` | The full clean-state run: delete every `node_modules`, `dist` and `.tsbuildinfo`, `pnpm install --frozen-lockfile`, `pnpm verify` → exit 0 |
| `fail-workspace-unreferenced.txt` | An `apps/web` with a type error but no entry in `tsconfig.build.json` stops verify at the first step |
| `fail-workspace-dependency.txt` | A `workspace:*` dependency with no project reference stops verify at the first step |
| `fail-typecheck.txt` | A type error in a package (TS2322 twice, one from `noUncheckedIndexedAccess`) |
| `fail-typecheck-test-file.txt` | A type error in a `*.test.ts` file |
| `fail-typecheck-cross-package.txt` | With no `dist` anywhere, a bad import from `@kaki/protocol` in `@kaki/netcode` gives TS2305 (not TS6310) |
| `fail-eslint.txt` | `any` in a package stops verify at lint |
| `fail-design-lint.txt` | 15 findings across a CSS, a TSX and an SVG file; the `design-lint-ignore-line` line is absent; a marker in a string excuses nothing; a single marker excuses one of two findings |
| `fail-unit-test.txt` | A failing test stops verify at the unit tests |
| `fail-trace.txt` | Deleting the NN-7 row from `TRACEABILITY.md` stops verify at the last step |
| `fail-engine-strict.txt` | `engines.node` set to `>=99` makes `pnpm install` fail |
| `pass-patterns.txt` | The patterns in "Adding a package" below, applied for real, pass the whole of verify |

## Out of scope

- `apps/web`, `apps/signal`, Vite, Preact, PixiJS, wrangler, Playwright, jsdom (later issues;
  some wait on spikes).
- The real size-budget check (PERF-020, PERF-022): `tools/check_budgets.mjs` is a no-op hook.
- `pnpm uat` (F-07), `pnpm perf` (F-08), `pnpm dev`, `pnpm assets`.
- Design tokens (F-06). `packages/ui` is an empty stub.
- Any content in the stub packages, and placeholder tests for them.
- Named colours in the design lint (`red`, `white`): not detected, by decision in review.

---

## Where the design lint does not apply (added at merge, review round 2)

Folders that cannot draw are skipped entirely: `packages/sim-core`, `packages/protocol`,
`packages/netcode`, and `src/rules/`, `src/sim/` and `src/levels/` inside any game. Put pure
game logic there. Everything else under `apps/`, `packages/` and `games/` is linted.

## Adding a package

Copy `packages/protocol` (its three tsconfig files and `package.json`), then:

1. **Register it.** Add `{ "path": "<folder>" }` to `references` in `tsconfig.build.json`.
   `pnpm check:workspace` fails until you do, and prints the line.
2. **The three tsconfig files.**
   - `tsconfig.json` is only a list: it references the others. ESLint and editors start here.
   - `tsconfig.lib.json` is the package's source: `src/` without tests. It is built to `dist/`.
     It has **no Node types and no DOM**. That is what keeps `sim-core` and game rules pure:
     `process`, `console`, `document` and `node:fs` are type errors there.
   - `tsconfig.test.json` is `src/**/*.test.ts(x)`. It has Node types, is type-checked, and
     is never built. A helper used only by tests must itself be named `*.test.ts`, or it
     lands in the library project.
3. **Depending on another package.** Add `"@kaki/x": "workspace:*"` to `dependencies`, add
   `{ "path": "../x/tsconfig.lib.json" }` to `references` in your `tsconfig.lib.json`, and run
   `pnpm install`. Import it as `@kaki/x`, never by relative path. A dependency used only by
   tests goes in `devDependencies` and in `tsconfig.test.json`. The guard checks both and
   prints the line. See `packages/netcode` for the live example.
4. **DOM, JSX and other globals are per package.** In that package's `tsconfig.lib.json`
   **and its `tsconfig.test.json`** (a test that imports a `.tsx` file needs the same `jsx`
   settings, or typecheck fails with a misleading TS6305 "has not been built"; a test that
   names a DOM type needs the DOM lib) add, as needed, `"lib": ["ES2023", "DOM", "DOM.Iterable"]`, `"jsx": "react-jsx"` with
   `"jsxImportSource"`, or `"types": [...]`. Do not add them to `tsconfig.base.json`.
5. **Imports have no `.ts` extension**: `import { x } from './thing'`. The base config uses
   bundler resolution; `.ts` extensions are an error.
6. **Config files in a package** (`vite.config.ts`, `vitest.config.ts`, `wrangler` scripts):
   add a `tsconfig.node.json` beside them and reference it from the package `tsconfig.json`,
   or ESLint reports "was not found by the project service":

   ```json
   {
     "extends": "../../tsconfig.test.base.json",
     "compilerOptions": { "tsBuildInfoFile": "dist/.node.tsbuildinfo" },
     "include": ["*.config.ts"]
   }
   ```

   Do not create it before the first config file exists: a tsconfig that matches no files is
   an error. `pass-patterns.txt` shows this pattern passing.
7. **Test file names.** `*.test.ts(x)` is a Vitest unit test and is run by `pnpm test`.
   `*.spec.ts` is reserved for Playwright UAT scripts (F-07) and is not picked up by Vitest.
8. **Tests that need a browser-like DOM.** Vitest runs in Node by default. To run one
   package's tests in jsdom, ask the integrator for the `jsdom` dependency, then turn the root
   `vitest.config.ts` into projects: the current `include` becomes one project with
   `exclude: ['<folder>/**']`, and a second project has `include: ['<folder>/**/*.test.{ts,tsx}']`
   and `environment: 'jsdom'`. Keep it in the root file so `pnpm test` stays one run.
9. **A package under `tools/`** is also matched by the root `tsconfig.json`
   (`tools/**/*.ts`). Give it its own `tsconfig.json` and add its folder to `exclude` there.

Root-level code: `tsconfig.json` at the root type-checks the root config files, `tools/`,
`uat/**/*.ts` and `spikes/**/*.ts` with Node types. `spikes/` is type-checked but not
ESLint-ed (it is throwaway).

---

## Close-out

### What was built

| Path | What |
|---|---|
| `package.json` | Private root, `"type": "module"`, scripts `check:workspace`, `typecheck`, `lint`, `lint:design`, `test`, `build`, `trace`, `verify`. Exact-pinned dev dependencies. |
| `pnpm-workspace.yaml` | `apps/*`, `packages/*`, `games/*`, `content/*`, `tools/*`; `engineStrict: true`. |
| `.npmrc` | `engine-strict=true`. |
| `pnpm-lock.yaml` | Lockfile for the six dev dependencies and the netcode → protocol link. |
| `tsconfig.base.json` | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`, `composite`. ES2023, `module: preserve`, bundler resolution, no DOM lib, no ambient types. |
| `tsconfig.test.base.json` | Base for projects that are checked but never built (tests, config files, root tools): no emit, Node types. |
| `tsconfig.build.json` | Solution file for `tsc -b`: the root project and one reference per package. |
| `tsconfig.json` | Root project: root config files, `tools/**`, `uat/**/*.ts`, `spikes/**/*.ts` (`checkJs`, Node types). |
| `eslint.config.js` | Flat config: `@eslint/js` recommended + typescript-eslint `strictTypeChecked` and `stylisticTypeChecked` with the project service, for `.ts`, `.tsx`, `.js`, `.mjs`. Adds `eqeqeq`, `no-console` (off for `tools/**/*.{mjs,ts}`), `consistent-type-imports`, `switch-exhaustiveness-check`, and errors on unused disable comments. Run with `--max-warnings 0`. |
| `vitest.config.ts` | Root run over `{apps,packages,games,content,tools}/**/*.test.{ts,tsx}`; `passWithNoTests: false`. |
| `tools/check_workspace.mjs` | The workspace guard. No dependencies. Pure `checkWorkspace(snapshot)`, plus `readWorkspace`, `parseJsonc`, `workspacePatterns`, `run`. Five rules, each message names the file and the line to add. |
| `tools/check_workspace.test.ts` | 20 tests: each rule on snapshots, the file readers, `run()` exit codes on temp trees, and this repository itself. |
| `tools/lint_design.mjs` | The design lint. No dependencies. Pure `lintSource(file, text)`, plus `collectFiles`, `lintTree`, `formatFinding`, `run`. Rules `spacing-scale`, `spacing-unit`, `raw-colour`, `ignore-reason`. The header is the specification. |
| `tools/lint_design.test.ts` | 106 tests: fixtures as strings for every property, form, colour syntax, exemption and escape-marker case; temp-tree tests of the file walk and of `run()` returning 0 and 1. |
| `tools/check_budgets.mjs` | No-op hook: prints `no bundles yet`, exits 0. Called by `pnpm build`. |
| `packages/{protocol,sim-core,platform,netcode,controller-kit,ui}` | Stubs `@kaki/<name>`: `package.json`, `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.test.json`, `src/index.ts`. `netcode` depends on `protocol` (type-only import). |
| `games/{rabakz,peek-poker,tabao-rush}` | Stubs `@kaki/game-<name>`, same shape. |
| `.gitignore` | Added `coverage/`, `*.tsbuildinfo`, `.pnpm-store/`, `blob-report/`, `playwright/.cache/`. |
| `uat/evidence/F-01-workspace/` | `verify.txt`, ten `fail-*.txt`, `pass-patterns.txt`. |

Requirement → code → tests → evidence:

| ID | Code | Tests | Evidence |
|---|---|---|---|
| NN-7 | `package.json` (`trace`, `verify`) | — (the trace check is itself the check) | `verify.txt`, `fail-trace.txt` |
| NN-8 | `package.json` (`verify`), `tsconfig*.json`, `eslint.config.js`, `tools/check_workspace.mjs`, `tools/lint_design.mjs`, `tools/check_budgets.mjs` | `tools/check_workspace.test.ts`, `tools/lint_design.test.ts` | `verify.txt`, every `fail-*.txt` |
| NFR-TEST | `vitest.config.ts`, `tsconfig.test.base.json`, `*/tsconfig.test.json` | `tools/*.test.ts` | `verify.txt`, `fail-unit-test.txt`, `fail-typecheck-test-file.txt` |

All three stay `in progress` / `partial`: this issue supplies the tooling, not the game-rule
tests or UAT scripts those rows finally need.

### Review round 1: what changed

| # | Finding | Change |
|---|---|---|
| 1 | Typecheck failed (TS6310) once a package referenced another | `typecheck` is now plain `tsc -b tsconfig.build.json`. `@kaki/netcode` permanently depends on `@kaki/protocol`, so the clean run exercises it. |
| 2 | Unreferenced packages and dependencies passed silently | `tools/check_workspace.mjs`, first step of verify. Beyond the two rules asked for it also fails on a workspace folder with TypeScript and no tsconfig, on an unreferenced sibling `tsconfig.<name>.json`, and on the root project missing from `tsconfig.build.json`: the same hole in three more places. |
| 3 | Unitless style numbers | Checked as pixels in script files (`{ padding: 4 }`), except for `top`/`right`/`bottom`/`left`: see "Not done". |
| 4 | More forms and properties | JSX/HTML/SVG attributes (`gap="12px"`, `padding={"4px"}`, `padding={4}`, `gap="12"`), `style.x = '…'`, `style['x'] = '…'`, `setProperty('x', '…')`; `grid-gap`, `grid-row-gap`, `grid-column-gap`, `scroll-margin*`, `scroll-padding*`, `outline-offset`; px in custom properties outside `packages/ui/`; rem and em in spacing declarations are a `spacing-unit` finding. |
| 5 | More colours and file types | `0xRRGGBB`, `0xRRGGBBAA`, `oklch(`, `oklab(`, `lab(`, `lch(`, `hwb(`, `color-mix(`, `color(`. `.html`, `.svg`, `.js`, `.mjs`, `.jsx` are scanned. Named colours are not attempted. |
| 6 | False positives | Link targets, CSS id selectors before `{`, private class members and all-digit references are skipped. The rules are in the lint's header. |
| 7 | Escape marker | Counts only inside a comment; `design-lint-ignore` excuses one finding (the leftmost), `design-lint-ignore-line` the whole line; no reason is still a finding. |
| 8 | Scales | `SPACING_SCALE` 0, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377; `RADIUS_SCALE` adds 1, 2, 3; `RADIUS_PILLS` 999, 9999. The tautological test is now "keeps hairline steps and pills for radii only" and checks the relation between the scales. |
| 9 | Root tsconfig, package config files | Root `tsconfig.json` includes `uat/**/*.ts` and `spikes/**/*.ts` (missing folders are harmless). Package config files: the `tsconfig.node.json` pattern in "Adding a package", proved in `pass-patterns.txt`. Not created in the stubs because a tsconfig matching no files is a TypeScript error. |
| 10 | Tests and purity | Each package has `tsconfig.lib.json` (no tests, no Node types) and `tsconfig.test.json` (tests, Node types, checked, not built). "Adding a package" written. |
| 11 | `no-console`, `.npmrc` | Exemption covers `tools/**/*.{mjs,ts}`. `.npmrc` has `engine-strict=true`; `engineStrict: true` is also in `pnpm-workspace.yaml`, where current pnpm reads its settings. |
| 12 | CLI test | `run()` is tested for exit 0 and exit 1 on temp directories, for both tools. |
| 13 | Evidence | `verify.txt` regenerated; probes saved as `fail-*.txt`, run in a `git archive` copy. |

### How it was verified

- **Clean state, in the worktree:** every `node_modules`, `dist` and `.tsbuildinfo` deleted
  (the run prints the count left: 0), `pnpm install --frozen-lockfile`, `pnpm verify` → exit 0.
  Saved as `verify.txt`.
- **Failure probes, in a copy:** the staged tree was exported with `git write-tree` and
  `git archive` to a temp directory (the commit could not exist yet, since the evidence is
  part of it; the tree is the commit's tree less this note and the evidence files, which no
  check reads). Each probe added one violation, deleted every `dist`, ran `pnpm verify`, and
  was undone. The worktree never held a violation.
- `verify.txt` was produced before this note and the evidence files were written. After the
  commit, `pnpm verify` was run once more on the committed tree and passed.

### `pnpm verify` output tail (final clean-state run)

```
$ pnpm verify
$ pnpm run check:workspace && pnpm run typecheck && pnpm run lint && pnpm run lint:design && pnpm run test && pnpm run build && pnpm run trace
$ node tools/check_workspace.mjs
workspace check passed: 9 folder(s)
$ tsc -b tsconfig.build.json
$ eslint . --max-warnings 0
$ node tools/lint_design.mjs
design lint passed: 9 file(s) scanned
$ vitest run

 RUN  v4.1.12 <worktree>


 Test Files  2 passed (2)
      Tests  126 passed (126)
   Start at  11:44:57
   Duration  137ms (transform 64ms, setup 0ms, import 82ms, tests 34ms, environment 0ms)

$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
$ python3 tools/trace_check.py
152 requirements; 4 in progress, 1 later, 147 not started
trace check passed

exit code: 0
```

### Dependencies added (all root `devDependencies`, exact versions)

The integrator must log each in `docs/DECISIONS.md`. Round 1 added none.

| Package | Version | Reason |
|---|---|---|
| `typescript` | 6.0.3 | Compiler and typecheck. Not 7.0.2 (latest): typescript-eslint 8.72.2 supports TypeScript `<6.1.0` only. |
| `vitest` | 4.1.12 | Unit test runner. Not 5.1.0 (latest): Vitest 5 makes `vite` a required peer, which would mean adding Vite as a direct dependency before the spikes decide on it. Vitest 4 brings Vite in as its own transitive dependency (vite 8.3.8 in the lockfile). |
| `eslint` | 10.15.0 | Linter. |
| `typescript-eslint` | 8.72.2 | TypeScript parser and the strict type-checked rule sets for ESLint. |
| `@eslint/js` | 10.0.1 | ESLint's recommended base rules for the flat config. |
| `@types/node` | 24.19.2 | Node types for the type-checked tools, config files and test projects. Matches Node 24. |

### Not done, and why

- **Bare numbers in `top`, `right`, `bottom`, `left` are not checked** (`{ top: 4 }`,
  `top={4}`). In this codebase those keys with a plain number will mostly be rectangles, tile
  positions and direction tables in game rules, not styles; checking them would bury real
  findings. The px, rem and em forms of the same four properties are checked.
- **`typecheck` writes `dist/`.** With project references a referenced package must emit its
  declarations, so a no-emit typecheck is not possible. `build` repeats the same command, which
  is then a no-op.
- **No `tsconfig.node.json` in the stubs**: see row 9.
- **The `reviewer` agent has not been run by me**; review is being done by the integrator.

### Notes for later issues

- `typecheck` now builds. Nothing imports from `dist/`; packages export their TypeScript
  source (`"exports": { ".": "./src/index.ts" }`), so Vitest and a bundler need no build first.
- **Hex constants trip the colour rule.** A 6- or 8-digit `0x` literal is reported wherever it
  is, so a hash or random-number constant in `sim-core` (`0x6d2b79f5`) needs
  `// design-lint-ignore: <reason>`, or to be written another way.
- A comment in a script file is linted like code, so `// was #fff` is a finding.
- A package's library code has no `console`. Tools under `tools/` do.
- pnpm 12 runs an install check before `pnpm run` when a `package.json` has changed.

### Requests

1. **Log the six dependencies** above in `docs/DECISIONS.md`, including the two version holds
   (TypeScript 6.0.3, Vitest 4.1.12) and that Vite 8.3.8 arrives transitively through Vitest.
2. **Spacing scale wording** (already with the integrator for Randy): `docs/DESIGN.md` §1 lists
   5 to 89 px only; the lint also allows 0, 144, 233, 377, and 1, 2, 3 and the pills for radii.
3. **`docs/WORKFLOW.md` §2 and the `CLAUDE.md` commands table:** verify now starts with a
   workspace check, the design rule runs as its own step (`pnpm lint:design`), and there is no
   performance step until F-08. The docs may want a line each, and a pointer to "Adding a
   package" above (or that section moved to `docs/ARCHITECTURE.md`).
4. **`docs/PLAN.md` §5** says issue branches never edit root config or `pnpm-lock.yaml`. A new
   package needs one line in `tsconfig.build.json`, and a new workspace dependency changes the
   lockfile. Either the integrator makes those edits, or the plan allows these two.
5. **`jsdom`** (or `happy-dom`) will be wanted by the first issue with DOM tests; it is a
   dependency decision.
6. **`TRACEABILITY.md`:** NN-7, NN-8 and NFR-TEST can take the code, test and evidence paths
   from the table above; none of them becomes `done` from this issue alone.
