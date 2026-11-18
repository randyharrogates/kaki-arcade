# P-07 — Full-match console UAT, rounds 1–5

Goal: exercise default five-round Peek Poker through the real room, registry, controller kit,
WebRTC inputs and mounted TV table at three and eight phones. Requirements: PP-001–013,
PP-020–022, PP-030–032 and the Peek Poker part of PLAT-033; limits below apply.

## Plan and acceptance

Write only `uat/slices/P-07-full-match.mjs`, this note and evidence below
`uat/evidence/P-07-full-match/`. No product changes, dependencies, commits or tracker changes.
The requesting brief overrides the normal verify/UAT workflow: round 5 runs only ESLint and
Node syntax checking, each launched with one-minute load below 8. No Vitest,
verify, UAT or perf is run by the builder. Any runtime assertion failure must stop the reviewer’s
run and be reported as a possible product defect, without changing product code.

The reviewer runs the same script at both counts. A non-picker last seat makes no input in any
round. Seat 2 locks the strongest available pair first; seat 1 locks the identical pair five
simulated seconds later. This proves speed wins over seat order. Remaining active seats choose
varied pairs sharing one card with the first two. Eight phones therefore guarantee at least seven
markers on that card; every deal permits shared picks. The oracle searches only cards already
shown publicly and applies the publicly announced swaps; it never reads hidden simulation state.
No fixed seed or rule override is needed.

## Named steps and what they prove

| Step | Proof / evidence |
|---|---|
| Create room; Lobby | Real join URL, distinct contexts, all seats acknowledged by host and phones |
| Picker → default five rounds → Start | Real Peek Poker registration and mounted table, five-round default |
| R1–R5 deal, memorise and difficulty | 19 unique standard card codes; 16 grid and three shared; 20/16/12/10/8 memorise countdowns; no swaps in R1/2, card swap in R3, row swap in R4, two sequential swaps in R5 |
| R1–R5 early/late private picks | Real phone buttons; selected states acknowledged; locked seat shows Picked; idle seat remains unlocked until 20-second timeout |
| R1–R5 public secrecy | Every emitted pre-reveal public view has null picks and no hands; hidden grid is null; shared cards remain unchanged |
| R1–R5 received-message secrecy | Every decoded control-channel message at every phone’s existing P-03 transport seam; face-down unlabelled cells, selections restricted to recipient’s own planned pair, strict allowed payload shapes, numeric room player count, no private hand cards before reveal |
| R1–R5 DOM secrecy | Every requestAnimationFrame sample on host and every phone during pick, including transient DOM; no TV hands, phone hand faces or early reveal copy; selected targets belong only to that phone |
| R1–R5 reveal and scoring | Grid equals public deal after announced swaps; two distinct picks per player; exact five-card composition; independent poker ranking and points oracle; fastest tied best gets +3, other bests +1, hands ordered best to worst |
| R1–R5 scoreboard | All TV rows’ places and cumulative scores, ties included; every phone’s exact own Place and Score; complete positive countdown sequences for memorise, pick, reveal (8 s) and scoreboard (5 s); shared cards unchanged throughout each round |
| Final podium and Continue | Final board rows’ places and scores at 1920 × 1080 and 1280 × 720; every phone’s final stats; Continue to shell results, then Back to game picker |

The last transition deliberately follows the existing console’s two actions: Continue opens
shell results; Back to game picker returns the room to the picker. The brief’s shorthand
“Continue back to the picker” is interpreted as that existing flow.

Stills cover TV and every phone for memorise, pick, locked, reveal and scoreboard in R1/R5,
plus both R5 swaps, every phone on the podium, both TV podium sizes and the picker. A six-frame
reveal strip advances the real host animation clock by 60 ms per frame; its harness labels
are wall-clock capture times, not simulated animation times. Phone JPEGs use CSS resolution
844 × 390 rather than repeating pixels at emulated DPR 3. No individual strip frames are kept
unless the reviewer explicitly uses `--frames` (omit it for the byte budget). The harness enforces
`--max-mb 24`, including compressed traces, and rejects a larger requested cap. The current round-3 runs produced 9.1 MB at three phones and 15 MB at eight phones, within
the budget. Both ran on the merged tree and were reviewed in review 2.

The P-03 source interception patterns observe existing public output and decoded incoming
phone messages. They add capture variables to served browser code only, with no repository
product hooks, hidden-state access, injected private values or intercepted results hand-off.
The clock advances normal simulation and animation frames. Signalling keepalive errors are
scoped to the host room endpoint, following C-17. All other errors fail normally.
`secrecy.json.gz` retains public views, decoded messages and pick DOM frame samples even when
an assertion fails. Each `round-N.json` records revealed public data, intended pairs, cumulative
scores and shared-card seats. No claim is made about unpainted intermediate DOM mutations or
canvas pixel secrecy beyond the public rendering input and mandatory visual review.

## Requirement coverage

The current three/eight-phone round-3 runs executed on the merged tree and were reviewed
offline in review 2, including the round-3 additions below.

| Rules | This run | Existing tests / complementary evidence |
|---|---|---|
| PP-001 | Default five rounds, cumulative scores and match end | `rules/game.test.ts`, `harness.test.ts`: 3/5/7 settings; other lengths not run here |
| PP-002–004 | Deal shape, uniqueness, complete memorise countdown, hide, persistent shared values; stills for painted inspection | `rules/game.test.ts`, host tests: deterministic dealing, canvas mapping |
| PP-005–006 | Own phone selection and lock, shared choices | `rules/phone.test.ts`: deselect, input bounds and controls |
| PP-007–009 | Independent five-card oracle, ranking, per-hand points, speed tie against seat order, cumulative scores | `rules/evaluator.test.ts`, `game.test.ts`: all categories and rare tie cases; this deal cannot exercise every category |
| PP-010 | Last seat never picks; timeout yields two distinct cards and random-fill message in every round | `rules/game.test.ts`: seeded random fill, including partially completed picks; randomness distribution not assessed here |
| PP-011 | All five default difficulty rows and announced swaps applied to revealed grid | `rules/game.test.ts`, `harness.test.ts`: three/seven-round variants; host motion tests |
| PP-012 | Three/eight player layouts | `rules/game.test.ts`, `saved-view.test.ts`, P-05: solo and personal best; other counts not run here |
| PP-013 | Not exercised: all players join in lobby | `rules/game.test.ts`, C-17 late-join real-console UAT |
| PP-020–021 | Every emitted public view, every decoded control-channel message and every sampled pick DOM frame | `rules/phone.test.ts`, `src/session.test.ts`: secret scrambling and sends; P-03 transport pattern |
| PP-022 | Not exercised: idle phone intentionally prevents all-locked state | `rules/game.test.ts`, P-06 all-locked console path |
| PP-030 | Console stills at normal TV size and podium at two sizes, for reviewer inspection | Atlas/host tests and P-04/P-06/P-08; physical 3 m legibility remains a real-TV check |
| PP-031 | Real flip/reveal strip and R5 swap stills for visual review | Host and UI motion tests, P-04/P-06 reduced-motion evidence; no assessed performance or full reduced-motion pass here |
| PP-032 | Every inter-round scoreboard, final podium and exact own phone stats | Host standings/Screen tests, phone tests, P-05 |
| PLAT-033 | Peek Poker through unchanged console module interface and real private transport | Platform conformance and registry tests; other games are outside this slice |

Paths abbreviated `rules/` are under `games/peek-poker/src/`; host tests under
`games/peek-poker/host/`. PP-014–019 and PP-023–029 do not exist in the game specification.

## OQ-043 observations

Review 1 observed seven markers in rows of four and three on 7♦ in round 1 (grid index 3)
and 7♠ in round 5 (index 1). The rank and corner suit remain readable at 1080p; the centre
pip and much of the inverted lower index are covered. Round3-p8 `56` shows eight markers
on A♠ in a 4 + 4 block; its top-left rank/suit and centre rank remain readable. The forced shared picks
cannot measure frequency in natural play. Physical TV readability remains untested.

## Run commands for the reviewer

Launch each only after `uptime` reports one-minute load below 8 and the normal harness memory
gate permits it. The harness owns web 5960 and signal 5961; no separate UAT listener on 5962
is configured by this runner. Do not run these commands in this builder round.

```sh
KAKI_PORT_WEB=5960 KAKI_PORT_SIGNAL=5961 pnpm uat -- P-07-full-match --phones 3 --max-mb 24 --out round3-p3
KAKI_PORT_WEB=5960 KAKI_PORT_SIGNAL=5961 pnpm uat -- P-07-full-match --phones 8 --max-mb 24 --out round3-p8
```

## Existing runs and review findings

Review 1 examined `round1-p3` (8.9 MB) and `round1-p8` (15 MB). Both runs completed;
the review's offline scans found no secrecy leak. These captures predate the merged controller-kit
changes, so they do not establish the current phone appearance. Main is already merged at
`5d8be7e4`; no further merge is needed.

The seven-marker stills in rounds 1 and 5 show 7♦ and 7♠ respectively, not a K.
Rounds 2–4 marker stills were captured before the canvas flip started and are unusable.
Review 1 found the round-1 memorise, podium and picker stills settled; the earlier round-2
note's claims that those three were unusable are superseded by that review.

The idle seat received two distinct cards and the random-fill note every round. It never tied
the best hand in either run, so these runs do not prove random fill is slowest. That rule is
covered by `games/peek-poker/src/rules/game.test.ts` (the random-fill/speed cases around
lines 135, 190 and 204). PP-013 and PP-022 are not exercised by P-07.

The final-round scoreboard incorrectly says “Next round in 5 seconds”. This PP-032 product
follow-up belongs to P-10; P-07 does not fix it. The current tied-hand seat order remains pinned
by the existing assertion pending the integrator's open question.

## Round 3 — review hardening

Every host reveal still, including every seat-marker still, now advances the host clock by
600 ms (beyond duration.slow's 377 ms) and waits for one `.pp-hands li` per phone.
The settling helper cannot observe the canvas requestAnimationFrame flip through
`document.getAnimations()`; that limitation is documented beside the explicit clock advance.

Each received row records the runner's host phase, round and public-view count, plus taps made
so far. Either host or phone tagging a row pre-reveal brings it into validation; boundary or
round disagreements are recorded in `roundSkew` and bounded as described in round 5 below. Every decoded control-channel message is checked against explicit
allowed room, layout, private-view and final picker-start acknowledgement shapes. Recursive
card-code rejection and the original deny patterns remain. Signalling is not captured.

The last seat must receive exactly one all-plain grid per round. Selected-cell counts cannot
exceed taps made so far. DOM checks cover every HAND_NAMES entry, suit glyphs and standalone
card ranks after stripping a seat-badge digit 1–8 directly followed by Player with the same
digit, Player N labels and the Seconds stat. Suit-glyph and face-count checks still apply.
A `view: null` message is allowed only after its envelope keys (`v`, `t`, `rev`, `view`)
are checked; null carries no private data. Phone revealed ranks and suit
marks must match `hand.cards`; TV podium places and scores must match cumulative totals.
A phone-1 still now records two selected cells and enabled Lock in between tapping and locking.
The tie-order assertion remains unchanged.

## Close-out and Requests

Round-3 captures on the merged tree passed runtime assertions and review 2's independent
secrecy checks. Both REPORT.md files now record visual observations and acceptance, qualified
by the final-round scoreboard copy defect (P-10). No product code, tracker, dependency or
lockfile changes; no merge or commit by this builder. Real phones, real TV/HDMI, physical 3 m
readability, touch feel, relay networks, performance, storage, late join, solo, other match
lengths and reduced motion remain outside this run.

Integrator: track final-round copy under P-10 and tied-hand ordering under OQ-051 separately.
Retain the distinction between observed seven/eight-marker legibility and unmeasured natural
frequency. No further capture is requested by this round's brief.

### Round-3 static validation

| Command | One-minute load at launch | Result |
|---|---:|---|
| `pnpm exec eslint uat/slices/P-07-full-match.mjs --max-warnings 0` (first attempt) | 7.38 | Five lint errors; corrected |
| `pnpm exec eslint uat/slices/P-07-full-match.mjs --max-warnings 0` (final) | 6.68 | Pass, zero warnings |
| `node --check uat/slices/P-07-full-match.mjs` | 6.75 | Pass |

All commands finished within ten minutes. The later round-3 runtime and visual review results
are recorded below; these commands alone were static validation.

## Round 4 — bounded reveal-channel skew

This supersedes round 3's strict phase-agreement assertion. Every received control row and
stored host public view now carries a runner `performance.now()` receipt timestamp. Either
pre-reveal tag still selects a row for validation. Round disagreement is recorded and now
bounded as described in round 5 below.
Phone-lagging rows retain the original pre-reveal allow-list. A phone-leading reveal (or later)
row requires a host reveal for the same round received after it, within 500 ms of runner wall clock, not fast-forwarded host game time. The content match
provides the secrecy guarantee. Empty reveal
layouts are allowed; reveal private views must exactly match the receiving seat's own cards,
hand name and points (including the idle seat's random-fill note). Other message types still
pass the original allow-list. No arbitrary payload receives the timing exemption.

`secrecy.json.gz` includes `boundaryRows` entries with seat, round and gap in milliseconds;
round 5 adds the phone receipt and host reveal receipt wall times (`performance.now()`) and
the host reveal clock time (`Date.now()` sampled at public-view emission);
the decoded-message step prints the count for each round. All other round-3 checks remain.

### Round-4 close-out and requests

Only the runner and this note were edited in round 4. Existing uncommitted round-3 edits and
captures were preserved. No product change, commit or runtime/UAT run. The subsequent
round-3 captures and review 2 supersede this round's rerun request.

| Command | One-minute load at launch | Result |
|---|---:|---|
| `pnpm exec eslint uat/slices/P-07-full-match.mjs --max-warnings 0` (first attempt) | 2.52 | Four lint errors; corrected |
| `pnpm exec eslint uat/slices/P-07-full-match.mjs --max-warnings 0` (final) | 3.09 | Pass, zero warnings |
| `node --check uat/slices/P-07-full-match.mjs` | 2.77 | Pass |

Both checks finished within ten minutes. The subsequent runtime results follow.


## Round 3 runs

Both current runs were recorded at `5d8be7e4` on the merged tree, including the controller-kit
change, and reviewed by Claude on 2026-11-18 (review 2). No pick or hand reached the TV or
another phone before reveal in either run. Both REPORT.md files record acceptance with the
known R5 scoreboard copy defect assigned to P-10; no capture was rerun in round 5.

| Run | Evidence size | Boundary and round skew |
|---|---:|---|
| `round3-p3` | 9,364,829 B (9.1 MB) | `boundaryRows: []`; no round skew |
| `round3-p8` | 15,217,948 B (15 MB) | `boundaryRows: []`; two round-skew rows |

The two p8 rows are `received[148]` and `[149]`, seat 1 at 5253.8 ms: phone lobby/round 0,
host memorise/round 1. They contain `{"t":"view","rev":2,"view":null}` and a starting
picker-state, immediately before the first Watch the TV layout (`received[150]`). They carry
no secret. The 500 ms boundary exemption was not exercised in either run; review 2 assessed
it by code inspection.

At eight phones, seven markers share 9♣, K♣, 8♦ and 6♥ in R1, R2, R4 and R5 (4 + 3 block).
Eight share A♠ in R3 (4 + 4 block, still 56). Rank and corner suit stay readable; the centre
pip can be covered. R2 and R5 have three-way best-hand ties: seat 3 also took the best pair
and received +1, while earlier-locking seat 2 received +3. Tied-hand list order remains the
existing seat order pending OQ-051.

## Round 5 — report completion and bounded round skew

Both reports now describe every listed image opened during report completion. The stills
named by review 2 retain its Claude integrator-review credit; other rows identify Codex's
contact-sheet inspection. Detailed reveal images and strips were also opened at full size.

Every received row still passes the content allow-list. A disagreeing round tag is allowed
only when the phone round is 0 (not yet decoded), or differs from the host round by exactly
1; any other disagreement fails with the seat and both rounds. Allowed disagreements remain
recorded in `roundSkew`. Boundary records now retain host clock time beside wall receipt times;
the 500 ms limit is runner wall clock. These harness changes have static validation only;
the existing captures are unchanged and do not demonstrate the new timestamp fields.

### Round-5 validation

| Command | One-minute load at launch | Result |
|---|---:|---|
| `pnpm exec eslint uat/slices/P-07-full-match.mjs --max-warnings 0` | 4.39 | Pass, zero warnings |
| `node --check uat/slices/P-07-full-match.mjs` | 4.69 | Pass |

Both commands finished within ten minutes. No UAT, verify, perf, design lint or product-code
changes in round 5. No commit or push. Only the runner, this note and the two existing reports
changed; existing captures remain intact.
