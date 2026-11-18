# P-03 checks — Round 4 (2026-11-18)

The integrator's re-shot evidence in commit 5f0ddfaa passes at 1, 2 and 8 phones
(round1-p1, round1-p2, round1-p8), including settled resize geometry. The integrator
also ran and passed the phone coverage test with its Round 3 negative control.
Controller performance passed at **163 ms median**. These are the current accepted
integrator results, superseding the stale-measurement warnings in the Round 3
notes. Round 4 leaves all round1-* files and REPORTs untouched.

Round 4 moves the felt fix into the controller kit, preserves opaque crossfade
paint, and removes the app transparency override. The updated coverage predicate
accepts copied felt only when its painting box, size and origin match the shell.
Its controls independently restore wrapper paint alone and misalign the copied
surface alone; each must fail the same predicate, then restoration must pass.
The updated browser assertions need an integrator run outside this sandbox.

The diagnostic now expects nine phase visits × eight phones = 72 layouts:
rounds 1 and 2 each visit memorise/pick/reveal/scoreboard, then round 3 memorise.
The additional 16 sends replace Scores on the TV with Watch the TV at the two
scoreboard → memorise transitions. They are necessary. Assertions include initial
sends and disallow a second layout for any phone within the same phase visit.

Notes stay at 13 in CSS, placement and DOM fitting. Points retains the 89 fit step;
the full reveal placement uses 89 at 932 × 430 and 55 at the two shorter viewports.
Kit regressions cover those sizes, note specificity and fitting, and opaque
crossfade paint with a full-shell copied background box.

Final permitted commands and local results:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run games/peek-poker apps/web/src/phone packages/controller-kit packages/platform/src/session`:
  exit 1; 411 passed, 1 failed (37 files passed, 1 failed). The only failure is
  Chromium launch denied by the sandbox:
  MachPortRendezvousServer bootstrap_check_in Permission denied (1100), SIGTRAP.
  The fixture bundle builds; coverage and its two independent controls cannot
  execute locally. The earlier integrator coverage pass remains recorded above.
- `pnpm exec tsc -b tsconfig.build.json`: exit 0.
- `pnpm exec eslint games/peek-poker apps/web/src packages/controller-kit packages/platform/src/session --max-warnings 0`:
  exit 0.
- `pnpm run lint:design`: exit 0; 410 files scanned.

Earlier iterations caught and corrected nullable test metrics and a test fixture's
non-token origin offset. An added full-reveal regression confirmed the existing
55 step at shorter heights and the 89 step at the largest viewport.

Each command was launched after uptime reported one-minute load below 8.
No memcheck, verify, whole-suite test, UAT, perf, Blender, install, dependency
linking/copying, commit or merge was run.

Carry for the integrator's K backlog: narrow columns wrapping Locked in and Watch
the TV; selected-card corner hairlines; dark ink for hearts and diamonds.
P-06/P-07 still own real TV-table/frame privacy; the console placeholder is not
proof of that. Outgoing payload privacy remains independently tested.


Integrator note 2026-11-18: superseded. Round 4 evidence was re-shot at 95bb03d2 (commit 0d6e9aa7); see the slice note's close-out.
