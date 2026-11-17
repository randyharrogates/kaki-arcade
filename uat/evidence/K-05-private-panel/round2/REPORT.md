# K-05-private-panel UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- K-05-private-panel --phones 2`
Commit: `efd60712593ee12c89cd4bc4ea80d7e3de6a29f3`
Viewports: 667×375, 667×443, 844×390, 932×430, 1920×1080

| Timing | ms | Status |
|---|---:|---|
| text-667 | 1229.3 | completed |
| cards-667 | 330.3 | completed |
| stats-667 | 324.6 | completed |
| grid-667 | 323.6 | completed |
| empty-667 | 300.2 | completed |
| picker-667 | 277.7 | completed |
| text-667 | 334.9 | completed |
| cards-667 | 281.2 | completed |
| stats-667 | 321.3 | completed |
| grid-667 | 287.2 | completed |
| empty-667 | 326.8 | completed |
| picker-667 | 327.1 | completed |
| text-844 | 288.8 | completed |
| cards-844 | 309.9 | completed |
| stats-844 | 276.1 | completed |
| grid-844 | 290.8 | completed |
| empty-844 | 260.3 | completed |
| picker-844 | 259.4 | completed |
| text-932 | 268.2 | completed |
| cards-932 | 316.8 | completed |
| stats-932 | 334.1 | completed |
| grid-932 | 320.1 | completed |
| empty-932 | 317.8 | completed |
| picker-932 | 322.5 | completed |
| Create room through host page | 997.7 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-phone1-private-text-667.jpg](01-phone1-private-text-667.jpg) | | |
| ![02-phone1-private-cards-667.jpg](02-phone1-private-cards-667.jpg) | | |
| ![03-phone1-private-stats-667.jpg](03-phone1-private-stats-667.jpg) | | |
| ![04-phone1-private-grid-667.jpg](04-phone1-private-grid-667.jpg) | | |
| ![05-phone1-private-empty-667.jpg](05-phone1-private-empty-667.jpg) | | |
| ![06-phone1-private-picker-667.jpg](06-phone1-private-picker-667.jpg) | | |
| ![07-phone1-private-text-667.jpg](07-phone1-private-text-667.jpg) | | |
| ![08-phone1-private-cards-667.jpg](08-phone1-private-cards-667.jpg) | | |
| ![09-phone1-private-stats-667.jpg](09-phone1-private-stats-667.jpg) | | |
| ![10-phone1-private-grid-667.jpg](10-phone1-private-grid-667.jpg) | | |
| ![11-phone1-private-empty-667.jpg](11-phone1-private-empty-667.jpg) | | |
| ![12-phone1-private-picker-667.jpg](12-phone1-private-picker-667.jpg) | | |
| ![13-phone1-private-text-844.jpg](13-phone1-private-text-844.jpg) | | |
| ![14-phone1-private-cards-844.jpg](14-phone1-private-cards-844.jpg) | | |
| ![15-phone1-private-stats-844.jpg](15-phone1-private-stats-844.jpg) | | |
| ![16-phone1-private-grid-844.jpg](16-phone1-private-grid-844.jpg) | | |
| ![17-phone1-private-empty-844.jpg](17-phone1-private-empty-844.jpg) | | |
| ![18-phone1-private-picker-844.jpg](18-phone1-private-picker-844.jpg) | | |
| ![19-phone1-private-text-932.jpg](19-phone1-private-text-932.jpg) | | |
| ![20-phone1-private-cards-932.jpg](20-phone1-private-cards-932.jpg) | | |
| ![21-phone1-private-stats-932.jpg](21-phone1-private-stats-932.jpg) | | |
| ![22-phone1-private-grid-932.jpg](22-phone1-private-grid-932.jpg) | | |
| ![23-phone1-private-empty-932.jpg](23-phone1-private-empty-932.jpg) | | |
| ![24-phone1-private-picker-932.jpg](24-phone1-private-picker-932.jpg) | | |
| ![38-host-host-no-private-content.jpg](38-host-host-no-private-content.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![37-strip-private-crossfade.jpg](37-strip-private-crossfade.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)
Run: `pnpm uat -- K-05-private-panel --phones 2`, exit 0, no process left (an earlier attempt was
refused by the memory gate and drew nothing). Opened k05r2-a.jpg (shots 06, 12, 02, 03, 18, 20,
01, 38).
- 06 picker plus panel at 667 × 375: "Lock in" is one line with room on both sides; the note
  "Your picks are secret" wraps inside the space the controls leave (D-132). 12 (667 × 443) wraps
  to four short lines, still inside. 18 at 844 reads on two lines at a larger size.
- 02 and 20 private cards fill the panel at card proportions; 03 stats are large figures with
  small labels; 01 text steps to fit and is readable.
- 38 limitation: the phone in this run is on the controller demo route, not joined to the host's
  room, so the host and other-phone DOM checks cannot fail and only show that the demo leaks
  nothing. The delivery guarantee (a private view reaches only its own phone, never publicView)
  is covered by apps/web/src/private-session.test.ts. An end-to-end check through a real room
  needs a game that sends a private view; it is recorded as a follow-up for P-03 (Peek Poker).
| Shot | What it shows | Looked at by |
|---|---|---|
| 01-03, 06, 12, 18, 20 | D-132 fit, panel parts sized to the space | Claude (integrator) |
| 38 | host lobby with no private content (limited, see above) | Claude (integrator) |
