# C-11-team-setup UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-11-team-setup --phones 8 --out round4-phones8`
Commit: `fb367c10a214a800c264e9e4d46ab9e40df3eb7b`
Viewports: 844×390, 1920×1080, 667×375

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1572.7 | completed |
| Optional teams default off; balanced automatic split | 1608.8 | completed |
| Switch and refusal, then leader move | 2172.7 | completed |
| Leave and join during setup | 1242.2 | completed |
| Both phone sizes, including the leader move list | 862.1 | completed |
| Start Rabakz with teams | 1186.4 | completed |

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

## Integrator's look (2026-11-18)

Opened every shot in this folder (contact sheets ../c11r4-tv.jpg and ../c11r4-phones.jpg) and the
strip 11 at full size.
- 03/04: 4 v 4 at true TV tokens, names on one line, the 14-character name fits; "Leader" sits
  apart with the star icon in the secondary colour.
- 14: the leader moved at 8 players with nobody leaving first (no size cap, D-149).
- 18: the TV names who was refused ("Player 2 can't leave Red: it needs at least one player.");
  16 shows the refusal with the warning icon on the tapping phone only; 17 shows no message on
  another phone.
- 12: the moved player's phone says "Cloud Noodle moved you to Red."; 13 shows the grid after a move.
- 11 strip: the crossing chip arcs over the centre line and stays above its neighbours; the
  others reflow straight after it; nothing passes its rest position at these frames.
- 19/20: the leave and the join show different splits.
- 01/02: the Teams off/on toggle; 21-26: both phone sizes, every target readable.
- For the reviewer: at 667 the grid label "1 · Cloud Noodle · Blue" still wraps onto two lines;
  team-setup Start is red while the "Ready to start?" Start is brown.
