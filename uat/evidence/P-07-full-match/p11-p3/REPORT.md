# P-07-full-match UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution passed; the integrator looked at the stills named below on 2026-11-19.

Command: `node tools/uat/run.mjs -- P-07-full-match --phones 3 --out p11-p3`
Commit: `dee8ab4e96e3ef85e0799d56924f8df988965b75`
Viewports: 1920×1080, 844×390, 1280×720

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1274.0 | completed |
| Lobby: all phones join through real pairing | 808.7 | completed |
| Picker → default five rounds → Start real Peek Poker | 1226.1 | completed |
| R1 PP-002/003/004/011: deal, memorise timer and swap difficulty | 8884.0 | completed |
| R1 PP-005/006/021: early and late private picks; TV lock seats only | 10347.0 | completed |
| R1 PP-020/021 PLAT-033: every pre-reveal public view is secret | 2.7 | completed |
| R1 PP-020: every decoded control-channel message is secret before reveal | 1.3 | completed |
| R1 PP-020/021: every sampled pick DOM frame has no early reveal | 105.1 | completed |
| R1 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 4180.8 | completed |
| R1 PP-032: scoreboard and every phone’s own place and score | 3044.8 | completed |
| R2 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6058.2 | completed |
| R2 PP-005/006/021: early and late private picks; TV lock seats only | 9123.7 | completed |
| R2 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.6 | completed |
| R2 PP-020: every decoded control-channel message is secret before reveal | 0.4 | completed |
| R2 PP-020/021: every sampled pick DOM frame has no early reveal | 86.3 | completed |
| R2 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3084.3 | completed |
| R2 PP-032: scoreboard and every phone’s own place and score | 2669.2 | completed |
| R3 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6477.3 | completed |
| R3 PP-005/006/021: early and late private picks; TV lock seats only | 9095.8 | completed |
| R3 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.0 | completed |
| R3 PP-020: every decoded control-channel message is secret before reveal | 0.3 | completed |
| R3 PP-020/021: every sampled pick DOM frame has no early reveal | 84.3 | completed |
| R3 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3126.0 | completed |
| R3 PP-032: scoreboard and every phone’s own place and score | 2701.8 | completed |
| R4 PP-002/003/004/011: deal, memorise timer and swap difficulty | 5773.8 | completed |
| R4 PP-005/006/021: early and late private picks; TV lock seats only | 9194.5 | completed |
| R4 PP-020/021 PLAT-033: every pre-reveal public view is secret | 2.0 | completed |
| R4 PP-020: every decoded control-channel message is secret before reveal | 0.5 | completed |
| R4 PP-020/021: every sampled pick DOM frame has no early reveal | 107.1 | completed |
| R4 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3241.5 | completed |
| R4 PP-032: scoreboard and every phone’s own place and score | 2715.0 | completed |
| R5 PP-002/003/004/011: deal, memorise timer and swap difficulty | 7722.4 | completed |
| R5 PP-005/006/021: early and late private picks; TV lock seats only | 10231.0 | completed |
| R5 PP-020/021 PLAT-033: every pre-reveal public view is secret | 3.2 | completed |
| R5 PP-020: every decoded control-channel message is secret before reveal | 1.5 | completed |
| R5 PP-020/021: every sampled pick DOM frame has no early reveal | 157.2 | completed |
| R5 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3893.1 | completed |
| R5 PP-032: scoreboard and every phone’s own place and score | 3176.8 | completed |
| PP-001/032: final podium at 1920 and 1280, own final stats, Continue → picker | 1557.2 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-r1-memorise-tv.jpg](01-host-r1-memorise-tv.jpg) | | |
| ![02-phone1-r1-memorise-phone1.jpg](02-phone1-r1-memorise-phone1.jpg) | | |
| ![03-phone2-r1-memorise-phone2.jpg](03-phone2-r1-memorise-phone2.jpg) | | |
| ![04-phone3-r1-memorise-phone3.jpg](04-phone3-r1-memorise-phone3.jpg) | | |
| ![05-host-r1-pick-tv.jpg](05-host-r1-pick-tv.jpg) | | |
| ![06-phone1-r1-pick-phone1.jpg](06-phone1-r1-pick-phone1.jpg) | | |
| ![07-phone2-r1-pick-phone2.jpg](07-phone2-r1-pick-phone2.jpg) | | |
| ![08-phone3-r1-pick-phone3.jpg](08-phone3-r1-pick-phone3.jpg) | | |
| ![09-phone1-r1-phone1-two-selected.jpg](09-phone1-r1-phone1-two-selected.jpg) | | |
| ![10-host-r1-locked-tv.jpg](10-host-r1-locked-tv.jpg) | | |
| ![11-phone1-r1-locked-phone1.jpg](11-phone1-r1-locked-phone1.jpg) | | |
| ![12-phone2-r1-locked-phone2.jpg](12-phone2-r1-locked-phone2.jpg) | | |
| ![13-phone3-r1-locked-phone3.jpg](13-phone3-r1-locked-phone3.jpg) | | |
| ![21-host-r1-reveal-tv.jpg](21-host-r1-reveal-tv.jpg) | R1 reveal: Player 2 full house 11 pts above Player 1 full house 9 pts, then Player 3 two pair 3 pts | Claude (integrator), 2026-11-19 |
| ![22-phone1-r1-reveal-phone1.jpg](22-phone1-r1-reveal-phone1.jpg) | | |
| ![23-phone2-r1-reveal-phone2.jpg](23-phone2-r1-reveal-phone2.jpg) | | |
| ![24-phone3-r1-reveal-phone3.jpg](24-phone3-r1-reveal-phone3.jpg) | | |
| ![25-host-r1-scoreboard-tv.jpg](25-host-r1-scoreboard-tv.jpg) | | |
| ![26-phone1-r1-scoreboard-phone1.jpg](26-phone1-r1-scoreboard-phone1.jpg) | | |
| ![27-phone2-r1-scoreboard-phone2.jpg](27-phone2-r1-scoreboard-phone2.jpg) | | |
| ![28-phone3-r1-scoreboard-phone3.jpg](28-phone3-r1-scoreboard-phone3.jpg) | | |
| ![29-host-r5-memorise-tv.jpg](29-host-r5-memorise-tv.jpg) | | |
| ![30-phone1-r5-memorise-phone1.jpg](30-phone1-r5-memorise-phone1.jpg) | | |
| ![31-phone2-r5-memorise-phone2.jpg](31-phone2-r5-memorise-phone2.jpg) | | |
| ![32-phone3-r5-memorise-phone3.jpg](32-phone3-r5-memorise-phone3.jpg) | | |
| ![33-host-r5-swap1-tv.jpg](33-host-r5-swap1-tv.jpg) | | |
| ![34-phone1-r5-swap1-phone1.jpg](34-phone1-r5-swap1-phone1.jpg) | | |
| ![35-phone2-r5-swap1-phone2.jpg](35-phone2-r5-swap1-phone2.jpg) | | |
| ![36-phone3-r5-swap1-phone3.jpg](36-phone3-r5-swap1-phone3.jpg) | | |
| ![37-host-r5-swap2-tv.jpg](37-host-r5-swap2-tv.jpg) | | |
| ![38-phone1-r5-swap2-phone1.jpg](38-phone1-r5-swap2-phone1.jpg) | | |
| ![39-phone2-r5-swap2-phone2.jpg](39-phone2-r5-swap2-phone2.jpg) | | |
| ![40-phone3-r5-swap2-phone3.jpg](40-phone3-r5-swap2-phone3.jpg) | | |
| ![41-host-r5-pick-tv.jpg](41-host-r5-pick-tv.jpg) | | |
| ![42-phone1-r5-pick-phone1.jpg](42-phone1-r5-pick-phone1.jpg) | | |
| ![43-phone2-r5-pick-phone2.jpg](43-phone2-r5-pick-phone2.jpg) | | |
| ![44-phone3-r5-pick-phone3.jpg](44-phone3-r5-pick-phone3.jpg) | | |
| ![45-host-r5-locked-tv.jpg](45-host-r5-locked-tv.jpg) | | |
| ![46-phone1-r5-locked-phone1.jpg](46-phone1-r5-locked-phone1.jpg) | | |
| ![47-phone2-r5-locked-phone2.jpg](47-phone2-r5-locked-phone2.jpg) | | |
| ![48-phone3-r5-locked-phone3.jpg](48-phone3-r5-locked-phone3.jpg) | | |
| ![49-host-r5-reveal-tv.jpg](49-host-r5-reveal-tv.jpg) | R5 reveal: Player 2 three of a kind 7 above Player 1 three of a kind 5, then Player 3 pair 2 | Claude (integrator), 2026-11-19 |
| ![50-phone1-r5-reveal-phone1.jpg](50-phone1-r5-reveal-phone1.jpg) | | |
| ![51-phone2-r5-reveal-phone2.jpg](51-phone2-r5-reveal-phone2.jpg) | | |
| ![52-phone3-r5-reveal-phone3.jpg](52-phone3-r5-reveal-phone3.jpg) | | |
| ![53-host-r5-scoreboard-tv.jpg](53-host-r5-scoreboard-tv.jpg) | | |
| ![54-phone1-r5-scoreboard-phone1.jpg](54-phone1-r5-scoreboard-phone1.jpg) | | |
| ![55-phone2-r5-scoreboard-phone2.jpg](55-phone2-r5-scoreboard-phone2.jpg) | | |
| ![56-phone3-r5-scoreboard-phone3.jpg](56-phone3-r5-scoreboard-phone3.jpg) | | |
| ![57-host-podium-1920.jpg](57-host-podium-1920.jpg) | | |
| ![58-host-podium-1280.jpg](58-host-podium-1280.jpg) | | |
| ![59-phone1-podium-phone1.jpg](59-phone1-podium-phone1.jpg) | | |
| ![60-phone2-podium-phone2.jpg](60-phone2-podium-phone2.jpg) | | |
| ![61-phone3-podium-phone3.jpg](61-phone3-podium-phone3.jpg) | | |
| ![62-host-continue-picker.jpg](62-host-continue-picker.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![20-strip-reveal.jpg](20-strip-reveal.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| PP-008/PP-009: the +3 speed winner lists above the equal +1 hand | Pass | 21, 49, round-1..5.json |
