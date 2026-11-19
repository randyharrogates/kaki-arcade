# C-21 — Late joiner's team

Requirements: RZ-014, PLAT-025, PLAT-008. Decisions: D-234, D-285.
Branch: `issue/C-21-late-joiner-team`. Base contract: `6c73ff52`.

## Goal and acceptance

Admit a newcomer to a running Rabakz team match, assign the smaller team
(equal size: lower team total; equal total: Red), and enable answers from the
next question at zero points. The phone names its team. Other team games
without `joinTeam` continue to hold newcomers for the lobby.

## Implementation

- Session exposes optional `assignTeam(seat, team)`. An unassigned newcomer
  stays out of game membership until the room reports its assigned team.
  Requests are serialised and retried on the next sync if the team event
  has not landed, so simultaneous arrivals use the game state after each
  preceding join. Assignment callbacks run after normal sync/output, allowing
  synchronous room notifications.
- The host passes assignment to its existing room `team` event, through the
  browser session adapter. Admission reads `midGameJoin` and `joinTeam` from
  the loaded module after start; no metadata field or game contract changes.
- Rabakz implements the deterministic team rule. Its existing next-question
  join behaviour and scoring remain in use. A late team member's private
  view names Red or Blue throughout play, reveal and results, without adding
  the R-15 header badge.
- Unit tests cover all placement branches, a join during a question and just
  before reveal, zero score, next-question scoring, unlanded request retries,
  synchronous multiple arrivals, adapter assignment and host admission.
  The conformance kit includes an explicit running team newcomer scenario.
- R-08 now expects team newcomers to enter and play. The new four-phone UAT
  slice captures the join, phone team name, next-question answer and team
  scoreboard. The phone DOM suite now includes a late team reveal stress case
  with a three-line answer at 21 px, above the wake reminder at 844 × 390.

## Checks and evidence

The integrator's round2 four-phone UAT passed; the independent review opened
all eight stills in `uat/evidence/C-21-late-joiner-team/round2/`. It confirmed
next-question entry, Blue assignment, phone team copy and settled scoreboard
totals. Integrator changes `65645c78` advanced the paused clock to apply the
answer and `ba202ac4` settled the scoreboard count-up. Main was merged at
`2e52490d`.

Review 1 identified that round2 lacked a Locked in still and froze the reveal
count-up; its reveal pairs were duplicates. This round fixes the script with
16 ms steps through answer application, an answered-phone still, and one
settled reveal still per device. These revised stills have not been run here.
This round also exercises `joinTeam` in conformance, documents the interface,
retries unlanded team requests, adds their regression test and adds the phone
reveal DOM stress check (its option is promoted from the shipped note size to
21 px body text for this stress fixture).

This round's checks passed, one at a time with a ten-minute cap per check:

- Non-DOM Vitest for platform, Rabakz and apps/web: 120 files passed;
  1,992 tests passed, 1 skipped (76.21 s). DOM, layout-fixtures and team-polish
  suites were excluded as requested.
- `tsc -b`: passed, including a rerun after the UAT accessor adjustment;
  no files were emitted outside dist folders.
- ESLint over platform, Rabakz, apps/web and the C-21 UAT script: passed with
  zero warnings after fixing the accessor's unsafe Reflect assignment.
- `lint:design`: passed (521 files scanned).
- `git diff --check`: passed.

No DOM tests, UAT, full verify, install or commit was run this round.

## UAT script

With content built and the local stack using web 5290 / signal 5291:

```sh
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false KAKI_PORT_WEB=5290 KAKI_PORT_SIGNAL=5291 KAKI_PORT_UAT=5292 pnpm uat -- C-21-late-joiner-team --phones 4
```

Start three phones in teams, join a fourth during question one, inspect its
team and waiting copy, answer question two from that phone, and inspect the
five-question scoreboard. Review every resulting still before acceptance.
R-08 regression: `R08_TEAMS=1` with `--phones 8`.

## Close-out

Review 1's Should fix items 1–6, 8 and 9 are addressed in this round; copy
item 7 is deferred to R-15 as requested. Round2 UAT passed before this round,
with integrator changes `65645c78` and `ba202ac4` and main merge `2e52490d`.
Closure still requires the integrator's merged-tree R-08 teams regression,
full verification, the excluded DOM suites and visual review of revised UAT.
No shared tracker, lockfile or dependency was changed. This round does not
commit, run UAT or run full verification.

## Requests

Integrator: run and inspect the revised four-phone C-21 UAT and eight-phone
R-08 teams regression; run full verification and the excluded DOM suites,
including `apps/web/src/rabakz-phone.dom.test.ts` (new late-team-reveal case)
and `apps/web/src/late-join.dom.test.ts`; update shared trackers after review.
