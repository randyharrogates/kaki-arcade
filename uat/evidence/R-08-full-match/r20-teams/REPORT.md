# R-08-full-match UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- R-08-full-match --phones 8 --max-mb 18 --timeout-min 25 --out r20-teams`
Commit: `71c70d4278d3dad72ade8702514ea5209acedc5c`
Viewports: 1920×1080, 844×390, 1280×720, 1440×900

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1292.5 | completed |
| KNOWN GAP PLAT-025: no team colour on phones or TV during play | 4.8 | completed |
| Question 1: privacy, inputs, reveal and scores | 5115.7 | completed |
| Question 2: privacy, inputs, reveal and scores | 2418.2 | completed |
| Question 3: privacy, inputs, reveal and scores | 3829.3 | completed |
| Question 4: privacy, inputs, reveal and scores | 14617.0 | completed |
| Question 5: privacy, inputs, reveal and scores | 10185.9 | completed |
| Question 6: privacy, inputs, reveal and scores | 2096.3 | completed |
| Question 7: privacy, inputs, reveal and scores | 3852.6 | completed |
| Question 8: privacy, inputs, reveal and scores | 3903.5 | completed |
| RZ-009 final-round card and double-points header | 3544.6 | completed |
| Question 9: privacy, inputs, reveal and scores | 8108.9 | completed |
| Question 10: privacy, inputs, reveal and scores | 998.0 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-team-setup-tv.jpg](01-host-team-setup-tv.jpg) | | |
| ![02-phone1-team-setup-phone.jpg](02-phone1-team-setup-phone.jpg) | | |
| ![03-host-question-tv.jpg](03-host-question-tv.jpg) | | |
| ![04-phone1-question-phone1.jpg](04-phone1-question-phone1.jpg) | | |
| ![05-phone2-question-phone2.jpg](05-phone2-question-phone2.jpg) | | |
| ![06-phone3-question-phone3.jpg](06-phone3-question-phone3.jpg) | | |
| ![07-phone4-question-phone4.jpg](07-phone4-question-phone4.jpg) | | |
| ![08-phone5-question-phone5.jpg](08-phone5-question-phone5.jpg) | | |
| ![09-phone6-question-phone6.jpg](09-phone6-question-phone6.jpg) | | |
| ![10-phone7-question-phone7.jpg](10-phone7-question-phone7.jpg) | | |
| ![18-host-reveal-tv.jpg](18-host-reveal-tv.jpg) | | |
| ![19-phone1-reveal-phone1.jpg](19-phone1-reveal-phone1.jpg) | | |
| ![20-phone2-reveal-phone2.jpg](20-phone2-reveal-phone2.jpg) | | |
| ![21-phone3-reveal-phone3.jpg](21-phone3-reveal-phone3.jpg) | | |
| ![22-phone4-reveal-phone4.jpg](22-phone4-reveal-phone4.jpg) | | |
| ![23-phone5-reveal-phone5.jpg](23-phone5-reveal-phone5.jpg) | | |
| ![24-phone6-reveal-phone6.jpg](24-phone6-reveal-phone6.jpg) | | |
| ![25-phone7-reveal-phone7.jpg](25-phone7-reveal-phone7.jpg) | | |
| ![26-phone8-joiner-waiting-phone.jpg](26-phone8-joiner-waiting-phone.jpg) | | |
| ![27-host-joiner-waiting-tv.jpg](27-host-joiner-waiting-tv.jpg) | | |
| ![28-phone1-reload-before-phone.jpg](28-phone1-reload-before-phone.jpg) | | |
| ![29-phone1-reload-after-phone.jpg](29-phone1-reload-after-phone.jpg) | | |
| ![30-host-scoreboard-5-tv.jpg](30-host-scoreboard-5-tv.jpg) | | |
| ![31-phone1-scoreboard-5-phone1.jpg](31-phone1-scoreboard-5-phone1.jpg) | | |
| ![32-phone2-scoreboard-5-phone2.jpg](32-phone2-scoreboard-5-phone2.jpg) | | |
| ![33-phone3-scoreboard-5-phone3.jpg](33-phone3-scoreboard-5-phone3.jpg) | | |
| ![34-phone4-scoreboard-5-phone4.jpg](34-phone4-scoreboard-5-phone4.jpg) | | |
| ![35-phone5-scoreboard-5-phone5.jpg](35-phone5-scoreboard-5-phone5.jpg) | | |
| ![36-phone6-scoreboard-5-phone6.jpg](36-phone6-scoreboard-5-phone6.jpg) | | |
| ![37-phone7-scoreboard-5-phone7.jpg](37-phone7-scoreboard-5-phone7.jpg) | | |
| ![38-host-lock-out-tv.jpg](38-host-lock-out-tv.jpg) | | |
| ![39-phone1-lock-out-phone1.jpg](39-phone1-lock-out-phone1.jpg) | | |
| ![40-phone2-lock-out-phone2.jpg](40-phone2-lock-out-phone2.jpg) | | |
| ![41-phone3-lock-out-phone3.jpg](41-phone3-lock-out-phone3.jpg) | | |
| ![42-phone4-lock-out-phone4.jpg](42-phone4-lock-out-phone4.jpg) | | |
| ![43-phone5-lock-out-phone5.jpg](43-phone5-lock-out-phone5.jpg) | | |
| ![44-phone6-lock-out-phone6.jpg](44-phone6-lock-out-phone6.jpg) | | |
| ![45-phone7-lock-out-phone7.jpg](45-phone7-lock-out-phone7.jpg) | | |
| ![55-host-final-round-card-1920-tv.jpg](55-host-final-round-card-1920-tv.jpg) | | |
| ![56-host-final-round-card-1280-tv.jpg](56-host-final-round-card-1280-tv.jpg) | | |
| ![57-host-final-round-card-1440-letterbox-tv.jpg](57-host-final-round-card-1440-letterbox-tv.jpg) | | |
| ![58-phone1-final-round-double-points-phone1.jpg](58-phone1-final-round-double-points-phone1.jpg) | | |
| ![59-phone2-final-round-double-points-phone2.jpg](59-phone2-final-round-double-points-phone2.jpg) | | |
| ![60-phone3-final-round-double-points-phone3.jpg](60-phone3-final-round-double-points-phone3.jpg) | | |
| ![61-phone4-final-round-double-points-phone4.jpg](61-phone4-final-round-double-points-phone4.jpg) | | |
| ![62-phone5-final-round-double-points-phone5.jpg](62-phone5-final-round-double-points-phone5.jpg) | | |
| ![63-phone6-final-round-double-points-phone6.jpg](63-phone6-final-round-double-points-phone6.jpg) | | |
| ![64-phone7-final-round-double-points-phone7.jpg](64-phone7-final-round-double-points-phone7.jpg) | | |
| ![74-host-final-question-double-points-1920-tv.jpg](74-host-final-question-double-points-1920-tv.jpg) | | |
| ![75-host-final-question-double-points-1280-tv.jpg](75-host-final-question-double-points-1280-tv.jpg) | | |
| ![76-host-final-question-reveal-double-points-tv.jpg](76-host-final-question-reveal-double-points-tv.jpg) | | |
| ![84-host-podium-tv.jpg](84-host-podium-tv.jpg) | | |
| ![85-phone1-podium-phone1.jpg](85-phone1-podium-phone1.jpg) | | |
| ![86-phone2-podium-phone2.jpg](86-phone2-podium-phone2.jpg) | | |
| ![87-phone3-podium-phone3.jpg](87-phone3-podium-phone3.jpg) | | |
| ![88-phone4-podium-phone4.jpg](88-phone4-podium-phone4.jpg) | | |
| ![89-phone5-podium-phone5.jpg](89-phone5-podium-phone5.jpg) | | |
| ![90-phone6-podium-phone6.jpg](90-phone6-podium-phone6.jpg) | | |
| ![91-phone7-podium-phone7.jpg](91-phone7-podium-phone7.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![17-strip-reveal.jpg](17-strip-reveal.jpg) | | |
| ![54-strip-final-round-card-in.jpg](54-strip-final-round-card-in.jpg) | | |
| ![73-strip-final-round-card-out.jpg](73-strip-final-round-card-out.jpg) | | |
| ![83-strip-podium.jpg](83-strip-podium.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Visual review (Claude, integrator, 2026-11-19; R-20 merged tree)

| Screenshots | What they show | Looked at by |
|---|---|---|
| 30 scoreboard-5 | Red 350 / Blue 0 team bars matching the players; tied ranks "=2" and "=1" | Claude |
| 74, 75 final question | "Double points" chip at 1920 and 1280 | Claude |
| 76 final reveal | Chip kept through the reveal; leader mid count-up (+300 · 843 pts) | Claude |
| 84 podium | Red 1000 on step 1, Blue 100 on step 2; totals equal the members; hint clear below. Seven players: the eighth (late joiner) is held in the lobby on this branch (D-202, before C-21) | Claude |
