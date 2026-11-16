# C-01 evidence

No UI is introduced. Core tests and full workspace verification are the automated evidence.
See verify.txt for the complete run. Acceptance results:

- PASS: unambiguous random codes, rejection sampling and rude-substring rejection.
- PASS: authenticated host replacement, absence notification and waiting-peer replay.
- PASS: role-decoded signalling forwarding, wrong room/peer isolation, gameplay/binary/size rejection.
- PASS: bounded pending phones and per-socket token bucket; exact Origin allow-list matching.
- PASS: idle and absolute expiry, secret removal, host close/drop lifecycle.
- PASS: seeded random event sequences: role/count/serialisation/empty alarm invariants.
- NOT RUN: Wrangler local smoke, actual adapter hibernation/restart and WebRTC/browser UAT.
  Integrator must run these; no claim of runtime/deployment proof is made.

Smoke script syntax checked with node --check. No network, installation or deployment used.

Continuation audit (2026-11-16): reread committed implementation and a1–a6 plus lib.mjs.
Finished readability fixes and extended the normalised-code smoke case to the URL itself.
Re-ran node --check successfully and independently reproduced the code-space count:
28^8 = 377,801,998,336 raw; 361,866,010,493 accepted; 15,935,987,843 rejected.
Local-only startup retry with telemetry disabled failed: EPERM writing Wrangler's external log
and permission denied binding 127.0.0.1:9229. Therefore network smoke and manual restart remain
NOT RUN. No Cloudflare deployment or remote binding was used. Canonical pings remain exempt
through runtime auto-response; only noncanonical ping floods consume the token bucket.

Security follow-up (2026-11-16): eight raw characters under D-065, displayed as two groups of four.
code-space.txt contains the reproducible eight-character count and conditional guess bounds.
Adapter regressions prove repeated silent host-route attempts never evict waiting phones, a second
unidentified host is refused with HTTP 429 before accept, wrong secrets free the host reservation,
and authenticated replacement succeeds with eight phones plus four silent phone-route sockets.
Equivalent ping JSON, malformed JSON, invalid protocol, binary and oversized frames exhaust the
bucket. Canonical auto-responses are intentionally exempt because they never wake the object.
Smoke script covers the saturated host case and eight-character normalisation; runtime smoke
and restart remain NOT RUN under the previously recorded sandbox limitation.

Follow-up verification: `pnpm verify` PASS — 31 test files, 1,027 tests, build and trace check.
`node --check apps/signal/scripts/smoke.mjs` PASS. Changes left uncommitted.

## Follow-up 2 — D-066

Host upgrades authenticate offered subprotocol credentials before acceptance; no unidentified
host slot or eviction remains. The adapter regression rejects 1,000 bad credentials without
allocating sockets, preserving eight phones and four silent phone openings. A valid replacement
replays all peers and forwarding remains usable. Tests verify selected kaki.v1, host attachment
role, replaced close reason, retired-message handling, no socket token disclosure, and use of
the full-character secret comparator. pnpm verify: 31 files / 1,033 tests passed, build and trace
passed; see verify.txt. Smoke syntax and diff whitespace checks passed.

Smoke expectations were audited against core and adapter: spoofed peer is valid extra input
and is discarded in favour of the server id; reload presence messages precede phone replacement
errors. Missing/wrong host credentials now expect HTTP 401. STEP and FAIL labels identify each
logical block. Runtime smoke uses three bad upgrades to stay within the ten-second deadline;
the deterministic fake covers 1,000.

Runtime UAT was not run: tools/agents/memcheck.sh uat failed because sandbox sysctl access was
denied (Operation not permitted). Workerd size handling, real alarm timing, ping flood and the
manual abrupt-restart check remain with the integrator. No runtime pass is claimed.
