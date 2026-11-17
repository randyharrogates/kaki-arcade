# C-09 — Integrator UAT report

Browser UAT and screenshots are pending. The issue agent did not start a browser,
wrangler or the network. No screenshot or visual pass is claimed.

Use the URL matrix and UAT script in `docs/slices/C-09-game-picker.md`.
Check DESIGN §6, especially no scrolling at all three TV sizes, legible side-tile
copy, focus without colour, the same tile expanding/collapsing and reduced motion.

| Screenshot | Viewport | Acceptance statement | Observed result | Reviewer |
|---|---|---|---|---|

Automated validation only: `VITEST_MAX_WORKERS=1 pnpm verify` passed with
136 files and 3,129 tests passed, one existing skip. See `verify-tail.txt` and
`bundle-sizes.json`. These results do not establish a visual or browser UAT pass.

## Integrator's browser check, round 1 (2026-11-17)

Demo states on the dev build in desktop Chromium: host at 1920×1080 (five states) and 1280×720
(two), phones at 844×390 and 390×844 (four states each). Files in `round1/`. Opened: the four
host states on the first sheet, the two 720p shots and the four landscape phone shots; the
portrait phone shots were seen only at thumbnail size and `picker-8-peek` was not opened.
No scrolling at either host size and no console errors. Not checked: any transition (focus
move, expand, collapse), reduced motion, 4K, real pairing with a leader and a watcher.
Faults seen are listed in fix round 1's brief.

## Integrator's harness run, round 2 (2026-11-17, after fix round 1)

`pnpm uat -- C-09-game-picker --max-mb 24` on ports 5170 and 5171: exit 0 on the fifth run
(the first four stopped on the size cap twice and on two script timing faults, fixed by the
integrator in the script). Kept in `round2/`: the 27 real-pairing shots, the six 1080p demo
states, the reduced-motion shots, the three strips at half size, `run.json` and the generated
report. Not kept: the 720p and 4K demo shots.

Opened by the integrator: real-pairing shots 01 to 09, 16 to 18 and 22 to 27 (host, leader
and watcher at: picker open, focus moved, selected, starting, leader left, room empty), and
the expand and focus strips. Not opened: shots 10 to 15 and 19 to 21, the 1080p demo states,
the reduced-motion shots and the collapse strip.

Seen working with two real phones: the leader opens the picker and the TV and the watcher
follow; focus moves on all three; Select grows the same tile into the start screen; Start
reaches "Starting…" on all three; when the leader leaves, the other phone gets the controls
and the TV says who is choosing; with nobody seated every game says "Needs at least 1 player".
The script asserts the grown tile is the same DOM node and that the second strip frame is
part-way through.

Seen wrong or doubtful, for the review: during the focus and expand moves the tile's text is
stretched (the tile is scaled, not re-laid out); on expand the other two tiles vanish in the
first frame instead of leaving; "Leave" is now a very small underlined link; the start screen
is still mostly an empty picture slot with "Who's in" small at the right; one run of this
script writes 14 MB against the 12 MB cap (full-screen strips and two 4K stills).

## Integrator's harness run, round 3 (2026-11-17, after fix round 2): failed

`pnpm uat -- C-09-game-picker --phones 2` stopped in the fourth step. Kept in
`round3-failure/`: shots 07 to 12 and `run.json`. Opened: 09 (watcher on the start screen),
10 (TV at the failure), 11 and 12 (both phones at the failure). Not opened: 07 and 08.

The script pressed Select, Back, then Select again. After the second Select the TV stayed on
the picker for 15 s, and its focused tile is cut off to a strip about 380 px wide with the
title reading "Peek Pok": the collapse mask was left on the tile. The leader's phone still
shows the picker controls, so the second Select was not acted on. Two faults for Codex: the
mask is not cleared when a collapse ends or is interrupted, and a press that follows another
within the flood limit is dropped silently. Seen right in the same shots: Leave is a full
button on both phones, and the watcher's start screen reads "Cloud Noodle starts the game".

## Integrator's harness runs, round 4 (2026-11-17, after fix round 3): real flows pass, portrait phone fails

Two runs of `pnpm uat -- C-09-game-picker --phones 2`. The first stopped where the script
asserted the picker was gone while it was still crossfading out over the lobby; the integrator
changed that line to wait for it to leave. The second ran the real two-phone steps to the end
(Select, Back, Select now reaches the start screen; host reload returns to the lobby; the
leader leaving hands over; the last player leaving returns the TV to the lobby with its code)
and the TV demo states, then failed "No scrolling" on the leader's phone in portrait.
Kept in `round4-failure/`: that phone shot and `run.json`. Opened from these runs: the TV on
the start screen with two and with eight players, the TV after the leader left, the TV lobby
after a reload, the TV mid-crossfade at the first failure, and the portrait phone shot. Not
opened: the other 19 shots of the second run.

Seen wrong on the portrait phone (390 × 844): the larger Leave button no longer fits the top
row, drops to a second row on its own, the nickname is cut to "Cloud Noo…", and the page
scrolls. Seen on the TV start screen for the review and the design board: the header wraps to
two lines ("Cloud Noodle starts the game on their phone"), and the game text sits centred
beside the picture slot rather than on a baseline.

## Integrator's harness run, round 5 (2026-11-17, after fix round 4): passes; motion still wrong

`pnpm uat -- C-09-game-picker --phones 2 --max-mb 24`: exit 0, 15 steps, 9.1 MB, 48 images,
all kept in `round5/` (4K stills at half size). Opened: every TV still (19), the first nine
landscape phone shots and the first eight portrait phone shots, and the three strips. Not
opened: 15, 31 to 36, 59 and 60, and the three reduced-motion TV stills.

Seen right: the real two-phone flow from picker to start, reload, hand-over and empty room;
"Needs at least 1 player" on each tile; the start screen with picture and text above a seat
strip (layout B) at 720p, 1080p and 4K with one-line header "<Leader> starts on their phone",
including a twelve-W name; the load-failure message; the portrait phone header in two rows
with a full-size Leave and the whole nickname; disabled Select and Start struck through with
the reason beside them. Expand strip: the tile grows by mask, no text is stretched, the other
tiles stay visible underneath.

Seen wrong, for Codex: (1) focus strip: each tile's old and new text are both drawn at full
strength in different places for most of the move ("Tabao Rush" twice, "Peek Poker" twice),
and one tile's text runs over another's ("Peek Poker" over "Rabakz") because the text travels
separately from its surface; the picture slot also floats away from its tile. (2) collapse
strip: the "Who's in" seats are squeezed into narrow columns ("Noodl e", "Mang o") and sit on
top of the returning game text, both legible. (3) on the real start screen (shot 07) the
header is drawn smaller than in the demo states with the same name, and "2 of 8 players" sits
below the header line rather than level with it.

## Integrator's harness run, round 6 (2026-11-17, after fix round 5): passes

`pnpm uat -- C-09-game-picker --phones 2 --max-mb 24`: exit 0, 15 steps, 9.0 MB; everything
kept in `round6/`. Opened this round: the three nine-frame strips only (the stills were opened
in round 5 and the script's assertions on them passed again; they were not re-opened).

Strips, at one tenth speed. Focus: each tile now travels as one object above the others; no
tile shows two full-strength copies of its text and no text is drawn over another tile.
Expand: the tile grows by mask over the other two, which stay visible until covered; the start
screen's text and seats are revealed by the mask; nothing is stretched. Collapse: the start
content keeps its size and fades to a ghost while the picker text returns; the seat chips are
not squeezed; the other tiles are uncovered from the right.

For the review: during a focus move all three tiles' text is ghosted for most of the move,
including the tile that does not change (Rabakz), so the tiles look nearly empty mid-move; in
every strip the old content is already a ghost in the first frame and the new content arrives
late, so roughly the first quarter shows faint text only. Not checked: real speed by eye on a
TV; frame time of the mask on the TV (PERF-002).

## Integrator's harness runs, round 7 (2026-11-17, fix rounds 6 to 9): passes

`pnpm uat -- C-09-game-picker --phones 2 --max-mb 24`: exit 0; everything kept in `round7/`.
It took eight runs to get there; `round7-failure/` keeps two failure frames.

What the runs found, in order:
1. Fix round 6 and 7: the new two-press step failed; tiles jumped about 418 px on the first
   frame. Measuring a plain single move in a browser showed it was broken too. Two causes:
   a zoom factor computed from a stale tile width (Codex, round 8), and the stage grid's
   columns growing with their content while a tile's width was animated (fixed by the
   integrator: `minmax(0, 1.618fr) minmax(0, 1fr)`). Measured after: first frame equal to
   the settled layout on all three focus moves and one interrupted at 60 ms; no tile leaves
   the stage.
2. Fix round 9: old and new text drawn over each other for the whole move. The outgoing
   copy's mask was paused: its start time was copied from an animation that had not started
   (fixed by the integrator). Measured after: no overlapping text boxes at five instants of
   each focus move.
3. Three of the script's own new checks were wrong and were corrected by the integrator:
   one title per tile now applies to focus moves only (D-107); an interrupted move's first
   frame may differ by one frame of travel; the demo event re-applies the same change, so
   the expected end layout is the same after two events.

Opened this round: the three strips (nine frames each, now covering the whole move and the
whole screen), six TV stills and eight phone stills. Not opened: the other 34 images.

- Focus strip: one copy of each tile's text at full strength in every frame; the tiles pass
  over one another on the way; the last frame is the settled layout.
- Expand strip: the start layout is revealed by the growing tile; the other tiles stay
  until covered. Collapse strip: the reverse; the tile's title shows once in each layout
  for part of the move (D-107).
- Stills: a twelve-W leader name fits the start header at 55 px at 720p and 1080p, clear of
  the player count; "Needs at least 1 player" is whole in all three tiles; the leader's
  lobby phone reads "Pick a game when everyone's in."; disabled Select and Start are dashed
  with the reason beside them; the load failure shows a warning line on TV and phone.

For the review: during expand and collapse the TV header shows the old heading as a ghost
under the new one, and the two are different sentences, so for about a third of the move
the header reads as two lines printed on top of each other (expand frames 2 to 4, collapse
frames 2 to 5). This is the lobby's pattern (D-092 e) applied to text that is not alike.
The failure line on the TV is small. Not checked: real speed by eye on a TV; frame time of
the masks on the TV (PERF-002); 4K stills were not opened this round.

## Integrator's harness run, round 8 (2026-11-17, after fix round 10): passes

`pnpm uat -- C-09-game-picker --phones 2 --max-mb 24`: exit 0, first run; kept in `round8/`.
Opened: the three strips (27 frames). Not opened: the 49 stills (their assertions passed).

- Heading: changes by mask with its status line (D-108 a). The tile area (D-108 b) cannot
  be judged from the strips, which use a short name: see stills 18 to 21 below.
- Collapse frame 5 (1,514 ms): the outgoing heading is a ghost under the incoming one for
  about one frame-width of the boundary, the lobby's pattern (D-092 e); not two full-ink
  sentences. Expand frame 4 shows the same.
- Focus: as round 7.

Interrupted-move checks now pause, seek and compare within 2 px at 60 and 144 ms (D-108 d).
Not checked: real speed by eye on a TV, frame time of the masks on the TV (PERF-002), a
quiet-machine `pnpm perf` of the picker (no picker scenario exists yet).

Opened afterwards, at the advisor's prompting: stills 04, 05, 18 to 22, 39 and 50. With the
twelve-W name the stage top is at the same height on the picker and the start screen at 720p
and 1080p (D-108 b holds). Still 50 showed a fault: the focused tile had lost its ring at rest
(only the shadow under it showed), because round 10 moved the outline inside the tile where
the tile's positioned content covered it. Fixed by the integrator in 2aac53f (a ring layer
above the content).

## Integrator's harness run, round 9 (2026-11-17, after the ring fix and merging main): passes

Exit 0; kept in `round9/`. Opened: settled stills 05, 50, 61 and 72 (the ring is whole on the
focused tile in all four) and the expand strip (the ring travels with the mask and does not
pop in at the end). Not opened: the other 47 images.
