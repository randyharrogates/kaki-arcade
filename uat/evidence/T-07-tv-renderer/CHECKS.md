# T-07 renderer checks — round 12

Round 11 is committed at `66581bc2`, evidence at `fbe38037` in `round11-uat/`;
main merged at `db7f05c7`. Review 7 is not clean: the done strip lacks its pulse,
the north-counter marker covers the cook/held item at y=1.2, and the documents
were stale. Earlier round-10 evidence is historical. Perf-r7 remains diagnostic only.
The integrator commits this round and runs its UAT to round12-uat.

Round 12 moves north cues into the screen margin with maximum pulse room, includes
all potential north cues in the band, caps fallback marker push above real head
sockets, adds a 2 px ink edge and counter-item rejection obstacles, and tightens
the reachable-function string scan. The live done fixture and UAT pixel assertions
cover strips 36/61. New evidence fixtures cover north y=1.2 holding an item at
1920 × 1080 and 1280 × 720 plus a 2.0 → 1.2 approach strip. Mock font measurement
remains open. No round-12 visual or performance acceptance is claimed here.

Every pnpm command uses PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false; Vitest uses two
workers. Launches wait for one-minute load below 8; every command is limited to ten
minutes. Loads below are the immediately preceding uptime readings.

| Check | Launch load | Result |
|---|---:|---|
| Full Tabao Rush suite, briefed exclusions | 2.40 | 373 passed, 1 new anchor-test failure; corrected hands assertion (some actions raise hands above head); 279.01 s |
| Build typecheck including UAT slices | 5.70 | UAT viewport tuple annotation error; corrected |
| ESLint | 7.82 | Three style errors; corrected |
| Host suite | 6.30 | Passed: 31 tests, 5 files, 4.03 s |
| Full suite retry, briefed exclusions | 5.54 | Passed: 374 tests, 29 files, 258.51 s |
| Build typecheck including UAT slices | 5.63 | Passed |
| ESLint | 6.15 | Passed |
| Design lint | 6.99 | Two raw-colour findings in measured test samples; changed to RGB evidence data |
| Design lint retry | 7.16 | Passed: 505 files |
| Build clean | 6.89 | Passed; emitted files removed |
| Host suite after scan follows all repository imports | 7.35 | Passed: 31 tests, 5 files, 4.55 s |
| Build typecheck | 7.00 | Passed |
| Final ESLint | 6.32 | Passed |
| Final build typecheck, including UAT slices and north walking fixture | 5.24 | Passed |
| Final build clean | 3.91 | Passed; emitted files removed |

The full-suite retry passed after the anchor correction; the final host suite also
passed after expanding the string scan. No check reached ten minutes.

No UAT, perf, verify, install, commit, merge or push is run by this implementation
round. The integrator captures and inspects the evidence, completes REPORT tables
and obtains independent review. Trackers, contracts, lockfile and design documents
stay with the integrator.

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- T-07-tv-renderer --out round12-uat --max-mb 40 --timeout-min 20
```
