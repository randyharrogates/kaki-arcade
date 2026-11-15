# Kaki Arcade — Open Questions

Things only Randy can decide, and assumptions Claude made that he has not confirmed. Claude
adds here instead of guessing. When answered, move the answer to `DECISIONS.md` and delete the
entry.

## Waiting on Randy

**OQ-001 · Names not checked.** Kaki Arcade, Tabao Rush and Peek Poker were not checked for
trademarks or existing games of the same name. Check before public release (M8). Needed by: M8.

**OQ-002 · Peek Poker difficulty ramp.** Randy said rounds get harder. Claude proposed: memorise
time falls 20 → 16 → 12 → 10 → 8 seconds, and from round 3 cards visibly swap places after
hiding. Confirm, or say what "harder" should mean. Needed by: M4.

**OQ-003 · Peek Poker points.** Proposed points per hand rank and a +3 bonus for the round's
best hand are in the game spec. Confirm or adjust after a playtest. Needed by: M4.

**OQ-004 · Subdomain.** Proposed `arcade.leeseidon.com`. Also confirm `leeseidon.com` DNS is on
Cloudflare; if it is elsewhere, the deploy plan changes. Needed by: M3 (for HTTPS testing on
real phones), M8 at the latest.

**OQ-005 · Motion on real phones in development.** Testing tilt and shake on a real iPhone
needs HTTPS on the local network. Options: a Cloudflare tunnel to the dev machine, or a
preview deploy. Claude will propose one in M2. Needed by: M2.

**OQ-006 · Sound and music.** TR-063 is SHOULD. Sound effects can be synthesised in code;
music needs a source (a licensed free track, or generated). Who chooses? Needed by: M6.

**OQ-007 · Rounds per Peek Poker match.** Default 5. Should the leader be able to choose 3, 5
or 7? Needed by: M4.

**OQ-008 · Git LFS for `.blend` files.** GitHub's free LFS allowance is small. If sources grow
past it, options are paying for LFS or keeping sources in Cloudflare R2. Decide when sizes are
known. Needed by: M5.

## Assumptions Claude is working to (say if wrong)

- The TV is a TCL Q65 running Google TV. It was written as "hcl q65".
- "Correct movement" means proper walk and action animation in 8 directions with no foot
  sliding (ART-PIPELINE §4), not physics simulation.
- "Strictly no lag" is met by the numeric budgets in `PERFORMANCE.md`; these are targets until
  the M2 spike measures them.
- Bots are for Tabao Rush only. Peek Poker with 1 player is a score attack.
- Players are in the same room in v1; a phone on mobile data may still join through the relay.
