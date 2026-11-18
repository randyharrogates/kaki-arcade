# C-17-late-join UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-17-late-join --phones 3 --out r3-p3b`
Commit: `59efc187b4bd2e631bb9967bb421a004145ef7ec`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1678.4 | completed |
| Two players seated; third phone has not joined | 1272.2 | completed |
| Rabakz running with two players | 3230.3 | completed |
| Third phone seated with zero and safe next-question controls | 5196.4 | completed |
| Rabakz next question enables third phone at zero | 20986.2 | completed |
| Peek Poker running with two players | 2048.5 | completed |
| Third phone seated with no private cards and next-round message | 951.1 | completed |
| Peek Poker next round enables the third player at zero | 18186.4 | failed |

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
| ![37-host-failure.png](37-host-failure.png) | | |
| ![40-phone3-failure.png](40-phone3-failure.png) | | |
| ![39-phone2-failure.png](39-phone2-failure.png) | | |
| ![38-phone1-failure.png](38-phone1-failure.png) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Superseded by r3-p3d

This run is superseded because the Peek Poker clock wind tripped the host signalling keepalive, so the reconnect probe’s 426 failed the run. See ../r3-p3d/REPORT.md for the reviewed run.
