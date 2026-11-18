# X-04 — Anonymous error and performance counts

Requirement IDs: DATA-003, DATA-001, NN-3. Related budgets: PERF-001,
PERF-002, PERF-010, PERF-011 and PERF-020. Branch: issue/X-04-anon-counts.

Goal: collect bounded anonymous integer counts from the host outside play,
using the existing pairing-server infrastructure without personal data.

## Exactly what is counted (DATA-004 / X-03)

The complete implemented event set is:

| Kind | What one increment means |
|---|---|
| `error:host:session` | The session runner reports an error; its operation, seed, step and error details are discarded. |
| `error:host:load` | Starting a session rejects, excluding a user-cancelled start; no exception text is collected. A setup failure can also increment the session error above. |
| `error:signal:unavailable` | The host transport reports `socket-unavailable`. |
| `reconnect:signal` | The host's signalling connection drops after it had connected: one per outage, however many retries it takes. A first connection that never succeeds is not counted here. Phone reconnects are not counted. |
| `perf:host-frame-p95:le17` | A completed match's observed animation-frame p95 is in the ≤17 ms band. |
| `perf:host-frame-p95:le34` | That p95 is >17 and ≤34 ms. |
| `perf:host-frame-p95:le50` | That p95 is >34 and ≤50 ms. |
| `perf:host-frame-p95:gt50` | That p95 is >50 ms. |

One frame band is counted only after at least 600 positive, finite animation-frame
intervals in a match. Four integer histogram cells are preallocated; a frame only
selects a cell and increments its integer. No raw frame samples are retained.
These are coarse observations, not PERF budget verdicts: no device class, refresh
rate, three-minute validity check, visibility classification or contention verdict
is collected. The bands deliberately do not claim exact 16.7/33.3 ms budget tests.
No controller start-up or touch-to-host latency is reported: the production host
has no trustworthy measurement of these, and phones must send no telemetry.

The transmitted object is a sparse map of those exact keys to positive integers
≤65,535, capped at 512 UTF-8 bytes. Every other field is invalid, including day,
timestamp, nickname, room code, seat, IP, user agent, device ID, free text and stack
traces. The server chooses the UTC receipt day. No identifiers accompany a batch.

## Implementation and acceptance

- `packages/protocol/src/counts.ts` is the integrator-authorised **additive contract
  change**: new exports `COUNT_KINDS`, `CountKind`, `Counts`, `COUNTS_MAX_BYTES`,
  `COUNT_MAX`, and `validateCounts`, with `counts.test.ts`; one additive export in
  `index.ts`. No existing message, type or validator changed. Review this addition
  as a contract change under PLAN §2/§4.
- `apps/web/src/counts.ts`, `browser.ts` and `session-adapter.ts`: host-only,
  in-memory collection. One fetch at the actual results boundary; pending counts
  drain before delivery, so repeated end/hide callbacks cannot resend a batch.
  Page hide/hidden uses one fetch with keepalive, credentials omitted and no referrer. While a match is active, hide sends nothing;
  an abandoned match's frame sample is discarded. Existing pending errors may be
  lost on tab exit during play; NN-3 takes priority over a final upload.
- A new match aborts any pending counts fetch before frame subscription. Fetch has
  a two-second timeout, omits credentials/referrer, and disables collection on a
  non-success response or network failure. No retry or background timer is added.
  A rejected or throwing hide fetch disables collection; delivery remains best effort
  and is never retried.
- `apps/signal/src/counts.ts`, `worker.ts`, `room-object.ts`: POST `/counts` uses
  the existing origin policy, streaming byte cap and schema validation. The existing
  admission limiter uses a separate rotating HMAC namespace for counts: burst 8,
  refill one per minute, per IPv4 / IPv6 /64 and an additional IPv6 /48 meter.
  Both rotation windows are charged. A bounded Worker refusal cache avoids limiter
  calls on repeated refusals. No raw address, original headers or URL reaches storage.
- Reserved existing `ROOMS` objects named `counts:YYYY-MM-DD` aggregate totals under
  the single `counts` storage key, with concurrency protection and integer saturation
  at MAX_SAFE_INTEGER. Each stored record has only the eight possible kind keys and
  integer values. Daily totals currently have no expiry. No new binding, dependency,
  paid product, wrangler setting, log or deployment is introduced.
- GET `/counts` is read-only, available only with local runtime variable
  `COUNTS_DEV_READ=true` and URL hostname localhost/127.0.0.1/[::1]. It still requires
  the configured allowed Origin. With the local worker running, Randy can print
  today's map using `curl -H 'Origin: <configured web origin>' http://localhost:<signal port>/counts`.
  Production defaults to 404; no read switch was enabled in configuration.

## Close-out

Code and tests cover strict schema rejection, batching, fixed bands, failed-delivery
shutdown, session results integration, phone lifecycle sending nothing, endpoint
size/validation refusals, real admission limits and refusal caching, aggregation,
local-only reads and absence of IP/headers from forwarded requests/stored records.
The protocol tests are included in the Round 2 prescribed command. The integrator
reports that the five browser test files and protocol tests pass outside the sandbox
(112 files, 2,214 tests passed). Local results are recorded separately in REPORT.md.

## Round 2

Corrected the IPv6 /48 admission key suffix so it receives the shared-network budget,
and applied EDGE_LIMIT to the rotating counts hash before admission/body processing.
Cancelled starts no longer increment error:host:load. Frame-band kinds are explicit.
Added regression coverage for IPv6 shared limits, edge rejection, quiet refusal paths,
fetch privacy/timeout options, lifecycle beacons, all three browser count increments,
cancelled loads and phone construction never calling hostCounts.

For the privacy page and ops: `error:signal:unavailable` under-counts by design. The
batch is sent to the server that was unreachable, and a failed send switches collection
off. Counts gathered before pairing is ready are sent on a later hide or match end.
Daily totals have no expiry. These are best-effort aggregate observations.

Only the prescribed checks were run; test/typecheck launches followed an `uptime`
check with one-minute load below 8. No UAT, perf, memcheck, verify, install,
deployment or commit. Independent review remains with the integrator.

## Choices for the integrator

1. Review the expressly authorised protocol addition and use the exact counted set
   above for X-03's privacy page; do not claim controller start-up/input-latency counts.
2. Retain the strict no-send-during-play precedence, including no exit beacon during
   an active match. Delivery is deliberately lossy, never retried or deduplicated by ID.
3. Review the separate admission budget and two/four limiter calls per accepted
   IPv4/IPv6 batch, plus one aggregate-object fetch/read/write. Cached refusals use no
   Durable Object calls. Existing COST output remains in the test log. Counts share
   existing admission shards but do not spend the pairing keys' normal budgets.
4. Choose any future expiry policy for anonymous daily totals. This slice keeps the
   tiny daily maps; it stores no session records or joinable dimensions.

## Requests

No outstanding dependency or contract-location request: the binding integrator
answer authorises `packages/protocol`. The integrator reports the five browser
test files and protocol tests pass outside the sandbox; review the additive contract
before integration. No protected
tracker, requirement, design, performance, backlog or lockfile was edited.

## Round 3

Added `uat/slices/X-04-counts.mjs` (DATA-003). It uses the existing worktree-port
runner, hosts a real room, seats one phone, picks Rabakz with its default shortest
length (ten), waits for 620 real animation frames and taps phone answers to the
match end. It captures the production host's POST via page request events, checks
204, continues to console results and captures `counts-results-tv`. In headed
Chromium it minimises the actual host window using CDP, waits for the browser's
hidden visibility state, then restores it; no synthetic visibility or counts call.
A browser GET reads the worker's current UTC-day totals. The slice checks that the
read-back equals the host batch, contains exactly one performance-band increment,
and has only allowlisted kinds with positive safe integers. A seeded worker-origin
cookie makes the no-cookie assertion meaningful. All observed POST/GET counts
requests must omit Cookie and Referer. Results hide must not resend a drained batch.
It saves `counts.json` and `counts-requests.json` alongside the screenshot.

The smallest harness addition is repeatable `--signal-var NAME:value`, forwarded
as explicit local Wrangler variables on every worker start. It is game-agnostic,
validated by the argument parser and covered by parser/runner unit tests. No product
code changed. The worker read switch remains off unless explicitly requested.

Integrator commands, outside the sandbox (from this worktree; default ports
6740/6741, or existing `KAKI_PORT_WEB` / `KAKI_PORT_SIGNAL` overrides):

```sh
pnpm uat -- X-04-counts --phones 1 --signal-var COUNTS_DEV_READ:true --out round3
```

Round 3 (integrator, 2026-11-18): window minimising over CDP does not change `document.visibilityState` in
Playwright's Chromium (probe: minimise, new tab and a launch without its backgrounding switches all stayed
`visible`), so the hide step now leaves the TV page, which fires `visibilitychange` and `pagehide` from the
browser itself. The run no longer needs `--headed`; the paragraph below describes the earlier approach.
This is a headed-only visibility check. Keep the TV window visible during play;
the slice minimises it once after results. Inspect the TV screenshot and JSON under
`uat/evidence/X-04-counts/round3/`, then complete visual review in its generated
REPORT.md. Run away from UTC midnight; the read assertion rejects day rollover.
No UAT or evidence capture was run in this sandbox.

Prescribed local validation (test/typecheck started after `uptime` showed one-minute
load below 8):

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/signal tools/uat apps/web/src`:
  54 files / 722 tests passed; five existing browser tests failed at Chromium launch
  because the sandbox denied macOS MachPortRendezvous bootstrap registration.
  The new harness tests passed. Integrator must rerun the same command outside
  the sandbox for a full pass; tests were not skipped or weakened.
- `pnpm exec tsc -b tsconfig.build.json`: passed.
- `pnpm exec eslint apps/signal tools/uat apps/web/src uat/slices/X-04-counts.mjs --max-warnings 0`:
  passed, including the final rerun.
- `pnpm run lint:design`: passed, 422 files scanned.

No verify, UAT, perf, Blender, install, wrangler, memcheck or commit command was run.

## Round 4 (DATA-003, DATA-001, NFR-TEST)

Replaced the hide-path navigator beacon with fetch with keepalive, a string
text/plain body, credentials omitted and no referrer. The internal delivery hook
still bears the name `beacon`, but now accepts a promise so HTTP refusals and
promise rejections disable collection too. A synchronous fetch throw also disables
collection without retrying. Browser-adapter tests assert the exact hide options,
the drained batch behaviour, and disablement for all three failure forms.

Added direct coverage that visibilitychange to visible sends nothing and preserves
the batch for a later hide, and that stopping an abandoned match discards its
600-frame histogram without producing a band.

The UAT now stops signalling after results, waits for the real Reconnecting state,
restarts signalling and waits for recovery before navigating the TV away. It polls
the local worker GET with a fifteen-second deadline for a positive reconnect:signal
total, checks the completed-match frame band remains exactly 1, and compares every
results-batch total against read-back to detect resending. Page request events are
not evidence of unload delivery: worker totals prove that delivery. Hide-path
headers are covered by the exact fetch-option assertions in browser.test.ts;
the harness does not expose server-side request headers. Observed results/GET
headers are still checked with the seeded cookie present.

Removed favicon routing from host and phone contexts, preserving normal HTTP cache
behaviour for UAT and shared performance contexts. Only the exact missing-resource
404 console message at the web origin's /favicon.ico is automatically expected.
Harness tests also reject other asset paths, the signal origin and a non-404
favicon failure. Removed unused fake route stubs.

Updated ARCHITECTURE §1 and §5 for daily counts objects and fetch with keepalive,
recorded as D-180 by the integrator. This section supersedes earlier beacon privacy
claims and the round-3 drained-hide proof. No new browser evidence is claimed.
Round-3 REPORT.md remains untouched; the integrator must run round 4 and inspect
the screenshot and JSON before completing its review fields.

Round-4 UAT command (not run here):

```sh
pnpm uat -- X-04-counts --phones 1 --signal-var COUNTS_DEV_READ:true --out round4
```

Validation started only after uptime showed one-minute load below 8:

- `VITEST_MAX_WORKERS=2 pnpm exec vitest run apps/web/src apps/signal tools/uat packages/protocol`:
  63 files passed, 1,087 tests passed. Five files each had one Chromium-launch failure:
  host-keyboard.dom.test.ts, PeekPoker.dom.test.ts, Overlap.dom.test.ts,
  team-polish.test.ts and layout-fixtures.test.ts. macOS denied
  MachPortRendezvous bootstrap registration (permission denied 1100).
  Changed browser-adapter, counts and harness unit tests passed. This run preceded
  the lint-only assertion typing edits; no repeat was started after load rose above 8
  (last observed 16.44). Final typecheck and ESLint cover those edits.
- `pnpm exec tsc -b tsconfig.build.json`: passed after correcting optional
  count lookups; passed again after the final lint fixes.
- `pnpm exec eslint apps/web/src apps/signal tools/uat uat/slices --max-warnings 0`:
  passed after correcting assertion and JSON typing.
- `pnpm run lint:design`: passed, 422 files scanned.

Close-out: all five requested code/documentation items implemented; browser UAT and
independent review remain for the integrator. No commit, verify, UAT, perf or
install was run, and no protected tracker, contract or lockfile was edited.

Requests: run the exact round-4 UAT command above, review its evidence, rerun the
five Chromium-dependent tests outside this sandbox and allocate the decision ID.
