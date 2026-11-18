# R-08-full-match UAT evidence

Automated round-2 run passed its hard assertions, with the known gaps below. Claude’s recorded inspections are attributed only to the files listed in review 1. Codex opened all table images on 2026-11-18 (stills in labelled contact sheets; strips separately). Final merge acceptance remains with the integrator.

Command: `node tools/uat/run.mjs -- R-08-full-match --phones 1 --max-mb 12 --timeout-min 20 --out round2-solo`
Commit: `b485254e2bb771ebc1870b4e7688895a689e94c8`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1182.7 | completed |
| Question 1: privacy, inputs, reveal and scores | 2133.7 | completed |
| Question 2: privacy, inputs, reveal and scores | 1115.5 | completed |
| Question 3: privacy, inputs, reveal and scores | 1854.2 | completed |
| Question 4: privacy, inputs, reveal and scores | 11586.4 | completed |
| Question 5: privacy, inputs, reveal and scores | 4171.8 | completed |
| Question 6: privacy, inputs, reveal and scores | 1085.1 | completed |
| Question 7: privacy, inputs, reveal and scores | 1278.6 | completed |
| Question 8: privacy, inputs, reveal and scores | 1854.6 | completed |
| KNOWN GAP RZ-009: no final-round announcement on the TV | 2.4 | completed |
| Question 9: privacy, inputs, reveal and scores | 3496.9 | completed |
| Question 10: privacy, inputs, reveal and scores | 1571.9 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-question-tv.jpg](01-host-question-tv.jpg) | Question 1 of 10: prompt, four shape-labelled options and player list marked Thinking. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![02-phone1-question-phone1.jpg](02-phone1-question-phone1.jpg) | Own seat and nickname, Score 0, red cross / blue circle / yellow square / green triangle answer buttons; leader Skip. | Codex, 2026-11-18; Claude review pending |
| ![10-host-reveal-tv.jpg](10-host-reveal-tv.jpg) | Question 1 reveal: correct option marked, R08Guest1 got it; +100 · 100 pts; no TV streak. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![11-phone1-reveal-phone1.jpg](11-phone1-reveal-phone1.jpg) | Right, +100, Streak 1, Score 100 and own answer text. | Codex, 2026-11-18; Claude review pending |
| ![12-host-scoreboard-5-tv.jpg](12-host-scoreboard-5-tv.jpg) | Scoreboard after question 5: R08Guest1 350 (+350). | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![13-phone1-scoreboard-5-phone1.jpg](13-phone1-scoreboard-5-phone1.jpg) | 1st · 350 and Continue with a cross glyph. | Codex, 2026-11-18; Claude review pending |
| ![14-host-lock-out-solo-first-wrong-tv.jpg](14-host-lock-out-solo-first-wrong-tv.jpg) | Question 6 reveal: Nobody got it right; correct and wrong options marked; R08Guest1 350 pts. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![15-phone1-lock-out-solo-first-wrong-phone1.jpg](15-phone1-lock-out-solo-first-wrong-phone1.jpg) | Wrong, +0, Streak 0, Score 350 and own answer Kirby’s Dream Land. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![16-host-final-phase-no-announcement-tv.jpg](16-host-final-phase-no-announcement-tv.jpg) | Question 9 reveal remains visible: correct option marked, R08Guest1 +150 · 700 pts; no final-round announcement or TV streak. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![24-host-podium-tv.jpg](24-host-podium-tv.jpg) | Final results: R08Guest1 1000 pts; New best · 1000. | Claude reviewer, 2026-11-18; Codex, 2026-11-18 |
| ![25-phone1-podium-phone1.jpg](25-phone1-podium-phone1.jpg) | Results, Watch the TV, Leave; Teams off and Continue with a cross glyph. | Codex, 2026-11-18; Claude review pending |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![09-strip-reveal.jpg](09-strip-reveal.jpg) | Six reveal frames: the winner’s displayed total rises from 64 to 97; the correct option remains marked. The settled still shows 100. | Codex, 2026-11-18; Claude review pending |
| ![23-strip-podium.jpg](23-strip-podium.jpg) | Six frames of the transition to final results. | Codex, 2026-11-18; Claude review pending |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Default ten-question match, unique prompts, correct reveal indices and independent score oracle (RZ-001, RZ-007, RZ-015) | Pass: automated | run.json completed question steps; settled reveal and final-results stills above |
| Matching TV options and phone shapes/colours (RZ-003) | Pass: visual | Question 1 TV and phone stills above |
| Scoring and phone streak (RZ-008) | Pass for phone/scoring only | Phone reveal: Streak 1; run score oracle |
| TV streak (RZ-008) | Fail: known product gap → R-18 | TV reveal and final-phase stills show points, no streak |
| Doubled final award (RZ-009) | Pass: automated | run.json question 10 score oracle |
| TV announces final double round (RZ-009) | Fail: known gap → R-16 | known-gap-RZ-009.json; final-phase-no-announcement still shows question 9 reveal |
| Solo wrong first answer reveals and scores zero; New best (RZ-013) | Pass: visual; immediate reveal not hard-asserted | 14-host-lock-out-solo-first-wrong-tv.jpg; 15-phone1-lock-out-solo-first-wrong-phone1.jpg; 24-host-podium-tv.jpg |
| Rabakz end to end through the registry (PLAT-033) | Pass for Rabakz’s share only | run.json and the console stills above |
| Picture questions, network loading during play, RZ-021–025, sound and 3 m reading | Not evidenced | Outside these runs; see slice coverage table |
