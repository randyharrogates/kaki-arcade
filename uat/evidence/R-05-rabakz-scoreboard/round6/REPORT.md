# R-05 round 6 evidence (integrator's run, 2026-11-17, branch HEAD after fix round 13)

Run by the integrator in headless Chromium against the Rabakz dev page on the issue's dev
server; scripts `shoot.mjs` (36 shots: 18 states at 1920 × 1080 and 1280 × 720) and
`matrix.mjs` (drives `games/rabakz/dev/overflow.html`: every state in SCENARIOS × 1, 2, 4,
8 players × 1280 × 720, 1920 × 1080, 3840 × 2160).

Result: 420 checks, 0 overflow findings; 6 truncated (fourteen-W names ellipsised on the
podium, as designed). Rounds 9 to 12 had 16, 80, 66 and 66 failing checks; their causes are
in the slice note (podium name line box, ellipsis on the wrong element, detector tolerance at
scale, podium geometry from the old line box).

## Integrator's look
Opened r05r13.jpg (podium 8, podium 2, tie for first 8, team podium 8, partial ties at 720p,
team scoreboard 8) and 1920-podium-8.jpg at full size.
- Header "Final results" and "Leader can continue" sit where the scoreboard's do.
- Steps 2nd, 1st, 3rd at about 89, 144 and 55 px, white panels with the placing; names (55 px,
  ellipsised when long) and points (34 px) above each step with no overlap; tied third shares
  its step ("=3") and the rest follow in the list with the same placing.
- Team final: team podium, then every player grouped by team with team placings.
- Scoreboards unchanged from D-114.
Not checked: TV frame timing (perf run before close); real TV.
