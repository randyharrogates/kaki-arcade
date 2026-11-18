# P-06-table-in-console UAT evidence

Reviewed 2026-11-18 (P-06 review 6 opened every still; the integrator opened p8 11, 21, 22). Evidence still holds at merge commit d6c7ad40 (review 6).

Command: `node tools/uat/run.mjs -- P-06-table-in-console --phones 1 --frames --out round5-p1`
Commit: `05107482ee540a2374c45c51783825744189e688`
Viewports: 1920×1080, 1280×720

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1226.2 | completed |
| Create room through host page | 103.5 | completed |

Expected errors (count):
None

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-peek-poker-start-crossfade-frame01.jpg](01-host-peek-poker-start-crossfade-frame01.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![02-host-peek-poker-start-crossfade-frame02.jpg](02-host-peek-poker-start-crossfade-frame02.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![03-host-peek-poker-start-crossfade-frame03.jpg](03-host-peek-poker-start-crossfade-frame03.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![04-host-peek-poker-start-crossfade-frame04.jpg](04-host-peek-poker-start-crossfade-frame04.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![05-host-peek-poker-start-crossfade-frame05.jpg](05-host-peek-poker-start-crossfade-frame05.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![06-host-peek-poker-start-crossfade-frame06.jpg](06-host-peek-poker-start-crossfade-frame06.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![07-host-peek-poker-start-crossfade-frame07.jpg](07-host-peek-poker-start-crossfade-frame07.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![08-host-peek-poker-start-crossfade-frame08.jpg](08-host-peek-poker-start-crossfade-frame08.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![09-host-peek-poker-start-crossfade-frame09.jpg](09-host-peek-poker-start-crossfade-frame09.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![10-host-peek-poker-start-crossfade-frame10.jpg](10-host-peek-poker-start-crossfade-frame10.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![11-strip-peek-poker-start-crossfade.jpg](11-strip-peek-poker-start-crossfade.jpg) | Strip: picker → "Starting…" → one overlap frame → settled table; no bare frame. | Claude reviewer |
| ![16-host-peek-poker-start-reduced-frame01.jpg](16-host-peek-poker-start-reduced-frame01.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![17-host-peek-poker-start-reduced-frame02.jpg](17-host-peek-poker-start-reduced-frame02.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![18-host-peek-poker-start-reduced-frame03.jpg](18-host-peek-poker-start-reduced-frame03.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![19-host-peek-poker-start-reduced-frame04.jpg](19-host-peek-poker-start-reduced-frame04.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![20-host-peek-poker-start-reduced-frame05.jpg](20-host-peek-poker-start-reduced-frame05.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![21-host-peek-poker-start-reduced-frame06.jpg](21-host-peek-poker-start-reduced-frame06.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![22-host-peek-poker-start-reduced-frame07.jpg](22-host-peek-poker-start-reduced-frame07.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![23-host-peek-poker-start-reduced-frame08.jpg](23-host-peek-poker-start-reduced-frame08.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![24-host-peek-poker-start-reduced-frame09.jpg](24-host-peek-poker-start-reduced-frame09.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![25-host-peek-poker-start-reduced-frame10.jpg](25-host-peek-poker-start-reduced-frame10.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![26-strip-peek-poker-start-reduced.jpg](26-strip-peek-poker-start-reduced.jpg) | Reduced-motion strip: instant switch, no fade frame. | Claude reviewer |

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![12-host-tv-memorise.jpg](12-host-tv-memorise.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![13-host-tv-memorise-1280x720.jpg](13-host-tv-memorise-1280x720.jpg) | 1280 × 720: the whole table fits. | Claude reviewer |
| ![14-host-tv-pick.jpg](14-host-tv-pick.jpg) | Pick phase: 16 backs, Picking, 20. | Claude reviewer |
| ![15-host-tv-reveal.jpg](15-host-tv-reveal.jpg) | Reveal: seat-1 markers on its picks; ranking correct. | Claude reviewer |
| ![27-host-tv-memorise-reduced.jpg](27-host-tv-memorise-reduced.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Start holds "Starting…" with the expanded tile and seat chips until the table is ready, then picker and table overlap in one crossfade with no bare frame | Pass | 11 (strip), 02–06 |
| With reduced motion the switch is instant (no fade frame) | Pass | reduced-motion strip |
| The table fits 1280 × 720 | Pass | 13 |
| No pick or mark is visible on the TV before the reveal (PP-005 big-screen clause) | Pass | pick and lock-in stills |
| The reveal marks each pick by seat colour and number and ranks the hands correctly | Pass (p8: five markers on one card cover the lower pip; OQ-043) | reveal still |
| Nothing is requested after Start | Pass | requests-after-start.json |
| Four table fonts finish before Start | Pass | font-requests-before-start.json |
