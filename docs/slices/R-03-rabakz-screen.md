# R-03 — Rabakz question and reveal screen

## Goal and requirements

Draw the host question and reveal from public snapshots: RZ-003, RZ-005,
RZ-006, RZ-030, RZ-031, RZ-034 and NFR-A11Y. Round 6 follows D-097, D-101 (except b) and
D-102, read from the main checkout decision log on 2026-11-17. This note
replaces the earlier round notes. The five requested round-6 review frames
(p2n-094, p2n-189, n2p-094, long-189 and rev-000) were opened before edits.

## Final behaviour and acceptance

- Persistent question, four option and player-strip surfaces retain their nodes
  at reveal. Options remain in a 2 × 2 grid. A picture remains at reveal.
- Shapes are left of answer text in every layout. D-102 answers take the largest fitting step: 89/55, 55/55,
  55/34 or 34/34. Typical picture questions use 55/55 beside a roughly
  686 × 424 px picture. Spare height pads the rows.
- Normal pictures retain the secondary-media : primary-copy golden split, with
  a panel at least 377 px high. Fit can shrink to 233 px high. Maximum copy
  needs a further compact fallback after the left-hand shapes and 55 px picks
  are reserved: a 233 × 144 px (approximately) golden panel beside the prompt,
  with full-width answers below both. The two-row grid and 377 px strip stay.
  This is the D-101 refit; the previous shape-under-text fallback is removed.
- Fit reserves all eight chooser discs, two mark lines when necessary, a
  two-line outcome, and eight two-line names with scores. Chooser discs are
  55 px with 34 px numerals, line-height 1 and centred alignment. Their grid
  sizes to its actual chooser count, so Correct and a single pick share a line.
- Public snapshots conceal correct-answer activity during an open question:
  every public field is identical before and after a correct tap. Seats keep
  saying “Thinking”. Only a wrong tap changes a seat to “⊘ Locked out”;
  waiting joiners say “Next question”. There is no open “Answered” status.
- Each seat has its own grid row and column derived from its seat number.
  A departure leaves its place empty. Winner identity retained by the rules
  supplies departed winners' chooser markers, both before and during reveal.
- Correct marks wipe over duration.slow (377 ms). Correct-card confirmation
  pulses only when there is a winner. The pulse scales a separate inner ring,
  inset 34 px so its whole outline stays inside the card even at scale 1.05;
  it returns exactly to scale 1 and cannot invade a gap or safe margin. The outcome
  does not pulse. Veils and outlines mask in over 377 ms and out over 302 ms.
- Dimmed cards have no panel-coloured shape chip. Their shape colours blend
  toward the panel ink by the ghost token, keeping contrast above 3:1 on the
  dimmed gradient. Normal shapes retain the shared answer colours.
- Across questions, each box (including each card) lays out at final geometry.
  FLIP translation and a clip show the previous bounds with ease-in-out over
  duration.slow. No width, height, top, left or grid-track keyframes are used.
  The picture remains at final size; its mask edge follows the moving copy
  edge on the same curve and duration. Picture paints below cards below prompt.
  Each box clips its own content. Reduced motion applies state with no animations.
- Copy identities include phase/wrong set for marks and reveal status. Outcome,
  winner tick, award, Wrong and Locked out mask in, including blank-to-visible
  changes. Chooser masks stagger 30 ms after Correct. Names, category, heading,
  Players and Thinking have independent identities, so unchanged copy stays put.
- A fixed seat slot retains departing copy for its 302 ms exit mask and then
  stays empty. The marks row reserves its full height even when empty; outgoing
  marks copy fills that same row, including when incoming marks are empty;
  other outgoing copy retains measured bounds. Nothing relies on a collapsed box. The dev page exposes window.__rzOverflow(), returning
  descendant bounds outside any card (1 px rounding tolerance).
- Each mounted screen caches fit by question id, measure identity and font
  epoch. Output dimensions do not affect the artboard fit or its cache key.
  Canvas creation stays in the mounting effect. Rejected document.fonts.load
  or fonts.ready promises are caught; the current fallback fit remains.
- CSS has one definition for the option grid, marks and shape arrangement;
  the picture overrides, duplicated dimming rules and chooser size override
  are removed. The dev page has an empty data favicon.
- Initial unsupported snapshots draw nothing; later final, scoreboard and
  over snapshots retain the preceding screen. R-05 owns their new content.
- All measured CSS lengths have px units. Rules remain DOM-free; host has
  its own DOM-enabled tsconfig. No dependencies or contracts were changed.

## Carried to other slices

R-05: final-round announcement (RZ-009), big-screen streak (RZ-008), scoreboard
and game-over presentation. R-13: real question photographs, alt and credit
(RZ-025), replacing the neutral picture slot. F-06b: bundled font faces.

## Integrator UAT script and exact URLs

Start from the worktree root:
`apps/web/node_modules/.bin/vite games/rabakz --host 127.0.0.1 --port 5230`.
Use 1920×1080, then 1280×720 and 3840×2160. Each from/to page settles its
initial state for 1197 ms, then makes the real state change and seeks its
animations to at (milliseconds). Two animation frames allow copy effects to
apply before seeking. Without at it plays normally; slow=K multiplies timing.

Reveal → next question:

- http://127.0.0.1:5230/dev/index.html?from=reveal-one-winner&to=next-question&at=94
- http://127.0.0.1:5230/dev/index.html?from=reveal-one-winner&to=next-question&at=189
- http://127.0.0.1:5230/dev/index.html?from=reveal-one-winner&to=next-question&at=377
- http://127.0.0.1:5230/dev/index.html?from=reveal-one-winner&to=next-question&at=94&reduced=1
- http://127.0.0.1:5230/dev/index.html?from=reveal-one-winner&to=next-question&at=189&reduced=1
- http://127.0.0.1:5230/dev/index.html?from=reveal-one-winner&to=next-question&at=377&reduced=1

Open → reveal (mark, pulse and score checkpoints):

- http://127.0.0.1:5230/dev/index.html?from=open&to=reveal-one-winner&at=0
- http://127.0.0.1:5230/dev/index.html?from=open&to=reveal-one-winner&at=754
- http://127.0.0.1:5230/dev/index.html?from=open&to=reveal-one-winner&at=1197
- http://127.0.0.1:5230/dev/index.html?from=open&to=reveal-one-winner&at=0&reduced=1
- http://127.0.0.1:5230/dev/index.html?from=open&to=reveal-one-winner&at=754&reduced=1
- http://127.0.0.1:5230/dev/index.html?from=open&to=reveal-one-winner&at=1197&reduced=1

Picture → non-picture and reverse:

- http://127.0.0.1:5230/dev/index.html?from=picture-reveal&to=non-picture-question&at=94
- http://127.0.0.1:5230/dev/index.html?from=picture-reveal&to=non-picture-question&at=189
- http://127.0.0.1:5230/dev/index.html?from=picture-reveal&to=non-picture-question&at=377
- http://127.0.0.1:5230/dev/index.html?from=non-picture-question&to=picture-question&at=94
- http://127.0.0.1:5230/dev/index.html?from=non-picture-question&to=picture-question&at=189
- http://127.0.0.1:5230/dev/index.html?from=non-picture-question&to=picture-question&at=377

Short → maximum text, departures before/during reveal:

- http://127.0.0.1:5230/dev/index.html?from=open&to=longest-text&at=189
- http://127.0.0.1:5230/dev/index.html?from=some-answered&to=departed-winner&at=189
- http://127.0.0.1:5230/dev/index.html?from=reveal-one-winner&to=departed-during-reveal&at=189

Check one chooser on the Correct row, eight choosers, long text, all three
output sizes, card bounds during the pulse, and persistent node identity.
Keyboard r reveals and n advances. Reduced pages must already show final states.

## Round-6 additional exact URLs

All earlier URLs above remain supported. Also use these at 1920×1080,
1280×720 and 3840×2160; viewport changes require no extra parameter.

- http://127.0.0.1:5230/dev/index.html?from=open&to=reveal-one-winner&at=377
- http://127.0.0.1:5230/dev/index.html?from=open&to=reveal-one-winner&at=470
- http://127.0.0.1:5230/dev/index.html?from=open&to=reveal-one-winner&at=528
- http://127.0.0.1:5230/dev/index.html?from=open&to=reveal-one-winner&at=600
- http://127.0.0.1:5230/dev/index.html?from=non-picture-question&to=picture-question&at=189&reduced=1
- http://127.0.0.1:5230/dev/index.html?from=picture-question&to=non-picture-question&at=189&reduced=1
- http://127.0.0.1:5230/dev/index.html?from=open&to=wrong-marked&at=94
- http://127.0.0.1:5230/dev/index.html?from=open&to=wrong-marked&at=189

## Close-out and Requests

RZ-030: final-geometry transforms and clips in Screen.tsx; keyframe tests
inspect every inline frame array through the TypeScript AST and exercise
both fit directions. D-102 sizing replaces the former D-101 b rule and
retains maximum-copy fit checks at all three output sizes. Cache tests
confirm viewport-only changes reuse the fit. Font failure/success tests
cover rejected loads and the actual face/weight requests.

RZ-005, RZ-006, RZ-031 and NFR-A11Y: phase/wrong identities, independent
copy masks, staggered chooser masks, retained departure slots and a wholly
inset success ring. Existing public-view secrecy, departed-winner retention,
no-winner pulse exclusion and contrast checks remain covered.

The five existing review frames were inspected. No files were written under
uat/evidence. Browser inspection remains blocked: Vite cannot bind
127.0.0.1:5230 (EPERM; /tmp/r03-vite6.txt). No new visual acceptance is claimed.
Integrator Requests: inspect the existing and additional URLs at all three
output sizes, call window.__rzOverflow() on every frame (expect []), verify
ring visibility through rise/peak/fall and run independent review.

Verification: all 54 screen tests pass (/tmp/r03-screen6-final.txt), as do
final host typecheck, targeted ESLint and diff whitespace checks. Two full
two-worker runs passed 132 test files and failed only tools/dev.test.ts
(the launcher saw zero of two expected child processes inside its startup
window). The required one-worker isolated retry also failed that assertion
(4 tests passed, 1 failed; /tmp/r03-dev6-retry.txt). Tabao Rush recipes
conformance passed; no isolated retry was needed there. Build/bundle budgets
and trace were run separately and passed (/tmp/r03-build6.txt,
/tmp/r03-trace6.txt). The final one-worker full run passed the same 132 files and failed
two startup cases in tools/dev.test.ts (3,150 passed, 2 failed, 1 skipped). Logs: /tmp/r03-verify6.txt,
/tmp/r03-verify6-final.txt and /tmp/r03-verify6-one-worker.txt.
Integrator Request: rerun pnpm verify outside this sandbox; the unchanged
launcher test prevents a green full run here.
No check, limit, dependency, lockfile or design-lint exemption was changed.


Final one-worker verify tail (the unchanged launcher assertion is the only
failing file; build and trace below were run separately after it):

```text
Test Files  1 failed | 132 passed (133)
     Tests  2 failed | 3150 passed | 1 skipped (3153)
  Duration  403.80s
PERF-022 host: 130315 bytes raw, 45415 bytes gzip / 1500000
PERF-020 controller (shared entry): 130315 bytes raw, 45415 bytes gzip / 300000
PERF-022 deploy: 130315 bytes raw, 45415 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

## Round 7 — D-105

Inspected round7/rz7-sheetF.jpg, rz7-sheetG.jpg, rz7-sheetH.jpg and
rz7-sheetI.jpg, and the round-7 REPORT section before editing.

RZ-031 / NFR-A11Y: the correct card now pulses its whole rounded edge with
an inset shadow at inset 0. Its resting opacity and final keyframe are both
0. The opacity pulse uses base duration, starting at slow minus one stagger:
347–580 ms, with its peak near 470 ms. The existing from=open /
to=reveal-one-winner URLs at=377/470/528/600 cover rise/peak/fall/gone.
Reduced motion omits the ring element entirely.

RZ-030: a changed picture/layout/font-size signature installs final geometry
and masks the complete picture, prompt and four answers together. Exactly
one outgoing block and one incoming block share the left-to-right boundary,
slow duration and inOut easing, both starting immediately. Outgoing ink stays
fully opaque until wiped. No piece translates or animates dimensions or grid
tracks. The same layout retains its existing content masks and persistent
options. Reduced motion swaps immediately.

RZ-006: the masked winner tick follows the name. A nonbreaking tail keeps
the final name character and tick together inside the seat; there is no
leading tick space to displace the name on reveal.

Dev photography: for valid from/to URLs wait for
`document.documentElement.dataset.rzReady === '1'` before capturing. The flag
is set after drawing the second state and, when at is supplied, pausing and
seeking its animations through two animation frames. Reduced URLs also set
it. Existing URLs and window.__rzOverflow() remain available.

### Close-out and Requests

Automated coverage retains the AST check against animated dimensions/grid
tracks and adds complementary block masks, layout-signature changes in both
picture directions and text sizing, no translation choreography, invisible
pulse endpoints, reduced ring omission and the trailing nonbreaking tick.
No files were written under uat/evidence. Browser rendering is blocked by
Vite's listen EPERM on 127.0.0.1:5230 (/tmp/r03-vite7.txt).
Integrator Request: photograph the four pulse times and both picture-change
directions plus short-to-long text after rzReady, then independently review.
No new visual acceptance is claimed.

Final verification: screen suite 56/56 passed (/tmp/r03-screen7-final.txt).
The two-worker full verify failed launcher startup assertions and the unchanged
120000 ms Tabao Rush recipes conformance timeout (/tmp/r03-verify7.txt).
The final one-worker full verify passed 132 files, including recipes, and failed
only two launcher startup assertions in tools/dev.test.ts
(/tmp/r03-verify7-final.txt). Both required isolated one-worker launcher retries
passed all five tests (/tmp/r03-dev7-retry.txt and
/tmp/r03-dev7-final-retry.txt). Workspace, typecheck, ESLint and design lint
passed in both full runs. Build/bundle budgets and trace passed separately
(/tmp/r03-build7.txt and /tmp/r03-trace7.txt); diff whitespace checks passed.
No checks, limits or design-lint exemptions were changed.
Integrator Request: rerun full pnpm verify outside the sandbox to confirm the
launcher alongside the full suite.

Final verify tail (build and trace ran separately after the full verify stopped
at the launcher assertions):

```text
Test Files  1 failed | 132 passed (133)
     Tests  2 failed | 3152 passed | 1 skipped (3155)
  Duration  607.65s
Isolated tools/dev.test.ts: 1 file passed; 5 tests passed
PERF-022 host: 130315 bytes raw, 45415 bytes gzip / 1500000
PERF-020 controller (shared entry): 130315 bytes raw, 45415 bytes gzip / 300000
PERF-022 deploy: 130315 bytes raw, 45415 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 81 in progress, 1 later, 70 not started
trace check passed
```

## Round 8 — D-106 (supersedes round-7 motion details)

RZ-031 / NFR-A11Y: the inset-0 success ring now takes the correct option's
own symbol colour through an inline custom property, with an 8 px token
width. Its opacity is 0 → 1 at motionGeometry.pulsePeak → 0 over
duration.slow, delayed by slow − STAGGER_MS (347–724 ms, peak about 498 ms).
It leaves no resting outline and is omitted under reduced motion. The
existing open-to-reveal URLs support at=347/498/600/724 for review.

RZ-030: ScreenModel exposes questionId. A block wipe requires both a new
question ID and changed geometry. Canvas measurement and font arrivals for
the same question replace the geometry immediately; font sizes no longer
form copy-mask identities, and geometry no longer remounts the block.
Cancelling a wipe clears its retained outgoing snapshot as well as both
animations, including when reduced motion is enabled mid-wipe.

RZ-006: the trailing tick always occupies its inline place, including before
reveal, and is masked while hidden. The final-name-character tail remains
nonbreaking. A space-5 margin separates the tick from the name; no leading
collapsing space is used. Hidden ticks are also hidden from accessibility.

RZ-031: block motion publishes its pending state to reveal effects. A reveal
received during the wipe retains its unseen veil transition and starts the
veil, Correct mask and winner pulse when the wipe finishes. The transition
state resets for a new masked question, including when successive questions
have the same correct option. Unit coverage exercises that pending state and
its once-only consumption, plus cancellation, shape-colour sourcing,
keyframes and both sides of the question/layout decision. The stale fit-cache
test name now states that viewport changes do not invalidate the cache.

### Performance scenario and integrator command (NFR-PERF, PERF-001)

On a quiet machine, from the worktree root, run:

```sh
pnpm perf -- rabakz-screen
```

This opens the Rabakz dev page at 1920×1080 through the shared local stack,
without room creation or phone contexts. Eight seats come from actual rule
fixtures. Five cycles cover open question → reveal → new question with
identical geometry → picture layout change. A dedicated perf-next-question
fixture repeats the first question's copy with a new question ID, ensuring
identical geometry even with different fonts. The dev-only fixture driver
updates the same mounted screen. Each state waits 40 presentation callbacks:
800 callbacks total, more than 600 measured intervals. The scenario unit test
checks all 20 states and 800 callbacks.

The smallest harness extension is optional Scenario.hostPage in
tools/perf/browser.ts: a local absolute path replaces createRoom and reports
zero phones. External origins/relative paths are rejected; tools/perf/cli.ts
rejects production builds for these development pages. Existing lobby
behaviour is retained. Navigation and rejection tests cover this extension;
tools/perf/README.md describes it. No tools/uat change was needed.

The default report location for the integrator is
uat/evidence/rabakz-screen/perf-8/{perf.json,PERF.md}. The suffix is the CLI's
default count, while the report correctly records zero connected phones.
Do not interpret that suffix as eight physical controllers. PERF-001 remains
**not assessed**: repeated fixture transitions are not a real busiest
180-second round, and the scenario deliberately does not call roundStart or
roundEnd. PERF-010/012 are also not assessed without controllers.

The sandbox run used an isolated temporary working directory with source
links and the same pnpm perf script, so it wrote nothing into this repo's
uat/evidence. Command: pnpm --config.verify-deps-before-run=false perf --
rabakz-screen --headless; log: /tmp/r03-perf8.txt. The perf memory gate read
42% free with its existing sandbox fallback, but the shared UAT memory gate
then refused the denied sysctl call before stack/browser startup. No frame
measurements or visual acceptance are claimed. No gate or limit was changed.

### Close-out and Requests

Integrator: run the headed scenario above outside the sandbox and inspect its
frame report; photograph the pulse rise/peak/fall/end, exact-line-width names,
a font relayout, reduced-motion toggling mid-wipe, and reveal arriving before
a layout wipe finishes. Check window.__rzOverflow() and independently review.
C-15 still owns wiring this screen into the console. PERF-001 requires a
separate honest full-round scenario once gameplay integration can supply it.

Round-8 verification results are recorded below.

Final validation: the full one-worker verify passed every stage, including
all 142 test files, the unchanged Tabao Rush conformance test, all launcher
tests, build/transfer budgets and trace (/tmp/r03-verify8-final.txt).
The earlier two-worker run hit the unchanged 120000 ms recipes conformance
timeout and was stopped before the one-worker retry
(/tmp/r03-verify8-two-workers.txt). The requested isolated one-worker launcher
retry also passed all five tests (/tmp/r03-dev8-retry.txt).
The focused screen/perf suites passed 73 tests
(/tmp/r03-target8-final.txt). Diff whitespace checks passed.

The worktree initially lacked root dependency links. Existing installed
packages from the main checkout were used without adding dependencies;
pnpm's verify-deps-before-run=false option prevented automatic network
reinstallation. Final command: VITEST_MAX_WORKERS=1 pnpm
--config.verify-deps-before-run=false verify. Every repository verify stage
ran; no check, threshold, dependency, package file, lockfile or design-lint
exemption changed. No files were written under this repo's uat/evidence.

Final verify tail:

```text
Test Files  142 passed (142)
     Tests  3210 passed | 1 skipped (3211)
  Duration  383.46s
PERF-022 host: 130315 bytes raw, 45415 bytes gzip / 1500000
PERF-020 controller (shared entry): 130315 bytes raw, 45415 bytes gzip / 300000
PERF-022 deploy: 130315 bytes raw, 45415 bytes gzip / 1500000
no asset sets in assets/src yet
152 requirements; 82 in progress, 1 later, 69 not started
trace check passed
Isolated tools/dev.test.ts: 1 file passed; 5 tests passed
```
