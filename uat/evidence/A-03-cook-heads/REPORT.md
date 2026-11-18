# A-03 cook heads review evidence

## Round 6 render (integrator, 2026-11-18)

All seven new head jobs were re-rendered one at a time (3.9–6.9 s each, no failures);
`python3 tools/assets/pipeline.py --check-stale` exits 0. Review command:
`python3 tools/assets/cook_heads_review.py --out uat/evidence/A-03-cook-heads/review`.

What each image shows:
- `<head>-<light|dark>-<1|4>x.jpg` (32): one character on the shared idle body in all eight
  facings, apron and cap tinted seat-1 red, on light and dark counters, 1x and nearest 4x.
- `play-grey-<1..4>-<light|dark>-1x.png` (8): greyscale 1920×1080 boards at native 120 px/tile,
  all eight cooks, two facings per board (1: s, se; 2: e, ne; 3: n, nw; 4: w, sw); cap untinted.
- `play-grey-<1..4>-<light|dark>-3m.png` (8): the same after a 3:1 box reduction (a sampling
  proxy, not a calibrated distance test).
- `head-difference.json`: `untinted` contains 224 pair × facing greyscale scores (share of occupied-union pixels
  whose brightness differs by more than 24/255, aligned by anchor). All at least 0.20. `tinted_cap` adds 448 scores across all eight PLAYER_COLOURS,
  seven other heads and eight facings, with the same fail-closed gate.

Results (options board for the three D-142 choices: https://claude.ai/artifact/UBC7KrsbjrgXn5uRMRH4ty):
- Bun/specs 0.927–0.984 in every facing (round 4: 0.027–0.178). Lowest pairs: bun/songkok n
  0.230, auntie/bun sw 0.249, auntie/bun s 0.250, bun/songkok nw 0.255; the round-6 margin target
  of 0.25 is missed by bun/songkok n and auntie/bun sw, and the 0.20 gate passes. With the cap
  tinted in each seat colour the lowest is 0.241 (cap seat-3 yellow vs specs s; 448 scores).
- The bun knob breaks the head outline from s, se, sw (12–17 px above the dome) and slightly from
  e, w (2 px); from ne, n, nw it sits inside the dome as a shaded knob.
- Specs hair #997C63 reads mid-brown; turban kopi brown #6B4426 reads brown beside orange, red
  and blue caps; neither is a player or team colour.
- Masks: only cap's eight reach 255; all 56 new-head masks are empty (the bun ribbon is enclosed).
- Not fixed: makcik's opening keeps stepped corners (s/se/sw) and a bite with an eye dot
  (ne/nw); uncle's grey band ends in straight cuts (e/ne/w/se). Inherited board-1 cuts, recorded.
- SE chop and E extinguish with the larger bun: knife visible in raise frames 1–2 only, as cap.
- Budgets (production pack, at 06b7b96b before the merge of main; heads unchanged since): heads 202,586 B, 4,126,464 B decoded; Tabao Rush round
  2,219,376 B transfer (2,597,804 B with the 378,428 B manifest) of 8 MB, 54,234,208 B decoded of
  256 MB. PERF-023/024 passed: 8 atlases.

Tests: Blender-directory unittest 27 passed; assets unittest 86 passed (90 after the merge of main; `pnpm verify` passed); Vitest tools/assets
passed (2 files, 6 tests, 40.17 s; wrapper below its unchanged 60 s limit); check-stale exit 0.

## Round 7 validation (2026-11-18)

The review command regenerated only JSON and eight dark lineup images; all
224 untinted scores exactly match the committed round-6 scores. The 448 new
tinted-cap scores pass (minimum 0.241124, seat-3 yellow / specs / s).
Dark labels now use DESIGN §4.2 marble #EFEAE2 against ink #2B2118 (contrast
above 4.5:1, tested). All eight changed dark boards were opened; native labels
are clearer, while 3:1 sampling still blurs their small text.

| Check | Launch load | Result / wall time |
| --- | --- | --- |
| Assets unittest, initial | 7.90 | 86 passed / 96.49 s |
| Assets unittest, padding-crop recheck | 6.73 | 86 passed / 75.98 s |
| Assets unittest, final | 4.37 | 86 passed / 50.80 s |
| Blender-directory unittest | 7.56 | 27 passed / 1.71 s |
| Capped Vitest tools/assets | 7.27 | 2 files, 6 tests passed / 40.49 s |
| Check-stale | 6.31 | Exit 0, 24 fresh jobs / 0.36 s |
| Review command + production pack | 6.31 | Exit 0, PERF-023/024 passed / 125.60 s |

The first two assets runs encountered rising machine load (above 12 and 16.13).
The final assets run took 50.66 s (50.80 s wall), below 60 s; main's approximately
30 s timing was not reproduced here. Vitest passes within the unchanged 60 s wrapper timeout. Full outputs are in
`round-7-*.txt`. No render input was changed; renderer comment corrections and
integrator handoffs are recorded in the slice note. No Blender or commit run.
