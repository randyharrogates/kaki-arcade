# C-17-late-join UAT evidence

Looked at by the integrator (stills 29, 41 and the round-4 additions) and by the Claude reviewer (C-17 review 3, every still; byte-identical stills checked by md5). Visual review complete.

Command: `node tools/uat/run.mjs -- C-17-late-join --phones 3 --out r4-p3`
Commit: `c6099a67f540cabbf2114392b9c62fa484d73e03`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 3142.6 | completed |
| Two players seated; third phone has not joined | 1536.0 | completed |
| Rabakz running with two players | 3478.8 | completed |
| Third phone seated with zero and safe next-question controls | 5263.4 | completed |
| Rabakz next question enables third phone at zero | 12956.0 | completed |
| Peek Poker running with two players | 2028.2 | completed |
| Third phone seated with no private cards and next-round message | 980.0 | completed |
| Peek Poker next round enables the third player at zero | 18329.7 | completed |
| Rabakz teams hold Cloud until the picker | 3224.6 | completed |
| Create room through host page | 885.8 | completed |
| Game with midGameJoin false holds the third phone | 2352.0 | completed |
| Returning to picker admits the held phone automatically | 1041.5 | completed |

Expected errors (count):
- 1 × host: Failed to load resource: the server responded with a status of 426 (Upgrade Required)
- 1 × host: net::ERR_ABORTED

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| 01-host-01-two-seated-tv | Lobby P2D2 ZNHQ; Fern (Leader) and Moss Connected; "2 of 8 players" | Claude reviewer |
| 02-phone1-01-two-seated-phone1 | Fern seat 1 "You're in.", leader, Pick a game / Change name | Claude reviewer |
| 03-phone2-01-two-seated-phone2 | Moss seat 2 "Waiting for the leader to pick a game" | Claude reviewer |
| 04-phone3-01-two-seated-phone3 | Cloud join form filled (P2D2ZNHQ), not joined; focus ring clips label (carry) | Claude reviewer |
| 05-host-02-rabakz-two-tv | Rabakz Question 1 of 10; Fern and Moss "Thinking" | Claude reviewer |
| 06-phone1-02-rabakz-two-phone1 | Four answer pads plus Skip (leader); Score/Streak/Points 0; Connected | Claude reviewer |
| 07-phone2-02-rabakz-two-phone2 | Four answer pads; scores 0; Connected | Claude reviewer |
| 08-phone3-02-rabakz-two-phone3 | Same as 04 (md5): Cloud still on join form | Claude reviewer |
| 09-host-03-rabakz-waiting-tv | Question 2 of 10; Cloud seat 3 added with "→ Next question" | Claude reviewer |
| 10-phone1-03-rabakz-waiting-phone1 | Fern Score 100, Streak 1 (answered Q1); Q2 pads | Claude reviewer |
| 11-phone2-03-rabakz-waiting-phone2 | Moss Q2 pads, Score 0 | Claude reviewer |
| 12-phone3-03-rabakz-waiting-phone3 | Cloud seat 3, Score/Streak/Points 0, "You join at the next question", no pads | Claude reviewer |
| 13-host-04-rabakz-entered-tv | Question 3 of 10; Fern, Moss and Cloud all "Thinking" | Claude reviewer |
| 14-phone1-04-rabakz-entered-phone1 | Fern Score 100 with Q3 pads; Connected after the clock wind | Claude reviewer |
| 15-phone2-04-rabakz-entered-phone2 | Moss Score 0 with Q3 pads; Connected | Claude reviewer |
| 16-phone3-04-rabakz-entered-phone3 | Cloud has Q3 pads, Score 0; Connected | Claude reviewer |
| 17-host-05-rabakz-picker-tv | Picker after quit, "3 of 8 players", "Fern is choosing: Rabakz" | Claude reviewer |
| 18-phone1-05-rabakz-picker-phone1 | Fern "You choose the game", Previous/Next/Select/Back | Claude reviewer |
| 19-phone2-05-rabakz-picker-phone2 | Moss "Fern is choosing … Rabakz" | Claude reviewer |
| 20-phone3-05-rabakz-picker-phone3 | Cloud seat 3 "Fern is choosing … Rabakz", Leave | Claude reviewer |
| 21-host-06-poker-two-tv | Peek Poker Round 1 of 5, memorise 20; Fern and Moss | Claude reviewer |
| 22-phone1-06-poker-two-phone1 | Felt theme, "Watch the TV", 20; cream text, contrast passes | Claude reviewer |
| 23-phone2-06-poker-two-phone2 | Same for Moss | Claude reviewer |
| 24-phone3-06-poker-two-phone3 | Cloud join form, "You've left the room" | Claude reviewer |
| 25-host-07-poker-waiting-tv | Round 1 (20); roster "3 Cloud — Next round"; grid unchanged | Claude reviewer |
| 26-phone1-07-poker-waiting-phone1 | Fern unchanged, 19 | Claude reviewer |
| 27-phone2-07-poker-waiting-phone2 | Moss unchanged, 19 | Claude reviewer |
| 28-phone3-07-poker-waiting-phone3 | Cloud on felt: only "You join at the next round"; no grid, cards or picks | Claude reviewer |
| 29-host-08-poker-round-one-scores-tv | Round 1 reveal (5): "1. Fern Pair · 3 pts, 2. Moss Pair · 2 pts"; Cloud "Next round", not listed | Claude reviewer |
| 30-phone1-08-poker-round-one-scores-phone1 | Fern "Scores on the TV"; Connected | Claude reviewer |
| 31-phone2-08-poker-round-one-scores-phone2 | Moss "Scores on the TV"; Connected | Claude reviewer |
| 32-phone3-08-poker-round-one-scores-phone3 | Same as 28 (md5): Cloud still waiting | Claude reviewer |
| 33-host-08-poker-entered-tv | Round 2 of 5 (16), new grid; Cloud in roster without tag | Claude reviewer |
| 34-phone1-08-poker-entered-phone1 | Fern "Watch the TV" 16; Connected after the clock wind | Claude reviewer |
| 35-phone2-08-poker-entered-phone2 | Moss "Watch the TV" 16; Connected | Claude reviewer |
| 36-phone3-08-poker-entered-phone3 | Cloud "Watch the TV" 16, the same controls as the others (Cloud's 0 by assertion) | Claude reviewer |
| 37-host-09-poker-picker-tv | Picker "3 of 8 players", "Fern is choosing: Peek Poker" | Claude reviewer |
| 38-phone1-09-poker-picker-phone1 | Fern leader controls, Peek Poker | Claude reviewer |
| 39-phone2-09-poker-picker-phone2 | Moss "Fern is choosing … Peek Poker" | Claude reviewer |
| 40-phone3-09-poker-picker-phone3 | Cloud seat 3 "Fern is choosing … Peek Poker", Leave | Claude reviewer |
| 41-host-13-team-setup-before-start | "Pick a side · Rabakz · team mode"; Red 1 Fern (Leader), Blue 1 Moss; Start | Claude reviewer |
| 42-host-13-team-held-tv | Rabakz Q1 of 10 in the team match; roster Fern and Moss only | Claude reviewer |
| 43-phone1-13-team-held-phone1 | Fern Q1 pads plus Skip, scores 0 | Claude reviewer |
| 44-phone2-13-team-held-phone2 | Moss Q1 pads, scores 0 | Claude reviewer |
| 45-phone3-13-team-held-phone3 | Cloud held: "Waiting for the lobby / You can join when the current game ends.", Leave; no controller shell | Claude reviewer |
| 46–49 team-admitted | Same as 17–20 (md5): picker "3 of 8 players", Rabakz; Cloud admitted to seat 3 | Claude reviewer |
| 50-host-10-denied-two-tv | Fresh room, Console test running (Steps 26, Inputs 0) | Claude reviewer |
| 51-phone1-10-denied-two-phone1 | Own secret only ("Secret seat-1 seed 15"), Advance | Claude reviewer |
| 52-phone2-10-denied-two-phone2 | Own secret only ("Secret seat-2 seed 15") | Claude reviewer |
| 53-phone3-10-denied-two-phone3 | Cloud join form for 6QTF4TZ6 (carry: focus ring) | Claude reviewer |
| 54-host-11-held-tv | Console test still running (Steps 62) | Claude reviewer |
| 55/56-phone1/2-11-held | Same as 51 and 52 (md5): unchanged | Claude reviewer |
| 57-phone3-11-held-phone3 | Same as 45 (md5): "Waiting for the lobby", Leave | Claude reviewer |
| 58-host-12-held-admitted-tv | Picker "3 of 8 players", "Fern is choosing: Console test" | Claude reviewer |
| 59-phone1-12-held-admitted-phone1 | Fern leader controls, Console test | Claude reviewer |
| 60-phone2-12-held-admitted-phone2 | Moss "Fern is choosing … Console test" | Claude reviewer |
| 61-phone3-12-held-admitted-phone3 | Cloud seat 3 "Fern is choosing … Console test", Leave | Claude reviewer |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| A game declares mid-match joining (`GameMeta.midGameJoin`, conformance-checked) | Pass | types.ts, conformance.ts, conformance-broken.test.ts |
| Rabakz free-for-all joiner is seated at once, waits safely, and enters at the next question with 0 while Fern has earned 100 | Pass | 09, 10, 12, 13, 14, 16; rabakz session and rules tests |
| Peek Poker joiner gets no cards or picks and enters the next round with 0; Fern's earned round-1 points are shown | Pass (Cloud's 0 by assertion) | 25, 28, 29, 33, 36; peek-poker session test |
| A running team match holds the phone; it is admitted at the picker | Pass | 41 (team mode), 42, 45, 46–49; apps/web late-join.test.ts |
| A `midGameJoin: false` game holds the phone; it is admitted at the picker | Pass | 54, 57, 58, 61; reconnect/late-join.test.ts |
| Held-hello replay seats once; a later hello only resumes; Leave or disconnect cancels | Pass | reconnect/late-join.test.ts (including the real-order test) |
| After each clock wind the host recovers, scoped to `/rooms/<code>/host` only | Pass | 14–16 and 34–36 "Connected"; Cloud's fresh join after both winds (45, then 46–49); run.json errors |
