# T-07 renderer checks — T-07b round 3

Main ef115c86 includes T-18 served dishes, C-25 and R-16; the fixture conflict
is resolved. Round 14 evidence predates this merge.
The marker has a 3 px ink edge, outer radius 21. Cook separation is 0.36 tile, not the marker gap. The vertical marker centre
separation is 33.6552 px with the north-band push (3.756 px, rounded 3.76),
and 37.4112 px (37.41) unpushed. The 0–90° sweep at 0.01° steps uses the
real 120 / 103.92 px projection and marker placement on both fixture levels.
Worst disc overlap: in band 8.3448 px at 90°; outside 4.5888 px at 90°.
Worst nearer-disc cover of the far numeral box: in band 1.91687 px at 65.28°;
outside 0 px at every angle. Cover is radial penetration from the disc edge
to the nearest point of the centred glyph box, bounded by half-width 11 px
(SFNS bold 34 digits are 16–22 px wide) and half-height 25/2 px.
Nearer cooks draw their marker on top. The sweep has a 20 s timeout after the
review measured 6.05 s under contention.

North-counter fixtures retain east/west and add south at 1920 and 1280, y=1.2.
At the north counter a held item shows only when the cook faces s, se or sw;
otherwise it is behind the body by design. Disc lower edge feet −90.5 versus
hands −31.4 (e/w), −18.5 (s): at least 59 px anchor clearance.
Seat-5 recolours seat 1, so its numeral reads “1”. Lossless contrast probes now
assert the cap sample matches its seat colour, then assert ≥ 3:1 edge contrast.

All checks used PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false, ran one at a time
without load gating, and completed within ten minutes. Vitest used two workers.

| Check | Round 3 result |
|---|---|
| Full Tabao Rush suite, briefed exclusions, two workers | Passed: 391 tests, 31 files, 325.84 s. Includes both-level diagonal sweeps and geometry regression assertions. |
| Build typecheck including UAT slice | Passed: `tsc -b tsconfig.build.json`. |
| Emitted-file cleanup | Passed: `tsc -b tsconfig.build.json --clean` after typecheck. |
| ESLint | Passed, zero warnings, including the UAT slice. |
| Design lint | Passed, 520 files scanned. |

DOM tests were not run by this implementation round. The integrator’s verify3 passed
text.dom.test.ts (256 files). Historical evidence stays in its original folders.
The round 3 full-suite pass includes the final marker geometry and diagonal sweep assertions.

Round14-uat was shot before main’s merge. The integrator reruns UAT to
round15-uat on the merged tree, inspects all stills and strips, fills REPORT
and obtains independent review, and reruns perf. Production performance on
a quiet machine remains owed before T-07 closes; perf-r7 is diagnostic only.
No new visual or performance acceptance is claimed. No verify, UAT, perf, install
or commit is run by this implementation round.
