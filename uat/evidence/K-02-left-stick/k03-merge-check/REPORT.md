# K-02-left-stick UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- K-02-left-stick --phones 1 --out k03-merge-check`
Commit: `88c31ee9f51958308cb8707520ae133064cfe05d`
Viewports: 844×390, 667×375

| Timing | ms | Status |
|---|---:|---|
| 844x390 touch tracking, rubber-band and multi-touch | 3178.1 | completed |
| 667x375 touch tracking, rubber-band and multi-touch | 2724.4 | completed |
| Reduced motion keeps values and removes stretch and release animation | 381.8 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-phone1-844-off-centre-floating.jpg](01-phone1-844-off-centre-floating.jpg) | | |
| ![08-phone1-844-diagonal.jpg](08-phone1-844-diagonal.jpg) | | |
| ![09-phone1-844-rubber-band.jpg](09-phone1-844-rubber-band.jpg) | | |
| ![10-phone1-844-second-touch-no-steal.jpg](10-phone1-844-second-touch-no-steal.jpg) | | |
| ![22-phone1-844-edge-landing.jpg](22-phone1-844-edge-landing.jpg) | | |
| ![23-phone1-844-edge-one-pixel.jpg](23-phone1-844-edge-one-pixel.jpg) | | |
| ![24-phone1-844-touch-cancel.jpg](24-phone1-844-touch-cancel.jpg) | | |
| ![25-phone1-667-off-centre-floating.jpg](25-phone1-667-off-centre-floating.jpg) | | |
| ![32-phone1-667-diagonal.jpg](32-phone1-667-diagonal.jpg) | | |
| ![33-phone1-667-rubber-band.jpg](33-phone1-667-rubber-band.jpg) | | |
| ![34-phone1-667-second-touch-no-steal.jpg](34-phone1-667-second-touch-no-steal.jpg) | | |
| ![46-phone1-667-edge-landing.jpg](46-phone1-667-edge-landing.jpg) | | |
| ![47-phone1-667-edge-one-pixel.jpg](47-phone1-667-edge-one-pixel.jpg) | | |
| ![48-phone1-667-touch-cancel.jpg](48-phone1-667-touch-cancel.jpg) | | |
| ![49-phone1-reduced-motion-held.jpg](49-phone1-reduced-motion-held.jpg) | | |
| ![50-phone1-reduced-motion-released.jpg](50-phone1-reduced-motion-released.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![07-strip-844-tracking.jpg](07-strip-844-tracking.jpg) | | |
| ![21-strip-844-release.jpg](21-strip-844-release.jpg) | | |
| ![31-strip-667-tracking.jpg](31-strip-667-tracking.jpg) | | |
| ![45-strip-667-release.jpg](45-strip-667-release.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's note (2026-11-17)
The stick's own UAT, run unchanged on the K-03 branch after the integrator merged K-02 in and
put the buttons behind `?controls=buttons`: exit 0, every step passed. This shows the merged
controller demo still serves the stick by default. Images not re-examined beyond the pass;
the stick's visual evidence is K-02 round 4.
