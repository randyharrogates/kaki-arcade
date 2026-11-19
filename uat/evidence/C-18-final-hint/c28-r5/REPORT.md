# C-18-final-hint UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-18-final-hint --phones 8 --max-mb 30 --timeout-min 25 --out c28-r5`
Commit: `8fe2f2819ae0f51e74e812ede4e6e87c03cee21e`
Viewports: 1920×1080, 1280×720, 3840×2160

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 967.1 | completed |
| peek-poker: run unanswered rounds to the final screen | 32534.1 | completed |
| peek-poker: 1920 phone band clearance | 158.3 | completed |
| peek-poker: 1280 phone band clearance | 114.8 | completed |
| peek-poker: 3840 phone band clearance | 959.3 | completed |
| peek-poker: 1920 keyboard band clearance | 161.6 | completed |
| peek-poker: 1280 keyboard band clearance | 113.3 | completed |
| peek-poker: 3840 keyboard band clearance | 877.7 | completed |
| Create room through host page | 1104.8 | completed |
| rabakz-ffa: run unanswered rounds to the final screen | 180356.1 | completed |
| rabakz-ffa: 1920 phone band clearance | 133.8 | completed |
| rabakz-ffa: 1280 phone band clearance | 106.1 | completed |
| rabakz-ffa: 3840 phone band clearance | 306.6 | completed |
| rabakz-ffa: 1920 keyboard band clearance | 111.0 | completed |
| rabakz-ffa: 1280 keyboard band clearance | 86.4 | completed |
| rabakz-ffa: 3840 keyboard band clearance | 316.2 | completed |
| Create room through host page | 995.6 | completed |
| rabakz-teams: run unanswered rounds to the final screen | 174531.1 | completed |
| rabakz-teams: 1920 phone band clearance | 133.6 | completed |
| rabakz-teams: 1280 phone band clearance | 111.4 | completed |
| rabakz-teams: 3840 phone band clearance | 238.5 | completed |
| rabakz-teams: 1920 keyboard band clearance | 94.4 | completed |
| rabakz-teams: 1280 keyboard band clearance | 101.3 | completed |
| rabakz-teams: 3840 keyboard band clearance | 239.3 | completed |
| Create room through host page | 868.3 | completed |
| rabakz-teams-untied: run scored rounds to the final screen | 144207.0 | completed |
| rabakz-teams-untied: 1920 phone band clearance | 216.2 | completed |
| rabakz-teams-untied: 1920 keyboard band clearance | 173.0 | completed |
| Create room through host page | 1189.2 | completed |
| rabakz-solo: run unanswered rounds to the final screen | 141800.4 | completed |
| rabakz-solo: 1920 phone band clearance | 160.4 | completed |
| rabakz-solo: 1920 keyboard band clearance | 148.2 | completed |
| Create room through host page | 1101.8 | completed |
| rabakz-four: run unanswered rounds to the final screen | 160575.6 | completed |
| rabakz-four: 1920 phone band clearance | 148.5 | completed |
| rabakz-four: 1920 keyboard band clearance | 110.5 | completed |
| Create room through host page | 297.9 | completed |
| peek-poker-reduced: run unanswered rounds to the final screen | 108206.2 | completed |
| peek-poker-reduced: 1920 phone band clearance | 151.4 | completed |
| peek-poker-reduced: 1280 phone band clearance | 100.7 | completed |
| peek-poker-reduced: 3840 phone band clearance | 567.5 | completed |
| peek-poker-reduced: 1920 keyboard band clearance | 122.7 | completed |
| peek-poker-reduced: 1280 keyboard band clearance | 104.9 | completed |
| peek-poker-reduced: 3840 keyboard band clearance | 766.9 | completed |
| Create room through host page | 497.2 | completed |
| rabakz-reduced: run unanswered rounds to the final screen | 153256.5 | completed |
| rabakz-reduced: 1920 phone band clearance | 114.7 | completed |
| rabakz-reduced: 1280 phone band clearance | 101.6 | completed |
| rabakz-reduced: 3840 phone band clearance | 215.4 | completed |
| rabakz-reduced: 1920 keyboard band clearance | 122.3 | completed |
| rabakz-reduced: 1280 keyboard band clearance | 99.9 | completed |
| rabakz-reduced: 3840 keyboard band clearance | 231.7 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-peek-poker-1920-phone.jpg](01-host-peek-poker-1920-phone.jpg) | | |
| ![02-host-peek-poker-1280-phone.jpg](02-host-peek-poker-1280-phone.jpg) | | |
| ![03-host-peek-poker-3840-phone.png](03-host-peek-poker-3840-phone.png) | | |
| ![04-host-peek-poker-1920-keyboard.jpg](04-host-peek-poker-1920-keyboard.jpg) | | |
| ![05-host-peek-poker-1280-keyboard.jpg](05-host-peek-poker-1280-keyboard.jpg) | | |
| ![06-host-peek-poker-3840-keyboard.png](06-host-peek-poker-3840-keyboard.png) | | |
| ![07-host-rabakz-ffa-1920-phone.jpg](07-host-rabakz-ffa-1920-phone.jpg) | | |
| ![08-host-rabakz-ffa-1280-phone.jpg](08-host-rabakz-ffa-1280-phone.jpg) | | |
| ![09-host-rabakz-ffa-3840-phone.png](09-host-rabakz-ffa-3840-phone.png) | | |
| ![10-host-rabakz-ffa-1920-keyboard.jpg](10-host-rabakz-ffa-1920-keyboard.jpg) | | |
| ![11-host-rabakz-ffa-1280-keyboard.jpg](11-host-rabakz-ffa-1280-keyboard.jpg) | | |
| ![12-host-rabakz-ffa-3840-keyboard.png](12-host-rabakz-ffa-3840-keyboard.png) | | |
| ![20-host-rabakz-teams-1920-phone.jpg](20-host-rabakz-teams-1920-phone.jpg) | | |
| ![21-host-rabakz-teams-1280-phone.jpg](21-host-rabakz-teams-1280-phone.jpg) | | |
| ![22-host-rabakz-teams-3840-phone.png](22-host-rabakz-teams-3840-phone.png) | | |
| ![23-host-rabakz-teams-1920-keyboard.jpg](23-host-rabakz-teams-1920-keyboard.jpg) | | |
| ![24-host-rabakz-teams-1280-keyboard.jpg](24-host-rabakz-teams-1280-keyboard.jpg) | | |
| ![25-host-rabakz-teams-3840-keyboard.png](25-host-rabakz-teams-3840-keyboard.png) | | |
| ![26-host-rabakz-teams-untied-1920-phone.jpg](26-host-rabakz-teams-untied-1920-phone.jpg) | | |
| ![27-host-rabakz-teams-untied-1920-keyboard.jpg](27-host-rabakz-teams-untied-1920-keyboard.jpg) | | |
| ![28-host-rabakz-solo-1920-phone.jpg](28-host-rabakz-solo-1920-phone.jpg) | | |
| ![29-host-rabakz-solo-1920-keyboard.jpg](29-host-rabakz-solo-1920-keyboard.jpg) | | |
| ![30-host-rabakz-four-1920-phone.jpg](30-host-rabakz-four-1920-phone.jpg) | | |
| ![31-host-rabakz-four-1920-keyboard.jpg](31-host-rabakz-four-1920-keyboard.jpg) | | |
| ![39-host-peek-poker-reduced-1920-phone.jpg](39-host-peek-poker-reduced-1920-phone.jpg) | | |
| ![40-host-peek-poker-reduced-1280-phone.jpg](40-host-peek-poker-reduced-1280-phone.jpg) | | |
| ![41-host-peek-poker-reduced-3840-phone.png](41-host-peek-poker-reduced-3840-phone.png) | | |
| ![42-host-peek-poker-reduced-1920-keyboard.jpg](42-host-peek-poker-reduced-1920-keyboard.jpg) | | |
| ![43-host-peek-poker-reduced-1280-keyboard.jpg](43-host-peek-poker-reduced-1280-keyboard.jpg) | | |
| ![44-host-peek-poker-reduced-3840-keyboard.png](44-host-peek-poker-reduced-3840-keyboard.png) | | |
| ![52-host-rabakz-reduced-1920-phone.jpg](52-host-rabakz-reduced-1920-phone.jpg) | | |
| ![53-host-rabakz-reduced-1280-phone.jpg](53-host-rabakz-reduced-1280-phone.jpg) | | |
| ![54-host-rabakz-reduced-3840-phone.png](54-host-rabakz-reduced-3840-phone.png) | | |
| ![55-host-rabakz-reduced-1920-keyboard.jpg](55-host-rabakz-reduced-1920-keyboard.jpg) | | |
| ![56-host-rabakz-reduced-1280-keyboard.jpg](56-host-rabakz-reduced-1280-keyboard.jpg) | | |
| ![57-host-rabakz-reduced-3840-keyboard.png](57-host-rabakz-reduced-3840-keyboard.png) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![19-strip-rabakz-final-exit.jpg](19-strip-rabakz-final-exit.jpg) | | |
| ![38-strip-peek-poker-reduced-final-entrance.jpg](38-strip-peek-poker-reduced-final-entrance.jpg) | | |
| ![51-strip-rabakz-reduced-final-entrance.jpg](51-strip-rabakz-reduced-final-entrance.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Visual review (integrator, 2026-11-20)

| Screenshot | What it shows | Looked at by |
|---|---|---|
| 19-strip-rabakz-final-exit.jpg | Rabakz final screen leaving for the results: the old and new screens overlap, the hint stays with the outgoing screen, no blank frame. | Claude (integrator) |
| 38-strip-peek-poker-reduced-final-entrance.jpg | Peek Poker final scores under reduced motion: the board and "The leader continues on their phone" are at full strength from the first frame; nothing moves. | Claude (integrator) |
| 51-strip-rabakz-reduced-final-entrance.jpg | Rabakz "Final results" under reduced motion: the hint is present from the first frame with no fade. | Claude (integrator) |
