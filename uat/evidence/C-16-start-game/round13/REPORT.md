# C-16-start-game UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-16-start-game --phones 2 --max-mb 16`
Commit: `7da86e833445c722dde7660106d85784d4ee281c`
Viewports: 1920×1080, 1280×720, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 906.6 | completed |
| Seat two phones for rabakz | 483.4 | completed |
| Leader starts rabakz; TV and both shells follow | 129688.2 | completed |
| Create room through host page | 845.2 | completed |
| Seat two phones for tabao-rush | 337.4 | completed |
| Leader starts tabao-rush; TV and both shells follow | 9424.5 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-page-results-fit-ajay-1920.jpg](01-page-results-fit-ajay-1920.jpg) | | |
| ![02-page-results-fit-qiyu-1920.jpg](02-page-results-fit-qiyu-1920.jpg) | | |
| ![03-page-results-fit-jumpy-gigi-1920.jpg](03-page-results-fit-jumpy-gigi-1920.jpg) | | |
| ![04-page-results-fit-ahbeng-siewling-1920.jpg](04-page-results-fit-ahbeng-siewling-1920.jpg) | | |
| ![05-page-results-fit-noodle-1920.jpg](05-page-results-fit-noodle-1920.jpg) | | |
| ![06-page-results-fit-emoji-1920.jpg](06-page-results-fit-emoji-1920.jpg) | | |
| ![07-page-results-fit-long-winner-1920.jpg](07-page-results-fit-long-winner-1920.jpg) | | |
| ![08-page-results-fit-long-winner-keyboard-1920.jpg](08-page-results-fit-long-winner-keyboard-1920.jpg) | | |
| ![09-page-results-fit-single-word-winner-1920.jpg](09-page-results-fit-single-word-winner-1920.jpg) | | |
| ![10-page-results-fit-cuneiform-winner-keyboard-1920.jpg](10-page-results-fit-cuneiform-winner-keyboard-1920.jpg) | | |
| ![11-page-results-fit-team-result-1920.jpg](11-page-results-fit-team-result-1920.jpg) | | |
| ![12-page-results-fit-two-way-tie-keyboard-1920.jpg](12-page-results-fit-two-way-tie-keyboard-1920.jpg) | | |
| ![13-page-results-fit-wide-tie-1920.jpg](13-page-results-fit-wide-tie-1920.jpg) | | |
| ![14-page-results-fit-wide-tie-keyboard-1920.jpg](14-page-results-fit-wide-tie-keyboard-1920.jpg) | | |
| ![15-page-results-fit-team-tie-keyboard-1920.jpg](15-page-results-fit-team-tie-keyboard-1920.jpg) | | |
| ![16-page-results-fit-eight-player-teams-1920.jpg](16-page-results-fit-eight-player-teams-1920.jpg) | | |
| ![17-page-results-fit-tamil-tie-keyboard-1920.jpg](17-page-results-fit-tamil-tie-keyboard-1920.jpg) | | |
| ![18-page-results-fit-cuneiform-ligature-tie-1920.jpg](18-page-results-fit-cuneiform-ligature-tie-1920.jpg) | | |
| ![19-page-results-fit-ligature-cuneiform-tie-1920.jpg](19-page-results-fit-ligature-cuneiform-tie-1920.jpg) | | |
| ![20-page-results-fit-ligature-tamil-tie-1920.jpg](20-page-results-fit-ligature-tamil-tie-1920.jpg) | | |
| ![21-page-results-fit-ligature-winner-1920.jpg](21-page-results-fit-ligature-winner-1920.jpg) | | |
| ![22-page-results-fit-eight-wide-two-way-tie-1920.jpg](22-page-results-fit-eight-wide-two-way-tie-1920.jpg) | | |
| ![23-page-results-fit-eight-wide-team-tie-1920.jpg](23-page-results-fit-eight-wide-team-tie-1920.jpg) | | |
| ![24-page-results-fit-five-way-tie-keyboard-1920.jpg](24-page-results-fit-five-way-tie-keyboard-1920.jpg) | | |
| ![25-page-results-fit-eight-way-tie-keyboard-1920.jpg](25-page-results-fit-eight-way-tie-keyboard-1920.jpg) | | |
| ![26-page-results-fit-three-way-tie-1920.jpg](26-page-results-fit-three-way-tie-1920.jpg) | | |
| ![27-page-results-fit-ajay-1280.jpg](27-page-results-fit-ajay-1280.jpg) | | |
| ![28-page-results-fit-qiyu-1280.jpg](28-page-results-fit-qiyu-1280.jpg) | | |
| ![29-page-results-fit-jumpy-gigi-1280.jpg](29-page-results-fit-jumpy-gigi-1280.jpg) | | |
| ![30-page-results-fit-ahbeng-siewling-1280.jpg](30-page-results-fit-ahbeng-siewling-1280.jpg) | | |
| ![31-page-results-fit-noodle-1280.jpg](31-page-results-fit-noodle-1280.jpg) | | |
| ![32-page-results-fit-emoji-1280.jpg](32-page-results-fit-emoji-1280.jpg) | | |
| ![33-page-results-fit-long-winner-1280.jpg](33-page-results-fit-long-winner-1280.jpg) | | |
| ![34-page-results-fit-long-winner-keyboard-1280.jpg](34-page-results-fit-long-winner-keyboard-1280.jpg) | | |
| ![35-page-results-fit-single-word-winner-1280.jpg](35-page-results-fit-single-word-winner-1280.jpg) | | |
| ![36-page-results-fit-cuneiform-winner-keyboard-1280.jpg](36-page-results-fit-cuneiform-winner-keyboard-1280.jpg) | | |
| ![37-page-results-fit-team-result-1280.jpg](37-page-results-fit-team-result-1280.jpg) | | |
| ![38-page-results-fit-two-way-tie-keyboard-1280.jpg](38-page-results-fit-two-way-tie-keyboard-1280.jpg) | | |
| ![39-page-results-fit-wide-tie-1280.jpg](39-page-results-fit-wide-tie-1280.jpg) | | |
| ![40-page-results-fit-wide-tie-keyboard-1280.jpg](40-page-results-fit-wide-tie-keyboard-1280.jpg) | | |
| ![41-page-results-fit-team-tie-keyboard-1280.jpg](41-page-results-fit-team-tie-keyboard-1280.jpg) | | |
| ![42-page-results-fit-eight-player-teams-1280.jpg](42-page-results-fit-eight-player-teams-1280.jpg) | | |
| ![43-page-results-fit-tamil-tie-keyboard-1280.jpg](43-page-results-fit-tamil-tie-keyboard-1280.jpg) | | |
| ![44-page-results-fit-cuneiform-ligature-tie-1280.jpg](44-page-results-fit-cuneiform-ligature-tie-1280.jpg) | | |
| ![45-page-results-fit-ligature-winner-1280.jpg](45-page-results-fit-ligature-winner-1280.jpg) | | |
| ![46-page-results-fit-eight-wide-two-way-tie-1280.jpg](46-page-results-fit-eight-wide-two-way-tie-1280.jpg) | | |
| ![47-page-results-fit-eight-wide-team-tie-1280.jpg](47-page-results-fit-eight-wide-team-tie-1280.jpg) | | |
| ![48-page-results-fit-five-way-tie-keyboard-1280.jpg](48-page-results-fit-five-way-tie-keyboard-1280.jpg) | | |
| ![49-page-results-fit-eight-way-tie-keyboard-1280.jpg](49-page-results-fit-eight-way-tie-keyboard-1280.jpg) | | |
| ![50-page-results-fit-three-way-tie-1280.jpg](50-page-results-fit-three-way-tie-1280.jpg) | | |
| ![64-host-rabakz-before-start.jpg](64-host-rabakz-before-start.jpg) | | |
| ![75-phone1-rabakz-controller-1.jpg](75-phone1-rabakz-controller-1.jpg) | | |
| ![76-phone2-rabakz-controller-2.jpg](76-phone2-rabakz-controller-2.jpg) | | |
| ![77-host-rabakz-running.jpg](77-host-rabakz-running.jpg) | | |
| ![78-host-rabakz-game-final.jpg](78-host-rabakz-game-final.jpg) | | |
| ![89-host-rabakz-results-tv.jpg](89-host-rabakz-results-tv.jpg) | | |
| ![90-phone1-rabakz-results-leader.jpg](90-phone1-rabakz-results-leader.jpg) | | |
| ![91-phone2-rabakz-results-phone2.jpg](91-phone2-rabakz-results-phone2.jpg) | | |
| ![92-host-rabakz-returned-picker.jpg](92-host-rabakz-returned-picker.jpg) | | |
| ![93-phone1-rabakz-returned-picker-phone1.jpg](93-phone1-rabakz-returned-picker-phone1.jpg) | | |
| ![94-phone2-rabakz-returned-picker-phone2.jpg](94-phone2-rabakz-returned-picker-phone2.jpg) | | |
| ![95-phone1-rabakz-restarted-controller-1.jpg](95-phone1-rabakz-restarted-controller-1.jpg) | | |
| ![96-phone2-rabakz-restarted-controller-2.jpg](96-phone2-rabakz-restarted-controller-2.jpg) | | |
| ![110-host-tabao-rush-before-start.jpg](110-host-tabao-rush-before-start.jpg) | | |
| ![121-phone1-tabao-rush-controller-1.jpg](121-phone1-tabao-rush-controller-1.jpg) | | |
| ![122-phone2-tabao-rush-controller-2.jpg](122-phone2-tabao-rush-controller-2.jpg) | | |
| ![123-host-tabao-rush-running.jpg](123-host-tabao-rush-running.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![63-strip-rabakz-header-crossfade.jpg](63-strip-rabakz-header-crossfade.jpg) | | |
| ![74-strip-rabakz-start-crossfade.jpg](74-strip-rabakz-start-crossfade.jpg) | | |
| ![88-strip-rabakz-results-crossfade.jpg](88-strip-rabakz-results-crossfade.jpg) | | |
| ![109-strip-tabao-rush-header-crossfade.jpg](109-strip-tabao-rush-header-crossfade.jpg) | | |
| ![120-strip-tabao-rush-start-crossfade.jpg](120-strip-tabao-rush-start-crossfade.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)
Run: `pnpm uat -- C-16-start-game --phones 2 --max-mb 16`, exit 0 in 173 s, ports closed after.
An earlier run of round 13 crawled (one name case in about three minutes) because the new pixel
oracle sent two full-screen RGBA arrays to Node per candidate size; the integrator stopped it and
moved the comparison into the browser (it returns a count; the check itself is unchanged).
Every results-fit case now asserts the exact largest-fitting sentence and size at 1920 and 1280,
with clipped and unclipped renders identical. Opened c16r13.jpg (01, 02, 03, 21, 10 at 1920).
- 01 "Ajay Kumar wins!" is back at 144 with the name (round 12 had dropped it to "Player 1
  wins!"); 02 "Qi and Yu share first" is large on two lines.
- 21 ﷺ×12 single winner keeps the name at 89; 10 𒀱×12 falls back to "Player 1 wins!" at 144;
  the chip is clear in all.
- 03 "jumpy and gigi share first" is at 89 px on two lines at both 1920 and 1280, as the slice
  note expects (corrected after the final review: the integrator first misread it from the
  one-third-scale composite; at full size the lines are about 100 px apart).
| Shot | What it shows | Looked at by |
|---|---|---|
| 01, 02, 03, 10, 21 (1920) | names kept when they fit; fallback only when needed | Claude (integrator) |

## Clip check tolerance (after the final review)
The review asked for an exact clipped-versus-unclipped comparison. A probe of all 52 name renders
found 50 identical and 2 (long-winner and long-winner-keyboard at 1920) differing in 2 and 1
pixels by at most 4 levels, at (524-525, 134): the right edge of the brown chip, not headline ink.
Clipping the headline promotes it to its own compositing layer, which shifts the chip edge's
anti-aliasing. The check now allows 4 levels and nothing beyond (it was 24).
