# C-16-start-game UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-16-start-game --phones 2 --max-mb 16`
Commit: `036551b9ccfadacac7b209548b8246f8601c356f`
Viewports: 1920×1080, 1280×720, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 897.8 | completed |
| Seat two phones for rabakz | 457.1 | completed |
| Leader starts rabakz; TV and both shells follow | 128481.9 | completed |
| Create room through host page | 854.9 | completed |
| Seat two phones for tabao-rush | 337.9 | completed |
| Leader starts tabao-rush; TV and both shells follow | 9490.4 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-page-results-fit-long-winner-1920.jpg](01-page-results-fit-long-winner-1920.jpg) | | |
| ![02-page-results-fit-long-winner-keyboard-1920.jpg](02-page-results-fit-long-winner-keyboard-1920.jpg) | | |
| ![03-page-results-fit-single-word-winner-1920.jpg](03-page-results-fit-single-word-winner-1920.jpg) | | |
| ![04-page-results-fit-team-result-1920.jpg](04-page-results-fit-team-result-1920.jpg) | | |
| ![05-page-results-fit-two-way-tie-keyboard-1920.jpg](05-page-results-fit-two-way-tie-keyboard-1920.jpg) | | |
| ![06-page-results-fit-wide-tie-1920.jpg](06-page-results-fit-wide-tie-1920.jpg) | | |
| ![07-page-results-fit-wide-tie-keyboard-1920.jpg](07-page-results-fit-wide-tie-keyboard-1920.jpg) | | |
| ![08-page-results-fit-team-tie-keyboard-1920.jpg](08-page-results-fit-team-tie-keyboard-1920.jpg) | | |
| ![09-page-results-fit-eight-player-teams-1920.jpg](09-page-results-fit-eight-player-teams-1920.jpg) | | |
| ![10-page-results-fit-tamil-tie-keyboard-1920.jpg](10-page-results-fit-tamil-tie-keyboard-1920.jpg) | | |
| ![11-page-results-fit-cuneiform-ligature-tie-1920.jpg](11-page-results-fit-cuneiform-ligature-tie-1920.jpg) | | |
| ![12-page-results-fit-eight-wide-two-way-tie-1920.jpg](12-page-results-fit-eight-wide-two-way-tie-1920.jpg) | | |
| ![13-page-results-fit-eight-wide-team-tie-1920.jpg](13-page-results-fit-eight-wide-team-tie-1920.jpg) | | |
| ![14-page-results-fit-five-way-tie-keyboard-1920.jpg](14-page-results-fit-five-way-tie-keyboard-1920.jpg) | | |
| ![15-page-results-fit-eight-way-tie-keyboard-1920.jpg](15-page-results-fit-eight-way-tie-keyboard-1920.jpg) | | |
| ![16-page-results-fit-three-way-tie-1920.jpg](16-page-results-fit-three-way-tie-1920.jpg) | | |
| ![17-page-results-fit-long-winner-1280.jpg](17-page-results-fit-long-winner-1280.jpg) | | |
| ![18-page-results-fit-long-winner-keyboard-1280.jpg](18-page-results-fit-long-winner-keyboard-1280.jpg) | | |
| ![19-page-results-fit-single-word-winner-1280.jpg](19-page-results-fit-single-word-winner-1280.jpg) | | |
| ![20-page-results-fit-team-result-1280.jpg](20-page-results-fit-team-result-1280.jpg) | | |
| ![21-page-results-fit-two-way-tie-keyboard-1280.jpg](21-page-results-fit-two-way-tie-keyboard-1280.jpg) | | |
| ![22-page-results-fit-wide-tie-1280.jpg](22-page-results-fit-wide-tie-1280.jpg) | | |
| ![23-page-results-fit-wide-tie-keyboard-1280.jpg](23-page-results-fit-wide-tie-keyboard-1280.jpg) | | |
| ![24-page-results-fit-team-tie-keyboard-1280.jpg](24-page-results-fit-team-tie-keyboard-1280.jpg) | | |
| ![25-page-results-fit-eight-player-teams-1280.jpg](25-page-results-fit-eight-player-teams-1280.jpg) | | |
| ![26-page-results-fit-tamil-tie-keyboard-1280.jpg](26-page-results-fit-tamil-tie-keyboard-1280.jpg) | | |
| ![27-page-results-fit-cuneiform-ligature-tie-1280.jpg](27-page-results-fit-cuneiform-ligature-tie-1280.jpg) | | |
| ![28-page-results-fit-eight-wide-two-way-tie-1280.jpg](28-page-results-fit-eight-wide-two-way-tie-1280.jpg) | | |
| ![29-page-results-fit-eight-wide-team-tie-1280.jpg](29-page-results-fit-eight-wide-team-tie-1280.jpg) | | |
| ![30-page-results-fit-five-way-tie-keyboard-1280.jpg](30-page-results-fit-five-way-tie-keyboard-1280.jpg) | | |
| ![31-page-results-fit-eight-way-tie-keyboard-1280.jpg](31-page-results-fit-eight-way-tie-keyboard-1280.jpg) | | |
| ![32-page-results-fit-three-way-tie-1280.jpg](32-page-results-fit-three-way-tie-1280.jpg) | | |
| ![46-host-rabakz-before-start.jpg](46-host-rabakz-before-start.jpg) | | |
| ![57-phone1-rabakz-controller-1.jpg](57-phone1-rabakz-controller-1.jpg) | | |
| ![58-phone2-rabakz-controller-2.jpg](58-phone2-rabakz-controller-2.jpg) | | |
| ![59-host-rabakz-running.jpg](59-host-rabakz-running.jpg) | | |
| ![60-host-rabakz-game-final.jpg](60-host-rabakz-game-final.jpg) | | |
| ![71-host-rabakz-results-tv.jpg](71-host-rabakz-results-tv.jpg) | | |
| ![72-phone1-rabakz-results-leader.jpg](72-phone1-rabakz-results-leader.jpg) | | |
| ![73-phone2-rabakz-results-phone2.jpg](73-phone2-rabakz-results-phone2.jpg) | | |
| ![74-host-rabakz-returned-picker.jpg](74-host-rabakz-returned-picker.jpg) | | |
| ![75-phone1-rabakz-returned-picker-phone1.jpg](75-phone1-rabakz-returned-picker-phone1.jpg) | | |
| ![76-phone2-rabakz-returned-picker-phone2.jpg](76-phone2-rabakz-returned-picker-phone2.jpg) | | |
| ![77-phone1-rabakz-restarted-controller-1.jpg](77-phone1-rabakz-restarted-controller-1.jpg) | | |
| ![78-phone2-rabakz-restarted-controller-2.jpg](78-phone2-rabakz-restarted-controller-2.jpg) | | |
| ![92-host-tabao-rush-before-start.jpg](92-host-tabao-rush-before-start.jpg) | | |
| ![103-phone1-tabao-rush-controller-1.jpg](103-phone1-tabao-rush-controller-1.jpg) | | |
| ![104-phone2-tabao-rush-controller-2.jpg](104-phone2-tabao-rush-controller-2.jpg) | | |
| ![105-host-tabao-rush-running.jpg](105-host-tabao-rush-running.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![45-strip-rabakz-header-crossfade.jpg](45-strip-rabakz-header-crossfade.jpg) | | |
| ![56-strip-rabakz-start-crossfade.jpg](56-strip-rabakz-start-crossfade.jpg) | | |
| ![70-strip-rabakz-results-crossfade.jpg](70-strip-rabakz-results-crossfade.jpg) | | |
| ![91-strip-tabao-rush-header-crossfade.jpg](91-strip-tabao-rush-header-crossfade.jpg) | | |
| ![102-strip-tabao-rush-start-crossfade.jpg](102-strip-tabao-rush-start-crossfade.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)
Run: `pnpm uat -- C-16-start-game --phones 2 --max-mb 16`, exit 0, no process left. The first run
passed every step but stopped at the evidence size guard (12.84 MB of 12) because round 9 doubled
the results captures (16 cases at 1920 × 1080 and 1280 × 720); the guard limits the evidence
folder only, not a PERFORMANCE.md budget. Every results case asserts both columns inside the safe
margin, the winner column within 1 px of its 1 : 1.618 share, and the badges inside the column.
`Overlap.dom.test.ts` passed when run by the integrator.
Opened c16r9-wide.jpg (shots 10-15 at 1920).
- 10 Tamil two-way tie with the hint, 11 cuneiform and ligature tie: the headline wraps in the
  winner column at a reduced step and fits; ranking names end with "…" on one line; the winner
  column keeps its width (D-130).
- 12 eight players with wide names, two-way tie; 13 eight players in teams with a team tie and
  wide names: both columns fit; the ranking list ends above the bottom margin.
- 14 five-way and 15 eight-way ties with the hint: 3 badges and "+2" / "+5"; the badge row stays
  in its column. Hint reads "Enter: play again · Esc: game picker".
| Shot | What it shows | Looked at by |
|---|---|---|
| 10-15 (1920) | Wide names, big ties, badge cap, hint copy | Claude (integrator) |
