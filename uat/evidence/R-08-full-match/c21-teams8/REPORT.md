# R-08-full-match UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- R-08-full-match --phones 8 --max-mb 18 --timeout-min 25 --out c21-teams8`
Commit: `9b41bdb67b3a46221760eb20f2074ad634f128b8`
Viewports: 1920×1080, 844×390, 1280×720, 1440×900

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1361.8 | completed |
| KNOWN GAP PLAT-025: no team colour on phones or TV during play | 5.4 | completed |
| Question 1: privacy, inputs, reveal and scores | 5181.4 | completed |
| Question 2: privacy, inputs, reveal and scores | 2469.4 | completed |
| Question 3: privacy, inputs, reveal and scores | 4558.1 | completed |
| Question 4: privacy, inputs, reveal and scores | 14541.4 | completed |
| Question 5: privacy, inputs, reveal and scores | 11215.6 | completed |
| Question 6: privacy, inputs, reveal and scores | 2440.4 | completed |
| Question 7: privacy, inputs, reveal and scores | 4146.8 | completed |
| Question 8: privacy, inputs, reveal and scores | 4195.8 | completed |
| RZ-009 final-round card and double-points header | 4082.7 | completed |
| Question 9: privacy, inputs, reveal and scores | 9523.4 | completed |
| Question 10: privacy, inputs, reveal and scores | 997.1 | completed |

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
| ![28-phone8-joiner-entered-phone.jpg](28-phone8-joiner-entered-phone.jpg) | | |
| ![29-host-joiner-entered-tv.jpg](29-host-joiner-entered-tv.jpg) | | |
| ![30-phone1-reload-before-phone.jpg](30-phone1-reload-before-phone.jpg) | | |
| ![31-phone1-reload-after-phone.jpg](31-phone1-reload-after-phone.jpg) | | |
| ![32-host-scoreboard-5-tv.jpg](32-host-scoreboard-5-tv.jpg) | | |
| ![33-phone1-scoreboard-5-phone1.jpg](33-phone1-scoreboard-5-phone1.jpg) | | |
| ![34-phone2-scoreboard-5-phone2.jpg](34-phone2-scoreboard-5-phone2.jpg) | | |
| ![35-phone3-scoreboard-5-phone3.jpg](35-phone3-scoreboard-5-phone3.jpg) | | |
| ![36-phone4-scoreboard-5-phone4.jpg](36-phone4-scoreboard-5-phone4.jpg) | | |
| ![37-phone5-scoreboard-5-phone5.jpg](37-phone5-scoreboard-5-phone5.jpg) | | |
| ![38-phone6-scoreboard-5-phone6.jpg](38-phone6-scoreboard-5-phone6.jpg) | | |
| ![39-phone7-scoreboard-5-phone7.jpg](39-phone7-scoreboard-5-phone7.jpg) | | |
| ![40-phone8-scoreboard-5-phone8.jpg](40-phone8-scoreboard-5-phone8.jpg) | | |
| ![41-host-lock-out-tv.jpg](41-host-lock-out-tv.jpg) | | |
| ![42-phone1-lock-out-phone1.jpg](42-phone1-lock-out-phone1.jpg) | | |
| ![43-phone2-lock-out-phone2.jpg](43-phone2-lock-out-phone2.jpg) | | |
| ![44-phone3-lock-out-phone3.jpg](44-phone3-lock-out-phone3.jpg) | | |
| ![45-phone4-lock-out-phone4.jpg](45-phone4-lock-out-phone4.jpg) | | |
| ![46-phone5-lock-out-phone5.jpg](46-phone5-lock-out-phone5.jpg) | | |
| ![47-phone6-lock-out-phone6.jpg](47-phone6-lock-out-phone6.jpg) | | |
| ![48-phone7-lock-out-phone7.jpg](48-phone7-lock-out-phone7.jpg) | | |
| ![49-phone8-lock-out-phone8.jpg](49-phone8-lock-out-phone8.jpg) | | |
| ![59-host-final-round-card-1920-tv.jpg](59-host-final-round-card-1920-tv.jpg) | | |
| ![60-host-final-round-card-1280-tv.jpg](60-host-final-round-card-1280-tv.jpg) | | |
| ![61-host-final-round-card-1440-letterbox-tv.jpg](61-host-final-round-card-1440-letterbox-tv.jpg) | | |
| ![62-phone1-final-round-double-points-phone1.jpg](62-phone1-final-round-double-points-phone1.jpg) | | |
| ![63-phone2-final-round-double-points-phone2.jpg](63-phone2-final-round-double-points-phone2.jpg) | | |
| ![64-phone3-final-round-double-points-phone3.jpg](64-phone3-final-round-double-points-phone3.jpg) | | |
| ![65-phone4-final-round-double-points-phone4.jpg](65-phone4-final-round-double-points-phone4.jpg) | | |
| ![66-phone5-final-round-double-points-phone5.jpg](66-phone5-final-round-double-points-phone5.jpg) | | |
| ![67-phone6-final-round-double-points-phone6.jpg](67-phone6-final-round-double-points-phone6.jpg) | | |
| ![68-phone7-final-round-double-points-phone7.jpg](68-phone7-final-round-double-points-phone7.jpg) | | |
| ![69-phone8-final-round-double-points-phone8.jpg](69-phone8-final-round-double-points-phone8.jpg) | | |
| ![79-host-final-question-double-points-1920-tv.jpg](79-host-final-question-double-points-1920-tv.jpg) | | |
| ![80-host-final-question-double-points-1280-tv.jpg](80-host-final-question-double-points-1280-tv.jpg) | | |
| ![81-host-final-question-reveal-double-points-tv.jpg](81-host-final-question-reveal-double-points-tv.jpg) | | |
| ![89-host-podium-tv.jpg](89-host-podium-tv.jpg) | | |
| ![90-phone1-podium-phone1.jpg](90-phone1-podium-phone1.jpg) | | |
| ![91-phone2-podium-phone2.jpg](91-phone2-podium-phone2.jpg) | | |
| ![92-phone3-podium-phone3.jpg](92-phone3-podium-phone3.jpg) | | |
| ![93-phone4-podium-phone4.jpg](93-phone4-podium-phone4.jpg) | | |
| ![94-phone5-podium-phone5.jpg](94-phone5-podium-phone5.jpg) | | |
| ![95-phone6-podium-phone6.jpg](95-phone6-podium-phone6.jpg) | | |
| ![96-phone7-podium-phone7.jpg](96-phone7-podium-phone7.jpg) | | |
| ![97-phone8-podium-phone8.jpg](97-phone8-podium-phone8.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![17-strip-reveal.jpg](17-strip-reveal.jpg) | | |
| ![58-strip-final-round-card-in.jpg](58-strip-final-round-card-in.jpg) | | |
| ![78-strip-final-round-card-out.jpg](78-strip-final-round-card-out.jpg) | | |
| ![88-strip-podium.jpg](88-strip-podium.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Visual review (Claude, integrator, 2026-11-19; C-21 merged tree)

| Screenshot | What it shows | Looked at by |
|---|---|---|
| 26, 27 joiner waiting | Phone 8 "You join at the next question" and "You're on Blue team"; the TV lists R08Newcomer "→ Next question" | Claude |
| 28, 29 joiner entered | Question 3: phone 8 has the four answer pads, "Score 0", "You're on Blue team"; the TV lists it "Thinking" | Claude |
| 32 scoreboard-5 | Red 350 / Blue 0; Blue lists R08Newcomer with 0 | Claude |
| 89 podium | Red 1000 on step 1; Blue 100 on step 2 with four members, R08Newcomer included; leader hint clear below | Claude |
