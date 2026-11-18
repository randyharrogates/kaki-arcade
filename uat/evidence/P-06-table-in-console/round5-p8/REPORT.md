# P-06-table-in-console UAT evidence

Reviewed 2026-11-18 (P-06 review 6 opened every still; the integrator opened p8 11, 21, 22). Evidence still holds at merge commit d6c7ad40 (review 6).

Command: `node tools/uat/run.mjs -- P-06-table-in-console --phones 8 --frames --max-mb 24 --out round5-p8`
Commit: `05107482ee540a2374c45c51783825744189e688`
Viewports: 1920×1080, 1280×720

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 1898.4 | completed |
| Create room through host page | 204.6 | completed |

Expected errors (count):
None

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-peek-poker-start-crossfade-frame01.jpg](01-host-peek-poker-start-crossfade-frame01.jpg) | The picker start screen ("Player 1 starts on their phone", Rounds 5) part-way through the tile expansion, the frame before Start. | Claude reviewer |
| ![02-host-peek-poker-start-crossfade-frame02.jpg](02-host-peek-poker-start-crossfade-frame02.jpg) | "Starting…" fades in over the outgoing heading; expanded tile and eight seat chips, no bare surface. | Claude reviewer |
| ![03-host-peek-poker-start-crossfade-frame03.jpg](03-host-peek-poker-start-crossfade-frame03.jpg) | "Starting…" held with the expanded tile and eight chips (settings mirror cleared by main at Start). | Claude reviewer |
| ![04-host-peek-poker-start-crossfade-frame04.jpg](04-host-peek-poker-start-crossfade-frame04.jpg) | "Starting…" held. | Claude reviewer |
| ![05-host-peek-poker-start-crossfade-frame05.jpg](05-host-peek-poker-start-crossfade-frame05.jpg) | "Starting…" held. | Claude reviewer |
| ![06-host-peek-poker-start-crossfade-frame06.jpg](06-host-peek-poker-start-crossfade-frame06.jpg) | Overlap crossfade: picker fading out as the table fades in, no blank frame. | Claude reviewer |
| ![07-host-peek-poker-start-crossfade-frame07.jpg](07-host-peek-poker-start-crossfade-frame07.jpg) | Settled memorise table: 16 faces, shared K♦ 3♠ 10♦, eight rows. | Claude reviewer |
| ![08-host-peek-poker-start-crossfade-frame08.jpg](08-host-peek-poker-start-crossfade-frame08.jpg) | Memorise, timer counting down. | Claude reviewer |
| ![09-host-peek-poker-start-crossfade-frame09.jpg](09-host-peek-poker-start-crossfade-frame09.jpg) | Memorise, timer counting down. | Claude reviewer |
| ![10-host-peek-poker-start-crossfade-frame10.jpg](10-host-peek-poker-start-crossfade-frame10.jpg) | Memorise, timer counting down. | Claude reviewer |
| ![11-strip-peek-poker-start-crossfade.jpg](11-strip-peek-poker-start-crossfade.jpg) | Strip: Start → "Starting…" for 4 frames → one overlap frame → settled table; no bare or ghosted frame. | Claude reviewer and integrator |
| ![23-host-peek-poker-start-reduced-frame01.jpg](23-host-peek-poker-start-reduced-frame01.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![24-host-peek-poker-start-reduced-frame02.jpg](24-host-peek-poker-start-reduced-frame02.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![25-host-peek-poker-start-reduced-frame03.jpg](25-host-peek-poker-start-reduced-frame03.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![26-host-peek-poker-start-reduced-frame04.jpg](26-host-peek-poker-start-reduced-frame04.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![27-host-peek-poker-start-reduced-frame05.jpg](27-host-peek-poker-start-reduced-frame05.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![28-host-peek-poker-start-reduced-frame06.jpg](28-host-peek-poker-start-reduced-frame06.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![29-host-peek-poker-start-reduced-frame07.jpg](29-host-peek-poker-start-reduced-frame07.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![30-host-peek-poker-start-reduced-frame08.jpg](30-host-peek-poker-start-reduced-frame08.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![31-host-peek-poker-start-reduced-frame09.jpg](31-host-peek-poker-start-reduced-frame09.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![32-host-peek-poker-start-reduced-frame10.jpg](32-host-peek-poker-start-reduced-frame10.jpg) | Opened; consistent with the neighbouring frames. | Claude reviewer |
| ![33-strip-peek-poker-start-reduced.jpg](33-strip-peek-poker-start-reduced.jpg) | Reduced-motion strip: "Starting…" then an instant switch to the table, no fade frame. | Claude reviewer |

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![12-host-tv-memorise.jpg](12-host-tv-memorise.jpg) | Settled memorise table (last strip frame). | Claude reviewer |
| ![13-host-tv-memorise-1280x720.jpg](13-host-tv-memorise-1280x720.jpg) | 1280 × 720: the whole table fits, nothing clipped. | Claude reviewer |
| ![14-host-tv-pick.jpg](14-host-tv-pick.jpg) | Pick phase: 16 backs, all eight rows Picking, "Pick two cards", 20. | Claude reviewer |
| ![15-host-tv-pick-locked-1.jpg](15-host-tv-pick-locked-1.jpg) | Lock 1: the locker reads Picked; grid stays backs; no card marked. | Claude reviewer |
| ![16-host-tv-pick-locked-2.jpg](16-host-tv-pick-locked-2.jpg) | Lock 2; grid stays backs. | Claude reviewer |
| ![17-host-tv-pick-locked-3.jpg](17-host-tv-pick-locked-3.jpg) | Lock 3; grid stays backs. | Claude reviewer |
| ![18-host-tv-pick-locked-4.jpg](18-host-tv-pick-locked-4.jpg) | Lock 4; grid stays backs. | Claude reviewer |
| ![19-host-tv-pick-locked-5.jpg](19-host-tv-pick-locked-5.jpg) | Lock 5; grid stays backs. | Claude reviewer |
| ![20-host-tv-pick-locked-6.jpg](20-host-tv-pick-locked-6.jpg) | Lock 6; grid stays backs. | Claude reviewer |
| ![21-host-tv-pick-locked-7.jpg](21-host-tv-pick-locked-7.jpg) | Lock 7: seven Picked, one Picking; only backs. | Claude reviewer and integrator |
| ![22-host-tv-reveal.jpg](22-host-tv-reveal.jpg) | Reveal: picks marked by seat colour and number (five markers on K♠ cover its lower pip; rank and index readable, OQ-043); ranking correct for K♦ 3♠ 10♦. | Claude reviewer and integrator |
| ![34-host-tv-memorise-reduced.jpg](34-host-tv-memorise-reduced.jpg) | Settled memorise table in the reduced-motion room. | Claude reviewer |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| Start holds "Starting…" with the expanded tile and seat chips until the table is ready, then picker and table overlap in one crossfade with no bare frame | Pass | 11 (strip), 02–06 |
| With reduced motion the switch is instant (no fade frame) | Pass | reduced-motion strip |
| The table fits 1280 × 720 | Pass | 13 |
| No pick or mark is visible on the TV before the reveal (PP-005 big-screen clause) | Pass | pick and lock-in stills |
| The reveal marks each pick by seat colour and number and ranks the hands correctly | Pass (p8: five markers on one card cover the lower pip; OQ-043) | reveal still |
| Nothing is requested after Start | Pass | requests-after-start.json |
| Four table fonts finish before Start | Pass | font-requests-before-start.json |
