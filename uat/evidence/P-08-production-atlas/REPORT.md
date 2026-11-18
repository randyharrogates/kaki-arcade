# P-08 production atlas — evidence rounds

Production evidence is run with `node uat/slices/P-08-production-atlas.mjs --out prod-rN`, which
builds and previews production with one phone. prod-r2 and prod-r3 were run with that command;
their `run.json` and REPORT record `node tools/uat/run.mjs … --out prod-rN` because the runner
then recorded its own argv (fixed in round 3; prod-r4 records the real command).

| Run | Purpose | TV image | Phone image |
| --- | --- | --- | --- |
| prod-r2 | Defect record: console paint under Peek Poker's cream text | [TV memorise](prod-r2/01-host-production-tv-memorise.jpg) | [Phone defect](prod-r2/02-phone1-production-phone.jpg) |
| prod-r3 | Theme-key remount stopgap, before the main merge | [TV memorise](prod-r3/01-host-production-tv-memorise.jpg) | [Phone remount](prod-r3/02-phone1-production-phone.jpg) |
| prod-r4 | Round 3 after merging main (c8d44592): in-place repaint on the shell theme change | [TV memorise](prod-r4/01-host-production-tv-memorise.jpg) | [Phone repaint](prod-r4/02-phone1-production-phone.jpg) |

## Visual review

Looked at by the integrator and by review 2, 2026-11-18.

| Run/image | What it shows | Looked at by |
| --- | --- | --- |
| prod-r2 TV | Memorise on felt; 16 table and 3 shared cards from the atlas, readable | Integrator, review 2 |
| prod-r2 phone | Defect: cream console dots under cream text, nearly unreadable; only the footer is felt | Integrator, review 2 |
| prod-r3 TV | As prod-r2 | Integrator, review 2 |
| prod-r3 phone | Whole play area felt, cream text readable (remount stopgap); no Menu pill, pre-merge | Integrator, review 2 |
| prod-r4 TV | Felt, 16 table and 3 shared cards crisp, suits by shape and colour, Round 1 of 5, timer 20 | Integrator, review 2 |
| prod-r4 phone | Whole play area felt with cream "Watch the TV", "Seconds", 20; Connected and Menu pill; one treatment | Integrator, review 2 |

## Acceptance

| Statement (slice note) | Pass / fail | Evidence |
| --- | --- | --- |
| A production build starts Peek Poker and reaches memorise with atlas cards | Pass | prod-r4/01 |
| The production phone shows the Peek Poker felt, repainted on the theme change | Pass | prod-r4/02; `apps/web/src/phone-coverage.dom.test.ts`, `packages/controller-kit/src/layout-renderer.test.ts` |
| Every atlas the manifest names exists beside it, both detail levels | Pass | `build-output.txt`; `apps/web/atlas-assets.test.ts` |
| No atlas in the controller closure | Pass | prod-r4 dist: controller closure 108,898 B gzip, 0 atlas files; `tools/check_budgets.test.ts` |
| A missing or malformed atlas fails the scanner | Pass | `tools/check_budgets.test.ts` |

Development is unchanged: the atlas plugin applies to builds only (`apps/web/atlas-assets.ts`,
`apply: 'build'`). Budgets on the prod-r4 build: shell 369,995 B gzip of 1.5 MB (PERF-022),
controller 108,898 B of 300 KB (PERF-020), whole deploy 4,429,561 B gzip reported. Full-match
performance belongs to P-09.
