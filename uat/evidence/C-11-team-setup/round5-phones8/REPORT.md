# C-11-team-setup UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-11-team-setup --phones 8 --out round5-phones8`
Commit: `f067db37dc61549222fc99ea57e117362c5c1ab1`
Viewports: 844×390, 1920×1080, 667×375

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1559.1 | completed |
| Optional teams default off; balanced automatic split | 1758.4 | completed |
| Switch and refusal, then leader move | 2293.5 | completed |
| Leave and join during setup | 1299.9 | completed |
| Both phone sizes, including the leader move list | 823.0 | completed |
| Start Rabakz with teams | 1341.3 | completed |

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

## Integrator's look (2026-11-18, after the merge fixes, D-151)

Opened ../c11r5.jpg (shots 03, 12, 16, 18, 22, 23) and the run's report. Start is console brown on
the TV and the phones; the moved-player notice and the refusal are both 21 px; the TV refusal
line is attributed. Grid labels still wrap at 667 (follow-up C-11b).
