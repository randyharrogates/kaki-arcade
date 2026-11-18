# R-02-phone-layouts UAT evidence

Visual review by Claude reviewer is recorded below from review 14; OQ-050 remains open.

Command: `node tools/uat/run.mjs -- R-02-phone-layouts --phones 2 --out uat-r17-p2`
Commit: `bfd69e7853cee6d48d4bf29b5ebd81325ad296a3`
Viewports: 667×375, 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1852.9 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| 01 | Leader, 667: Score 0 strip; Nvidia, Ageia, NovodeX, AMD at 34 px regular with shapes; Skip at right | Claude reviewer |
| 02 | Guest, 667: same answers at 34 px, full-width grid, no Skip | Claude reviewer |
| 03 / 06 | TV: Question 1 of 10 (PhysX), four options, both players Thinking | Claude reviewer |
| 04 / 05 | Leader and guest at 844: same, 34 px, leader Skip at right | Claude reviewer |
| 07 / 10 | Leader locked out at 667 and 844: Locked out pill, wait note, own pick "Ageia"; all four options disabled grey; Skip stays | Claude reviewer |
| 08 / 11 | Guest at 667 and 844: only Ageia disabled (the TV's public Wrong); Score 0; no identity | Claude reviewer |
| 09 / 12 | TV: Ageia marked Wrong; Player 1 Locked out | Claude reviewer |
| 13 / 16 | Leader after unlock at 667 and 844: Nvidia and Ageia disabled, NovodeX and AMD live, Score 0 | Claude reviewer |
| 14 / 17 (= 20 / 23) | Guest after unlock: same two disabled; identical once the leader locks in, so the lock-in is not visible to the guest (RZ-005) | Claude reviewer |
| 15 (= 18, 21, 24) | TV: Nvidia and Ageia Wrong; both players Thinking | Claude reviewer |
| 19 / 22 | Leader locked in at 667 and 844: Locked in pill, pick "NovodeX", "Watch the TV for the reveal"; all options disabled | Claude reviewer |
| 25 / 28 | Leader reveal: Right, Points gained +100, Streak 1, Score 100, NovodeX | Claude reviewer |
| 26 / 29 | Guest reveal: Wrong, +0, Streak 0, Score 0, Nvidia | Claude reviewer |
| 27 / 30 | TV reveal: NovodeX Correct with marker 1; Wrong markers 2 and 1; "Player 1 got it"; score count-up paused at 69 by the host clock | Claude reviewer |
| 31 / 34 | Leader after Skip: Skipped, +0, Streak 1, Score 100 | Claude reviewer |
| 32 / 35 | Guest after Skip: Skipped, +0, Streak 0, Score 0 | Claude reviewer |
| 33 (= 36) | TV, Question 2 Gamecube: Dolphin Correct; "Nobody got it right" | Claude reviewer |
| 37 / 40 | Leader scoreboard: Continue (cross, 21 px bold) and "1st · 100" pill | Claude reviewer |
| 38 / 41 | Guest scoreboard: "2nd · 0" pill only | Claude reviewer |
| 39 (= 42) | TV scoreboard after question 5: count-up paused at 92 | Claude reviewer |
| 43 | Leader, 667, four 38–40 character answers: all four 21 px bold, at most 3 lines; Skip at right | Claude reviewer |
| 44 | Guest, 667: all four 21 px bold, 2 lines each | Claude reviewer |
| 45 | Leader, 844: all four 21 px bold, 2 lines each; Skip at right | Claude reviewer |
| 46 | Guest, 844: all four 34 px regular, 2 lines each, inside padding | Claude reviewer |
| 47 / 48 | Leader scoreboard state (fixture): Continue and "2nd · 700" | Claude reviewer |
| 49 / 50 (= 53 / 54) | Guest scoreboard and end (fixture): "2nd · 700" | Claude reviewer |
| 51 / 52 | Leader end: "2nd · 700" | Claude reviewer |
| 55 / 56 | Leader waiting: Skip and "Join next question" pill | Claude reviewer |
| 57 / 58 | Guest waiting: "Join next question" pill only | Claude reviewer |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| RZ-003: one large shape-and-colour button per option with the option text, no letters, on every phone | Pass | 01, 02, 04, 05, 43–46 |
| D-127 / D-205 / D-206: short options 34 px; long options share one step, 21 px bold or 34 px regular, at most 3 lines | Pass | 01–05, 13, 16, 43–46 |
| RZ-005: no answer or identity reaches another phone; only the TV's public Wrong marks disable options | Pass | 08, 11, 14, 17, 20 |
| Leader-only Skip | Pass | 01, 04, 43, 45 vs 02, 05, 44, 46 |
| Private reveal, scoreboard and end states | Pass | 25–35, 37–41, 47–58 |
| Title pulse only on success (DESIGN §3) | Open, Randy (OQ-050) | code `layout-renderer.ts:121-128` |


Review attribution above is transcribed from review 14; Codex did not re-review images. These stills predate round 18 and merged-main validation. D-203: strip; D-204: option metrics; D-205: group step; D-206: bold.
