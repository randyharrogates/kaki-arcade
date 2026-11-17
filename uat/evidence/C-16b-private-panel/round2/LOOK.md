# C-16b round 2: integrator's look (2026-11-18)

2-phone browser run, exit 0. Opened every shot (c16b-r2-sheet.jpg):
- 01/02 Rabakz question: R1 theme on the page and controller; Skip dark on white; private panel readable.
- 03 is the same state as 01 (Rabakz's private view does not change before the reveal); 05 covers the
  paused state: theme and panel kept.
- 04 Results: console theme, no game panel.
- 06 Peek Poker hand (K-05 demo cards in the peek-poker theme): card numbers dark on light, readable.
- 07 Tabao Rush in play: tabao-rush tokens (red ink, red dashed edges) per D-161.
- 08 team setup: console.
The pause states are driven through a UAT-only seam (the shell has no pause control until C-12 merges);
switch to the Esc key after C-12 lands.
