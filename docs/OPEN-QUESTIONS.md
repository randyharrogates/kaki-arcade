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
memory only, D-081 e). The full checklist is in `docs/slices/C-03-rate-limits.md`. **Cost of the limiter (D-089):** up to
about US$60 a month in duration charges if all 16 limiter shards are kept alive all month
(steady traffic or a deliberate trickle of about 2,300 requests a day); nothing for a few game
nights. A two-minute hold instead of ten costs about US$12 a month and allows about 500
guesses an hour instead of 138. **Before any public deploy:** a staging deploy and probe on the
real edge (shard memory after 590 s idle; the address header for IPv4 and IPv6; the rate-limit
binding), which needs Randy's go. Also for the
shell: anyone with a room code can take all 8 seats; the host needs a kick that blocks
rejoining. Needed by: first deploy (M8).

**OQ-031 · What a host reload keeps mid-match.** PLAT-009 says "A running round is lost; the
room, players and scores so far are restored." Built today (D-086 a): the whole running match
is lost and the room returns to the lobby with everyone seated. For Peek Poker, where a match
is several rounds, "scores so far" could instead mean: lose only the current round and carry
on with the match totals. That needs a checkpoint and resume hook added to the game contract.
Recommendation: keep today's behaviour for v1 and revisit after the first real game night.
Needed by: M4 (Peek Poker playable).

**OQ-033 · A room the pairing server has dropped while a game is running. Closed: Randy confirmed the recommendation on 2026-11-17 (D-099).** After an
outage longer than the ten-minute idle limit, or at the twelve-hour limit, the pairing server
answers "gone". Today the host then ends the room and closes every phone link, although the
links still work. Recommendation (Claude and the reviewer): keep the game and its links,
stop accepting new joins, and offer a new room after the game. Built when the session
is wired to the host: C-10, C-15.

**OQ-032 · Tabao Rush tuning.** The spec leaves star thresholds and the order-rate curve
open (§7). Every number for orders, patience, points, tips, penalties, scaling and stars is
provisional (D-091), worked out by arithmetic, not by play. To settle once a round can be
played on a screen: whether patience and the warning feel right; whether orders at 8 cooks
flood; whether plates are the bottleneck (4 plates cap an 8-cook round near 34 to 46 dishes);
whether three stars is fair at every cook count. Needed by: T-16 (tuning).

**OQ-036 · 2026-11-17 · Lower-detail benchmark needs a real workload (PERF-002).** An idle lobby
holds the display's cadence on any TV, so a lobby benchmark cannot tell a slow TV from a fast
one (C-13 review). Working rule (D-111): the benchmark measures dropped frames under an injected
workload; until the game renderer exists (T-07) there is no representative workload, so "auto"
stays on full detail and the setting can be changed by hand. Randy: is a short off-screen draw
of the busiest scene on the lobby acceptable (a second or two before the room code shows), or
should detail be chosen from the first seconds of the first round instead?

**OQ-037 · 2026-11-17 · DESIGN §4.4 wording for D-122.** Your D-122 lets face buttons shrink
below 110 px on phones narrower than 844 px (never under 89 px). `DESIGN.md` §4.4 still says
faces are "at least the 110 px"; only you edit that section. Suggested wording: "Face buttons
are at least 110 px on phones 844 px wide and wider; narrower phones scale them down with the
width, never below 89 px (D-122)." Needed by: K-04 merge (the code follows D-122 meanwhile).

**OQ-038 · 2026-11-18 · PERF-001 on this Mac's display (S-03a).** PERF-001 asks for a
95th-percentile frame time of at most 16.7 ms on the dev Mac in Chrome at 1080p. In the S-03a
stress runs every renderer, even with under 1 ms of work per frame, measured p95 18.6 to 18.7 ms,
because the browser's animation callbacks here run at 59.9 Hz with jitter on a panel macOS reports
at 75 Hz. So the first real PERF-001 round (T-07) will probably fail on timing jitter, not on our
work. Options: (a) measure frame time as the work per frame plus dropped refreshes, not the raw
callback interval; (b) set the Mac to a 60 Hz mode for measured runs; (c) keep the wording and
accept a fail until run on the TV. Recommended: (a) with (b) for the runs. Only you change the
budget wording. Needed by: T-07.

**OQ-041 · A keyboard or pad player cannot play games with private phone views (raised 2026-11-18 at C-12's merge).**
CTRL-009's extra player sits at the TV, so it has no private screen: in Peek Poker it cannot pick
secretly, and in Rabakz its answers would be seen. Options: allow the local seat only in games
without private views (Tabao Rush), or show its private view on the TV and accept that others can
see it. Built today: the seat joins, but those games do not give it a private view. Needed by: M6.

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

**OQ-034 · Where the performance budgets are enforced, and a simulation budget.** CLAUDE.md
rule 6 and `PERFORMANCE.md` say `pnpm verify` fails when a budget is exceeded. The frame-time
and input-delay budgets need a real browser, a visible window and minutes of running, so the
performance harness (F-08) keeps them in `pnpm perf`, with only a short smoke in verify.
Decided by Claude under D-057 as D-100 (verify keeps the size budgets and the smoke; `pnpm
perf` is a gate before a slice with a game screen closes); Randy may overrule. Still his to
set, not decided: (a) a simulation budget (Codex proposes 95th percentile at most 1.67 ms and
99th at most 3.34 ms per step at eight players; measured today about 0.005 ms, so it would
catch only gross regressions); (b) a game-only allocation guard for Tabao Rush (about 19 KB
per step measured, about 1.1 MB a second); (c) whether frame time is accepted on a production
build or the dev build (the timing hooks exist only in development builds, so a production
run can assess frames but not input delay); (d) which display rate is the reference for
PERF-001: the dev Mac's main display runs at 75 Hz, where a frame is 13.3 ms, not 16.7 ms;
(e) PERF-001 says Chrome and the harness runs Playwright's Chromium: accept that, or run real
Chrome. Needed by: T-07, the first game screen.

**OQ-035 · Rabakz: does the TV show that someone has answered correctly before the reveal?**
RZ-005 says the big screen shows "who has answered". A correct answer ends the question within
0.25 s (RZ-006), and showing "Answered" for it names the winner before the reveal. Decided by
Claude under D-057 as D-101 (d): a correct answerer's seat keeps reading "Thinking" until the
reveal; only a wrong answer changes a seat, to "Locked out". This reads RZ-005 narrowly; only
Randy changes the game spec, so its wording is left as it is until he confirms or overrules.
Needed by: R-03 (built this way), R-04 (the phone's own feedback).

**OQ-039 · Rabakz setup wording in the game spec (raised 2026-11-18 by R-04's review).**
`docs/games/rabakz.md` §3 lists "Setup (leader only) | D-pad and cross … 'The leader is setting
up'", but D-157 (the decided board) has the leader tap settings on the phone and watchers read
"⟨leader⟩ is setting up". Built as D-157. Only Randy changes the spec: update §3 to match D-157, or
say if the D-pad form was meant. Needed by: M6.

**OQ-040 · A TV nobody has touched plays no sound (raised 2026-11-18 by R-07's review).**
Browsers only start audio after a click or key press on that page. If the room is created and the
whole game is run from phones, the TV may never get one, and RZ-033's sounds (and later Tabao
Rush's) stay silent. Options: a one-line "Press any key for sound" note on the TV (a visible change,
so it would go to Randy as an artifact), or accept silence until someone touches the TV. Needed by:
M6.

