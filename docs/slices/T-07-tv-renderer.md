# T-07 TV renderer — round 12

Scope: TR-001, TR-004, TR-030, TR-031, TR-061, TR-062, PERF-001.
Round 11 is committed at `66581bc2`, with evidence at `fbe38037` in
`uat/evidence/T-07-tv-renderer/round11-uat/`. Main was merged at `db7f05c7`.
Review 7 is not clean: strip 36 lacks the done pulse, the north-counter marker
covers the cook and held item at y=1.2, and the close-out documents were stale.
The integrator commits this round and runs its UAT to round12-uat.

## Changes

North-wall cues use the screen margin above the counter, with their maximum pulse
box clamped to the screen safe area (5 px inset), rather than the level box.
The dev caption moves to y=55. The band includes every north-wall station capable
of a cue (`hasCue(type, 1)`), even if its cue is initially hidden. Marker x remains
exactly cook x; y is max(normal, band + 5 + 21). A fallback caps the centre at
feet minus 62 px, above every real packed body head socket; in insufficient top
margin the disc may touch the bar border. Neither fixture level uses the fallback
at 1920 × 1080 or 1280 × 720 (both use the same scaled 1920 × 1080 scene).
The y=1.2 margin-path push is at most 5 px. Seats retain depth 30000.

The reachability sweep checks both fixture levels on a 0.01-tile grid, square cook
collision footprint, cue scales 1 and 1.05, head/hands anchors from the real manifest,
and continuity. Marker horizontal separation remains identical to cook separation.
Legal pairs with horizontal gap at least 42 px cannot overlap. Below that gap,
markers can touch at the band; vertical clamping does not preserve vertical separation.
The disc has a 2 px console-ink edge, including at normal height. Contrast is tested
against all seat cap colours, the reviewed red cap samples and the floor (at least 3:1).

Rejection obstacles now include every station's counter-item spot, in addition to
cards, HUD, cooks and every visible cue's maximum pulse box. Text stays fixed for
its rejection lifetime. The string scan follows functions reachable from update/render,
recognises only named publication guards, and catches String(), padStart, templates
and typed string addition. Dataset strings remain behind the explicit DEV guard.
The dead HUD-width hook and doubled A-11 comment are removed.

The chop → done fixture preserves level identity for a live transition. The UAT slice
asserts the gold span from each lossless strip frame: normal about 80 → 84 → 80,
reduced steady. Existing strips 36 and 61 keep their numbering. New evidence at the
end shows y=1.2 holding an item beneath Chop at both requested sizes and a 2.0 → 1.2
approach strip. No visual acceptance is claimed before the integrator inspects it.

The A-05 placeholder retains root-relative anchors, tile/120 scale and 44/42/34 plaque
stack with eight cells. Departures remain: track 90×14 versus 89×13, tick path 1 px
off reference, and an empty-state track. Gold is the approved Peek Poker accent
placeholder. Recipe steps retain single spaces until A-11. Mock font measurement
(should-fix 6) remains open. Perf-r7 is diagnostic only (dev p95 18.4 ms).

## Validation and evidence

See `uat/evidence/T-07-tv-renderer/CHECKS.md` for round-12 launches and results.
Round-11 evidence is historical and review 7 is not clean. Round-12 visual review
and production performance remain open.

## Close-out and Requests

The integrator commits this round and runs its UAT to round12-uat; inspect every
still and strip, fill the REPORT tables, and obtain independent review. In particular,
check the moved north cues, held-item clearance, marker edge, approach continuity,
normal/reduced done pulse, and counter-item/rejection clearance.
No UAT, perf, verify, install, commit, merge or push is run by this implementation round.
Trackers, contracts, lockfile and design documents stay with the integrator.

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm uat -- T-07-tv-renderer --out round12-uat --max-mb 40 --timeout-min 20
```
