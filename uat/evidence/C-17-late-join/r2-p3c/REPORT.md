# C-17-late-join UAT evidence

Looked at by the integrator, 2026-11-18 (key stills 12, 13, 28, 29, 44, 45–48; the rest on contact). The reviewer completes the table.

Command: `node tools/uat/run.mjs -- C-17-late-join --phones 3 --out r2-p3c`
Commit: `66419d467d6ddc433039b26a521a8721f774391d`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1329.5 | completed |
| Two players seated; third phone has not joined | 1101.9 | completed |
| Rabakz running with two players | 2429.4 | completed |
| Third phone seated with zero and safe next-question controls | 560.3 | completed |
| Rabakz next question enables third phone at zero | 5971.2 | completed |
| Peek Poker running with two players | 2060.1 | completed |
| Third phone seated with no private cards and next-round message | 910.6 | completed |
| Peek Poker next round enables the third player at zero | 17848.2 | completed |
| Create room through host page | 866.1 | completed |
| Game with midGameJoin false holds the third phone | 2301.9 | completed |
| Returning to picker admits the held phone automatically | 1013.7 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-01-two-seated-tv.jpg](01-host-01-two-seated-tv.jpg) | | |
| ![02-phone1-01-two-seated-phone1.jpg](02-phone1-01-two-seated-phone1.jpg) | | |
| ![03-phone2-01-two-seated-phone2.jpg](03-phone2-01-two-seated-phone2.jpg) | | |
| ![04-phone3-01-two-seated-phone3.jpg](04-phone3-01-two-seated-phone3.jpg) | | |
| ![05-host-02-rabakz-two-tv.jpg](05-host-02-rabakz-two-tv.jpg) | | |
| ![06-phone1-02-rabakz-two-phone1.jpg](06-phone1-02-rabakz-two-phone1.jpg) | | |
| ![07-phone2-02-rabakz-two-phone2.jpg](07-phone2-02-rabakz-two-phone2.jpg) | | |
| ![08-phone3-02-rabakz-two-phone3.jpg](08-phone3-02-rabakz-two-phone3.jpg) | | |
| ![09-host-03-rabakz-waiting-tv.jpg](09-host-03-rabakz-waiting-tv.jpg) | | |
| ![10-phone1-03-rabakz-waiting-phone1.jpg](10-phone1-03-rabakz-waiting-phone1.jpg) | | |
| ![11-phone2-03-rabakz-waiting-phone2.jpg](11-phone2-03-rabakz-waiting-phone2.jpg) | | |
| ![12-phone3-03-rabakz-waiting-phone3.jpg](12-phone3-03-rabakz-waiting-phone3.jpg) | | |
| ![13-host-04-rabakz-entered-tv.jpg](13-host-04-rabakz-entered-tv.jpg) | | |
| ![14-phone1-04-rabakz-entered-phone1.jpg](14-phone1-04-rabakz-entered-phone1.jpg) | | |
| ![15-phone2-04-rabakz-entered-phone2.jpg](15-phone2-04-rabakz-entered-phone2.jpg) | | |
| ![16-phone3-04-rabakz-entered-phone3.jpg](16-phone3-04-rabakz-entered-phone3.jpg) | | |
| ![17-host-05-rabakz-picker-tv.jpg](17-host-05-rabakz-picker-tv.jpg) | | |
| ![18-phone1-05-rabakz-picker-phone1.jpg](18-phone1-05-rabakz-picker-phone1.jpg) | | |
| ![19-phone2-05-rabakz-picker-phone2.jpg](19-phone2-05-rabakz-picker-phone2.jpg) | | |
| ![20-phone3-05-rabakz-picker-phone3.jpg](20-phone3-05-rabakz-picker-phone3.jpg) | | |
| ![21-host-06-poker-two-tv.jpg](21-host-06-poker-two-tv.jpg) | | |
| ![22-phone1-06-poker-two-phone1.jpg](22-phone1-06-poker-two-phone1.jpg) | | |
| ![23-phone2-06-poker-two-phone2.jpg](23-phone2-06-poker-two-phone2.jpg) | | |
| ![24-phone3-06-poker-two-phone3.jpg](24-phone3-06-poker-two-phone3.jpg) | | |
| ![25-host-07-poker-waiting-tv.jpg](25-host-07-poker-waiting-tv.jpg) | | |
| ![26-phone1-07-poker-waiting-phone1.jpg](26-phone1-07-poker-waiting-phone1.jpg) | | |
| ![27-phone2-07-poker-waiting-phone2.jpg](27-phone2-07-poker-waiting-phone2.jpg) | | |
| ![28-phone3-07-poker-waiting-phone3.jpg](28-phone3-07-poker-waiting-phone3.jpg) | | |
| ![29-host-08-poker-entered-tv.jpg](29-host-08-poker-entered-tv.jpg) | | |
| ![30-phone1-08-poker-entered-phone1.jpg](30-phone1-08-poker-entered-phone1.jpg) | | |
| ![31-phone2-08-poker-entered-phone2.jpg](31-phone2-08-poker-entered-phone2.jpg) | | |
| ![32-phone3-08-poker-entered-phone3.jpg](32-phone3-08-poker-entered-phone3.jpg) | | |
| ![33-host-09-poker-picker-tv.jpg](33-host-09-poker-picker-tv.jpg) | | |
| ![34-phone1-09-poker-picker-phone1.jpg](34-phone1-09-poker-picker-phone1.jpg) | | |
| ![35-phone2-09-poker-picker-phone2.jpg](35-phone2-09-poker-picker-phone2.jpg) | | |
| ![36-phone3-09-poker-picker-phone3.jpg](36-phone3-09-poker-picker-phone3.jpg) | | |
| ![37-host-10-denied-two-tv.jpg](37-host-10-denied-two-tv.jpg) | | |
| ![38-phone1-10-denied-two-phone1.jpg](38-phone1-10-denied-two-phone1.jpg) | | |
| ![39-phone2-10-denied-two-phone2.jpg](39-phone2-10-denied-two-phone2.jpg) | | |
| ![40-phone3-10-denied-two-phone3.jpg](40-phone3-10-denied-two-phone3.jpg) | | |
| ![41-host-11-held-tv.jpg](41-host-11-held-tv.jpg) | | |
| ![42-phone1-11-held-phone1.jpg](42-phone1-11-held-phone1.jpg) | | |
| ![43-phone2-11-held-phone2.jpg](43-phone2-11-held-phone2.jpg) | | |
| ![44-phone3-11-held-phone3.jpg](44-phone3-11-held-phone3.jpg) | | |
| ![45-host-12-held-admitted-tv.jpg](45-host-12-held-admitted-tv.jpg) | | |
| ![46-phone1-12-held-admitted-phone1.jpg](46-phone1-12-held-admitted-phone1.jpg) | | |
| ![47-phone2-12-held-admitted-phone2.jpg](47-phone2-12-held-admitted-phone2.jpg) | | |
| ![48-phone3-12-held-admitted-phone3.jpg](48-phone3-12-held-admitted-phone3.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
