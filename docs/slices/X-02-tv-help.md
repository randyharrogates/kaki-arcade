# X-02 — Put this on your TV

## Plan

REL-003: a short TV setup page, reachable from the landing page, with numbered HDMI,
TV browser and phone instructions. Fit the 1920 × 1080 shell board and uniformly scale
at 1280 × 720 and 960 × 540; on phones use normal document scrolling. Keep all help copy and CSS
behind `/tv-help`. No dependencies, shared trackers or contract changes.

Acceptance: all requested steps present; qualified TV-browser and networking advice;
landing link; TV bounds at all three TV sizes; no phone horizontal overflow at 390 × 844 and
844 × 390. UAT saves TV stills and overlapping scrolled phone stills and a landing-link still. Scope excludes
X-01 landing redesign, X-03 legal pages, device compatibility certification and deployment.

## Files

- `apps/web/src/pages/tv-help-copy.ts`: short copy, separately testable.
- `apps/web/src/pages/tv-help-route.tsx`, `tv-help.css`: reading page and scoped layout.
- `apps/web/src/pages/tv-help-copy.test.ts`, `tv-help.dom.test.ts`: copy, lazy boundary,
  rendered landing link and real Chromium layout checks.
- `apps/web/src/main.tsx`: independent useState + import() route.
- `apps/web/src/landing-route.tsx`: quiet help link; limit Space interception so a focused
  help link is not redirected to hosting by the existing window keyboard handler.
- `uat/slices/X-02-tv-help.mjs`: landing navigation, lazy-request check and three TV stills and overlapping phone stills.
- `uat/evidence/X-02-tv-help/REPORT.md`: execution status, not claimed visual evidence.

## Claims → source

| Copy line / claim | Source and limit |
| --- | --- |
| Laptop over HDMI is recommended | PRD REL-003; request explicitly chooses the recommended route. |
| Plug laptop into TV; choose its input | REL-003 HDMI route; explicit X-02 brief supplies these operational steps. The architecture does not document cable handling. |
| Open in Chrome, Edge or Safari | PRD REL-004 supports current Chrome/Edge and Safari on computers. |
| Full screen with Control + Command + F (Mac), F11 (Windows), possibly Fn | Explicit X-02 brief requests keys; these are browser/OS operating instructions, not a measured project capability. Repo docs do not specify shortcuts. Integrator should check on real keyboards. |
| Game Mode reduces delay; picture settings; name varies | REL-003 requires Game Mode; explicit X-02 brief supplies the explanation and location. No brand-specific claim. Repo docs do not independently document TV settings. |
| Keep laptop powered and awake | Explicit X-02 brief; supports authoritative host lifecycle in ARCHITECTURE §1 and §5 / PRD NET-001. No automatic wake-lock guarantee. |
| TV browser is fallback; open browser app and type address | REL-003, REL-005 and explicit brief. Address is the current `location.host`, labelled Address: in the mono token; loopback hosts show “the address in this laptop’s address bar”, avoiding invented production DNS. |
| May be slower or may not open the game; use laptop if so | D-128, D-136, D-137 and D-139: S-03a measured the dev Mac, not the TV. S-03b is pending. No TV performance promise; REL-005 supports laptop fallback. |
| Host a game, scan QR with each phone | PRD PLAT-001/002; ARCHITECTURE §1 host/controller and §5 pairing. Copy avoids naming the placeholder landing action, currently “Host a room”. |
| Internet; if a phone cannot join, use the same Wi-Fi and scan again | Round-2 brief; true with today’s empty ICE-server configuration and after C-02. No relay or unbuilt NET-004 prompt is promised. |

The requested physical setup, settings and key instructions are supplied by the brief;
no project document verifies those details independently. This provenance is explicit rather
than attributing them to unrelated measurements.

## Choices for the integrator

Main at start has the placeholder landing and no legal footer. X-03's legal page/CSS pattern
was read from its branch, but no X-03 code was imported. Reconcile only main's route entry
and the landing link when integrating. Keep the help link near X-01's final host action or
in X-03's footer. The existing Space handler required a narrow guard to preserve help-link
keyboard activation; Arrow keys retain existing host focus behaviour.

Uses existing console surface/panel treatment, token spacing and type, golden columns,
55 px TV safe margin. HDMI gets the wider column in a 1.618 : 1 : 1 grid. Every TV section uses 34 px
body / 55 px headings; the address uses the mono token. The DOM test requires panels to
end at least 34 px above the board’s 55 px safe edge. Phone breakpoint includes both requested orientations; phone
text remains 21 px and full-size links. No art or animation added. PERF-022's 1.5 MB shell
budget is preserved structurally through lazy help copy/CSS; no transfer measurement run.

Lobby help is deferred: its fixed header already has title, status, keyboard/game-pad hints
and player count. Adding a link without layout evidence risks the locked lobby; the brief
allows this follow-up. Consider a help entry in a future existing menu, keeping room state.

## Close-out and Requests

Closed 2026-11-18 after review 2 and the integrator's merge fix (only the host address is set in mono; a real-host
DOM case added). Evidence `uat/evidence/X-02-tv-help/round3/`, every still opened by the integrator, all acceptance
rows pass. Vitest 481/481 (reviewer), TypeScript, ESLint and design lint clean. Transfer: host +1,641 B gzip; the
shared controller entry +257 B gzip; the help code loads only when the page opens. PERF-020 controller start-up
median 182 ms of 2000 ms (5 runs, CPU 4×). Review items 6 and 10 stay with X-01, together with the C-02 Wi-Fi
re-check and the X-09 TV check (`docs/backlog/X-release.md`). Not proven: a real TV browser, full-screen keys on
real keyboards, Game Mode menu names by brand.
