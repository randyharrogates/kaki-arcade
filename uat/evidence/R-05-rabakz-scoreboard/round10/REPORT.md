# R-05 Rabakz scoreboard: round 10 evidence (after fix round 23) — not passing

Integrator, 2026-11-17. Matrix: 480 states, 0 fit failures, 9 tight (as before), 6 name ellipsis
(by design), **288 with overflow**, now `rz-copy: child outside bounds` on question, reveal and
one-player screens (`matrix-all.json`). Stills: 52, 6 with that finding.
## Integrator's look
Pixel comparison with round 9: 1920-non-picture-question-4 differs only in a 17 × 3 px patch
(JPEG noise); 1920-scoreboard-8 is identical. Round 23's header padding and compensating margins
changed nothing visible, and the detector now flags the padded inner box for leaving its mask.
Sent back as round 24: revert round 23's CSS and make the detector report the boxes it compares.
