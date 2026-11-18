# R-08-full-match UAT evidence

Automated round-2 run passed its hard assertions, with the known gaps below. Claude’s recorded inspections are attributed only to the files listed in review 1. Codex opened all table images on 2026-11-18 (stills in labelled contact sheets; strips separately). Final merge acceptance remains with the integrator.

Command: `node tools/uat/run.mjs -- R-08-full-match --phones 8 --max-mb 24 --timeout-min 20 --out round2-ffa`
Commit: `b485254e2bb771ebc1870b4e7688895a689e94c8`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1373.1 | completed |
| Question 1: privacy, inputs, reveal and scores | 5199.5 | completed |
| Question 2: privacy, inputs, reveal and scores | 2469.0 | completed |
| Question 3: privacy, inputs, reveal and scores | 4951.4 | completed |
| Question 4: privacy, inputs, reveal and scores | 16047.4 | completed |
| Question 5: privacy, inputs, reveal and scores | 12090.2 | completed |
| Question 6: privacy, inputs, reveal and scores | 2373.5 | completed |
| Question 7: privacy, inputs, reveal and scores | 4465.2 | completed |
| Question 8: privacy, inputs, reveal and scores | 4437.6 | completed |
| KNOWN GAP RZ-009: no final-round announcement on the TV | 1.0 | completed |
| Question 9: privacy, inputs, reveal and scores | 8222.6 | completed |
| Question 10: privacy, inputs, reveal and scores | 2240.2 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-question-tv.jpg](01-host-question-tv.jpg) | Question 1 of 10: prompt, four shape-labelled options and player list marked Thinking. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![02-phone1-question-phone1.jpg](02-phone1-question-phone1.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons; leader Skip. | Codex, 2026-11-18; Claude review pending |
| ![03-phone2-question-phone2.jpg](03-phone2-question-phone2.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![04-phone3-question-phone3.jpg](04-phone3-question-phone3.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![05-phone4-question-phone4.jpg](05-phone4-question-phone4.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![06-phone5-question-phone5.jpg](06-phone5-question-phone5.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![07-phone6-question-phone6.jpg](07-phone6-question-phone6.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![08-phone7-question-phone7.jpg](08-phone7-question-phone7.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![16-host-reveal-tv.jpg](16-host-reveal-tv.jpg) | Question 1 reveal: correct option marked, R08Guest1 got it; +100 · 100 pts; no TV streak. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![17-phone1-reveal-phone1.jpg](17-phone1-reveal-phone1.jpg) | Right, +100, Streak 1, Score 100 and own answer text. | Codex, 2026-11-18; Claude review pending |
| ![18-phone2-reveal-phone2.jpg](18-phone2-reveal-phone2.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![19-phone3-reveal-phone3.jpg](19-phone3-reveal-phone3.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![20-phone4-reveal-phone4.jpg](20-phone4-reveal-phone4.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![21-phone5-reveal-phone5.jpg](21-phone5-reveal-phone5.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![22-phone6-reveal-phone6.jpg](22-phone6-reveal-phone6.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![23-phone7-reveal-phone7.jpg](23-phone7-reveal-phone7.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![24-phone8-joiner-waiting-phone.jpg](24-phone8-joiner-waiting-phone.jpg) | R08Newcomer, seat 8: You join at the next question. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![25-host-joiner-waiting-tv.jpg](25-host-joiner-waiting-tv.jpg) | Question 2: seven players Thinking; R08Newcomer marked Next question. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![26-phone8-joiner-entered-phone.jpg](26-phone8-joiner-entered-phone.jpg) | R08Newcomer seat 8, Score 0 and four coloured shape answer buttons. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![27-host-joiner-entered-tv.jpg](27-host-joiner-entered-tv.jpg) | Question 3 with eight players, including R08Newcomer, Thinking. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![28-phone1-reload-before-phone.jpg](28-phone1-reload-before-phone.jpg) | R08Guest1 seat 1, Score 350, four answer buttons and Skip; same visible seat and score before and after reload. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![29-phone1-reload-after-phone.jpg](29-phone1-reload-after-phone.jpg) | R08Guest1 seat 1, Score 350, four answer buttons and Skip; same visible seat and score before and after reload. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![30-host-scoreboard-5-tv.jpg](30-host-scoreboard-5-tv.jpg) | Scoreboard after question 5: R08Guest1 350, seven zero scorers share =2. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![31-phone1-scoreboard-5-phone1.jpg](31-phone1-scoreboard-5-phone1.jpg) | 1st · 350 and Continue with a cross glyph. | Codex, 2026-11-18; Claude review pending |
| ![32-phone2-scoreboard-5-phone2.jpg](32-phone2-scoreboard-5-phone2.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![33-phone3-scoreboard-5-phone3.jpg](33-phone3-scoreboard-5-phone3.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![34-phone4-scoreboard-5-phone4.jpg](34-phone4-scoreboard-5-phone4.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![35-phone5-scoreboard-5-phone5.jpg](35-phone5-scoreboard-5-phone5.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![36-phone6-scoreboard-5-phone6.jpg](36-phone6-scoreboard-5-phone6.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![37-phone7-scoreboard-5-phone7.jpg](37-phone7-scoreboard-5-phone7.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![38-phone8-scoreboard-5-phone8.jpg](38-phone8-scoreboard-5-phone8.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![39-host-lock-out-tv.jpg](39-host-lock-out-tv.jpg) | Question 6: wrong option marked Wrong; R08Guest1 marked Locked out while other players are Thinking. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![40-phone1-lock-out-phone1.jpg](40-phone1-lock-out-phone1.jpg) | Locked out, wrong-answer explanation and grey answer grid; own selected answer text remains visible. | Codex, 2026-11-18; Claude review pending |
| ![41-phone2-lock-out-phone2.jpg](41-phone2-lock-out-phone2.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![42-phone3-lock-out-phone3.jpg](42-phone3-lock-out-phone3.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![43-phone4-lock-out-phone4.jpg](43-phone4-lock-out-phone4.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![44-phone5-lock-out-phone5.jpg](44-phone5-lock-out-phone5.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![45-phone6-lock-out-phone6.jpg](45-phone6-lock-out-phone6.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![46-phone7-lock-out-phone7.jpg](46-phone7-lock-out-phone7.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![47-phone8-lock-out-phone8.jpg](47-phone8-lock-out-phone8.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![48-host-final-phase-no-announcement-tv.jpg](48-host-final-phase-no-announcement-tv.jpg) | Question 9 reveal remains visible: correct option marked, R08Guest1 +150 · 700 pts; no final-round announcement or TV streak. | Codex, 2026-11-18; Claude review pending |
| ![56-host-podium-tv.jpg](56-host-podium-tv.jpg) | Final results: R08Guest1 1000, R08Guest2 100; zero scorers share =3. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![57-phone1-podium-phone1.jpg](57-phone1-podium-phone1.jpg) | Results, Watch the TV, Leave; Teams off and Continue with a cross glyph. | Codex, 2026-11-18; Claude review pending |
| ![58-phone2-podium-phone2.jpg](58-phone2-podium-phone2.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |
| ![59-phone3-podium-phone3.jpg](59-phone3-podium-phone3.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![60-phone4-podium-phone4.jpg](60-phone4-podium-phone4.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |
| ![61-phone5-podium-phone5.jpg](61-phone5-podium-phone5.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |
| ![62-phone6-podium-phone6.jpg](62-phone6-podium-phone6.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |
| ![63-phone7-podium-phone7.jpg](63-phone7-podium-phone7.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |
| ![64-phone8-podium-phone8.jpg](64-phone8-podium-phone8.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![15-strip-reveal.jpg](15-strip-reveal.jpg) | Six reveal frames: the winner’s displayed total rises from 64 to 97; the correct option remains marked. The settled still shows 100. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![55-strip-podium.jpg](55-strip-podium.jpg) | Six podium frames: displayed totals increase towards the settled results; these samples alone do not show the completed count-up. | Codex, 2026-11-18; Claude review pending |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Default ten-question match, unique prompts, correct reveal indices and independent score oracle (RZ-001, RZ-007, RZ-015) | Pass: automated | run.json completed question steps; settled reveal and final-results stills above |
| Matching TV options and phone shapes/colours (RZ-003) | Pass: visual | Question 1 TV and phone stills above |
| Scoring and phone streak (RZ-008) | Pass for phone/scoring only | Phone reveal: Streak 1; run score oracle |
| TV streak (RZ-008) | Fail: known product gap → R-18 | TV reveal and final-phase stills show points, no streak |
| Doubled final award (RZ-009) | Pass: automated | run.json question 10 score oracle |
| TV announces final double round (RZ-009) | Fail: known gap → R-16 | known-gap-RZ-009.json; final-phase-no-announcement still shows question 9 reveal |
| Late join waits, then enters with zero (RZ-014) | Pass: automated and visual | 24–27 joiner stills; run.json |
| Reload retains seat and score (RZ-004) | Pass for unanswered state only | 28/29 before/after stills; run.json |
| Lock-out and shared TV placings (RZ-004–005, RZ-016) | Pass within sampled scope | 39–47 lock-out stills; 30 scoreboard (=2), 56 podium (=3) |
| Rabakz end to end through the registry (PLAT-033) | Pass for Rabakz’s share only | run.json and the console stills above |
| Picture questions, network loading during play, RZ-021–025, sound and 3 m reading | Not evidenced | Outside these runs; see slice coverage table |
