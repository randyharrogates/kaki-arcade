# C-11-team-setup UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-11-team-setup --phones 8 --out c11b-r2-phones8`
Commit: `cca109da5ca31771aa49aea28e752b139c184303`
Viewports: 844×390, 1920×1080, 667×375

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1254.8 | completed |
| Optional teams default off; balanced automatic split | 1638.6 | completed |
| Switch and refusal, then leader move | 2219.7 | completed |
| Leave and join during setup | 1274.5 | completed |
| Both phone sizes, including the leader move list | 829.5 | completed |
| Start Rabakz with teams | 1100.8 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-phone1-teams-off-toggle.jpg](01-phone1-teams-off-toggle.jpg) | | |
| ![02-phone1-teams-on-toggle.jpg](02-phone1-teams-on-toggle.jpg) | | |
| ![03-host-automatic-split.jpg](03-host-automatic-split.jpg) | | |
| ![04-host-maximum-length-name-tv.jpg](04-host-maximum-length-name-tv.jpg) | | |
| ![12-phone2-moved-player-phone.jpg](12-phone2-moved-player-phone.jpg) | | |
| ![13-phone1-leader-grid-after-move.jpg](13-phone1-leader-grid-after-move.jpg) | | |
| ![14-host-leader-move.jpg](14-host-leader-move.jpg) | | |
| ![15-host-reduced-motion-switch.jpg](15-host-reduced-motion-switch.jpg) | | |
| ![16-phone2-refusal-tapping-phone.jpg](16-phone2-refusal-tapping-phone.jpg) | | |
| ![17-phone1-refusal-other-phone.jpg](17-phone1-refusal-other-phone.jpg) | | |
| ![18-host-refusal-tv.jpg](18-host-refusal-tv.jpg) | | |
| ![19-host-leave-during-setup.jpg](19-host-leave-during-setup.jpg) | | |
| ![20-host-join-during-setup.jpg](20-host-join-during-setup.jpg) | | |
| ![21-phone1-teams-667-leader.jpg](21-phone1-teams-667-leader.jpg) | | |
| ![22-phone1-move-players-667.jpg](22-phone1-move-players-667.jpg) | | |
| ![23-phone1-teams-844-leader.jpg](23-phone1-teams-844-leader.jpg) | | |
| ![24-phone1-move-players-844.jpg](24-phone1-move-players-844.jpg) | | |
| ![25-phone2-teams-667-player.jpg](25-phone2-teams-667-player.jpg) | | |
| ![26-phone2-teams-844-player.jpg](26-phone2-teams-844-player.jpg) | | |
| ![27-host-rabakz-team-game.jpg](27-host-rabakz-team-game.jpg) | | |
| ![28-phone1-rabakz-team-controller.jpg](28-phone1-rabakz-team-controller.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![11-strip-switch-arc.jpg](11-strip-switch-arc.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
