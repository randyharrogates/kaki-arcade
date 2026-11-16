# F-02 protocol — evidence report (after review round 3, on the tree rebased onto main)

Nothing in this issue is visible, so the evidence is text. Files are in this folder; test names
are in `tests.txt` (309 tests, all passing; 824 across the workspace) and the tests are in `packages/protocol/src/`.

**Read first:** two things review round 2 asked to be asserted are met at the host's input
buffer but not at the simulation step, for taps of one button that come close together. They
are measured, not asserted, and are listed under "Not met" below.

| # | Acceptance statement | Result | Shown by |
|---|---|---|---|
| 1 | Types, encoders and validators for signalling (one decoder per role), the reliable channel and the unreliable channel | pass | `tests.txt`: seven `messages.test.ts` families; "each role is allowed only its own messages"; "a phone socket cannot do what only a host may"; "the opening message is sent once"; `wire.test.ts` |
| 2 | Every message carries the version; another version is refused with `bad-version` | pass | "refuses a wrong or missing version" (×7 families); `wire.test.ts` "refuses another protocol version" |
| 3 | Every message type round-trips; a type with no sample is a compile error | pass | 63 "<type> round-trips" tests covering every type in every family; `wire.test.ts` "round trips", including 5,000 random histories; `probes.txt` "a message type with no sample does not compile" |
| 4 | Decoders and validators never throw | pass | the rejection tests per family; "survives an object that throws when read"; `wire.test.ts` "refuses, without throwing, bytes and objects that throw when looked at" (detached buffer, its views, a throwing proxy, a revoked proxy); `names.test.ts` "takes anything at all without throwing" |
| 5 | Game payloads are opaque: plain JSON within a depth and size cap | pass | `check.test.ts` "json" group; "layout, private view and action payloads are capped by size"; "payloads are capped by depth, and a missing payload is not a null one" |
| 6 | Input frame is 7 bytes while nothing changes, 23 at most, 2 more with tilt | pass | `wire.test.ts` "an input frame is 7 bytes while nothing changes, 11 for a tap, 23 at most; tilt adds 2", "the bytes are as documented"; `input.test.ts` "a frame is 7 bytes while nothing changes and 23 at the very most" (mashing at 10 a second: 12.3 bytes on average) |
| 7 | Perfect link, three tick drivers, with and without a tick on touch: every tap of any length, fast double and triple taps, mashing at 10 and 15 a second for 10 s, each seen once with no added delay | pass | six groups "a perfect link, …", three tests each. Delay is asserted per press: zero for single taps and for mashing with an ideal clock and `setTimeout`; with `requestAnimationFrame`, one tick only for a press whose release fell between the same two ticks |
| 8 | 5% to 30% loss in runs of up to eight, duplicates, reordering, sequence wrap, tilt coming and going: every press and release reaches the buffer exactly once, nothing held; 50 ms break at every millisecond; 300 ms freeze at every millisecond | pass at the buffer; see "Not met" for the simulation step | "lossy links (NET-005)": "…every press and release reaches the host's buffer exactly once" (×5 links, 12 sessions each); "…taps at least a history apart are each seen by the simulation exactly once" (×5); "a 50 ms break in the link…" (4 kinds of tap asserted at the simulation step, 2 more at the buffer; 3,368 cases each); "a 300 ms freeze of the phone…" (×3 tap lengths, 4,206 cases each) |
| 9 | Steady hold, ten minutes, phone ticking 60 a second: never falsely released at 5%, 10%, 20% loss | pass | "ticking 60 times a second, … loss never releases a ten-minute hold" (×4, 30% included) |
| 10 | Seeded random garbage never makes a decoder or validator throw | pass | seven "seeded random garbage" groups; `wire.test.ts` "random bytes" (40,000 frames) |
| 11 | Every message at its largest fits its cap | pass | "every message at its largest fits the message cap" |
| 12 | `pnpm verify` passes; the library has no DOM and no Node types | pass | `verify.txt` (exit code 0, 824 tests); `probes.txt` "DOM or Node globals in library code do not compile" |
| 13 | Round 3: tag characters only after the black flag; joiner and non-joiner between letters or after a virama (Sinhala, Persian, Malayalam, Devanagari) pass, and are refused at the start, at the end, doubled or beside non-letters; `seat` and `room` check a name's content, not its count | pass | `names.test.ts` "tag characters are allowed only as a flag…", "a joiner or non-joiner between letters, or after a virama…", "a joiner anywhere else is refused", "checkNameContent…" group; `messages.test.ts` "the name in a seat is checked for content only: the host has already counted it"; `probes.txt`, the six name probes |

## Not met, and measured instead

| Asked to be asserted | What is true | Test that records it |
|---|---|---|
| Every tap seen exactly once under loss in runs of up to eight | True at the buffer. At the simulation step, fast taps of one button merge after a loss: 0.06% of presses at 5% loss, 0.12% at 15%, 0.44% at 30% (9,864 presses each). True at the simulation step for taps at least a history apart. | "the limit: after a run of lost frames, fast taps of one button can reach the simulation as one" |
| A 50 ms break at every millisecond never loses or doubles a tap | True at the buffer for every tap tried. At the simulation step: true for single taps and double taps 100 ms apart; 2 of 3,368 breaks merge a double tap 80 ms apart; 30 of 3,368 merge one 66 ms apart. | "the limit: taps closer than 100 ms can reach the simulation as one after a break" |
| Steady hold never falsely released at 20% loss | True when the phone ticks 60 a second. At the 33 ms keep-alive alone: 0.3 false releases per ten minutes at 20%, 2.9 at 30%, 0 at 5% and 10%. | "the limit: ticking only at the keep-alive rate, 20% loss…" and "…30% loss…" |

The first two have one cause: after a loss a single frame delivers several ticks, and the
buffer reports presses per simulation step as a bitmask. It is outside this package; the two
ways to close it are in the slice note under Requests.

## Other limits on record

| Limit | Test |
|---|---|
| Three changes of one button between two ticks: two cancel | "three changes between two ticks: two cancel, and the button ends where the thumb is" |
| A button still held when a freeze longer than 250 ms ends is pressed again | "the limit: a button still held when the freeze ends is pressed again" |
| Independent loss: a tap is missed about loss⁹ of the time (1 of 6,009 at 30%; 0.17% at 50%; 3.6% at 70%) | "independent loss of …" (×3) |

## Files

| File | What it is |
|---|---|
| `verify.txt` | Full `pnpm verify` output, exit code 0 |
| `tests.txt` | `vitest run packages/protocol --reporter verbose`, exit code 0 |
| `probes.txt` | Twenty-three deliberate faults, each applied, shown to fail typecheck or tests, and undone |

I read all three files after they were written. The probes were applied in the worktree and
each file was restored before `verify.txt` and `tests.txt` were produced. The evidence files
are part of the commit, so they were produced on the tree just before it; `pnpm verify` was
run again on the committed tree and passed with the same counts.
