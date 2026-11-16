# Track A — Art (Blender)

Process: `../ART-PIPELINE.md`. Every asset is rebuilt from a script; `assets/dist/` is generated. One render job runs at a time (`../PLAN.md` §5).

**Owns:** `tools/blender`, `assets/`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story A1 — The game looks finished and moves correctly



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| A-01 | Pipeline tooling: `pnpm assets`, atlas packer, manifest with sizes checked against the budgets, half-resolution variants (no Git LFS: D-054) | PERF-023, PERF-024 | F-01 | 1 | merged |
| A-02 | The cook body: rig and 9 actions in 8 directions with no foot sliding, colour mask for apron and cap, head anchor per frame | TR-060, NN-4 | G-01, S-02, A-01 | 2 | todo |
| A-03 | The 8 character heads in 8 directions | TR-064, TR-061 | A-02 | 2 | todo |
| A-04 | Ingredients and the 7 dishes in each state, with order-card icons | TR-040, TR-041 | G-01, A-01 | 2 | todo |
| A-05 | Stations in each state: empty, working, done, burning, on fire | TR-030, TR-031, TR-010 | G-01, A-01 | 2 | todo |
| A-06 | Level backgrounds for the four venues: 8 co-op levels and 3 arenas, with collision maps and anchors exported | TR-050, TR-052, TR-057 | A-05, T-06 | 3 | todo |
| A-07 | Effects: steam, sparks, fire, extinguisher spray, thrown-item shadows | TR-009, TR-010, TR-062 | A-01 | 2 | todo |
| A-08 | Playing cards: faces, back and flip frames, suits distinct by shape | PP-030, PP-031 | G-02, A-01 | 2 | todo |
| A-09 | Shell imagery: landing illustration and game picker tiles (image generation may use Codex, logged) | REL-002, PLAT-020 | G-02 | 2 | todo |

## Carried from reviews

- **A-01b (before A-02 or A-06):** the Blender render timeout is a fixed 300 s; make it per job
  or per frame. Lossy encoding must be allowed only where a page holds a single frame
  (backgrounds), since neighbours bleed into each other otherwise.
- **A-01c:** store frame records once per body and mask page pair (the mask repeats them, 109 KB
  of a 248 KB manifest); delete old round data files on rebuild; cache packing by input hash
  (about 30 s per level today, and verify runs it); the singular `anchor` default; a failed
  `pnpm assets` leaves the old manifest behind.
- **For track T:** clip sprites to `sourceSize` (odd sizes carry one guard pixel); one page per
  action means more texture binds (9 pages for a cook body, 18 with the mask), so plan draw
  batching around it; the whole manifest is charged to every round.
