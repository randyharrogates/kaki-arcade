# R-05 evidence, round 7 (integrator's run after fix round 20)

Run by the integrator in Chromium against `games/rabakz/dev/` on the R-05 worktree (dev server
on port 5670, closed afterwards):
- Overflow matrix (`games/rabakz/dev/overflow.html`): 468 checks (every state × 1, 2, 4, 8
  players × 1280, 1920, 3840): **0 overflow**; 6 states with intended name truncation
  (twelve-W names, the nickname limit); `matrix-all.json` lists failures (empty).
- Screenshots: 46 states at 1280 and 1920 (this folder): 0 overflow; every state carries
  "overhang" notes (display type at line height 1 spilling its reserved ascent into empty
  space or into the Copy crossfade wrapper, which clips no ink; checked by enlarged crops of
  the question header before and after round 19, which was reverted); 4 with truncation.

## Integrator's look (2026-11-17)
Opened r05r20-a.jpg (tied team final 1920 and 1280, solo final, Unicode podium and scoreboard,
late-joiner team scoreboard, question screen, 8-player scoreboard).
- Tied team final fits at 1080p and 720p: both teams share the top step; groups labelled
  "Red team" and "Blue team"; the white leader panel only on the overall leader's row (D-114).
- Late joiner sits under "No team" with "–", no panel.
- Chinese and emoji names (陈美玲, 🦊Fox) render cleanly in rows and on the podium.
- Question header has its gap; the question text no longer meets the header.
- Solo final shows the one player centred with their total.
Note: the tied team final is tight by design (its step compresses to a slim bar to keep 8 rows
at the reading floor).
Not checked here: frame strips for motion (earlier rounds), perf run (next), real TV.

## Correction (integrator, 2026-11-17)
The "0 overflow" above is incomplete. The integrator's matrix script counted only overflow
findings and did not read the layout's own `data-fit` verdict, which `games/rabakz/dev/
overflow.html` counts as a failure when it is not "fits". The final review found
`podium-teams-late` at 8 players reports `data-fit="failed"` (body 930 px against 894 px), and
`podium-teams` and `podium-teams-tie` at 8 report "tight". No still of the failing state was
taken. The matrix script is being changed to record `data-fit` per case.
