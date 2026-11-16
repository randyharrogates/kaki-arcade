# C-03 round 5 — DATA-005

Read both integrator probes. No Wrangler was started. The corrected fake reproduces
probe B before the fix: after twelve openings, per-room refusal and deadline feedback,
the sixth opening at t=14 s incorrectly returns 101. See round5-before.txt.

Cause: an idle admission shard loses its ordinary in-memory counters when the runtime
evicts it. The old fake held shard objects forever. The Worker cache leaves the shard
idle after deadline feedback, exposing the fault. Refunds and feedback classification do
not delete or forgive those pending charges.

The fix pins a shard through its bounded, existing retention window with one pending
in-memory task, then releases it after quiet. No limiter storage or alarm operations.
Production compatibility date 2026-11-16 enables pending-I/O eviction protection.

Worker regressions drive actual Worker, admission adapter and room adapter, including
room deadline alarms and feedback through waitUntil, for per-room, room pool-full, edge,
cached, /48 and /64 rollback refusals. They assert five admissions then refusal, followed
by exactly one trial after those five expire. Lifecycle release and renewal are covered.
See round5-tests.txt and round5-verify.txt for results.

The smoke scenario independently creates a room from a different address, asserts the
sixth refusal, exercises the post-feedback idle window, and waits for the first block
before asserting one trial and another refusal. Runtime smoke remains with the integrator.

Duration billing changes: admission shards now stay active up to ten minutes after the
last request. No client data is persisted. Unexpected runtime resets can still lose counters.

Final verification: `VITEST_MAX_WORKERS=2 pnpm verify` passed: 97 test files;
2,521 tests passed, one skipped; build and trace check passed. Focused Worker suite:
26 tests passed. Smoke JavaScript syntax and diff whitespace checks passed.
