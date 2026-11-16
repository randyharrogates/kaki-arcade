# P-01 and P-02 — Peek Poker pure rules

Branch: issue/P-01-peek-poker-rules. Original build committed; review-fix round 1 remains in the working tree as requested.

## Goal and acceptance

Implement PP-001 to PP-007, PP-009 to PP-013 and PP-022: seeded deals, step timers,
visible swap descriptions, private tap selection, lock order, random completion, five-card
ranking and points, cumulative matches, waiting joiners and solo persistence.

Acceptance: requirement-labelled unit tests, independent evaluator reference, seeded match
invariants and conformance at one and eight players. Save test and verify logs as evidence.
No rendering, assets, sound, controller styling or visual UAT is in scope.

## Implementation and secrecy

`games/peek-poker/src/index.ts` exports `peekPoker`, the evaluator and public types.
`rules/cards.ts`, `evaluator.ts`, `state.ts`, `round.ts`, `game.ts` and `views.ts` split dealing,
ranking, state, phase transitions, input/membership and payloads. `invariant.ts` checks indexed
accesses. Simulation counts steps, uses the sim-core generator, clones it only when drawing,
and shares unchanged arrays and objects. The idle step creates one shallow state object.
Lock order is a monotonic round counter; actions are processed in received order and repeated
player/control actions are ignored. Once locked, a later pick cannot change the selection.

Face codes are public during memorise and reveal, so `secrets()` does not declare them then.
After the flip it declares all 16 currently withheld grid faces with owner null; picks are
owned secrets until reveal. This applies the interface's disclosure rule to the current
screen: declarations stop while faces are given away, and resume when the rules hide them.
It does not claim to erase players' memories or prevent them reconstructing visible swaps.
`publicView` withholds all faces throughout swaps/picking and reveals movement endpoints only.
The historical-knowledge interpretation (never declaring a previously shown card again) would
leave no grid secrets to check in this memory game; this implementation deliberately checks
current payload secrecy as requested in the brief.

`scrambleSecrets()` rotates the hidden grid by a nonzero salt-derived offset and shifts every
other player's selected indices by a nonzero offset, preserving their count and lock order.
It keeps the viewer's own picks, public shared cards, scores and all public movement data.
It changes every declared hidden value, including for salt 0 and multiples of 16. It never
changes face-up cards. Public, results and permitted phone views stay identical.

## Requests

D-069 resolves the rule questions: only an explicit earliest best-hand lock earns +3;
other best hands earn +1 with no seat tie-break; pick time is fixed at 20 seconds;
swaps last two seconds in sequence; reveal lasts eight seconds then standings last five;
pre-first-step joins play round one and later joins wait; face-down mappings remain secret;
solo bests require a completed match that never admitted another player.

Only integration work remains open: Claude records D-069 in the shared game spec/trackers,
reviews this fix round, and runs visual UAT when P-03 to P-05 supply rendering. No dependency
or contract changes are requested. Standard poker includes the ace-low A2345 straight;
equal strengths compare equal regardless of suit.

## Close-out

All production and test code is under `games/peek-poker/src/`. No dependencies were added.
The original build is committed; this review fix is committed. Nothing was pushed, deployed or rendered. Independent review remains with Claude.

Test names below omit the repeated requirement-ID prefix; those prefixes are present in code.
Every row is evidenced by [tests.txt](../../uat/evidence/P-01-peek-poker-rules/tests.txt),
[kit.txt](../../uat/evidence/P-01-peek-poker-rules/kit.txt) and
[verify.txt](../../uat/evidence/P-01-peek-poker-rules/verify.txt).

| Requirement | Code concern | Named test |
| --- | --- | --- |
| PP-001 | game / views | leader settings offer only 3, 5, 7 rounds and default to 5; %i rounds sum scores and rank ties equally |
| PP-002 | cards / round | deals 16 plus 3 unique standard cards deterministically each round |
| PP-003 | game / views | exact 20-second memorise window and shared faces throughout; pause hides memorisation and resumes exactly |
| PP-004 | views / round | exact 20-second memorise window and shared faces throughout; exact ramp and sequential twists in %i rounds |
| PP-005 | game / views | tap selects/deselects, limits to two; players may share both cards; lock before pick in one step cannot alter a locked selection |
| PP-006 | game | tap selects/deselects, limits to two; players may share both cards |
| PP-007 | evaluator | exhaustive rank multisets and flush variants agree with reference; all five-card subsets of seeded seven-card sets match brute force |
| PP-009 | evaluator / round | tied best hands award +3 to first lock and +1 to others; bonus compares kickers, not only hand category; random fills are slowest |
| PP-010 | round | timeout preserves existing picks and fills only missing distinct positions |
| PP-011 | round | exact ramp and sequential twists in %i rounds |
| PP-012 | game / views | solo persists a completed personal best and never overwrites it early; leaving including leader and everyone in %s never scores or throws |
| PP-013 | game | waiting newcomer starts at zero and first plays next round; join in %s preserves scores and safely waits |
| PP-022 | game | lock before pick in one step cannot alter a locked selection; disconnected players do not block connected players locking in |

Review round 1 implements all seven review items. PP-007 now checks the exact two grid
cards plus shared cards and their evaluation; regressions cover the seed-7 unlocked tie,
solo locked/unlocked/random bonuses, waiting joiner all-lock exclusion, scoreboard timing,
pre-first-step admission, and private revision stability. Long seeded invariants retain eight
seven-round eight-player matches, every-step checks, and the original 30-second timeout.
Conformance scenarios run longer with the fixed pick duration; no check or timeout changed.

Final verification and current kit timings: see regenerated
[REPORT.md](../../uat/evidence/P-01-peek-poker-rules/REPORT.md),
[tests.txt](../../uat/evidence/P-01-peek-poker-rules/tests.txt),
[kit.txt](../../uat/evidence/P-01-peek-poker-rules/kit.txt) and
[verify.txt](../../uat/evidence/P-01-peek-poker-rules/verify.txt).
