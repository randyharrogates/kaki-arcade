# R-05 round 12 evidence (after fix round 25) — integrator

Dev server `vite --port 5670` in the R-05 worktree (stopped afterwards); Playwright Chromium,
reduced motion.

## Header Q tail (the round-24 final review's must-fix)
- Masked versus unmasked header (masks forced to `overflow: visible`), pixel diff, threshold 24:
  0 changed pixels in jack-u, open, longest-text, reveal-one-winner, picture-question and
  next-question at 1920, 1280 and 3840 (18 cases).
- Negative control: with the new header padding removed, the same diff finds 39 changed pixels
  at 1920 (jack-u, open), matching the review's measurement, so the comparison catches the clip.
  In that broken state the page's checker reports `rz-header: text outside bounds` (ink bottom
  117.5 against mask bottom 115). (An earlier probe of mine read the checker after the masks had
  been opened, and so saw 0; that read was wrong, not the checker.)
- r25-qtail.png: the 1920 header Q at 8×. The tail now curves down to a point; no flat cut.
## Matrix
matrix.txt: 480 states, 0 overflow, 0 fit failures, 9 tight (eight-player team podiums at all
widths), 6 ellipsis states. Same as round 11.
| Image | What it shows | Looked at by |
|---|---|---|
| r25-qtail.png | whole Q tail at 8× | Claude (integrator) |
