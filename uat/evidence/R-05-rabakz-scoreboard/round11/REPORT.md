# R-05 Rabakz scoreboard: round 11 evidence (after fix round 24)

Integrator, 2026-11-17, Chromium against the R-05 dev server.
Matrix (games/rabakz/dev/overflow.html, reading data-fit; findings now carry the boxes compared):
480 states (every scenario × 1/2/4/8 players × 1280, 1920, 3840): **0 overflow, 0 fit failures**,
9 tight (podium-teams, -tie and -late at 8 players, all three widths, by design; the late-joiner
final ends flush at 1024 of 1025), 6 with name ellipsis (podium with twelve-W names, by design).
`matrix-all.json` lists failures (empty). Stills: 52 states, 0 overflow, 4 with ellipsis.
## Integrator's look
Opened r05r24-jacku.png (1920 Jack Ü header and prompt, full size) and r05r24-a.jpg.
- Header "Question 1 of 10": whole, Q tail intact. Prompt: "Jack Ü" and "Where Are Ü Now" with
  whole Ü dots, and the second line's "p", "g" and ")" keep their descenders.
- podium-teams-late-8: tied teams 500/500, seat 8 "No team" set slightly apart, fits.
- scoreboard-teams-late-8: gained chips on team rows; zeros quiet.
- scoreboard-8 and podium-8: unchanged from round 8.
| Shot | What it shows | Looked at by |
|---|---|---|
| jack-u-4 (crop) | Header and prompt whole at line height 1 | Claude (integrator) |
| podium-teams-late-8, scoreboard-teams-late-8, scoreboard-8, podium-8 | Results states | Claude (integrator) |
Not yet run: `pnpm perf -- rabakz-screen` (D-100).

## Correction (integrator, 2026-11-17)
"Q tail intact" above is wrong. The round 24 final review compared the header with and without
its mask and found the Q tail cut by about 3 px in every question and reveal state at all widths;
the integrator confirmed it in r05-qtail.png (the 1920 header Q enlarged 8×): the tail ends in a
flat horizontal edge. Round 24's header allowance in the overflow checker accepted that cut.
Round 25 gives the header room under its line inside its own box and drops the allowance.
