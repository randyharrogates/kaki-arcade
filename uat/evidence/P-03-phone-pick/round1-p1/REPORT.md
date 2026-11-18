# P-03-phone-pick UAT evidence

Visual review done 2026-11-18 by the integrator and the Claude reviewer.

Command: `node tools/uat/run.mjs -- P-03-phone-pick --phones 1 --out round1-p1`
Commit: `95bb03d28f6746bbf471c7c7015de1e3bd4b8b7c`
Viewports: 667×375, 844×390, 1920×1080

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1198.0 | completed |
| Phone memorise, pick, lock and reveal | 20783.4 | completed |
| Random fill and finish the real match | 117012.5 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-phone1-memorise-667.jpg](01-phone1-memorise-667.jpg) | Phone reads Watch the TV with the seconds left while the grid is memorised; no cards on the phone (667 × 375) | Integrator and Claude reviewer, 2026-11-18 |
| ![02-phone1-memorise-844.jpg](02-phone1-memorise-844.jpg) | Phone reads Watch the TV with the seconds left while the grid is memorised; no cards on the phone (844 × 390) | Integrator and Claude reviewer, 2026-11-18 |
| ![03-host-memorise-tv.jpg](03-host-memorise-tv.jpg) | TV: the "not built yet" placeholder, captured while its fade had not settled (marked UNSETTLED by the harness); not evidence for the TV half, which comes with P-06/P-07 | Integrator and Claude reviewer, 2026-11-18 |
| ![04-phone1-picking-0-667.jpg](04-phone1-picking-0-667.jpg) | Private face-down 4 × 4 tap grid, no picks yet; Lock in 144 × 144 without a shape, disabled (667 × 375) | Integrator and Claude reviewer, 2026-11-18 |
| ![05-phone1-picking-0-844.jpg](05-phone1-picking-0-844.jpg) | Private face-down 4 × 4 tap grid, no picks yet; Lock in 144 × 144 without a shape, disabled (844 × 390) | Integrator and Claude reviewer, 2026-11-18 |
| ![06-host-picking-0-tv.jpg](06-host-picking-0-tv.jpg) | TV: the "not built yet" placeholder, captured while its fade had not settled (marked UNSETTLED by the harness); not evidence for the TV half, which comes with P-06/P-07 | Integrator and Claude reviewer, 2026-11-18 |
| ![07-phone1-picking-1-667.jpg](07-phone1-picking-1-667.jpg) | One card picked (thicker white frame); Lock in still waiting for a second pick (667 × 375) | Integrator and Claude reviewer, 2026-11-18 |
| ![08-phone1-picking-1-844.jpg](08-phone1-picking-1-844.jpg) | One card picked (thicker white frame); Lock in still waiting for a second pick (844 × 390) | Integrator and Claude reviewer, 2026-11-18 |
| ![09-host-picking-1-tv.jpg](09-host-picking-1-tv.jpg) | TV: the "not built yet" placeholder, captured while its fade had not settled (marked UNSETTLED by the harness); not evidence for the TV half, which comes with P-06/P-07 | Integrator and Claude reviewer, 2026-11-18 |
| ![10-phone1-picking-2-667.jpg](10-phone1-picking-2-667.jpg) | Two cards picked; Lock in enabled; a third tap is ignored (667 × 375) | Integrator and Claude reviewer, 2026-11-18 |
| ![11-phone1-picking-2-844.jpg](11-phone1-picking-2-844.jpg) | Two cards picked; Lock in enabled; a third tap is ignored (844 × 390) | Integrator and Claude reviewer, 2026-11-18 |
| ![12-host-picking-2-tv.jpg](12-host-picking-2-tv.jpg) | TV: the "not built yet" placeholder, captured while its fade had not settled (marked UNSETTLED by the harness); not evidence for the TV half, which comes with P-06/P-07 | Integrator and Claude reviewer, 2026-11-18 |
| ![13-phone1-reveal-own-hand-667.jpg](13-phone1-reveal-own-hand-667.jpg) | The phone shows only its own five cards, the hand name and points (667 × 375) | Integrator and Claude reviewer, 2026-11-18 |
| ![14-phone1-reveal-own-hand-844.jpg](14-phone1-reveal-own-hand-844.jpg) | The phone shows only its own five cards, the hand name and points (844 × 390) | Integrator and Claude reviewer, 2026-11-18 |
| ![15-host-reveal-own-hand-tv.jpg](15-host-reveal-own-hand-tv.jpg) | TV: the "not built yet" placeholder, captured while its fade had not settled (marked UNSETTLED by the harness); not evidence for the TV half, which comes with P-06/P-07 | Integrator and Claude reviewer, 2026-11-18 |
| ![16-phone1-reveal-seat-1.jpg](16-phone1-reveal-seat-1.jpg) | This seat sees only its own hand at the reveal (different hand per seat) | Integrator and Claude reviewer, 2026-11-18 |
| ![17-phone1-scoreboard-667.jpg](17-phone1-scoreboard-667.jpg) | Scores on the TV (667 × 375) | Integrator and Claude reviewer, 2026-11-18 |
| ![18-phone1-scoreboard-844.jpg](18-phone1-scoreboard-844.jpg) | Scores on the TV (844 × 390) | Integrator and Claude reviewer, 2026-11-18 |
| ![19-host-scoreboard-tv.jpg](19-host-scoreboard-tv.jpg) | TV: the "not built yet" placeholder, captured while its fade had not settled (marked UNSETTLED by the harness); not evidence for the TV half, which comes with P-06/P-07 | Integrator and Claude reviewer, 2026-11-18 |
| ![20-phone1-random-fill-667.jpg](20-phone1-random-fill-667.jpg) | Own hand with the 13 px note that picks were filled at random (667 × 375) | Integrator and Claude reviewer, 2026-11-18 |
| ![21-phone1-random-fill-844.jpg](21-phone1-random-fill-844.jpg) | Own hand with the 13 px note that picks were filled at random (844 × 390) | Integrator and Claude reviewer, 2026-11-18 |
| ![22-host-random-fill-tv.jpg](22-host-random-fill-tv.jpg) | TV: the "not built yet" placeholder, captured while its fade had not settled (marked UNSETTLED by the harness); not evidence for the TV half, which comes with P-06/P-07 | Integrator and Claude reviewer, 2026-11-18 |
| ![23-phone1-over-667.jpg](23-phone1-over-667.jpg) | Match over (667 × 375) | Integrator and Claude reviewer, 2026-11-18 |
| ![24-phone1-over-844.jpg](24-phone1-over-844.jpg) | Match over (844 × 390) | Integrator and Claude reviewer, 2026-11-18 |
| ![25-host-over-tv.jpg](25-host-over-tv.jpg) | TV: the "not built yet" placeholder, captured while its fade had not settled (marked UNSETTLED by the harness); not evidence for the TV half, which comes with P-06/P-07 | Integrator and Claude reviewer, 2026-11-18 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Memorise: phone says Watch the TV with seconds, shows no cards | pass | 01–02 |
| Private 4 × 4 tap grid, two picks with deselect, Lock in without a shape (D-171) | pass | 04–11, phone.test.ts |
| Lock-in cannot be undone; a third pick is ignored | pass | game.test.ts |
| Reveal shows only the phone's own hand, name and points | pass | reveal stills, phone.test.ts |
| No pick reaches another phone or the TV view before the reveal | pass | payloads.json.gz, session.test.ts |
| Random fill keeps existing picks and adds the 13 px note | pass | random-fill stills, game.test.ts |
| Grid cells 89 × 68 inside the viewport at 667, 844 and 932 | pass | measurements.json |
| TV half (PP-005, PP-020) | not yet: TV is the placeholder | P-06/P-07 |
