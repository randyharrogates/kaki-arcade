# Track X — Public release

Everything between "works in the room" and "anyone with the link can play". Deploying, DNS and anything that costs money stop for Randy.

**Owns:** `apps/web/src/pages`, deploy config

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story X1 — A stranger can find it, understand it and play it safely



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| X-01 | Landing page with one "Host a game" action | REL-002 | F-06, A-09 | 4 | done |
| X-02 | "Put this on your TV" help page | REL-003 | F-06, S-03 | 4 | merged |
| X-03 | Privacy page and credits page, including the question-bank attribution | DATA-001, DATA-004, RZ-021 | F-06 | 4 | merged |
| X-04 | Anonymous error and performance counts only | DATA-003 | C-10 | 4 | merged |
| X-05 | Browser matrix: Chrome, Edge, Safari on the big screen; iPhone Safari and Android Chrome | REL-004, REL-006 | C-15 | 4 | part 1 merged (automated Mac subset: Chromium and Chrome TVs pass; C-14 passes in WebKit; Playwright WebKit cannot seat phones, D-212); Edge, real Safari, iPhone, Android and TV browsers at K-07 and X-09; Firefox needs a runner option (OQ-051) |
| X-07 | Names checked for trademarks and clashes: Kaki Arcade, Tabao Rush, Peek Poker, Rabakz | — | — | 4 | todo |
| X-08 | 30-minute 8-player soak across all three games | NFR-REL, PERF-030 | R-08, P-07, T-14 | 4 | todo |
| X-09 | Real-device UAT with Randy and his players: the `UAT.md` §5 checklist, 8 real phones, the TV | NFR-REL, REL-004, REL-005, REL-006, PERF-002, PERF-010 | X-08 | 4 | todo |
| X-10 | Credits: a "Download our questions (CC BY-SA 4.0)" link to the question-bank files the build already ships; Credits fit re-measured in legal.dom (D-232) | RZ-021, DATA-004 | X-03 | 4 | done (merged 2026-11-19; D-268) |
| X-06 | Deploy to Cloudflare on `arcade.leeseidon.com` over HTTPS, then push the repository (Randy's go required) | REL-001, NET-006 | X-01 to X-09 | 4 | todo |

### X-02 review follow-ups for X-01 (2026-11-18)

- Place the "Put this on your TV" link as a secondary or footer link on the final landing page (the
  locked landing board has one action), rename the action "Host a game" (REL-002), and let arrow keys
  and a TV remote reach both links (today any arrow returns focus to the host link); test the Space and
  arrow handling there — done (X-01, D-255).
- When C-02 (relay) resumes, re-check the help page's phone Wi-Fi line against the NET-004 message.
- X-09 on the TCL Q65: the help page's viewport, readability from 3 m and the TV-browser advice; the landing focus ring crosses the Privacy/Credits footer pill's edge (X-01 review, deferred).

### X-04 review follow-ups (2026-11-18)

- App favicon (needs a design board, rule 5): ship `/favicon.ico` and the icon link for the host and controller within PERF-020 and PERF-022; then remove the harness's favicon-404 exception.
- X-03 privacy page: copy D-180's eight kinds, with `reconnect:signal` worded as "signalling outages"; state that totals have no expiry and that `error:signal:unavailable` under-counts by design.
- X-06: check `/counts` on the real edge (EDGE_LIMIT, origin, costs); confirm no `.leeseidon.com` cookie reaches it and that the keepalive hide fetch is delivered.
- UAT harness: a worker-side request log or context-wide request watcher, so slices can check headers of requests sent while a page unloads.
