# K-01-controller-shell UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- K-01-controller-shell --phones 1`
Commit: `9fd6a19c87741ad31d2aba4fcb8a273d71d06063`
Viewports: 844×390, 667×375, 568×320, 390×844, 320×568

| Timing | ms | Status |
|---|---:|---|
| 844x390-seat1-connected | 521.4 | completed |
| 844x390-seat1-reconnecting | 194.1 | completed |
| 844x390-seat1-lost | 188.8 | completed |
| 844x390-seat8-connected | 177.6 | completed |
| 844x390-seat8-reconnecting | 189.7 | completed |
| 844x390-seat8-lost | 178.1 | completed |
| 667x375-seat1-connected | 172.6 | completed |
| 667x375-seat1-reconnecting | 168.9 | completed |
| 667x375-seat1-lost | 169.6 | completed |
| 667x375-seat8-connected | 170.2 | completed |
| 667x375-seat8-reconnecting | 170.0 | completed |
| 667x375-seat8-lost | 168.9 | completed |
| 568x320-seat1-connected | 166.5 | completed |
| 568x320-seat1-reconnecting | 170.0 | completed |
| 568x320-seat1-lost | 216.7 | completed |
| 568x320-seat8-connected | 169.6 | completed |
| 568x320-seat8-reconnecting | 167.1 | completed |
| 568x320-seat8-lost | 167.7 | completed |
| 390x844-seat1-connected | 546.7 | completed |
| 390x844-seat1-reconnecting | 558.1 | completed |
| 390x844-seat1-lost | 547.7 | completed |
| 390x844-seat8-connected | 557.6 | completed |
| 390x844-seat8-reconnecting | 557.8 | completed |
| 390x844-seat8-lost | 564.5 | completed |
| 320x568-seat1-connected | 534.4 | completed |
| 320x568-seat1-reconnecting | 533.0 | completed |
| 320x568-seat1-lost | 532.9 | completed |
| 320x568-seat8-connected | 532.9 | completed |
| 320x568-seat8-reconnecting | 533.4 | completed |
| 320x568-seat8-lost | 552.1 | completed |
| Overlap detector rejects deliberately restored overflowing layout | 537.9 | completed |
| Real wake helper resolves, hides/releases, and re-requests on return | 533.3 | completed |
| Mounted page lock and unmount cleanup | 93.8 | completed |
| Link crossfade and portrait turn frame strips | 5192.6 | completed |
| Reduced motion retains live link state and final portrait turn | 186.3 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-phone1-844x390-seat1-connected.jpg](01-phone1-844x390-seat1-connected.jpg) | | |
| ![02-phone1-844x390-seat1-reconnecting.jpg](02-phone1-844x390-seat1-reconnecting.jpg) | | |
| ![03-phone1-844x390-seat1-lost.jpg](03-phone1-844x390-seat1-lost.jpg) | | |
| ![04-phone1-844x390-seat8-connected.jpg](04-phone1-844x390-seat8-connected.jpg) | | |
| ![05-phone1-844x390-seat8-reconnecting.jpg](05-phone1-844x390-seat8-reconnecting.jpg) | | |
| ![06-phone1-844x390-seat8-lost.jpg](06-phone1-844x390-seat8-lost.jpg) | | |
| ![07-phone1-667x375-seat1-connected.jpg](07-phone1-667x375-seat1-connected.jpg) | | |
| ![08-phone1-667x375-seat1-reconnecting.jpg](08-phone1-667x375-seat1-reconnecting.jpg) | | |
| ![09-phone1-667x375-seat1-lost.jpg](09-phone1-667x375-seat1-lost.jpg) | | |
| ![10-phone1-667x375-seat8-connected.jpg](10-phone1-667x375-seat8-connected.jpg) | | |
| ![11-phone1-667x375-seat8-reconnecting.jpg](11-phone1-667x375-seat8-reconnecting.jpg) | | |
| ![12-phone1-667x375-seat8-lost.jpg](12-phone1-667x375-seat8-lost.jpg) | | |
| ![13-phone1-568x320-seat1-connected.jpg](13-phone1-568x320-seat1-connected.jpg) | | |
| ![14-phone1-568x320-seat1-reconnecting.jpg](14-phone1-568x320-seat1-reconnecting.jpg) | | |
| ![15-phone1-568x320-seat1-lost.jpg](15-phone1-568x320-seat1-lost.jpg) | | |
| ![16-phone1-568x320-seat8-connected.jpg](16-phone1-568x320-seat8-connected.jpg) | | |
| ![17-phone1-568x320-seat8-reconnecting.jpg](17-phone1-568x320-seat8-reconnecting.jpg) | | |
| ![18-phone1-568x320-seat8-lost.jpg](18-phone1-568x320-seat8-lost.jpg) | | |
| ![19-phone1-390x844-seat1-connected.jpg](19-phone1-390x844-seat1-connected.jpg) | | |
| ![20-phone1-390x844-seat1-reconnecting.jpg](20-phone1-390x844-seat1-reconnecting.jpg) | | |
| ![21-phone1-390x844-seat1-lost.jpg](21-phone1-390x844-seat1-lost.jpg) | | |
| ![22-phone1-390x844-seat8-connected.jpg](22-phone1-390x844-seat8-connected.jpg) | | |
| ![23-phone1-390x844-seat8-reconnecting.jpg](23-phone1-390x844-seat8-reconnecting.jpg) | | |
| ![24-phone1-390x844-seat8-lost.jpg](24-phone1-390x844-seat8-lost.jpg) | | |
| ![25-phone1-320x568-seat1-connected.jpg](25-phone1-320x568-seat1-connected.jpg) | | |
| ![26-phone1-320x568-seat1-reconnecting.jpg](26-phone1-320x568-seat1-reconnecting.jpg) | | |
| ![27-phone1-320x568-seat1-lost.jpg](27-phone1-320x568-seat1-lost.jpg) | | |
| ![28-phone1-320x568-seat8-connected.jpg](28-phone1-320x568-seat8-connected.jpg) | | |
| ![29-phone1-320x568-seat8-reconnecting.jpg](29-phone1-320x568-seat8-reconnecting.jpg) | | |
| ![30-phone1-320x568-seat8-lost.jpg](30-phone1-320x568-seat8-lost.jpg) | | |
| ![31-phone1-long-name-clipped.jpg](31-phone1-long-name-clipped.jpg) | | |
| ![32-phone1-wake-reacquired.jpg](32-phone1-wake-reacquired.jpg) | | |
| ![47-phone1-portrait-reduced-held.jpg](47-phone1-portrait-reduced-held.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![39-strip-link-crossfade.jpg](39-strip-link-crossfade.jpg) | | |
| ![46-strip-portrait-turn.jpg](46-strip-portrait-turn.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look, round 2 (2026-11-17): passes

Exit 0 after two integrator fixes to the script's own proof step (forcing the name to full
width grows the shell's single grid column, so the header widens past the screen rather than
overlapping; the check now also asserts the header and link stay on screen, and the proof
accepts overlap, header overflow or off-screen). Opened: shots 25 to 32, strips 39 and 46,
still 47. 320 × 568: the twelve-W name ends in an ellipsis clear of the link word, seats 1 and
8, all three link states. The wake note shows only when the stubbed request rejects and is gone
after the lock is taken again (32). The portrait prompt is a centred SVG phone; strip 46 turns
it smoothly to landscape with no overshoot; 47 shows it still under reduced motion. Strip 39
(link crossfade) is small but shows the icon and word change in place. Not checked: real
phones (S-05), dark theme. Shots 01 to 24 not reopened this round.

Commit note: run.json records 9fd6a19 because the integrator's script fix was uncommitted when
the run started; the script that produced this run is the one committed in a056986.
