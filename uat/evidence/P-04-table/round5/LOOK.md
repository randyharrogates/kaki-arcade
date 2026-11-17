# P-04 round 5: integrator's look (2026-11-18)

- perf-8-r5 (8 phones, 5 cycles): median 16.7 ms, p95 18.2, p99 18.6, max 18.7 ms over 3,250
  frames; no frame over 33 ms. The round-4 run had one 350 ms frame at the first lock-in (first-use
  cost); round 5 readies fonts, sprites, row layers and the pulse before `ppReady`, and it is gone.
  Load at start 5.3 (two Codex jobs thinking).
- 54-hands-wipe.jpg: the hands list mid-wipe at about 280 ms, the mask edge cutting through the
  fourth row; ranks, names, hands and points read clearly above it.
- Browser run exit 0 (--max-mb 16).
