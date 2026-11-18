# P-03 — Peek Poker phone pick

Requirements: PP-005, PP-020. Decisions: D-062(5), D-160, D-161, D-164, D-166, D-171.

Implemented a private face-down 4 × 4 phone grid, two-pick selection and deselection,
large shapeless Lock in disabled until two picks, memorise-only seconds, locked
instruction, reveal-only own five-card hand, scoreboard and match-over copy.
Existing rules own taps, the two-pick limit, timers and random fill. Cosmetic
selection updates retain the game revision; the session assigns transport revisions.
No D-pad, dependency or package contract change.

## Round 2

Corrected UAT JSDoc types, phase narrowing and contract assertions. Restored stable
selection revisions and PP-022 immediate reveal expectations. Added the existing
rabakzBank plugin to the browser fixture. The targeted tests passed 240 cases;
Chromium launch was denied by the sandbox. Typecheck, ESLint and design lint passed.

## Round 3

Memorise now says “Watch the TV” with the existing seconds stat (§2, D-164(4)).
The random-fill text uses the private-view contract’s one-line `tone: 'note'`;
unit tests assert the exact copy and tone.

The felt boundary comes from `.ka-layout-surface`: the layout renderer copies the
shell background onto that play-area rectangle, which ends above the wake message
(near the reported 68–70 px boundary). The wrapper also painted felt. The wrapper
now only supplies the theme, and a web-only rule makes the copied layout surface
transparent. The full-viewport controller shell alone paints felt, with one origin.
No controller-kit source was changed.

The DOM regression samples painted stacks through the play area and at the bottom
edge at 667 × 375, 844 × 390 and 932 × 430. It uses `elementsFromPoint`, includes the
pointer-events:none layout surface explicitly, checks computed Peek Poker paint,
and requires the shell to be the sole felt painter. Its negative control restores
the pre-fix wrapper class and copied layout background and requires the same
coverage predicate to fail at every size. This is stronger than measuring a fixed
wrapper or comparing inherited tokens. The browser cannot launch in this sandbox,
so neither the positive assertions nor the negative-control proof ran here; the
integrator must execute this test outside the sandbox before accepting coverage.

UAT now waits for the layout engine’s dimensions to match the resized play area
before screenshots and geometry capture. It asserts every cell and Lock in are
inside the viewport, cell floors of 89 × 68, Lock in floors of 144 × 144, data-fits,
viewport cover, and distinct geometry at the three sizes. Existing round1-p1/p2/p8
measurements predate this wait and repeat stale geometry; they are not accepted
measurements. No new UAT was run in Round 3, as instructed.

Existing round1-p2 and round1-p8 images were inspected via contact sheets (and the
667 pick image at full resolution). Their report descriptions now identify the
actual phone states and old defects. “Looked at by” remains for the integrator.
The round1 TV still metadata now says unsettled:true; future frozen-clock TV stills
also record that flag. They show a console placeholder, not the game table.
The TV-frame leak check cannot fail while that placeholder is displayed; payload
privacy checks still inspect real sends. P-06/P-07 carry the big-screen half.

## Round 4

The integrator re-shot round1-p1/p2/p8 at commit 5f0ddfaa. Those runs pass
at 1, 2 and 8 phones with settled resize geometry. The integrator's coverage
browser test ran and passed with the Round 3 negative control; controller perf
passed at 163 ms median. These supersede the historical Round 3 limitations
above. Round 4 does not modify those evidence folders or their REPORTs.

The 6,500-step diagnostic covers 108⅓ seconds: memorise, pick, reveal and
scoreboard for rounds 1 and 2, then round 3 memorise. Nine layouts × eight
phones = 72 sends. The extra 16 are the two scoreboard → memorise changes,
which must replace “Scores on the TV” with “Watch the TV”. Pick/reveal revision
increments within the same simulation step do not cause multiple sends. No
layout send is redundant in this diagnostic. Its expectation now derives 72
from the phases and phones, with a per-phase, per-phone duplicate assertion.

The kit now copies the shell's full painting box and origin, preserving auto-sized
gradients and the opaque crossfade background. The global web transparency
override is removed. Coverage accepts aligned shell copies and independently
rejects wrapper paint alone and a misaligned copy alone, restoring the positive
assertion after each. A kit regression checks copied geometry and retained
opaque background during a layout crossfade.

Private-panel notes retain the 13 px note rule, and both placement growth and
DOM fitting exclude them from the large text steps. Points retains its 89 step
at 932 × 430; the two shorter viewports use its existing 55 fit step.
Kit tests cover the CSS rule, placement and DOM fitting.

## Close-out

Round 4 changes are ready for independent review; local command results are in
`uat/evidence/P-03-phone-pick/checks.md`. No UAT or perf was run in Round 4.
Local targeted tests pass 411 cases; only Chromium launch fails (sandbox Mach
port denial), so the new independent browser controls require an integrator run.
The integrator's passing evidence and 163 ms controller median remain the
recorded browser/performance results, pending review of this round's changes.

## Requests

Integrator K backlog (carried, not fixed): narrow text-control columns wrapping
“Locked in” and “Watch the TV”; selected-card corner hairlines; dark ink for
hearts and diamonds.

Retain the D-164(5) rendered Lock in shape comparison for Randy; no shape is
used until the decision. Confirm the eventual P-05 final-screen hand-off and
whether its phone retains Match over. P-06/P-07 must validate the real TV table
and frame privacy; the current console placeholder is no evidence of that.

## Integrator close-out (2026-11-18)

This supersedes the round 4 lines above that say no UAT or perf was run and that the evidence
folders were not modified. Commit 0d6e9aa7 re-shot round1-p1, round1-p2 and round1-p8 at
95bb03d2, which contains the round 4 fix (a76d9c51). The browser coverage test
(`phone-coverage.dom.test.ts`) passes outside the sandbox. Controller cold start: median
168.7 ms against the 2,000 ms budget (`perf-1/startup.json`, gitignored). Full check passed on
the merged branch. The TV half of PP-005 and PP-020 is not yet seen: every TV still is the
placeholder until P-06/P-07. The private-note size (13 px) is logged as D-175.
