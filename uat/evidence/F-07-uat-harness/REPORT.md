# F-07 harness validation

Browser UAT and visual review are pending with the integrator. No browser, Wrangler or network was started for this slice. No screenshots exist, and no visual acceptance is claimed.

| Evidence | Result |
|---|---|
| `unit.txt` | 10 harness unit tests passed: arguments, ports, memory refusal, names/reports, thumb paths, expected errors, real dummy process groups, per-page error collection, separate contexts and CDP multi-touch |
| `verify.txt` | Passed: Test Files  129 passed (129); Tests  2945 passed | 1 skipped (2946); Duration  348.74s (transform 2.28s, setup 0ms, import 8.60s, tests 671.39s, environment 10ms); build and trace check passed |

| Screenshot | What it shows | Looked at by |
|---|---|---|

The integrator must run the C-07 script against local pairing and C-08 after `/play` merges, then open every resulting image and fill the generated report's review columns. Join-to-seat timings are a partial measurement of PERF-021, which specifies QR-to-seat.

Round 2: read the integrator's C-07 `auto/run.json` and opened its join, held, leave and return strips. The old strips contain full cards but scale the entire row to 480 px per frame; almost all sampled frames are settled. No revised browser capture or visual acceptance is claimed here.

`unit-round2.txt`: 11 focused tests passed, including never-resolving step/evaluation deadlines, named persisted failure and host/phone failure captures. `help-round2.txt` records the configurable whole-run deadline flag. Full round-2 verification is recorded in `verify-round2.txt`.

Integrator command: `pnpm uat -- C-07-host-lobby --out round-3 --timeout-min 10`; allow about 1–2 minutes, then inspect every new capture and the size manifest. The first full run took about one minute. Root tsconfig changes remain a Request in the slice note only.

## Integrator's browser runs (2026-11-17)

`pnpm uat -- C-07-host-lobby` and `pnpm uat -- C-08-join-page` on ports 4880 and 4881, after
main (with the join page) was merged into this branch. Nine runs of the lobby slice and three
of the join page slice were made while faults were fixed; the last of each exited 0 and left
no server or browser running.

| Run | Result | Kept here |
|---|---|---|
| Lobby, 31 steps, 7.5 MB | completed | `run-C-07-host-lobby/`: the four real-server shots, the four strips, the reduced-motion shot, `run.json`, the generated report (its other images are not kept) |
| Join page, 13 steps, 2.8 MB | completed | `run-C-08-join-page/`: everything |

Looked at by the integrator: every image in `run-C-08-join-page/` (17), and in
`run-C-07-host-lobby/` the reduced-motion shot, the join, leave and held strips and the four
real-server shots. Not looked at in the last lobby run: the 22 demo-state shots at 720p,
1080p and 4K other than two at 720p.

What the runs found, in order: a refusal to run beside existing evidence; a 21 MB run; a step
that hung for six and a half minutes; strips of the wrong moment and too small to read; a real
product fault (a player joining under reduced motion showed as "Seat 4" with no name; fixed in
C-08); after fix round 3, a readiness check expecting 404 where the pairing server answers 403
to a request with no origin; expected-error rules that missed the refused handshake; and
stills taken mid-crossfade (the ninth phone's shot showed the join form under "This room is
full"). The last four were fixed by the integrator in small commits on this branch.

Not done: `--headed`, `--keep`, `--frames` and the thumb helper have not been used in a
browser; no slice uses the thumbs yet.

## After fix round 4 (2026-11-17): the run folders here were replaced

The second review found that the earlier join and leave strips did not show the wipe (the
changed seat was already final in every frame) and the integrator's statement that they did was
wrong. Cause, found by sampling the page: the script waited for any `aria-hidden` element in the
seat, and the seat's icons are `aria-hidden`, so capture began before the change. The scripts
now find the outgoing copy by its class as well, and assert that the first frame is masked and
the last has no outgoing copy. Both slices exit 0 (lobby 31 steps, 7.5 MB; join page 14 steps,
2.7 MB), no shot was flagged unsettled, and nothing was left running.

Looked at by the integrator in these final runs: all four strips (join, leave, held, return:
each shows the old content at the start, the new content wiping in from the top over a ghost of
the old by about 300 ms, and the settled state), the reduced-motion lobby shot, and from the
join page run the reduced-motion rename shot (17) and the ninth phone (11). The other join-page
images of this final run and the lobby's demo-state shots were not reopened.

Fix round 4 was checked by running, not by a third review.
