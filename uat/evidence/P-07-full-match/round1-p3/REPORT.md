# P-07-full-match UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- P-07-full-match --phones 3 --max-mb 24 --out round1-p3`
Commit: `6f8f11955b651b4ada86ca3e284bae784be5c4df`
Viewports: 1920×1080, 844×390, 1280×720

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1204.4 | completed |
| Lobby: all phones join through real pairing | 788.7 | completed |
| Picker → default five rounds → Start real Peek Poker | 1195.2 | completed |
| R1 PP-002/003/004/011: deal, memorise timer and swap difficulty | 8872.9 | completed |
| R1 PP-005/006/021: early and late private picks; TV lock seats only | 10295.4 | completed |
| R1 PP-020/021 PLAT-033: every pre-reveal public view is secret | 2.5 | completed |
| R1 PP-020: every decoded phone message contains only its own selection | 0.4 | completed |
| R1 PP-020/021: every sampled pick DOM frame has no early reveal | 81.1 | completed |
| R1 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3888.0 | completed |
| R1 PP-032: scoreboard and every phone’s own place and score | 3145.1 | completed |
| R2 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6129.2 | completed |
| R2 PP-005/006/021: early and late private picks; TV lock seats only | 9383.7 | completed |
| R2 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.5 | completed |
| R2 PP-020: every decoded phone message contains only its own selection | 0.2 | completed |
| R2 PP-020/021: every sampled pick DOM frame has no early reveal | 71.9 | completed |
| R2 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3167.4 | completed |
| R2 PP-032: scoreboard and every phone’s own place and score | 2731.4 | completed |
| R3 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6488.5 | completed |
| R3 PP-005/006/021: early and late private picks; TV lock seats only | 9305.9 | completed |
| R3 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.2 | completed |
| R3 PP-020: every decoded phone message contains only its own selection | 0.1 | completed |
| R3 PP-020/021: every sampled pick DOM frame has no early reveal | 68.6 | completed |
| R3 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3209.0 | completed |
| R3 PP-032: scoreboard and every phone’s own place and score | 2766.1 | completed |
| R4 PP-002/003/004/011: deal, memorise timer and swap difficulty | 5759.0 | completed |
| R4 PP-005/006/021: early and late private picks; TV lock seats only | 9356.3 | completed |
| R4 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.3 | completed |
| R4 PP-020: every decoded phone message contains only its own selection | 0.2 | completed |
| R4 PP-020/021: every sampled pick DOM frame has no early reveal | 72.1 | completed |
| R4 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3136.9 | completed |
| R4 PP-032: scoreboard and every phone’s own place and score | 2730.7 | completed |
| R5 PP-002/003/004/011: deal, memorise timer and swap difficulty | 7713.8 | completed |
| R5 PP-005/006/021: early and late private picks; TV lock seats only | 10291.0 | completed |
| R5 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.4 | completed |
| R5 PP-020: every decoded phone message contains only its own selection | 0.2 | completed |
| R5 PP-020/021: every sampled pick DOM frame has no early reveal | 74.5 | completed |
| R5 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3616.0 | completed |
| R5 PP-032: scoreboard and every phone’s own place and score | 3168.5 | completed |
| PP-001/032: final podium at 1920 and 1280, own final stats, Continue → picker | 1528.3 | completed |

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
| ![09-host-r1-locked-tv.jpg](09-host-r1-locked-tv.jpg) | | |
| ![10-phone1-r1-locked-phone1.jpg](10-phone1-r1-locked-phone1.jpg) | | |
| ![11-phone2-r1-locked-phone2.jpg](11-phone2-r1-locked-phone2.jpg) | | |
| ![12-phone3-r1-locked-phone3.jpg](12-phone3-r1-locked-phone3.jpg) | | |
| ![20-host-r1-reveal-tv.jpg](20-host-r1-reveal-tv.jpg) | | |
| ![21-phone1-r1-reveal-phone1.jpg](21-phone1-r1-reveal-phone1.jpg) | | |
| ![22-phone2-r1-reveal-phone2.jpg](22-phone2-r1-reveal-phone2.jpg) | | |
| ![23-phone3-r1-reveal-phone3.jpg](23-phone3-r1-reveal-phone3.jpg) | | |
| ![24-host-r1-scoreboard-tv.jpg](24-host-r1-scoreboard-tv.jpg) | | |
| ![25-phone1-r1-scoreboard-phone1.jpg](25-phone1-r1-scoreboard-phone1.jpg) | | |
| ![26-phone2-r1-scoreboard-phone2.jpg](26-phone2-r1-scoreboard-phone2.jpg) | | |
| ![27-phone3-r1-scoreboard-phone3.jpg](27-phone3-r1-scoreboard-phone3.jpg) | | |
| ![28-host-r5-memorise-tv.jpg](28-host-r5-memorise-tv.jpg) | | |
| ![29-phone1-r5-memorise-phone1.jpg](29-phone1-r5-memorise-phone1.jpg) | | |
| ![30-phone2-r5-memorise-phone2.jpg](30-phone2-r5-memorise-phone2.jpg) | | |
| ![31-phone3-r5-memorise-phone3.jpg](31-phone3-r5-memorise-phone3.jpg) | | |
| ![32-host-r5-swap1-tv.jpg](32-host-r5-swap1-tv.jpg) | | |
| ![33-phone1-r5-swap1-phone1.jpg](33-phone1-r5-swap1-phone1.jpg) | | |
| ![34-phone2-r5-swap1-phone2.jpg](34-phone2-r5-swap1-phone2.jpg) | | |
| ![35-phone3-r5-swap1-phone3.jpg](35-phone3-r5-swap1-phone3.jpg) | | |
| ![36-host-r5-swap2-tv.jpg](36-host-r5-swap2-tv.jpg) | | |
| ![37-phone1-r5-swap2-phone1.jpg](37-phone1-r5-swap2-phone1.jpg) | | |
| ![38-phone2-r5-swap2-phone2.jpg](38-phone2-r5-swap2-phone2.jpg) | | |
| ![39-phone3-r5-swap2-phone3.jpg](39-phone3-r5-swap2-phone3.jpg) | | |
| ![40-host-r5-pick-tv.jpg](40-host-r5-pick-tv.jpg) | | |
| ![41-phone1-r5-pick-phone1.jpg](41-phone1-r5-pick-phone1.jpg) | | |
| ![42-phone2-r5-pick-phone2.jpg](42-phone2-r5-pick-phone2.jpg) | | |
| ![43-phone3-r5-pick-phone3.jpg](43-phone3-r5-pick-phone3.jpg) | | |
| ![44-host-r5-locked-tv.jpg](44-host-r5-locked-tv.jpg) | | |
| ![45-phone1-r5-locked-phone1.jpg](45-phone1-r5-locked-phone1.jpg) | | |
| ![46-phone2-r5-locked-phone2.jpg](46-phone2-r5-locked-phone2.jpg) | | |
| ![47-phone3-r5-locked-phone3.jpg](47-phone3-r5-locked-phone3.jpg) | | |
| ![48-host-r5-reveal-tv.jpg](48-host-r5-reveal-tv.jpg) | | |
| ![49-phone1-r5-reveal-phone1.jpg](49-phone1-r5-reveal-phone1.jpg) | | |
| ![50-phone2-r5-reveal-phone2.jpg](50-phone2-r5-reveal-phone2.jpg) | | |
| ![51-phone3-r5-reveal-phone3.jpg](51-phone3-r5-reveal-phone3.jpg) | | |
| ![52-host-r5-scoreboard-tv.jpg](52-host-r5-scoreboard-tv.jpg) | | |
| ![53-phone1-r5-scoreboard-phone1.jpg](53-phone1-r5-scoreboard-phone1.jpg) | | |
| ![54-phone2-r5-scoreboard-phone2.jpg](54-phone2-r5-scoreboard-phone2.jpg) | | |
| ![55-phone3-r5-scoreboard-phone3.jpg](55-phone3-r5-scoreboard-phone3.jpg) | | |
| ![56-host-podium-1920.jpg](56-host-podium-1920.jpg) | | |
| ![57-host-podium-1280.jpg](57-host-podium-1280.jpg) | | |
| ![58-phone1-podium-phone1.jpg](58-phone1-podium-phone1.jpg) | | |
| ![59-phone2-podium-phone2.jpg](59-phone2-podium-phone2.jpg) | | |
| ![60-phone3-podium-phone3.jpg](60-phone3-podium-phone3.jpg) | | |
| ![61-host-continue-picker.jpg](61-host-continue-picker.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![19-strip-reveal.jpg](19-strip-reveal.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator visual review (2026-11-18)

Looked at every TV still (15) on a contact sheet. Settled stills throughout; swap stills show cards
mid-move by design (the swap is the subject). Secrecy as in the 8-phone run; scores, reveal lines and
podium agree with the phones. The 1280 × 720 podium shows the shell hint drawn at 1080 size beside
the scaled board (C-18, in progress).
