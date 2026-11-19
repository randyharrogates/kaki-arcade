# C-27-local-seat UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-27-local-seat --phones 1 --out round1`
Commit: `d22ff510fe53d564107166d95e42a260707b248d`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 2020.1 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-01-local-only-start-refused.jpg](01-host-01-local-only-start-refused.jpg) | | |
| ![02-host-02-phone-leads-tv-watching.jpg](02-host-02-phone-leads-tv-watching.jpg) | | |
| ![03-host-03-phone-playing-tv-no-hand.jpg](03-host-03-phone-playing-tv-no-hand.jpg) | | |
| ![04-phone1-04-phone-hand.jpg](04-phone1-04-phone-hand.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
