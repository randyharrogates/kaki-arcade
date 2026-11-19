# A-02d cook gait evidence (TR-060)

## Rendered inputs and scope

The integrator re-rendered only `cook-body-walk` and `cook-body-carry-walk`,
via `cook_walk.py` with `cook_gait.py`. All other jobs are byte-identical.
Round 3 ran no Blender or re-render. `pipeline.py --check-stale` exits 0;
the obsolete round-2 stale log has been deleted.

## Built gait

Once per stride the torso follows a circuit of ±0.05 tiles sideways and
fore-and-aft. Spine pitch and yaw are ±0.04 rad, with no roll. Bob is 0–0.03
tiles once per stride: lowest at frame 0, highest at frame 4. Smoothstep keys
have no overshoot. Walk arm swing is reduced from ±0.18 to ±0.06 rad;
carried hands ride the torso.

## Walk gate

Fresh rendered gate results supplied by the integrator:

- Feet: 20.2–21.6 px (minimum 15).
- Hands: 9.5–17.6 px (minimum 8).
- Head sideways: 8.8 px east/west; 12.0–15.2 px elsewhere (minimum 8).
- Opposite-phase changes: at least 5,322 px; required 1.5 × idle is at most 4,752.
- Largest head-anchor step: 5.56 px (maximum 6).

Round 3 preserves these renders and thresholds. Missing walk landmarks now
record `missingLandmarks` and explicitly fail the gate, covered by a regression.

## Comparisons

`cook_gait_compare.py --current-ref 36b26c07561d991e3bba671edf7380d7b481b187`
regenerated sixteen PNGs: `{walk,carry-walk}-{s,e,ne,n}-{1,4}x.png`, plus
`comparison.json`. The baseline is frozen to the original comparison commit.
The eight 1× PNGs are copied to `docs/design-gate/A-02d-cook-gait/`.
The sheets and JSON no longer claim an unchanged atlas budget.
West views are rendered separately, not mirrored.

## Cost

Cook-body atlases add 62,440 B transferred (total 1,805,164 B) and 1,838,304 B
decoded (total 50,818,800 B). Page 2 grows from 1560×1954 to 2046×1954.
Tabao Rush uses 2,491,936 / 8,000,000 B transferred and
57,289,584 / 256,000,000 B decoded. PERF-023/024 pass.

## Heads validation and checks

- Asset unit tests: PASS, 112 tests, one skip.
- Blender-free unit tests: PASS, 43 tests.
- Targeted Vitest (`tools/assets/pipeline.test.ts`, two workers, 600 s limit):
  PASS, six tests, 105.87 s.
- `pipeline.py --check-stale`: PASS, exit 0.
- `git diff --check`: PASS.
- Heads review: PASS, exit 0; socket/difference validation and production
  packing passed PERF-023/024 (10 atlases).

Round-3 command logs are not committed (`*.log` is ignored); the results are recorded above. After the merge with main (c9aebd1d) a fresh pack gives the Tabao Rush round 2,491,936 / 8,000,000 B sent and 57,289,584 / 256,000,000 B decoded; the asset tests and the stale check pass on the merged tree.

Heads outputs are in `heads-review/`: `head-difference.json`,
`{cap,uncle,auntie,makcik,bun,specs,turban,songkok}-{light,dark}-{1,4}x.jpg`
(32 strips), and `play-grey-{1,2,3,4}-{light,dark}-{1x,3m}.png` (16 images).
The integrator will inspect the cap strips at 4× and the play-grey 3 m images;
script success does not establish visual recognition.

### Heads output inventory

- `heads-review/auntie-dark-1x.jpg`
- `heads-review/auntie-dark-4x.jpg`
- `heads-review/auntie-light-1x.jpg`
- `heads-review/auntie-light-4x.jpg`
- `heads-review/bun-dark-1x.jpg`
- `heads-review/bun-dark-4x.jpg`
- `heads-review/bun-light-1x.jpg`
- `heads-review/bun-light-4x.jpg`
- `heads-review/cap-dark-1x.jpg`
- `heads-review/cap-dark-4x.jpg`
- `heads-review/cap-light-1x.jpg`
- `heads-review/cap-light-4x.jpg`
- `heads-review/head-difference.json`
- `heads-review/makcik-dark-1x.jpg`
- `heads-review/makcik-dark-4x.jpg`
- `heads-review/makcik-light-1x.jpg`
- `heads-review/makcik-light-4x.jpg`
- `heads-review/play-grey-1-dark-1x.png`
- `heads-review/play-grey-1-dark-3m.png`
- `heads-review/play-grey-1-light-1x.png`
- `heads-review/play-grey-1-light-3m.png`
- `heads-review/play-grey-2-dark-1x.png`
- `heads-review/play-grey-2-dark-3m.png`
- `heads-review/play-grey-2-light-1x.png`
- `heads-review/play-grey-2-light-3m.png`
- `heads-review/play-grey-3-dark-1x.png`
- `heads-review/play-grey-3-dark-3m.png`
- `heads-review/play-grey-3-light-1x.png`
- `heads-review/play-grey-3-light-3m.png`
- `heads-review/play-grey-4-dark-1x.png`
- `heads-review/play-grey-4-dark-3m.png`
- `heads-review/play-grey-4-light-1x.png`
- `heads-review/play-grey-4-light-3m.png`
- `heads-review/songkok-dark-1x.jpg`
- `heads-review/songkok-dark-4x.jpg`
- `heads-review/songkok-light-1x.jpg`
- `heads-review/songkok-light-4x.jpg`
- `heads-review/specs-dark-1x.jpg`
- `heads-review/specs-dark-4x.jpg`
- `heads-review/specs-light-1x.jpg`
- `heads-review/specs-light-4x.jpg`
- `heads-review/turban-dark-1x.jpg`
- `heads-review/turban-dark-4x.jpg`
- `heads-review/turban-light-1x.jpg`
- `heads-review/turban-light-4x.jpg`
- `heads-review/uncle-dark-1x.jpg`
- `heads-review/uncle-dark-4x.jpg`
- `heads-review/uncle-light-1x.jpg`
- `heads-review/uncle-light-4x.jpg`
