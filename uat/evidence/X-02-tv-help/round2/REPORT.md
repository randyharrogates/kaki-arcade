# X-02-tv-help UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- X-02-tv-help --phones 1 --out round2`
Commit: `eef79eec3babfbc025b6d3c65ed34d0ad5dd7004`
Viewports: 1920×1080, 1280×720, 960×540, 390×844, 844×390

| Timing | ms | Status |
|---|---:|---|
| Landing link opens the help page lazily | 1325.5 | completed |
| Help at 1920 × 1080 | 222.9 | completed |
| Help at 1280 × 720 | 212.1 | completed |
| Help at 960 × 540 | 220.1 | completed |
| Help at 390 × 844 | 536.7 | completed |
| Help at 844 × 390 | 703.8 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-landing-help-link.jpg](01-host-landing-help-link.jpg) | | |
| ![02-host-tv-help-1920x1080.jpg](02-host-tv-help-1920x1080.jpg) | | |
| ![03-host-tv-help-1280x720.jpg](03-host-tv-help-1280x720.jpg) | | |
| ![04-host-tv-help-960x540.jpg](04-host-tv-help-960x540.jpg) | | |
| ![05-host-tv-help-390x844.jpg](05-host-tv-help-390x844.jpg) | | |
| ![06-host-tv-help-390x844-section-1-scroll-228.jpg](06-host-tv-help-390x844-section-1-scroll-228.jpg) | | |
| ![07-host-tv-help-390x844-section-1-scroll-650.jpg](07-host-tv-help-390x844-section-1-scroll-650.jpg) | | |
| ![08-host-tv-help-390x844-section-2-scroll-889.jpg](08-host-tv-help-390x844-section-2-scroll-889.jpg) | | |
| ![09-host-tv-help-390x844-section-3-scroll-1318.jpg](09-host-tv-help-390x844-section-3-scroll-1318.jpg) | | |
| ![10-host-tv-help-844x390.jpg](10-host-tv-help-844x390.jpg) | | |
| ![11-host-tv-help-844x390-section-1-scroll-173.jpg](11-host-tv-help-844x390-section-1-scroll-173.jpg) | | |
| ![12-host-tv-help-844x390-section-1-scroll-368.jpg](12-host-tv-help-844x390-section-1-scroll-368.jpg) | | |
| ![13-host-tv-help-844x390-section-2-scroll-527.jpg](13-host-tv-help-844x390-section-2-scroll-527.jpg) | | |
| ![14-host-tv-help-844x390-section-2-scroll-722.jpg](14-host-tv-help-844x390-section-2-scroll-722.jpg) | | |
| ![15-host-tv-help-844x390-section-3-scroll-786.jpg](15-host-tv-help-844x390-section-3-scroll-786.jpg) | | |
| ![16-host-tv-help-844x390-section-3-scroll-981.jpg](16-host-tv-help-844x390-section-3-scroll-981.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |
