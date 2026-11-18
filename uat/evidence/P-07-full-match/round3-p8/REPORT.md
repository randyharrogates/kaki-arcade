# P-07-full-match UAT evidence

Accepted for P-07 full-match and secrecy coverage, with the final-round scoreboard copy defect recorded for P-10. PP-032 visual acceptance remains qualified by that defect. Integrator review: Claude, 2026-11-18. Round 5 report completion: Codex, 2026-11-18 (all listed images opened in contact sheets; detailed reveal images and strips also opened at full size).

Command: `node tools/uat/run.mjs -- P-07-full-match --phones 8 --max-mb 24 --timeout-min 20 --out round3-p8`
Commit: `5d8be7e48d0f6f6ca20ae5d82b03bb434dc80e5f`
Viewports: 1920×1080, 844×390, 1280×720

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1272.8 | completed |
| Lobby: all phones join through real pairing | 1967.0 | completed |
| Picker → default five rounds → Start real Peek Poker | 1304.2 | completed |
| R1 PP-002/003/004/011: deal, memorise timer and swap difficulty | 10045.2 | completed |
| R1 PP-005/006/021: early and late private picks; TV lock seats only | 12112.5 | completed |
| R1 PP-020/021 PLAT-033: every pre-reveal public view is secret | 3.5 | completed |
| R1 PP-020: every decoded control-channel message is secret before reveal | 2.0 | completed |
| R1 PP-020/021: every sampled pick DOM frame has no early reveal | 212.5 | completed |
| R1 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 4982.8 | completed |
| R1 PP-032: scoreboard and every phone’s own place and score | 3590.1 | completed |
| R2 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6504.1 | completed |
| R2 PP-005/006/021: early and late private picks; TV lock seats only | 10297.8 | completed |
| R2 PP-020/021 PLAT-033: every pre-reveal public view is secret | 2.1 | completed |
| R2 PP-020: every decoded control-channel message is secret before reveal | 1.4 | completed |
| R2 PP-020/021: every sampled pick DOM frame has no early reveal | 170.9 | completed |
| R2 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3646.2 | completed |
| R2 PP-032: scoreboard and every phone’s own place and score | 2896.7 | completed |
| R3 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6822.3 | completed |
| R3 PP-005/006/021: early and late private picks; TV lock seats only | 10447.8 | completed |
| R3 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.3 | completed |
| R3 PP-020: every decoded control-channel message is secret before reveal | 1.8 | completed |
| R3 PP-020/021: every sampled pick DOM frame has no early reveal | 164.2 | completed |
| R3 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3621.3 | completed |
| R3 PP-032: scoreboard and every phone’s own place and score | 2886.1 | completed |
| R4 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6034.5 | completed |
| R4 PP-005/006/021: early and late private picks; TV lock seats only | 10414.5 | completed |
| R4 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.6 | completed |
| R4 PP-020: every decoded control-channel message is secret before reveal | 0.7 | completed |
| R4 PP-020/021: every sampled pick DOM frame has no early reveal | 172.3 | completed |
| R4 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3612.0 | completed |
| R4 PP-032: scoreboard and every phone’s own place and score | 2886.3 | completed |
| R5 PP-002/003/004/011: deal, memorise timer and swap difficulty | 8991.8 | completed |
| R5 PP-005/006/021: early and late private picks; TV lock seats only | 11779.5 | completed |
| R5 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.8 | completed |
| R5 PP-020: every decoded control-channel message is secret before reveal | 0.9 | completed |
| R5 PP-020/021: every sampled pick DOM frame has no early reveal | 186.1 | completed |
| R5 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 4509.7 | completed |
| R5 PP-032: scoreboard and every phone’s own place and score | 3561.6 | completed |
| PP-001/032: final podium at 1920 and 1280, own final stats, Continue → picker | 2021.3 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-r1-memorise-tv.jpg](01-host-r1-memorise-tv.jpg) | Face-up 4 × 4 grid, three shared cards and memorise countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![02-phone1-r1-memorise-phone1.jpg](02-phone1-r1-memorise-phone1.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![03-phone2-r1-memorise-phone2.jpg](03-phone2-r1-memorise-phone2.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![04-phone3-r1-memorise-phone3.jpg](04-phone3-r1-memorise-phone3.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![05-phone4-r1-memorise-phone4.jpg](05-phone4-r1-memorise-phone4.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![06-phone5-r1-memorise-phone5.jpg](06-phone5-r1-memorise-phone5.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![07-phone6-r1-memorise-phone6.jpg](07-phone6-r1-memorise-phone6.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![08-phone7-r1-memorise-phone7.jpg](08-phone7-r1-memorise-phone7.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![09-phone8-r1-memorise-phone8.jpg](09-phone8-r1-memorise-phone8.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![10-host-r1-pick-tv.jpg](10-host-r1-pick-tv.jpg) | Face-down 4 × 4 grid, face-up shared cards, Picking labels and countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![11-phone1-r1-pick-phone1.jpg](11-phone1-r1-pick-phone1.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![12-phone2-r1-pick-phone2.jpg](12-phone2-r1-pick-phone2.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![13-phone3-r1-pick-phone3.jpg](13-phone3-r1-pick-phone3.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![14-phone4-r1-pick-phone4.jpg](14-phone4-r1-pick-phone4.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![15-phone5-r1-pick-phone5.jpg](15-phone5-r1-pick-phone5.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![16-phone6-r1-pick-phone6.jpg](16-phone6-r1-pick-phone6.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![17-phone7-r1-pick-phone7.jpg](17-phone7-r1-pick-phone7.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![18-phone8-r1-pick-phone8.jpg](18-phone8-r1-pick-phone8.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![19-phone1-r1-phone1-two-selected.jpg](19-phone1-r1-phone1-two-selected.jpg) | Two cells have thicker white frames; Lock in is light. | Claude, integrator review, 2026-11-18 |
| ![20-host-r1-locked-tv.jpg](20-host-r1-locked-tv.jpg) | Face-down grid, shared cards face up, Picked/Picking labels per seat. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![21-phone1-r1-locked-phone1.jpg](21-phone1-r1-locked-phone1.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![22-phone2-r1-locked-phone2.jpg](22-phone2-r1-locked-phone2.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![23-phone3-r1-locked-phone3.jpg](23-phone3-r1-locked-phone3.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![24-phone4-r1-locked-phone4.jpg](24-phone4-r1-locked-phone4.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![25-phone5-r1-locked-phone5.jpg](25-phone5-r1-locked-phone5.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![26-phone6-r1-locked-phone6.jpg](26-phone6-r1-locked-phone6.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![27-phone7-r1-locked-phone7.jpg](27-phone7-r1-locked-phone7.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![28-phone8-r1-locked-phone8.jpg](28-phone8-r1-locked-phone8.jpg) | Face-down 4 × 4 grid and grey Lock in for the idle seat. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![36-host-r1-reveal-tv.jpg](36-host-r1-reveal-tv.jpg) | Flipped grid and markers; Straight · 6/8 then pairs and high cards; countdown 7. | Claude, integrator review, 2026-11-18 |
| ![37-phone1-r1-reveal-phone1.jpg](37-phone1-r1-reveal-phone1.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![38-phone2-r1-reveal-phone2.jpg](38-phone2-r1-reveal-phone2.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![39-phone3-r1-reveal-phone3.jpg](39-phone3-r1-reveal-phone3.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![40-phone4-r1-reveal-phone4.jpg](40-phone4-r1-reveal-phone4.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![41-phone5-r1-reveal-phone5.jpg](41-phone5-r1-reveal-phone5.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![42-phone6-r1-reveal-phone6.jpg](42-phone6-r1-reveal-phone6.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![43-phone7-r1-reveal-phone7.jpg](43-phone7-r1-reveal-phone7.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![44-phone8-r1-reveal-phone8.jpg](44-phone8-r1-reveal-phone8.jpg) | Idle P8: 7♠ 4♣ Q♣ J♦ K♣, High card, 1 point; missing picks filled at random note. | Claude, integrator review, 2026-11-18 |
| ![45-host-r1-seat-markers-7.jpg](45-host-r1-seat-markers-7.jpg) | Seven markers on 9♣ in a 4 + 3 block; rank and corner suit readable. | Claude, integrator review, 2026-11-18 |
| ![46-host-r1-scoreboard-tv.jpg](46-host-r1-scoreboard-tv.jpg) | Scoreboard: P2 8 leads P1 6; tied places =3 and =6. | Claude, integrator review, 2026-11-18 |
| ![47-phone1-r1-scoreboard-phone1.jpg](47-phone1-r1-scoreboard-phone1.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![48-phone2-r1-scoreboard-phone2.jpg](48-phone2-r1-scoreboard-phone2.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![49-phone3-r1-scoreboard-phone3.jpg](49-phone3-r1-scoreboard-phone3.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![50-phone4-r1-scoreboard-phone4.jpg](50-phone4-r1-scoreboard-phone4.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![51-phone5-r1-scoreboard-phone5.jpg](51-phone5-r1-scoreboard-phone5.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![52-phone6-r1-scoreboard-phone6.jpg](52-phone6-r1-scoreboard-phone6.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![53-phone7-r1-scoreboard-phone7.jpg](53-phone7-r1-scoreboard-phone7.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![54-phone8-r1-scoreboard-phone8.jpg](54-phone8-r1-scoreboard-phone8.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![55-host-r2-seat-markers-7.jpg](55-host-r2-seat-markers-7.jpg) | Seven markers on K♣ in a 4 + 3 block; three best hands show Three of a kind · 5/7/5. | Claude, integrator review, 2026-11-18 |
| ![56-host-r3-seat-markers-8.jpg](56-host-r3-seat-markers-8.jpg) | Eight markers on A♠ in a 4 + 4 block; top-left rank/suit and centre rank readable; centre pip mostly covered. | Claude, integrator review, 2026-11-18 |
| ![57-host-r4-seat-markers-7.jpg](57-host-r4-seat-markers-7.jpg) | Seven markers on 8♦ in a 4 + 3 block; rank and corner suit readable. | Claude, integrator review, 2026-11-18 |
| ![58-host-r5-memorise-tv.jpg](58-host-r5-memorise-tv.jpg) | Face-up 4 × 4 grid, three shared cards and memorise countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![59-phone1-r5-memorise-phone1.jpg](59-phone1-r5-memorise-phone1.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![60-phone2-r5-memorise-phone2.jpg](60-phone2-r5-memorise-phone2.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![61-phone3-r5-memorise-phone3.jpg](61-phone3-r5-memorise-phone3.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![62-phone4-r5-memorise-phone4.jpg](62-phone4-r5-memorise-phone4.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![63-phone5-r5-memorise-phone5.jpg](63-phone5-r5-memorise-phone5.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![64-phone6-r5-memorise-phone6.jpg](64-phone6-r5-memorise-phone6.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![65-phone7-r5-memorise-phone7.jpg](65-phone7-r5-memorise-phone7.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![66-phone8-r5-memorise-phone8.jpg](66-phone8-r5-memorise-phone8.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![67-host-r5-swap1-tv.jpg](67-host-r5-swap1-tv.jpg) | Face-down cards offset during swap; shared cards remain face up. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![68-phone1-r5-swap1-phone1.jpg](68-phone1-r5-swap1-phone1.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![69-phone2-r5-swap1-phone2.jpg](69-phone2-r5-swap1-phone2.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![70-phone3-r5-swap1-phone3.jpg](70-phone3-r5-swap1-phone3.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![71-phone4-r5-swap1-phone4.jpg](71-phone4-r5-swap1-phone4.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![72-phone5-r5-swap1-phone5.jpg](72-phone5-r5-swap1-phone5.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![73-phone6-r5-swap1-phone6.jpg](73-phone6-r5-swap1-phone6.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![74-phone7-r5-swap1-phone7.jpg](74-phone7-r5-swap1-phone7.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![75-phone8-r5-swap1-phone8.jpg](75-phone8-r5-swap1-phone8.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![76-host-r5-swap2-tv.jpg](76-host-r5-swap2-tv.jpg) | Face-down cards offset during swap; shared cards remain face up. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![77-phone1-r5-swap2-phone1.jpg](77-phone1-r5-swap2-phone1.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![78-phone2-r5-swap2-phone2.jpg](78-phone2-r5-swap2-phone2.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![79-phone3-r5-swap2-phone3.jpg](79-phone3-r5-swap2-phone3.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![80-phone4-r5-swap2-phone4.jpg](80-phone4-r5-swap2-phone4.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![81-phone5-r5-swap2-phone5.jpg](81-phone5-r5-swap2-phone5.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![82-phone6-r5-swap2-phone6.jpg](82-phone6-r5-swap2-phone6.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![83-phone7-r5-swap2-phone7.jpg](83-phone7-r5-swap2-phone7.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![84-phone8-r5-swap2-phone8.jpg](84-phone8-r5-swap2-phone8.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![85-host-r5-pick-tv.jpg](85-host-r5-pick-tv.jpg) | Face-down 4 × 4 grid, face-up shared cards, Picking labels and countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![86-phone1-r5-pick-phone1.jpg](86-phone1-r5-pick-phone1.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![87-phone2-r5-pick-phone2.jpg](87-phone2-r5-pick-phone2.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![88-phone3-r5-pick-phone3.jpg](88-phone3-r5-pick-phone3.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![89-phone4-r5-pick-phone4.jpg](89-phone4-r5-pick-phone4.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![90-phone5-r5-pick-phone5.jpg](90-phone5-r5-pick-phone5.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![91-phone6-r5-pick-phone6.jpg](91-phone6-r5-pick-phone6.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![92-phone7-r5-pick-phone7.jpg](92-phone7-r5-pick-phone7.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![93-phone8-r5-pick-phone8.jpg](93-phone8-r5-pick-phone8.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![94-host-r5-locked-tv.jpg](94-host-r5-locked-tv.jpg) | Face-down grid; P1–P7 Picked, P8 Picking; shared cards face up. | Claude, integrator review, 2026-11-18 |
| ![95-phone1-r5-locked-phone1.jpg](95-phone1-r5-locked-phone1.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![96-phone2-r5-locked-phone2.jpg](96-phone2-r5-locked-phone2.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![97-phone3-r5-locked-phone3.jpg](97-phone3-r5-locked-phone3.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![98-phone4-r5-locked-phone4.jpg](98-phone4-r5-locked-phone4.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![99-phone5-r5-locked-phone5.jpg](99-phone5-r5-locked-phone5.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![100-phone6-r5-locked-phone6.jpg](100-phone6-r5-locked-phone6.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![101-phone7-r5-locked-phone7.jpg](101-phone7-r5-locked-phone7.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![102-phone8-r5-locked-phone8.jpg](102-phone8-r5-locked-phone8.jpg) | Face-down 4 × 4 grid and grey Lock in for the idle seat. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![103-host-r5-reveal-tv.jpg](103-host-r5-reveal-tv.jpg) | Flipped grid and markers; P1/P2/P3 Three of a kind · 5/7/5; countdown 7. | Claude, integrator review, 2026-11-18 |
| ![104-phone1-r5-reveal-phone1.jpg](104-phone1-r5-reveal-phone1.jpg) | P1: 6♥ 6♣ 6♦ 4♣ A♠, Three of a kind, 5 points. | Claude, integrator review, 2026-11-18 |
| ![105-phone2-r5-reveal-phone2.jpg](105-phone2-r5-reveal-phone2.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![106-phone3-r5-reveal-phone3.jpg](106-phone3-r5-reveal-phone3.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![107-phone4-r5-reveal-phone4.jpg](107-phone4-r5-reveal-phone4.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![108-phone5-r5-reveal-phone5.jpg](108-phone5-r5-reveal-phone5.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![109-phone6-r5-reveal-phone6.jpg](109-phone6-r5-reveal-phone6.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![110-phone7-r5-reveal-phone7.jpg](110-phone7-r5-reveal-phone7.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![111-phone8-r5-reveal-phone8.jpg](111-phone8-r5-reveal-phone8.jpg) | Five face-up cards, hand name and Points; idle seat also has the random-fill note. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![112-host-r5-seat-markers-7.jpg](112-host-r5-seat-markers-7.jpg) | Seven markers on 6♥ in a 4 + 3 block; rank and corner suit readable. | Claude, integrator review, 2026-11-18 |
| ![113-host-r5-scoreboard-tv.jpg](113-host-r5-scoreboard-tv.jpg) | R5 scoreboard: P2 33 leads, =4 tie at 10; wrongly says Next round in 5 seconds (P-10). | Claude, integrator review, 2026-11-18 |
| ![114-phone1-r5-scoreboard-phone1.jpg](114-phone1-r5-scoreboard-phone1.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![115-phone2-r5-scoreboard-phone2.jpg](115-phone2-r5-scoreboard-phone2.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![116-phone3-r5-scoreboard-phone3.jpg](116-phone3-r5-scoreboard-phone3.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![117-phone4-r5-scoreboard-phone4.jpg](117-phone4-r5-scoreboard-phone4.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![118-phone5-r5-scoreboard-phone5.jpg](118-phone5-r5-scoreboard-phone5.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![119-phone6-r5-scoreboard-phone6.jpg](119-phone6-r5-scoreboard-phone6.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![120-phone7-r5-scoreboard-phone7.jpg](120-phone7-r5-scoreboard-phone7.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![121-phone8-r5-scoreboard-phone8.jpg](121-phone8-r5-scoreboard-phone8.jpg) | P8 scoreboard: Place 8, Score 6. | Claude, integrator review, 2026-11-18 |
| ![122-host-podium-1920.jpg](122-host-podium-1920.jpg) | 1920 × 1080 final board: P2 wins with 33; eight rows including =4 tie. | Claude, integrator review, 2026-11-18 |
| ![123-host-podium-1280.jpg](123-host-podium-1280.jpg) | 1280 × 720 final board: P2 wins with 33; leader-continues hint remains large relative to stage. | Claude, integrator review, 2026-11-18 |
| ![124-phone1-podium-phone1.jpg](124-phone1-podium-phone1.jpg) | Shell Results with this player’s Place and Score; leader phone has Continue. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![125-phone2-podium-phone2.jpg](125-phone2-podium-phone2.jpg) | P2 shell Results: Place 1, Score 33. | Claude, integrator review, 2026-11-18 |
| ![126-phone3-podium-phone3.jpg](126-phone3-podium-phone3.jpg) | Shell Results with this player’s Place and Score; leader phone has Continue. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![127-phone4-podium-phone4.jpg](127-phone4-podium-phone4.jpg) | Shell Results with this player’s Place and Score; leader phone has Continue. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![128-phone5-podium-phone5.jpg](128-phone5-podium-phone5.jpg) | Shell Results with this player’s Place and Score; leader phone has Continue. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![129-phone6-podium-phone6.jpg](129-phone6-podium-phone6.jpg) | Shell Results with this player’s Place and Score; leader phone has Continue. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![130-phone7-podium-phone7.jpg](130-phone7-podium-phone7.jpg) | Shell Results with this player’s Place and Score; leader phone has Continue. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![131-phone8-podium-phone8.jpg](131-phone8-podium-phone8.jpg) | Shell Results with this player’s Place and Score; leader phone has Continue. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![132-host-continue-picker.jpg](132-host-continue-picker.jpg) | Shell Pick a game screen with Peek Poker selected. | Codex, report completion, 2026-11-18 (contact sheet) |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![35-strip-reveal.jpg](35-strip-reveal.jpg) | Six sampled frames: backs narrow to lines, faces widen, hands list appears under a mask; no blank stage or visible overshoot. | Claude, integrator review, 2026-11-18 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| PP-001–011, PLAT-033: default five-round console match and scoring | Pass | Completed named steps and round-1/5 stills; review 2 independent oracle/trace checks. Random fill as slowest was not exercised. |
| PP-020, PP-021: no early public or other-seat secrets | Pass | Review 2 scans of secrecy.json.gz and sampled DOM frames; locked-TV stills show only seat status. |
| PP-008, PP-031: reveal and seat-marker presentation | Pass | Reveal strip and reveal stills; seven/eight-marker stills 45, 55, 56, 57, 112. |
| PP-032: totals, own stats and final podium | Pass with known defect | Final boards and phone stats; R5 scoreboard wrongly promises another round (P-10). |
| Physical phones/TV, late join and all-locked early end | Not covered | Emulated console run; idle seat prevents all-locked transition. |
