# C-07 host lobby: evidence

Round 5 (the last section) is the current state; the first section is kept as history.

## History

Rounds 1 to 3 were captured after each fix round and are superseded by round 5; their images
are not kept in the repo. Two claims made on them were wrong and are withdrawn: a "clean
mid-transition frame" after round 1 was a settled frame, and a pair of "before and after
reload" shots after round 3 were byte-identical. `round4/` holds the first real-server checks
of an expired room and an outage (47 requests in 10 s before the fix, paced after it).

## Round 5 evidence (2026-11-17, after the second review; supersedes the tables above)

Retaken in Chromium after fix round 5. Every file was opened and looked at by the integrator.
Corrections to the section above: the round 3 pair `c07-40`/`c07-41` were byte-identical and
prove only that the same code was shown, not that a reload happened; and the round 3 strip
showed the lower half of a card going blank mid-wipe, which the earlier note missed.

| File (in `round5/`) | Viewport | State | What it shows |
|---|---|---|---|
| `c07-50-demo8-1080p.png` | 1920×1080 | Full lobby (demo) | Names at 34 px, status rows aligned on all eight cards |
| `c07-51-longnames-1080p.png` | 1920×1080 | Longest names (demo) | 12 CJK graphemes and 12 emoji take three lines at 34 px; no name is shrunk; the third line sits close to the status row |
| `c07-52-demo8-720p.png`, `c07-61-longnames-720p.png` | 1280×720 | Full lobby, longest names | Same layout scaled; nothing clipped |
| `c07-53-demo8-4k.png` | 3840×2160 | Full lobby | Retaken after the name fix; scales cleanly |
| `c07-54-demo3-1080p.png`, `c07-55-demo0-1080p.png` | 1920×1080 | Three players, empty | Empty seats say "Scan to join" while a code is on screen |
| `c07-56-creating.png`, `c07-57-restoring.png` | 1920×1080 | Creating, restoring | Seats keep full-colour badges; names in secondary ink; no quality row |
| `c07-58-unreachable.png`, `c07-59-expired.png`, `c07-60-replaced.png` | 1920×1080 | Error states (demo) | Nothing dimmed by opacity; players can still be told apart |
| `strips-join-and-held-slow10.png` (frames `c07-62-*`) | crops | Join and held, slowed ×10, six frames 400 ms apart each | The card surface stays put; contents wipe; the old label is a faint ghost. One held frame shows the ghost and the new name crossing on one line at the wipe edge |
| `c07-63-reduced-motion-join.png` | 1920×1080 | Reduced motion, 300 ms after a join | Already settled |
| `c07-64-real-room.png` | 1920×1080 | Real local pairing server | Room PH42 6D64 created, no console errors |
| `c07-65-real-reload-early.png` | 1920×1080 | 120 ms after reload | Mid-reveal; the panel says "Creating your room" although a saved room is being restored (wording to fix) |
| `c07-66-real-reload-settled.png` | 1920×1080 | After reload | The same room PH42 6D64 |
| `c07-67-open-room-server-down.png` | 1920×1080 | Pairing server stopped while the room is open | The code and QR stay; the chip says "Reconnecting"; 3 socket attempts in 12 s |

Pairing server smoke on `wrangler dev --local`: exit 0, all 17 groups pass, including the
unknown-room step with `X-Kaki-Room: gone`. The integrator changed one expected value in
`scripts/smoke.mjs` (the exposed-headers list now includes `X-Kaki-Room`).

Not covered: phones connected during the outage (no join page until C-08; covered by the
netcode test only), a real TV, Safari and Firefox.
