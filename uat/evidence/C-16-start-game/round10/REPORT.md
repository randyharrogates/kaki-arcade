# C-16-start-game UAT evidence

Automated execution only. Visual review and acceptance decisions are pending.

Command: `node tools/uat/run.mjs -- C-16-start-game --phones 2 --max-mb 16`
Commit: `9187faa79a4d71d2c673a97e1985e50f4cc694f9`
Viewports: 1920×1080, 1280×720, 844×390

| Timing | ms | Status |
|---|---:|---|
| Create room through host page | 900.2 | completed |
| Seat two phones for rabakz | 480.9 | completed |
| Leader starts rabakz; TV and both shells follow | 129544.5 | completed |
| Create room through host page | 845.4 | completed |
| Seat two phones for tabao-rush | 296.4 | completed |
| Leader starts tabao-rush; TV and both shells follow | 9500.5 | completed |

Expected errors (count):
None

## Real server

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![01-page-results-fit-long-winner-1920.jpg](01-page-results-fit-long-winner-1920.jpg) | | |
| ![02-page-results-fit-long-winner-keyboard-1920.jpg](02-page-results-fit-long-winner-keyboard-1920.jpg) | | |
| ![03-page-results-fit-single-word-winner-1920.jpg](03-page-results-fit-single-word-winner-1920.jpg) | | |
| ![04-page-results-fit-team-result-1920.jpg](04-page-results-fit-team-result-1920.jpg) | | |
| ![05-page-results-fit-two-way-tie-keyboard-1920.jpg](05-page-results-fit-two-way-tie-keyboard-1920.jpg) | | |
| ![06-page-results-fit-wide-tie-1920.jpg](06-page-results-fit-wide-tie-1920.jpg) | | |
| ![07-page-results-fit-wide-tie-keyboard-1920.jpg](07-page-results-fit-wide-tie-keyboard-1920.jpg) | | |
| ![08-page-results-fit-team-tie-keyboard-1920.jpg](08-page-results-fit-team-tie-keyboard-1920.jpg) | | |
| ![09-page-results-fit-eight-player-teams-1920.jpg](09-page-results-fit-eight-player-teams-1920.jpg) | | |
| ![10-page-results-fit-tamil-tie-keyboard-1920.jpg](10-page-results-fit-tamil-tie-keyboard-1920.jpg) | | |
| ![11-page-results-fit-cuneiform-ligature-tie-1920.jpg](11-page-results-fit-cuneiform-ligature-tie-1920.jpg) | | |
| ![12-page-results-fit-ligature-cuneiform-tie-1920.jpg](12-page-results-fit-ligature-cuneiform-tie-1920.jpg) | | |
| ![13-page-results-fit-ligature-tamil-tie-1920.jpg](13-page-results-fit-ligature-tamil-tie-1920.jpg) | | |
| ![14-page-results-fit-ligature-winner-1920.jpg](14-page-results-fit-ligature-winner-1920.jpg) | | |
| ![15-page-results-fit-eight-wide-two-way-tie-1920.jpg](15-page-results-fit-eight-wide-two-way-tie-1920.jpg) | | |
| ![16-page-results-fit-eight-wide-team-tie-1920.jpg](16-page-results-fit-eight-wide-team-tie-1920.jpg) | | |
| ![17-page-results-fit-five-way-tie-keyboard-1920.jpg](17-page-results-fit-five-way-tie-keyboard-1920.jpg) | | |
| ![18-page-results-fit-eight-way-tie-keyboard-1920.jpg](18-page-results-fit-eight-way-tie-keyboard-1920.jpg) | | |
| ![19-page-results-fit-three-way-tie-1920.jpg](19-page-results-fit-three-way-tie-1920.jpg) | | |
| ![20-page-results-fit-long-winner-1280.jpg](20-page-results-fit-long-winner-1280.jpg) | | |
| ![21-page-results-fit-long-winner-keyboard-1280.jpg](21-page-results-fit-long-winner-keyboard-1280.jpg) | | |
| ![22-page-results-fit-single-word-winner-1280.jpg](22-page-results-fit-single-word-winner-1280.jpg) | | |
| ![23-page-results-fit-team-result-1280.jpg](23-page-results-fit-team-result-1280.jpg) | | |
| ![24-page-results-fit-two-way-tie-keyboard-1280.jpg](24-page-results-fit-two-way-tie-keyboard-1280.jpg) | | |
| ![25-page-results-fit-wide-tie-1280.jpg](25-page-results-fit-wide-tie-1280.jpg) | | |
| ![26-page-results-fit-wide-tie-keyboard-1280.jpg](26-page-results-fit-wide-tie-keyboard-1280.jpg) | | |
| ![27-page-results-fit-team-tie-keyboard-1280.jpg](27-page-results-fit-team-tie-keyboard-1280.jpg) | | |
| ![28-page-results-fit-eight-player-teams-1280.jpg](28-page-results-fit-eight-player-teams-1280.jpg) | | |
| ![29-page-results-fit-tamil-tie-keyboard-1280.jpg](29-page-results-fit-tamil-tie-keyboard-1280.jpg) | | |
| ![30-page-results-fit-cuneiform-ligature-tie-1280.jpg](30-page-results-fit-cuneiform-ligature-tie-1280.jpg) | | |
| ![31-page-results-fit-ligature-winner-1280.jpg](31-page-results-fit-ligature-winner-1280.jpg) | | |
| ![32-page-results-fit-eight-wide-two-way-tie-1280.jpg](32-page-results-fit-eight-wide-two-way-tie-1280.jpg) | | |
| ![33-page-results-fit-eight-wide-team-tie-1280.jpg](33-page-results-fit-eight-wide-team-tie-1280.jpg) | | |
| ![34-page-results-fit-five-way-tie-keyboard-1280.jpg](34-page-results-fit-five-way-tie-keyboard-1280.jpg) | | |
| ![35-page-results-fit-eight-way-tie-keyboard-1280.jpg](35-page-results-fit-eight-way-tie-keyboard-1280.jpg) | | |
| ![36-page-results-fit-three-way-tie-1280.jpg](36-page-results-fit-three-way-tie-1280.jpg) | | |
| ![50-host-rabakz-before-start.jpg](50-host-rabakz-before-start.jpg) | | |
| ![61-phone1-rabakz-controller-1.jpg](61-phone1-rabakz-controller-1.jpg) | | |
| ![62-phone2-rabakz-controller-2.jpg](62-phone2-rabakz-controller-2.jpg) | | |
| ![63-host-rabakz-running.jpg](63-host-rabakz-running.jpg) | | |
| ![64-host-rabakz-game-final.jpg](64-host-rabakz-game-final.jpg) | | |
| ![75-host-rabakz-results-tv.jpg](75-host-rabakz-results-tv.jpg) | | |
| ![76-phone1-rabakz-results-leader.jpg](76-phone1-rabakz-results-leader.jpg) | | |
| ![77-phone2-rabakz-results-phone2.jpg](77-phone2-rabakz-results-phone2.jpg) | | |
| ![78-host-rabakz-returned-picker.jpg](78-host-rabakz-returned-picker.jpg) | | |
| ![79-phone1-rabakz-returned-picker-phone1.jpg](79-phone1-rabakz-returned-picker-phone1.jpg) | | |
| ![80-phone2-rabakz-returned-picker-phone2.jpg](80-phone2-rabakz-returned-picker-phone2.jpg) | | |
| ![81-phone1-rabakz-restarted-controller-1.jpg](81-phone1-rabakz-restarted-controller-1.jpg) | | |
| ![82-phone2-rabakz-restarted-controller-2.jpg](82-phone2-rabakz-restarted-controller-2.jpg) | | |
| ![96-host-tabao-rush-before-start.jpg](96-host-tabao-rush-before-start.jpg) | | |
| ![107-phone1-tabao-rush-controller-1.jpg](107-phone1-tabao-rush-controller-1.jpg) | | |
| ![108-phone2-tabao-rush-controller-2.jpg](108-phone2-tabao-rush-controller-2.jpg) | | |
| ![109-host-tabao-rush-running.jpg](109-host-tabao-rush-running.jpg) | | |

## Strips

| Screenshot | What it shows | Looked at by |
|---|---|---|
| ![49-strip-rabakz-header-crossfade.jpg](49-strip-rabakz-header-crossfade.jpg) | | |
| ![60-strip-rabakz-start-crossfade.jpg](60-strip-rabakz-start-crossfade.jpg) | | |
| ![74-strip-rabakz-results-crossfade.jpg](74-strip-rabakz-results-crossfade.jpg) | | |
| ![95-strip-tabao-rush-header-crossfade.jpg](95-strip-tabao-rush-header-crossfade.jpg) | | |
| ![106-strip-tabao-rush-start-crossfade.jpg](106-strip-tabao-rush-start-crossfade.jpg) | | |

| Acceptance statement | Pass / fail | Evidence |
|---|---|---|
| | | |

## Integrator's look (2026-11-17)
Run: `pnpm uat -- C-16-start-game --phones 2 --max-mb 16`, exit 0, no process left, after two
integrator fixes to the new assertion: it read the page's only `h1`, but the fixture page also
holds the hidden "This browser can't run Kaki Arcade" heading, so it now reads
`.results-winner h1`; and the single Arabic-ligature winner was wrongly expected to fall back,
though its name fits (the margin checks for it pass), so it now expects the name (D-131: only
when needed). `Overlap.dom.test.ts` passed. Also before this run: the main merge had left
conflict markers in controller-demo.tsx, which the integrator's commit captured; resolved in the
next commit (package imports plus the layout engine).
Opened c16r10.jpg (shots 11, 12, 13, 14, 18 at 1920).
- 12 ﷺ×12 tied with 𒀱×12, and 13 ﷺ×12 tied with ஷௌ×12, with the hint: the headline reads
  "2 players share first" (D-131) and both columns fit; the names are in the ranking with "…".
- 11 the reverse order (cuneiform first) keeps the names because they fit; crowded but inside.
- 14 a single ﷺ×12 winner keeps the name and fits.
- 18 eight-way tie: "+5" is now the chip's brown, not a seat colour.
| Shot | What it shows | Looked at by |
|---|---|---|
| 11-14, 18 (1920) | D-131 fallback only when needed; +N badge colour | Claude (integrator) |
