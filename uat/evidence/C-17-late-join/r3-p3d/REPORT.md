# C-17-late-join UAT evidence

Automated run with visual review recorded by Claude reviewer in C-17.review2.md.
The rows below transcribe that review; round-4 script improvements have not been run.
D-201 covers the per-game declaration and held-hello replay. D-202 covers team holding,
captured running admission and replay guards; team allocation remains open (OQ-048).

Command: `node tools/uat/run.mjs -- C-17-late-join --phones 3 --out r3-p3d`
Commit: `99d49829b31c75ac6d00a58073a09d7c2f86d082`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1407.4 | completed |
| Two players seated; third phone has not joined | 1119.4 | completed |
| Rabakz running with two players | 2432.9 | completed |
| Third phone seated with zero and safe next-question controls | 5151.3 | completed |
| Rabakz next question enables third phone at zero | 11916.8 | completed |
| Peek Poker running with two players | 2036.0 | completed |
| Third phone seated with no private cards and next-round message | 949.1 | completed |
| Peek Poker next round enables the third player at zero | 17013.1 | completed |
| Rabakz teams hold Cloud until the picker | 2904.2 | completed |
| Create room through host page | 865.1 | completed |
| Game with midGameJoin false holds the third phone | 2350.1 | completed |
| Returning to picker admits the held phone automatically | 1030.9 | completed |

Expected errors (count):
- 2 × host: Failed to load resource: the server responded with a status of 426 (Upgrade Required)
- 2 × host: net::ERR_ABORTED

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-01-two-seated-tv.jpg](01-host-01-two-seated-tv.jpg) | Lobby W8HW MN7R; Fern (Leader) and Moss connected; "2 of 8 players" | Claude reviewer |
| ![02-phone1-01-two-seated-phone1.jpg](02-phone1-01-two-seated-phone1.jpg) | Fern seat 1 "You're in.", leader, Pick a game / Change name | Claude reviewer |
| ![03-phone2-01-two-seated-phone2.jpg](03-phone2-01-two-seated-phone2.jpg) | Moss seat 2 waiting for the leader | Claude reviewer |
| ![04-phone3-01-two-seated-phone3.jpg](04-phone3-01-two-seated-phone3.jpg) | Cloud join form filled, not joined (focus ring clips label: carry) | Claude reviewer |
| ![05-host-02-rabakz-two-tv.jpg](05-host-02-rabakz-two-tv.jpg) | Rabakz Q1 of 10, Fern and Moss "Thinking" | Claude reviewer |
| ![06-phone1-02-rabakz-two-phone1.jpg](06-phone1-02-rabakz-two-phone1.jpg) | Four answer pads (Skip for leader), all scores 0 | Claude reviewer |
| ![07-phone2-02-rabakz-two-phone2.jpg](07-phone2-02-rabakz-two-phone2.jpg) | Four answer pads (Skip for leader), all scores 0 | Claude reviewer |
| ![08-phone3-02-rabakz-two-phone3.jpg](08-phone3-02-rabakz-two-phone3.jpg) | Cloud still on join form | Claude reviewer |
| ![09-host-03-rabakz-waiting-tv.jpg](09-host-03-rabakz-waiting-tv.jpg) | Q2 of 10; Cloud seat 3 added with "→ Next question" | Claude reviewer |
| ![10-phone1-03-rabakz-waiting-phone1.jpg](10-phone1-03-rabakz-waiting-phone1.jpg) | Fern Score 100, Streak 1 (answered Q1), Q2 pads | Claude reviewer |
| ![11-phone2-03-rabakz-waiting-phone2.jpg](11-phone2-03-rabakz-waiting-phone2.jpg) | Moss Q2 pads, 0 | Claude reviewer |
| ![12-phone3-03-rabakz-waiting-phone3.jpg](12-phone3-03-rabakz-waiting-phone3.jpg) | Cloud seat 3, Score/Streak/Points 0, "You join at the next question", no pads | Claude reviewer |
| ![13-host-04-rabakz-entered-tv.jpg](13-host-04-rabakz-entered-tv.jpg) | Q3 of 10; Fern, Moss, Cloud all "Thinking" | Claude reviewer |
| ![14-phone1-04-rabakz-entered-phone1.jpg](14-phone1-04-rabakz-entered-phone1.jpg) | Fern 100 with pads; Moss 0 with pads; all phones "Connected" | Claude reviewer |
| ![15-phone2-04-rabakz-entered-phone2.jpg](15-phone2-04-rabakz-entered-phone2.jpg) | Fern 100 with pads; Moss 0 with pads; all phones "Connected" | Claude reviewer |
| ![16-phone3-04-rabakz-entered-phone3.jpg](16-phone3-04-rabakz-entered-phone3.jpg) | Cloud has Q3 pads, Score 0 | Claude reviewer |
| ![17-host-05-rabakz-picker-tv.jpg](17-host-05-rabakz-picker-tv.jpg) | Picker after quit, "3 of 8 players", Rabakz focused; Cloud seat 3 "Fern is choosing" | Claude reviewer |
| ![18-phone1-05-rabakz-picker-phone1.jpg](18-phone1-05-rabakz-picker-phone1.jpg) | Picker after quit, "3 of 8 players", Rabakz focused; Cloud seat 3 "Fern is choosing" | Claude reviewer |
| ![19-phone2-05-rabakz-picker-phone2.jpg](19-phone2-05-rabakz-picker-phone2.jpg) | Picker after quit, "3 of 8 players", Rabakz focused; Cloud seat 3 "Fern is choosing" | Claude reviewer |
| ![20-phone3-05-rabakz-picker-phone3.jpg](20-phone3-05-rabakz-picker-phone3.jpg) | Picker after quit, "3 of 8 players", Rabakz focused; Cloud seat 3 "Fern is choosing" | Claude reviewer |
| ![21-host-06-poker-two-tv.jpg](21-host-06-poker-two-tv.jpg) | Peek Poker round 1 of 5 memorise 20, Fern and Moss | Claude reviewer |
| ![22-phone1-06-poker-two-phone1.jpg](22-phone1-06-poker-two-phone1.jpg) | Felt theme, "Watch the TV" 20; contrast passes (D-194 merged) | Claude reviewer |
| ![23-phone2-06-poker-two-phone2.jpg](23-phone2-06-poker-two-phone2.jpg) | Felt theme, "Watch the TV" 20; contrast passes (D-194 merged) | Claude reviewer |
| ![24-phone3-06-poker-two-phone3.jpg](24-phone3-06-poker-two-phone3.jpg) | Cloud join form, "You've left the room" | Claude reviewer |
| ![25-host-07-poker-waiting-tv.jpg](25-host-07-poker-waiting-tv.jpg) | Round 1 (19); roster "3 Cloud — Next round" | Claude reviewer |
| ![26-phone1-07-poker-waiting-phone1.jpg](26-phone1-07-poker-waiting-phone1.jpg) | Unchanged, 19, contrast passes | Claude reviewer |
| ![27-phone2-07-poker-waiting-phone2.jpg](27-phone2-07-poker-waiting-phone2.jpg) | Unchanged, 19, contrast passes | Claude reviewer |
| ![28-phone3-07-poker-waiting-phone3.jpg](28-phone3-07-poker-waiting-phone3.jpg) | Cloud on felt: only "You join at the next round"; no grid or cards | Claude reviewer |
| ![29-host-08-poker-entered-tv.jpg](29-host-08-poker-entered-tv.jpg) | Round 2 of 5 (16), new grid; Cloud without tag | Claude reviewer |
| ![30-phone1-08-poker-entered-phone1.jpg](30-phone1-08-poker-entered-phone1.jpg) | All three "Watch the TV" countdown, same controls, "Connected" | Claude reviewer |
| ![31-phone2-08-poker-entered-phone2.jpg](31-phone2-08-poker-entered-phone2.jpg) | All three "Watch the TV" countdown, same controls, "Connected" | Claude reviewer |
| ![32-phone3-08-poker-entered-phone3.jpg](32-phone3-08-poker-entered-phone3.jpg) | All three "Watch the TV" countdown, same controls, "Connected" | Claude reviewer |
| ![33-host-09-poker-picker-tv.jpg](33-host-09-poker-picker-tv.jpg) | Picker "3 of 8 players", Peek Poker; Cloud seated | Claude reviewer |
| ![34-phone1-09-poker-picker-phone1.jpg](34-phone1-09-poker-picker-phone1.jpg) | Picker "3 of 8 players", Peek Poker; Cloud seated | Claude reviewer |
| ![35-phone2-09-poker-picker-phone2.jpg](35-phone2-09-poker-picker-phone2.jpg) | Picker "3 of 8 players", Peek Poker; Cloud seated | Claude reviewer |
| ![36-phone3-09-poker-picker-phone3.jpg](36-phone3-09-poker-picker-phone3.jpg) | Picker "3 of 8 players", Peek Poker; Cloud seated | Claude reviewer |
| ![37-host-13-team-held-tv.jpg](37-host-13-team-held-tv.jpg) | Rabakz Q1 (team match per script), roster Fern and Moss only; teams not visible | Claude reviewer |
| ![38-phone1-13-team-held-phone1.jpg](38-phone1-13-team-held-phone1.jpg) | Q1 pads, scores 0 | Claude reviewer |
| ![39-phone2-13-team-held-phone2.jpg](39-phone2-13-team-held-phone2.jpg) | Q1 pads, scores 0 | Claude reviewer |
| ![40-phone3-13-team-held-phone3.jpg](40-phone3-13-team-held-phone3.jpg) | Cloud held: "Waiting for the lobby / You can join when the current game ends." with Leave | Claude reviewer |
| ![41-host-14-team-admitted-tv.jpg](41-host-14-team-admitted-tv.jpg) | Picker "3 of 8 players"; Cloud admitted to seat 3, "Fern is choosing … Rabakz" | Claude reviewer |
| ![42-phone1-14-team-admitted-phone1.jpg](42-phone1-14-team-admitted-phone1.jpg) | Picker "3 of 8 players"; Cloud admitted to seat 3, "Fern is choosing … Rabakz" | Claude reviewer |
| ![43-phone2-14-team-admitted-phone2.jpg](43-phone2-14-team-admitted-phone2.jpg) | Picker "3 of 8 players"; Cloud admitted to seat 3, "Fern is choosing … Rabakz" | Claude reviewer |
| ![44-phone3-14-team-admitted-phone3.jpg](44-phone3-14-team-admitted-phone3.jpg) | Picker "3 of 8 players"; Cloud admitted to seat 3, "Fern is choosing … Rabakz" | Claude reviewer |
| ![45-host-10-denied-two-tv.jpg](45-host-10-denied-two-tv.jpg) | Fresh room, Console test running (Steps 26) | Claude reviewer |
| ![46-phone1-10-denied-two-phone1.jpg](46-phone1-10-denied-two-phone1.jpg) | Own secret only (seat-1 / seat-2 seed 15) | Claude reviewer |
| ![47-phone2-10-denied-two-phone2.jpg](47-phone2-10-denied-two-phone2.jpg) | Own secret only (seat-1 / seat-2 seed 15) | Claude reviewer |
| ![48-phone3-10-denied-two-phone3.jpg](48-phone3-10-denied-two-phone3.jpg) | Cloud join form for NK5J5QF5 (carry: focus ring) | Claude reviewer |
| ![49-host-11-held-tv.jpg](49-host-11-held-tv.jpg) | Console test still running (Steps 63) | Claude reviewer |
| ![50-phone1-11-held-phone1.jpg](50-phone1-11-held-phone1.jpg) | Unchanged (same as 46 and 47) | Claude reviewer |
| ![51-phone2-11-held-phone2.jpg](51-phone2-11-held-phone2.jpg) | Unchanged (same as 46 and 47) | Claude reviewer |
| ![52-phone3-11-held-phone3.jpg](52-phone3-11-held-phone3.jpg) | Cloud held, "Waiting for the lobby", Leave on screen | Claude reviewer |
| ![53-host-12-held-admitted-tv.jpg](53-host-12-held-admitted-tv.jpg) | Picker "3 of 8 players", Console test | Claude reviewer |
| ![54-phone1-12-held-admitted-phone1.jpg](54-phone1-12-held-admitted-phone1.jpg) | Fern leader controls, Console test focused | Claude reviewer |
| ![55-phone2-12-held-admitted-phone2.jpg](55-phone2-12-held-admitted-phone2.jpg) | Moss "Fern is choosing … Console test" | Claude reviewer |
| ![56-phone3-12-held-admitted-phone3.jpg](56-phone3-12-held-admitted-phone3.jpg) | Cloud seat 3, "Fern is choosing … Console test", Leave | Claude reviewer |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| A game declares mid-match joining (`GameMeta.midGameJoin`, conformance-checked) | Pass | types.ts, conformance.ts, conformance-broken test |
| Rabakz free-for-all joiner seated at once, waits safely, enters at the next question with 0 against an earned 100 | Pass | 09, 10, 12, 13, 14, 16; rabakz session/rules tests |
| Peek Poker joiner gets no cards or picks, enters next round with 0 | Pass (0 by assertion) | 25, 28, 29, 32; peek-poker session test |
| Running team match holds the phone; admitted at picker | Pass (teams on per script; not visible in 37) | 40, 44; apps/web late-join.test.ts |
| `midGameJoin: false` game holds the phone; admitted at picker | Pass | 52, 56; reconnect/late-join.test.ts |
| Leave or disconnect cancels a held request; one seat per held phone | Pass | reconnect/late-join.test.ts |
| Host recovers after the signalling socket trips in wound fake time | Pass | 14–16, 30–32 "Connected"; Cloud re-joins after both winds (40→44) |
