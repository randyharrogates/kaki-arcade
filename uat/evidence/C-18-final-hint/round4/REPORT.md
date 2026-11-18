# C-18-final-hint UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

All 36 steps completed without errors; all 24 stills settled. Review 2 is clean.
Visual observations below are transcribed from review 2, not a new Codex visual review.

Command: `node tools/uat/run.mjs -- C-18-final-hint --phones 8 --timeout-min 20 --out round4`
Commit: `7097df65092f3c87c96ed553c81bdf000b660543`
Viewports: 1920×1080, 1280×720, 3840×2160

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 922.1 | completed |
| peek-poker: run unanswered rounds to the final screen | 29374.0 | completed |
| peek-poker: 1920 phone band clearance | 135.5 | completed |
| peek-poker: 1280 phone band clearance | 111.6 | completed |
| peek-poker: 3840 phone band clearance | 1017.1 | completed |
| peek-poker: 1920 keyboard band clearance | 173.8 | completed |
| peek-poker: 1280 keyboard band clearance | 104.3 | completed |
| peek-poker: 3840 keyboard band clearance | 996.9 | completed |
| Create room through host page | 1170.8 | completed |
| rabakz-ffa: run unanswered rounds to the final screen | 177587.1 | completed |
| rabakz-ffa: 1920 phone band clearance | 135.1 | completed |
| rabakz-ffa: 1280 phone band clearance | 103.6 | completed |
| rabakz-ffa: 3840 phone band clearance | 233.3 | completed |
| rabakz-ffa: 1920 keyboard band clearance | 105.0 | completed |
| rabakz-ffa: 1280 keyboard band clearance | 106.0 | completed |
| rabakz-ffa: 3840 keyboard band clearance | 248.5 | completed |
| Create room through host page | 858.9 | completed |
| rabakz-teams: run unanswered rounds to the final screen | 177936.3 | completed |
| rabakz-teams: 1920 phone band clearance | 125.5 | completed |
| rabakz-teams: 1280 phone band clearance | 95.1 | completed |
| rabakz-teams: 3840 phone band clearance | 228.1 | completed |
| rabakz-teams: 1920 keyboard band clearance | 149.4 | completed |
| rabakz-teams: 1280 keyboard band clearance | 109.6 | completed |
| rabakz-teams: 3840 keyboard band clearance | 217.5 | completed |
| Create room through host page | 860.3 | completed |
| rabakz-teams-untied: run scored rounds to the final screen | 158381.9 | completed |
| rabakz-teams-untied: 1920 phone band clearance | 123.6 | completed |
| rabakz-teams-untied: 1920 keyboard band clearance | 111.5 | completed |
| Create room through host page | 856.3 | completed |
| rabakz-solo: run unanswered rounds to the final screen | 155053.0 | completed |
| rabakz-solo: 1920 phone band clearance | 134.3 | completed |
| rabakz-solo: 1920 keyboard band clearance | 123.5 | completed |
| Create room through host page | 859.2 | completed |
| rabakz-four: run unanswered rounds to the final screen | 175854.1 | completed |
| rabakz-four: 1920 phone band clearance | 105.5 | completed |
| rabakz-four: 1920 keyboard band clearance | 114.0 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-peek-poker-1920-phone.jpg](01-host-peek-poker-1920-phone.jpg) | Peek Poker, 1920, phone hint; opened in full. | Claude reviewer, 2026-11-18 |
| ![02-host-peek-poker-1280-phone.jpg](02-host-peek-poker-1280-phone.jpg) | Peek Poker, 1280, phone hint; row runs, plinth edges and hint top measured by script only. | Claude reviewer, 2026-11-18 (script measurement only) |
| ![03-host-peek-poker-3840-phone.png](03-host-peek-poker-3840-phone.png) | Other hint variant or size of an opened or measured layout; not opened in review 2. | Not opened in review 2 |
| ![04-host-peek-poker-1920-keyboard.jpg](04-host-peek-poker-1920-keyboard.jpg) | Other hint variant or size of an opened or measured layout; not opened in review 2. | Not opened in review 2 |
| ![05-host-peek-poker-1280-keyboard.jpg](05-host-peek-poker-1280-keyboard.jpg) | Other hint variant or size of an opened or measured layout; not opened in review 2. | Not opened in review 2 |
| ![06-host-peek-poker-3840-keyboard.png](06-host-peek-poker-3840-keyboard.png) | Other hint variant or size of an opened or measured layout; not opened in review 2. | Not opened in review 2 |
| ![07-host-rabakz-ffa-1920-phone.jpg](07-host-rabakz-ffa-1920-phone.jpg) | Free-for-all, 1920, phone hint; plinth x = 55–1864 (55 px margins); score column x ≈ 1596, matching 13. | Claude reviewer, 2026-11-18; Claude integrator, 2026-11-18 |
| ![08-host-rabakz-ffa-1280-phone.jpg](08-host-rabakz-ffa-1280-phone.jpg) | Other hint variant or size of an opened or measured layout; not opened in review 2. | Not opened in review 2 |
| ![09-host-rabakz-ffa-3840-phone.png](09-host-rabakz-ffa-3840-phone.png) | Other hint variant or size of an opened or measured layout; not opened in review 2. | Not opened in review 2 |
| ![10-host-rabakz-ffa-1920-keyboard.jpg](10-host-rabakz-ffa-1920-keyboard.jpg) | Other hint variant or size of an opened or measured layout; not opened in review 2. | Not opened in review 2 |
| ![11-host-rabakz-ffa-1280-keyboard.jpg](11-host-rabakz-ffa-1280-keyboard.jpg) | Other hint variant or size of an opened or measured layout; not opened in review 2. | Not opened in review 2 |
| ![12-host-rabakz-ffa-3840-keyboard.png](12-host-rabakz-ffa-3840-keyboard.png) | Other hint variant or size of an opened or measured layout; not opened in review 2. | Not opened in review 2 |
| ![13-host-rabakz-teams-1920-phone.jpg](13-host-rabakz-teams-1920-phone.jpg) | Tied teams, 1920, phone hint; opened and podium enlarged. Plinth x = 55–1864; score column x ≈ 1596. Podium ink gaps: 29 px name-to-points, 26 px points-to-next-name, 5 px points-to-plinth. | Claude reviewer, 2026-11-18; Claude integrator, 2026-11-18 |
| ![14-host-rabakz-teams-1280-phone.jpg](14-host-rabakz-teams-1280-phone.jpg) | Tied teams, 1280, phone hint; plinth edges correspond to x = 55–1864 artboard px (55 px margins). | Claude reviewer, 2026-11-18 |
| ![15-host-rabakz-teams-3840-phone.png](15-host-rabakz-teams-3840-phone.png) | Tied teams, 3840, phone hint; script-measured plinth edges correspond to x = 55–1864 artboard px (55 px margins). | Claude reviewer, 2026-11-18 (script measurement only) |
| ![16-host-rabakz-teams-1920-keyboard.jpg](16-host-rabakz-teams-1920-keyboard.jpg) | Tied teams, 1920, keyboard hint; plinth x = 55–1864 (55 px margins). | Claude reviewer, 2026-11-18 |
| ![17-host-rabakz-teams-1280-keyboard.jpg](17-host-rabakz-teams-1280-keyboard.jpg) | Other hint variant or size of an opened or measured layout; not opened in review 2. | Not opened in review 2 |
| ![18-host-rabakz-teams-3840-keyboard.png](18-host-rabakz-teams-3840-keyboard.png) | Tied teams, 3840, keyboard hint; band cropped and enlarged, geometry measured by script. Plinth edges correspond to x = 55–1864 artboard px. | Claude reviewer, 2026-11-18 |
| ![19-host-rabakz-teams-untied-1920-phone.jpg](19-host-rabakz-teams-untied-1920-phone.jpg) | Untied eight-phone teams, Red 200 / Blue 100, three highlighted rows, phone hint; every row above band. Plinth x = 55–1864. Highlighted rows cropped and enlarged. | Claude reviewer, 2026-11-18; Claude integrator, 2026-11-18 |
| ![20-host-rabakz-teams-untied-1920-keyboard.jpg](20-host-rabakz-teams-untied-1920-keyboard.jpg) | Untied eight-phone teams, Red 200 / Blue 100, three highlighted rows, keyboard hint; every row above band. Plinth x = 55–1864. | Claude reviewer, 2026-11-18; Claude integrator, 2026-11-18 |
| ![21-host-rabakz-solo-1920-phone.jpg](21-host-rabakz-solo-1920-phone.jpg) | Solo final, 1920, phone hint; plenty of clearance. | Claude reviewer, 2026-11-18; Claude integrator, 2026-11-18 |
| ![22-host-rabakz-solo-1920-keyboard.jpg](22-host-rabakz-solo-1920-keyboard.jpg) | Solo final, 1920, keyboard hint; review 2 reports plenty of clearance for 21–22, but did not open 22. | Not opened in review 2 |
| ![23-host-rabakz-four-1920-phone.jpg](23-host-rabakz-four-1920-phone.jpg) | Four-player final, 1920, phone hint; plenty of clearance. Plinth x = 55–1864. | Claude reviewer, 2026-11-18; Claude integrator, 2026-11-18 |
| ![24-host-rabakz-four-1920-keyboard.jpg](24-host-rabakz-four-1920-keyboard.jpg) | Four-player final, 1920, keyboard hint; plenty of clearance. | Claude reviewer, 2026-11-18 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Full-width, centred Rabakz final body at full type size; clear of hint band | Pass (review 2) | Body 842.8 px in 847 px; plinth has 55 px margins in 07, 13–16, 18–20, 23. Last-row ink ends around 973–975 artboard px; hint ink starts 996–997, layout top about 991 (about 15 px layout clearance). |
| Untied eight-phone teams final clears the band in both hint variants | Pass (review 2) | 19–20: Red 200, Blue 100, three highlighted rows; every row above band. |
| Solo and four-player finals clear the band | Pass (review 2) | 21–24 at 1920: plenty of clearance; 22 not opened separately by reviewer. |
| Round4 execution completes and stills settle | Pass (review 2) | 36 steps, no errors, all 24 stills settled. |
