# C-16-start-game UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-16-start-game --phones 2`
Commit: `a9d839e7f1e8e3ebb24a1ddbf8d75396d30b3fd4`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 975.6 | completed |
| Seat two phones for rabakz | 451.5 | completed |
| Leader starts rabakz; TV and both shells follow | 127494.0 | completed |
| Create room through host page | 850.7 | completed |
| Seat two phones for tabao-rush | 305.1 | completed |
| Leader starts tabao-rush; TV and both shells follow | 7941.1 | completed |

Expected errors (count):
None

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![13-strip-rabakz-header-crossfade.jpg](13-strip-rabakz-header-crossfade.jpg) | | |
| ![24-strip-rabakz-start-crossfade.jpg](24-strip-rabakz-start-crossfade.jpg) | | |
| ![38-strip-rabakz-results-crossfade.jpg](38-strip-rabakz-results-crossfade.jpg) | | |
| ![59-strip-tabao-rush-header-crossfade.jpg](59-strip-tabao-rush-header-crossfade.jpg) | | |
| ![70-strip-tabao-rush-start-crossfade.jpg](70-strip-tabao-rush-start-crossfade.jpg) | | |

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![14-host-rabakz-before-start.jpg](14-host-rabakz-before-start.jpg) | | |
| ![25-phone1-rabakz-controller-1.jpg](25-phone1-rabakz-controller-1.jpg) | | |
| ![26-phone2-rabakz-controller-2.jpg](26-phone2-rabakz-controller-2.jpg) | | |
| ![27-host-rabakz-running.jpg](27-host-rabakz-running.jpg) | | |
| ![28-host-rabakz-game-final.jpg](28-host-rabakz-game-final.jpg) | | |
| ![39-host-rabakz-results-tv.jpg](39-host-rabakz-results-tv.jpg) | | |
| ![40-phone1-rabakz-results-leader.jpg](40-phone1-rabakz-results-leader.jpg) | | |
| ![41-phone2-rabakz-results-phone2.jpg](41-phone2-rabakz-results-phone2.jpg) | | |
| ![42-host-rabakz-returned-picker.jpg](42-host-rabakz-returned-picker.jpg) | | |
| ![43-phone1-rabakz-returned-picker-phone1.jpg](43-phone1-rabakz-returned-picker-phone1.jpg) | | |
| ![44-phone2-rabakz-returned-picker-phone2.jpg](44-phone2-rabakz-returned-picker-phone2.jpg) | | |
| ![45-phone1-rabakz-restarted-controller-1.jpg](45-phone1-rabakz-restarted-controller-1.jpg) | | |
| ![46-phone2-rabakz-restarted-controller-2.jpg](46-phone2-rabakz-restarted-controller-2.jpg) | | |
| ![60-host-tabao-rush-before-start.jpg](60-host-tabao-rush-before-start.jpg) | | |
| ![71-phone1-tabao-rush-controller-1.jpg](71-phone1-tabao-rush-controller-1.jpg) | | |
| ![72-phone2-tabao-rush-controller-2.jpg](72-phone2-tabao-rush-controller-2.jpg) | | |
| ![73-host-tabao-rush-running.jpg](73-host-tabao-rush-running.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)
Run: `pnpm uat -- C-16-start-game --phones 2`, exit 0, no process left. Opened
39-host-rabakz-results-tv at full size and a crop of 28 (c16r4-28crop.jpg).
- The three round-3 faults are fixed: the 0–0 result reads "Cloud Noodle and Pebble Puff share
  first" with both badges; the score reads "0 points" in the mono face, clearly apart from the
  badges; on Rabakz's own final screen "The leader continues on their phone" is the theme's pink
  secondary text on plum, readable.
Not checked: perf run (before close); real phones and TV.
