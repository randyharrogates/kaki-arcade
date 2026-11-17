# A-04 Tabao Rush ingredients, dishes and order icons: round 1 evidence

Rendered by the integrator with Blender 5.2.3 from `tools/blender/items.py` after Codex round 5
(1b4abed): dry run passed (65 models, 10 s), render passed every self-check (15 s), pack passed:
one atlas 582 × 384, 239,454 B, 893,952 B decoded (PERF-023/024). Silhouette check: closest pair
projected IoU 0.793 (icon-satay / icon-kway-teow-cooked), rendered 0.789 (icon-chicken-rice /
icon-satay); limit 0.90; both checks agree.

## Integrator's look (2026-11-17)
Opened items-sheet.png, icons-3x.png and icons-1x.png, and earlier rounds' sheets.
- Rounds 1-4 fixed: side-view slivers (icons now drawn from 55° and framed to 41-47 px of 55),
  impossible states (only the 32 reachable appearances), rojak (a mixed glossy heap), rice (sack,
  dome), kopi and teh (tins; dark cup with crema, tan glass), chicken (whole bird, sliced row),
  dirty containers (irregular smears and drips), whole pineapple with crown, raw satay skewers.
- Round 5: kway teow is a loose tangle of wide ribbons with sprouts (cooked), black (burnt), pale
  fold (raw); distinct in outline from bread and thin noodles.
- Integrator fixes in Blender (Codex cannot run it): icon rim drawn after render (Blender 5 has
  no scene compositor tree); laksa spoon on the icon only (it clipped the dish frame).
- Recognisability at TV size (TR-041) is put to Randy as an artifact.
| Image | What it shows | Looked at by |
|---|---|---|
| items-sheet.png | every 89 px item, dish and container | Claude (integrator) |
| icons-3x.png | every 55 px order icon at 3× | Claude (integrator) |
| icons-1x.png | the icons at real size | Claude (integrator) |
