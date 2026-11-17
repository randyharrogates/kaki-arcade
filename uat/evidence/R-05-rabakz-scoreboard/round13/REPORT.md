# R-05 round 13 evidence (after fix round 26) — integrator

Dev server `vite --port 5670` in the R-05 worktree (stopped after); Playwright Chromium, reduced
motion. Round 26 applied the final review's suggested header fix (no top padding, 13 px bottom
padding, 8 px margin).
- Measured at 1920 (jack-u): header and mask box y 55-123, prompt box from y 131. The header line
  is back at the safe margin and the visible space below it to the prompt is 21 px (13 + 8).
- Masked versus `overflow: visible` header diff (threshold 24): 0 changed pixels in all 18 cases
  (jack-u, open, longest-text, reveal-one-winner, picture-question, next-question at 1920, 1280
  and 3840).
- matrix.txt: 480 states, 0 overflow, 0 fit failures, 9 tight, 6 ellipsis.
- r26-hdr.png (1920 header at 4×): "Question 1" whole; the Q tail curves to its point.
| Image | What it shows | Looked at by |
|---|---|---|
| r26-hdr.png | header whole, back at the margin | Claude (integrator) |
| hdr-1280.png, hdr-1920.png, hdr-3840.png | header crops at three widths | Claude (integrator) |

## Performance (D-100)
`pnpm perf -- rabakz-screen --headless` on a quiet machine (CPU about 38 % busy, memory 54 %
free, pressure 1; the dev page needs the development build). Five cycles of the eight screens
with eight seats: 1613 frames, median 16.7 ms, p95 16.8, p99 16.8, one 33.3 ms frame. PERF-001,
010, 012 and 030 are "not assessed" by design for this host-only dev page. No failure.
Summary copied to perf-rabakz-screen.md (the run folder itself is git-ignored).
