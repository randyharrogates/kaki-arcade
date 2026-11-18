# T-07-tv-renderer UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

Evidence committed at `d5af5768` for code `459f0c26`. Claude review 6 inspected the
items attributed below. Verdict: not clean; round11-uat must supersede this evidence.
Round 10 fixed cue geometry/glyphs, live done pulse, fire layering, raster uploads and HUD
gaps. It still has jumping markers, a rejection hiding the Sink cue, and per-tick name
key allocation. Recipe steps use the integrator's space separator.

Command: `node tools/uat/run.mjs -- T-07-tv-renderer --out round10-uat --max-mb 40 --timeout-min 20`
Commit: `459f0c26fb6b3b46aab78afcabbc7ffc0afbefe0`
Viewports: 1920×1080, 1280×720, 1080×1080

| Timing | ms | Status |
|---|---:|---|
| 1 cooks at 1920 | 3250.3 | completed |
| 1 cooks at 1280 | 2074.3 | completed |
| 8 cooks at 1920 | 2248.8 | completed |
| 8 cooks at 1280 | 2502.9 | completed |
| HUD drawn width and Rack column | 2588.2 | completed |
| Burning station label | 794.5 | completed |
| Mid-clip actions at their stations | 8189.0 | completed |
| Normal entrance at pinned render times | 3171.1 | completed |
| Normal serve at pinned render times | 3456.5 | completed |
| Normal done at pinned render times | 2826.7 | completed |
| Normal exit at pinned render times | 3441.7 | completed |
| Reduced entrance at pinned render times | 3387.2 | completed |
| Reduced serve at pinned render times | 3428.8 | completed |
| Reduced done at pinned render times | 2972.5 | completed |
| Reduced exit at pinned render times | 2835.1 | completed |
| Throw landing and cook walk | 8458.0 | completed |
| Registry to production MountedScreen readiness without a phone | 1778.7 | completed |
| Letterbox portrait window | 1076.9 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-1-cooks-1920-showcase.jpg](01-host-1-cooks-1920-showcase.jpg) | 1 cooks 1920 showcase | Claude, review 6 (see inspection scope below) |
| ![02-host-1-cooks-1280-showcase.jpg](02-host-1-cooks-1280-showcase.jpg) | 1 cooks 1280 showcase | Pending; not opened in review 6 |
| ![03-host-8-cooks-1920-showcase.jpg](03-host-8-cooks-1920-showcase.jpg) | 8 cooks 1920 showcase | Claude, review 6 (see inspection scope below) |
| ![04-host-8-cooks-1280-showcase.jpg](04-host-8-cooks-1280-showcase.jpg) | 8 cooks 1280 showcase | Claude, review 6 (see inspection scope below) |
| ![05-host-hud-score-width.jpg](05-host-hud-score-width.jpg) | hud score width | Claude, review 6 (see inspection scope below) |
| ![06-host-rack-column.jpg](06-host-rack-column.jpg) | rack column | Claude, review 6 (see inspection scope below) |
| ![07-host-burning-label.jpg](07-host-burning-label.jpg) | burning label | Claude, review 6 (see inspection scope below) |
| ![08-host-action-idle.jpg](08-host-action-idle.jpg) | action idle | Claude, review 6 (see inspection scope below) |
| ![09-host-action-walk.jpg](09-host-action-walk.jpg) | action walk | Claude, review 6 (see inspection scope below) |
| ![10-host-action-carry-walk.jpg](10-host-action-carry-walk.jpg) | action carry walk | Claude, review 6 (see inspection scope below) |
| ![11-host-action-chop.jpg](11-host-action-chop.jpg) | action chop | Claude, review 6 (see inspection scope below) |
| ![12-host-action-stir.jpg](12-host-action-stir.jpg) | action stir | Claude, review 6 (see inspection scope below) |
| ![13-host-action-wash.jpg](13-host-action-wash.jpg) | action wash | Claude, review 6 (see inspection scope below) |
| ![14-host-action-serve.jpg](14-host-action-serve.jpg) | action serve | Claude, review 6 (see inspection scope below) |
| ![15-host-action-throw.jpg](15-host-action-throw.jpg) | action throw | Claude, review 6 (see inspection scope below) |
| ![16-host-action-extinguish.jpg](16-host-action-extinguish.jpg) | action extinguish | Claude, review 6 (see inspection scope below) |
| ![17-host-action-rejection.jpg](17-host-action-rejection.jpg) | action rejection | Claude, review 6 (see inspection scope below) |
| ![86-host-letterboxed.jpg](86-host-letterboxed.jpg) | letterboxed | Claude, review 6 (see inspection scope below) |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![23-strip-entrance.jpg](23-strip-entrance.jpg) | entrance | Pending; not opened in review 6 |
| ![30-strip-serve.jpg](30-strip-serve.jpg) | serve | Claude, review 6 (see inspection scope below) |
| ![36-strip-done.jpg](36-strip-done.jpg) | done | Claude, review 6 (see inspection scope below) |
| ![42-strip-exit.jpg](42-strip-exit.jpg) | exit | Pending; not opened in review 6 |
| ![48-strip-reduced-entrance.jpg](48-strip-reduced-entrance.jpg) | reduced entrance | Pending; not opened in review 6 |
| ![55-strip-reduced-serve.jpg](55-strip-reduced-serve.jpg) | reduced serve | Claude, review 6 (see inspection scope below) |
| ![61-strip-reduced-done.jpg](61-strip-reduced-done.jpg) | reduced done | Claude, review 6 (see inspection scope below) |
| ![67-strip-reduced-exit.jpg](67-strip-reduced-exit.jpg) | reduced exit | Pending; not opened in review 6 |
| ![76-strip-throw.jpg](76-strip-throw.jpg) | throw | Pending; not opened in review 6 |
| ![85-strip-walk.jpg](85-strip-walk.jpg) | walk | Claude, review 6 (see inspection scope below) |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Round 10 accepted overall | Fail | Review 6: marker jumps up to 241 px; rejection hides Sink; nameKey allocation |
| Cue geometry and glyphs | Pass in review 6 | 03, 07, 11, 36 |
| Live done pulse / reduced rest | Pass in review 6 | 36 / 61 |
| HUD gaps at rest | Pass in review 6 | Pixel scans: 03, 30, 55; both 13 px |
| Production performance | Pending | perf-r7 is diagnostic only |

Review 6 inspection scope: full-size 03, 04, 07, 11, 16, 17, 86; contact sheet
01, 05, 06, 08, 09, 10, 12, 13, 14, 15; full strip 36 and crops of 36/61;
85 at reduced size with a south-row crop; 30/55 pixel scans only. 02, 23, 42,
48, 67 and 76 were not opened. This attribution records the supplied review, not a new
visual review by Codex. Marker standing clearance does not prove walking continuity.
