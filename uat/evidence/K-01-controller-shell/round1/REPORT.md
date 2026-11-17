# K-01-controller-shell UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- K-01-controller-shell --phones 1`
Commit: `1bbc7c824b22850924cd22bf5701e3b792ce1439`
Viewports: 844×390, 667×375, 568×320, 390×844

| Timing | ms | Status |
|---|---:|---|
| 844x390-seat1-connected | 318.2 | completed |
| 844x390-seat1-reconnecting | 149.2 | completed |
| 844x390-seat1-lost | 141.3 | completed |
| 844x390-seat8-connected | 145.4 | completed |
| 844x390-seat8-reconnecting | 143.2 | completed |
| 844x390-seat8-lost | 144.3 | completed |
| 667x375-seat1-connected | 135.3 | completed |
| 667x375-seat1-reconnecting | 137.1 | completed |
| 667x375-seat1-lost | 138.4 | completed |
| 667x375-seat8-connected | 142.3 | completed |
| 667x375-seat8-reconnecting | 135.3 | completed |
| 667x375-seat8-lost | 136.2 | completed |
| 568x320-seat1-connected | 137.3 | completed |
| 568x320-seat1-reconnecting | 137.0 | completed |
| 568x320-seat1-lost | 135.1 | completed |
| 568x320-seat8-connected | 135.0 | completed |
| 568x320-seat8-reconnecting | 135.3 | completed |
| 568x320-seat8-lost | 135.4 | completed |
| 390x844-seat1-connected | 585.9 | completed |
| 390x844-seat1-reconnecting | 560.7 | completed |
| 390x844-seat1-lost | 560.1 | completed |
| 390x844-seat8-connected | 565.7 | completed |
| 390x844-seat8-reconnecting | 560.7 | completed |
| 390x844-seat8-lost | 559.1 | completed |
| Reduced motion and held wake state | 174.5 | completed |

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
| ![25-phone1-portrait-reduced-held.jpg](25-phone1-portrait-reduced-held.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)

Exit 0. Opened all 25 shots as three sheets. Landscape at 844 × 390, 667 × 375 and
568 × 320: the header is one line with the twelve-W name, the seat disc in seat 1 red and seat
8 pink, and the link as icon plus word (Connected, Reconnecting, Lost); the dotted play area
fills the rest and nothing scrolls. "Keep your screen on" sits centred at the foot when the
wake lock is unavailable. Portrait 390 × 844: "Turn your phone sideways" with a phone outline
turned on its side; with reduced motion and the lock held, no wake note. Not checked: a real
phone (wake lock on iPhone, pull-to-refresh on Android: S-05), the crossfade between link
states (no frame), dark theme.
