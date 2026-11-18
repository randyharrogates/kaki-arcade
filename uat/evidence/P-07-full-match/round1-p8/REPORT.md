# P-07-full-match UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- P-07-full-match --phones 8 --max-mb 24 --out round1-p8`
Commit: `6f8f11955b651b4ada86ca3e284bae784be5c4df`
Viewports: 1920×1080, 844×390, 1280×720

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1130.4 | completed |
| Lobby: all phones join through real pairing | 2063.0 | completed |
| Picker → default five rounds → Start real Peek Poker | 1288.3 | completed |
| R1 PP-002/003/004/011: deal, memorise timer and swap difficulty | 9939.0 | completed |
| R1 PP-005/006/021: early and late private picks; TV lock seats only | 11743.1 | completed |
| R1 PP-020/021 PLAT-033: every pre-reveal public view is secret | 3.8 | completed |
| R1 PP-020: every decoded phone message contains only its own selection | 0.8 | completed |
| R1 PP-020/021: every sampled pick DOM frame has no early reveal | 212.4 | completed |
| R1 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 4613.7 | completed |
| R1 PP-032: scoreboard and every phone’s own place and score | 3632.9 | completed |
| R2 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6525.8 | completed |
| R2 PP-005/006/021: early and late private picks; TV lock seats only | 10267.9 | completed |
| R2 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.5 | completed |
| R2 PP-020: every decoded phone message contains only its own selection | 0.4 | completed |
| R2 PP-020/021: every sampled pick DOM frame has no early reveal | 154.5 | completed |
| R2 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3421.0 | completed |
| R2 PP-032: scoreboard and every phone’s own place and score | 2822.7 | completed |
| R3 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6864.2 | completed |
| R3 PP-005/006/021: early and late private picks; TV lock seats only | 10209.6 | completed |
| R3 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.8 | completed |
| R3 PP-020: every decoded phone message contains only its own selection | 0.4 | completed |
| R3 PP-020/021: every sampled pick DOM frame has no early reveal | 157.2 | completed |
| R3 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3450.6 | completed |
| R3 PP-032: scoreboard and every phone’s own place and score | 2868.2 | completed |
| R4 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6055.6 | completed |
| R4 PP-005/006/021: early and late private picks; TV lock seats only | 10214.7 | completed |
| R4 PP-020/021 PLAT-033: every pre-reveal public view is secret | 0.9 | completed |
| R4 PP-020: every decoded phone message contains only its own selection | 0.4 | completed |
| R4 PP-020/021: every sampled pick DOM frame has no early reveal | 153.2 | completed |
| R4 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3446.6 | completed |
| R4 PP-032: scoreboard and every phone’s own place and score | 2863.5 | completed |
| R5 PP-002/003/004/011: deal, memorise timer and swap difficulty | 8910.5 | completed |
| R5 PP-005/006/021: early and late private picks; TV lock seats only | 11845.1 | completed |
| R5 PP-020/021 PLAT-033: every pre-reveal public view is secret | 0.9 | completed |
| R5 PP-020: every decoded phone message contains only its own selection | 0.4 | completed |
| R5 PP-020/021: every sampled pick DOM frame has no early reveal | 191.5 | completed |
| R5 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 4129.3 | completed |
| R5 PP-032: scoreboard and every phone’s own place and score | 3567.1 | completed |
| PP-001/032: final podium at 1920 and 1280, own final stats, Continue → picker | 1964.6 | completed |

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
| ![19-host-r1-locked-tv.jpg](19-host-r1-locked-tv.jpg) | | |
| ![20-phone1-r1-locked-phone1.jpg](20-phone1-r1-locked-phone1.jpg) | | |
| ![21-phone2-r1-locked-phone2.jpg](21-phone2-r1-locked-phone2.jpg) | | |
| ![22-phone3-r1-locked-phone3.jpg](22-phone3-r1-locked-phone3.jpg) | | |
| ![23-phone4-r1-locked-phone4.jpg](23-phone4-r1-locked-phone4.jpg) | | |
| ![24-phone5-r1-locked-phone5.jpg](24-phone5-r1-locked-phone5.jpg) | | |
| ![25-phone6-r1-locked-phone6.jpg](25-phone6-r1-locked-phone6.jpg) | | |
| ![26-phone7-r1-locked-phone7.jpg](26-phone7-r1-locked-phone7.jpg) | | |
| ![27-phone8-r1-locked-phone8.jpg](27-phone8-r1-locked-phone8.jpg) | | |
| ![35-host-r1-reveal-tv.jpg](35-host-r1-reveal-tv.jpg) | | |
| ![36-phone1-r1-reveal-phone1.jpg](36-phone1-r1-reveal-phone1.jpg) | | |
| ![37-phone2-r1-reveal-phone2.jpg](37-phone2-r1-reveal-phone2.jpg) | | |
| ![38-phone3-r1-reveal-phone3.jpg](38-phone3-r1-reveal-phone3.jpg) | | |
| ![39-phone4-r1-reveal-phone4.jpg](39-phone4-r1-reveal-phone4.jpg) | | |
| ![40-phone5-r1-reveal-phone5.jpg](40-phone5-r1-reveal-phone5.jpg) | | |
| ![41-phone6-r1-reveal-phone6.jpg](41-phone6-r1-reveal-phone6.jpg) | | |
| ![42-phone7-r1-reveal-phone7.jpg](42-phone7-r1-reveal-phone7.jpg) | | |
| ![43-phone8-r1-reveal-phone8.jpg](43-phone8-r1-reveal-phone8.jpg) | | |
| ![44-host-r1-seat-markers-7.jpg](44-host-r1-seat-markers-7.jpg) | | |
| ![45-host-r1-scoreboard-tv.jpg](45-host-r1-scoreboard-tv.jpg) | | |
| ![46-phone1-r1-scoreboard-phone1.jpg](46-phone1-r1-scoreboard-phone1.jpg) | | |
| ![47-phone2-r1-scoreboard-phone2.jpg](47-phone2-r1-scoreboard-phone2.jpg) | | |
| ![48-phone3-r1-scoreboard-phone3.jpg](48-phone3-r1-scoreboard-phone3.jpg) | | |
| ![49-phone4-r1-scoreboard-phone4.jpg](49-phone4-r1-scoreboard-phone4.jpg) | | |
| ![50-phone5-r1-scoreboard-phone5.jpg](50-phone5-r1-scoreboard-phone5.jpg) | | |
| ![51-phone6-r1-scoreboard-phone6.jpg](51-phone6-r1-scoreboard-phone6.jpg) | | |
| ![52-phone7-r1-scoreboard-phone7.jpg](52-phone7-r1-scoreboard-phone7.jpg) | | |
| ![53-phone8-r1-scoreboard-phone8.jpg](53-phone8-r1-scoreboard-phone8.jpg) | | |
| ![54-host-r2-seat-markers-7.jpg](54-host-r2-seat-markers-7.jpg) | | |
| ![55-host-r3-seat-markers-7.jpg](55-host-r3-seat-markers-7.jpg) | | |
| ![56-host-r4-seat-markers-7.jpg](56-host-r4-seat-markers-7.jpg) | | |
| ![57-host-r5-memorise-tv.jpg](57-host-r5-memorise-tv.jpg) | | |
| ![58-phone1-r5-memorise-phone1.jpg](58-phone1-r5-memorise-phone1.jpg) | | |
| ![59-phone2-r5-memorise-phone2.jpg](59-phone2-r5-memorise-phone2.jpg) | | |
| ![60-phone3-r5-memorise-phone3.jpg](60-phone3-r5-memorise-phone3.jpg) | | |
| ![61-phone4-r5-memorise-phone4.jpg](61-phone4-r5-memorise-phone4.jpg) | | |
| ![62-phone5-r5-memorise-phone5.jpg](62-phone5-r5-memorise-phone5.jpg) | | |
| ![63-phone6-r5-memorise-phone6.jpg](63-phone6-r5-memorise-phone6.jpg) | | |
| ![64-phone7-r5-memorise-phone7.jpg](64-phone7-r5-memorise-phone7.jpg) | | |
| ![65-phone8-r5-memorise-phone8.jpg](65-phone8-r5-memorise-phone8.jpg) | | |
| ![66-host-r5-swap1-tv.jpg](66-host-r5-swap1-tv.jpg) | | |
| ![67-phone1-r5-swap1-phone1.jpg](67-phone1-r5-swap1-phone1.jpg) | | |
| ![68-phone2-r5-swap1-phone2.jpg](68-phone2-r5-swap1-phone2.jpg) | | |
| ![69-phone3-r5-swap1-phone3.jpg](69-phone3-r5-swap1-phone3.jpg) | | |
| ![70-phone4-r5-swap1-phone4.jpg](70-phone4-r5-swap1-phone4.jpg) | | |
| ![71-phone5-r5-swap1-phone5.jpg](71-phone5-r5-swap1-phone5.jpg) | | |
| ![72-phone6-r5-swap1-phone6.jpg](72-phone6-r5-swap1-phone6.jpg) | | |
| ![73-phone7-r5-swap1-phone7.jpg](73-phone7-r5-swap1-phone7.jpg) | | |
| ![74-phone8-r5-swap1-phone8.jpg](74-phone8-r5-swap1-phone8.jpg) | | |
| ![75-host-r5-swap2-tv.jpg](75-host-r5-swap2-tv.jpg) | | |
| ![76-phone1-r5-swap2-phone1.jpg](76-phone1-r5-swap2-phone1.jpg) | | |
| ![77-phone2-r5-swap2-phone2.jpg](77-phone2-r5-swap2-phone2.jpg) | | |
| ![78-phone3-r5-swap2-phone3.jpg](78-phone3-r5-swap2-phone3.jpg) | | |
| ![79-phone4-r5-swap2-phone4.jpg](79-phone4-r5-swap2-phone4.jpg) | | |
| ![80-phone5-r5-swap2-phone5.jpg](80-phone5-r5-swap2-phone5.jpg) | | |
| ![81-phone6-r5-swap2-phone6.jpg](81-phone6-r5-swap2-phone6.jpg) | | |
| ![82-phone7-r5-swap2-phone7.jpg](82-phone7-r5-swap2-phone7.jpg) | | |
| ![83-phone8-r5-swap2-phone8.jpg](83-phone8-r5-swap2-phone8.jpg) | | |
| ![84-host-r5-pick-tv.jpg](84-host-r5-pick-tv.jpg) | | |
| ![85-phone1-r5-pick-phone1.jpg](85-phone1-r5-pick-phone1.jpg) | | |
| ![86-phone2-r5-pick-phone2.jpg](86-phone2-r5-pick-phone2.jpg) | | |
| ![87-phone3-r5-pick-phone3.jpg](87-phone3-r5-pick-phone3.jpg) | | |
| ![88-phone4-r5-pick-phone4.jpg](88-phone4-r5-pick-phone4.jpg) | | |
| ![89-phone5-r5-pick-phone5.jpg](89-phone5-r5-pick-phone5.jpg) | | |
| ![90-phone6-r5-pick-phone6.jpg](90-phone6-r5-pick-phone6.jpg) | | |
| ![91-phone7-r5-pick-phone7.jpg](91-phone7-r5-pick-phone7.jpg) | | |
| ![92-phone8-r5-pick-phone8.jpg](92-phone8-r5-pick-phone8.jpg) | | |
| ![93-host-r5-locked-tv.jpg](93-host-r5-locked-tv.jpg) | | |
| ![94-phone1-r5-locked-phone1.jpg](94-phone1-r5-locked-phone1.jpg) | | |
| ![95-phone2-r5-locked-phone2.jpg](95-phone2-r5-locked-phone2.jpg) | | |
| ![96-phone3-r5-locked-phone3.jpg](96-phone3-r5-locked-phone3.jpg) | | |
| ![97-phone4-r5-locked-phone4.jpg](97-phone4-r5-locked-phone4.jpg) | | |
| ![98-phone5-r5-locked-phone5.jpg](98-phone5-r5-locked-phone5.jpg) | | |
| ![99-phone6-r5-locked-phone6.jpg](99-phone6-r5-locked-phone6.jpg) | | |
| ![100-phone7-r5-locked-phone7.jpg](100-phone7-r5-locked-phone7.jpg) | | |
| ![101-phone8-r5-locked-phone8.jpg](101-phone8-r5-locked-phone8.jpg) | | |
| ![102-host-r5-reveal-tv.jpg](102-host-r5-reveal-tv.jpg) | | |
| ![103-phone1-r5-reveal-phone1.jpg](103-phone1-r5-reveal-phone1.jpg) | | |
| ![104-phone2-r5-reveal-phone2.jpg](104-phone2-r5-reveal-phone2.jpg) | | |
| ![105-phone3-r5-reveal-phone3.jpg](105-phone3-r5-reveal-phone3.jpg) | | |
| ![106-phone4-r5-reveal-phone4.jpg](106-phone4-r5-reveal-phone4.jpg) | | |
| ![107-phone5-r5-reveal-phone5.jpg](107-phone5-r5-reveal-phone5.jpg) | | |
| ![108-phone6-r5-reveal-phone6.jpg](108-phone6-r5-reveal-phone6.jpg) | | |
| ![109-phone7-r5-reveal-phone7.jpg](109-phone7-r5-reveal-phone7.jpg) | | |
| ![110-phone8-r5-reveal-phone8.jpg](110-phone8-r5-reveal-phone8.jpg) | | |
| ![111-host-r5-seat-markers-7.jpg](111-host-r5-seat-markers-7.jpg) | | |
| ![112-host-r5-scoreboard-tv.jpg](112-host-r5-scoreboard-tv.jpg) | | |
| ![113-phone1-r5-scoreboard-phone1.jpg](113-phone1-r5-scoreboard-phone1.jpg) | | |
| ![114-phone2-r5-scoreboard-phone2.jpg](114-phone2-r5-scoreboard-phone2.jpg) | | |
| ![115-phone3-r5-scoreboard-phone3.jpg](115-phone3-r5-scoreboard-phone3.jpg) | | |
| ![116-phone4-r5-scoreboard-phone4.jpg](116-phone4-r5-scoreboard-phone4.jpg) | | |
| ![117-phone5-r5-scoreboard-phone5.jpg](117-phone5-r5-scoreboard-phone5.jpg) | | |
| ![118-phone6-r5-scoreboard-phone6.jpg](118-phone6-r5-scoreboard-phone6.jpg) | | |
| ![119-phone7-r5-scoreboard-phone7.jpg](119-phone7-r5-scoreboard-phone7.jpg) | | |
| ![120-phone8-r5-scoreboard-phone8.jpg](120-phone8-r5-scoreboard-phone8.jpg) | | |
| ![121-host-podium-1920.jpg](121-host-podium-1920.jpg) | | |
| ![122-host-podium-1280.jpg](122-host-podium-1280.jpg) | | |
| ![123-phone1-podium-phone1.jpg](123-phone1-podium-phone1.jpg) | | |
| ![124-phone2-podium-phone2.jpg](124-phone2-podium-phone2.jpg) | | |
| ![125-phone3-podium-phone3.jpg](125-phone3-podium-phone3.jpg) | | |
| ![126-phone4-podium-phone4.jpg](126-phone4-podium-phone4.jpg) | | |
| ![127-phone5-podium-phone5.jpg](127-phone5-podium-phone5.jpg) | | |
| ![128-phone6-podium-phone6.jpg](128-phone6-podium-phone6.jpg) | | |
| ![129-phone7-podium-phone7.jpg](129-phone7-podium-phone7.jpg) | | |
| ![130-phone8-podium-phone8.jpg](130-phone8-podium-phone8.jpg) | | |
| ![131-host-continue-picker.jpg](131-host-continue-picker.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![34-strip-reveal.jpg](34-strip-reveal.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator visual review (2026-11-18)

Looked at every TV still and a contact sheet of phones 1 and 8 at each phase, plus the reveal strip.
Stills are settled (round 2's wait): 01 memorise, 121 podium at 1920 and 131 the picker show no
crossfade or stagger. During every pick phase the TV seat list reads only Picking or Picked; cards
stay face down. Player 8 never picked: the reveal filled their two cards at random and their phone
says "Missing picks were filled at random" (43). OQ-043: seven seat markers on one card stack in two
rows of 4 and 3 and stay readable at 1080p (44, 111). Places and scores agree between the TV and every
phone after rounds 1 and 5 and on the podium; ties show as "=6". The phone's "✕ Continue" uses the
cross face button as confirm (DESIGN §4, PlayStation layout), not a cancel mark. Not covered: real
phones and a real TV.
