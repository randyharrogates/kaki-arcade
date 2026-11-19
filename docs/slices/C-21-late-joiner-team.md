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
  Requests are remembered by seat token and serialised, so simultaneous
  arrivals use the game state after each preceding join. Assignment callbacks
  run after normal sync/output, allowing synchronous room notifications.
- The host passes assignment to its existing room `team` event, through the
  browser session adapter. Admission reads `midGameJoin` and `joinTeam` from
  the loaded module after start; no metadata field or game contract changes.
- Rabakz implements the deterministic team rule. Its existing next-question
  join behaviour and scoring remain in use. A late team member's private
  view names Red or Blue throughout play, reveal and results, without adding
  the R-15 header badge.
- Unit tests cover all placement branches, a join during a question and just
  before reveal, zero score, next-question scoring, request deduplication,
  synchronous multiple arrivals, adapter assignment and host admission.
  The conformance kit includes an explicit running team newcomer scenario.
- R-08 now expects team newcomers to enter and play. The new four-phone UAT
  slice captures the join, phone team name, next-question answer and team
  scoreboard. No DOM test file was changed.

## Checks and evidence

Final checks passed: 340 Rabakz tests; 622 platform session and apps/web tests;
TypeScript build followed by `--clean`; ESLint for games/rabakz, uat/slices,
apps/web and platform session; design lint; `git diff --check`.
See `uat/evidence/C-21-late-joiner-team/` for the final automated check logs.
The round-1 brief prohibits full verify, UAT execution and committing; these
are intentionally left for the integrator. No browser evidence is claimed.

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

Implementation is ready for integrator review after the recorded checks.
The issue remains open pending browser UAT and independent review. No shared
tracker, contract, lockfile or dependency was changed. No commit or push.

## Requests

Integrator: run and inspect four-phone C-21 UAT and eight-phone R-08 teams
regression; run full verification and the deliberately excluded DOM suites;
commit and update shared trackers after review. No changed DOM test files
need a special rerun.
