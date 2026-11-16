# Kaki Arcade — Open Questions

Things only Randy can decide, and assumptions Claude made that he has not confirmed. Claude
adds here instead of guessing. When answered, move the answer to `DECISIONS.md` and delete the
entry.

## Waiting on Randy

**OQ-001 · Names not checked.** Kaki Arcade, Tabao Rush, Peek Poker and Rabakz were not checked for
trademarks or existing games of the same name. Check before public release (M8). Needed by: M8.

**OQ-006 · Sound and music.** TR-063 is SHOULD. Sound effects can be synthesised in code;
music needs a source (a licensed free track, or generated). Who chooses? Needed by: M6.

**OQ-008 · Git LFS for `.blend` files.** GitHub's free LFS allowance is small. If sources grow
past it, options are paying for LFS or keeping sources in Cloudflare R2. Decide when sizes are
known. Needed by: M5.

**OQ-018 · Non-visual code before the gate closes.** PRD NN-6 says no game code until every
board is chosen. To build "all at once", `PLAN.md` Wave 1 starts work that draws nothing (game
rules, protocol, netcode, pairing server, tooling) while boards are still being chosen. Allow
that, or keep NN-6 as written and start those after the gate? Needed by: plan confirmation.

**OQ-019 · How the two versus kitchens interact (TR-058).** To be chosen from options on design
board 3. Needed by: board 3.

**OQ-020 · Proposed values awaiting a yes.** Rabakz: 100 points plus up to 100 for speed; +50
streak bonus from the third correct answer; double-points final round of 1, 3 or 5 questions;
15-second answers (20 for pictures); first press is final; bank of 1,500 with 200 Singapore and
60 picture questions; difficulty offered as Easy / Mixed / Hard. Peek Poker: rounds 6 and 7 of
a 7-round match (7 s and 6 s, three swaps). Tabao Rush: fires from level 5. Needed by: the
issue that builds each; all can be tuned at playtest.

**OQ-021 · The plan itself.** `PLAN.md` and `backlog/` are proposed. No implementation starts
until Randy confirms. Needed by: now.

## Assumptions Claude is working to (say if wrong)

- "Correct movement" means proper walk and action animation in 8 directions with no foot
  sliding (ART-PIPELINE §4), not physics simulation.
- "Strictly no lag" is met by the numeric budgets in `PERFORMANCE.md`; these are targets until
  the M2 spike measures them.
- Bots are for Tabao Rush only. Peek Poker and Rabakz with 1 player are score attacks.
- Eight phones are tested by emulation until Randy's UAT session; he has an iPhone and an
  Android phone and up to 3 players for now, so input delay over real Wi-Fi is not signed off
  before that session.
- Players are in the same room in v1; a phone on mobile data may still join through the relay.
