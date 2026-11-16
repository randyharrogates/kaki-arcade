# C-05 reconnect review-fix round 1

D-086 governs the fixes. Headless logic/storage evidence; no screens are built.

The reviewer’s 16 repro cases are ported to assertions of ruled behaviour in
packages/platform/src/reconnect/review.test.ts. All 16 pass; see review-tests.txt for every
case name and outcome. Coverage includes the inclusive 120,000 ms hold, expiry at 120,001 ms,
automatic recovery at 60 seconds, slow recovery after the hold, new-code precedence, failed
resume send, six host reloads preserving original drop times, last-results bounding,
retryable host failure, 1 ms clock skew, eight long names, three malicious/malformed inputs,
prototype pollution in an otherwise valid snapshot, and a second lifecycle flush.

Additional reconnect tests cover timeout socket cleanup with snapshot retention, definitive
refusal clearing, throwing capture/optional fields, oversized selection degradation,
pageshow re-arming, phone clock skew and explicit rejoin. Existing three-game tests check
room metadata, private delivery, secret exclusion and interrupted match loss.

The host keeps the last results and drops optional results then selection before abandoning
a capture. A failed new write never removes the previous good snapshot. Original phone drop
times survive host reload, and the existing room reducer decides seat expiry and leadership.
Normal host writes coalesce at one second; pending changes flush again after page return.
No work is attached to simulation steps. No manifests, lockfile, contracts or shared trackers
are changed. Browser/device UAT and independent review remain with the integrator.

Full workspace validation is recorded in verify.txt. Focused reconnect output is in
tests.txt. Whitespace validation is in diff-check.txt. The exact shell integration requirements
and remaining Requests are in docs/slices/C-05-reconnect.md.

Final verification: `VITEST_MAX_WORKERS=2 pnpm verify` passed: 98 test files, 2,482 tests passed and one existing skip. Workspace checks, TypeScript, ESLint, design lint, build/budget checks and trace checks all passed (152 requirements). `git diff --check` passed. Full output: `uat/evidence/C-05-reconnect/verify.txt`.
