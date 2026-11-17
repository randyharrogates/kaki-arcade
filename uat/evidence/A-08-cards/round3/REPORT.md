# A-08 round 3: integrator's render and look (2026-11-18)

Render: `python3 tools/assets/pipeline.py --render`, exit 0. CARDS CHECK: 52 faces validated; no ink
overlaps; corner clearance >= 0.05 card units. peek-poker-cards-0 1926 × 1100, 886,554 B,
8,474,400 B decoded; PERF-023/024 passed. Integrator fix at render: JetBrains Mono's "10" is wide,
so the central 10 is fitted within ±0.205 (was ±0.31) in tools/blender/cards.py and board_cards.py
to stay 0.05 clear of the corner indices; the first render failed the ink check on all four 10s.

Opened: a08r3-deck.png (52 faces, back and 5 flip frames on the K1 baize at render size),
a08r3-grey.png (greyscale), a08r3-zoom.png (9 to K of clubs and diamonds at 2×).
- Ranks in JetBrains Mono Bold (D-147), one shared rank height; court badges below the suit.
- Suits differ by shape in greyscale; spade black.
- Back stripes and flip frames intact.
- For the reviewer: the font's dotted zero shows in "10"; the 10's corner index is noticeably
  smaller than the other indices.
