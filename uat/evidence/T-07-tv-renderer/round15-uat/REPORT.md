# T-07-tv-renderer UAT evidence

Host browser: chromium 156.0.8078.4
Phone browser: chromium (legacy iPhone emulation) 156.0.8078.4

North-facing north-counter stills and approach strip: the held item is hidden behind the body by design (depth −0.1). At the north counter a held item shows only when the cook faces s, se or sw; otherwise it is behind the body by design. South/east/west stills at y=1.2 cover this ordering. The disc lower edge is at worst feet −90.5, hands −31.4 (e/w) and −18.5 (s): at least 59 px clearance. Seat-5 recolours seat 1, so its disc reads 1. Lossless edge/cap checks: north-seat-1-1280-lossless.png and north-seat-5-1280-lossless.png.  Seat 1 measured PNG edge/cap contrast: 3.584:1. Seat 5 measured PNG edge/cap contrast: 3.297:1.

Automated run passed; every still and strip looked at by the integrator on 2026-11-19 (frame strips on contact sheets).

Command: `node tools/uat/run.mjs -- T-07-tv-renderer --out round15-uat --max-mb 40 --timeout-min 20`
Commit: `c21901e06cc7a49f2ab861bff8958eda90f986d5`
Viewports: 1920×1080, 1280×720, 1080×1080

| Timing | ms | Status |
|---|---:|---|
| 1 cooks at 1920 | 3891.9 | completed |
| 1 cooks at 1280 | 2395.2 | completed |
| 8 cooks at 1920 | 2216.5 | completed |
| 8 cooks at 1280 | 2018.7 | completed |
| HUD drawn width and Rack column | 2624.6 | completed |
| Burning station label | 649.8 | completed |
| Mid-clip actions at their stations | 7868.9 | completed |
| Normal entrance at pinned render times | 2839.1 | completed |
| Normal serve at pinned render times | 3469.9 | completed |
| Normal done at pinned render times | 9403.8 | completed |
| Normal exit at pinned render times | 2730.8 | completed |
| Reduced entrance at pinned render times | 2727.3 | completed |
| Reduced serve at pinned render times | 3385.6 | completed |
| Reduced done at pinned render times | 8300.5 | completed |
| Reduced exit at pinned render times | 2513.3 | completed |
| Throw landing and cook walk | 7736.9 | completed |
| North counter holding an item at y 1.2 | 5439.9 | completed |
| North held item depth ordering south, east and west | 3891.2 | completed |
| Lossless 1280 marker edge contrast against seat 1 and seat 5 caps | 2146.4 | completed |
| Registry to production MountedScreen readiness without a phone | 1721.9 | completed |
| Letterbox portrait window | 751.8 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-1-cooks-1920-showcase.jpg](01-host-1-cooks-1920-showcase.jpg) | One cook at 1920: seat-1 marker with its 3 px ink edge, centred numeral; stations, step icons and HUD clear | Claude (integrator), 2026-11-19 |
| ![02-host-1-cooks-1280-showcase.jpg](02-host-1-cooks-1280-showcase.jpg) | The same at 1280; marker and labels legible | Claude (integrator), 2026-11-19 |
| ![03-host-8-cooks-1920-showcase.jpg](03-host-8-cooks-1920-showcase.jpg) | Eight cooks at 1920: all eight markers distinct, none over counter labels; cook 2 near the north band draws its marker clear | Claude (integrator), 2026-11-19 |
| ![04-host-8-cooks-1280-showcase.jpg](04-host-8-cooks-1280-showcase.jpg) | Eight cooks at 1280; same layout scaled, markers legible | Claude (integrator), 2026-11-19 |
| ![05-host-hud-score-width.jpg](05-host-hud-score-width.jpg) | HUD: Time, Score and Stars cards fit their drawn width | Claude (integrator), 2026-11-19 |
| ![06-host-rack-column.jpg](06-host-rack-column.jpg) | Rack column: four Rack labels and plates, none clipped | Claude (integrator), 2026-11-19 |
| ![07-host-burning-label.jpg](07-host-burning-label.jpg) | Burning wok: the step icon becomes the flame and the fire sits on the counter, label still readable | Claude (integrator), 2026-11-19 |
| ![08-host-action-idle.jpg](08-host-action-idle.jpg) | Idle pose for all eight facings in a row | Claude (integrator), 2026-11-19 |
| ![09-host-action-walk.jpg](09-host-action-walk.jpg) | Walk pose mid-stride for all eight | Claude (integrator), 2026-11-19 |
| ![10-host-action-carry-walk.jpg](10-host-action-carry-walk.jpg) | Carry-walk pose; held items ride the hands | Claude (integrator), 2026-11-19 |
| ![11-host-action-chop.jpg](11-host-action-chop.jpg) | Chop at the north chop board: cook 1 marker above the counter, hourglass step icon with progress | Claude (integrator), 2026-11-19 |
| ![12-host-action-stir.jpg](12-host-action-stir.jpg) | Stir at the wok: cook 1 in front of the station, progress shown | Claude (integrator), 2026-11-19 |
| ![13-host-action-wash.jpg](13-host-action-wash.jpg) | Wash at the sink: progress shown, marker clear of the step icon | Claude (integrator), 2026-11-19 |
| ![14-host-action-serve.jpg](14-host-action-serve.jpg) | Serve at the hatch: "+100 · tip +12" above the tickets | Claude (integrator), 2026-11-19 |
| ![15-host-action-throw.jpg](15-host-action-throw.jpg) | Throw: the item in flight above cook 2 on its arc | Claude (integrator), 2026-11-19 |
| ![16-host-action-extinguish.jpg](16-host-action-extinguish.jpg) | Extinguish: extinguisher spray at the burning wok | Claude (integrator), 2026-11-19 |
| ![17-host-action-rejection.jpg](17-host-action-rejection.jpg) | Rejection: "Plate is dirty" bubble beside cook 1 at the serve hatch | Claude (integrator), 2026-11-19 |
| ![86-host-north-held-1920.jpg](86-host-north-held-1920.jpg) | North counter holding an item, facing north: item behind the body; marker clear of the step icon and Chop label | Claude (integrator), 2026-11-19 |
| ![87-host-north-held-1280.jpg](87-host-north-held-1280.jpg) | The same at 1280 | Claude (integrator), 2026-11-19 |
| ![98-host-north-held-east-1920.jpg](98-host-north-held-east-1920.jpg) | North counter facing east: item at the hands, behind the body by design | Claude (integrator), 2026-11-19 |
| ![99-host-north-held-east-1280.jpg](99-host-north-held-east-1280.jpg) | The same at 1280 | Claude (integrator), 2026-11-19 |
| ![100-host-north-held-west-1920.jpg](100-host-north-held-west-1920.jpg) | North counter facing west at 1920 | Claude (integrator), 2026-11-19 |
| ![101-host-north-held-west-1280.jpg](101-host-north-held-west-1280.jpg) | The same at 1280 | Claude (integrator), 2026-11-19 |
| ![102-host-north-held-south-1920.jpg](102-host-north-held-south-1920.jpg) | North counter facing south: the held item shows in front; the cook covers part of the left Chop label while standing at it | Claude (integrator), 2026-11-19 |
| ![103-host-north-held-south-1280.jpg](103-host-north-held-south-1280.jpg) | The same at 1280 | Claude (integrator), 2026-11-19 |
| ![104-host-letterboxed.jpg](104-host-letterboxed.jpg) | Square 1080 × 1080 window: the 16:9 board letterboxed, nothing cut off | Claude (integrator), 2026-11-19 |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![23-strip-entrance.jpg](23-strip-entrance.jpg) | Order tickets enter from the serve hatch one by one; old and new overlap, no blank frame | Claude (integrator), 2026-11-19 |
| ![30-strip-serve.jpg](30-strip-serve.jpg) | Serve: score pop rises over the tickets; served ticket leaves | Claude (integrator), 2026-11-19 |
| ![36-strip-done.jpg](36-strip-done.jpg) | Done: ticket completes and the row closes up | Claude (integrator), 2026-11-19 |
| ![42-strip-exit.jpg](42-strip-exit.jpg) | Exit: an expired ticket leaves back toward the hatch | Claude (integrator), 2026-11-19 |
| ![48-strip-reduced-entrance.jpg](48-strip-reduced-entrance.jpg) | Reduced motion entrance: tickets appear in place without sliding | Claude (integrator), 2026-11-19 |
| ![55-strip-reduced-serve.jpg](55-strip-reduced-serve.jpg) | Reduced motion serve: state changes without travel | Claude (integrator), 2026-11-19 |
| ![61-strip-reduced-done.jpg](61-strip-reduced-done.jpg) | Reduced motion done: same end state as 36 | Claude (integrator), 2026-11-19 |
| ![67-strip-reduced-exit.jpg](67-strip-reduced-exit.jpg) | Reduced motion exit: same end state as 42 | Claude (integrator), 2026-11-19 |
| ![76-strip-throw.jpg](76-strip-throw.jpg) | Throw: the item travels on an arc from cook 1 over cooks 2–4 and lands, no overshoot | Claude (integrator), 2026-11-19 |
| ![85-strip-walk.jpg](85-strip-walk.jpg) | Walk cycle: cooks step left to right; marker x follows the cook | Claude (integrator), 2026-11-19 |
| ![97-strip-north-approach-2-to-1-2.jpg](97-strip-north-approach-2-to-1-2.jpg) | North approach from y 2 to 1.2 over 3.25 s: marker stays clear of the counter, step icon and Chop label throughout | Claude (integrator), 2026-11-19 |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Seat markers draw nearer-cook-on-top with a 3 px ink edge and a centred numeral (TR-061) | Pass | 01–04, 86–103; lossless edge/cap 3.58:1 and 3.30:1 |
| At the north counter a held item shows facing south and sits behind the body otherwise | Pass | 86–103 |
| The marker stays clear of the counter, step icon and labels on the north approach | Pass | 97 |
| Actions, throw arc and walk read at their stations with no overshoot (TR-030) | Pass | 08–17, 76, 85 |
| Ticket entrance, serve, done and exit motion; reduced motion keeps the end states (TR-004) | Pass | 23–67 |
| Recipe steps fit in the real TV font (TR-001) | Pass | text.dom.test.ts; 01–04 |

Not proven: production PERF-001 run; a TV at 3 m. The kitchen is A-06 placeholder geometry.
