# C-17-late-join UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-17-late-join --phones 3 --out r3-p3c`
Commit: `718685a0aee3797a27f6c821f96b0c884685c093`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1358.0 | completed |
| Two players seated; third phone has not joined | 1100.7 | completed |
| Rabakz running with two players | 2433.8 | completed |
| Third phone seated with zero and safe next-question controls | 5155.8 | completed |
| Rabakz next question enables third phone at zero | 19634.6 | failed |

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
| ![13-host-failure.png](13-host-failure.png) | | |
| ![15-phone2-failure.png](15-phone2-failure.png) | | |
| ![14-phone1-failure.png](14-phone1-failure.png) | | |
| ![16-phone3-failure.png](16-phone3-failure.png) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Superseded by r3-p3d

This run is superseded because a 30 s wind was too short after joining at question 2. See ../r3-p3d/REPORT.md for the reviewed run.
