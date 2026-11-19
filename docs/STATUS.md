# Kaki Arcade — Status

What actually works today. Kept honest: if it has not been seen working in UAT, it is not
listed as working. Updated in the same slice as any change (`WORKFLOW.md` step 5).

**Last updated:** 2026-11-16 · **Milestone:** M0 complete. **Build started 2026-11-16 on Randy's go (D-043):** Wave 0 running. Design gate: boards 0, 0B, 1A, 2 and 2B done; 1, 3, 4 and 5 to come.

## Works
- **Sound on a TV nobody has touched (C-24, merged 2026-11-19; RZ-033 and TR-063 in progress; D-229, D-294).** Host a game on the landing starts the TV's sound inside the click and opens the lobby without reloading the page; Back and Host a game again keep one sound engine and the same or a new room as expected. Opened directly, the lobby's hint row reads "Click or press a key on this screen to turn on sound" until sound runs, and the paused Effects and Music rows say "Sound is off" in place of their numbers and bars. The first click or key on the TV turns sound on; the panel and its buttons do not move. Middle-clicks and modifier-clicks on the link open normally; Enter and Space work as before. Evidence: `uat/evidence/C-24-sound-unlock/round5/`. **Not proven:** a real TV browser's autoplay block (this Chromium does not block), a remote's OK key, and sound after the TV sleeps (X-09). A pad-only TV needs one click or key.
- **Cook walk gait (A-02d, merged 2026-11-19; TR-060 in progress; D-293).** Walking and carrying cooks now rock sideways once per stride with a small bob, so a walk reads as a walk from every side, including from behind. Carried items stay steady in the hands. Only the two walk animations were re-rendered. A walk check on the rendered frames covers the feet, the hands, sideways head movement and the difference between opposite frames in all eight facings. The cook sheets grow by 62 KB (1.8 MB decoded) and stay within the round budget. The TV draws cooks from these sheets (T-07). Evidence: uat/evidence/A-02d-cook-gait/, board https://claude.ai/artifact/7rXBPszMUUozLTHPRgprtz.
- **Level backgrounds (A-06, merged 2026-11-19; TR-050, TR-057 in progress; D-281, D-292): art only.** The kopitiam first shift and the zi char test kitchen are baked in Blender from the level catalogue: floor, walls, counters and A-05's station bodies, in three looks (Terrazzo, Tile, Golden). Cooks, carried items, the extinguisher and food are not baked; the extinguisher's tile is a counter with an inset steel top; crates stand on the floor. Each level exports its collision map (walkable tiles equal the game's) and screen anchors; the whole kitchen is inside the 55 px margins and clear of the HUD cards. Default Terrazzo: 87 KB and 124 KB sent at full detail; the level rounds are 2.59 and 2.63 MB of 8 MB and 65.6 MB of 256 MB decoded (after A-02d). Not yet: the TV still draws its placeholder floor (T-17); Randy has not chosen the look (board https://claude.ai/artifact/P83XXGhgt7WvVbrHAuzzYX); no 3 m check; Golden differs from Terrazzo only by a 3 px counter band; baked plates on racks (OQ-055); the other six levels and the arenas are A-06b. Evidence uat/evidence/A-06-level-backgrounds/.
- **Rabakz final-round card (R-16, merged 2026-11-19; RZ-009, RZ-030; D-217, D-290).** Before the double-points block (question 10 of 10, 28 of 30, 46 of 50) the TV shows a 4 s card: "Final round" at 144 px, "The last question scores double" (or "The last 3 / 5 questions score double") at 55 px and ×2 in mono, on a 1.618 : 1 panel. It crossfades in and out at slow over the previous screen, which stays drawn underneath; reduced motion drops the fade and keeps the 4 s. The question clock starts in full after the card. Each final question carries a 34 px "Double points" chip in its header, through its reveal. Every active phone, the free-for-all joiner included, shows "Final round · Double points" during the card; a teams joiner stays on "Waiting for the lobby". Every Rabakz screen change now draws the incoming screen above the outgoing one. Evidence: `uat/evidence/R-08-full-match/r16-solo4/`, `r16-ffa4/`, `r16-teams4/`; perf diagnostic, 8 phones: median 16.7, p95 16.7, max 33.4 ms. Not proven: the 30- and 50-question cards on the console (unit and DOM tests only), real phones and TV, the 3 m reading.
- **Detail benchmark in Start (C-25, merged 2026-11-19; PERF-002, PERF-023 in progress; D-289).** A game's host screen may provide a benchmark scene. On Auto, the first Start of that game on a TV draws it off-screen for about a second behind "Starting…" and picks Full or Lower (D-111, D-113); too few frames in time gives Lower. The TV remembers the result per game until its browser, screen size or pixel ratio changes; an invalid sample is never remembered. On Lower, the half-size atlases are ready before the round starts. Proven with a development fixture: Full about 1.1 s, Lower when drawing is slowed, 0 ms when cached, explicit or sceneless (`uat/evidence/C-25-detail-benchmark/round3/`). Not yet: no real game has a scene, so Auto means Full until T-17; no TV run; no settings screen for Full or Lower (C-13 part 2).
- **Served dishes on the TV (T-18, merged 2026-11-19; TR-040, TR-041 in progress; D-286).** The TV builds every dish from its container and portion layers: all seven dishes show on counters, Serve and the floor at 1920 × 1080 and 1280 × 720, at full and half detail, with layers in the same place at both. Kaya toast and kopi/teh show the drink actually served. Partial plates show only what is on them. The draw pool is sized from the manifest (5,160 sprites, was 8,744) and only live items update; a quiet 8-cook run held every frame within 17.7 ms. Not yet: a held dish reads poorly (the cook's cap and hand hide most of it), and the 3 m TV check. Evidence `uat/evidence/T-18-served-dishes/round3/`, `perf-8b/`.
- **Recipe step icons (A-11, merged 2026-11-19; TR-001 in progress, D-284): art only.** Eleven one-colour glyphs (chop, wok, pot, grill, rice, drinks, mix, spread, plate, bowl, cup) drawn by a Blender script in print red-brown #8E2A18, 34 px at 1080p (half detail 17 px drawn at 2×), packed with the Tabao Rush round: 2,538 B / 43,248 B decoded full, 1,608 B / 10,812 B half; Tabao Rush art is 2.43 MB of the 8 MB budget and 55.5 MB of 256 MB decoded. Every glyph pair differs on at least 143 of 1,156 pixels (128 at half; the gate is 70, with shifted-duplicate checks). Not yet: the TV still shows T-07's step words until T-07 or T-18 draws these; no 3 m check; light cards only (1.87:1 on a dark ground); spread is the weakest glyph. Evidence `uat/evidence/A-11-step-icons/rendered/`.
- **TV seat watches private games (C-27, merged 2026-11-19; CTRL-009, PLAT-006, PLAT-021, PLAT-024; D-230, D-231, D-282).** In Peek Poker and Rabakz the TV's keyboard or pad seat watches: marked "Watching", no hand, scores or results; Tabao Rush still lets it play. With only the TV seat a watch game reads "Waiting for a phone", drops "Enter: start", and the band says "⟨game⟩ needs a phone. Go back and scan the code in the lobby to join." A connected phone always leads (earliest seated); the TV seat leads only while no phone is connected, after the 10 s grace; TV keys work under a phone leader. Evidence `uat/evidence/C-27-local-seat/round2/`. Not proven by a still: Rabakz watching, a lone TV seat starting Tabao Rush, a real game pad.
- **Station art (A-05, merged 2026-11-19; TR-030, TR-031 and TR-010 in progress, D-278, D-279): art only.** Tabao Rush's 12 station kinds and an ingredient crate are rendered in Blender and packed: 206.3 KB and 1.17 MB decoded at full size, 56.6 KB at half. Tabao Rush art is now 2.43 MB of the 8 MB level budget and 55.4 MB of 256 MB decoded. Each state the rules can reach has a shape on a 42 px plaque: an empty tray; an hourglass over an eight-cell bar, its cells unlit gold #E0A63A with empty cells marked in ink; a tick; a warning triangle with rising smoke over burnt food; and a flame for on fire, with A-07's fire low on the station. The bin shows only empty and on fire; serving, rack and return show only empty. **Not yet:** the TV still draws T-07's placeholder cue, not this sprite. No person has checked it at 3 m on a TV, including the bar in greyscale. Kind recognition in a real level waits on A-06. Plates are baked into the rack, plating and return bodies. Evidence: `uat/evidence/A-05-stations/rendered/`.
- **PERF-040 assessment and reference-browser options (F-10, merged 2026-11-19; PERF-040 and PERF-001 in progress, D-277).** Bare `pnpm perf` now times each game's eight-player step over at least 10,000 samples on successive seeds. It blocks on a fail, on too few samples and on detected contention. The round-2 run on this branch was under heavy contention (load about 20 on 8 cores), so it is "not assessed". The figures were Peek Poker p99 0.0031 ms, Rabakz 0.0048 ms and Tabao Rush 0.0406 ms, all far under 3.34 ms, on default settings. `pnpm perf -- <scenario> --build production --host-browser chrome` runs branded Chrome. **Not proven:** - PERF-040 has not passed on a quiet machine. - PERF-001 has never been assessed. The guard gives "not assessed" whenever the built-in panel is online, because it reports no rate. Randy must close the lid and set the external display or TV to 60 Hz before a milestone run. - No Chrome launch has been run here.
- **Rabakz full match in the console (R-08, merged 2026-11-18; RZ-001–RZ-016, RZ-032, RZ-034, PLAT-033).** A default ten-question match runs end to end on the TV with 1 phone, 8 phones, and 8 phones in teams. Covered: first-correct scoring, the third-win streak bonus, a wrong answer locking out one player while another wins, leader skip, the 30 s idle reveal, a scoreboard after five, the podium (team totals first in teams), and the solo new best. A phone joining mid-match waits, then enters at the next question with 0 (free-for-all); in teams it waits for the lobby (D-202). A phone reloaded mid-question keeps its seat and score. No other player's nickname reaches a phone's private view. Evidence: `uat/evidence/R-08-full-match/round2-solo/`, `round2-ffa/`, `round2-teams/`. **Not working yet:** team colours and names during play (R-15), the streak on the TV (R-18, in progress). **Not proven:** picture questions, sound, real phones and TV, reading distance.
- **Peek Poker full match in the console (P-07, merged 2026-11-18; PP-001–PP-011, PP-020, PP-021, PP-031, PP-032, PLAT-033).** A default five-round match runs end to end at 3 and 8 phones: lobby, picker, Start, five rounds of memorise, swaps, pick, reveal and scoreboard, then the podium and Continue to the picker. No pick or hidden card reached the TV or another phone before the reveal in any round. With eight players, seven or eight seat markers on one card leave its rank and corner suit readable (D-241). Known: after the last round the scoreboard says "Next round in 5 seconds" until P-10 merges; tied hands are listed by seat until P-11 (D-223). Not covered: real phones, a real TV, late join, all-locked early end.
- **Browser matrix, part 1 (X-05, merged 2026-11-18; REL-004 and REL-006 in progress).** `pnpm uat`
  can put the TV in Playwright Chromium, branded Chrome or Playwright WebKit and the phones in
  Chromium (Pixel 7) or WebKit (iPhone 13), each engine launched once and closed on every path.
  With a Chromium 156 or Chrome 157 TV and Chromium phones, a two-phone pass works: lobby, picker,
  a Peek Poker round to its scoreboard, Menu → Paused → Resume, Quit to picker, and Rabakz question 1
  with a wrong answer locked out and a right answer revealed. The unsupported-browser message (C-14)
  also shows correctly in WebKit 27.2. The UAT harness excuses no request the engine cancels.
  **Not yet:** in Playwright WebKit on this Mac no phone is ever seated (no ICE candidates locally;
  D-212). Edge, real Safari, iPhones, Android phones, TV browsers and Firefox are untested (OQ-051).
- **Rabakz phones (R-02, merged 2026-11-18; RZ-003, RZ-005, CTRL-003).** Four shape buttons with the option text in a 2 × 2 grid under a private strip (Score, Locked out, Locked in); the leader's Skip sits at the right. Main's phone header and Menu chip sit above, and the Paused veil covers the strip on every phone. Reveal: Right, Wrong, Skipped (only on the leader's phone when their Skip ended the question) or No answer (R-17), with points gained, streak, total and the chosen option; scoreboard and end show "1st · 100" and "2nd · 700". Short answers draw at 34 px; if any answer in a group needs more room, the whole group steps to 21 px bold, at most three lines. Each group is measured once when shown, and selecting a card does not re-measure (median of 7 fresh mounts at 4x CPU: 0–1.5 ms on a quiet machine, up to 3.4 ms at load 10, against 4 ms; C-19). Controller start-up 179 ms median (budget 2 s). Evidence: `uat/evidence/R-02-phone-layouts/uat-r21-p2/`. **Not proven:** real phones (K-07). The final-round announcement is shown on the console since R-16 (`r16-ffa4/60–67`). Open for Randy: the title pulse on non-success states and the departures from board 4 (OQ-050).
- **Peek Poker scores and podium (P-05, merged 2026-11-18; PP-032, PP-012, DATA-002).** After each reveal the TV shows a five-second scoreboard (the last one says "Final scores in 5 seconds" instead of "Next round in 5 seconds"; P-10, `uat/evidence/P-10-final-scoreboard/round1-p1/`): the leader and score on the left, every player ranked on the right (1 : 1.618), shared places as "=2", rows entering 30 ms apart (none with reduced motion). At match end the same board is the final podium until the leader presses Continue; the shell's "The leader continues on their phone" is the only hand-off line. It fits 1920 × 1080 and 1280 × 720 with eight players. Each phone shows its own place (with "=" for ties) and score between rounds and on Results. Solo: "Best N" during play and on the scoreboard; "New best · N" with one pulse appears, and pulses once the board has settled, only after the shell confirms the record was written (`kaki.host-device.game.peek-poker.progress-v1`), and only for a completed match that stayed one player. If storage cannot be read, no best is shown and nothing is written. Evidence: `uat/evidence/P-05-scores-podium/r9-p1/`, `r8-p3/`, `r7-p8/`; diagnostic 8-phone perf through scoreboards and podium, 16.7 ms median, 33.3 ms worst, none over 50 ms (`perf-r7/`, development build, not assessed). Not yet: the assessed full-match run (P-09).
- **Rabakz TV streak (R-18, merged 2026-11-19; RZ-008).** When one player wins a question on a streak of 2 or more, the TV reveal's outcome line reads "Mei got it · Streak 2". From the third win it adds the bonus: "· Streak 3 · +50 bonus", or "+100 bonus" in the doubled final round. It uses the same 34 px bold type as the rest of the line. If the line ever ran out of room, the bonus goes first and then the streak, and the name is never shortened. Ties, team-mates winning together and nobody-won reveals show no streak on the TV; each player's streak stays on their phone. Evidence: `uat/evidence/R-18-tv-streak/round1/`; diagnostic screen perf median 16.7 ms, p95 16.7 ms, max 33.4 ms (`perf-r18/`). The final-round wording is shown on the console ("Streak 4 · +100 bonus", `r16-ffa4/79`, `r16-teams4/76`, `r16-solo4/46`). **Not proven:** ties and teams on the real console (unit-tested only), and the fallback (unit-tested only; not reachable with 12-character names).
- **Tabao Rush TV renderer (T-07, merged 2026-11-19 as in-progress work; TR-001, TR-004, TR-030, TR-031, TR-061, TR-062, PERF-001; D-271–D-276).** Stations show shape cues with an eight-cell count; north-wall cues sit above the counter, as in the A-05 art. Each seat marker is an ink-edged disc that follows its cook and stays above the head, also at the counter. Rejection notes stay clear of cues, cooks, cards, the HUD and counter items. A finished station pulses once, and not with reduced motion. Evidence: `uat/evidence/T-07-tv-renderer/round12-uat/`. **Not yet:** production performance has not been measured (dev diagnostic p95 18.4 ms against 16.7 ms); recipe steps are words until A-11's icons; cues are placeholders until A-05's sprite; only the cap head is drawn; review 8's seven minor should-fixes are open (a held item at the north counter is not pictured; the marker edge reads about 2.9 : 1 at 1280). T-07b (merged 2026-11-19, D-291): the nearer cook's seat marker draws on top, and each disc has a 3 px ink edge with the numeral centred on its real glyph. Two cooks at the closest legal distance overlap their markers by at most 8.3 px vertically, and a diagonal neighbour's disc edge covers the far numeral by at most 1.92 px. At the north counter a held item shows when the cook faces south; facing away, it is behind the body. Recipe-step words are checked in the real browser font. Perf (`perf-merged/`, development build, diagnostic): 1,800 frames, median 13.3 ms, max 14.4 ms. Production performance is still to be assessed.
- **Credits question download (X-10, merged 2026-11-19; RZ-021, DATA-004, D-268).** Credits has a "Download our questions (CC BY‑SA 4.0)" link under the Open Trivia Database credit. It saves `kaki-arcade-rabakz-questions.json`, which the build makes from the same bank the game uses. The file holds only the 2,342 adapted Open Trivia Database questions, with their licence notice; the Singapore pack is not in it. Nothing loads the file until the link is pressed. On a TV, Credits still fits without scrolling; on a phone the link is a 55 px target. Deploy shell 684,398 B gzip of 1,500,000 (+151,868 B). Not proven: serving the path on production hosting (X-06).
- **Phone that can't reach the big screen (K-11, merged 2026-11-19; REL-006, D-250, D-267).** A phone that has never had a seat and stays on "Connecting to the host…" for 15 s shows "This phone can't reach the big screen" with advice to join the same Wi-Fi and a Try again button, which starts a fresh 15 s window. The advice stays through automatic retries and the end of the reconnect hold; it gives way only to a seat or a final state. A phone that was seated keeps Host disconnected and its seat hold. Evidence `uat/evidence/K-11-could-not-connect/round1/` (Chromium, real server, 390 × 844 and 375 × 667). Not proven: a real Wi-Fi mismatch on real phones (X-09).
- **Scores per game across a TV reload (C-22, merged 2026-11-19; PLAT-009, D-226, D-270).** A host reload keeps each player's completed-round scores separately for each game; the running match is still lost and the TV returns to the lobby with the same room, seats, teams, leader and last results (8 phones, `uat/evidence/C-15-console-e2e/c22-p8/`). An older saved snapshot keeps the room and drops its scores. No screen shows these totals in v1. Not proven: two different games in the UAT (unit test only); teams after a reload (unit test only).
- **Selected face-down card (K-10, merged 2026-11-19; PP-005).** A picked card on the Peek Poker phone keeps its red back and white inset frame and shows a centred cream disc with a dark tick. The tick fades in from 0.95 over 144 ms and out in 115 ms; with reduced motion it appears and disappears with no fade. Card size is unchanged and nothing identifies the card. The disc's contrast with the red is 5.3 : 1 (about 4 : 1 over the lighter stripes). Evidence: `uat/evidence/K-10-selected-card/round1/`. Not proven: WebKit and real phones; phone 2 is asserted, not pictured.
- **A-03 (merged 2026-11-19): cook heads.** All eight cook heads (cap, uncle, auntie, makcik, bun, specs, turban, songkok) are rendered in eight facings and packed with the shared body; every pair differs in greyscale in every facing, also with the cap in each seat colour. Only the cap carries the player or team colour on the head; the apron carries it for everyone, and from behind only the cap shows it. Heads atlas 0.20 MB; Tabao Rush art 2.22 MB of the 8 MB level budget. Not yet drawn in game (T-07); the phone character picker (TR-064) is not built. Known: makcik's face opening and uncle's grey band keep the board-1 cut edges. Evidence: `uat/evidence/A-03-cook-heads/`; options board https://claude.ai/artifact/UBC7KrsbjrgXn5uRMRH4ty.
- **Tied hands at the reveal (P-11, merged 2026-11-19; PP-008, PP-009).** Equal hands are listed by this round's points, then lock-in order, with random fills after every full pick and seat only as the final tiebreak (D-223, D-261); seen in the browser at 3 and 8 phones, including three-way ties.
- **Final-screen hand-off (C-18, merged 2026-11-19; PLAT-022, PLAT-024, PP-032, RZ-032).** On Peek Poker and Rabakz final screens the TV shows one hand-off line, "The leader continues on their phone" (or "Enter: Continue" after a key press), drawn at board scale in a reserved band at the foot. Rabakz no longer repeats "Leader can continue" in its final header. Finals at 1, 4 and 8 players, free-for-all and teams (tied and untied), fit above the band at full 34 px text, centred, at 1280 × 720, 1920 × 1080 and 3840 × 2160. Untied 8-player team lists sit at 0 px row gap (round4/19), carried to OQ-047 podium polish.
- **Shell pictures (A-09, 2026-11-18; REL-002, PLAT-020).** The landing page shows its title, one line, "Host a game", the three games and a "Put this on your TV" link, with a picture of friends playing on their phones in the 1.618 : 1 side column, and Privacy and Credits at the foot. At 1000 px wide or less the landing is one unscaled scrolling column with no picture, and every link is at least 55 px tall. Each game has its own 1.618 : 1 picture in the picker and on the start screen (656 × 405 at 1080p); the pictures decode during the lobby and load only on the TV's pages: 148 KB of WebP in all. On every start screen the picture sits left and the details and settings right; "Who's in" is 13 px below the picture at the same height on all three games. Each player tile is at most two lines: the name on one line, cut short with "…" when too long, and "Seat held" below it when that player has dropped. A refused setting shows at the foot of the card and fades in and out in place, so the player strip does not move. Fits at 1080p and 720p. Evidence: `uat/evidence/A-09-shell-imagery/uat-r16/`. **Not proven:** real TV legibility, including truncated names (X-09); the replacement crossfade is tested but not pictured.
- **Landing keyboard and remote (X-01, 2026-11-18; REL-002).** On the TV the landing opens with Host a game focused; on a phone nothing is focused. Down or Right moves through Host a game, Put this on your TV, Privacy and Credits in reading order; Up or Left goes back; the ends stop. Enter or Space opens the focused link, and Enter on Host a game opens the room. If focus is lost (for example after clicking the picture), an arrow brings it back to Host a game, and Space opens Host a game. Arrows with Alt, Ctrl or Cmd are left to the browser, holding Space does not repeat, and text fields keep their keys. Tab order is unchanged. Host a game stays the one primary action; Put this on your TV stays a text link below the games line. The focus ring is the shared 5 px ink outline. Seen at 1920, 1280 and 390 wide in Chromium. Evidence: uat/evidence/X-01-landing/round2/. **Not proven:** a real TV remote and TV browser, readability from 3 m, and the ring crossing the footer pill's edge on Privacy and Credits (X-09).
- **Late join (C-17, merged 2026-11-18; PLAT-008, RZ-014, PP-013, TR-056).** A phone can join while Rabakz or Peek Poker is running. It is seated at once with a score of 0, sees "You join at the next question" or "You join at the next round", and plays from there. A game that does not allow mid-game joining, and any match played in teams, holds the phone on "Waiting for the lobby"; the phone is let in automatically when the TV returns to the picker or results. Evidence: `uat/evidence/C-17-late-join/r4-p3/`. **Not yet:** joining a running team match (OQ-048); Tabao Rush's next-round entry is shown only in module tests.

- **Rabakz solo best and recently seen questions (R-06, merged 2026-11-18).** A one-player match
  is a score attack against a best kept on this TV for each match length (10, 30 or 50). During
  play the header reads "Category · Best N" once a positive best exists; the solo final shows
  "New best · N" only after the TV has stored it, with one pulse after the results screen has
  settled (none with reduced motion), or "Best N" when it was not beaten. A tie keeps the best,
  anyone joining ends best eligibility, and quitting never sets a best. Each game keeps one
  record on this device (`kaki.host-device.game.<id>.progress-v1`; for Rabakz up to 200 recent
  question ids, oldest first, and bests by length), read before every Start and written after
  results or on quit to the picker; if it cannot be read, nothing is written that match.
  Recently seen questions are avoided until the chosen pool runs out, then the oldest return
  first. Nothing about bests or history reaches a phone. Perf: `rabakz-screen` diagnostic with
  the solo header and solo final fixtures, development build, headless: 2761 frames, median
  16.7 ms, p95 16.7 ms, max 33.4 ms, 0 frames over 50 ms, 0 long tasks; no budget assessed
  (`uat/evidence/R-06-solo-best/perf-r5/`). **Not yet:** no save when the page closes mid-match;
  the question-to-results crossfade holds the question block until about 400 ms, then cuts it
  (older, R-05 transition); the all-tied podium shows a full-width "=1" step (OQ-047).

- **Station effects (A-07, merged 2026-11-18): art only.** Steam, sparks, fire, extinguisher spray and a thrown-item ground shadow, rendered in Blender and packed as one small atlas: 37.8 KB and 0.17 MB decoded at full size, 13.8 KB and 0.04 MB at half. The fire is three pointed tongues in gold, orange and red, with fixed feet and a flicker that loops without a jump. It reads as fire from 3 m, at half detail and in greyscale, and frame 0, the reduced-motion still, shows all three tongues. One spray strip is rotated for all eight directions. The items render stamp now hashes only the items set, so other sets no longer make it stale. **Not yet:** drawn in the game or on station art (T-07); spray rotation and nozzle fit untested. A-07b (merged 2026-11-18) made the effects readable on the light counter. Sparks are unlit gold dots in a red ring (7×9 px), about 4.5 : 1 on cream, and read from 3 m on both counters. Steam and spray are greyer and visible on marble. The shadow is a smooth, grain-free ellipse in the palette brown, 3 : 1 on the light counter. Re-renders give identical bytes. The effects atlas is now 39.1 KB and 0.18 MB decoded at full size, 14.7 KB at half. **Not yet:** drawn in the game (T-07); spray rotation and nozzle fit untested; some Cycles grain remains inside the steam and spray lobes. Evidence: uat/evidence/A-07-effects/rendered/, uat/evidence/A-07b-effects-readability/rendered/.

- **Privacy and Credits pages (X-03, merged 2026-11-18; DATA-004, RZ-021).** The landing page has Privacy and Credits links; on phones they sit below the landing content as 55 px targets. Privacy says in plain words what the TV counts (four problems and one smoothness band per match), when it sends them (after results, or when the page is hidden or closed, never in play), that phones send nothing and that daily totals have no end date; it also covers room-code limits and expiry (10 minutes empty, 12 hours in all), no sign-up, what stays on the TV and that our server never sees nicknames. Credits names the Open Trivia Database and CC BY‑SA 4.0 with links and offers our adapted questions under the same licence, and credits the Singapore pack, DM Sans and our own sound. On the TV the pages fit the 1920 × 1080 board in 1.618 : 1 columns without scrolling (Privacy clears its edge by 47 px at 1080p against 34 needed, under one line spare), focus the back link for the remote, and scroll in one column on phones; their code loads only when opened. Development build in Chromium. **Not proven:** real TV or Windows fonts (X-09); transfer budgets until the next verify; OQ-030 limiter wording; how the adapted bank is offered (OQ-045).

- **Console end to end (C-15, merged 2026-11-18).** Eight emulated phones join, the leader picks a development fixture through the normal module interface, all eight play, the keyboard and any phone pause, and the leader resumes or quits to the picker from the phone (Menu in the ID bar; a Paused veil that takes focus and returns it to Menu). A phone reload keeps its seat and private state; a host reload loses the round and restores the room, players and completed scores (scores are restored in storage; no screen shows them yet, OQ-044); a room reported gone keeps linked play and offers a new room afterwards. The fixture only; no real game, no real phone. Reconnect 151.8 ms, host recovery 2181.6 ms (round6-p8); controller cold start median 171 ms against 2 s.

- **Anonymous counts (X-04, DATA-003, DATA-001).** The TV sends one small batch of anonymous counts to the pairing server after each match's results, and once more when the page is hidden or left, never during play. It sends no cookies or referrer. The batch holds integers only: session, load and signalling errors, signalling outages (one per drop, however many retries it takes), and one of four frame-time bands per finished match. Phones send nothing. The server keeps one total per kind per UTC day; no address, header, name or device detail is stored, and the totals never expire. Reading the totals works only on a local worker with `COUNTS_DEV_READ=true`. **Not yet seen on the real edge** (D-089, X-06).
- **Put this on your TV page (X-02, REL-003).** The landing page links to a short help page: laptop over HDMI as the recommended route (cable and input, Chrome, Edge or Safari, full screen, Game Mode, keep it plugged in and awake); the TV's own browser as a fallback that may be slower or may not open the game, with the site address; and how phones join, with what to do if one cannot (same Wi-Fi, scan again). It fits the 1920 × 1080 board, scales without scrolling at 1280 × 720 and 960 × 540, and scrolls normally on phones. Its code loads only when the page opens; the shared first page grew by 257 B gzip and controller start-up stays at 182 ms. Seen in Chromium on the development build. **Not proven:** a real TV browser (S-03b, X-09), full-screen keys on real keyboards, Game Mode menu names by brand. The link sits below the games line on the landing and arrow keys and the remote reach it (X-01).
- **C-12 (2026-11-18): the TV works from a keyboard.** Landing, lobby, picker, start screen, team
  setup, results and the pause panel all work from the arrow keys, Enter and Esc, with the keys
  shown on screen (D-162, D-165); P or Esc pauses during play. J seats a keyboard player and a game
  pad seats one more (CTRL-009, in progress: no real pad tested yet, held-key movement waits on
  T-07). Checked with 8 phones at 1080p and 720p. Evidence: `uat/evidence/C-12-host-keyboard/round11/`.
- **A-02 (2026-11-18): the cook body.** One shared cook body, rendered in Blender, does all nine
  actions (idle, walk, carry-walk, chop, stir, wash, serve, throw, extinguish) in 8 directions,
  with a cap head, colour masks for cap and apron, and a head and throwing-hand anchor on every
  frame. Checks: no foot slide, head anchor jumps at most 5.81 px, every action visibly moves on
  the composited frames. Tabao Rush art at full size is 5.14 MB of the 8 MB level budget.
  Not yet drawn in a game (T-07). Two art points await Randy (D-167). Evidence:
  `uat/evidence/A-02-cook-body/round6/`.
- **K-09 (2026-11-18): lone options and face-down cards on phones.** A lone option such as Rabakz's
  Skip takes only its own width (at least 89 px) and the answers get the rest (D-160); a large lone
  option such as Peek Poker's Lock in keeps 144 × 144 beside a 4 × 4 grid (D-164); face-down grid
  cells are named "Card N" and a selected one shows a white inset outline that clears 3 : 1 in every
  theme (D-166). Evidence `uat/evidence/K-04-layout-engine/k09-round3/` and
  `uat/evidence/C-16b-private-panel/k09-rabakz/`.

- Repository, requirements, design rules, architecture, build loop and tracking docs.
- `docs/HANDOFF.md`: full context from the planning conversation for the build session.
- `python3 tools/trace_check.py`: 152 requirements tracked (PRD v1.1), check passes.
- The build plan for concurrent agents (`PLAN.md`) and the backlog of 97 issues across 10
  tracks (`backlog/`): written, **awaiting Randy's confirmation**.
- Blender 5.2 LTS runs headlessly on the dev Mac; `tools/blender/sample_stall.py` renders the
  sample stall scene in about ten seconds.

- **Workspace (F-01, merged 2026-11-16):** pnpm workspace with nine empty packages wired in
  their dependency order; strict TypeScript; ESLint; a design lint for off-scale spacing and
  raw colours; Vitest (135 tests, all on the two lint tools); `pnpm verify` passes from a clean
  checkout and was shown to fail on a type error, a lint error, a design-lint finding, a failing
  test, a trace failure and an unregistered package. No game or screen code yet.

- **Protocol (F-02, merged 2026-11-16):** `packages/protocol` defines every pairing, control and
  input message with validators that never throw, role-split signalling decoders, nickname
  rules (12 visible characters) and the input frame with 8 ticks of history. Tested end to end
  against the real input buffer in review, not yet over a real network: no netcode uses it yet.
- **Simulation core (F-03, merged 2026-11-16):** `packages/sim-core` has a seeded random number
  generator, a fixed-timestep loop, the host's input buffer (loss, reordering and the 16-bit
  wrap handled; `discardEdges` for resume, `reset` for a new connection), and snapshot, hash,
  freeze, encode and record-and-replay helpers. 200 tests. No game uses it yet. Known gap: a tap
  made in the last moments of a pause can still land as play restarts.
- **Open Trivia import (R-11, merged 2026-11-16):** 2,342 questions in ten categories, credited
  under CC BY-SA 4.0, screened for all ages by patterns and by three review rounds of reading
  (last sampled fault rate 1.6%). The bank is 2,660 questions with the Singapore pack. Reproducible
  offline from a committed cache. Built by a Claude agent, fixed by Codex.
- **Singapore question pack (R-12, merged 2026-11-16):** 305 original four-option questions in
  six categories, each with a source note. Written and reviewed from memory with no web access:
  **no fact has been checked against a source**, and Randy's spot-check (R-14) is outstanding;
  `uat/evidence/R-12-singapore-pack/questions.md` lists the 17 to check first.
- **Rabakz question bank tooling (R-10, merged 2026-11-16):** `content/rabakz` holds the question
  schema, a validating build that writes one chunk per category, a seeded question selector and
  a stats report. The bank is filled by R-11 and R-12 above; the 60 picture questions (R-13)
  do not exist yet. Nothing reads it yet.
- **Network spike (S-01, in progress):** `spikes/s01-network/` connects up to 8 phones to a host
  page over WebRTC and measures input delay. Run on one Mac with emulated phones only: 8 scripted
  phones p95 27 ms, no loss, host at 60 fps. Not yet tried on real phones, over real Wi-Fi or
  through a relay; one touch-driven emulated phone was over budget (OQ-028). Not reviewed.

- **Asset pipeline (A-01).** `pnpm assets` packs frames into atlases (2048 × 2048 at most, full
  and half size, lossless sprites and lossy backgrounds), writes a manifest with anchors, layers
  and per-round sizes, and fails when a round is over PERF-023 or PERF-024. Proven on synthetic
  frames only: no real art exists yet. Two review rounds.

- **Design tokens and motion helpers (F-06).** `packages/ui` holds every decided colour, size,
  spacing step, type size and motion value, the four themes, and helpers for press, enter and
  exit, stagger, arcs, count-up, crossfade and card turn, with reduced-motion handling.
  `tokens.css` and `specimen.html` are generated and checked for staleness. 5.8 KB compressed.
  Real fonts are not bundled yet (F-06b). One review round plus fixes checked by the integrator.

- **Room state (C-06).** A pure module in `packages/platform` for seats 1 to 8 and their
  colours, nicknames (12 visible characters, unique, filtered), the leader and hand-over, the
  two-minute seat hold, host reload, and joining by phase. No screen or network uses it yet.
  Built by Codex; four review rounds, the last three on the nickname filter.

- **Pairing server (C-01).** `apps/signal`: a Cloudflare Worker and one Durable Object per room.
  Creates rooms with 8-character codes, authenticates the host at the socket upgrade, forwards
  only signalling between a phone and its host, caps and times out silent sockets, throttles
  floods, survives a restart with no ghost players, and expires idle rooms. Runs locally only
  (`pnpm --filter @kaki/signal dev`); **not deployed**, no relay credentials (C-02) and no
  cross-client rate limits were added by C-03 below. Built by Codex; two review rounds against a real local
  server; smoke test of 12 steps run by the integrator.

- **Game interface and conformance kit (F-04).** `packages/platform/src/game`: the `GameModule`
  contract, layout and private-view schemas, phone size limits from the decided button floors,
  the step driver, and a kit of 25 checks with 67 deliberately broken games it catches. Imported
  by games from `@kaki/platform/kit`. An independent reviewer's skeletons of all three games
  pass it. No real game exists yet. Started by a Claude builder, finished by Codex; four review
  rounds.

- **Input buffer follow-ups (F-03b, F-03c).** Two fast taps arriving together both count, a
  delay spike cannot repeat a tap, and a stall never replays old taps late. Two review rounds
  with 16 attack sequences.

- **Peek Poker rules (P-01, P-02).** `games/peek-poker/src/rules`: deal, memorise, swaps,
  secret picks, lock in, random fill, hand evaluator, scoring with the speed bonus, reveal and
  scoreboard phases, solo, joins and leaves. Passes the conformance kit at 1, 4 and 8 players;
  the evaluator agreed with an independent one on 60,000 hands. Rules only: no screen yet.
  Built by Codex; two review rounds.

- **Protocol clean-up (F-02b).** Face buttons are named by position everywhere (wire bits
  unchanged, with a test tying the game-facing table to the protocol), the retired socket
  `create` and `reopen` messages are gone, the host subprotocol helpers are strict, and a silent
  socket gets `opening-timeout`. Protocol version stays 1 until the first deploy (D-070). One
  review round; the pairing server's smoke test was rerun locally by the integrator.

- **Tabao Rush movement (T-01).** `games/tabao-rush/src/rules`: level and cook state, movement
  that follows the stick on the next step, eight-way facing with a steadying hold, wall
  sliding, soft collisions and the station a cook would use. No deadlock in any reviewed case
  (corridor, doorway, dead end, wall-lean, 210,000 random cook-steps). Rules only: how it feels
  cannot be judged until there is a screen, and every constant is provisional. Built by Codex;
  three review rounds.

- **Rabakz rules (R-01).** `games/rabakz/src/rules`: the untimed buzzer race with its 15-step
  tie window, lock-out, skip and idle reveal, scoring with streaks and the doubled final round,
  teams, scoreboard every 5 questions, joins and leaves. Takes questions in the bank's shape
  with picture credits. Passes the conformance kit in four scenarios with skips. Rules only: no
  screen yet. Built by Codex; three review rounds, last fix by the integrator.

- **Tabao Rush items (T-02).** Carrying one thing, endless crates with a floor cap, counters,
  throwing on a 377 ms flight and catching, with the floor item a press would take shown in the
  view. No item lost or duplicated in 586,000 reviewed cook-steps; step time stays flat through
  a whole round of button-mashing. Rules only: no screen yet. Built by Codex; two review rounds.

- **Netcode (C-04).** `packages/netcode`: pairing clients for host and phone, the two WebRTC
  data channels, input sending and receiving into the real input buffer, the control channel,
  link quality, and a connection lifecycle that survives host blips, early joiners and eight
  phones at once. 107 tests, including 45 written by the reviewer against the pairing
  server's real room logic. **Simulated connections only: it has never run in a browser.**
  Built by Codex; three review rounds.

- **Game dev harness (F-05).** `@kaki/platform/harness`: a headless match runner through the
  same path the console will use, scripted controllers as plain data, seeded bots, record and
  replay with checkpoints once a simulated second, text timelines and a command-line `play`
  and `replay`. Each of the three games has a harness test playing whole matches. The bare dev
  page with keyboard controls is F-05b. Built by Codex; two review rounds.

- **Tabao Rush stations (T-03).** Chop, wok, pot, grill, rice, drinks, plating, sink and bin
  as mechanisms; burning with a warning; fire on one kitchen clock with a single extinguisher;
  items that record what was done to them. No item lost or duplicated in 1.17 million reviewed
  cook-steps; a busy-kitchen step stays under a hundredth of a millisecond after warm-up.
  Recipes, plates that hold several things and serving are T-04. Rules only: no screen yet.
  Built by Codex; two review rounds.

- **Session runner (C-10).** `packages/platform/src/session`: runs any game in the host loop,
  routes inputs and taps, sends each phone its layout and private view only when the content
  changes, pause and resume, reconnect, shortage of players, teams fixed for a match, results
  and back to the picker, recordings the dev harness can replay. Whole matches of all three
  games match the harness step for step; privacy holds through reconnects, leader changes and
  mid-match joins. Simulated transport only: no screen and no real network yet. Built by Codex;
  three review rounds, last fix by the integrator.

- **Reconnect (C-05).** `packages/platform/src/reconnect`: a phone that sleeps, reloads or
  drops returns to its seat within two minutes with the same colour, name, score and private
  view; a reloaded host page brings back the room, players, leader, teams and last results and
  returns to the lobby (the running match is lost, OQ-031). Saved data is bounded, validated
  strictly and holds nothing secret. Fake storage and simulated connections only: not yet
  proven on a real phone or browser. Built by Codex; two review rounds, last fix by the
  integrator.

- **Pairing server limits (C-03).** Limits per client and per network on room creation,
  connection attempts, wrong or abandoned joins and silent sockets, with nothing about a client
  written to storage. Honest traffic (eight phones on one address, a school, a long evening)
  is never refused in tests. The 16-step smoke test passes on a real local server, where it
  caught a fault four review rounds had missed. **Not deployed, and not proven on Cloudflare's
  edge:** a staging probe is required first (D-089, OQ-030). Built by Codex; five review
  rounds and three smoke rounds.

- **Tabao Rush recipes (T-04).** The seven dishes as data; plates, bowls and cups that hold
  food; racks, a return counter for dirty containers and washing; laksa, mixing and spreading;
  a serving counter that accepts a correct dish and refuses a wrong one with a specific reason
  without consuming it. Each dish is cooked and served from crates by walking and button
  presses in a scripted test. No food or container lost or duplicated in the reviewed fuzz, no
  soft lock found. Orders, patience and scoring are T-05. Rules only: no screen yet. Built by
  Codex; three review rounds.
- **Tabao Rush levels (T-06).** A level format (grid, spawns for eight cooks, stations with
  facing, racks and their stock, dishes, round length, star base, venue), a validator that
  returns plainly worded problems and never throws, and a loader that validates before it
  builds the starting state. Two **test kitchens**, not final levels: a small kopitiam
  (chicken rice and kopi) and a zi char kitchen with all seven dishes and fires. Rules are
  D-093 and provisional. Twists are refused until they have behaviour, so no level declares
  one. The game itself still starts on the old fixture kitchen; real levels, twists and
  layouts fair at eight cooks are T-11. Nothing drawn. Built by Codex; two review rounds.
- **Host lobby (C-07): the first screen.** `apps/web` (Vite and Preact, D-088) serves `/host`:
  it creates a room on the pairing server and shows the room code, a QR code of the join
  link, eight seats with name, seat colour, connection quality, leader mark and a held seat's
  countdown, and a screen each for creating, restoring, unreachable, expired and taken over
  by another tab. Seen by the integrator in desktop Chromium at 720p, 1080p and 4K against a
  real local pairing server: a room is created, a reload reopens the same room, a room the
  server no longer has shows "This room has expired", and stopping the server while a room is
  open keeps the room on screen and retries at a paced rate. **Not yet seen:** a real TV,
  Safari, Firefox (phones joining and an outage were seen later, in C-08). The readings of
  the chosen board are D-090 and D-092. `/` is a placeholder link. **A fault shipped
  in this slice and was missed by the integrator and the review:** a player who joined after a
  seat's wipe had finished showed as "Seat N" with no name (the committed reduced-motion
  screenshot shows it). The UAT harness exposed it; fixed in C-08. Built by Codex over five fix rounds; three review rounds; the
  integrator's browser checks found two faults the reviews had not (tiny names, an expired
  room looping) and one of the integrator's own evidence claims was wrong and is withdrawn in
  the report.
- **Saving on the TV, and the detail benchmark (C-13 part 1), code only.** A store for scores,
  stars and settings on the TV's browser, safe against corrupt, foreign, oversized and newer
  records, and a benchmark that judges dropped frames (D-111, D-113). Nothing visible yet: the
  settings screen and running the benchmark on the lobby are part 2, and the benchmark has no
  real workload until the game renderer exists (OQ-036), so "auto" means full detail today.
  Tested by unit tests only. Two review rounds.
- **Message for browsers that can't run it (C-14).** A browser missing something the game needs
  sees "This browser can't run Kaki Arcade", the line for its device (computer, or the join
  link on a phone) and what is missing in plain words, instead of a broken page. Browsers too
  old to load the app at all (no modules, a failed early check, code they can't read) get a
  plain version of the same message, and so does a browser with JavaScript off. Seen working
  in Chromium on the development and production builds, at 320 to 1280 px wide; every normal
  page still loads. Not proven: a real old Safari or Android, Firefox (no runner option) and the
  WebKit production build; WebKit 27.2 on the development build was seen in X-05.
  Built by Codex over four fix rounds; two review rounds. The integrator's browser checks
  found that the round-3 backstop showed the message in a working browser (fixed in round 4).
- **Phone controller shell (K-01), development page only.** `/play?demo=controller` shows the
  landscape controller frame: a one-line header with the seat number in its colour, the name
  (cut with an ellipsis when long) and the link state as icon plus word, an empty play area,
  and "Turn your phone sideways" in portrait. While shown, the page cannot scroll, zoom, select
  text or pull to refresh, and it asks the phone to stay awake, saying "Keep your screen on"
  only if refused. Tested in Chromium phone emulation from 320 to 844 px wide. Not proven: real
  iPhone and Android (S-05); not yet the page a seated player sees (C-16); no stick or buttons
  yet (K-02, K-03).
- **Floating left stick (K-02), development page only.** `/play?demo=controller` shows a
  dashed stick area; the base appears where the thumb lands (kept inside the area, D-116), the
  knob tracks the thumb 1:1 and stretches with deflection, rubber-bands past the edge, and
  eases back and fades on release. A second finger never steals it; hiding the page, losing
  focus, resizing or a cancelled touch release it. Reduced motion drops the stretch and the
  easing. Tested in Chromium phone emulation at 844 and 667 wide. Not proven: real phones
  (K-07); phone frame timing (PERF-012, perf harness); stick and buttons together (K-04).
- **Buttons (K-03), development page only.** `/play?demo=controller&controls=buttons` shows
  L, Start and R along the top, a D-pad, and the shape diamond (cross, circle, square,
  triangle in their fixed colours, white rims). Sizes follow the phone (110 px shape buttons
  at 844 × 390, about 121 at 932 × 430; 89 × 68 for the rest) with at least 13 px between
  controls. A press shows at 0.97 at once and vibrates briefly; the release eases. Several
  buttons can be held at once, the D-pad slides between directions, and a cancelled touch,
  a hidden page or losing focus releases everything. Tested in Chromium phone emulation at
  667, 844 and 932 wide. Not proven: real phones and vibration on hardware (K-07); frame
  timing (PERF-012); the per-game layouts (K-04).
- **Layout engine (K-04), development page only.** `/play?demo=controller&layout=<name>` draws
  only the parts a layout asks for (stick, D-pad, shape buttons, L and R, options, a tappable
  grid with an action, cards, text) and grows them to fill the play area, with 13 px margins and
  gaps falling to 8 and 5 only where needed (D-117, D-118). Face buttons are 110 px at 844 wide and
  above and scale down to 89 on narrower phones (D-122). Labels that do not fit at 34 px step to
  21 px (D-127); disabled controls are an opaque grey with dark ink (D-125); face-down cards show
  the striped back. Changes crossfade without a blank frame. Tested in Chromium phone emulation
  at 667, 844 and 932 wide. Not proven: real phones (K-07); the games' own layouts (R-02,
  T-08); long action labels and web-font loading (follow-ups in K-05).
- **Rabakz scoreboard and podium (R-05), development page only.** A scoreboard every five
  questions and a final podium, with ties, late joiners and team totals first in team mode, for
  one to eight players at 720p to 4K. Long names end in an ellipsis; every heading and prompt is
  masked with room for its ink, and a browser checker compares measured ink with each mask (480
  screen states, none clipped). Screen transitions held 16.7 ms frames in the performance run.
  Not proven: inside the console (R-02 wires the game), sounds (RZ-033).
- **Start-screen settings (R-04, merged 2026-11-18).** The leader's phone shows the game's settings:
  Rabakz Questions 10/30/50, Categories in two tabs with Mixed, Difficulty Easy/Mixed/Hard, and
  Teams; Peek Poker Rounds 3/5/7. The TV mirrors them beside the game card. A choice that leaves too
  few questions is refused with the count and a fix, in the phone's footer status line (D-174). A
  category change that strands the length disables Start with the reason. Settings are kept per game
  for the room's life (not across a host reload). Other phones read "⟨leader⟩ is setting up". Known
  gaps: a keyboard or pad leader cannot change settings (OQ-042); teams are not yet shown during play
  (R-08); the start screen shows the game's picture (A-09).
- **Rabakz sounds (R-07, parts 1 and 2 merged 2026-11-18).** The TV plays answers open, buzz-in
  seat notes, right and wrong (D-168 Mallet set, D-169 timing) through a limiter whose make-up gain
  is cancelled. The TV pause panel has Effects and Music rows under Resume (D-168), worked by arrow
  keys or a game pad's d-pad, stepping by 10 from 0 to 100. Levels are saved on the TV and apply at
  once, and each Effects change plays one C5 Mallet note (none at 0). Music has no playback yet, so
  its level only saves. Not heard on a real TV; the volume against the D-168 artifact needs Randy's
  ear. A TV that no one has touched says how to turn sound on (C-24).
- **Rabakz TV screen (R-03), development page only.** The question, four options with letter
  and shape, who has answered, lock-outs and wrong options marked without colour alone, and
  the reveal, at reading size for 720p to 4K with eight players. A correct option pulses once
  in its own colour; between questions with a different layout the block changes by one
  mask; the winner's tick keeps its place after the name. Opened by the integrator in a
  browser across rounds 7 to 9. Not in the console yet (C-10/C-15), not on a TV, no real
  pictures or fonts. Performance run (`pnpm perf -- rabakz-screen`) is diagnostic only:
  median 16.7 ms frames, one unexplained 217 ms frame in the first run that did not repeat.
- **Game picker (C-09).** From the lobby the leader opens a picker on the TV listing all three
  games with name, player range and blurb; games that cannot be played with the players in the
  room say why. The leader's phone moves the focus (Previous, Next), selects, goes back and
  starts; other phones show who is choosing. The chosen tile grows into its start screen with
  the seats along the bottom. A failed game load shows a warning on TV and phone and Start can
  be pressed again; an empty room returns the TV to the lobby with its join code; the leader
  leaving hands the picker to the next leader. Tested with two real phone contexts in Chromium
  (all checks pass) and opened by the integrator. **Not proven:** a TV, real phones, Safari;
  frame time of the tile moves on the TV; a successful Start does nothing yet (C-10). The
  start-screen layout awaits Randy's choice on the design board. Built by Codex over ten fix
  rounds with four reviews; the integrator's browser runs found two one-line faults the unit
  tests could not (the stage grid's columns grew while a tile resized; a mask was paused) and
  one regression (the focus ring hidden at rest), all fixed.
- **Performance harness (F-08).** `pnpm perf` runs every installed game at 1, 4 and 8 players
  with seeded bots and reports step time, allocation and garbage-collection pauses;
  `pnpm perf -- lobby-8 --phones 8` pairs eight real phone contexts in a visible browser and
  records host frame times, long tasks, the display's refresh rate and whether each link is
  direct. Both ran on the dev Mac (exit 0). **No performance budget has been assessed by it:**
  the only screens are the lobby, the join page and the picker, so PERF-001, PERF-010,
  PERF-012 and PERF-030 all read "not assessed". Built by Codex over two fix rounds with two
  reviews; the browser layer failed on its first real start (an import hook rewrote paths
  inside Playwright) and the integrator fixed it. **Not proven:** 1 and 4 phones, headless,
  a production build, a quiet machine, anything on a TV or a real phone.
- **UAT harness (F-07).** `pnpm uat -- <slice>` starts the web app and a local pairing server,
  drives one host and up to eight phone browser contexts, takes settled screenshots and
  transition strips, fails on unexpected browser errors, enforces step and run deadlines and a
  size cap, stops everything it started, and writes a report that claims nothing was looked at.
  Scripts exist for the host lobby (31 steps) and the join page (14 steps, eight phones, a
  ninth refused, host reopen, a 25-second pairing outage) and both pass in Chromium. Its first
  runs found a real lobby fault (a late joiner shown as "Seat N"). Built by Codex over four fix
  rounds with two reviews; Codex cannot run a browser, so the integrator made eight small fixes
  from real runs, and the last fix round was checked by running, not by a third review. The
  integrator's claim that the first strips showed the seat wipe was wrong and is withdrawn in
  the report; the final strips do show it. **Not proven:** headed mode, the thumb helper,
  Firefox, and WebKit past the lobby (D-212).
- **Phone join page (C-08).** `/play` on a phone: the room code typed, pasted, or carried by
  the link; a name; then the lobby with the seat number, colour and name, a leader mark,
  "Change name" on its own screen and "Leave". A screen each for a full room, a room not
  found, a closed room, an unreachable room, the host disconnected, a seat taken over by
  another tab, a hold that ended, an expired seat, a game in progress and an out-of-date
  page. `pnpm dev` starts the web app and the local pairing server together. Seen by the
  integrator in desktop Chromium against a real local pairing server with eight emulated
  phones: all eight seated in under half a second each, a ninth told the room is full, a
  duplicate name numbered, a phone reload returning to its seat, the host page closed and
  reopened with all eight back, and the pairing server stopped for 22 seconds with every phone
  still connected and a rename reaching the TV. The last fix round's flows were checked with
  two phones, not eight. **Not seen:** a real phone or QR scan, Safari, Firefox, the on-screen
  keyboard, a screen reader, a player joining mid-game (no game can start). Rulings in D-095.
  Built by Codex over four fix rounds; three review rounds; the integrator's browser checks
  found five faults the unit tests had not (names missing on the TV, an outage dropping every
  phone, wrong lobby wording, a doubled notice, `localhost` refused by the dev pairing server).
- **Tabao Rush orders and scoring (T-05).** A seeded order queue per kitchen with patience and
  a last-quarter warning; serving only against an open order; points by dish, a speed tip and
  a loss for an expired order; a 3 minute 30 second round that ends exactly on time; 0 to 3
  stars; order rate, queue size and star thresholds scaled by crew size, with stars based on
  the average crew over the round so leaving cannot earn them. A full round runs at 1, 2, 4
  and 8 cooks in tests. **Every number is provisional** (D-091): worked out by arithmetic,
  not by play (OQ-032). A cook leaving never removes an order card. Players who join
  mid-round watch and share the score. Rules only: no screen yet. Built by Codex; two review
  rounds, the last must-fix confirmed by the integrator against the reviewer's test.

### Cook art spike (S-02)

- One toy cook is rigged in Blender and rendered at board 1C's size (1.5 tiles to the top of the
  head) in 8 directions, idle and walk, as a shared body plus a separate cap head, with colour
  masks so the cap and apron take each player's colour. 208 frames, 192 × 192 px, 94 s per
  character. Storage decided as lossy WebP q90 with exact colour (D-142, D-144): about 2.8 MB for
  all cook animations of the 8 MB level budget. Evidence: `uat/evidence/S-02-cook-spike/round2/`.
  The other 7 actions came with A-02 (above). Since A-02b the cook sheets ship as quality-90 WebP
  (1.79 MB at full size, 0.81 MB at half size), checked against their lossless source.
- **A-02b (2026-11-18): cook chop and storage.** The cook's chop is a side raise of the knife arm
  with the head kept still; cook sheets ship as quality-90 WebP checked against their lossless
  source; every rendered cook frame is checked to be one connected piece. All nine cook jobs were
  re-rendered and packed and are fresh. Not yet: the knife hides behind the cap while the SE-facing
  cook holds it, the E-facing extinguisher is mostly hidden, and carrying reads weakly from behind
  (A-02d, to Randy as rendered strips before T-07 shows cooks).

### Private panel on the phone (K-05)

- A game can show each phone a private panel: text, stats, cards, choices and a tappable grid,
  seen only on that phone. It fits every phone size from 667 × 375 up without breaking a word;
  grid labels step down together (D-140); a change crossfades without blur (D-056), a whole-panel
  change fades as one surface, and a card turns face-up in perspective (610 px token). Rapid
  back-to-back changes leave no stray styles. Evidence: `uat/evidence/K-05-private-panel/round7/`.
  Tilt, shake and swipe area (the rest of CTRL-003) do not exist yet.

### Start a game from the picker (C-16)
Start loads the chosen game (Rabakz's question bank only when Rabakz is picked), runs it, shows its
TV screen and sends each phone its controller; pause and quit go back to the picker with the same
players. The results screen names winners and ties at the largest size that fits and falls back to
seat numbers only when a name cannot fit. UAT: `uat/evidence/C-16-start-game/round14/`.

- **Phones show each game's private view and theme (C-16b, 2026-11-18).** The phone draws its own
  private view (Rabakz's score panel, Peek Poker's hand) beside the controls, and takes the game's
  phone theme while a game is playing or paused; console on every other screen. Text on panels stays
  readable in every theme. Evidence `uat/evidence/C-16b-private-panel/round3/`.

- **Peek Poker phone (P-03, merged 2026-11-18).** While memorising, the phone says Watch the TV
  with the seconds; during the pick it shows a private face-down 4 × 4 grid: tap two cards (tap
  again to deselect), then Lock in (144 × 144, words only). Once locked it reads Locked in / Watch
  the TV for the reveal; at the reveal it shows your own five cards, the hand's name, your points,
  and a small note if picks were filled at random; then Scores on the TV, and Match over at the
  end. Phones receive only their own picks; the TV view carries no picks until the reveal. The
  play-area felt now covers the whole phone page in every game. Tested at 1, 2 and 8 phones at
  667 × 375 and 844 × 390; controller cold start 168.7 ms median. Not yet: the TV table in the
  console (P-06/P-07), real phones (K-07). Evidence `uat/evidence/P-03-phone-pick/round1-p8/`.

## Does not exist yet

- No controller or game screen yet; the picker stops at "Starting…" until C-10 wires the session.

## Design gate

| Board | Status |
|---|---|
| 0 Art finish | Done: route D (Blender) |
| 0B End-goal vision | Published 2026-11-16 for Randy to see before the build starts |
| 1A Modelling approach | Done: chunky toy, scripted, one body with 8 heads (D-037) |
| 1 3D art style | Done: C, matte finish, daylight, camera at 60° (D-044) |
| 2 Visual identity | Done: C Marble table as the general rule (D-042) |
| 2B A theme for each game | Done: R1 Bandung, K1 Green baize, T1 Order chit (D-043) |
| 3 Big-screen layouts | Done: 1B, 2A, 3A, 4B, 5A; versus interactions rotate (D-046) |
| 4 Phone controller | Done: 1A with shape buttons in our colours, 2B, 3A, 4B (D-047, D-048) |
| 5 Motion | Done: 1B, 2A, 3A, 4A (D-051). **Gate closed 2026-11-16.** |

### Render jobs (A-01b, A-01d)
`pnpm assets --render` re-renders a job only when its content changes: each job has an id and a
committed stamp of its script, inputs and arguments, so merges no longer re-render other issues'
art. `--only <id>` renders one job, `--check-stale` lists stale jobs and fails if any are stale,
each job may set `timeoutSeconds`, and an interrupt or timeout kills Blender's whole process group
(checked with a real 5 s limit). Lossy encoding is refused for pages with more than one frame.
Evidence: `uat/evidence/A-01b-render-jobs/`.

### Dishes and ingredients (A-04)
Tabao Rush's ingredients, containers, the seven dishes in each state and their order-card icons
are rendered in Blender (`tools/blender/items.py`) into one atlas (254 × 940, 236,330 B). Served
dishes are built from their parts (kaya toast with kopi or teh in a side cup); checks keep every
portion inside its container and visible. Evidence: `uat/evidence/A-04-dishes/round9`, `round11`,
`round12`. A-10 polish is done: a mixed rojak heap, cream turnip (D-173), flat sliced chicken with a skin
band, a broth rim and cup contents (`uat/evidence/A-10-dish-polish/round5`, 40 sheets). Not yet
drawn in a game (T-07, T-18); the chicken's look and the cup contents are judged on the TV at 3 m.

### Peek Poker table on the TV (P-04)
A development page (`games/peek-poker/dev/`) draws the TV table for 1 to 8 players: the 16-card
grid and 3 shared cards, the memorise countdown, swaps of two cards or two rows on arcs (one ease,
rows staggered with the upper one lifted, D-155, D-158), seat markers as players lock in (never
what they picked), and the reveal turning every card over with each player's picks marked by
seat colour and number, then the ranked hands list wiping in. Reduced motion shows the end state
with a "Swapped" outline. With 8 players the frame time stays at 16.7 ms median and 18.7 ms worst
(`uat/evidence/P-04-table/perf-8-r5/`). The console now loads the table (P-06). Start holds "Starting…" while the card atlas, the four table fonts and the table's warm-up finish, then crossfades to the table with no blank frame (instant with reduced motion). Nothing is requested after Start, and picks stay hidden on the TV until the reveal, checked at 1, 2 and 8 phones (uat/evidence/P-06-table-in-console/round5-*). A headed 8-phone run of one console round (development build, other jobs running) kept frames at 16.7 ms median, 17.4 ms 95th percentile and 17.7 ms worst, with none over 50 ms. Preparation behind "Starting…" has one 233 ms frame before the round (perf-8-r5; budgets not assessed: one round, not 180 s). A production build now ships every atlas the asset manifest names, at both detail levels, beside the manifest. One phone starts Peek Poker from it and reaches memorise, and the phone shows the green felt behind cream text, repainted in place when the room's theme changes (uat/evidence/P-08-production-atlas/prod-r4). Not yet: an assessed full-match run (P-09). When five or more players pick one card, the seat markers cover the lower half of its face; rank and corner index stay readable (OQ-043).

### Playing cards (A-08)
The full Peek Poker deck exists as art: 52 faces, the back and five flip frames, rendered in
Blender from `tools/blender/cards.py`. Ranks are DM Sans Bold (D-150) at one shared height, so the
10 reads like the rest; suits differ by shape and colour and stay distinct in greyscale. One atlas,
915,460 B. Evidence: `uat/evidence/A-08-cards/round4/`. Cards are not yet drawn in a game; flips,
swaps and the reveal at runtime are P-04.

### Team setup (C-11)
For a game with teams, the leader turns Teams on, and the TV shows two sides split by a centre line
(D-143), balanced by seat. Each player taps Red or Blue on their phone; the leader can also move
anyone across. Teams may be uneven but each keeps at least one player (D-149). A chip that changes
team travels on an arc; a refusal shows only on the phone that tapped, and the TV names who was
refused. Team mode and the last split carry over to Play again. Evidence:
`uat/evidence/C-11-team-setup/round4-phones4`, `round4-phones8`, `round5-phones8`. Teams are not
yet shown during play (the games' own issues).

C-11b polished the leader's "Move players" grid (D-152, D-153): two halves headed Red and Blue
across a divider, columns sized by each side, every ordinary name on one line at 21 px or more (a
name too long is truncated, never shrunk), Done, Back and Start in one bottom row, every button at
least 55 px and inside the phone at 667 × 375 with 8 players in any split. A refusal on the
leader's phone takes the heading row for 3 seconds without moving anything, and shows again if
repeated. The Teams toggle is one button named "Teams" with a pressed state (tick, stronger border).
Evidence: `uat/evidence/C-11-team-setup/c11b-r8-phones8` (and the 4-phone run).

### Controller size and start-up check (K-08)
`pnpm verify` fails when the controller page and everything it loads passes 300,000 B gzip
(73,837 B today). `pnpm perf -- controller` builds for production, opens the controller page five
times in headless Chromium slowed 4x and fails when the median time to interactive passes 2 s
(D-148); it measured 221 to 252 ms on the dev Mac. A real phone has not been measured.

## Performance numbers

PERF-020 is assessed in an emulated browser (K-08: start-up median 252 ms of 2,000 ms, controller
73,837 B gzip of 300,000 B); no other budget has been assessed yet. Diagnostics from `pnpm perf` on the dev Mac (Apple M3,
2026-11-17, other jobs running, so rough): simulation step at eight players, 95th percentile
0.008 ms for Tabao Rush and under 0.001 ms for Peek Poker and Rabakz; game-only allocation
per step at eight players about 27 KB (Tabao Rush), 10 KB (Peek Poker), 10 KB (Rabakz); lobby
with eight phones on a 75 Hz display, frame time 95th percentile 14.1 ms, worst frame 120 ms.

| Date | Slice | Players | Frame p95 (laptop) | Frame p95 (TV) | Input p95 (direct) |
|---|---|---|---|---|---|

## Real-device checks

None run yet (`UAT.md` §5).

## Known gaps and risks

- **Test limits under load (C-20, merged 2026-11-19; PLAT-030–033).** Every conformance test has its own limit, 4× its slowest measured run taken alone (at least 15 s; Tabao Rush recipes 552 s); the fixture-game conformance tests run about twice as fast. The asset-pipeline Python suite has 156 s and says when it was killed. The whole-match game tests (30–72 s each when run alone at load 6–8) were not made cheaper; they still pass because their limits are larger. No performance budget changed (D-259).

- Performance budgets are targets, not measurements, until M2.
- Whether the TCL Q65's own browser can run the game is unknown (REL-005).
- Names are not checked for trademarks (OQ-001).
- Boards 1, 3, 4 and 5 still need Randy's choices; nothing visible is built before them.
