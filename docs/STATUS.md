# Kaki Arcade — Status

What actually works today. Kept honest: if it has not been seen working in UAT, it is not
listed as working. Updated in the same slice as any change (`WORKFLOW.md` step 5).

**Last updated:** 2026-11-16 · **Milestone:** M0 complete. **Build started 2026-11-16 on Randy's go (D-043):** Wave 0 running. Design gate: boards 0, 0B, 1A, 2 and 2B done; 1, 3, 4 and 5 to come.

## Works

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
  cross-client rate limits (C-03) yet. Built by Codex; two review rounds against a real local
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

## Does not exist yet

- No host page, controller or game yet.
- `pnpm uat`, `pnpm perf`, `pnpm dev` (later issues).

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

## Performance numbers

None measured yet. First numbers come from the M2 spikes.

| Date | Slice | Players | Frame p95 (laptop) | Frame p95 (TV) | Input p95 (direct) |
|---|---|---|---|---|---|

## Real-device checks

None run yet (`UAT.md` §5).

## Known gaps and risks

- Performance budgets are targets, not measurements, until M2.
- Whether the TCL Q65's own browser can run the game is unknown (REL-005).
- Names are not checked for trademarks (OQ-001).
- Boards 1, 3, 4 and 5 still need Randy's choices; nothing visible is built before them.
