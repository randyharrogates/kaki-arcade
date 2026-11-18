# R-04-setup UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- R-04-setup --phones 1 --out round1-p1`
Commit: `6aa4541812301aa23cdb1fe0e542bc0a28be5492`
Viewports: 667×375, 844×390, 1920×1080

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1416.6 | completed |
| Open settings and mirror default values | 1767.6 | completed |
| Other installed schemas need no console-specific code | 1829.4 | completed |
| Expand categories in the same row with D-157 groups | 1446.4 | completed |
| RZ-011 refuses Hard for Singapore Life and keeps the chosen difficulty | 569.3 | completed |
| RZ-001/010 category changes may strand 50 questions and disable Start | 1030.2 | completed |
| TV value changes use base crossfades and reduced-motion swaps | 863.1 | completed |
| Start thirty questions with the chosen settings | 899.7 | completed |
| Retain settings across the completed match, picker and a leader reload | 335848.6 | completed |
| Team availability and team confirmation | 136.8 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-phone1-setup-leader-default-667.jpg](01-phone1-setup-leader-default-667.jpg) | | |
| ![02-phone1-setup-leader-default-844.jpg](02-phone1-setup-leader-default-844.jpg) | | |
| ![03-host-setup-tv-default.jpg](03-host-setup-tv-default.jpg) | | |
| ![04-phone1-peek-poker-rounds-leader-667.jpg](04-phone1-peek-poker-rounds-leader-667.jpg) | | |
| ![05-host-peek-poker-rounds-tv.jpg](05-host-peek-poker-rounds-tv.jpg) | | |
| ![06-phone1-tabao-no-settings-leader-844.jpg](06-phone1-tabao-no-settings-leader-844.jpg) | | |
| ![07-phone1-categories-world-667.jpg](07-phone1-categories-world-667.jpg) | | |
| ![08-phone1-categories-world-844.jpg](08-phone1-categories-world-844.jpg) | | |
| ![09-phone1-categories-singapore-844.jpg](09-phone1-categories-singapore-844.jpg) | | |
| ![10-phone1-categories-singapore-667.jpg](10-phone1-categories-singapore-667.jpg) | | |
| ![11-phone1-categories-group-844.jpg](11-phone1-categories-group-844.jpg) | | |
| ![12-host-setup-tv-categories.jpg](12-host-setup-tv-categories.jpg) | | |
| ![13-phone1-difficulty-refused-leader-667.jpg](13-phone1-difficulty-refused-leader-667.jpg) | | |
| ![14-host-difficulty-refused-tv.jpg](14-host-difficulty-refused-tv.jpg) | | |
| ![15-phone1-start-blocked-leader-844.jpg](15-phone1-start-blocked-leader-844.jpg) | | |
| ![16-host-start-blocked-tv.jpg](16-host-start-blocked-tv.jpg) | | |
| ![17-phone1-length-50-unavailable-844.jpg](17-phone1-length-50-unavailable-844.jpg) | | |
| ![32-host-match-started-tv.jpg](32-host-match-started-tv.jpg) | | |
| ![33-phone1-settings-kept-leader-844.jpg](33-phone1-settings-kept-leader-844.jpg) | | |
| ![34-phone1-leader-reload-setup-667.jpg](34-phone1-leader-reload-setup-667.jpg) | | |
| ![35-phone1-solo-teams-disabled-667.jpg](35-phone1-solo-teams-disabled-667.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![24-strip-tv-value-change.jpg](24-strip-tv-value-change.jpg) | | |
| ![31-strip-tv-value-change-reduced.jpg](31-strip-tv-value-change-reduced.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
