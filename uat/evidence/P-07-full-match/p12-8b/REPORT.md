# P-07-full-match UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- P-07-full-match --phones 8 --max-mb 18 --timeout-min 25 --out p12-8b`
Commit: `cea706ab7058975b277de4fc69c2195b52181448`
Viewports: 1920×1080, 844×390, 1280×720

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1933.1 | completed |
| Lobby: all phones join through real pairing | 3300.6 | completed |
| Picker → default five rounds → Start real Peek Poker | 1636.7 | completed |
| R1 PP-002/003/004/011: deal, memorise timer and swap difficulty | 12097.1 | completed |
| R1 PP-005/006/021: early and late private picks; TV lock seats only | 12463.3 | completed |
| R1 PP-020/021 PLAT-033: every pre-reveal public view is secret | 7.3 | completed |
| R1 PP-020: every decoded control-channel message is secret before reveal | 4.2 | completed |
| R1 PP-020/021: every sampled pick DOM frame has no early reveal | 480.9 | completed |
| R1 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 5818.1 | completed |
| R1 PP-032: scoreboard and every phone’s own place and score | 3626.4 | completed |
| R2 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6717.1 | completed |
| R2 PP-005/006/021: early and late private picks; TV lock seats only | 10432.6 | completed |
| R2 PP-020/021 PLAT-033: every pre-reveal public view is secret | 6.0 | completed |
| R2 PP-020: every decoded control-channel message is secret before reveal | 2.1 | completed |
| R2 PP-020/021: every sampled pick DOM frame has no early reveal | 398.6 | completed |
| R2 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3767.6 | completed |
| R2 PP-032: scoreboard and every phone’s own place and score | 2913.0 | completed |
| R3 PP-002/003/004/011: deal, memorise timer and swap difficulty | 7166.8 | completed |
| R3 PP-005/006/021: early and late private picks; TV lock seats only | 10414.9 | completed |
| R3 PP-020/021 PLAT-033: every pre-reveal public view is secret | 2.3 | completed |
| R3 PP-020: every decoded control-channel message is secret before reveal | 1.7 | completed |
| R3 PP-020/021: every sampled pick DOM frame has no early reveal | 329.0 | completed |
| R3 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3672.9 | completed |
| R3 PP-032: scoreboard and every phone’s own place and score | 2876.6 | completed |
| R4 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6307.2 | completed |
| R4 PP-005/006/021: early and late private picks; TV lock seats only | 10426.0 | completed |
| R4 PP-020/021 PLAT-033: every pre-reveal public view is secret | 4.8 | completed |
| R4 PP-020: every decoded control-channel message is secret before reveal | 2.1 | completed |
| R4 PP-020/021: every sampled pick DOM frame has no early reveal | 439.8 | completed |
| R4 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3704.0 | completed |
| R4 PP-032: scoreboard and every phone’s own place and score | 2881.5 | completed |
| R5 PP-002/003/004/011: deal, memorise timer and swap difficulty | 9507.5 | completed |
| R5 PP-005/006/021: early and late private picks; TV lock seats only | 11880.3 | completed |
| R5 PP-020/021 PLAT-033: every pre-reveal public view is secret | 3.6 | completed |
| R5 PP-020: every decoded control-channel message is secret before reveal | 2.5 | completed |
| R5 PP-020/021: every sampled pick DOM frame has no early reveal | 407.1 | completed |
| R5 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 4623.9 | completed |
| R5 PP-032: scoreboard and every phone’s own place and score | 3289.9 | completed |
| PP-001/032: final podium at 1920 and 1280, own final stats, Continue → picker | 2093.1 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-r1-memorise-tv.jpg](01-host-r1-memorise-tv.jpg) | | |
| ![02-phone1-r1-memorise-phone1.jpg](02-phone1-r1-memorise-phone1.jpg) | | |
| ![03-phone2-r1-memorise-phone2.jpg](03-phone2-r1-memorise-phone2.jpg) | | |
| ![04-phone3-r1-memorise-phone3.jpg](04-phone3-r1-memorise-phone3.jpg) | | |
| ![05-phone4-r1-memorise-phone4.jpg](05-phone4-r1-memorise-phone4.jpg) | | |
| ![06-phone5-r1-memorise-phone5.jpg](06-phone5-r1-memorise-phone5.jpg) | | |
| ![07-phone6-r1-memorise-phone6.jpg](07-phone6-r1-memorise-phone6.jpg) | | |
| ![08-phone7-r1-memorise-phone7.jpg](08-phone7-r1-memorise-phone7.jpg) | | |
| ![09-phone8-r1-memorise-phone8.jpg](09-phone8-r1-memorise-phone8.jpg) | | |
| ![10-host-r1-pick-tv.jpg](10-host-r1-pick-tv.jpg) | | |
| ![11-phone1-r1-pick-phone1.jpg](11-phone1-r1-pick-phone1.jpg) | | |
| ![12-phone2-r1-pick-phone2.jpg](12-phone2-r1-pick-phone2.jpg) | | |
| ![13-phone3-r1-pick-phone3.jpg](13-phone3-r1-pick-phone3.jpg) | | |
| ![14-phone4-r1-pick-phone4.jpg](14-phone4-r1-pick-phone4.jpg) | | |
| ![15-phone5-r1-pick-phone5.jpg](15-phone5-r1-pick-phone5.jpg) | | |
| ![16-phone6-r1-pick-phone6.jpg](16-phone6-r1-pick-phone6.jpg) | | |
| ![17-phone7-r1-pick-phone7.jpg](17-phone7-r1-pick-phone7.jpg) | | |
| ![18-phone8-r1-pick-phone8.jpg](18-phone8-r1-pick-phone8.jpg) | | |
| ![19-phone1-r1-phone1-two-selected.jpg](19-phone1-r1-phone1-two-selected.jpg) | | |
| ![20-host-r1-locked-tv.jpg](20-host-r1-locked-tv.jpg) | | |
| ![21-phone1-r1-locked-phone1.jpg](21-phone1-r1-locked-phone1.jpg) | | |
| ![22-phone2-r1-locked-phone2.jpg](22-phone2-r1-locked-phone2.jpg) | | |
| ![23-phone3-r1-locked-phone3.jpg](23-phone3-r1-locked-phone3.jpg) | | |
| ![24-phone4-r1-locked-phone4.jpg](24-phone4-r1-locked-phone4.jpg) | | |
| ![25-phone5-r1-locked-phone5.jpg](25-phone5-r1-locked-phone5.jpg) | | |
| ![26-phone6-r1-locked-phone6.jpg](26-phone6-r1-locked-phone6.jpg) | | |
| ![27-phone7-r1-locked-phone7.jpg](27-phone7-r1-locked-phone7.jpg) | | |
| ![28-phone8-r1-locked-phone8.jpg](28-phone8-r1-locked-phone8.jpg) | | |
| ![36-host-r1-reveal-tv.jpg](36-host-r1-reveal-tv.jpg) | | |
| ![37-phone1-r1-reveal-phone1.jpg](37-phone1-r1-reveal-phone1.jpg) | | |
| ![38-phone2-r1-reveal-phone2.jpg](38-phone2-r1-reveal-phone2.jpg) | | |
| ![39-phone3-r1-reveal-phone3.jpg](39-phone3-r1-reveal-phone3.jpg) | | |
| ![40-phone4-r1-reveal-phone4.jpg](40-phone4-r1-reveal-phone4.jpg) | | |
| ![41-phone5-r1-reveal-phone5.jpg](41-phone5-r1-reveal-phone5.jpg) | | |
| ![42-phone6-r1-reveal-phone6.jpg](42-phone6-r1-reveal-phone6.jpg) | | |
| ![43-phone7-r1-reveal-phone7.jpg](43-phone7-r1-reveal-phone7.jpg) | | |
| ![44-phone8-r1-reveal-phone8.jpg](44-phone8-r1-reveal-phone8.jpg) | | |
| ![45-host-r1-seat-markers-7.jpg](45-host-r1-seat-markers-7.jpg) | | |
| ![46-host-r1-scoreboard-tv.jpg](46-host-r1-scoreboard-tv.jpg) | | |
| ![47-phone1-r1-scoreboard-phone1.jpg](47-phone1-r1-scoreboard-phone1.jpg) | | |
| ![48-phone2-r1-scoreboard-phone2.jpg](48-phone2-r1-scoreboard-phone2.jpg) | | |
| ![49-phone3-r1-scoreboard-phone3.jpg](49-phone3-r1-scoreboard-phone3.jpg) | | |
| ![50-phone4-r1-scoreboard-phone4.jpg](50-phone4-r1-scoreboard-phone4.jpg) | | |
| ![51-phone5-r1-scoreboard-phone5.jpg](51-phone5-r1-scoreboard-phone5.jpg) | | |
| ![52-phone6-r1-scoreboard-phone6.jpg](52-phone6-r1-scoreboard-phone6.jpg) | | |
| ![53-phone7-r1-scoreboard-phone7.jpg](53-phone7-r1-scoreboard-phone7.jpg) | | |
| ![54-phone8-r1-scoreboard-phone8.jpg](54-phone8-r1-scoreboard-phone8.jpg) | | |
| ![55-host-r2-seat-markers-7.jpg](55-host-r2-seat-markers-7.jpg) | | |
| ![56-host-r3-seat-markers-7.jpg](56-host-r3-seat-markers-7.jpg) | | |
| ![57-host-r4-seat-markers-8.jpg](57-host-r4-seat-markers-8.jpg) | | |
| ![58-host-r5-memorise-tv.jpg](58-host-r5-memorise-tv.jpg) | | |
| ![59-phone1-r5-memorise-phone1.jpg](59-phone1-r5-memorise-phone1.jpg) | | |
| ![60-phone2-r5-memorise-phone2.jpg](60-phone2-r5-memorise-phone2.jpg) | | |
| ![61-phone3-r5-memorise-phone3.jpg](61-phone3-r5-memorise-phone3.jpg) | | |
| ![62-phone4-r5-memorise-phone4.jpg](62-phone4-r5-memorise-phone4.jpg) | | |
| ![63-phone5-r5-memorise-phone5.jpg](63-phone5-r5-memorise-phone5.jpg) | | |
| ![64-phone6-r5-memorise-phone6.jpg](64-phone6-r5-memorise-phone6.jpg) | | |
| ![65-phone7-r5-memorise-phone7.jpg](65-phone7-r5-memorise-phone7.jpg) | | |
| ![66-phone8-r5-memorise-phone8.jpg](66-phone8-r5-memorise-phone8.jpg) | | |
| ![67-host-r5-swap1-tv.jpg](67-host-r5-swap1-tv.jpg) | | |
| ![68-phone1-r5-swap1-phone1.jpg](68-phone1-r5-swap1-phone1.jpg) | | |
| ![69-phone2-r5-swap1-phone2.jpg](69-phone2-r5-swap1-phone2.jpg) | | |
| ![70-phone3-r5-swap1-phone3.jpg](70-phone3-r5-swap1-phone3.jpg) | | |
| ![71-phone4-r5-swap1-phone4.jpg](71-phone4-r5-swap1-phone4.jpg) | | |
| ![72-phone5-r5-swap1-phone5.jpg](72-phone5-r5-swap1-phone5.jpg) | | |
| ![73-phone6-r5-swap1-phone6.jpg](73-phone6-r5-swap1-phone6.jpg) | | |
| ![74-phone7-r5-swap1-phone7.jpg](74-phone7-r5-swap1-phone7.jpg) | | |
| ![75-phone8-r5-swap1-phone8.jpg](75-phone8-r5-swap1-phone8.jpg) | | |
| ![76-host-r5-swap2-tv.jpg](76-host-r5-swap2-tv.jpg) | | |
| ![77-phone1-r5-swap2-phone1.jpg](77-phone1-r5-swap2-phone1.jpg) | | |
| ![78-phone2-r5-swap2-phone2.jpg](78-phone2-r5-swap2-phone2.jpg) | | |
| ![79-phone3-r5-swap2-phone3.jpg](79-phone3-r5-swap2-phone3.jpg) | | |
| ![80-phone4-r5-swap2-phone4.jpg](80-phone4-r5-swap2-phone4.jpg) | | |
| ![81-phone5-r5-swap2-phone5.jpg](81-phone5-r5-swap2-phone5.jpg) | | |
| ![82-phone6-r5-swap2-phone6.jpg](82-phone6-r5-swap2-phone6.jpg) | | |
| ![83-phone7-r5-swap2-phone7.jpg](83-phone7-r5-swap2-phone7.jpg) | | |
| ![84-phone8-r5-swap2-phone8.jpg](84-phone8-r5-swap2-phone8.jpg) | | |
| ![85-host-r5-pick-tv.jpg](85-host-r5-pick-tv.jpg) | | |
| ![86-phone1-r5-pick-phone1.jpg](86-phone1-r5-pick-phone1.jpg) | | |
| ![87-phone2-r5-pick-phone2.jpg](87-phone2-r5-pick-phone2.jpg) | | |
| ![88-phone3-r5-pick-phone3.jpg](88-phone3-r5-pick-phone3.jpg) | | |
| ![89-phone4-r5-pick-phone4.jpg](89-phone4-r5-pick-phone4.jpg) | | |
| ![90-phone5-r5-pick-phone5.jpg](90-phone5-r5-pick-phone5.jpg) | | |
| ![91-phone6-r5-pick-phone6.jpg](91-phone6-r5-pick-phone6.jpg) | | |
| ![92-phone7-r5-pick-phone7.jpg](92-phone7-r5-pick-phone7.jpg) | | |
| ![93-phone8-r5-pick-phone8.jpg](93-phone8-r5-pick-phone8.jpg) | | |
| ![94-host-r5-locked-tv.jpg](94-host-r5-locked-tv.jpg) | | |
| ![95-phone1-r5-locked-phone1.jpg](95-phone1-r5-locked-phone1.jpg) | | |
| ![96-phone2-r5-locked-phone2.jpg](96-phone2-r5-locked-phone2.jpg) | | |
| ![97-phone3-r5-locked-phone3.jpg](97-phone3-r5-locked-phone3.jpg) | | |
| ![98-phone4-r5-locked-phone4.jpg](98-phone4-r5-locked-phone4.jpg) | | |
| ![99-phone5-r5-locked-phone5.jpg](99-phone5-r5-locked-phone5.jpg) | | |
| ![100-phone6-r5-locked-phone6.jpg](100-phone6-r5-locked-phone6.jpg) | | |
| ![101-phone7-r5-locked-phone7.jpg](101-phone7-r5-locked-phone7.jpg) | | |
| ![102-phone8-r5-locked-phone8.jpg](102-phone8-r5-locked-phone8.jpg) | | |
| ![103-host-r5-reveal-tv.jpg](103-host-r5-reveal-tv.jpg) | | |
| ![104-phone1-r5-reveal-phone1.jpg](104-phone1-r5-reveal-phone1.jpg) | | |
| ![105-phone2-r5-reveal-phone2.jpg](105-phone2-r5-reveal-phone2.jpg) | | |
| ![106-phone3-r5-reveal-phone3.jpg](106-phone3-r5-reveal-phone3.jpg) | | |
| ![107-phone4-r5-reveal-phone4.jpg](107-phone4-r5-reveal-phone4.jpg) | | |
| ![108-phone5-r5-reveal-phone5.jpg](108-phone5-r5-reveal-phone5.jpg) | | |
| ![109-phone6-r5-reveal-phone6.jpg](109-phone6-r5-reveal-phone6.jpg) | | |
| ![110-phone7-r5-reveal-phone7.jpg](110-phone7-r5-reveal-phone7.jpg) | | |
| ![111-phone8-r5-reveal-phone8.jpg](111-phone8-r5-reveal-phone8.jpg) | | |
| ![112-host-r5-seat-markers-8.jpg](112-host-r5-seat-markers-8.jpg) | | |
| ![113-host-r5-scoreboard-tv.jpg](113-host-r5-scoreboard-tv.jpg) | | |
| ![114-phone1-r5-scoreboard-phone1.jpg](114-phone1-r5-scoreboard-phone1.jpg) | | |
| ![115-phone2-r5-scoreboard-phone2.jpg](115-phone2-r5-scoreboard-phone2.jpg) | | |
| ![116-phone3-r5-scoreboard-phone3.jpg](116-phone3-r5-scoreboard-phone3.jpg) | | |
| ![117-phone4-r5-scoreboard-phone4.jpg](117-phone4-r5-scoreboard-phone4.jpg) | | |
| ![118-phone5-r5-scoreboard-phone5.jpg](118-phone5-r5-scoreboard-phone5.jpg) | | |
| ![119-phone6-r5-scoreboard-phone6.jpg](119-phone6-r5-scoreboard-phone6.jpg) | | |
| ![120-phone7-r5-scoreboard-phone7.jpg](120-phone7-r5-scoreboard-phone7.jpg) | | |
| ![121-phone8-r5-scoreboard-phone8.jpg](121-phone8-r5-scoreboard-phone8.jpg) | | |
| ![122-host-podium-1920.jpg](122-host-podium-1920.jpg) | | |
| ![123-host-podium-1280.jpg](123-host-podium-1280.jpg) | | |
| ![124-phone1-podium-phone1.jpg](124-phone1-podium-phone1.jpg) | | |
| ![125-phone2-podium-phone2.jpg](125-phone2-podium-phone2.jpg) | | |
| ![126-phone3-podium-phone3.jpg](126-phone3-podium-phone3.jpg) | | |
| ![127-phone4-podium-phone4.jpg](127-phone4-podium-phone4.jpg) | | |
| ![128-phone5-podium-phone5.jpg](128-phone5-podium-phone5.jpg) | | |
| ![129-phone6-podium-phone6.jpg](129-phone6-podium-phone6.jpg) | | |
| ![130-phone7-podium-phone7.jpg](130-phone7-podium-phone7.jpg) | | |
| ![131-phone8-podium-phone8.jpg](131-phone8-podium-phone8.jpg) | | |
| ![132-host-continue-picker.jpg](132-host-continue-picker.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![35-strip-reveal.jpg](35-strip-reveal.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
