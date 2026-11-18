# T-07-tv-renderer UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Automated execution passed. The integrator and review 8 looked at the stills and strips listed with text below on 2026-11-19; the rest are unchanged since round 11 (review 7).

Command: `node tools/uat/run.mjs -- T-07-tv-renderer --out round12-uat --max-mb 40 --timeout-min 20`
Commit: `826c52a87842729b702f0d558f199e9955e80ede`
Viewports: 1920×1080, 1280×720, 1080×1080

| Timing | ms | Status |
|---|---:|---|
| 1 cooks at 1920 | 4128.3 | completed |
| 1 cooks at 1280 | 2590.4 | completed |
| 8 cooks at 1920 | 2725.8 | completed |
| 8 cooks at 1280 | 2614.4 | completed |
| HUD drawn width and Rack column | 4090.9 | completed |
| Burning station label | 1195.9 | completed |
| Mid-clip actions at their stations | 9399.9 | completed |
| Normal entrance at pinned render times | 3285.7 | completed |
| Normal serve at pinned render times | 3892.5 | completed |
| Normal done at pinned render times | 10222.6 | completed |
| Normal exit at pinned render times | 3022.7 | completed |
| Reduced entrance at pinned render times | 2721.7 | completed |
| Reduced serve at pinned render times | 3295.2 | completed |
| Reduced done at pinned render times | 10056.9 | completed |
| Reduced exit at pinned render times | 2851.0 | completed |
| Throw landing and cook walk | 8423.4 | completed |
| North counter holding an item at y 1.2 | 5735.7 | completed |
| Registry to production MountedScreen readiness without a phone | 1730.2 | completed |
| Letterbox portrait window | 990.1 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-1-cooks-1920-showcase.jpg](01-host-1-cooks-1920-showcase.jpg) | | |
| ![02-host-1-cooks-1280-showcase.jpg](02-host-1-cooks-1280-showcase.jpg) | 1 cook at 1280 × 720: north Chop cues in the top margin above the counter (one empty, one done); seven south cues, a fire, six cards and the HUD; the marker sits on the cap with an ink edge | Claude integrator and reviewer (review 8), 2026-11-19 |
| ![03-host-8-cooks-1920-showcase.jpg](03-host-8-cooks-1920-showcase.jpg) | | |
| ![04-host-8-cooks-1280-showcase.jpg](04-host-8-cooks-1280-showcase.jpg) | 8 cooks at 1280: every marker at normal height on its cap, edged, none touching a cue | Claude integrator and reviewer (review 8), 2026-11-19 |
| ![05-host-hud-score-width.jpg](05-host-hud-score-width.jpg) | | |
| ![06-host-rack-column.jpg](06-host-rack-column.jpg) | | |
| ![07-host-burning-label.jpg](07-host-burning-label.jpg) | | |
| ![08-host-action-idle.jpg](08-host-action-idle.jpg) | | |
| ![09-host-action-walk.jpg](09-host-action-walk.jpg) | | |
| ![10-host-action-carry-walk.jpg](10-host-action-carry-walk.jpg) | carry-walk at normal height: the held plate is visible at the hands, well below the edged discs | Claude integrator and reviewer (review 8), 2026-11-19 |
| ![11-host-action-chop.jpg](11-host-action-chop.jpg) | | |
| ![12-host-action-stir.jpg](12-host-action-stir.jpg) | | |
| ![13-host-action-wash.jpg](13-host-action-wash.jpg) | | |
| ![14-host-action-serve.jpg](14-host-action-serve.jpg) | | |
| ![15-host-action-throw.jpg](15-host-action-throw.jpg) | | |
| ![16-host-action-extinguish.jpg](16-host-action-extinguish.jpg) | | |
| ![17-host-action-rejection.jpg](17-host-action-rejection.jpg) | "Plate is dirty" clear of cooks 1, 6 and 7, the Sink cue (5 px), the Return item spot, the cards and the HUD | Claude integrator and reviewer (review 8), 2026-11-19 |
| ![86-host-north-held-1920.jpg](86-host-north-held-1920.jpg) | cook 1 at y = 1.2 against the north Chop at 1920: working cue (hourglass, 2 gold cells) in the margin; disc on top of the cap, 2–3 px below the bar, about 3.7 px of push; the held chicken is behind the north-facing body and not visible | Claude integrator and reviewer (review 8), 2026-11-19 |
| ![87-host-north-held-1280.jpg](87-host-north-held-1280.jpg) | the same at 1280, scaled by 2/3; the disc touches no cue; the edge renders at about 1.3 px (about 2.9 : 1 on the JPEG); the held item is not visible | Claude integrator and reviewer (review 8), 2026-11-19 |
| ![98-host-letterboxed.jpg](98-host-letterboxed.jpg) | 1080 × 1080 letterbox: the same scene scaled, north cues in the margin, the caption clear | Claude integrator and reviewer (review 8), 2026-11-19 |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![23-strip-entrance.jpg](23-strip-entrance.jpg) | | |
| ![30-strip-serve.jpg](30-strip-serve.jpg) | | |
| ![36-strip-done.jpg](36-strip-done.jpg) | done Chop pulse: gold span 79 → 83 → 84 → 83 → 79 px; the tick glyph is steady | Claude integrator and reviewer (review 8), 2026-11-19 |
| ![42-strip-exit.jpg](42-strip-exit.jpg) | | |
| ![48-strip-reduced-entrance.jpg](48-strip-reduced-entrance.jpg) | | |
| ![55-strip-reduced-serve.jpg](55-strip-reduced-serve.jpg) | | |
| ![61-strip-reduced-done.jpg](61-strip-reduced-done.jpg) | reduced motion: gold span 79 in all five frames, no pulse | Claude integrator and reviewer (review 8), 2026-11-19 |
| ![67-strip-reduced-exit.jpg](67-strip-reduced-exit.jpg) | | |
| ![76-strip-throw.jpg](76-strip-throw.jpg) | | |
| ![85-strip-walk.jpg](85-strip-walk.jpg) | | |
| ![97-strip-north-approach-2-to-1-2.jpg](97-strip-north-approach-2-to-1-2.jpg) | cook 1 walks north from y 2.0 to 1.2 in 0.1 steps: the marker rides the cap 1:1, never covers either north cue, and moves at most about 4 px at the last frame | Claude integrator and reviewer (review 8), 2026-11-19 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| TR-030 / TR-031 cues shown and shape-coded | Pass | 02, 04, 86 |
| TR-061 marker above the cook at the north counter | Pass | 86, 87, 97 (held-item visibility not shown) |
| TR-062 done pulse, none with reduced motion | Pass | 36, 61 |
| TR-004 rejection note clear | Pass | 17 |
| PERF-001 | Not assessed | perf-r7 is a dev-build diagnostic; a production run is required |
