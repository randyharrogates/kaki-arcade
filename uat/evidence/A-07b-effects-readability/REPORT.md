# A-07b effect readability — TR-009, TR-010, TR-062

## Rendered and reviewed

Round 1 was rendered by the integrator and reviewed on 2026-11-18. Round 2 (palette shadow at
peak alpha .5, wider spark rings at peak alpha 1, half detail at play size) was re-rendered by
the integrator at 4e8634b2; all five effects were re-rendered and fire, steam and spray came
out byte-identical. The integrator and reviewer looked at all 30 images in rendered/ (1x and
4x on both counters, every column including last/first, half detail and greyscale; every GIF
frame; the static options).

Measured at HEAD:
- Shadow: every pixel RGB (43,33,24) = #2B2118; peak alpha 127/255; 3.00 : 1 on light, 1.39 : 1
  on dark (main 4.67 / 1.38); at one tile of height 1.64 / 1.18. Largest alpha step 9 px
  horizontal, 17 vertical; no grain or banding.
- Sparks: best contrast on cream 4.45 / 4.67 / 4.80 / 4.37 : 1 per frame, 20–38 px at ≥ 3 : 1
  (round 1 2.8–3.2 with 0–3 px; main 1.8–2.0 with none); on dark 4.2–4.6 : 1; peak alpha 255.
- Steam and spray (pixels unchanged since round 1): whole lobe greys slightly; peak contrast on
  light about 1.7 → 2.2 : 1, on dark about 5.1 → 4.4 : 1. Some pre-existing Cycles grain
  remains inside the lobes (T-07 or A-05).
- No effect PNG has tEXt, zTXt or iTXt.
- Atlas tabao-rush-effects-0: 152×298, 39,096 B / 181,184 B decoded full; 76×149,
  14,666 B / 45,296 B half (main 37,818 B / 174,240 B full). Round: 2,061,676 B (PERF-023
  8 MB), 51,011,456 B decoded (PERF-024 256 MB).

## Checks

| Command | Load | Result |
| --- | --- | --- |
| python3 -m unittest discover -s tools/assets -p 'test_*.py' | 4.00 | 80 OK |
| python3 -m unittest discover -s tools/blender -p 'test_*.py' | 6.85 | 23 OK |
| VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets | 6.38 | 6 passed (2 files) |
| python3 tools/assets/pipeline.py --check-stale | 4.93 | exit 0, 17 jobs fresh |
