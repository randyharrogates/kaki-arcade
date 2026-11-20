# T-10 round 2 checks

Fixed the UAT closure narrowing for leader/other with separately guarded const aliases; typed the outgoing title query as HTMLHeadingElement; moved the Vite-based tutorial DOM test to apps/web/src/tabao-tutorial.dom.test.ts, corrected its relative imports/styles and typed its Vite callback parameters. Preserved the integrator edits and did not edit Peek Poker or Rabakz.

The effective-load script cannot sample CPU idle: its top invocation is denied by the sandbox (`operation not permitted: top`). It nevertheless printed 8 after the error; this is neither a valid effective-load sample nor below the required launch threshold. Direct `top -l 2 -n 0 -s 2` also failed with the same denial. Raw load was 19.02, above the fallback ceiling of 16; CPU idle cannot be verified.

| Requested check | Result | Effective load at launch |
| --- | --- | --- |
| Vitest (including apps/web; requested exclusions) | Not launched: load gate blocked | No launch |
| TypeScript build (all UAT slices) | Not launched: load gate blocked | No launch |
| ESLint (requested paths) | Not launched: load gate blocked | No launch |
| lint:design | Not launched: load gate blocked | No launch |
| trace_check.py | Not launched: load gate blocked | No launch |

`git diff --check` passed. No emitted files were produced, and no commit, UAT, DOM test, verify or performance run was made. The five requested checks remain outstanding; no pass is claimed.
