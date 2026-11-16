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

**OQ-019 · How the two versus kitchens interact (TR-058).** To be chosen from options on design
board 3. Needed by: board 3.

**OQ-025 · Spacing values beyond 5 to 89 px.** `DESIGN.md` §1 lists 5 · 8 · 13 · 21 · 34 · 55 · 89
and says no other spacing values. The design lint (F-01) also allows 0, the next Fibonacci steps
144 · 233 · 377 for large layout gaps, and 1 · 2 · 3 px plus full pills on corner radii only.
Claude is working to the wider set; say if you want it held strictly to §1. Needed by: first UI
slice.

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
