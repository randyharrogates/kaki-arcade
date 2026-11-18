# R-02-phone-layouts UAT evidence

Superseded by `uat-r21-p2` (the merged tree with C-17's waiting copy). Kept for history; review 16 looked at every image here.

Automated run on the round-20 working tree (base cefd31bf plus the uncommitted round-20 changes, committed as 191ca6be). The "Commit" line records HEAD at run time. Visual review: Claude reviewer, R-02 review 16.

Command: `node tools/uat/run.mjs -- R-02-phone-layouts --phones 2 --out uat-r20-p2`
Commit: `cefd31bfa04220d694647811ca3ec489111d6fc2`
Viewports: 667×375, 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1298.0 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| 01 / 02 | Leader and guest at 667. Header shows Player, Connected and the Menu chip. "Score 0" strip. Artemis, Ares, Hades and Eris at 34 px regular with shapes. Leader has Skip at the right; guest has a full-width grid and no Skip | Claude reviewer |
| 03 (= 06) | TV: Question 1 of 10 (golden apple), four options, both players Thinking | Claude reviewer |
| 04 / 05 | Leader and guest at 844: the same layout, 34 px | Claude reviewer |
| 07 / 08 | Leader and guest at 667, paused from the leader's Menu: Paused, Resume, "Quit to picker". The veil is nearly opaque. A contrast-boosted copy shows the Score strip, the grid and the leader's Skip beneath it. The copy "Only the leader can quit." comes from `phone-route.tsx`, not from R-02 | Claude reviewer |
| 09 / 12 | Leader locked out at 667 and 844: Locked out pill (smaller at 667), "Wrong answer. Wait until everyone has taken a turn.", own pick Hades; all four options grey; Skip stays | Claude reviewer |
| 10 / 13 | Guest at 667 and 844: only Hades disabled (the TV's public Wrong); Score 0; no identity | Claude reviewer |
| 11 (= 14) | TV: Hades marked Wrong; Player 1 Locked out, Player 2 Thinking | Claude reviewer |
| 15 / 18 | Leader after unlock at 667 and 844: Ares and Hades disabled, Artemis and Eris live, Skip | Claude reviewer |
| 16 (= 22) / 19 (= 25) | Guest after unlock: the same two options disabled. The guest's view is identical once the leader locks in, so the guest cannot see the lock-in (RZ-005) | Claude reviewer |
| 17 (= 20, 23, 26) | TV: Ares and Hades Wrong; both players Thinking | Claude reviewer |
| 21 / 24 | Leader locked in at 667 and 844: Locked in pill, pick Eris, "Watch the TV for the reveal"; all options disabled; Skip | Claude reviewer |
| 27 / 30 | Leader reveal: Right, Points gained +100, Streak 1, Score 100, Eris | Claude reviewer |
| 28 / 31 | Guest reveal: Wrong, +0, Streak 0, Score 0, Ares | Claude reviewer |
| 29 / 32 | TV reveal: Eris Correct with marker 1; Ares Wrong (2) and Hades Wrong (1); "Player 1 got it"; count-up held at 67 pts by the host clock | Claude reviewer |
| 33 / 36 | Leader after Skip: Skipped, +0, Streak 1, Score 100 | Claude reviewer |
| 34 / 37 | Guest after Skip: Skipped, +0, Streak 0, Score 0 | Claude reviewer |
| 35 (= 38) | TV, Question 2 (octopus blood): Hemocyanin Correct; "Nobody got it right"; 100 and 0 pts | Claude reviewer |
| 39 / 42 | Leader scoreboard: Continue (cross, 21 px bold) and "1st · 100" pill | Claude reviewer |
| 40 / 43 | Guest scoreboard: "2nd · 0" pill only | Claude reviewer |
| 41 (= 44) | TV scoreboard after question 5: count-up held at 93, +100 gained | Claude reviewer |
| 45 | Fixture, leader, 667: four answers of about 40 characters, all 21 px bold, at most 3 lines; Skip at right | Claude reviewer |
| 46 | Fixture, guest, 667: all four 21 px bold, 2 lines each | Claude reviewer |
| 47 | Fixture, leader, 844: all four 21 px bold, 2 lines each; Skip at right | Claude reviewer |
| 48 | Fixture, guest, 844: all four 34 px regular, 2 lines each; about 8 CSS px inside the border in a full-resolution crop | Claude reviewer |
| 49 / 50 | Fixture, leader scoreboard: Continue and "2nd · 700" | Claude reviewer |
| 51 (= 55) / 52 (= 56) | Fixture, guest scoreboard and end: "2nd · 700" | Claude reviewer |
| 53 / 54 | Fixture, leader end: "2nd · 700" | Claude reviewer |
| 57 / 58 | Fixture, leader waiting: Skip and "Join next question" pill | Claude reviewer |
| 59 / 60 | Fixture, guest waiting: "Join next question" pill only | Claude reviewer |

Note: 45–60 are fixture pages with a Leader or Guest header and no Menu chip. Main's phone header appears only in 01–44.

## Acceptance

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| RZ-003: one large shape-and-colour button per option with the option text, no letters, on every phone | Pass | 01, 02, 04, 05, 45–48 |
| D-127 / D-205: short options at 34 px; a group shares one step (21 px bold or 34 px regular), at most 3 lines | Pass | 01–05, 15, 18, 45–48 |
| RZ-005: no answer or identity reaches another phone; only the TV's public Wrong marks disable options | Pass | 10, 13, 16, 19, 22, 25 |
| Leader-only Skip | Pass | 01, 04, 45, 47 vs 02, 05, 46, 48 |
| Private reveal, scoreboard and end states | Pass | 27–43, 49–60 |
| Main's phone header (Menu chip) alongside the strip | Pass | 01–44 |
| Paused veil over the strip, leader and guest (console pause from the leader's Menu) | Pass | 07, 08 |
| Title pulse only on success (DESIGN §3) | Open, Randy (OQ-050) | `layout-renderer.ts` title pulse |
