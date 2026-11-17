# S-02 round 2 evidence: the board-size render (2026-11-18)

Round 1 is superseded (round1 and round2 are evidence folders; the code had four review rounds): it shows 160 px frames, untinted caps and the old 2020 × 692 atlas
(623,216 B). This round is the render at commit 96f12d3, checked again at round 4.

## Numbers
- Frame 192 × 192 px; 1.5 tiles to the top of the head, 1.5494 tiles with the cap (check-only.txt; the bare head top at 1.5000 was measured by the reviewer from the evaluated vertices).
- Foot slide 0.000015 px; anchor jump 1.08 px; foot lift 7.2 px; idle anchor drift 0.
- 208 of 208 anchors in pipeline.json equal render-validation.json; masks equal their frame's anchor.
- Mask alpha reaches 255 in all 104 masks; worst spill 8/255 on 1 to 3 pixels (limit 16/255).
- Atlas 1724 × 1746, 1,188,502 B full, 395,922 B half, 12,040,416 B decoded. 94.2 s per character,
  187.6 s in total.
- Storage per D-144: about 7.3 MB lossless for all cooks, 2.8 MB at lossy q90 with exact colour.
- check-only.txt: the round-4 checks against these frames; the pre-shadow mask comparison is
  skipped in check-only (it needs a render) and runs on the next full render (A-02).

## Images, all opened by the integrator
| Image | What it shows |
|---|---|
| idle8-light.png, idle8-dark.png | Idle in 8 directions, cap and apron tinted in the 8 player colours. Tints stay on cap and apron; heads sit on bodies. On dark the shoes and contact shadow nearly vanish (for A-02 or level art). |
| walk-s.png … walk-sw.png | 8-frame walks per direction, tinted. Feet alternate; the stride is small at 1× (known limit). |
| board1C-side-by-side.png | Board 1C cook beside the spike's s idle at the same scale; cap about 100 px wide in both. |
| masks.png | The first 48 raw masks: pure white, cap and apron shapes. |
| head-anchor.png | The headless body and the head placed at its anchor. |
