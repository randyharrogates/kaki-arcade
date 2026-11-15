# Tabao Rush — Game Spec

A real-time co-op cooking game set in a Singapore hawker centre. Players run stalls together:
fetch ingredients, prepare, cook, plate and serve orders before they time out. "Tabao" is
Singlish for takeaway.

Original game. See `../PRD.md` §1 "Originality". Requirements here are part of the PRD and are
tracked in `../TRACEABILITY.md`.

## 1. Core loop

| ID | Pri | Requirement |
|---|---|---|
| TR-001 | MUST | Orders appear on an order board with the dish, its recipe steps as icons, and a patience timer. |
| TR-002 | MUST | Players move freely around the stall floor, carry one item at a time, and interact with the station they face. |
| TR-003 | MUST | A dish is made by taking ingredients through stations in the recipe's order, then plating and delivering to the serving counter. |
| TR-004 | MUST | Correct orders score points plus a speed tip. Expired orders lose points. Wrong dishes are rejected with a clear reason shown. |
| TR-005 | MUST | A round lasts a fixed time (default 3 minutes 30 seconds). The result is 0 to 3 stars against score thresholds. |
| TR-006 | MUST | Score thresholds and order rate scale with the number of players so 1 player and 8 players both face a fair challenge. |
| TR-007 | MUST | Cooking stations run on timers once loaded. Food left too long burns, must be binned, and a burning wok shows a clear warning before it is lost. |
| TR-008 | MUST | Used plates return dirty and must be washed before reuse. |

## 2. Controls

Declared to the controller kit (CTRL-002):

| Part | Action |
|---|---|
| Left stick | Move. 1:1 with the thumb, 8-direction facing. |
| A | Pick up / put down / take from crate. |
| B | Act: chop, stir, wash (hold or tap as the station needs). |
| X | Dash a short distance (cooldown). |
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
| TR-050 | MUST | 8 co-op levels, each with a distinct layout and at least one twist (for example a split kitchen, a moving trolley, a rain-slick floor, a shared single wok). |
| TR-051 | MUST | Co-op mode for 1 to 8 players. |
| TR-052 | MUST | Team versus mode: two teams of up to 4 run mirrored stalls and compete on score. 3 versus arenas. Teams can be uneven; score is normalised per player. |
| TR-053 | MUST | Solo and short-handed play can add bots to reach a chosen team size. Bots do useful work, do not block doorways, and yield to humans. |
| TR-054 | MUST | Level select shows stars earned per level, saved on the host device (DATA-002). |
| TR-055 | MUST | A 60-second playable tutorial on first run teaches move, pick up, act and serve. Skippable. |
| TR-056 | MUST | A player who joins mid-round enters at the next round, and spectates until then. |

## 6. Feel and presentation

| ID | Pri | Requirement |
|---|---|---|
| TR-060 | MUST | Cooks have animated idle, walk, carry-walk, chop, stir/toss, wash and serve actions in 8 facing directions, rendered from rigged 3D models (`../ART-PIPELINE.md`). Feet do not slide against the floor. |
| TR-061 | MUST | Every player is identifiable by colour **and** a seat number marker above their cook. |
| TR-062 | MUST | Game motion follows `../DESIGN.md` §3: no bounce or overshoot, ease-out entrances, a pulse to confirm a served order, nothing tweened while a player is controlling it. |
| TR-063 | SHOULD | Sound effects for every action and one music loop per setting, with separate volume controls on the big screen. |

## 7. Open design points

Tracked in `../OPEN-QUESTIONS.md`: exact star thresholds, order-rate curve, bot difficulty, and
the level list. These are tuning decisions made during M6 with playtests, not requirement gaps.
