# R-02-phone-layouts UAT evidence

Run on the merged tree (R-02 round 20 plus main with C-17, merge 8d397090), after C-17 changed the waiting copy to "You join at the next question". Looked at by the integrator, 2026-11-18. Each run seeds its own room, so this run drew different questions from uat-r20-p2 (question 1: the highest natural point in Singapore; question 2: Jules Verne's Mysterious Island); layouts and states match uat-r20-p2, which review 16 checked image by image. Byte-identical to uat-r20-p2: 33/34/36/37, 39–56. Supersedes uat-r20-p2.

Command: `node tools/uat/run.mjs -- R-02-phone-layouts --phones 2 --out uat-r21-p2`
Commit: `8d397090606a54007f1fecb5ecff6b02f00db74c`
Viewports: 667×375, 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1200.6 | completed |

Expected errors (count):
None

## Stills and strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| 01 / 02 | Leader and guest at 667, question 1: four shape buttons (Fort Canning Hill, Bukit Batok Hill, Bukit Timah Hill, Mount Faber) under "Score 0"; these longer names step the whole group to 21 px bold (D-205); leader has Skip at right; header with Menu chip | Claude (integrator) |
| 03 / 06 | TV, question 1, both players Thinking | Claude (integrator) |
| 04 / 05 | Leader and guest at 844: the same names at 34 px regular, one line each | Claude (integrator) |
| 07 / 08 | Paused veil from the leader's Menu on both phones (byte-identical to uat-r20-p2; "Only the leader can quit." is phone-route copy from C-15, logged as a console follow-up) | Claude (integrator) |
| 09 / 12 | Leader locked out at 667 and 844: Locked out pill, "Wrong answer. Wait until everyone has taken a turn.", own pick Mount Faber; all options grey; Skip stays | Claude (integrator) |
| 10 / 13 | Guest: only Mount Faber disabled (the TV's public Wrong); no identity | Claude (integrator) |
| 11 / 14 | TV: Mount Faber Wrong | Claude (integrator) |
| 15 / 18 | Leader after unlock: Fort Canning Hill and Mount Faber disabled, the others live, Skip | Claude (integrator) |
| 16 / 19 | Guest after unlock: the same two disabled; nothing reveals the leader's lock-in (RZ-005) | Claude (integrator) |
| 17 / 20 / 23 / 26 | TV: two Wrong marks, players Thinking | Claude (integrator) |
| 21 / 24 | Leader locked in at 667 and 844: Locked in pill, pick Bukit Timah Hill, "Watch the TV for the reveal"; all options disabled; Skip | Claude (integrator) |
| 22 / 25 | Guest during the leader's lock-in: unchanged from 16 / 19 | Claude (integrator) |
| 27 / 30 | Leader reveal: Right, Points gained +100, Streak 1, Score 100, Bukit Timah Hill | Claude (integrator) |
| 28 / 31 | Guest reveal: Wrong, +0, Streak 0, Score 0, Fort Canning Hill | Claude (integrator) |
| 29 / 32 | TV reveal: Bukit Timah Hill Correct (1); Fort Canning Hill Wrong (2), Mount Faber Wrong (1); "Player 1 got it"; +100 · 67 pts held by the host clock | Claude (integrator) |
| 33 / 36, 34 / 37 | After Skip: Skipped, +0; leader Score 100, guest Score 0 (identical to uat-r20-p2) | Claude (integrator) |
| 35 / 38 | TV, question 2 (Mysterious Island): Lincoln Island Correct; "Nobody got it right"; 100 and 0 pts | Claude (integrator) |
| 39–56 | Scoreboard, fixture long answers, scoreboard and end views: byte-identical to uat-r20-p2 (see its report) | Claude (integrator) |
| 57 / 58 | Fixture leader waiting at 667 and 844: Skip and the "You join at the next question" pill, one line, inside the area | Claude (integrator) |
| 59 / 60 | Fixture guest waiting: the "You join at the next question" pill only, centred | Claude (integrator) |

## Acceptance

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| RZ-003: one large shape-and-colour button per option with the option text, no letters, on every phone | Pass | 01, 02, 04, 05, 45–48 |
| D-127 / D-205: a group shares one step (21 px bold at 667 for these names, 34 px regular at 844), at most 3 lines | Pass | 01, 02, 04, 05, 45–48 |
| RZ-005: no answer or identity reaches another phone; only the TV's public Wrong marks disable options | Pass | 10, 13, 16, 19, 22, 25 |
| Leader-only Skip | Pass | 01, 04, 57, 58 vs 02, 05, 59, 60 |
| Private reveal, scoreboard and end states | Pass | 27–43, 49–56 |
| Paused veil over the strip, leader and guest | Pass | 07, 08 |
| Waiting copy after C-17 ("You join at the next question") fits at 667 and 844 | Pass | 57–60 |
| Title pulse only on success (DESIGN §3) | Open, Randy (OQ-050) | `layout-renderer.ts` title pulse |
