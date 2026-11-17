# R-05 Rabakz scoreboard — integrator's browser look, round 4 (2026-11-17): A and C pass; B wraps names mid-word

Dev page, `at=3000`, after `rzReady`. 1920 × 1080: A, B, C × scoreboard 8, teams 8, ties 4,
podium 8, 4 and 2, team podium 4, solo; 1280 × 720 and 3840 × 2160: scoreboard 8, podium 8,
solo. Opened sheets r05c-a, r05c-b and r05c-c and every image in them.

Scoreboard A: one row per player, names 55 px at 1080p, nothing clipped, overflow 0 at every
size. C: two columns, overflow 0. B: names in the leader panel and in team rows break in the
middle of the word ("WWWWWWWWWWWW / WW"); rows show total and change on two small lines;
at 4K the detector reports rz-total text outside bounds.
Podium: places 4 to 8 now sit in a list below the podium (names 34 px at 1080p, the reading
floor); nothing sits on top of a step but its own name and total. With 4 players the single
extra row stretches to fill the lower region. The top third above the podium is empty.
Team podium: colour squares and team names, no numerals. Solo total: fits visibly; the
detector still reports a 2 px glyph overrun (scroll 189 against a 187 px box) at every size,
and at 4K one rz-step-place on the 8-player podium.
Not checked: motion, reduced motion.
