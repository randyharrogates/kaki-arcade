# R-03 evidence report

Automated evidence only. Browser UAT and independent review are pending with the integrator.
No server or browser was launched, and no screenshots were taken or inspected by this agent.
Geometric fit and contrast tests do not establish a visual pass or 3 m readability.

## Automated checks

`VITEST_MAX_WORKERS=2 pnpm verify` passed completely (exit 0).
133 test files passed; 3,117 tests passed and one pre-existing test was skipped.
Workspace, typecheck, ESLint, design lint (271 files), tests, build/budgets and trace passed.
The full final output is `verify.txt`. A preceding evidence run hit only the known
unchanged Tabao Rush recipes conformance 120,000 ms timeout under load; it is preserved
as `verify-load-timeout.txt`. The full command was rerun with unchanged checks and limits.
Targeted screen suite: 19 tests passed. Covers real-rule scenarios, public secrecy under
scramble, fit at 720p/1080p/2160p, contrast and absence of time-pressure fields/elements.

## Per-screenshot inspection

| Screenshot | State / resolution | Acceptance checked | Result | Inspector / notes |
| --- | --- | --- | --- | --- |

## Integrator work remaining

Follow the state URLs, keyboard controls and UAT script in
`docs/slices/R-03-rabakz-screen.md`. Capture longest content in both question and reveal
at all three resolutions, eight wide nicknames, every required state, reduced motion,
and frame strips for stagger/mask/pulse/count-up/overlap. Inspect every image before
recording any visual result. TV performance and readability need actual device evidence.

## Final verify tail

```text

✓ built in 107ms
PERF-022 host: 130315 bytes raw, 45415 bytes gzip / 1500000
PERF-020 controller (shared entry): 130315 bytes raw, 45415 bytes gzip / 300000
PERF-022 deploy: 130315 bytes raw, 45415 bytes gzip / 1500000
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

## Integrator's browser check, round 1 (2026-11-17)

Dev page at 1920×1080 (eleven states) and 1280×720 (three), desktop Chromium. Files in
`round1/`; the eight on the two contact sheets were opened, the other six were not.

- **As built, every state was a blank white page.** Three inline styles passed bare numbers
  (viewport width and height, two font sizes); Preact writes them as they are and CSS ignores a
  length with no unit, so the viewport was 0 px tall. The unit tests could not see this. Fixed
  by the integrator (`px()` in `host/Screen.tsx`); the screenshots are from after that fix.
- Faults seen in the screenshots are listed in fix round 1's brief: the prompt wraps at under
  half the width; the players list is headed "Answered" while every row says "Ready"; the wrong
  mark is a strike-through and a tiny cross; "Locked out" wraps; the reveal shrinks and moves
  the prompt and stacks unlabelled "+100 / 100"; the demo question's option names fight their
  shapes.

## Codex round 1 corrections

Inspected the existing round1 open, one-winner and longest-text JPGs. Corrected CSS
length boundaries, canvas-based fitting, Players/status copy, trailing Wrong marks,
stable prompt geometry, labelled/staggered awards, seat markers and neutral demo content.
Detailed element-by-element board comparison and 2160p script are in the slice note's
Round 1 section. No integrator text or round1 image was changed.

Targeted screen suite: 21 passed. Dimmed surface text contrast and original-paint shape
contrast are covered separately. A browser attempt failed because the sandbox rejects
Vite's local listening socket (EPERM); see round1-fix-browser.txt. No fresh screenshot,
visual acceptance or 3 m readability pass is claimed.

The intermediate verify-round1-fix.txt run passed 133 files, 3,119 tests (one skipped),
build/budgets and trace. The later verify-round1-final.txt run hit the brief's known
unchanged Tabao Rush recipes conformance timeout under load. Final source verification
will be recorded below after rerunning with the same checks and limits.

### Final source verification

`VITEST_MAX_WORKERS=2 pnpm verify` passed (exit 0) on the final source.
133 test files passed; 3,119 tests passed; one existing test skipped. Workspace,
typecheck, ESLint, design lint (271 files; no new exemptions), tests, build/budgets
and trace all passed. Full output: `verify-round1-rerun.txt`.

```text
✓ built in 56ms
PERF-022 host: 130315 bytes raw, 45415 bytes gzip / 1500000
PERF-020 controller (shared entry): 130315 bytes raw, 45415 bytes gzip / 300000
PERF-022 deploy: 130315 bytes raw, 45415 bytes gzip / 1500000
no asset sets in assets/src yet
$ python3 tools/trace_check.py
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

## Integrator's browser check, round 2 (2026-11-17, after fix round 1)

Eleven states at 1920×1080 with eight players, three at 1280×720 and the longest text at
3840×2160 (saved scaled to 1080p). Files in `round2/`. Opened: open, wrong-marked, locked-out,
reveal-one-winner, reveal-tie, reveal-nobody, picture and longest-text at 1080p. Not opened:
some-answered, one-player, eight-players, the three 720p shots and the 2160p shot. No page
scrolling at 1080p or 2160p; no console errors.

Fixed and seen: the prompt uses the full width at 89 px; players are headed "Players" with
"Thinking" and "Locked out" (icon and word); a wrong option carries "Wrong" at its trailing
edge and is dimmed; the prompt keeps its size and place at the reveal; awards read "+100 won"
and "100 pts"; winner lines are plain; the demo question no longer names shapes.

Still wrong: the picture state's slot is a small chip, not a 1.618:1 media panel, and the
prompt beside it is off-centre; the reveal's options and awards sit at different heights in
the one-winner state than in the tie and nobody states; every non-winner row repeats
"+0 won / 0 pts". Not checked: any motion (stagger, overlap between questions, the mask
reveal, the count-up), reduced motion.

## Integrator's browser check, round 3 (2026-11-17, after fix round 2)

1920×1080, eight players, files in `round3/` (`r03-70-<name>.jpg`). Opened: picture, longest,
rev1, nobody, enter-60, overlap-189, mask-94, count-494. Not opened: tie, mask-189,
reduced-rev. Measured in the page: the four option rows sit at the same heights (268, 435,
602, 769 px) in the one-winner, tie and nobody reveals; no scrolling; no console errors.

Fixed and seen: the picture is a real panel beside the prompt and options; the longest prompt
and options fit beside it; the reveal no longer shifts between states; only winners show
"+100 won", every row shows its total. Frozen-motion shots: at 60 ms two of four options have
entered (stagger); at 94 ms into the reveal the correct option is part-way through a
left-to-right mask while the others dim; at 494 ms the winner's total reads 88 on its way to
100.

For the review to judge: between questions the old and new option texts crossfade on top of
each other and are both legible mid-way (overlap-189); at the reveal the options re-enter in a
single column rather than the same rows moving; the demo's "next" question repeats the same
prompt. Not checked: 720p and 4K after this round, a real TV at 3 m, real pictures.

## Integrator's browser check, round 4 (2026-11-17, after fix round 3; D-097)

1920×1080 unless named; files in `round4/` (`r03-80-<name>.jpg`; the 2160p shots are stored
at half size). 28 shots taken. Opened: open, wrong, locked, rev1, tie, nobody, one-player,
picture-wrong, picture-reveal, longest-reveal, wide-names, three-winners, departed, the real
question-to-reveal change at 94, 189, 566 and 987 ms, the reveal-to-next-question change at
94, 189 and 377 ms, both changes with reduced motion, longest-reveal at 720p and wide-names at
2160p. Not opened: picture-wrong and wide-names at 720p, longest-reveal and picture-wrong at
2160p. Measured in every shot: the four options keep the same positions from question to
reveal; nothing inside an option extends past its card; no scrolling; no console errors.

Seen working: the reveal keeps the 2 × 2 grid and the players strip in place; winners gain a
tick and "+100" and totals count up (26, 47, 92, 100 across the four frames); the correct card
stays, its "Correct" mark wipes in (cut off part-way at 94 ms) and the card is slightly larger
at 566 ms (the pulse); "Wrong" sits inside its card on a picture question; three dots beside
"Thinking"; twelve wide glyphs and emoji wrap inside their seat; one player is one seat; a
departed winner is named in the sentence and absent from the strip; reduced motion shows the
end state.

Seen wrong: the picture panel has shrunk to a thumbnail about 230 × 140 px beside the prompt
(round 3 had a real panel); a locked-out seat reads "Answered ⊘ Locked out", two statuses at
once. For the review: the options use the top half of the screen and the lower fifth is empty
with eight players. Not checked: a real TV at 3 m, real pictures, real fonts.

## Integrator's browser check, round 5 (2026-11-17, after fix round 4)

23 shots in `round5/` (`r03-90-<state>-<height>.jpg`; 2160p stored at half size): eleven
states at 1080p, five at 720p, five at 2160p and two frozen changes. Opened: all eleven at
1080p, the picture reveal part-way (t-pic-rev-189), open, picture-wrong, longest-reveal and
wide-names at 720p, picture-reveal and longest-reveal at 2160p. Not opened: picture-reveal at
720p, open, picture-wrong and wide-names at 2160p, t-rev-566. Measured in all 23: options in
the same place in question and reveal for each layout, nothing past a card's edge, no
scrolling. One console error, a 404 for a file the dev page asks for (not looked into).

Seen right: the picture is a panel 686 × 424 px at 1080p (1.618 : 1) on the left with the
prompt and options beside it, and stays through the reveal; with the longest text the panel
drops to 377 × 233 px and everything still fits at all three sizes; short answers are now
large and the option rows fill the height; a locked-out seat reads only "Locked out".

For the review: in the picture layout the shape sits under the answer text, while without a
picture it sits to the left of it; "Correct" and the seat marker wrap onto two lines in the
narrower picture-layout card. Not checked: a real TV at 3 m, real pictures, real fonts.

## Integrator's browser check, round 6 (2026-11-17, after fix round 5; D-101)

36 shots in `round6/` (`r03-a-s-<state>.jpg` settled, `r03-a-t-<change>-<ms>.jpg` frozen
part-way through a real change; 1080p unless named, 2160p at half size). Opened: all twelve
settled 1080p states; next-question at 94, 189, 377 ms; reveal at 189, 754, 1197 ms; picture
to plain question and plain to picture at 94, 189, 377 ms; short to longest text at 189 ms;
a winner leaving before and during the reveal; both reduced-motion shots; three winners at
720p. Not opened: reveal at 0 ms, and picture-reveal, longest-reveal at 720p and all three
2160p shots. Measured in all 36: no scrolling, no console errors. Three option children
extend past their card in the frozen next-question and picture-to-plain frames (content in
motion), none in any settled state.

Seen right: chooser markers are whole 55 px discs with their numerals inside; "Correct" and
its markers sit on one line; the shape is left of the text in every layout; answers are one
step below the prompt (55 under 89, 34 under 55); a correct answerer reads "Thinking" until
the reveal; a departed winner leaves an empty place, nobody shifts, and the marker stays on
the Correct row; nobody-got-it shows no winner marks; between questions the dimming wipes
away across each card; a picture grows in and shrinks out while the prompt and options move
to their new places; the count reads 47, 99, 100 across the reveal frames; reduced motion
shows end states.

For the review: in the picture layout answers are 34 px in cards about 212 px tall, which
reads small beside the picture; part-way through a layout change the prompt passes behind the
moving cards. Not checked: a real TV at 3 m, real pictures, real fonts (none ship yet).

## Integrator's browser check, round 7 (2026-11-17, after fix round 6): not accepted

Dev page at 1920 × 1080 (plus two states at 1280 × 720 and 3840 × 2160). Nine contact sheets in
`round7/`, all opened. Sheets C and D and the top of E were shot too early (0.45 s after load,
before the page switches to the second state) and show the starting state only; they are kept
but prove nothing. Sheets F to I repeat those frames after 3.6 s and are the ones to read.
`window.__rzOverflow()` returned no offenders on every frame.

Right: reveal marks wipe in by mask (F b2; G c1, c2); the answer text is 55 px over a 55 px
prompt on a picture question; a departed seat leaves its place empty (H c7, c8); long names and
long answers stay inside their cards at all three sizes.

Wrong:
1. The success ring is a dark rectangle that stays on the correct card for good. It is inset
   34 px, so it cuts through the shape icon and strikes through "Correct" (every reveal frame,
   settled states s1 and s2, reduced motion d2 and d3, 720p and 4K). It was meant to be one
   pulse that ends invisible.
2. A change of layout between questions (H c3, c4, c5; I d4) shows the prompt cut through the
   middle of its letters, the picture's label cut off, and answer cards parked in between
   positions with gaps. Moving every piece separately does not read as one change.
3. At the first frame of a reveal the winner's name jumps right to make room for its tick
   (F b1).

Not checked: real speed by eye, a TV, fonts (fallback fonts throughout).

## Integrator's browser check, round 8 (2026-11-17, after fix round 7): accepted for review

Dev page at 1920 × 1080 only; transition frames taken after the page's new ready signal. Three
contact sheets in `round8/`, all opened (20 frames). `window.__rzOverflow()` returned no
offenders on every frame.

- Reveal (sheet A, 0 to 600 ms; sheet C, 754 and 1,197 ms and settled): nothing is left drawn
  on the correct card; the card's edge is faintly stronger at 470 ms and gone by 600 ms; the
  tick follows the winner's name and the name does not move at 0 ms; marks wipe in by mask.
- Layout change (sheet B c1 to c5): one vertical boundary crosses the question block, the new
  block to its left and the old to its right, both at full strength; nothing travels; text is
  cut only where the boundary crosses it.
- Same layout, next question (B c6) and reduced motion (C d1, d2): as before.

For the review: at the boundary the old and new prompts sit side by side in different sizes
for the length of the wipe (B c2, c4, c5); in B c3 the seat status lines are caught mid-wipe
with their descenders cut. Not checked this round: 720p and 4K (checked in round 7 for
settled states), real speed by eye, a TV, fonts (fallback fonts throughout).

## Integrator's browser check and first performance run, round 9 (2026-11-17, after fix round 8)

Dev page at 1920 × 1080; transition frames taken after the page's ready signal. Two contact
sheets in `round9/`, both opened (12 frames; two more frames, 377 and 754 ms, were taken and
not opened). `window.__rzOverflow()` returned no offenders on all 14 frames.

- Pulse (sheet A): the correct card's edge is drawn in the option's blue, 8 px. Measured
  opacity 0.00 at 0 and 189 ms, 0.01 at 377, 0.35 at 470, 0.93 at 528, 0.24 at 600, 0.00 at
  754 and 1,197 ms and in settled states; no ring element under reduced motion. Visible in
  the frames at 470 and 528 ms.
- First mount of a four-line prompt: no block mask appeared in the first 1.5 s (measured in
  the page), so the wipe no longer plays over unchanged content.
- The tick sits after the name with a gap; long names keep it on the last line (sheet B s3).
- Layout change and next question (sheet B c1, c2): as in round 8.

Performance (`pnpm perf -- rabakz-screen`, copy in `perf-run-1/`): exit 0 with a Codex job
running, so not a quiet machine. 809 frames on a 60 Hz display: median 16.7 ms, 95th
percentile 18.3 ms, worst 217 ms, no long task. All budgets "not assessed". The 217 ms frame
is at 4,134 ms, inside the first change to the picture layout (cycle 1); the four later
cycles have none. It did not reproduce in the dev page: three transitions (to picture, to
reveal, to the longest text) showed no frame over 40 ms, no long task, and about 1 ms in
total spent measuring text. With no long task behind it, it is not script on the main
thread; first-time painting of that layout or the machine are the candidates. Unexplained.

Repeat run (`perf-run-2/`, with no other job of the integrator's running; load average 3.0 at
start, so not proven quiet): 812 frames, median 16.7 ms, 95th percentile 17.2 ms, worst 17.7
ms, nothing over 50 ms, no long task, page never hidden. It covers the same first picture
wipe with no slow frame. So: one 217 ms frame, no long task, not reproduced in a repeat run
or in three dev-page transitions; cause unknown. To recheck in the PERF-001 round scenario.
The scenario cannot fail on frame time (every budget is "not assessed"); it is evidence to
read, not a gate.

Not checked: 720p and 4K this round; a TV; real fonts.

## Integrator's fixes at merge (2026-11-17, after the fifth review)

Two fixes the fifth review found by reading the code; no frame can show them because every
fixture keeps the same prompt and options across a wipe. (1) Text inside a wiping block no
longer runs its own crossfade (`Copy` reads `BlockMotion`), so a question change that also
changes the layout is one mask edge (D-105 a). (2) A second question change during a wipe
keeps its own wipe: cancelling releases the old snapshot only when reduced motion changed.
Unit tests in `screen.test.ts`. Not photographed.
