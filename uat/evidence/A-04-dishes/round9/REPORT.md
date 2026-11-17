# A-04 round 9: integrator's render and look (2026-11-18)

Render: `python3 tools/assets/pipeline.py --render`, exit 0, with the new containment check;
atlas 590 × 404, 231,796 B, 953,440 B decoded; PERF-023/024 passed.

Opened: a04r9-all.jpg (all 68 frames at 3×) and a04r9-1x-at2.jpg (the 7 dishes and 7 icons at 1×,
shown at 2× nearest-neighbour).
- Fixed: dish-kaya-toast-plated carries servedComposition variants for kopi and teh using the same
  cup frame and the teh portion; the side cup sits inside the plate; satay sticks inside the rim.
- New defect: the kaya toast's side cup shows a dotted, broken outline ring round its rim and
  handle, visible at 1× as a dashed circle; the cup frame's outline breaks up at 0.68 scale.
- Unchanged polish for A-10 (D-145): rojak heap, turnip shards, chicken pegs.
