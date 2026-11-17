# C-11-team-setup UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-11-team-setup --phones 4 --out phones4`
Commit: `ebf89d0d635ed59378c89dc1fadcf87e578e0481`
Viewports: 1920×1080, 844×390, 667×375

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1899.2 | completed |
| Optional teams default off; balanced automatic split | 1221.4 | completed |
| Switch and refusal, then leader move | 2005.8 | completed |
| Leave and join during setup | 480.9 | completed |
| Both phone sizes, including the leader move list | 920.1 | completed |
| Start Rabakz with teams | 1367.8 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-automatic-split.jpg](01-host-automatic-split.jpg) | | |
| ![09-phone3-refused-empty.jpg](09-phone3-refused-empty.jpg) | | |
| ![10-host-leader-move.jpg](10-host-leader-move.jpg) | | |
| ![11-host-leave-during-setup.jpg](11-host-leave-during-setup.jpg) | | |
| ![12-host-join-during-setup.jpg](12-host-join-during-setup.jpg) | | |
| ![13-phone1-teams-667-leader.jpg](13-phone1-teams-667-leader.jpg) | | |
| ![14-phone1-move-players-667.jpg](14-phone1-move-players-667.jpg) | | |
| ![15-phone1-teams-844-leader.jpg](15-phone1-teams-844-leader.jpg) | | |
| ![16-phone1-move-players-844.jpg](16-phone1-move-players-844.jpg) | | |
| ![17-phone2-teams-667-player.jpg](17-phone2-teams-667-player.jpg) | | |
| ![18-phone2-teams-844-player.jpg](18-phone2-teams-844-player.jpg) | | |
| ![19-host-rabakz-team-game.jpg](19-host-rabakz-team-game.jpg) | | |
| ![20-phone1-rabakz-team-controller.jpg](20-phone1-rabakz-team-controller.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![08-strip-switch-arc.jpg](08-strip-switch-arc.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
