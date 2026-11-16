# @kaki/protocol

Every message between a phone, the host page and the pairing server, with validators. Pure
TypeScript: no DOM, no Node, no dependencies. Decoders and validators accept any value, return
a `Result` and never throw.

| File | What | Format |
|---|---|---|
| `src/signal.ts` | host or phone ↔ pairing server (WebSocket), one decoder per role | JSON |
| `src/channel.ts` | phone ↔ host, reliable ordered data channel | JSON |
| `src/wire.ts` | phone ↔ host, unreliable unordered data channel | binary: input 7 to 23 bytes (2 more with tilt), ping 5, pong 3 |
| `src/input.ts` | input ticks, the phone's send rule, the host's `expandInput` | — |
| `src/datachannel.ts` | labels and options of the two data channels | — |
| `src/names.ts` | `checkNickname`: what a nickname may be | — |
| `src/limits.ts` | the protocol version and every size cap | — |

Every JSON message is `{ v: 1, t: "<type>", ...fields }`. Optional values are always present,
as `null` when absent. Fields a type does not define are dropped by the validator.

## Rules every user of this package follows

### Encoders do not validate

`encode…` functions trust their types. In development, the host and the pairing server should
run the matching validator on each message they are about to send, so that a mistake shows up
at the sender and not as a silent refusal on a phone.

### Versions

Every message and frame carries the protocol version. A message with another version cannot be
read at all, so the other side's explanation (`close` with `unsupported-version`, or the
pairing server's `error` with `unsupported-version`) will itself fail to decode. **A page that
gets `bad-version` from any decoder, on any channel, treats that result as the explanation:
"this page is out of date; reload."**

### Signalling roles

A socket's first message decides what it is: `create` or `reopen` makes it a host socket,
`join` makes it a phone socket. The pairing server reads that first message with
`decodeOpeningSignal`, and everything after it with `decodeHostSignal` or `decodePhoneSignal`
according to the role. Each accepts only what that role may send, so `to-phone`, `drop` and
`close-room` from a phone are refused by the decoder itself. The host page reads with
`decodeToHostSignal`, a phone with `decodeToPhoneSignal`.

- A socket sends its opening message **once**. A phone may not send `join` twice on one
  socket; to enter another room, or to try again, it opens a new socket.
- `SIGNAL_PING_TEXT` and `SIGNAL_PONG_TEXT` are the exact keep-alive strings, for a server
  that can answer a fixed string without waking.

### Handshake

- **The host always makes the offer**, and creates both data channels before it does:
  `INPUT_CHANNEL_LABEL` with `INPUT_CHANNEL_OPTIONS` (unordered, no retransmits) and
  `CONTROL_CHANNEL_LABEL` with `CONTROL_CHANNEL_OPTIONS` (ordered, reliable). Both sides set
  `binaryType` to `'arraybuffer'`. The host starts when the pairing server sends `peer-joined`.
- **The phone only answers.** `to-phone` and `from-host` carry an offer or candidates;
  `to-host` and `from-phone` carry an answer or candidates. The validators refuse the reverse.
- **After `reopen`** (the host page reloaded) the pairing server sends the host `peer-joined`
  again for every phone still waiting, meaning every phone socket the server still holds open
  for that room. A phone whose socket has closed opens a new one and sends `join`.
- **Ending a room:** the host sends `close-room`. The server sends every phone `dropped` with
  `room-closed`, forgets the room and closes the sockets.
- ICE servers arrive in `created` and `joined`, and again on a `relay` request. A server with
  no login has `username` and `credential` set to `null`; leave those two keys out when
  building the `RTCPeerConnection` configuration, which does not accept `null`.

### Joining and names

- A new phone sends `hello`; a returning one sends `resume` with its seat token. The host
  answers `seat`, `refused` or `name-refused`.
- **The seat token does not rotate.** A seat keeps the same token for as long as the room
  lasts.
- `refused` with `seat-expired`: the phone may send `hello` on the same channel.
- `refused` with `game-running`: the channel stays open. The host sends that phone `room` on
  every phase change, and the phone sends `hello` again when `canAskToJoin(phase)` is true.
  The host may still refuse.
- **Names.** `checkNickname(text)` returns `'ok'`, `'blank'`, `'too-long'` or
  `'bad-characters'`. The join form runs it before sending; the host runs it on every `hello`
  and `set-name` (which carry the name unchecked, so the host can read it) and answers
  `name-refused` with the reason if it fails. "12 characters" means 12 as a player sees them:
  a Tamil syllable or an emoji built from joined parts is one. A name that passes but is on
  the blocked-words list is replaced, not refused, and `seat.nameReplaced` says so.
- **The host's count is the one that decides.** Where a browser has no `Intl.Segmenter` the
  count is approximate (never lower, sometimes higher). So the names the host sends, in `seat`
  and as team names in `room`, are checked on the phone for size and forbidden characters
  only, never counted again: a phone cannot refuse a name its host accepted.
- **Show a name as text, never as HTML.** `<script>` passes `checkNickname`. Every consumer
  (big screen, phone, any log or results page) must put names on the page as text nodes or
  canvas text, not through `innerHTML` or anything like it.

### Input (NET-005)

The phone works in **ticks**. Each tick has one button mask and one sequence number, and every
frame carries its own tick plus the masks of the `INPUT_HISTORY` (8) ticks before it. So every
tick travels in nine frames, and any eight frames in a row, or any 50 ms of link, can be lost
without losing a press or a release. Nothing is delayed to achieve this.

Phone side (`input.ts`):

- Touch events call `pressButtons` and `releaseButtons` (or `setButtons`). These only record.
- `nextInputSend(sender, analog)` is one tick. Call it on a timer (60 a second: `setInterval`,
  `setTimeout` or `requestAnimationFrame` all do; the sender has no clock and does not care
  about jitter). Send the frame it returns. When it returns `more: false` the timer can stop
  until the next touch.
- **A touch event MUST also tick straight away** (subject to the cap below), not wait for the
  timer. Without it a press waits for the next timer tick: the 95th-percentile delay before
  the press is sent is 34 to 38 ms, and up to 50 ms when the browser skips a frame. With it
  the figure is 21 ms.
- **The cap is the caller's job:** no more than `INPUT_MAX_HZ` (120) ticks a second. A tick
  that would come sooner than 8.3 ms after the last is put off until then, never dropped.
- While anything is held the phone keeps ticking, at least every `INPUT_KEEPALIVE_MS` (33 ms).
  After everything is released it keeps ticking until the released state has gone out nine
  times, then goes quiet.
- **A layout with a tilt part never goes quiet:** tilt counts as held, so the phone sends
  9-byte frames for as long as that layout is up (270 bytes a second at the keep-alive rate,
  540 at 60 ticks a second).
- A button's bit changes at most once per tick. A tap shorter than a tick is one tick set and
  the next clear. Three changes of one button between two ticks cannot be told apart from
  one: two cancel, and the button ends where the thumb is.

Host side:

- Decode with `decodePhoneFrame`, pass the input through **`expandInput(frame)`**, and give
  every tick it returns, oldest first, to `@kaki/sim-core`'s input buffer. The buffer applies
  only the ticks newer than the newest it already has, in order, and ignores the rest. A tick
  older than that is never applied, whether or not it was seen before.
- Create the buffer with `seqModulus: SEQ_MODULO` and `staleAfterSteps: INPUT_STALE_STEPS`, one
  slot per data channel. Pass `buttons` as it is and each axis through `axisToUnit`.
- When to reset a slot and what to do when a game resumes from pause are **sim-core's host
  rules**, not repeated here (`reset()` for a new data channel only; `discardEdges()` on
  resume).

### Pings

A phone sends 12 pings in quick succession when the input channel opens, then one a second.
The host answers each with a pong. What round trip or loss makes a link `weak` is decided in
netcode; the protocol only carries the result (`link`).

### Opaque payloads

`layout`, `view` and the `data` of an `action` belong to the game interface. Here they are any
JSON within a size and depth cap. An `action` carries the revision of the layout and of the
private view the player was looking at, so the host can ignore one that arrives late.
