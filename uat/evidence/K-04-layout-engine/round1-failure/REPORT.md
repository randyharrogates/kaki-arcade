# K-04-layout-engine UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- K-04-layout-engine --phones 1`
Commit: `9e1f622fb025ead316f205d3a1ceb7b6aef32ef9`
Viewports: 667×375, 844×390, 932×430

| Timing | ms | Status |
|---|---:|---|
| tabao-667x375 | 472.8 | completed |
| rabakz-667x375 | 225.5 | completed |
| poker-667x375 | 191.5 | completed |
| dpad-only-667x375 | 176.6 | completed |
| text-only-667x375 | 174.8 | completed |
| cards-667x375 | 173.5 | completed |
| every-667x375 | 258.6 | completed |
| tabao-844x390 | 230.4 | completed |
| rabakz-844x390 | 247.7 | completed |
| poker-844x390 | 263.4 | completed |
| dpad-only-844x390 | 246.6 | completed |
| text-only-844x390 | 195.5 | completed |
| cards-844x390 | 194.2 | completed |
| every-844x390 | 198.6 | completed |
| tabao-932x430 | 195.8 | completed |
| rabakz-932x430 | 196.4 | completed |
| poker-932x430 | 213.6 | completed |
| dpad-only-932x430 | 248.5 | completed |
| text-only-932x430 | 198.7 | completed |
| cards-932x430 | 198.3 | completed |
| every-932x430 | 200.2 | completed |
| held face emits press and release with revision | 131.3 | failed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-phone1-tabao-667.jpg](01-phone1-tabao-667.jpg) | | |
| ![02-phone1-rabakz-667.jpg](02-phone1-rabakz-667.jpg) | | |
| ![03-phone1-poker-667.jpg](03-phone1-poker-667.jpg) | | |
| ![04-phone1-dpad-only-667.jpg](04-phone1-dpad-only-667.jpg) | | |
| ![05-phone1-text-only-667.jpg](05-phone1-text-only-667.jpg) | | |
| ![06-phone1-cards-667.jpg](06-phone1-cards-667.jpg) | | |
| ![07-phone1-every-667.jpg](07-phone1-every-667.jpg) | | |
| ![08-phone1-tabao-844.jpg](08-phone1-tabao-844.jpg) | | |
| ![09-phone1-rabakz-844.jpg](09-phone1-rabakz-844.jpg) | | |
| ![10-phone1-poker-844.jpg](10-phone1-poker-844.jpg) | | |
| ![11-phone1-dpad-only-844.jpg](11-phone1-dpad-only-844.jpg) | | |
| ![12-phone1-text-only-844.jpg](12-phone1-text-only-844.jpg) | | |
| ![13-phone1-cards-844.jpg](13-phone1-cards-844.jpg) | | |
| ![14-phone1-every-844.jpg](14-phone1-every-844.jpg) | | |
| ![15-phone1-tabao-932.jpg](15-phone1-tabao-932.jpg) | | |
| ![16-phone1-rabakz-932.jpg](16-phone1-rabakz-932.jpg) | | |
| ![17-phone1-poker-932.jpg](17-phone1-poker-932.jpg) | | |
| ![18-phone1-dpad-only-932.jpg](18-phone1-dpad-only-932.jpg) | | |
| ![19-phone1-text-only-932.jpg](19-phone1-text-only-932.jpg) | | |
| ![20-phone1-cards-932.jpg](20-phone1-cards-932.jpg) | | |
| ![21-phone1-every-932.jpg](21-phone1-every-932.jpg) | | |
| ![22-host-failure.png](22-host-failure.png) | | |
| ![23-phone1-failure.png](23-phone1-failure.png) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)
Run: `pnpm uat -- K-04-layout-engine --phones 1`, exit 1 at "held face emits press and release
with revision" (pressing `pick` reported `throw`). Opened 08-phone1-tabao-844 at full size and
k04-a.jpg (rabakz, poker, dpad-only, text-only, cards, every at 844).
The placement is not applied: every part is drawn at the top-left of the play area at its own
smallest size. Tabao: the four faces are stacked on one spot (only Throw is visible, which is
why the press hit throw) over the stick area. Poker: the grid overlaps Lock in and runs off the
bottom. Text-only: "Watch the TV" at the top-left, not centred. Rabakz: the options do not fill
the play area, and their order (triangle, circle / square, cross) does not match the TV's 2 × 2
(cross, circle / square, triangle). Every-kind: parts overlap. Nothing grows to fill (CTRL-002).
