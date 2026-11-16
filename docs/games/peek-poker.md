# Peek Poker — Game Spec

A memory game scored with poker hands. Cards are shown, then hidden; players pick from memory.
Rules agreed with Randy on 2026-11-15. Requirements here are part of the PRD and are tracked in
`../TRACEABILITY.md`.

No betting, no chips, no real-money element.

## 1. Rules

| ID | Pri | Requirement |
|---|---|---|
| PP-001 | MUST | A match is several rounds: the leader chooses 3, 5 or 7 (default 5). Scores from every round are added up and the highest total wins the match. |
| PP-002 | MUST | Each round deals from one shuffled standard 52-card deck: **16 cards** into a 4 × 4 grid and **3 shared cards**. |
| PP-003 | MUST | The 16 grid cards are shown face up on the big screen for the memorise time (**20 seconds** in round 1), then all flip face down. |
| PP-004 | MUST | The 3 shared cards stay face up for the whole round. |
| PP-005 | MUST | Each player **secretly picks 2 grid positions on their own phone** within the pick time (default 20 seconds). The phone shows the face-down 4 × 4 grid; nothing on the big screen reveals who picked what until the reveal. |
| PP-006 | MUST | **Two or more players may pick the same card.** |
| PP-007 | MUST | A player's hand is their 2 picked cards plus the 3 shared cards. Hands are ranked by standard poker rankings. |
| PP-008 | MUST | At the reveal, the grid flips face up, each player's picks are marked with their colour and seat number, and hands are shown ranked best to worst. |
| PP-009 | MUST | Round scoring: points by hand rank (table below) plus a bonus for the best hand of the round. Speed counts: among players tied for the best hand, the first to lock in gets +3 and the others +1. A pick filled in at random (PP-010) counts as the slowest. |
| PP-010 | MUST | A player who has not picked 2 cards when time runs out has the missing picks chosen at random. |
| PP-011 | MUST | Difficulty rises each round (table below). |
| PP-012 | MUST | 1 to 8 players. With 1 player the match is a score attack against a personal best saved on the host device. |
| PP-013 | MUST | A player who joins mid-match enters at the next round with a score of 0. |

### Hand points (confirmed by Randy 2026-11-16, D-025)

| Hand | Points |
|---|---|
| High card | 1 |
| Pair | 2 |
| Two pair | 3 |
| Three of a kind | 4 |
| Straight | 5 |
| Flush | 6 |
| Full house | 8 |
| Four of a kind | 10 |
| Straight flush | 13 |
| Best hand of the round | +3 to the fastest, +1 to others tied |

### Difficulty by round (confirmed by Randy 2026-11-16, D-025)

A 3-round match uses rows 1, 3 and 5. A 7-round match uses rows 1 to 5 and then rows 6 and 7,
proposed by Claude and accepted by Randy (D-039).

| Round | Memorise time | Twist after the cards hide |
|---|---|---|
| 1 | 20 s | None |
| 2 | 16 s | None |
| 3 | 12 s | Two cards visibly swap places |
| 4 | 10 s | Two rows visibly swap places |
| 5 | 8 s | Two swaps in sequence |
| 6 | 7 s | Three swaps in sequence |
| 7 | 6 s | Three swaps in sequence |

Swaps are shown as clear, slow movements on the big screen so the challenge is tracking, not
eyesight.

## 2. Controls

Declared to the controller kit (CTRL-002):

| Phase | Phone shows |
|---|---|
| Memorise | "Watch the TV" and the countdown. No controls. |
| Pick | Private display panel with a face-down 4 × 4 grid. Tap to select 2, tap again to deselect, then the **Lock in** button (board 4, 4B; D-062: no D-pad cursor, which does not fit beside the grid at the size floors). |
| Reveal | The player's own hand, its name and points. |

| ID | Pri | Requirement |
|---|---|---|
| PP-020 | MUST | Picks are never sent to other phones or drawn on the big screen before the reveal. |
| PP-021 | MUST | The big screen shows who has locked in (seat markers only), not what they picked. |
| PP-022 | MUST | When everyone has locked in, the round proceeds without waiting for the timer. |

## 3. Presentation

| ID | Pri | Requirement |
|---|---|---|
| PP-030 | MUST | Cards are large enough on a TV to read rank and suit from 3 m, and suits differ by shape and colour. |
| PP-031 | MUST | Card flips, swaps and the reveal follow `../DESIGN.md` §3 (masks for reveals, arcs for moving cards, no bounce). |
| PP-032 | MUST | A running scoreboard is visible between rounds and a final podium at match end. |

## 4. Why this game is second

It is turn-based with private information on phones, the opposite of Tabao Rush. Building it
first proves the game interface (PLAT-030 to PLAT-033), the private display panel (CTRL-003)
and the whole room flow with a small ruleset before the large game starts.
