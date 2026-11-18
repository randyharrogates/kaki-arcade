# X-02 evidence status

Current evidence: `round3/` (2026-11-18), on commit 731e6b54 plus nothing visible since. Every still was opened by the
integrator; the acceptance table there passes. Rounds 1 and 2 are historical (round 1: incomplete phone stills, Wi-Fi
advice and a 960 × 540 scroll; round 2: the whole address line in mono).

- Vitest: 54 files, 481 tests passed (reviewer, round 2); the help DOM test now also covers a real host.
- TypeScript, ESLint and design lint clean.
- Transfer: host 317,230 B gzip (+1,641 over main); shared controller entry 104,072 B gzip (+257). The help page's
  JS and CSS load only when it opens.
- PERF-020 controller start-up: median 182 ms of 2000 ms (5 runs, CPU 4×), `perf-1/`.

Not proven: a real TV browser (S-03b, X-09), full-screen keys on real keyboards, Game Mode names by brand.
