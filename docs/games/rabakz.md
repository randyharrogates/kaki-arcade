# Rabakz — Game Spec

A trivia night game. A question appears on the TV, everyone answers at once on their phone,
and fast correct answers score most. "Rabak" is Singlish for wild or out of control.

Added to v1 by Randy on 2026-11-16 (D-034, D-035). Requirements here are part of the PRD and
are tracked in `../TRACEABILITY.md`. Point values, counts and sizes were proposed by Claude and
accepted by Randy on 2026-11-16 (D-039); all can be tuned at playtest.

No betting, no wagering of points, no real-money element.

## 1. Rules

| ID | Pri | Requirement |
|---|---|---|
| RZ-001 | MUST | A match is a fixed number of questions chosen by the leader: **10, 30 or 50** (default 10). The highest total score wins. |
| RZ-002 | MUST | Three question types are mixed in a match: **multiple choice** (four options), **true or false** (two options) and **picture** (an image on the TV with four options). There is no type-the-answer question. |
| RZ-003 | MUST | The question and its options are shown on the big screen. Each phone shows one large button per option, carrying the same letter, shape and colour as the option on the TV, and the option's text. |
| RZ-004 | MUST | All players answer at the same time within the answer time (default 15 seconds; 20 seconds for a picture question). A player's first press is their answer and cannot be changed. |
| RZ-005 | MUST | Until the reveal, the big screen shows only **who** has answered (seat markers), never what they chose, and no answer is sent to another phone. |
| RZ-006 | MUST | A question ends when every player has answered or the time runs out. The reveal shows the correct option, how many players chose each option, and the points each player gained. |
| RZ-007 | MUST | Scoring: a correct answer scores **100 points plus a speed bonus of up to 100**, falling evenly from 100 at the start of the answer time to 0 at the end. A wrong answer or no answer scores 0. Scores never go down. |
| RZ-008 | MUST | Streak bonus: from a player's third correct answer in a row, each correct answer scores **50 extra** until they miss one. The phone and the big screen show the streak. |
| RZ-009 | MUST | Final round: the last 1 question of a 10-question match, the last 3 of 30 and the last 5 of 50 score **double**, announced on the big screen before they start. |
| RZ-010 | MUST | Before a match the leader chooses categories: any set of the bank's categories, or Mixed (default). |
| RZ-011 | MUST | Before a match the leader chooses difficulty: Easy, Mixed (default) or Hard. Easy is suitable for children. |
| RZ-012 | MUST | Free-for-all for 1 to 8 players, and a team mode with two teams (PLAT-025). A team's score for a question is the **average** of its members' points, so uneven teams are fair. Individual scores are still shown. |
| RZ-013 | MUST | With 1 player the match is a score attack against a personal best saved on the host device, kept separately for each match length. |
| RZ-014 | MUST | A player who joins mid-match enters at the next question with a score of 0. |
| RZ-015 | MUST | No question repeats within a match. Questions recently seen on this host device are avoided until the pool for the chosen categories and difficulty runs out (DATA-002). |
| RZ-016 | MUST | Players level on points at the end share the placing. |

## 2. Question bank

| ID | Pri | Requirement |
|---|---|---|
| RZ-020 | MUST | The question bank ships with the game. Nothing is fetched during a match: every question and image for the match is loaded before the first question. A match's questions and images are at most 2 MB transferred. |
| RZ-021 | MUST | Sources: the Open Trivia Database (CC BY-SA 4.0) for general knowledge, credited on the credits page with our adapted bank offered under the same licence; and a Singapore pack written by Claude, each question carrying a source note and spot-checked by Randy before release. No question is generated at play time. |
| RZ-022 | MUST | Every question has: category, difficulty, type, text, options, the correct option and a source. A build script validates the bank and rejects any question whose text is over 120 characters or whose options are over 40 characters, so everything fits the TV at reading size. |
| RZ-023 | MUST | The bank is screened for a public, all-ages audience: no sexual, graphic, hateful or otherwise unsuitable questions. |
| RZ-024 | MUST | Launch size: at least **1,500** questions in total, including at least **200** in the Singapore pack and at least **60** picture questions. |
| RZ-025 | MUST | Picture-question images are original (rendered or generated for this game) or openly licensed with credit, and are loaded before the match. |
| RZ-026 | MUST | The order of options is shuffled from the match seed, and the correct option is equally likely in every position. |

## 3. Controls

Declared to the controller kit (CTRL-002):

| Phase | Phone shows |
|---|---|
| Setup (leader only) | D-pad and **A** to choose length, categories, difficulty and teams. Other phones show "The leader is setting up". |
| Question | Four answer buttons on **A / B / X / Y** (two for true or false), each with its letter, shape, colour and option text. After pressing: "Locked in" and the chosen option. |
| Reveal | Right or wrong, points gained, current streak and total. |
| Scoreboard / end | The player's placing and total. Leader: **A** to continue. **Start** pauses at any time. |

## 4. Presentation

| ID | Pri | Requirement |
|---|---|---|
| RZ-030 | MUST | The question and options are readable from 3 m (NFR-A11Y), and options differ by letter and shape as well as colour. |
| RZ-031 | MUST | The answer timer is readable without colour alone. Motion follows `../DESIGN.md` §3: the reveal uses a mask, scores count up and stop with no overshoot, and a correct answer pulses once. |
| RZ-032 | MUST | A scoreboard is shown after every 5 questions and a podium at the end; in team mode both show team totals first. |
| RZ-033 | SHOULD | Sound effects for lock-in, time running out, correct and wrong, with the shared volume controls. |
| RZ-034 | MUST | Players appear as seat number, colour and nickname. Cook characters are not used in this game. |

## 5. Why this game is in v1

It is the simplest of the three games and uses the controller's face buttons and private panel
with no art pipeline, so it is a third and cheap proof of the game interface (PLAT-030 to
PLAT-033) and a game the whole room can play in the first minute.
