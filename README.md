# Kaki Arcade

A browser games platform for a room full of people. One big screen shows the game; every
player scans a QR code and their phone becomes a console-style controller. Up to 8 players,
nothing to install.

v1 ships two original games:

- **Tabao Rush** — real-time co-op cooking in a Singapore hawker centre.
- **Peek Poker** — a memory game scored with poker hands.

**Status:** planning complete, no application code yet. See [`docs/STATUS.md`](docs/STATUS.md).

## Start here

| If you want to know | Read |
|---|---|
| What is being built | [`docs/PRD.md`](docs/PRD.md), [`docs/games/`](docs/games/) |
| What works today | [`docs/STATUS.md`](docs/STATUS.md) |
| What comes next | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| How work is done | [`docs/WORKFLOW.md`](docs/WORKFLOW.md), [`docs/UAT.md`](docs/UAT.md) |
| Requirement by requirement progress | [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) |
| The design rules | [`docs/DESIGN.md`](docs/DESIGN.md) |
| How it is built | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md), [`docs/ART-PIPELINE.md`](docs/ART-PIPELINE.md) |
| Why a choice was made | [`docs/DECISIONS.md`](docs/DECISIONS.md) |
| What is waiting on Randy | [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md) |

Rules for coding agents: [`CLAUDE.md`](CLAUDE.md) and [`AGENTS.md`](AGENTS.md).

## Today

```bash
python3 tools/trace_check.py     # check the PRD against the tracker
blender -b --factory-startup -P tools/blender/sample_stall.py -- /tmp/stall.png   # sample render
```

Private repository. Not licensed for reuse.
