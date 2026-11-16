# Kaki Arcade — Open Questions

Things only Randy can decide, and assumptions Claude made that he has not confirmed. Claude
adds here instead of guessing. When answered, move the answer to `DECISIONS.md` and delete the
entry.

## Waiting on Randy

**OQ-001 · Names not checked.** Kaki Arcade, Tabao Rush, Peek Poker and Rabakz were not checked for
trademarks or existing games of the same name. Check before public release (M8). Needed by: M8.

**OQ-006 · Music source.** Randy wants effects and music in v1 (D-050). Effects are synthesised
in code. Music needs a source: tracks under a free licence with credit, or loops composed in
code. Claude will put two or three candidates per game to Randy to hear. Needed by: M6.

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

**OQ-029 · Tabao Rush: can dirty plates be thrown?** TR-009 says plates and finished dishes
cannot be thrown; the versus sabo in TR-058 has "dirty plates thrown across". Claude builds to
TR-009 for now (D-078 i) and will treat the sabo as plates arriving in the other kitchen by
the game's own action, not by a player's throw, unless Randy says otherwise. Needed by: T-14.

**OQ-030 · Pairing server deploy: plan, cost and checklist.** Nothing is deployed. Before a
public deploy Randy must: approve the Workers Paid plan (the "1 million Durable Object requests
included" in `ARCHITECTURE.md` §6 is a Paid-plan figure and nothing caps spending: set a
billing alert); set the `ADMISSION_SECRET` secret; apply the limiter's binding and migration;
confirm logging, Logpush, Tail and trace sampling are off; approve the DNS route; and agree
the privacy page wording for the limiter (addresses are hashed with a rotating key and held in
memory only, D-081 e). The full checklist is in `docs/slices/C-03-rate-limits.md`. Also for the
shell: anyone with a room code can take all 8 seats; the host needs a kick that blocks
rejoining. Needed by: first deploy (M8).

**OQ-031 · What a host reload keeps mid-match.** PLAT-009 says "A running round is lost; the
room, players and scores so far are restored." Built today (D-086 a): the whole running match
is lost and the room returns to the lobby with everyone seated. For Peek Poker, where a match
is several rounds, "scores so far" could instead mean: lose only the current round and carry
on with the match totals. That needs a checkpoint and resume hook added to the game contract.
Recommendation: keep today's behaviour for v1 and revisit after the first real game night.
Needed by: M4 (Peek Poker playable).

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
