# X-02-tv-help UAT evidence

Every still opened and checked by the integrator on 2026-11-18. No sideways overflow on any phone still.

Command: `node tools/uat/run.mjs -- X-02-tv-help --phones 1 --out round3`
Commit: `731e6b54a8d7758dc2cb7e5a6a19e37e48f7a31b`
Viewports: 1920×1080, 1280×720, 960×540, 390×844, 844×390

| Timing | ms | Status |
|---|---:|---|
| Landing link opens the help page lazily | 880.4 | completed |
| Help at 1920 × 1080 | 179.5 | completed |
| Help at 1280 × 720 | 150.5 | completed |
| Help at 960 × 540 | 128.8 | completed |
| Help at 390 × 844 | 464.2 | completed |
| Help at 844 × 390 | 647.9 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-host-landing-help-link.jpg](01-host-landing-help-link.jpg) | Placeholder landing page with the "Put this on your TV" link under "Host a room". | Integrator (Claude) |
| ![02-host-tv-help-1920x1080.jpg](02-host-tv-help-1920x1080.jpg) | 1920 × 1080: three panels at 1.618 : 1 : 1, 34 px body and 55 px headings, all inside the safe margin; address line in DM Sans. | Integrator (Claude) |
| ![03-host-tv-help-1280x720.jpg](03-host-tv-help-1280x720.jpg) | The same board scaled to 1280 × 720, no scroll. | Integrator (Claude) |
| ![04-host-tv-help-960x540.jpg](04-host-tv-help-960x540.jpg) | The same board at 960 × 540 (scale 0.5), no scroll, nothing cut off. | Integrator (Claude) |
| ![05-host-tv-help-390x844.jpg](05-host-tv-help-390x844.jpg) | Phone 390 × 844, top of the page. | Integrator (Claude) |
| ![06-host-tv-help-390x844-section-1-scroll-228.jpg](06-host-tv-help-390x844-section-1-scroll-228.jpg) | Phone 390 × 844 scrolled through the laptop steps. | Integrator (Claude) |
| ![07-host-tv-help-390x844-section-1-scroll-650.jpg](07-host-tv-help-390x844-section-1-scroll-650.jpg) | Phone 390 × 844: end of laptop steps, TV browser fallback with the address line, start of Phones. | Integrator (Claude) |
| ![08-host-tv-help-390x844-section-2-scroll-889.jpg](08-host-tv-help-390x844-section-2-scroll-889.jpg) | Phone 390 × 844: TV browser fallback and Phones. | Integrator (Claude) |
| ![09-host-tv-help-390x844-section-3-scroll-1291.jpg](09-host-tv-help-390x844-section-3-scroll-1291.jpg) | Phone 390 × 844 at the end of the page (repeats 08: the page stops scrolling there). | Integrator (Claude) |
| ![10-host-tv-help-844x390.jpg](10-host-tv-help-844x390.jpg) | Phone 844 × 390, top of the page. | Integrator (Claude) |
| ![11-host-tv-help-844x390-section-1-scroll-173.jpg](11-host-tv-help-844x390-section-1-scroll-173.jpg) | Phone 844 × 390: all four laptop steps. | Integrator (Claude) |
| ![12-host-tv-help-844x390-section-1-scroll-368.jpg](12-host-tv-help-844x390-section-1-scroll-368.jpg) | Phone 844 × 390: laptop steps 3–4 and the TV browser fallback. | Integrator (Claude) |
| ![13-host-tv-help-844x390-section-2-scroll-527.jpg](13-host-tv-help-844x390-section-2-scroll-527.jpg) | Phone 844 × 390: TV browser fallback and the start of Phones. | Integrator (Claude) |
| ![14-host-tv-help-844x390-section-2-scroll-722.jpg](14-host-tv-help-844x390-section-2-scroll-722.jpg) | Phone 844 × 390: fallback and the whole Phones panel. | Integrator (Claude) |
| ![15-host-tv-help-844x390-section-3-scroll-786.jpg](15-host-tv-help-844x390-section-3-scroll-786.jpg) | Phone 844 × 390 at the end of the page (repeats 14). | Integrator (Claude) |
| ![16-host-tv-help-844x390-section-3-scroll-981.jpg](16-host-tv-help-844x390-section-3-scroll-981.jpg) | Phone 844 × 390 at the end of the page (repeats 14). | Integrator (Claude) |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| All steps present: laptop over HDMI (cable and input, Chrome/Edge/Safari, full-screen keys, Game Mode, power), TV browser fallback with the address, phones | Pass | 02, 11–14 |
| TV-browser and phone advice is qualified and true today and after C-02 | Pass | 02 (fallback "may not open the game"; phones "same Wi-Fi … scan again") |
| Landing link opens the page; the page's code and styles load only then | Pass | 01; UAT step asserts no tv-help request on the landing page |
| Fits the board at 1920 × 1080, 1280 × 720 and 960 × 540 without scrolling | Pass | 02, 03, 04 |
| Phones scroll vertically with no sideways overflow | Pass | 05–16 |
| Only the host address is set in mono (DESIGN §2); loopback wording in DM Sans | Pass | 02, 07; tv-help.dom.test.ts real-host case |
| PERF-020 controller start-up | Pass | median 182 ms of 2000 (5 runs, CPU 4×), uat/evidence/X-02-tv-help/perf-1 |
