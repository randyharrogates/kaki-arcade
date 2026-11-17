# C-11-team-setup UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-11-team-setup --phones 4 --out phones4`
Commit: `2e372feec76af7268119e1222f1bc5935a5c8fe3`
Viewports: 1920×1080, 844×390, 667×375

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1639.2 | completed |
| Optional teams default off; balanced automatic split | 1239.5 | completed |
| Switch and refusal, then leader move | 1884.7 | completed |
| Leave and join during setup | 1213.3 | completed |
| Both phone sizes, including the leader move list | 636.1 | completed |
| Start Rabakz with teams | 1642.5 | completed |

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
| ![14-phone1-teams-844-leader.jpg](14-phone1-teams-844-leader.jpg) | | |
| ![15-phone2-teams-667-player.jpg](15-phone2-teams-667-player.jpg) | | |
| ![16-phone2-teams-844-player.jpg](16-phone2-teams-844-player.jpg) | | |
| ![17-host-rabakz-team-game.jpg](17-host-rabakz-team-game.jpg) | | |
| ![18-phone1-rabakz-team-controller.jpg](18-phone1-rabakz-team-controller.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![08-strip-switch-arc.jpg](08-strip-switch-arc.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
