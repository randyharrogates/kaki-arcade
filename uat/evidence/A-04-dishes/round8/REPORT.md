# A-04 round 8: integrator's look (2026-11-18)

Render: `python3 tools/assets/pipeline.py --render`, exit 0; atlas 590 × 404, 231,600 B, 953,440 B
decoded; PERF-023/024 passed. Integrator fixes at render time: the plate's side cup moved from
(.18, .13) to (.15, .02) because it clipped the frame's top and then right edge; the satay sticks
moved from (-.035, 0) to (-.10, -.05) so the cucumber passes the 4% visibility check (3.8% before);
anchors in assets/src/pipeline.json updated to match; the edge check now names the edge it clips.

Opened: a04r8-all.jpg, all 68 frames at 3× on the console marble.
- Rojak: one mixed heap of pineapple, turnip and cucumber with a dark dressing drizzle.
- Kopi-teh plated: the cup holding the served kopi; kaya toast: two slices with kopi in the side cup.
- Satay plated: three sticks left, cucumber visible on the right.
- Laksa: broth and noodles inside the bowl; nothing overflows any cup or bowl.
- Remaining weakness: chopped turnip reads as white shards rather than turnip (TR-041 recognisability).
