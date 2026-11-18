# R-08-full-match UAT evidence

Automated round-2 run passed its hard assertions, with the known gaps below. Claude’s recorded inspections are attributed only to the files listed in review 1. Codex opened all table images on 2026-11-18 (stills in labelled contact sheets; strips separately). Final merge acceptance remains with the integrator.

Command: `node tools/uat/run.mjs -- R-08-full-match --phones 8 --max-mb 24 --timeout-min 20 --out round2-teams`
Commit: `b485254e2bb771ebc1870b4e7688895a689e94c8`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1165.9 | completed |
| KNOWN GAP PLAT-025: no team colour on phones or TV during play | 4.3 | completed |
| Question 1: privacy, inputs, reveal and scores | 5442.2 | completed |
| Question 2: privacy, inputs, reveal and scores | 2447.6 | completed |
| Question 3: privacy, inputs, reveal and scores | 4218.1 | completed |
| Question 4: privacy, inputs, reveal and scores | 15733.6 | completed |
| Question 5: privacy, inputs, reveal and scores | 11061.2 | completed |
| Question 6: privacy, inputs, reveal and scores | 2210.1 | completed |
| Question 7: privacy, inputs, reveal and scores | 4158.8 | completed |
| Question 8: privacy, inputs, reveal and scores | 4204.9 | completed |
| KNOWN GAP RZ-009: no final-round announcement on the TV | 1.3 | completed |
| Question 9: privacy, inputs, reveal and scores | 7667.1 | completed |
| Question 10: privacy, inputs, reveal and scores | 2204.2 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-team-setup-tv.jpg](01-host-team-setup-tv.jpg) | Pick a side: Red has four players and Blue three; R08Guest1 is leader. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![02-phone1-team-setup-phone.jpg](02-phone1-team-setup-phone.jpg) | Red selected, Blue available; Move players, Back to game picker and Start controls. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![03-host-question-tv.jpg](03-host-question-tv.jpg) | Question 1 of 10: prompt, four shape-labelled options and players Thinking; no team grouping during play. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![04-phone1-question-phone1.jpg](04-phone1-question-phone1.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons; leader Skip. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![05-phone2-question-phone2.jpg](05-phone2-question-phone2.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![06-phone3-question-phone3.jpg](06-phone3-question-phone3.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![07-phone4-question-phone4.jpg](07-phone4-question-phone4.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![08-phone5-question-phone5.jpg](08-phone5-question-phone5.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![09-phone6-question-phone6.jpg](09-phone6-question-phone6.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![10-phone7-question-phone7.jpg](10-phone7-question-phone7.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons. | Codex, 2026-11-18; Claude review pending |
| ![18-host-reveal-tv.jpg](18-host-reveal-tv.jpg) | Question 1 reveal: correct option marked, R08Guest1 got it; +100 · 100 pts; no TV streak. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![19-phone1-reveal-phone1.jpg](19-phone1-reveal-phone1.jpg) | Right, +100, Streak 1, Score 100 and own answer text. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![20-phone2-reveal-phone2.jpg](20-phone2-reveal-phone2.jpg) | Skipped, +0, Streak 0, Score 0. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![21-phone3-reveal-phone3.jpg](21-phone3-reveal-phone3.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![22-phone4-reveal-phone4.jpg](22-phone4-reveal-phone4.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![23-phone5-reveal-phone5.jpg](23-phone5-reveal-phone5.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![24-phone6-reveal-phone6.jpg](24-phone6-reveal-phone6.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![25-phone7-reveal-phone7.jpg](25-phone7-reveal-phone7.jpg) | Skipped, +0, Streak 0, Score 0. | Codex, 2026-11-18; Claude review pending |
| ![26-phone8-joiner-waiting-phone.jpg](26-phone8-joiner-waiting-phone.jpg) | Waiting for the lobby; You can join when the current game ends; Leave. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![27-host-joiner-waiting-tv.jpg](27-host-joiner-waiting-tv.jpg) | Question 2 with seven players Thinking. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![28-phone1-reload-before-phone.jpg](28-phone1-reload-before-phone.jpg) | R08Guest1 seat 1, Score 350, four answer buttons and Skip; same visible seat and score before and after reload. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![29-phone1-reload-after-phone.jpg](29-phone1-reload-after-phone.jpg) | R08Guest1 seat 1, Score 350, four answer buttons and Skip; same visible seat and score before and after reload. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![30-host-scoreboard-5-tv.jpg](30-host-scoreboard-5-tv.jpg) | Scoreboard after question 5: Red 350, Blue 0; individual rows grouped by team, Blue zeros ranked =1. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![31-phone1-scoreboard-5-phone1.jpg](31-phone1-scoreboard-5-phone1.jpg) | 1st · 350 and Continue with a cross glyph. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![32-phone2-scoreboard-5-phone2.jpg](32-phone2-scoreboard-5-phone2.jpg) | 2nd · 0; no shared-place equals sign. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![33-phone3-scoreboard-5-phone3.jpg](33-phone3-scoreboard-5-phone3.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![34-phone4-scoreboard-5-phone4.jpg](34-phone4-scoreboard-5-phone4.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![35-phone5-scoreboard-5-phone5.jpg](35-phone5-scoreboard-5-phone5.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![36-phone6-scoreboard-5-phone6.jpg](36-phone6-scoreboard-5-phone6.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![37-phone7-scoreboard-5-phone7.jpg](37-phone7-scoreboard-5-phone7.jpg) | 2nd · 0; no shared-place equals sign. | Codex, 2026-11-18; Claude review pending |
| ![38-host-lock-out-tv.jpg](38-host-lock-out-tv.jpg) | Question 6: wrong option marked Wrong; R08Guest1 marked Locked out while other players are Thinking. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![39-phone1-lock-out-phone1.jpg](39-phone1-lock-out-phone1.jpg) | Locked out, wrong-answer explanation and grey answer grid; own selected answer text remains visible. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![40-phone2-lock-out-phone2.jpg](40-phone2-lock-out-phone2.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![41-phone3-lock-out-phone3.jpg](41-phone3-lock-out-phone3.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![42-phone4-lock-out-phone4.jpg](42-phone4-lock-out-phone4.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![43-phone5-lock-out-phone5.jpg](43-phone5-lock-out-phone5.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![44-phone6-lock-out-phone6.jpg](44-phone6-lock-out-phone6.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![45-phone7-lock-out-phone7.jpg](45-phone7-lock-out-phone7.jpg) | Score 0; wrong option grey, three other coloured shape answer buttons; own seat and nickname in header. | Codex, 2026-11-18; Claude review pending |
| ![46-host-final-phase-no-announcement-tv.jpg](46-host-final-phase-no-announcement-tv.jpg) | Question 9 reveal remains visible: correct option marked, R08Guest1 +150 · 700 pts; no final-round announcement or TV streak. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![54-host-podium-tv.jpg](54-host-podium-tv.jpg) | Final results: Red team 1000, Blue team 100; individual scores grouped below the team podium. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![55-phone1-podium-phone1.jpg](55-phone1-podium-phone1.jpg) | Results, Watch the TV, Leave; Teams on ✓ and Continue with a cross glyph. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![56-phone2-podium-phone2.jpg](56-phone2-podium-phone2.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |
| ![57-phone3-podium-phone3.jpg](57-phone3-podium-phone3.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |
| ![58-phone4-podium-phone4.jpg](58-phone4-podium-phone4.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |
| ![59-phone5-podium-phone5.jpg](59-phone5-podium-phone5.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |
| ![60-phone6-podium-phone6.jpg](60-phone6-podium-phone6.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |
| ![61-phone7-podium-phone7.jpg](61-phone7-podium-phone7.jpg) | Own seat and nickname, Leave, Results and Watch the TV. | Codex, 2026-11-18; Claude review pending |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![17-strip-reveal.jpg](17-strip-reveal.jpg) | Six reveal frames: the winner’s displayed total rises from 64 to 97; the correct option remains marked. The settled still shows 100. | Codex, 2026-11-18; Claude review pending |
| ![53-strip-podium.jpg](53-strip-podium.jpg) | Six podium frames: displayed totals increase towards the settled results; these samples alone do not show the completed count-up. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Default ten-question match, unique prompts, correct reveal indices and independent score oracle (RZ-001, RZ-007, RZ-015) | Pass: automated | run.json completed question steps; settled reveal and final-results stills above |
| Matching TV options and phone shapes/colours (RZ-003) | Pass: visual | Question 1 TV and phone stills above |
| Scoring and phone streak (RZ-008) | Pass for phone/scoring only | Phone reveal: Streak 1; run score oracle |
| TV streak (RZ-008) | Fail: known product gap → R-18 | TV reveal and final-phase stills show points, no streak |
| Doubled final award (RZ-009) | Pass: automated | run.json question 10 score oracle |
| TV announces final double round (RZ-009) | Fail: known gap → R-16 | known-gap-RZ-009.json; final-phase-no-announcement still shows question 9 reveal |
| Seven seated players plus a held joiner (RZ-012/014) | Pass for holding during play; release at results unasserted | 01 setup, 26 waiting phone; run.json |
| Team totals and team-first results (RZ-012/032) | Pass: automated and visual | 30 scoreboard; 54 podium; run.json team-sum assertions |
| Per-player lock-out (RZ-012) | Visual only | 39 leader locked out; 41 Red team-mate retains coloured options; team-mate input not asserted |
| Team colour/name during play (PLAT-025) | Fail: known gap → R-15 | known-gap-PLAT-025.json; 03/04 question stills |
| Reload retains seat and score (RZ-004) | Pass for unanswered state only | 28/29 before/after stills; run.json |
| Rabakz end to end through the registry (PLAT-033) | Pass for Rabakz’s share only | run.json and the console stills above |
| Picture questions, network loading during play, RZ-021–025, sound and 3 m reading | Not evidenced | Outside these runs; see slice coverage table |

Note: `known-gap-PLAT-025.json` has `teamNameText: ["Red"]` because question 1 includes the option label “Red” (Hair / Sweet / Lantern / Red). This is not a displayed team name. The regex false positive is deferred to R-15.
