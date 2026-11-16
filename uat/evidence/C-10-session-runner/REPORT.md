# C-10 headless acceptance evidence

- PASS: 1/8 player whole matches, results freeze, picker transition and preloaded context.
- PASS: 60 seeded random matches protect each phone's private bytes and hidden global values.
- PASS: revision suppression, audience filtering, null clears, stale taps, arrival order.
- PASS: pause/held/tap barrier, current-generation acknowledgement, old connection rejection.
- PASS: disconnect release, reconnect reset and full resend; membership and leader changes.
- PASS: insufficient player/team pause, six game exception boundaries, bounded long-stall catch-up.
- PASS: same seed and recorded step inputs reproduce the state hash.
- PASS: real netcode receiver rejects pre-fence input; Peer method types fit test adapter.

See tests.txt for named assertions and measured mean costs. See verify.txt for workspace
verification. No screenshots apply: there is no DOM, rendering or browser integration here.
The protocol acknowledgement and netcode cache invalidation remain integration Requests;
these tests prove the host logic and fence hook, not a shipped phone wire implementation.

Final workspace result: 69 files passed; 2,265 tests passed, 1 existing skipped (2,266 total).
Build and trace passed. Targeted suite: 22 passed. Latest targeted mean call times:
1.644 us/step with eight seats and no recorder; 9.756 us/step including the allocating fixture,
record copies and subscribers. These are diagnostic shared-machine timings, not TV budgets.
