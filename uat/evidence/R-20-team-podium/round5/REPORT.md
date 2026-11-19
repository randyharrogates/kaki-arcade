# R-20-team-podium UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- R-20-team-podium --phones 1 --out round5`
Commit: `71c70d4278d3dad72ade8702514ea5209acedc5c`
Viewports: 1920×1080, 1280×720, 1920×6648

| Timing | ms | Status |
|---|---:|---|
| late-no-team-1920 | 677.1 | completed |
| seven-one-teams-1920 | 155.3 | completed |
| partial-ties-1920 | 154.8 | completed |
| tie-second-1920 | 154.0 | completed |
| teams-scoreboard-1920 | 190.7 | completed |
| teams-distinct-1920 | 164.4 | completed |
| teams-tied-1920 | 156.8 | completed |
| ffa-two-way-tie-1920 | 155.0 | completed |
| everyone-tied-1920 | 142.0 | completed |
| eight-players-1920 | 155.1 | completed |
| eight-team-players-1920 | 156.8 | completed |
| eight-team-players-tied-1920 | 157.1 | completed |
| eight-players-tied-1920 | 159.1 | completed |
| ffa-scoreboard-1920 | 173.4 | completed |
| late-no-team-scoreboard-1920 | 188.7 | completed |
| late-no-team-1280 | 148.3 | completed |
| seven-one-teams-1280 | 146.5 | completed |
| partial-ties-1280 | 146.7 | completed |
| tie-second-1280 | 148.0 | completed |
| teams-scoreboard-1280 | 181.5 | completed |
| teams-distinct-1280 | 146.9 | completed |
| teams-tied-1280 | 146.0 | completed |
| ffa-two-way-tie-1280 | 147.4 | completed |
| everyone-tied-1280 | 146.1 | completed |
| eight-players-1280 | 147.3 | completed |
| eight-team-players-1280 | 147.1 | completed |
| eight-team-players-tied-1280 | 147.8 | completed |
| eight-players-tied-1280 | 146.7 | completed |
| ffa-scoreboard-1280 | 165.9 | completed |
| late-no-team-scoreboard-1280 | 180.9 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-late-no-team-1920.jpg](01-host-late-no-team-1920.jpg) | | |
| ![02-host-seven-one-teams-1920.jpg](02-host-seven-one-teams-1920.jpg) | | |
| ![03-host-partial-ties-1920.jpg](03-host-partial-ties-1920.jpg) | | |
| ![04-host-tie-second-1920.jpg](04-host-tie-second-1920.jpg) | | |
| ![05-host-teams-scoreboard-1920.jpg](05-host-teams-scoreboard-1920.jpg) | | |
| ![06-host-teams-distinct-1920.jpg](06-host-teams-distinct-1920.jpg) | | |
| ![07-host-teams-tied-1920.jpg](07-host-teams-tied-1920.jpg) | | |
| ![08-host-ffa-two-way-tie-1920.jpg](08-host-ffa-two-way-tie-1920.jpg) | | |
| ![09-host-everyone-tied-1920.jpg](09-host-everyone-tied-1920.jpg) | | |
| ![10-host-eight-players-1920.jpg](10-host-eight-players-1920.jpg) | | |
| ![11-host-eight-team-players-1920.jpg](11-host-eight-team-players-1920.jpg) | | |
| ![12-host-eight-team-players-tied-1920.jpg](12-host-eight-team-players-tied-1920.jpg) | | |
| ![13-host-eight-players-tied-1920.jpg](13-host-eight-players-tied-1920.jpg) | | |
| ![14-host-ffa-scoreboard-1920.jpg](14-host-ffa-scoreboard-1920.jpg) | | |
| ![15-host-late-no-team-scoreboard-1920.jpg](15-host-late-no-team-scoreboard-1920.jpg) | | |
| ![16-host-late-no-team-1280.jpg](16-host-late-no-team-1280.jpg) | | |
| ![17-host-seven-one-teams-1280.jpg](17-host-seven-one-teams-1280.jpg) | | |
| ![18-host-partial-ties-1280.jpg](18-host-partial-ties-1280.jpg) | | |
| ![19-host-tie-second-1280.jpg](19-host-tie-second-1280.jpg) | | |
| ![20-host-teams-scoreboard-1280.jpg](20-host-teams-scoreboard-1280.jpg) | | |
| ![21-host-teams-distinct-1280.jpg](21-host-teams-distinct-1280.jpg) | | |
| ![22-host-teams-tied-1280.jpg](22-host-teams-tied-1280.jpg) | | |
| ![23-host-ffa-two-way-tie-1280.jpg](23-host-ffa-two-way-tie-1280.jpg) | | |
| ![24-host-everyone-tied-1280.jpg](24-host-everyone-tied-1280.jpg) | | |
| ![25-host-eight-players-1280.jpg](25-host-eight-players-1280.jpg) | | |
| ![26-host-eight-team-players-1280.jpg](26-host-eight-team-players-1280.jpg) | | |
| ![27-host-eight-team-players-tied-1280.jpg](27-host-eight-team-players-tied-1280.jpg) | | |
| ![28-host-eight-players-tied-1280.jpg](28-host-eight-players-tied-1280.jpg) | | |
| ![29-host-ffa-scoreboard-1280.jpg](29-host-ffa-scoreboard-1280.jpg) | | |
| ![30-host-late-no-team-scoreboard-1280.jpg](30-host-late-no-team-scoreboard-1280.jpg) | | |
| ![31-page-team-step-entrance.jpg](31-page-team-step-entrance.jpg) | | |
| ![32-host-reduced-motion-teams-tied.jpg](32-host-reduced-motion-teams-tied.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Visual review (Claude, integrator, 2026-11-19; merged tree a2… with main at 2d7146f1 and Codex r5)

| Screenshots | What they show | Looked at by |
|---|---|---|
| 01, 16 late-no-team | Teams tied 500–500 on one "Tied for first" step; the late player listed below as "No team · 8 … 100"; 13-character names fit at 1920 and 1280 | Claude |
| 02, 17 seven-one-teams | Red 1000 (seven players) on step 1, Blue 100 (one player) on step 2; all names fit | Claude |
| 05, 20 teams-scoreboard | Red 300 / Blue 200 team bars over per-team lists; ranks "=1", "4", "=3"; the title clears its line | Claude |
| 14, 29 ffa-scoreboard | Eight players, five "=1" and three "=6"; no clipping | Claude |
| 15, 30 late-no-team-scoreboard | Late player last as "– … No team", 0 and +0 | Claude |
| 03–13, 18–28, 31, 32 | Tie, 8-player and team variants and the entrance and reduced-motion stills, consistent with round 4's reviewed set | Claude |

Every acceptance statement in round 4's table passes on the merged tree.
