# X-05-browser-matrix UAT evidence

Host browser: chrome 157.0.8103.80
Phone browser: chromium 156.0.8078.4

REL-004 remains in progress. Automated Mac engines only: WebKit is not real Safari. Edge is not installed; real Safari, iPhone and Android await X-09 / K-07. TV browsers are not covered. REL-006 unsupported proof remains C-14.

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- X-05-browser-matrix --phones 2 --host-browser chrome --phone-browser chromium --out r3-chrome-chromium --max-mb 24`
Commit: `dc3e2e79821fd0b3304e879431072b0beb6d8a9c`
Viewports: 1920×1080, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1040.1 | completed |
| Supported pages and room created (REL-006) | 899.8 | completed |
| Phone 1 joins | 1106.0 | completed |
| Phone 2 joins | 891.0 | completed |
| Two-player lobby | 413.6 | completed |
| Open picker | 858.2 | completed |
| Select and start Peek Poker | 2517.7 | completed |
| Peek Poker pick and reveal | 20977.4 | completed |
| Peek Poker scoreboard | 8167.1 | completed |
| Menu pauses and Resume returns to play | 1310.8 | completed |
| Quit to picker | 878.5 | completed |
| Select and start Rabakz | 3180.6 | completed |
| Rabakz wrong answer holds, then correct answer and reveal | 2711.6 | completed |

Expected errors (count):
- 1 × host: Failed to load resource: the server responded with a status of 404 (Not Found)

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-room.jpg](01-host-room.jpg) | | |
| ![02-phone1-room.jpg](02-phone1-room.jpg) | | |
| ![03-phone2-room.jpg](03-phone2-room.jpg) | | |
| ![04-host-join-1.jpg](04-host-join-1.jpg) | | |
| ![05-phone1-join-1.jpg](05-phone1-join-1.jpg) | | |
| ![06-phone2-join-1.jpg](06-phone2-join-1.jpg) | | |
| ![07-host-join-2.jpg](07-host-join-2.jpg) | | |
| ![08-phone1-join-2.jpg](08-phone1-join-2.jpg) | | |
| ![09-phone2-join-2.jpg](09-phone2-join-2.jpg) | | |
| ![10-host-lobby.jpg](10-host-lobby.jpg) | | |
| ![11-phone1-lobby.jpg](11-phone1-lobby.jpg) | | |
| ![12-phone2-lobby.jpg](12-phone2-lobby.jpg) | | |
| ![13-host-picker.jpg](13-host-picker.jpg) | | |
| ![14-phone1-picker.jpg](14-phone1-picker.jpg) | | |
| ![15-phone2-picker.jpg](15-phone2-picker.jpg) | | |
| ![16-host-peek-settings.jpg](16-host-peek-settings.jpg) | | |
| ![17-phone1-peek-settings.jpg](17-phone1-peek-settings.jpg) | | |
| ![18-phone2-peek-settings.jpg](18-phone2-peek-settings.jpg) | | |
| ![19-host-peek-start.jpg](19-host-peek-start.jpg) | | |
| ![20-phone1-peek-start.jpg](20-phone1-peek-start.jpg) | | |
| ![21-phone2-peek-start.jpg](21-phone2-peek-start.jpg) | | |
| ![22-host-peek-pick.jpg](22-host-peek-pick.jpg) | | |
| ![23-phone1-peek-pick.jpg](23-phone1-peek-pick.jpg) | | |
| ![24-phone2-peek-pick.jpg](24-phone2-peek-pick.jpg) | | |
| ![25-host-peek-reveal.jpg](25-host-peek-reveal.jpg) | | |
| ![26-phone1-peek-reveal.jpg](26-phone1-peek-reveal.jpg) | | |
| ![27-phone2-peek-reveal.jpg](27-phone2-peek-reveal.jpg) | | |
| ![28-host-peek-scoreboard.jpg](28-host-peek-scoreboard.jpg) | | |
| ![29-phone1-peek-scoreboard.jpg](29-phone1-peek-scoreboard.jpg) | | |
| ![30-phone2-peek-scoreboard.jpg](30-phone2-peek-scoreboard.jpg) | | |
| ![31-host-paused.jpg](31-host-paused.jpg) | | |
| ![32-phone1-paused.jpg](32-phone1-paused.jpg) | | |
| ![33-phone2-paused.jpg](33-phone2-paused.jpg) | | |
| ![34-host-resumed.jpg](34-host-resumed.jpg) | | |
| ![35-phone1-resumed.jpg](35-phone1-resumed.jpg) | | |
| ![36-phone2-resumed.jpg](36-phone2-resumed.jpg) | | |
| ![37-host-quit-picker.jpg](37-host-quit-picker.jpg) | | |
| ![38-phone1-quit-picker.jpg](38-phone1-quit-picker.jpg) | | |
| ![39-phone2-quit-picker.jpg](39-phone2-quit-picker.jpg) | | |
| ![40-host-rabakz-settings.jpg](40-host-rabakz-settings.jpg) | | |
| ![41-phone1-rabakz-settings.jpg](41-phone1-rabakz-settings.jpg) | | |
| ![42-phone2-rabakz-settings.jpg](42-phone2-rabakz-settings.jpg) | | |
| ![43-host-rabakz-question-1.jpg](43-host-rabakz-question-1.jpg) | | |
| ![44-phone1-rabakz-question-1.jpg](44-phone1-rabakz-question-1.jpg) | | |
| ![45-phone2-rabakz-question-1.jpg](45-phone2-rabakz-question-1.jpg) | | |
| ![46-host-rabakz-answered.jpg](46-host-rabakz-answered.jpg) | | |
| ![47-phone1-rabakz-answered.jpg](47-phone1-rabakz-answered.jpg) | | |
| ![48-phone2-rabakz-answered.jpg](48-phone2-rabakz-answered.jpg) | | |
| ![49-host-rabakz-reveal.jpg](49-host-rabakz-reveal.jpg) | | |
| ![50-phone1-rabakz-reveal.jpg](50-phone1-rabakz-reveal.jpg) | | |
| ![51-phone2-rabakz-reveal.jpg](51-phone2-rabakz-reveal.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator visual review (2026-11-18)

Host branded Google Chrome 157, phones Playwright Chromium, Pixel 7 emulation. 13 steps passed.
One error, declared expected: the host's `/favicon.ico` 404 (the site has no favicon yet; X-01).
Looked at every TV still and both phones' stills and the seven named stills side by side with the
Chromium run: the same states as there (22 face-down grid; 40/41 settings loaded; 46–48 phone 2
Locked out after a wrong answer, TV marks it; 49–51 reveal at "+100 · 100 pts", phone "Score 100").
No two stills from 43 on are identical.

Provenance: this matrix run at `dc3e2e79` predates the round-4 harness cancellation change. It logged no cancellations; its result did not depend on that rule.
