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

**OQ-025 · Spacing values beyond 5 to 89 px.** `DESIGN.md` §1 lists 5 · 8 · 13 · 21 · 34 · 55 · 89
and says no other spacing values. The design lint (F-01) also allows 0, the next Fibonacci steps
144 · 233 · 377 for large layout gaps, and 1 · 2 · 3 px plus full pills on corner radii only.
Claude is working to the wider set; say if you want it held strictly to §1. Needed by: first UI
slice.

**OQ-028 · Network spike (S-01): needs Randy's real phones, and a ruling on PERF-010.** On one Mac
with emulated phones the network costs 1 to 4 ms and scripted input reaches the simulation in
17 to 31 ms at the 95th percentile with 8 phones, inside the 50 ms budget. But the one emulated
phone driven by real touch events measured **54 to 59 ms**, because the browser took up to 35 ms
to hand the touch to the page; whether real phones do that is unknown. (1) Randy runs
`spikes/s01-network/README.md` §2 with his iPhone and Android for about 10 minutes and sends the
host table. (2) If real phones are also over, Randy decides: start the PERF-010 clock when the
page receives the touch, or raise the figure, or accept a 120 Hz host step. (3) The HTTPS tunnel
(§3) and the relay run for PERF-011 (§4) are prepared, not run: both are his call. (4) A phone
held at 60 Hz measured about 22 MB an hour through a relay, against the 10 MB an hour assumed
behind the 800 GB limit in NET-004; the send policy for C-04 (on touch plus a 30 Hz tick) roughly
halves it. Needed by: C-04, S-04.

**OQ-026 · Rabakz buzzer rules: Claude's remaining readings.** (4) Solo: only the first answer
scores. (5) The streak counts questions won in a row. (7) Question files are static, so a player
who opens one in a browser can read the answers; accepted for a party game played in one room.
The rest were confirmed in D-048 and D-049. Needed by: R-01.

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
