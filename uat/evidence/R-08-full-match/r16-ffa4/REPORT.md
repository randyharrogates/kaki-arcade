# R-08-full-match UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- R-08-full-match --phones 8 --max-mb 18 --out r16-ffa4`
Commit: `0cc1508fe22dd514050fb3a8e59c69ad12d21008`
Viewports: 1920×1080, 844×390, 1280×720, 1440×900

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1284.4 | completed |
| Question 1: privacy, inputs, reveal and scores | 5296.6 | completed |
| Question 2: privacy, inputs, reveal and scores | 2519.0 | completed |
| Question 3: privacy, inputs, reveal and scores | 5051.0 | completed |
| Question 4: privacy, inputs, reveal and scores | 16013.8 | completed |
| Question 5: privacy, inputs, reveal and scores | 12181.2 | completed |
| Question 6: privacy, inputs, reveal and scores | 2403.2 | completed |
| Question 7: privacy, inputs, reveal and scores | 4460.7 | completed |
| Question 8: privacy, inputs, reveal and scores | 4551.9 | completed |
| RZ-009 final-round card and double-points header | 3756.1 | completed |
| Question 9: privacy, inputs, reveal and scores | 9411.9 | completed |
| Question 10: privacy, inputs, reveal and scores | 959.9 | completed |

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

## Visual review (Claude reviewer, 2026-11-19, commit 0cc1508f; 8 phones, phone 8 the free-for-all joiner; 16.8 MB of 18 MiB, D-290)

| Screenshot | What it shows | Looked at by |
|---|---|---|
| 01-host-question-tv | Question 1, seven players Thinking | Claude reviewer, 2026-11-19 (contact sheet) |
| 16-host-reveal-tv | Question 1 reveal, Chapeau Correct, +100 · 100 pts | Claude reviewer, 2026-11-19 (contact sheet) |
| 25-host-joiner-waiting-tv | Question 2; R08Newcomer seat 8 "→ Next question" | Claude reviewer, 2026-11-19 (contact sheet) |
| 27-host-joiner-entered-tv | Question 3 with R08Newcomer Thinking | Claude reviewer, 2026-11-19 (contact sheet) |
| 30-host-scoreboard-5-tv | Scoreboard after question 5, 350 leader with the +350 chip; h1 header identical to round2 | Claude reviewer, 2026-11-19 |
| 39-host-lock-out-tv | Question 6, Ja! Wrong, R08Guest1 Locked out | Claude reviewer, 2026-11-19 (contact sheet) |
| 57-host-final-round-card-1920-tv | Final-round card at 1920 × 1080 (same image as solo4/25) | Claude reviewer, 2026-11-19 |
| 58-host-final-round-card-1280-tv | Card at 1280 × 720 | Claude reviewer, 2026-11-19 (contact sheet) |
| 59-host-final-round-card-1440-letterbox-tv | Card at 1440 × 900, letterboxed | Claude reviewer, 2026-11-19 (contact sheet) |
| 60–67 phone1–8 final-round-double-points | Every phone, joiner included, shows "Final round · Double points" and no buttons | Claude reviewer, 2026-11-19 (60, 67 full; 61–66 contact sheet) |
| 77-host-final-question-double-points-1920-tv | Question 10 with the Double points chip beside "History"; eight players Thinking | Claude reviewer, 2026-11-19 |
| 78-host-final-question-double-points-1280-tv | Same at 1280 × 720 | Claude reviewer, 2026-11-19 |
| 79-host-final-question-reveal-double-points-tv | Question 10 reveal keeps the chip; "R08Guest1 got it · Streak 4 · +100 bonus"; +300 with the total mid count-up (853 of 1000) | Claude reviewer, 2026-11-19 |
| 87-host-podium-tv | Podium: R08Guest1 1000, R08Guest2 100, =3 Guest3 and Guest4, ranks =3 for 5–8; hand-off line | Claude reviewer, 2026-11-19 |
| 88–95 phone1–8 podium | Phones on Results, "Watch the TV."; leader has Teams off and Continue | Claude reviewer, 2026-11-19 (88 full; 89–95 contact sheet) |
| 02–08, 17–24, 26, 28, 29, 31–38, 40–47 | R-08 regression stills, unchanged by R-16 | (not opened) |

| Strip | What it shows | Looked at by |
|---|---|---|
| 15-strip-reveal | Question 1 reveal; total counts 64 → 97 | Claude reviewer, 2026-11-19 |
| 56-strip-final-round-card-in | Question 9 reveal stays fully drawn while the card fades in above it; ends on the card alone | Claude reviewer, 2026-11-19 |
| 76-strip-final-round-card-out | Card stays drawn while question 10 (with chip) fades in above it; option boxes mid-wipe are R-03's block wipe | Claude reviewer, 2026-11-19 |
| 86-strip-podium | Question 10 reveal under the incoming podium; incoming steps and names on top in the last frame; hand-off line over the reveal's "0 pts" in frames 1–4 (C-28) | Claude reviewer, 2026-11-19 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| The card appears once before question 10 with the right line and ×2, at 1920, 1280 and 1440 letterboxed | Pass | 57–59, 56 |
| Paired crossfade in and out, no frame showing the bare ground | Pass | 56, 76; UAT opacity check every frame |
| All 8 phones, joiner included, show "Final round · Double points" during the card and drop it at question 10 | Pass | 60–67; UAT assertions |
| The chip shows on question 10 and stays through its reveal | Pass | 77, 78, 79 |
| Incoming screens paint above outgoing ones (card title, podium steps and names) | Pass | 56, 86; UAT hit tests |
| Podium totals are settled and match the public view | Pass | 87; UAT assertion |
