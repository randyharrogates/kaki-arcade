# A-05 rendered evidence — round 8

TR-030, TR-031, TR-010. Round 8 supplied unlit palette progress fills, track
and empty-cell marks, corrected board polarities and smoke ids. The integrator
rendered round 8, packed and regenerated the sheets (613d7708); review 9 checked them.

Only reachable states are drawn. Painter order: body, food, fire, effect,
progress, cue. The authoritative placement convention is in
`docs/ART-PIPELINE.md` → Station frames.

Round-7 measurements (review 8; historical baseline, not round-8 acceptance):
- Station page 374×780: 206,564 B transfer / 1,166,880 B decoded.
- Half page 187×390: 56,454 B / 291,720 B decoded.
- A-05 tree Tabao Rush: 2,268,240 / 8,000,000 B (PERF-023),
  52,178,336 / 256,000,000 B (PERF-024); half 968,356 / 13,044,584 B.
  These cap-only-head totals are not merged-tree totals.
- Steam-3 visible pixels differing by ≥8 levels on both grounds:
  wok / pot / grill / rice = 114 / 170 / 150 / 179; floors 110 / 165 / 145 / 175.
  Steam is mostly hidden behind the bar and plaque and reads weakly on pale wok.
- Gold fill centre (59,58): (221,184,126), the lit tone superseded by round 8.
- Smoke tops 63 / 59 / 54 / 49, 14 px rise; frame 0/3 masks differ by 495 px.
  GIF frames versus smoke-2 still: 426 / 331 / 20 / 350 px light,
  430 / 334 / 21 / 357 px dark. Reduced motion uses smoke-2.
- Plaque is 42 px on the TV; cells 8 px, pitch 10.5 px, empty mark 4 px.

Round-8 pack record (measured by the integrator, checked by review 9):
- Station full: 374×780, 206,300 B transfer / 1,166,880 B decoded.
- Station half: 187×390, 56,578 B transfer / 291,720 B decoded.
- Tabao Rush round (merged tree): full 2,426,954 / 8,000,000 B (PERF-023) and 55,408,032 / 256,000,000 B decoded (PERF-024); half 1,046,240 B / 13,852,008 B. Manifest 391,445 B.
- Gold: progress cells (223–225, 166–167, 58) on the source, the packed atlas and the light and dark TV frames, within ±6 of #E0A63A. Ink track (44,34,24–25), within ±8 of #2B2118.
- Greyscale: on tv-3m-working-light-greyscale filled cells read about 171, empty cells 226–252 with an ink mark of about 37; 0/8 to 8/8 stay distinct without colour. Checked on screen at native size; the 3 m TV check is owed.
- Steam-3 visible (test method, bar and plaque excluded): 114 / 170 / 150 / 179 of 187 on wok / pot / grill / rice, above the floors.

Smoke frame 3→0 resets down 14 px; fade masks the jump, retained as a T-07 caveat.
Visual acceptance and merged verification belong to the integrator.
