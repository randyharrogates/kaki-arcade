# R-05 round 24 detector regression evidence

RZ-032, RZ-034. Read round10/REPORT.md and matrix-all.json first.

Cause: Range font content leading was compared with the header's shorter
line-height mask without a font allowance. Round 23's added child padding
then exceeded the unchanged header layout box, causing child-bound findings.

Reverted the header CSS, retaining prompt padding. Header mask checks measure
the loaded font's ascent/descent content height and permit its half-leading
plus at most 1 viewport pixel. Prompt clipping stays strict. Findings now
include all compared rectangles and identify anonymous elements by tag;
__rzMatrix includes the complete findings array.

Unit regression: 1280/1920/3840 header geometry and subpixel edges pass;
vertical excess and horizontal clipping fail; the unpadded two-line round-22
prompt fails and descender-padded prompt passes its mask check. Diagnostics
assert element names, bounds, measured edges and allowance. All 481 tests in
20 Rabakz/content files pass. Rabakz typecheck, ESLint, design lint and diff
whitespace checks pass.

Full pnpm verify fails outside R-05: controller-kit cannot resolve preact and
preact/hooks and its tests lack DOM types. See verify.log. No browser matrix
or screenshots were produced in round 24; integrator browser review remains.
