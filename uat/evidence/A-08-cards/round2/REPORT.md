# A-08 Peek Poker cards: round 2 evidence (after fix rounds 4 and 5)

Rendered by the integrator through the asset pipeline (`python3 tools/assets/pipeline.py --render`,
the `pnpm assets --render` job): 58 frames, every self-check passed, 29 s; a second run straight
after rendered nothing (4 s, up to date). Pack: one atlas 1926 × 1100, 948,708 B, 8,474,400 B
decoded (PERF-023/024 passed). Check-only output: check-only.txt.

Measured colours: back (181,55,31) = #B5371F; stripe (193,87,67) = #C15743, "\" direction as the
token CSS; paper (253,253,251) top to (243,238,228) bottom-right, darkest corner bottom-right as the
170-degree token; inks spade (34,32,27), heart (217,72,59), diamond (47,127,214), club (46,154,91).
Colours are read from packages/ui/src/themes.ts at render time.

Integrator fixes at render (Blender, which Codex cannot run): the round-5 gradient direction change
left the blend at −0.15..0.85, so the ramp clamped and the paper came out 2-4 levels dark; it is now
0.15·(1−x) + 0.85·y (0..1). The back stripe share floor was 0.20 but the correct render measures
0.174 (the border and anti-aliased edges fall outside the ±3 window); it is now 0.12 (no stripes
measures 0), and the check reports its figures.

Randy's view of the final deck and court badges: https://claude.ai/artifact/NTj5G1mnDyevGiVNeF9RRX
(D-133, pending).

| Image | What it shows | Looked at by |
|---|---|---|
| atlas-baize.png | all 52 faces, back and five flip frames on the K1 baize | Claude (integrator) |
| atlas-grey.png | the same in greyscale: hearts, diamonds, clubs share a grey, told apart by shape | Claude (integrator) |
| flip-strip.png | back and the flip at 0/45/90/135/180° | Claude (integrator) |
| table-1080p-crop.png | J, Q, K, 7 and the back at 1:1 on a 1080p table | Claude (integrator) |
| back-4x.png | the back at 4×: flat paint, no shadow line | Claude (integrator) |
