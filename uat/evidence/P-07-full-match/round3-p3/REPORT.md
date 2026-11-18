# P-07-full-match UAT evidence

Accepted for P-07 full-match and secrecy coverage, with the final-round scoreboard copy defect recorded for P-10. PP-032 visual acceptance remains qualified by that defect. Integrator review: Claude, 2026-11-18. Round 5 report completion: Codex, 2026-11-18 (all listed images opened in contact sheets; detailed reveal images and strips also opened at full size).

Command: `node tools/uat/run.mjs -- P-07-full-match --phones 3 --max-mb 24 --timeout-min 20 --out round3-p3`
Commit: `5d8be7e48d0f6f6ca20ae5d82b03bb434dc80e5f`
Viewports: 1920×1080, 844×390, 1280×720

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1123.0 | completed |
| Lobby: all phones join through real pairing | 826.0 | completed |
| Picker → default five rounds → Start real Peek Poker | 1233.6 | completed |
| R1 PP-002/003/004/011: deal, memorise timer and swap difficulty | 8906.6 | completed |
| R1 PP-005/006/021: early and late private picks; TV lock seats only | 10532.9 | completed |
| R1 PP-020/021 PLAT-033: every pre-reveal public view is secret | 3.2 | completed |
| R1 PP-020: every decoded control-channel message is secret before reveal | 1.3 | completed |
| R1 PP-020/021: every sampled pick DOM frame has no early reveal | 92.2 | completed |
| R1 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 4249.7 | completed |
| R1 PP-032: scoreboard and every phone’s own place and score | 3120.8 | completed |
| R2 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6199.0 | completed |
| R2 PP-005/006/021: early and late private picks; TV lock seats only | 9403.9 | completed |
| R2 PP-020/021 PLAT-033: every pre-reveal public view is secret | 2.0 | completed |
| R2 PP-020: every decoded control-channel message is secret before reveal | 0.4 | completed |
| R2 PP-020/021: every sampled pick DOM frame has no early reveal | 80.3 | completed |
| R2 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3202.2 | completed |
| R2 PP-032: scoreboard and every phone’s own place and score | 2798.8 | completed |
| R3 PP-002/003/004/011: deal, memorise timer and swap difficulty | 6555.0 | completed |
| R3 PP-005/006/021: early and late private picks; TV lock seats only | 9452.7 | completed |
| R3 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.3 | completed |
| R3 PP-020: every decoded control-channel message is secret before reveal | 0.3 | completed |
| R3 PP-020/021: every sampled pick DOM frame has no early reveal | 75.0 | completed |
| R3 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3260.9 | completed |
| R3 PP-032: scoreboard and every phone’s own place and score | 2779.8 | completed |
| R4 PP-002/003/004/011: deal, memorise timer and swap difficulty | 5831.2 | completed |
| R4 PP-005/006/021: early and late private picks; TV lock seats only | 9428.0 | completed |
| R4 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.5 | completed |
| R4 PP-020: every decoded control-channel message is secret before reveal | 0.4 | completed |
| R4 PP-020/021: every sampled pick DOM frame has no early reveal | 80.4 | completed |
| R4 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3250.8 | completed |
| R4 PP-032: scoreboard and every phone’s own place and score | 2779.4 | completed |
| R5 PP-002/003/004/011: deal, memorise timer and swap difficulty | 7863.1 | completed |
| R5 PP-005/006/021: early and late private picks; TV lock seats only | 10346.5 | completed |
| R5 PP-020/021 PLAT-033: every pre-reveal public view is secret | 1.8 | completed |
| R5 PP-020: every decoded control-channel message is secret before reveal | 0.3 | completed |
| R5 PP-020/021: every sampled pick DOM frame has no early reveal | 83.4 | completed |
| R5 PP-007/008/009/010: reveal, random fill, poker points and speed tie | 3760.1 | completed |
| R5 PP-032: scoreboard and every phone’s own place and score | 2630.2 | completed |
| PP-001/032: final podium at 1920 and 1280, own final stats, Continue → picker | 1549.8 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-r1-memorise-tv.jpg](01-host-r1-memorise-tv.jpg) | Face-up 4 × 4 grid, three shared cards and memorise countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![02-phone1-r1-memorise-phone1.jpg](02-phone1-r1-memorise-phone1.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![03-phone2-r1-memorise-phone2.jpg](03-phone2-r1-memorise-phone2.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![04-phone3-r1-memorise-phone3.jpg](04-phone3-r1-memorise-phone3.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![05-host-r1-pick-tv.jpg](05-host-r1-pick-tv.jpg) | Face-down 4 × 4 grid, face-up shared cards, Picking labels and countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![06-phone1-r1-pick-phone1.jpg](06-phone1-r1-pick-phone1.jpg) | Face-down 4 × 4 grid; Lock in is grey. | Claude, integrator review, 2026-11-18 |
| ![07-phone2-r1-pick-phone2.jpg](07-phone2-r1-pick-phone2.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![08-phone3-r1-pick-phone3.jpg](08-phone3-r1-pick-phone3.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![09-phone1-r1-phone1-two-selected.jpg](09-phone1-r1-phone1-two-selected.jpg) | Two cells have thicker white frames; Lock in is light. | Claude, integrator review, 2026-11-18 |
| ![10-host-r1-locked-tv.jpg](10-host-r1-locked-tv.jpg) | Face-down grid; P1/P2 Picked, P3 Picking; three shared cards face up. | Claude, integrator review, 2026-11-18 |
| ![11-phone1-r1-locked-phone1.jpg](11-phone1-r1-locked-phone1.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![12-phone2-r1-locked-phone2.jpg](12-phone2-r1-locked-phone2.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![13-phone3-r1-locked-phone3.jpg](13-phone3-r1-locked-phone3.jpg) | Face-down 4 × 4 grid and grey Lock in for the idle seat. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![21-host-r1-reveal-tv.jpg](21-host-r1-reveal-tv.jpg) | Flipped grid and seat markers; P1 Four of a kind · 11, P2 Four of a kind · 13, P3 Two pair · 3; countdown 7. | Claude, integrator review, 2026-11-18 |
| ![22-phone1-r1-reveal-phone1.jpg](22-phone1-r1-reveal-phone1.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![23-phone2-r1-reveal-phone2.jpg](23-phone2-r1-reveal-phone2.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![24-phone3-r1-reveal-phone3.jpg](24-phone3-r1-reveal-phone3.jpg) | Five face-up cards, hand name and Points; idle seat also has the random-fill note. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![25-host-r1-scoreboard-tv.jpg](25-host-r1-scoreboard-tv.jpg) | Scoreboard: P2 13, P1 11, P3 3, places 1–3. | Claude, integrator review, 2026-11-18 |
| ![26-phone1-r1-scoreboard-phone1.jpg](26-phone1-r1-scoreboard-phone1.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![27-phone2-r1-scoreboard-phone2.jpg](27-phone2-r1-scoreboard-phone2.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![28-phone3-r1-scoreboard-phone3.jpg](28-phone3-r1-scoreboard-phone3.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![29-host-r5-memorise-tv.jpg](29-host-r5-memorise-tv.jpg) | Face-up 4 × 4 grid, three shared cards and memorise countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![30-phone1-r5-memorise-phone1.jpg](30-phone1-r5-memorise-phone1.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![31-phone2-r5-memorise-phone2.jpg](31-phone2-r5-memorise-phone2.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![32-phone3-r5-memorise-phone3.jpg](32-phone3-r5-memorise-phone3.jpg) | Watch the TV with Seconds countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![33-host-r5-swap1-tv.jpg](33-host-r5-swap1-tv.jpg) | Face-down cards offset during swap; shared cards remain face up. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![34-phone1-r5-swap1-phone1.jpg](34-phone1-r5-swap1-phone1.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![35-phone2-r5-swap1-phone2.jpg](35-phone2-r5-swap1-phone2.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![36-phone3-r5-swap1-phone3.jpg](36-phone3-r5-swap1-phone3.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![37-host-r5-swap2-tv.jpg](37-host-r5-swap2-tv.jpg) | Face-down cards offset during swap; shared cards remain face up. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![38-phone1-r5-swap2-phone1.jpg](38-phone1-r5-swap2-phone1.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![39-phone2-r5-swap2-phone2.jpg](39-phone2-r5-swap2-phone2.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![40-phone3-r5-swap2-phone3.jpg](40-phone3-r5-swap2-phone3.jpg) | Watch the TV; no card faces shown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![41-host-r5-pick-tv.jpg](41-host-r5-pick-tv.jpg) | Face-down 4 × 4 grid, face-up shared cards, Picking labels and countdown. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![42-phone1-r5-pick-phone1.jpg](42-phone1-r5-pick-phone1.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![43-phone2-r5-pick-phone2.jpg](43-phone2-r5-pick-phone2.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![44-phone3-r5-pick-phone3.jpg](44-phone3-r5-pick-phone3.jpg) | Face-down 4 × 4 grid with grey Lock in. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![45-host-r5-locked-tv.jpg](45-host-r5-locked-tv.jpg) | Face-down grid, shared cards face up, Picked/Picking labels per seat. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![46-phone1-r5-locked-phone1.jpg](46-phone1-r5-locked-phone1.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![47-phone2-r5-locked-phone2.jpg](47-phone2-r5-locked-phone2.jpg) | Locked in and Watch the TV for the reveal; no card faces. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![48-phone3-r5-locked-phone3.jpg](48-phone3-r5-locked-phone3.jpg) | Face-down 4 × 4 grid and grey Lock in for the idle seat. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![49-host-r5-reveal-tv.jpg](49-host-r5-reveal-tv.jpg) | Flipped grid and markers; P1 Straight · 6, P2 Straight · 8, P3 High card · 1; countdown 7. | Claude, integrator review, 2026-11-18 |
| ![50-phone1-r5-reveal-phone1.jpg](50-phone1-r5-reveal-phone1.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![51-phone2-r5-reveal-phone2.jpg](51-phone2-r5-reveal-phone2.jpg) | Five face-up cards, hand name and Points. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![52-phone3-r5-reveal-phone3.jpg](52-phone3-r5-reveal-phone3.jpg) | Five face-up cards, hand name and Points; idle seat also has the random-fill note. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![53-host-r5-scoreboard-tv.jpg](53-host-r5-scoreboard-tv.jpg) | R5 scoreboard: P2 41, P1 31, P3 8; wrongly says Next round in 5 seconds (P-10). | Claude, integrator review, 2026-11-18 |
| ![54-phone1-r5-scoreboard-phone1.jpg](54-phone1-r5-scoreboard-phone1.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![55-phone2-r5-scoreboard-phone2.jpg](55-phone2-r5-scoreboard-phone2.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![56-phone3-r5-scoreboard-phone3.jpg](56-phone3-r5-scoreboard-phone3.jpg) | Scores on the TV with this player’s Place and Score. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![57-host-podium-1920.jpg](57-host-podium-1920.jpg) | 1920 × 1080 final board: P2 wins with 41; P1 31, P3 8. | Claude, integrator review, 2026-11-18 |
| ![58-host-podium-1280.jpg](58-host-podium-1280.jpg) | 1280 × 720 final board: P2 wins with 41; leader-continues hint remains large relative to stage. | Claude, integrator review, 2026-11-18 |
| ![59-phone1-podium-phone1.jpg](59-phone1-podium-phone1.jpg) | Shell Results with this player’s Place and Score; leader phone has Continue. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![60-phone2-podium-phone2.jpg](60-phone2-podium-phone2.jpg) | Shell Results with this player’s Place and Score; leader phone has Continue. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![61-phone3-podium-phone3.jpg](61-phone3-podium-phone3.jpg) | Shell Results with this player’s Place and Score; leader phone has Continue. | Codex, report completion, 2026-11-18 (contact sheet) |
| ![62-host-continue-picker.jpg](62-host-continue-picker.jpg) | Shell Pick a game screen with Peek Poker selected. | Codex, report completion, 2026-11-18 (contact sheet) |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![20-strip-reveal.jpg](20-strip-reveal.jpg) | Six sampled frames: backs narrow to lines, faces widen, hands list appears under a mask; no blank stage or visible overshoot. | Claude, integrator review, 2026-11-18 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| PP-001–011, PLAT-033: default five-round console match and scoring | Pass | Completed named steps and round-1/5 stills; review 2 independent oracle/trace checks. Random fill as slowest was not exercised. |
| PP-020, PP-021: no early public or other-seat secrets | Pass | Review 2 scans of secrecy.json.gz and sampled DOM frames; locked-TV stills show only seat status. |
| PP-008, PP-031: reveal and seat-marker presentation | Pass | Reveal strip and reveal stills 21 and 49. |
| PP-032: totals, own stats and final podium | Pass with known defect | Final boards and phone stats; R5 scoreboard wrongly promises another round (P-10). |
| Physical phones/TV, late join and all-locked early end | Not covered | Emulated console run; idle seat prevents all-locked transition. |
