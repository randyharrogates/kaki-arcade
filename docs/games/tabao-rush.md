# Tabao Rush — Game Spec

A real-time co-op cooking game set in a Singapore hawker centre. Players run stalls together:
fetch ingredients, prepare, cook, plate and serve orders before they time out. "Tabao" is
Singlish for takeaway.

Original game. See `../PRD.md` §1 "Originality". Requirements here are part of the PRD and are
tracked in `../TRACEABILITY.md`.

## 1. Core loop

| ID | Pri | Requirement |
|---|---|---|
| TR-001 | MUST | Orders appear on an order board with the dish, its recipe steps as icons, and a patience timer. Orders are cards at the serving window; there are no customer characters. |
| TR-002 | MUST | Players move freely around the stall floor, carry one item at a time, and interact with the station they face. |
| TR-003 | MUST | A dish is made by taking ingredients through stations in the recipe's order, then plating and delivering to the serving counter. |
| TR-004 | MUST | Correct orders score points plus a speed tip. Expired orders lose points. Wrong dishes are rejected with a clear reason shown. |
| TR-005 | MUST | A round lasts a fixed time (default 3 minutes 30 seconds). The result is 0 to 3 stars against score thresholds. |
| TR-006 | MUST | Score thresholds and order rate scale with the number of players so 1 player and 8 players both face a fair challenge. |
| TR-007 | MUST | Cooking stations run on timers once loaded. Food left too long burns, must be binned, and a burning wok shows a clear warning before it is lost. |
| TR-008 | MUST | Used plates return dirty and must be washed before reuse. |
| TR-009 | MUST | Throwing: a cook can throw the raw or chopped ingredient they hold about 4 tiles in the direction they face, on an arc. A teammate in its path catches it; otherwise it lands on a counter or the floor and can be picked up. Plates and finished dishes cannot be thrown. |
| TR-010 | MUST | Fires: food left burning for 5 more seconds catches fire. A fire spreads to a neighbouring station every 6 seconds. A burning station cannot be used and its food is lost. Any cook puts a fire out by holding circle (the right button) while carrying the extinguisher, which is kept at a fixed spot in the level. Fires happen only in the more difficult levels (TR-050). |

## 2. Controls

Declared to the controller kit (CTRL-002):

| Part | Action |
|---|---|
| Left stick | Move. 1:1 with the thumb, 8-direction facing. |
| Cross (bottom) | Pick up / put down / take from crate. |
| Circle (right) | Act: chop, stir, wash, put out a fire with the extinguisher (hold or tap as the station needs). |
| Square (left) | Dash a short distance (cooldown). |
| Triangle (top) | Throw the held ingredient (TR-009). |
| Start | Pause. |
| Shake (optional) | Wok toss: a shake finishes a wok dish faster. Button B always works instead (CTRL-007). |

| ID | Pri | Requirement |
|---|---|---|
| TR-020 | MUST | Movement responds on the next simulation step after input arrives, with no acceleration smoothing while the stick is held (design motion rule). |
| TR-021 | MUST | The station a player would interact with is highlighted before they press, so a press never surprises. |
| TR-022 | MUST | Players cannot walk through each other; collisions are soft enough that 8 players never deadlock in a corridor. |
| TR-023 | MUST | Players can pass items by placing them on counters. |

## 3. Stations

Ingredient crates · chopping board · wok burner · soup pot · grill · rice cooker · drinks counter ·
plating counter · serving counter · sink and dish rack · bin.

| ID | Pri | Requirement |
|---|---|---|
| TR-030 | MUST | Every station shows its state at a glance from 3 m: empty, working (with progress), done, burning. |
| TR-031 | MUST | Progress and state are readable without colour alone (NFR-A11Y). |

## 4. Dishes (7 at launch)

| Dish | Stations |
|---|---|
| Chicken rice | Rice cooker → chop chicken → chop cucumber → plate |
| Char kway teow | Chop → wok (toss) → plate |
| Satay | Chop → grill (turn once) → plate with cucumber |
| Laksa | Soup pot → add noodles → bowl |
| Rojak | Chop three ingredients → mix → plate |
| Kaya toast set | Grill bread → spread → plate with a drink |
| Kopi / teh | Drinks counter (pull) → cup |

| ID | Pri | Requirement |
|---|---|---|
| TR-040 | MUST | 7 dishes at launch, introduced gradually across levels. |
| TR-041 | MUST | Each dish is recognisable as itself at game size on a TV (checked at the design gate and in UAT). |

## 5. Levels and modes

| ID | Pri | Requirement |
|---|---|---|
| TR-050 | MUST | 8 co-op levels, each with a distinct layout and at least one twist (for example a split kitchen, a moving trolley, a rain-slick floor, a shared single wok). Levels are set across venues of the Singapore hawker world: kopitiam, hawker centre, pasar malam and roadside zi char. Fires (TR-010) appear only from level 5 onwards. |
| TR-051 | MUST | Co-op mode for 1 to 8 players. |
| TR-052 | MUST | Team versus mode: two teams of up to 4 run mirrored kitchens side by side on the one screen and compete on score. Cooks are the same size as in co-op. Each team has a colour theme (PLAT-025) carried by its cooks' aprons and caps, its kitchen trim and its score. 3 versus arenas. Teams can be uneven; score is normalised per player. |
| TR-053 | MUST | Solo and short-handed play can add bots to reach a chosen team size. Bots do useful work, do not block doorways, and yield to humans. |
| TR-054 | MUST | Level select shows stars earned per level, saved on the host device (DATA-002). |
| TR-055 | MUST | A 60-second playable tutorial on first run teaches move, pick up, act and serve. Skippable. |
| TR-056 | MUST | A player who joins mid-round enters at the next round, and spectates until then. |
| TR-057 | MUST | Every level and arena fits the whole 16:9 screen at once. Nothing scrolls and the camera never moves. |
| TR-058 | MUST | The two mirrored kitchens in a versus arena interact: every arena has at least one thing both teams can reach or contest. The four forms, chosen by Randy on board 3 (D-046): a **shared pantry** (a scarce ingredient and plates on the middle counter), **trade across** (each side holds an ingredient the other needs and must throw it over), a **gold order** (a shared hatch where the first team to serve scores double) and **sabo** (dirty plates thrown across land in the other team's sink). An arena uses one or two of them, never all four at once. |

## 6. Feel and presentation

| ID | Pri | Requirement |
|---|---|---|
| TR-060 | MUST | Cooks have animated idle, walk, carry-walk, chop, stir/toss, wash, serve, throw and extinguish actions in 8 facing directions, rendered from rigged 3D models (`../ART-PIPELINE.md`). All cooks share one animated body and differ by head (TR-064). Feet do not slide against the floor. |
| TR-061 | MUST | Every player is identifiable by their own character head, a colour **and** a seat number marker above their cook. In co-op the colour is the player's; in versus it is the team's. |
| TR-062 | MUST | Game motion follows `../DESIGN.md` §3: no bounce or overshoot, ease-out entrances, a pulse to confirm a served order, nothing tweened while a player is controlling it. |
| TR-064 | MUST | At least 8 different cook characters. Before a round each player picks one on their phone from those not yet taken, with a default by seat; no two players have the same character. |
| TR-063 | SHOULD | Sound effects for every action and one music loop per setting, with separate volume controls on the big screen. |

## 7. Open design points

Tracked in `../OPEN-QUESTIONS.md`: exact star thresholds, order-rate curve, bot difficulty, and
the level list. These are tuning decisions made during M6 with playtests, not requirement gaps.

## Rule details (D-080, D-085, D-087; provisional until seen on a screen)

- A crate press gives one raw portion. A station takes an ingredient only when it is that
  ingredient's next step. The order in a recipe applies to each ingredient, not across them.
- Cucumber is chopped in every dish that uses it. Char kway teow's noodles are chopped, then
  tossed in the wok. Rojak's three ingredients are pineapple, turnip and cucumber.
- Laksa: adding noodles to finished broth, in the pot or in a bowl, completes it.
- Mix (rojak) and spread (kaya toast) are 1 s of circle on the plating counter with the food
  on its plate. Adding food undoes a mix.
- Racks hold one kind of container: 4 plates, 2 bowls, 2 cups. A plate holds 4 portions, a
  bowl 2, a cup 1. A container takes only food whose steps are finished.
- The kaya toast set is toast on a plate with a filled cup standing on it. Kopi and teh are
  interchangeable. A cup can be lifted off a plate at a plating counter.
- A served dish's containers come back dirty at the return counter 5 s later and are washed
  at the sink. The bin takes food only and leaves the container clean.
- Serving counters, racks and return counters do not burn. A dish caught in a fire leaves a
  dirty container.
- A wrong dish is refused, never consumed, with one reason shown for 3 s, checked in this
  order: nothing to serve, dirty, burnt, wrong container, not a dish we serve, missing
  ingredient, extra ingredient, missing step, extra step.

## Orders and scoring (D-091; every number provisional until played, OQ-032)

| Dish | Points | Patience |
|---|---|---|
| Kopi or teh | 40 | 40 s |
| Laksa, char kway teow | 80 | 55 s |
| Chicken rice, satay | 100 | 60 s |
| Kaya toast set, rojak | 120 | 75 s |

- Speed tip: up to 20% of the dish's points, in proportion to the patience left. An order
  warns in its last quarter. An expired order loses a quarter of its points; the score never
  goes below zero. No combos. No penalty for orders still open when the round ends.
- Crew factor for 1 to 8 cooks: 1, 1.74, 2.41, 3.03, 3.62, 4.19, 4.74, 5.28. A new order
  arrives every 24 s divided by the factor; the board holds one more card than there are
  cooks, at most 6; star thresholds are the level's solo base (200, 400, 600 by default)
  times the factor. Stars use the average crew over the round.
- An empty board gets its next order within 3 s. The first order opens at once. Which dish
  comes k-th depends only on the seed.
- A cook leaving never removes a card: no new order arrives until the board drains to its
  new size. Players who join mid-round watch and share the team score.
- Serving takes the oldest matching order; a serve beats an expiry on the same step. Kopi
  and teh are one order.

