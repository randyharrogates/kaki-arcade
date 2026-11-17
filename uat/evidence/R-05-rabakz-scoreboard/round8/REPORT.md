# R-05 Rabakz scoreboard: round 8 evidence (after fix round 21)

Taken by the integrator in Chromium against the R-05 dev server, 2026-11-17.

## Matrix (games/rabakz/dev/overflow.html, now reading `data-fit`)
480 states (every scenario × 1/2/4/8 players × 1280, 1920, 3840): 0 overflow, **0 fit failures**,
9 tight. The tight cases are by design: `podium-teams`, `podium-teams-tie` and `podium-teams-late`
at 8 players, at all three widths (worst 893.8 of 894 px). 6 states ellipsise names: `podium` at 4
and 8 players with twelve-W names, which the slice's ellipsis rule allows. `matrix-all.json` is the
list of failures (empty).

## Stills
52 states at 1920 × 1080 and 1280 × 720 (`<width>-<state>-<players>.jpg`): 0 overflow, all with
overhang notes only (glyphs into frame padding), 4 with name ellipsis. New this round:
`podium-teams-late-8`, `scoreboard-teams-late-8`, `jack-u-4`.

## Integrator's look
Opened r05r21-a.jpg (contact sheet), then r05-jacku-crop.png and r05-late8-bottom.png at full size.
- podium-teams-late-8 (1920 and 1280): tied teams 500/500 on the shared "=1" step; seat 8 shows
  "–" and an inline "No team" with no extra group label; the last row ends near y 1000 of 1080,
  inside the safe margin. The overall leader (seat 2, 300) has the white panel.
- scoreboard-teams-8 and scoreboard-teams-late-8: the "+100" and "+300"/"+200" gained chips are
  back on team rows; a zero shows a quiet "+0".
- scoreboard-teams-late-5: the unteamed row has its chip too.
- jack-u-4: "Jack Ü" and "Where Are Ü Now" at display line height 1; the Ü dots are whole and
  nothing is cut (crop).
| Shot | What it shows | Looked at by |
|---|---|---|
| podium-teams-late-8 (1920, 1280) | 8-player team final with a late joiner fits | Claude (integrator) |
| scoreboard-teams-8, -late-8, -late-5 | Gained chips on team rows | Claude (integrator) |
| jack-u-4 | Accented capitals at line height 1 | Claude (integrator) |
Not yet run: `pnpm perf -- rabakz-screen` (D-100), waiting for a quiet machine.

## Correction (integrator, 2026-11-17)
"Nothing is cut" above is wrong. The final review found, and the integrator confirmed in
r05-desc.png (the prompt's second line enlarged 2×), that the last prompt line's descenders are
clipped: the "p" in "Diplo", the bottom of the "g" in "song" and the ")" are cut flat. The prompt
box reserves headroom above the first line but nothing below the last, and the overflow matrix
does not check the prompt. The same cut is in 1280-jack-u-4 and in non-picture-question-4. The
integrator missed it when looking at r05-jacku-crop.png. Also: the last row of
podium-teams-late-8 ends at y 1024 against the 1025 limit (flush), not "near 1000".
