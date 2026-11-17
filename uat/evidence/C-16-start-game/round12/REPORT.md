# C-16-start-game UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-16-start-game --phones 2 --max-mb 16`
Commit: `8099c22f03d3cfb4249155e7001aa415c08d9bcb`
Viewports: 1920×1080, 1280×720, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 880.9 | completed |
| Seat two phones for rabakz | 461.9 | completed |
| Leader starts rabakz; TV and both shells follow | 129443.4 | completed |
| Create room through host page | 904.4 | completed |
| Seat two phones for tabao-rush | 380.8 | completed |
| Leader starts tabao-rush; TV and both shells follow | 9703.9 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-page-results-fit-long-winner-1920.jpg](01-page-results-fit-long-winner-1920.jpg) | | |
| ![02-page-results-fit-long-winner-keyboard-1920.jpg](02-page-results-fit-long-winner-keyboard-1920.jpg) | | |
| ![03-page-results-fit-single-word-winner-1920.jpg](03-page-results-fit-single-word-winner-1920.jpg) | | |
| ![04-page-results-fit-cuneiform-winner-keyboard-1920.jpg](04-page-results-fit-cuneiform-winner-keyboard-1920.jpg) | | |
| ![05-page-results-fit-team-result-1920.jpg](05-page-results-fit-team-result-1920.jpg) | | |
| ![06-page-results-fit-two-way-tie-keyboard-1920.jpg](06-page-results-fit-two-way-tie-keyboard-1920.jpg) | | |
| ![07-page-results-fit-wide-tie-1920.jpg](07-page-results-fit-wide-tie-1920.jpg) | | |
| ![08-page-results-fit-wide-tie-keyboard-1920.jpg](08-page-results-fit-wide-tie-keyboard-1920.jpg) | | |
| ![09-page-results-fit-team-tie-keyboard-1920.jpg](09-page-results-fit-team-tie-keyboard-1920.jpg) | | |
| ![10-page-results-fit-eight-player-teams-1920.jpg](10-page-results-fit-eight-player-teams-1920.jpg) | | |
| ![11-page-results-fit-tamil-tie-keyboard-1920.jpg](11-page-results-fit-tamil-tie-keyboard-1920.jpg) | | |
| ![12-page-results-fit-cuneiform-ligature-tie-1920.jpg](12-page-results-fit-cuneiform-ligature-tie-1920.jpg) | | |
| ![13-page-results-fit-ligature-cuneiform-tie-1920.jpg](13-page-results-fit-ligature-cuneiform-tie-1920.jpg) | | |
| ![14-page-results-fit-ligature-tamil-tie-1920.jpg](14-page-results-fit-ligature-tamil-tie-1920.jpg) | | |
| ![15-page-results-fit-ligature-winner-1920.jpg](15-page-results-fit-ligature-winner-1920.jpg) | | |
| ![16-page-results-fit-eight-wide-two-way-tie-1920.jpg](16-page-results-fit-eight-wide-two-way-tie-1920.jpg) | | |
| ![17-page-results-fit-eight-wide-team-tie-1920.jpg](17-page-results-fit-eight-wide-team-tie-1920.jpg) | | |
| ![18-page-results-fit-five-way-tie-keyboard-1920.jpg](18-page-results-fit-five-way-tie-keyboard-1920.jpg) | | |
| ![19-page-results-fit-eight-way-tie-keyboard-1920.jpg](19-page-results-fit-eight-way-tie-keyboard-1920.jpg) | | |
| ![20-page-results-fit-three-way-tie-1920.jpg](20-page-results-fit-three-way-tie-1920.jpg) | | |
| ![21-page-results-fit-long-winner-1280.jpg](21-page-results-fit-long-winner-1280.jpg) | | |
| ![22-page-results-fit-long-winner-keyboard-1280.jpg](22-page-results-fit-long-winner-keyboard-1280.jpg) | | |
| ![23-page-results-fit-single-word-winner-1280.jpg](23-page-results-fit-single-word-winner-1280.jpg) | | |
| ![24-page-results-fit-cuneiform-winner-keyboard-1280.jpg](24-page-results-fit-cuneiform-winner-keyboard-1280.jpg) | | |
| ![25-page-results-fit-team-result-1280.jpg](25-page-results-fit-team-result-1280.jpg) | | |
| ![26-page-results-fit-two-way-tie-keyboard-1280.jpg](26-page-results-fit-two-way-tie-keyboard-1280.jpg) | | |
| ![27-page-results-fit-wide-tie-1280.jpg](27-page-results-fit-wide-tie-1280.jpg) | | |
| ![28-page-results-fit-wide-tie-keyboard-1280.jpg](28-page-results-fit-wide-tie-keyboard-1280.jpg) | | |
| ![29-page-results-fit-team-tie-keyboard-1280.jpg](29-page-results-fit-team-tie-keyboard-1280.jpg) | | |
| ![30-page-results-fit-eight-player-teams-1280.jpg](30-page-results-fit-eight-player-teams-1280.jpg) | | |
| ![31-page-results-fit-tamil-tie-keyboard-1280.jpg](31-page-results-fit-tamil-tie-keyboard-1280.jpg) | | |
| ![32-page-results-fit-cuneiform-ligature-tie-1280.jpg](32-page-results-fit-cuneiform-ligature-tie-1280.jpg) | | |
| ![33-page-results-fit-ligature-winner-1280.jpg](33-page-results-fit-ligature-winner-1280.jpg) | | |
| ![34-page-results-fit-eight-wide-two-way-tie-1280.jpg](34-page-results-fit-eight-wide-two-way-tie-1280.jpg) | | |
| ![35-page-results-fit-eight-wide-team-tie-1280.jpg](35-page-results-fit-eight-wide-team-tie-1280.jpg) | | |
| ![36-page-results-fit-five-way-tie-keyboard-1280.jpg](36-page-results-fit-five-way-tie-keyboard-1280.jpg) | | |
| ![37-page-results-fit-eight-way-tie-keyboard-1280.jpg](37-page-results-fit-eight-way-tie-keyboard-1280.jpg) | | |
| ![38-page-results-fit-three-way-tie-1280.jpg](38-page-results-fit-three-way-tie-1280.jpg) | | |
| ![52-host-rabakz-before-start.jpg](52-host-rabakz-before-start.jpg) | | |
| ![63-phone1-rabakz-controller-1.jpg](63-phone1-rabakz-controller-1.jpg) | | |
| ![64-phone2-rabakz-controller-2.jpg](64-phone2-rabakz-controller-2.jpg) | | |
| ![65-host-rabakz-running.jpg](65-host-rabakz-running.jpg) | | |
| ![66-host-rabakz-game-final.jpg](66-host-rabakz-game-final.jpg) | | |
| ![77-host-rabakz-results-tv.jpg](77-host-rabakz-results-tv.jpg) | | |
| ![78-phone1-rabakz-results-leader.jpg](78-phone1-rabakz-results-leader.jpg) | | |
| ![79-phone2-rabakz-results-phone2.jpg](79-phone2-rabakz-results-phone2.jpg) | | |
| ![80-host-rabakz-returned-picker.jpg](80-host-rabakz-returned-picker.jpg) | | |
| ![81-phone1-rabakz-returned-picker-phone1.jpg](81-phone1-rabakz-returned-picker-phone1.jpg) | | |
| ![82-phone2-rabakz-returned-picker-phone2.jpg](82-phone2-rabakz-returned-picker-phone2.jpg) | | |
| ![83-phone1-rabakz-restarted-controller-1.jpg](83-phone1-rabakz-restarted-controller-1.jpg) | | |
| ![84-phone2-rabakz-restarted-controller-2.jpg](84-phone2-rabakz-restarted-controller-2.jpg) | | |
| ![98-host-tabao-rush-before-start.jpg](98-host-tabao-rush-before-start.jpg) | | |
| ![109-phone1-tabao-rush-controller-1.jpg](109-phone1-tabao-rush-controller-1.jpg) | | |
| ![110-phone2-tabao-rush-controller-2.jpg](110-phone2-tabao-rush-controller-2.jpg) | | |
| ![111-host-tabao-rush-running.jpg](111-host-tabao-rush-running.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![51-strip-rabakz-header-crossfade.jpg](51-strip-rabakz-header-crossfade.jpg) | | |
| ![62-strip-rabakz-start-crossfade.jpg](62-strip-rabakz-start-crossfade.jpg) | | |
| ![76-strip-rabakz-results-crossfade.jpg](76-strip-rabakz-results-crossfade.jpg) | | |
| ![97-strip-tabao-rush-header-crossfade.jpg](97-strip-tabao-rush-header-crossfade.jpg) | | |
| ![108-strip-tabao-rush-start-crossfade.jpg](108-strip-tabao-rush-start-crossfade.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)
Run: `pnpm uat -- C-16-start-game --phones 2 --max-mb 16`, exit 0; ports 5240-5242 closed after.
The real ten-question Rabakz match on the test clock took about two minutes with no new shots;
it then completed. Opened c16r12.jpg (01, 04, 12, 15, 19, 24 — the same six as round 11).
- The round-11 size regression is gone: "2 players share first" (12) and "8 players share first"
  (19) are two large lines again (as round 10); "Player 1 wins!" for 𒀱×12 (04, 24) is large;
  "Cloud Noodle wins!" (01) is three large lines.
- Chip clear in every shot; the chip pixel check (whole pixels inside the chip, >24 levels)
  passes for every results-fit case, and the new size assertions pass.
- 15 a single ﷺ×12 winner keeps its name at a smaller step, inside the column.
| Shot | What it shows | Looked at by |
|---|---|---|
| 01, 04, 12, 15, 19, 24 | D-131 sizes restored; ink clear of chip | Claude (integrator) |
