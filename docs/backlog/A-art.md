# Track A — Art (Blender)

Process: `../ART-PIPELINE.md`. Every asset is rebuilt from a script; `assets/dist/` is generated. One render job runs at a time (`../PLAN.md` §5).

**Owns:** `tools/blender`, `assets/`

Rules for working an issue are in `../PLAN.md` §5 and §6. Status: `todo` · `doing` · `review` · `merged`.

## Story A1 — The game looks finished and moves correctly



| ID | Issue | Requirements | Depends on | Wave | Status |
|---|---|---|---|---|---|
| A-01 | Pipeline tooling: `pnpm assets`, atlas packer, manifest with sizes checked against the budgets, half-resolution variants (no Git LFS: D-054) | PERF-023, PERF-024 | F-01 | 1 | merged |
| A-02 | The cook body: rig and 9 actions in 8 directions with no foot sliding, colour mask for apron and cap, head anchor per frame | TR-060, NN-4 | G-01, S-02, A-01 | 2 | merged |
| A-02b | Cook chop side raise as the default, lossy WebP q90 cook storage with a difference check, one-island body check; absorbs A-02c (D-172, D-177) | TR-060 | A-02 | 2 | merged |
| A-02d | Cook gait readability: spine sway about ±0.10 rad once per stride and bob about 0.03 tiles, carried hands ride the torso; walk gate in `cook_strips.py --check-motion` (each foot ≥ 15 px, each hand ≥ 8 px, sideways head travel ≥ 8 px, opposite-phase change ≥ 1.5 × idle in each direction; walk and carry-walk in MOTION_THRESHOLDS); rendered strips current against proposed to Randy first (rule 5). Before A-03 renders heads against the anchors and before T-07 shows cooks | TR-060 | A-02b | 2 | todo |
| A-03 | The 8 character heads in 8 directions | TR-064, TR-061 | A-02 | 2 | todo |
| A-04 | Ingredients and the 7 dishes in each state, with order-card icons | TR-040, TR-041 | G-01, A-01 | 2 | done |
| A-05 | Stations in each state: empty, working, done, burning, on fire | TR-030, TR-031, TR-010 | G-01, A-01 | 2 | todo |
| A-06 | Level backgrounds for the four venues: 8 co-op levels and 3 arenas, with collision maps and anchors exported | TR-050, TR-052, TR-057 | A-05, T-06 | 3 | todo |
| A-07 | Effects: steam, sparks, fire, extinguisher spray, thrown-item shadows | TR-009, TR-010, TR-062 | A-01 | 2 | merged |
| A-07b | Effect readability (D-192): sparks unlit with an edge-red #B5371F rim at 6×8 px; strip every PNG text chunk so re-renders are byte-stable; shadow grain; steam and spray stronger on light marble; half-detail and greyscale columns in `effect_strips.py`, which must not reset `review.json`. One render, before T-07 draws effects | TR-010, TR-062 | A-07 | 2 | todo |
| A-08 | Playing cards: faces, back and flip frames, suits distinct by shape | PP-030, PP-031 | G-02, A-01 | 2 | done |
| A-09 | Shell imagery: landing illustration and game picker tiles (image generation may use Codex, logged) Keep `<LegalFooter/>` and a phone landing flow that passes legal.dom's centre-point hit test (D-189). | REL-002, PLAT-020 | G-02 | 2 | todo |
| A-10 | Dish art polish after A-04 (D-145): mixed rojak heap, recognisable chopped turnip and chicken at 1×, broth and cup-food cases, document and use the dish composition fields, 1× evidence | TR-041 | A-04 | 2 | done |

## Carried from reviews

- **Done (A-01b, merged 2026-11-18): A-01b (before A-02 or A-06):** the Blender render timeout is a fixed 300 s; make it per job
  or per frame. Lossy encoding must be allowed only where a page holds a single frame
  (backgrounds), since neighbours bleed into each other otherwise.
- **Done (A-01b, merged 2026-11-18): A-01d (with A-01b):** `pipeline.py --render` decides staleness by modification time, so a
  merge or checkout re-renders other issues' jobs (A-08 re-rendered S-02's cook spike twice).
  Decide staleness by input content hash and add `--only <script>` to render one job.
- **A-01c:** store frame records once per body and mask page pair (the mask repeats them, 109 KB
  of a 248 KB manifest); give the items job an explicit Cycles seed and thread count (A-07's re-render moved one pixel of container-plate-dirty by one level); delete old round data files on rebuild; cache packing by input hash
  (about 30 s per level today, and verify runs it); the singular `anchor` default; a failed
  `pnpm assets` leaves the old manifest behind.
- **For track T:** clip sprites to `sourceSize` (odd sizes carry one guard pixel); one page per
  action means more texture binds (9 pages for a cook body, 18 with the mask), so plan draw
  batching around it; the whole manifest is charged to every round.

### A-02b review follow-ups (2026-11-18)

- A-03 (heads): reuse the cap's mask and anchor contract; each head must clear the 6 px head-step
  limit; check the SE chop raise against taller heads.
- T-07: advance walk frames by distance travelled over `strideTiles`, not at a fixed frame rate,
  because stick deflection scales speed (`movement.ts:97`); draw the carried item at the `hands` anchor.
- SE chop hold: a pose tweak only if Randy rejects it after seeing the strip (D-177).
