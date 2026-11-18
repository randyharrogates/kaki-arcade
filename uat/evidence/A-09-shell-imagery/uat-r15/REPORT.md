# A-09-shell-imagery UAT evidence

Looked at by: Claude reviewer 11. Supersedes `../uat-r14/` except the 844×390 footer (r14/06), which r15 did not capture.

Superseded by `../uat-r16/REPORT.md`. Its Fail rows describe this historical run and were fixed in round 12.

Command: `node tools/uat/run.mjs -- A-09-shell-imagery --phones 1 --out uat-r15 --max-mb 20`
Commit: `e7e94471952ad124c3d4aef0fc9e0b5286fcda9f`
Viewports: 1920×1080, 1280×720, 390×844, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 839.0 | completed |

Expected errors (count):
None

## Visual review

| Screenshot | What it shows | Looked at by |
|---|---|---|
| 01 / 02 landing 1920 / 1280 | Title, one line, "Host a game", the three games, "Put this on your TV" as a secondary link; the friends-on-sofa picture in the 1.618 : 1 right column; Privacy · Credits footer bottom-left, clear of the help link; dot-grid page. | Claude reviewer 11 |
| 03 landing 390 | Phone column, no picture; "Host a game" label centred; help link in a 55 px box; the footer in flow below it. | Claude reviewer 11 |
| 04 landing 844×390 | Unscaled phone column in landscape, unscrolled; the footer is below the fold and has no still in this run (see r14/06). | Claude reviewer 11 |
| 19 / 20 / 21 Tabao Rush picker | Kitchen picture above name, line and range; side tiles with 38.2 % pictures beside their copy; 390 shows the scaled TV stage. | Claude reviewer 11 |
| 29 / 30 / 31 Tabao Rush start | Picture at left inside the card, copy top-aligned at right; "Who's in" 13 px below the picture (ink at 699 design px); two players, the second shown as "WWWW…". | Claude reviewer 11 |
| 39 / 40 / 41 Peek Poker picker | Face-down 4 × 4 grid on felt; no chips or money. | Claude reviewer 11 |
| 42 / 43 / 44 Peek Poker start | As 29, plus "Rounds 5"; "Who's in" at the same height (699). | Claude reviewer 11 |
| 45 / 46 / 47 Rabakz picker | Cross, circle, square and triangle answer cards behind phone buzzers on plum. | Claude reviewer 11 |
| 55 Rabakz settings loaded 1920 | Questions 10, Categories Mixed, Difficulty Mixed, Teams Off; "Who's in" at 699. | Claude reviewer 11 |
| 56 / 57 / 58 Rabakz start | As 55 at 1920, 1280 and 390 (56 is byte-identical to 55). | Claude reviewer 11 |
| 63 Rabakz refusal 1920 | Categories Life; a refused Hard shows "Only 8 Hard Life questions. Choose Mixed difficulty." in the band at the card foot; "Who's in" still at 699. | Claude reviewer 11 |
| 74 / 75 held long name 1920 / 1280 | Seat 2 renamed "WWWWWWWWWWWW" and disconnected: one line "WWWW…" with "Seat held" on its own second line; the tile stays inside the card, clear of the feedback band. | Claude reviewer 11 |

| Strip | What it shows | Looked at by |
|---|---|---|
| 11 / 18 picker Right / Left | Focus move with old and new tiles overlapping; settles by 400 ms; no blank frame or overshoot. At about 100 ms the wipe still shows a sliver of the old picture (11) and a green sliver plus a detached "and." fragment (18) for one frame. | Claude reviewer 11 |
| 28 Tabao Rush Select | The same tile expands; header crossfades; "Loading settings…" in the foot band at 105 ms, gone by 202 ms; "Who's in" steady. | Claude reviewer 11 |
| 38 / 82 Back on Tabao Rush / Rabakz | The card returns to the picker; side tiles are revealed while the heading crossfades; no blank frame. | Claude reviewer 11 |
| 54 Rabakz Select | Expansion; "Loading settings…" with Teams only through 401 ms; the four rows by 500 ms. **Fail:** at 500 ms the fading "Loading settings…" has dropped 22 px onto the card border. "Who's in" at 699 from 100 ms. | Claude reviewer 11 |
| 66 refusal appears | The notice appears in the foot band by 102 ms; "Who's in" at 699 in all six frames. | Claude reviewer 11 |
| 73 refusal clears | Choosing Mixed fades the notice out (partial at 102 ms, gone by 201 ms); "Who's in" at 699 in all six frames. **Fail:** the fading notice drops 22 px (ink 962 to 984) onto the card border. | Claude reviewer 11 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Landing: one screen, one "Host a game", picture in the 1.618 : 1 column (REL-002) | Pass | 01, 02 |
| Phone landing: no picture, 55 px targets, footer in flow (D-189) | Pass at 390; 844×390 footer rests on r14/06 and tests | 03, 04, r14/06; legal.dom, shell-imagery.dom |
| Each game has its own picture in the picker and on the start screen (PLAT-020) | Pass | 19–47, 29–58 |
| "Who's in" at the same height on all three games | Pass | 29, 42, 55 (ink 699) |
| The strip does not move when a refusal appears or clears | Pass | 63, 66, 73; game-setup.dom |
| A held seat with a 12-character name stays two lines and clear of the band | Pass | 74, 75; game-setup.dom (8 seats) |
| Feedback fades in and out without moving | **Fail** (exit copy drops 22 px) | 54, 73 |
| Replacement feedback crossfades old and new | Not pictured; DOM test only | game-setup.dom |
| No blank frame, no overshoot in motion | Pass (one-frame wipe fragments noted) | 11, 18, 28, 38, 54, 82 |
