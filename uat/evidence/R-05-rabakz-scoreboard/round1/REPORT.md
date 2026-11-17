# R-05 Rabakz scoreboard — integrator's browser look, round 1 (2026-11-17): fails at rest

Dev page at 1920 × 1080, `at=3000`, after `rzReady`. Layouts A, B, C × scoreboard 8, teams 8,
ties 4, scoreboard 2, podium 8, podium 1 (18 PNG converted to JPG, plus sheets r05-a, r05-b).
Opened: both sheets, every image in them.

1. Unreadable from 3 m: rows are about 22 px tall at 1080p and every layout uses only the top
   third of the screen; the rest is empty.
2. B and C clip each row's second line ("100 pts +100") at the row's bottom edge.
3. Points are set in a monospace fallback face, not a token face.
4. The podium is three equal-width cards with small placings; it does not read as a podium.
5. `window.__rzOverflow()` reported 0 for every shot, including the clipped ones: it does not
   cover the new elements.
Not checked: motion, reduced motion, 720p and 4K.
