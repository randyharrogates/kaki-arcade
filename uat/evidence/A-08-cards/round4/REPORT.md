# A-08 round 4: integrator's render and look (2026-11-18, D-150 DM Sans Bold)

Render: `python3 tools/assets/pipeline.py --render`, exit 0, 197 s (the pipeline also re-renders
S-02's cook spike, as in round 3). CARDS CHECK: central shared cap height 0.3267 card units,
49 px at 1080p; 52 faces validated, no ink overlaps, corner clearance >= 0.05; flip widths
150, 108.7, 3.75, 108.7, 150 px. peek-poker-cards-0 1926 × 1100, 915,460 B, 8,474,400 B decoded;
PERF-023/024 passed. Full log: render.txt.

Opened: a08r4-deck.png (52 faces, back and 5 flip frames on the baize at render size),
a08r4-grey.png, a08r4-zoom.png (9 to K of clubs and diamonds at 2×).
- Every corner index, the 10 included, is the same height and reads at 1×; the inverted "10"
  reads as ten.
- Central ranks share one height; the 10 no longer reads smaller than the others; plain zero.
- Suits differ by shape in greyscale; court badges, back stripes and flip frames unchanged.
