# A-09-shell-imagery UAT evidence

Looked at by: Claude reviewer 12. Supersedes `../uat-r15/` and `../uat-r14/` in full (the 844×390 footer is now 05). run.json: commit a3b33efc, 13,593,830 B of 20 MB.

Command: `node tools/uat/run.mjs -- A-09-shell-imagery --phones 1 --out uat-r16 --max-mb 20`
Commit: `a3b33efc95b052dccbcbe9e39127d1f5de66ec00`
Viewports: 1920×1080, 1280×720, 390×844, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 919.5 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| 01 / 02 landing 1920 / 1280 | Title, one line, "Host a game", the three games, "Put this on your TV" as a secondary link; the friends-on-sofa picture in the 1.618 : 1 right column; Privacy · Credits footer bottom-left, clear of the help link; dot-grid page. | Claude reviewer 12 |
| 03 landing 390 | Phone column, no picture; help link; the footer in flow below it. | Claude reviewer 12 |
| 04 landing 844×390 | Unscaled phone column in landscape, unscrolled; footer below the fold. | Claude reviewer 12 |
| 05 landing footer 844×390 | The column scrolled: "Put this on your TV" then Privacy · Credits in a 55 px box, in flow. | Claude reviewer 12 |
| 20 / 21 / 22 Tabao Rush picker | Kitchen picture above name, line and range; side tiles with pictures beside their copy; 390 shows the scaled TV stage. | Claude reviewer 12 |
| 30 / 31 / 32 Tabao Rush start | Picture at left inside the card, copy top-aligned at right; "Who's in" 13 px below the picture (ink at 699 design px); two players, the second shown as "WWWW…". | Claude reviewer 12 |
| 40 / 41 / 42 Peek Poker picker | Face-down 4 × 4 grid on felt; no chips or money. | Claude reviewer 12 |
| 43 / 44 / 45 Peek Poker start | As 30, plus "Rounds 5"; "Who's in" at 699. | Claude reviewer 12 |
| 46 / 47 / 48 Rabakz picker | Cross, circle, square and triangle answer cards behind phone buzzers on plum. | Claude reviewer 12 |
| 56 Rabakz settings loaded 1920 | Questions 10, Categories Mixed, Difficulty Mixed, Teams Off; "Who's in" at 699; the only Rabakz 1920 start still. | Claude reviewer 12 |
| 57 / 58 Rabakz start 1280 / 390 | As 56 at 1280 and 390. | Claude reviewer 12 |
| 63 Rabakz refusal 1920 | Categories Life; a refused Hard shows "Only 8 Hard Life questions. Choose Mixed difficulty." in the band at the card foot; "Who's in" still at 699. | Claude reviewer 12 |
| 74 / 75 held long name 1920 / 1280 | Seat 2 renamed "WWWWWWWWWWWW" and disconnected: one line "WWWW…" with "Seat held" on its own second line; the tile stays inside the card, clear of the feedback band. | Claude reviewer 12 |

## Strips

| Strip | What it shows | Looked at by |
|---|---|---|
| 12 picker Right | Frames at 14, 318, 583, 643, 748 and 811 ms (slow capture). At 318 ms the old and new tiles overlap; settled by 583 ms; no blank frame or overshoot. No frame near 100 ms. | Claude reviewer 12 |
| 19 picker Left | At 106 ms the wipe shows a green Peek Poker sliver and a detached "and." fragment for one frame (accepted, D-199(g)); overlap through 301 ms; settled by 432 ms; no blank frame or overshoot. | Claude reviewer 12 |
| 29 Tabao Rush Select | The same tile expands; header crossfades; "Loading settings…" in the foot band at 198 ms, gone by 351 ms; "Who's in" steady. | Claude reviewer 12 |
| 39 / 82 Back on Tabao Rush / Rabakz | The card returns to the picker; side tiles are revealed while the heading crossfades (the old heading overlaps the new hints for about 100 ms); no blank frame. | Claude reviewer 12 |
| 55 Rabakz Select | Expansion; "Loading settings…" with Teams only from 129 to 501 ms (ink 965–995 throughout); the four rows did not arrive within the strip; "Who's in" at 699 from 129 ms. | Claude reviewer 12 |
| 66 refusal appears | The notice appears in the foot band by 102 ms (ink 961–995); "Who's in" at 699 in all six frames. | Claude reviewer 12 |
| 73 refusal clears | Choosing Mixed fades the notice out in place (ink 961 at 2 ms, 962 faded at 102 ms, gone by 202 ms), clear of the card border; "Who's in" at 699 in all six frames. | Claude reviewer 12 |

## Acceptance

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Landing: one screen, one "Host a game", picture in the 1.618 : 1 column (REL-002) | Pass | 01, 02 |
| Phone landing: no picture, 55 px targets, footer in flow (D-189, D-199(b)) | Pass | 03, 04, 05; legal.dom, shell-imagery.dom |
| Each game has its own picture in the picker and on the start screen (PLAT-020) | Pass | 20–22, 30–32, 40–48, 56–58 |
| "Who's in" at the same height on all three games | Pass | 30, 43, 56 (ink 699) |
| The strip does not move when a refusal appears or clears | Pass | 63, 66, 73; game-setup.dom |
| A held seat with a 12-character name stays two lines and clear of the band | Pass | 74, 75; game-setup.dom (8 seats, exactly one held) |
| Feedback fades in and out without moving | Pass | 66, 73; game-setup.dom (clear and replace, 1920 and 1280) |
| Replacement feedback crossfades old and new | Not pictured; DOM test only | game-setup.dom |
| No blank frame, no overshoot in motion | Pass (one-frame wipe fragment accepted, D-199(g)) | 12, 19, 29, 39, 55, 82 |
