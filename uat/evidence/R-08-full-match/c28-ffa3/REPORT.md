# R-08-full-match UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- R-08-full-match --phones 8 --max-mb 18 --timeout-min 25 --out c28-ffa3`
Commit: `8fe2f2819ae0f51e74e812ede4e6e87c03cee21e`
Viewports: 1920×1080, 844×390, 1280×720, 1440×900

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1372.8 | completed |
| Question 1: privacy, inputs, reveal and scores | 5393.4 | completed |
| Question 2: privacy, inputs, reveal and scores | 2681.2 | completed |
| Question 3: privacy, inputs, reveal and scores | 4949.7 | completed |
| Question 4: privacy, inputs, reveal and scores | 16088.0 | completed |
| Question 5: privacy, inputs, reveal and scores | 12231.1 | completed |
| Question 6: privacy, inputs, reveal and scores | 2410.2 | completed |
| Question 7: privacy, inputs, reveal and scores | 4610.0 | completed |
| Question 8: privacy, inputs, reveal and scores | 4571.2 | completed |
| RZ-009 final-round card and double-points header | 3741.4 | completed |
| Question 9: privacy, inputs, reveal and scores | 9472.3 | completed |
| Question 10: privacy, inputs, reveal and scores | 992.6 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-question-tv.jpg](01-host-question-tv.jpg) | | |
| ![02-phone1-question-phone1.jpg](02-phone1-question-phone1.jpg) | | |
| ![03-phone2-question-phone2.jpg](03-phone2-question-phone2.jpg) | | |
| ![04-phone3-question-phone3.jpg](04-phone3-question-phone3.jpg) | | |
| ![05-phone4-question-phone4.jpg](05-phone4-question-phone4.jpg) | | |
| ![06-phone5-question-phone5.jpg](06-phone5-question-phone5.jpg) | | |
| ![07-phone6-question-phone6.jpg](07-phone6-question-phone6.jpg) | | |
| ![08-phone7-question-phone7.jpg](08-phone7-question-phone7.jpg) | | |
| ![16-host-reveal-tv.jpg](16-host-reveal-tv.jpg) | | |
| ![17-phone1-reveal-phone1.jpg](17-phone1-reveal-phone1.jpg) | | |
| ![18-phone2-reveal-phone2.jpg](18-phone2-reveal-phone2.jpg) | | |
| ![19-phone3-reveal-phone3.jpg](19-phone3-reveal-phone3.jpg) | | |
| ![20-phone4-reveal-phone4.jpg](20-phone4-reveal-phone4.jpg) | | |
| ![21-phone5-reveal-phone5.jpg](21-phone5-reveal-phone5.jpg) | | |
| ![22-phone6-reveal-phone6.jpg](22-phone6-reveal-phone6.jpg) | | |
| ![23-phone7-reveal-phone7.jpg](23-phone7-reveal-phone7.jpg) | | |
| ![24-phone8-joiner-waiting-phone.jpg](24-phone8-joiner-waiting-phone.jpg) | | |
| ![25-host-joiner-waiting-tv.jpg](25-host-joiner-waiting-tv.jpg) | | |
| ![26-phone8-joiner-entered-phone.jpg](26-phone8-joiner-entered-phone.jpg) | | |
| ![27-host-joiner-entered-tv.jpg](27-host-joiner-entered-tv.jpg) | | |
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
| ![38-phone8-scoreboard-5-phone8.jpg](38-phone8-scoreboard-5-phone8.jpg) | | |
| ![39-host-lock-out-tv.jpg](39-host-lock-out-tv.jpg) | | |
| ![40-phone1-lock-out-phone1.jpg](40-phone1-lock-out-phone1.jpg) | | |
| ![41-phone2-lock-out-phone2.jpg](41-phone2-lock-out-phone2.jpg) | | |
| ![42-phone3-lock-out-phone3.jpg](42-phone3-lock-out-phone3.jpg) | | |
| ![43-phone4-lock-out-phone4.jpg](43-phone4-lock-out-phone4.jpg) | | |
| ![44-phone5-lock-out-phone5.jpg](44-phone5-lock-out-phone5.jpg) | | |
| ![45-phone6-lock-out-phone6.jpg](45-phone6-lock-out-phone6.jpg) | | |
| ![46-phone7-lock-out-phone7.jpg](46-phone7-lock-out-phone7.jpg) | | |
| ![47-phone8-lock-out-phone8.jpg](47-phone8-lock-out-phone8.jpg) | | |
| ![57-host-final-round-card-1920-tv.jpg](57-host-final-round-card-1920-tv.jpg) | | |
| ![58-host-final-round-card-1280-tv.jpg](58-host-final-round-card-1280-tv.jpg) | | |
| ![59-host-final-round-card-1440-letterbox-tv.jpg](59-host-final-round-card-1440-letterbox-tv.jpg) | | |
| ![60-phone1-final-round-double-points-phone1.jpg](60-phone1-final-round-double-points-phone1.jpg) | | |
| ![61-phone2-final-round-double-points-phone2.jpg](61-phone2-final-round-double-points-phone2.jpg) | | |
| ![62-phone3-final-round-double-points-phone3.jpg](62-phone3-final-round-double-points-phone3.jpg) | | |
| ![63-phone4-final-round-double-points-phone4.jpg](63-phone4-final-round-double-points-phone4.jpg) | | |
| ![64-phone5-final-round-double-points-phone5.jpg](64-phone5-final-round-double-points-phone5.jpg) | | |
| ![65-phone6-final-round-double-points-phone6.jpg](65-phone6-final-round-double-points-phone6.jpg) | | |
| ![66-phone7-final-round-double-points-phone7.jpg](66-phone7-final-round-double-points-phone7.jpg) | | |
| ![67-phone8-final-round-double-points-phone8.jpg](67-phone8-final-round-double-points-phone8.jpg) | | |
| ![77-host-final-question-double-points-1920-tv.jpg](77-host-final-question-double-points-1920-tv.jpg) | | |
| ![78-host-final-question-double-points-1280-tv.jpg](78-host-final-question-double-points-1280-tv.jpg) | | |
| ![79-host-final-question-reveal-double-points-tv.jpg](79-host-final-question-reveal-double-points-tv.jpg) | | |
| ![87-host-podium-tv.jpg](87-host-podium-tv.jpg) | | |
| ![88-phone1-podium-phone1.jpg](88-phone1-podium-phone1.jpg) | | |
| ![89-phone2-podium-phone2.jpg](89-phone2-podium-phone2.jpg) | | |
| ![90-phone3-podium-phone3.jpg](90-phone3-podium-phone3.jpg) | | |
| ![91-phone4-podium-phone4.jpg](91-phone4-podium-phone4.jpg) | | |
| ![92-phone5-podium-phone5.jpg](92-phone5-podium-phone5.jpg) | | |
| ![93-phone6-podium-phone6.jpg](93-phone6-podium-phone6.jpg) | | |
| ![94-phone7-podium-phone7.jpg](94-phone7-podium-phone7.jpg) | | |
| ![95-phone8-podium-phone8.jpg](95-phone8-podium-phone8.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![15-strip-reveal.jpg](15-strip-reveal.jpg) | | |
| ![56-strip-final-round-card-in.jpg](56-strip-final-round-card-in.jpg) | | |
| ![76-strip-final-round-card-out.jpg](76-strip-final-round-card-out.jpg) | | |
| ![86-strip-podium.jpg](86-strip-podium.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Visual review (integrator, 2026-11-20)

| Screenshot | What it shows | Looked at by |
|---|---|---|
| 86-strip-podium.jpg | Question 10 reveal to the final podium, six frames. 2 ms: the question at full strength, no podium, no hint. 82–242 ms: the podium and the hand-off line fade in together over the outgoing question. 322–404 ms: the podium and "The leader continues on their phone" at full strength; the question gone. Scores are part-way through their count-up. No blank frame, no bounce. | Claude (integrator) |
| 87-host-podium-tv.jpg | Final podium at rest: R08Guest1 1000 on step 1, R08Guest2 100 on step 2, six players on "=3" with 0. Hand-off line in the foot band. | Claude (integrator) |
