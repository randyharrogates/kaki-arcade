# Slice F-02 — Protocol: every message, with validators

Issue F-02 in `docs/backlog/F-foundation.md`, wave 1. Branch `issue/F-02-protocol`.
Owns `packages/protocol` only. Revised three times in review; the history is at the end.

## Goal

One package, `@kaki/protocol`, that defines every message between phone, host and pairing
server, with hand-written validators that never throw. It is the contract the pairing server
(C-01 to C-03), netcode (C-04), reconnect (C-05), room state (C-06) and the controller kit build
against. Pure logic: no DOM, no Node types, no npm dependencies.

## Requirement IDs

| ID | Covered | Which part |
|---|---|---|
| NET-001 | partly | The message set itself: a phone can only send inputs, actions and room requests; the host can only send a phone its own seat, controller layout, private view, link quality and room state. There is no message that carries simulation state or another player's view to a phone. The host loop that uses it is C-04 and C-10. |
| NET-005 | partly | Input frames are 7 to 23 bytes, carry a 16-bit sequence number, the phone's full current state and the button masks of the eight ticks before, so any frame replaces up to eight lost ones. The send rule and the host-side `expandInput` are pure functions here, tested under simulated loss against a model of the host's input buffer. The buffer itself is `@kaki/sim-core` (F-03) and the transport is C-04. |

## Acceptance

1. `@kaki/protocol` exports types, encoders and validators for three message families:
   signalling (one decoder per role and direction), reliable data-channel messages (JSON) and
   unreliable data-channel frames (input, ping, pong; binary).
2. Every message carries the protocol version. A message with another version is rejected with
   `bad-version`.
3. Every message type round-trips. The sample tables are typed so that a message type with no
   sample is a compile error.
4. Every decoder and validator returns a typed result and never throws: malformed fields,
   missing fields, unknown message types, wrong version, oversized payloads, detached buffers
   and hostile objects are each rejected with a code.
5. Game-specific payloads (controller layout, private view, action data) are opaque here.
6. An input frame is 7 bytes while nothing changes and 23 at most; tilt adds 2.
7. On a perfect link, with an ideal clock, a truncating `setTimeout` and a jittering
   `requestAnimationFrame`, every tap of any length, fast double and triple taps and mashing at
   10 and 15 taps a second are each seen exactly once, with no added delay.
8. With 5% to 30% of frames lost in runs of up to eight, plus duplication and reordering,
   across the 16-bit wrap and with tilt coming and going, every press and release reaches the
   host's input buffer exactly once and nothing stays held. The same for a 50 ms break in the
   link at every millisecond, and a 300 ms freeze of the phone at every millisecond around a
   tap.
9. A steady hold is never falsely released over ten minutes at 5%, 10% and 20% independent
   loss when the phone ticks 60 times a second.
10. A property-style test feeds seeded random garbage to every decoder and validator and none
    throws.
11. Size caps are consistent: every message at its largest fits its message cap.
12. `pnpm verify` passes. The library project compiles with no DOM and no Node types.

**Two things review round 2 asked to be asserted are not met at the level of the simulation
step**, and are measured instead of asserted. Both have the same cause and are set out under
"What is not met" below.

## UAT script

Nothing in this issue is visible, so there are no screenshots. Evidence is text in
`uat/evidence/F-02-protocol/`:

| File | Shows |
|---|---|
| `verify.txt` | The full `pnpm verify` run, exit 0 |
| `tests.txt` | `vitest run packages/protocol --reporter verbose`: every test name and result |
| `probes.txt` | Twenty-three deliberate faults, each shown to fail typecheck or tests, then undone |
| `REPORT.md` | Each acceptance statement, pass or fail, and the test that shows it |

## Out of scope

- WebRTC, WebSockets, timers, storage: C-01, C-04, C-05.
- The host's input buffer: `@kaki/sim-core` (F-03).
- The shape of a controller layout or a private view: F-04.
- Blocked-words filtering, trimming and seat allocation: C-06.
- How the pairing server measures relay usage (C-02).

---

## The contract in brief

Full field lists are the TypeScript interfaces in `packages/protocol/src`; the rules every user
follows are in `packages/protocol/README.md`. Every JSON message is
`{ v: 1, t: "<type>", ...fields }`. Optional values are always present and `null` when absent.

### Who sends what

| Family | Decoder | Types |
|---|---|---|
| Signalling, first message on a socket | `decodeOpeningSignal` | `create` `reopen` `join` |
| Signalling, host → pairing server | `decodeHostSignal` | `to-phone` `relay` `drop` `close-room` `ping` |
| Signalling, phone → pairing server | `decodePhoneSignal` | `to-host` `relay` `ping` |
| Signalling, pairing server → host | `decodeToHostSignal` | `created` `peer-joined` `peer-left` `from-phone` `ice` `error` `pong` |
| Signalling, pairing server → phone | `decodeToPhoneSignal` | `joined` `host` `from-host` `ice` `dropped` `error` `pong` |
| Reliable channel, phone → host | `decodePhoneMessage` | `hello` `resume` `set-name` `action` `control` `leave` |
| Reliable channel, host → phone | `decodeHostMessage` | `seat` `refused` `name-refused` `room` `layout` `view` `link` `close` |
| Unreliable channel, phone → host | `decodePhoneFrame` | input frame, ping frame (binary) |
| Unreliable channel, host → phone | `decodeHostFrame` | pong frame (binary) |

### Rules written down in the README

Roles (a socket's first message fixes its role; a phone cannot send `to-phone`, `drop`,
`close-room`, `create` or `reopen`; the opening message is sent once) · the host always offers
and creates both data channels, the phone only answers · after `reopen` the server replays
`peer-joined` for every phone socket it still holds · the host ends a room with `close-room` ·
a local `bad-version` means "reload" · `refused: game-running` keeps the channel open and the
phone asks again when `canAskToJoin(phase)` · the seat token does not rotate · pings: 12 on
connect, then one a second; thresholds belong to netcode · encoders do not validate · the
120-a-second cap is the caller's job and a capped tick is deferred, never dropped · a tilt
layout never goes quiet.

### Bytes per frame

| Frame | Bytes | Layout |
|---|---|---|
| Input | **7 to 23** | header (version in the high 4 bits, kind in the low 4) · sequence u16 · stick x i8 · stick y i8 · runs |
| Input with tilt | **9 to 25** | the same, with tilt x i8 · tilt y i8 before the runs |
| Ping | 5 | header · id u16 · last measured round trip in ms u16 (`0xFFFF` = not yet known) |
| Pong | 3 | header · id u16 |

`runs` is the button masks of this tick and the eight before it, newest first, with repeats
folded together: each run is a u16 whose low 12 bits are a mask and whose high 4 bits are how
many ticks in a row had it, less one. Runs add up to nine ticks and two alike never sit side by
side, so every input has exactly one encoding.

| Situation | Bytes per frame | At 60 ticks a second |
|---|---|---|
| Steady hold, stick moving, nothing else changing | 7 | 420 B/s (210 at the 33 ms keep-alive) |
| A tap passing through the history | 11 | 660 B/s for the 150 ms it takes |
| Mashing one button at 10 taps a second | 12.3 on average, 13 at most (measured) | 740 B/s |
| Worst case: a button changing on every tick | 23 | 1,380 B/s |
| Tilt layout, nothing held | 9 | 540 B/s (270 at the keep-alive) |

Carrying the history uncompressed would be 23 bytes for every frame. Multi-byte fields are
big-endian.

### Size caps

| What | Cap |
|---|---|
| Any signalling message | 16,384 bytes of UTF-8 |
| Any reliable data-channel message | 16,384 bytes of UTF-8 |
| Session description | 8,192 bytes as it sits in the JSON message (escapes counted) |
| ICE candidate | 1,024 bytes as it sits in the JSON message |
| ICE grant | at most 4 servers × 4 URLs (at least 1) × 256 printable ASCII characters; under 7,000 bytes at every maximum |
| Controller layout payload | 4,096 bytes as JSON, depth 16 |
| Private view payload | 8,192 bytes as JSON, depth 16 |
| Action payload | 1,024 bytes as JSON, depth 16 |
| Nickname | 1 to 12 visible characters, at most 48 code points; see below |
| A name a phone asks for (`hello`, `set-name`) | 96 UTF-16 units, otherwise unchecked, so the host can read it and say why not |

### Nicknames

`checkNickname(text)` returns `ok`, `blank`, `too-long` or `bad-characters`. It is used by the
join form and by room state. The `seat` and `room` validators use `checkNameContent`, which
checks size (48 code points) and forbidden characters but does not count visible characters:
the fallback count is approximate, the host's count is the authority, and a phone must never
refuse a name its host accepted. A name that passes is still text (`<script>` passes); every
consumer shows names as text, never as HTML.

- **12 visible characters**, counted with `Intl.Segmenter` (with a rough fallback that never
  counts fewer), and at most 48 code points.
- Must contain at least one letter, number or emoji. The Hangul fillers and the blank Braille
  pattern count as nothing.
- Refused: control characters, text-direction controls, zero-width space, the byte-order mark
  and other invisible formatting, line and paragraph separators, lone surrogates, more than
  three combining marks in a row.
- The zero-width joiner and non-joiner are allowed between two letters or after a virama or
  other mark and before a letter (Sinhala "Sri", Persian word parts, Malayalam chillu forms
  written the older way, Devanagari with a joiner), and the joiner between two emoji. At the
  start or end of a name, doubled, or beside a digit, space or punctuation they are refused.
  One consequence: a Malayalam name that ends in a chillu written the older way (virama then
  joiner as the last two code points) is refused; the single-code-point chillu letters pass.
- Tag characters are allowed only straight after the black flag U+1F3F4, as one or more tag
  letters and the end tag (England, Scotland, Wales). After any other emoji they are refused,
  since they could spell a hidden message.
- Variation selectors are allowed anywhere.
- முத்துக்குமார், சுப்பிரமணியம், 🤷‍♀️, 🧑‍💻 and 🏳️‍🌈 pass.

---

## Input: frames carry recent history (NET-005)

### Phone

- Touch events call `pressButtons` and `releaseButtons`. They only record.
- `nextInputSend(sender, analog)` is **one tick**: one button mask, one sequence number, one
  frame. The caller runs it on a timer (60 a second) and **must also run it at once on a
  touch event** (without that the 95th-percentile wait before a press is sent is 34 to 38 ms,
  and up to 50 ms on a skipped frame; with it, 21 ms). There is no clock in the sender, so
  timer truncation and jitter cost nothing.
- Each frame carries its own tick and the masks of the `INPUT_HISTORY` = 8 ticks before it.
- A button's bit changes at most once per tick. A tap shorter than a tick is one tick set, the
  next clear; a gap shorter than a tick is one tick clear, the next set.
- The stick and tilt are read at each tick and rounded to the wire's steps there, so a stick a
  hair off centre, or a reading that is not a number, does not keep the stream alive.
- While anything is held, `more` is true and the phone keeps ticking (at least every
  `INPUT_KEEPALIVE_MS` = 33 ms). After everything is released it sends the released state nine
  times, then returns `null` and uses no sequence numbers until the next touch.

### Host

`expandInput(frame)` returns the nine ticks a frame carries, oldest first, each with its own
sequence number (`seq − k`, wrapped). The host gives every one to sim-core's input buffer in
that order. The buffer skips the sequence numbers it has seen and applies the rest, so a frame
that arrives after a loss fills the gap by itself. No change to sim-core is needed.

### Why eight

A tick travels in `INPUT_HISTORY + 1` frames. At the fastest allowed rate, 120 ticks a second,
those frames span `INPUT_HISTORY × 8.33 ms`. Six would span exactly 50 ms, with nothing to
spare; eight spans 67 ms. At 60 ticks a second eight spans 133 ms. The run-length encoding
makes the choice nearly free: a longer history only costs bytes while something is changing.

### What it guarantees, as tested

| Property | Result |
|---|---|
| Added delay | None. A press is in the first tick after the thumb lands, with all three tick drivers. |
| Mashing at 10 and 15 taps a second for 10 s | Every tap seen once by the simulation; none late with an ideal clock or `setTimeout`. With `requestAnimationFrame`, a press waits one tick only when a skipped frame put the release before it in the same tick. |
| Double and triple taps at an even rhythm, one per two ticks | Every tap seen once by the simulation. |
| Any 8 frames in a row lost, at 5%, 15%, 30% loss, with duplicates and up to 40 ms of reordering, across the sequence wrap, tilt coming and going | Every press and release reaches the buffer exactly once; nothing sticks. 9,864 presses per link over 12 sessions. |
| A 50 ms break starting at every millisecond (4 drivers × with and without a tick on touch × 421 offsets) | Flick, three-tick tap, long press, double tap 100 ms apart: the simulation sees each exactly once. |
| A 300 ms freeze of the phone at every millisecond around a 3, 60 or 120 ms tap | One press and one release, whether or not the host's silence limit fired in between. |
| Steady hold for ten minutes, phone ticking 60 a second | No false release at 5%, 10%, 20% or 30% independent loss. |
| Independent loss, no limit on runs | A tap is missed when all nine frames carrying it are lost. Measured over 6,009 taps: 1 missed at 30% (expected 0.1, loss⁹ = 2.0 × 10⁻⁵); 0.17% at 50% (loss⁹ = 0.20%); 3.6% at 70% (loss⁹ = 4.0%). Never doubled, never stuck. |

### What is not met

Review round 2 asked for "seen exactly once" to be asserted under loss in runs of up to eight
and under a 50 ms break. **At the host's input buffer that is met for every case tested. At
the simulation step it is not met for taps of one button that come close together**, and
those cases are measured rather than asserted:

| Case | Reaches the buffer | Seen by the simulation |
|---|---|---|
| Double tap 100 ms apart, 50 ms break at every offset | 3,368 of 3,368 | 3,368 of 3,368 |
| Double tap 80 ms apart, 50 ms break at every offset | 3,368 of 3,368 | 3,366 of 3,368 (2 show one release where there were two) |
| Double tap 66 ms apart (mashing at 15 a second), 50 ms break | 3,368 of 3,368 | 3,338 of 3,368 |
| Mixed play with fast taps and mashing, 5% loss in runs of up to 8 | 9,864 of 9,864 presses | 9,858 (0.06% merged) |
| The same at 15% loss | 9,864 of 9,864 | 9,852 (0.12%) |
| The same at 30% loss | 9,864 of 9,864 | 9,821 (0.44%) |
| Taps at least a history apart, 5% to 30% loss | all | all (asserted) |

The cause is not in the frames. After a loss, one frame delivers several ticks at once, and
sim-core reports presses and releases per simulation step as a bitmask, so two presses (or two
releases) of the same button that land in one step show as one. Any design with no added
delay has this property against a bitmask; the timed-repeat design avoided it only by holding
presses 133 ms apart. It can be closed outside this package in either of two ways (see
Requests): sim-core reports a count per button per step, or the host hands a catch-up frame's
ticks to the buffer over successive steps.

The reviewer's own measurements of the same thing (round 3), with real timers: two presses of
one button that reach the buffer inside one simulation step come out as one.

| Play | Merged presses |
|---|---|
| 6 taps a second, loss of 5% or less | none |
| 7 taps a second, loss in runs of up to 133 ms | about 0.1% |
| Sustained 10 taps a second | 0.3% to 1.0% |
| 15 taps a second, 5% loss in runs | 1.1% to 2.1% |

**The fix is a sim-core follow-up, not a protocol change:** when a tick would latch an edge
that is already pending for that button in the current step, the buffer defers the remaining
ticks of that slot until after the next sample. That adds delay only when it is needed.

Three more limits, each pinned by a test:

- **Three changes of one button between two ticks** are indistinguishable from one: two
  cancel. An even rhythm as fast as one tap per two ticks never does this; a tap squeezed in
  right after a long one ends (gap plus tap shorter than a tick, about 17 ms) can. No human
  thumb does it, and no queue is kept to cover it.
- **A button still held when a freeze of more than 250 ms ends is pressed again**: the host
  let go after its silence limit and the returning frames show the button down. This is the
  host's silence rule.
- **Ticking only at the 33 ms keep-alive**, a steady hold is falsely released 0.3 times in ten
  minutes at 20% independent loss and 2.9 times at 30% (0 at 5% and 10%). The assertion of
  zero at 20% holds at 60 ticks a second, which is what "For C-04" asks for. Sustained 30%
  loss is outside what the game promises; the big screen shows that player as a weak link
  well before (PLAT-010).

---

## Close-out

### Requirements

| ID | Status here | Code | Tests | Evidence |
|---|---|---|---|---|
| NET-001 | partly (the message set; the host loop is C-04 and C-10) | `packages/protocol/src/channel.ts` (`PhoneMessage`, `HostMessage`), `packages/protocol/src/wire.ts` (`PhoneFrame`, `HostFrame`), `packages/protocol/src/signal.ts` (role decoders) | `messages.test.ts`: "a message for one direction is refused in the other (NET-001)", "each role is allowed only its own messages", "a phone socket cannot do what only a host may", every "round-trips" test | `uat/evidence/F-02-protocol/tests.txt`, `REPORT.md` rows 1, 3, 4 |
| NET-005 | partly (frame, send rule and `expandInput`; the buffer is F-03, the transport C-04) | `packages/protocol/src/wire.ts` (`encodeInput`, `decodePhoneFrame`), `packages/protocol/src/input.ts` (`pressButtons`, `releaseButtons`, `nextInputSend`, `expandInput`) | `wire.test.ts`: "frame sizes", "round trips"; `input.test.ts`: groups "the send rule", "expandInput", "a perfect link, …" (×6), "lossy links (NET-005)", "a 50 ms break in the link, at any moment, never loses or doubles a tap", "a 300 ms freeze of the phone, at any moment around a tap", "a steady hold is not released by silence", "what it costs" | `uat/evidence/F-02-protocol/tests.txt`, `probes.txt`, `REPORT.md` rows 6 to 9 |

### What was built

| File | Holds |
|---|---|
| `README.md` | The rules every user of the package follows |
| `src/result.ts` | `Result<T>`, the eight error codes |
| `src/limits.ts` | `PROTOCOL_VERSION` and every size cap |
| `src/check.ts` | The hand-written checks, `messageValidator`, `textDecoder`, `utf8Length`, opaque `Json` |
| `src/fields.ts` | Room code, token, peer id, name, seat, colour and counter checks |
| `src/names.ts` | `checkNickname`, `checkTeamName`, `checkNameContent` |
| `src/signal.ts` | Signalling messages in five role-and-direction families |
| `src/channel.ts` | 6 phone and 8 host reliable-channel messages, `canAskToJoin` |
| `src/datachannel.ts` | Data-channel labels and options |
| `src/wire.ts` | Binary input, ping and pong frames |
| `src/input.ts` | Button bits, axes, sequence numbers, the send rule, `expandInput` |
| `src/*.test.ts` | 309 tests |

### Verify

`pnpm verify` exit 0. Full output in `uat/evidence/F-02-protocol/verify.txt`. The evidence
files were produced on the tree that was then committed (they are part of the commit, so they
cannot be produced after it); `pnpm verify` was run again on the committed tree and passed
with the same counts.

### Dependencies requested

None. No npm dependency was added and the lockfile is unchanged.

### For C-04

- Call `pressButtons` and `releaseButtons` from the touch events themselves.
- Tick `nextInputSend` 60 times a second on a direct link (a timer or
  `requestAnimationFrame`).
- **A touch event MUST tick at once as well**, not wait for the timer: 21 ms against 34 to
  38 ms at the 95th percentile, and against up to 50 ms on a skipped frame. Never more than
  120 a second: a tick due sooner than 8.3 ms after the last is put off until then, not
  dropped.
- **Ticking 30 times a second when relayed is an open question for the owner, not a choice
  for C-04.** At 30 a second eight lost frames span 267 ms, which is past the 250 ms silence
  limit, so the history no longer covers the gap: the reviewer measured 9 false releases in
  360 ten-second runs at 5% loss in runs. Until it is decided, tick 60 a second on every
  link.
- Send every frame it returns on the input channel. Stop the timer when `more` is false; start
  it again on the next touch.
- Keep ticking 60 times a second while anything is held. The 33 ms keep-alive is the slowest
  allowed, and at 20% loss it lets the host drop a hold about twice an hour.
- Create both data channels on the host with the labels and options in `datachannel.ts`, and
  set `binaryType` to `'arraybuffer'` on both sides.
- On the host: `decodePhoneFrame`, then `expandInput`, then every tick it returns, oldest
  first, into sim-core's buffer (`seqModulus: SEQ_MODULO`,
  `staleAfterSteps: INPUT_STALE_STEPS`, one slot per data channel, `buttons` as they are, axes
  through `axisToUnit`). For when to reset a slot and what to do on resume, follow sim-core's
  host rules.
- Start a fresh `createInputSender()` on each new data channel, then `pressButtons` whatever is
  physically down.
- Send 12 pings when the input channel opens, then one a second.
- Leave `username` and `credential` out of an ICE server when they are `null`.
- Treat a local `bad-version` as "reload the page".
- In development, validate what you send: encoders do not.

### Requests

1. **Presses that land in the same simulation step (F-03, a sim-core follow-up).**
   Fast taps of one button can show as one after a loss (tables under "What is not met").
   The fix the reviewer named: when a tick would latch an edge already pending, defer the
   remaining ticks of that slot until after the next sample.
2. **A true resume barrier needs the protocol.** sim-core's `discardEdges()` cannot ignore a
   packet still in flight at resume. Candidate: the host ignores input frames until one
   arrives whose sequence number was sent after the phone acknowledged the resume `room`
   message. Not built; recorded here.
3. **`docs/ARCHITECTURE.md` §5 (integrator).** It should say: phones tick at up to 120 a
   second (not "up to 60 Hz"); each input frame carries the masks of the previous eight ticks
   and the host expands them; the released state is sent nine times, not three; a keep-alive
   every 33 ms while held; the host releases a silent phone after 15 steps; ping and pong are
   binary on the unreliable channel; ICE servers arrive in `created` and `joined`; the host
   always offers; signalling has one decoder per role.
4. **A phantom second press after a link delay spike of 250 ms or more (F-03, sim-core).**
   The host releases a held button at its silence limit; when the delayed frames arrive they
   show the button down and the simulation sees a second press the thumb never made.
   Candidate: after a silence release, do not raise `pressed` for that button until a tick
   shows it up. Not built; recorded here.
5. **`docs/OPEN-QUESTIONS.md` (integrator, for the owner).** Whether a relayed phone may tick
   30 times a second (see "For C-04").
6. **`docs/TRACEABILITY.md` (integrator).** NET-001 and NET-005 rows: add the code and test
   paths above; both stay `in progress` until C-04.

### Choices the next issues should know about

- **Optional values are `null`, never missing.** Fields a type does not define are dropped,
  not refused, so a newer peer can add one.
- **Room code shape** is 4 to 8 capital letters and digits; C-01 picks inside that. Tokens are
  16 to 128 URL-safe characters; peer ids 1 to 32.
- **Room token** is issued by the pairing server in `joined`; the **seat token** by the host
  in `seat`, and it does not rotate.
- **Room full** can be said by the pairing server (`error`), by the host at signalling level
  (`drop`, the phone gets `dropped`) or on the data channel (`refused`).
- **What a phone is told about the room** is small on purpose (NET-001): phase, player count
  (0 to 8), whether it is leader, its team.
- **Team switching, picker navigation and lock-ins** are `action` messages. Pause, resume and
  quit have their own message (`control`).
- **Shake** is a button bit; **swipe** is an `action`; **tilt** adds two bytes to the input
  frame while a layout asks for it.
- **ICE text is printable ASCII.**
- **Relay usage** (NET-004) has no message.
- **`AnalogInput` is in units from -1 to 1**, not wire steps; the sender rounds.

---

## Review history

| Round | What changed |
|---|---|
| First hand-back | Messages and validators; a 7-byte input frame; the release repeated three times; a host receive rule with a 250 ms silence limit. |
| Round 1 | Host receive rule removed in favour of sim-core's; taps recorded from touch events and repeated; decoders wrapped; `haptic` and `kicked` removed; `viewRev` on `action`; handshake, version and `game-running` rules written down; nickname hardened; caps made consistent. |
| After round 1 | Four repeats spaced by a clock; 33 ms keep-alive. |
| Round 2 | The reviewer measured the clocked repeats with real timers: half the calls counted for nothing, the cycle stretched to 200 to 270 ms, ordinary mashing dropped taps, a clock stepping backwards froze buttons. **The timed repeats, the clock and the queue are gone.** Frames now carry history; `expandInput` added; signalling split by role; `close-room`, `name-refused` and data-channel constants added; nicknames counted as a player sees them; `room.players` allows 0; decoders take a `DataView`. |
| Round 3 | Passed as clean enough to merge, with small items. A tick on the touch event is required, not optional. Tag characters only after the black flag. Joiner and non-joiner allowed between letters and after a virama. `seat` and `room` check a name's content only; the host's count is the authority. README: the buffer applies only newer ticks; names are shown as text, never HTML. The reviewer's merge figures, the 30-a-second question and the phantom press after a delay spike recorded. |
