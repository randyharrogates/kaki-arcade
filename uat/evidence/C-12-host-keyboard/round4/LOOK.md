# C-12 round 4: integrator's look (2026-11-18, D-156)

8-phone browser run, exit 0. Opened c12-r4-sheet.jpg (06, 08, 09, 10) and 07-host-team-setup-8.jpg:
- 06: Escape during play opens the centred "Paused" panel, Resume focused (ring visible), Quit to
  picker below; no bar anywhere; nothing in the 55 px margin.
- 07: team setup with 8 players, keyboard focus on Phone One, hint line "Arrows and Enter: choose ·
  Esc: back" bottom-left inside the margin, Start bottom-right, no overlap.
- 09: every phone closed, then Enter on the TV's final screen reached Results (no leader needed).
- 08: on results, focus on "Play again"; the D-130 hints plus "Enter: play again · Esc: game picker".
- 10: "Player 1 starts with the keyboard" settled after the crossfade, Back and Start, focus on Start.
Integrator fixes during UAT: arrow keys ignore a closing pause panel (it stayed in the page while
fading and trapped focus); the test waited for the scoreboard's Continue instead of the final screen.
