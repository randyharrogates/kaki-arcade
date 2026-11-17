# C-16b round 1: integrator's look (2026-11-18)

2-phone browser run, exit 0 (third run). Opened 01, 02, 03 and c16b-r1.jpg (01 beside 04):
- 01/02/03: both phones take the Rabakz R1 Bandung theme while a question shows; Rabakz's private
  panel (Score, Streak, Points gained, "Watch the screen") draws beside the four shaped answers;
  the leader's Skip reads dark on white.
- 04: on Results the phone is back on the console theme with no game panel.
Integrator fixes during UAT: kit buttons on a panel used the page ink (`--ka-ink`, pale in dark
game themes) instead of `--ka-panel-ink`, so Skip was nearly invisible in the first run (fixed in
layout.css and buttons.css); the script waited for the scoreboard's Continue instead of the final
screen; the script read `main` ambiguously (the hidden unsupported-browser page is also a main).
