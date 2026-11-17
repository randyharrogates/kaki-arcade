# R-05 Rabakz scoreboard — integrator's browser look, round 3 (2026-11-17): scoreboards pass, podium fails at rest

Dev page, `at=3000`, after `rzReady`. 1920 × 1080: A, B, C × scoreboard 8, teams 8, ties 4,
scoreboard 2, podium 8, team podium 4, solo; 1280 × 720: scoreboard 8 and podium 8. Opened the
two sheets (r05b-a scoreboards, r05b-b podiums) and every image in them.

Scoreboards: A and C now fill the screen at reading size, nothing clipped, tabular figures,
`__rzOverflow()` reports 0. B's ranked list is still small type beside a large, mostly empty
leader panel.
Podium (all three layouts identical): with 8 players, places 4 to 8 are stacked in a narrow
column on top of the third step instead of below the podium; `__rzOverflow()` reports 8
(rz-results-body and rz-podium: text outside bounds, scroll overflow). Team podium shows the
teams with numbered discs "1" and "2" that read as seat numbers. Solo total: 3 reports
(rz-solo-total: text outside bounds, scroll overflow), not visible in the shot.
Not checked: motion, reduced motion, 4K.
