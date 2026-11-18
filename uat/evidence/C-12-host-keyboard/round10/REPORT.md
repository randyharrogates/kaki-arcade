# C-12-host-keyboard UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-12-host-keyboard --phones 8 --out round10`
Commit: `f789353830f0cf70190720a2ea286a20938958ab`
Viewports: 1920×1080, 1280×720

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 2168.0 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-landing-focus.jpg](01-host-landing-focus.jpg) | Landing placeholder with Host a room focused. | |
| ![02-host-lobby-focus.jpg](02-host-lobby-focus.jpg) | Empty lobby with keyboard join hint and eight empty seats. | |
| ![18-host-lobby-720p.jpg](18-host-lobby-720p.jpg) | Empty lobby at 720p with join panel and seats. | |
| ![13-host-lobby-pad-hint.jpg](13-host-lobby-pad-hint.jpg) | Empty lobby with keyboard and mocked game-pad join hints. | |
| ![19-host-lobby-pad-720p.jpg](19-host-lobby-pad-720p.jpg) | Empty lobby with mocked pad join hint at 720p. | |
| ![11-host-lobby-hint-joined.jpg](11-host-lobby-hint-joined.jpg) | Player 1 seated as leader; L: leave hint. | |
| ![03-host-picker-focus.jpg](03-host-picker-focus.jpg) | Picker with Peek Poker focused and navigation hints. | |
| ![20-host-picker-720p.jpg](20-host-picker-720p.jpg) | Picker with Peek Poker focused at 720p. | |
| ![10-host-picker-heading.jpg](10-host-picker-heading.jpg) | Peek Poker start screen naming Player 1 as keyboard starter. | |
| ![05-host-keyboard-start.jpg](05-host-keyboard-start.jpg) | Game placeholder with the local Player 1 seat. | |
| ![06-host-pause-panel.jpg](06-host-pause-panel.jpg) | Paused panel over the game placeholder; Resume focused. | |
| ![12-host-quit-keeps-seat.jpg](12-host-quit-keeps-seat.jpg) | Lobby after Quit, retaining Player 1 and leadership. | |
| ![07-host-local-and-two-phones.jpg](07-host-local-and-two-phones.jpg) | Lobby with Player 1 and two phones seated. | |
| ![14-host-picker-long-name.jpg](14-host-picker-long-name.jpg) | Peek Poker start screen naming WWWWWWWWWWWW as phone starter. | |
| ![21-host-start-8-wide-1080p.jpg](21-host-start-8-wide-1080p.jpg) | Eight-phone Rabakz start screen at 1080p. | |
| ![22-host-start-8-wide-720p.jpg](22-host-start-8-wide-720p.jpg) | Eight-phone Rabakz start screen at 720p. | |
| ![07-host-team-setup-8.jpg](07-host-team-setup-8.jpg) | Eight-phone team setup with side cards, phone sentence and keyboard hints. | |
| ![16-host-host-before-results-enter.jpg](16-host-host-before-results-enter.jpg) | Rabakz final team screen after phones disconnect, before results Enter. | |
| ![09-host-results-no-leader.jpg](09-host-results-no-leader.jpg) | Results with tied teams, disconnected phones and keyboard actions. | |
| ![08-host-results-keys.jpg](08-host-results-keys.jpg) | Results keyboard actions without a visible focus ring (corrected by Round 11 script). | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
