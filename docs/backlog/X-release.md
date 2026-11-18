# Track X — Public release

Everything between "works in the room" and "anyone with the link can play". Deploying, DNS and anything that costs money stop for Randy.

**Owns:** `apps/web/src/pages`, deploy config

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story X1 — A stranger can find it, understand it and play it safely



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| X-01 | Landing page with one "Host a game" action | REL-002 | F-06, A-09 | 4 | todo |
| X-02 | "Put this on your TV" help page | REL-003 | F-06, S-03 | 4 | merged |
| X-03 | Privacy page and credits page, including the question-bank attribution | DATA-001, DATA-004, RZ-021 | F-06 | 4 | todo |
| X-04 | Anonymous error and performance counts only | DATA-003 | C-10 | 4 | todo |
| X-05 | Browser matrix: Chrome, Edge, Safari on the big screen; iPhone Safari and Android Chrome | REL-004, REL-006 | C-15 | 4 | todo |
| X-07 | Names checked for trademarks and clashes: Kaki Arcade, Tabao Rush, Peek Poker, Rabakz | — | — | 4 | todo |
| X-08 | 30-minute 8-player soak across all three games | NFR-REL, PERF-030 | R-08, P-07, T-14 | 4 | todo |
| X-09 | Real-device UAT with Randy and his players: the `UAT.md` §5 checklist, 8 real phones, the TV | NFR-REL, REL-005, PERF-002, PERF-010 | X-08 | 4 | todo |
| X-06 | Deploy to Cloudflare on `arcade.leeseidon.com` over HTTPS, then push the repository (Randy's go required) | REL-001, NET-006 | X-01 to X-09 | 4 | todo |

### X-02 review follow-ups for X-01 (2026-11-18)

- Place the "Put this on your TV" link as a secondary or footer link on the final landing page (the
  locked landing board has one action), rename the action "Host a game" (REL-002), and let arrow keys
  and a TV remote reach both links (today any arrow returns focus to the host link); test the Space and
  arrow handling there.
- When C-02 (relay) resumes, re-check the help page's phone Wi-Fi line against the NET-004 message.
- X-09 on the TCL Q65: the help page's viewport, readability from 3 m and the TV-browser advice.
