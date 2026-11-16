# F-04 — Review round 4 evidence

Generated from the uncommitted worktree on 2026-11-16. This interface draws nothing;
evidence is executable text. No dependencies or shared requirement documents changed.
Changes remain in the working tree; no commit, push or deployment was made.

- `verify.txt`: `/usr/bin/time -p pnpm verify`, exit 0. All workspace, typecheck, lint,
  design lint, test, build and trace checks pass. No evidence or benchmark variable was set.
  The aggregate broken-variant assertion covers all **25 checks**.
  685 tests passed, one opt-in timing test skipped. Test phase: 11.71 seconds;
  whole verify wall time: **21.64 seconds**.
- `platform-tests.txt`: `KAKI_KIT_EVIDENCE=<absolute kit-output.txt> /usr/bin/time -p
  pnpm exec vitest run packages/platform/src/game --reporter=verbose --reporter=json
  --outputFile=/private/tmp/f04-r4-platform.json`, exit 0. Twelve files,
  **170 tests passed**, one opt-in timing test skipped. Vitest duration **9.72 seconds**;
  process wall time **9.94 seconds**. Concurrent test bodies total 24.61 seconds and overlap.
- `kit-output.txt`: **79 reports**, comprising **10 passing configurations** and
  **69 broken executions**, representing **67 distinct named broken variants**. Two registry
  probes repeat sustained-copy and stuck-private-revision variants. Every broken execution
  has a failure. All honest configurations pass, including the always-null-private-view game.
- `benchmark.txt`: `KAKI_BENCHMARK=1 /usr/bin/time -p pnpm exec vitest run
  packages/platform/src/game/benchmark.test.ts --reporter=verbose`, exit 0. Both tests pass;
  process wall time 2.38 seconds. Sharing 0.596, hand copy 1.289, generic clone 15.942
  microseconds per step. Heap growth remains an estimate; no threshold was changed.

## Review round 4 proofs

- The readable reviewer repro enables ticking labels on every step. A generic Picks variant
  reproduces this with short, changing grid/option labels and a revision bump per change.
  Its layout check passes, but all delayed taps are dropped. `late-taps` now fails with
  “every tap one step late was dropped; keep changing text out of tappable controls or do not
  bump the revision for cosmetic label changes”. The test asserts both the layout pass and
  the late-taps failure with guidance.
- Applicability follows the presence of tappable controls, independently of delayed host
  acceptance. Held and accepted tap counts are separate; held taps with zero acceptances
  fail. A replay with no tappable controls remains N/A.
- Reviewed all other N/A paths: private-revision needs two consecutive non-null views to
  compare; repeat-taps needs an offered tap refused by the resulting layout; sharing needs
  a non-trivial returns-new step with no accepted tap or membership change and no tiny-state
  exemption. Their N/A conditions do not hide refused observations. No further matching fault
  was found, so no additional broken variants were needed for them.
- The always-null-private-view fixture passes and retains private-revision N/A. Existing
  honest re-deal, private revision, leader audience and delayed-tap fixtures also pass.

This supersedes the round-3 evidence's acceptance-based description of late-taps N/A.

## Broken variant coverage

- `assets`: BROKEN Dots: a late asset.
- `clone`: BROKEN Dots: Math.random.
- `determinism`: BROKEN Dots: Math.random.
- `init`: BROKEN Dots: init fails for eight.
- `join-leave`: BROKEN Picks: buzzer scores twice while locked.
- `late-taps`: BROKEN Dots: Math.random.
- `layout`: BROKEN Picks: global revision changes when another player locks.
- `meta`: BROKEN Dots: solo claimed for a two-player game.
- `min-players`: BROKEN Dots: step mutates its state.
- `pause`: BROKEN Dots: resume does not undo pause.
- `previous-state`: BROKEN Dots: step writes into a typed array of the old state.
- `private-revision`: BROKEN Picks: the seal in every private view.
- `purity`: BROKEN Dots: Math.random.
- `reload`: BROKEN Dots: Math.random.
- `repeat-taps`: BROKEN Picks: step reverses the list of taps.
- `replay`: BROKEN Dots: Math.random.
- `results`: BROKEN Dots: co-op scores disagree.
- `runs`: BROKEN Dots: breaks after twenty steps with one player.
- `secrets`: BROKEN Picks: picks shown on the TV.
- `seed`: BROKEN Dots: seed ignored.
- `settings`: BROKEN Dots: a default off the steps.
- `sharing`: BROKEN Dots: whole-state copy every step.
- `state-contract`: BROKEN Dots: step mutates its state.
- `views-json`: BROKEN Dots: a Map in the public view.
- `views-pure`: BROKEN Picks: view sorts players in place.

## Remaining integration Requests

The package-export Request is complete. The protocol wire-table integration cross-check,
host/controller adoption, real-game updates, shared trackers/specs and real-browser allocation
and collector-pause measurements remain with their owners, as listed in the slice note.
No allocation counts or real-browser performance are claimed here.

## Final verify tail

```text
$ tsc -b tsconfig.build.json && node tools/check_budgets.mjs
no bundles yet
$ python3 tools/trace_check.py
152 requirements; 8 in progress, 1 later, 143 not started
trace check passed
real 21.64
user 60.73
sys 2.47
```
