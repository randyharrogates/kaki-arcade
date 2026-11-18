# A-03 — Cook heads

Requirements: TR-064, TR-061; TR-060. Branch: issue/A-03-cook-heads.

Added seven head jobs alongside cap, sharing its 8-facing sprite/mask frame set,
socket rig, staging, hash validation and content stamps. Reused the original
kalib board-1 designs with shared body proportions, with head-local changes to
bun size, turban hue and specs hair colour in rounds 5–6.
Cap's CLI default and frame ids remain unchanged. Atlas storage encoding remains
unchanged; the generated declarations stay in tabao-rush-cook-heads (D-172 can
change its encoding separately). The shared apron carries seat/team colour for
all heads, including tudung, turban and songkok; only cap carries head tint. The bun ribbon is enclosed in hair, so all seven
new head masks are empty in every facing.

Pure tests cover job/frame/clip coverage, reproducible plan generation, socket
rounding in every action and facing, and greyscale threshold boundaries.
Published-art acceptance requires each anchor-aligned pair to differ across at
least 20% of occupied-union pixels in every facing, with brightness difference
>24/255. The review script production-encoding repack checks level transfer/decoded budgets;
it is excluded from the unit suite to stay within the Vitest wrapper limit.
Published-art unit validation skips only when new render folders are absent.
The review script requires complete renders and fails instead of skipping.

## Close-out (2026-11-19, after review 3)

Rendered at round 6 (a2c7e34c), corrected in round 7 and reviewed three times; options board https://claude.ai/artifact/UBC7KrsbjrgXn5uRMRH4ty (rounds 4, 5, 6 side by side). Eight heads (cap, uncle, auntie, makcik,
bun, specs, turban, songkok) in eight facings on the shared socket; only the cap tints.
D-142 choices (D-2xx): bun radius 0.45hr at 1.35hr above the head centre (knob breaks the
outline from s, se, sw, slightly from e, w; inside the dome from ne, n, nw); turban kopi brown
#6B4426 (DESIGN §4.2); specs hair muted brown #997C63. All 224 pair × facing greyscale scores are
at least 0.20 (lowest bun/songkok n 0.230; the 0.25 margin is missed by that pair and auntie/bun sw
0.249); bun/specs 0.927–0.984; the cap tinted in each of the eight seat colours scores at least
0.241 against every other head (448 scores). Makcik's opening steps and
uncle's band cut are inherited and unchanged (the subdivision had no visible effect). Heads atlas
202,586 B (4.13 MB decoded); Tabao Rush round 2.22 MB of 8 MB. The production pack runs in
`cook_heads_review.py` and pipeline packing, not in the unit suite (Vitest limit). Handoffs: re-run the review
validate after A-02d re-renders bodies (heads need no re-render); T-07 places the seat marker
above the bun's 1.86-tile top; from behind only the cap shows colour. Not done: the phone
character picker (TR-064) and heads in game (T-07).

## Round 1 requests (superseded by Round 2)

Render separately (commands not run here), allowing 120 s per job. Estimate is
about 62 s each before timeout headroom, inherited from cap, not measured:

```sh
python3 tools/assets/pipeline.py --render --only cook-head-uncle --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-auntie --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-makcik --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-bun --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-specs --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-turban --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-songkok --no-pack
```

Run the review script documented in ART-PIPELINE §9,
open all 32 sheets and inspect seams, silhouettes, masks and team colours. If the
production-encoding level budget fails, report the measured total to the integrator; do not
change storage format here. The integrator owns rendered acceptance, review,
shared trackers and commit/merge.

## Commands and results

Each command was preceded by `uptime`, waiting for one-minute load below 8.
The full output and load readings are in `check-1.txt` through `check-7.txt` in
this slice's evidence directory.

| Command | Result |
| --- | --- |
| `python3 -m unittest tools/blender/test_cook_poses.py` | PASS: 12 tests |
| `python3 -m unittest discover -s tools/blender -p 'test_*.py'` | PASS: 15 tests |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | PASS: 53 tests, 1 skipped (published heads/budget pending renders) |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | PASS: 2 files, 5 tests |
| `pnpm exec eslint tools --max-warnings 0` | PASS |
| `pnpm run lint:design` | PASS: 416 files |
| `python3 tools/assets/pipeline.py --check-stale` | FAIL (exit 1): cards fresh; items and existing cook jobs have differing stamps; seven new head jobs missing |

Round 1 conclusion (superseded below): the freshness requirement was incomplete.
No content stamps were rewritten to conceal stale outputs. Refresh items as
well as existing cook jobs through their render jobs before final acceptance.
No memcheck, Blender, pipeline render, pnpm verify, whole-suite Vitest, UAT,
performance command, install, commit or merge was run. Only the pipeline plan
was regenerated under assets/src; no source sprite or distribution art changed.

## Round 2

Cause: round 1 changed cook.py and cook_poses.py, which every body job and cap
hash, and pipeline.json, whose complete bytes the items job hashes.

Restored all three files byte-for-byte to the pre-A-03 versions. Cap geometry,
validation and pixels need no change. The seven new jobs now use cook_heads.py
(head build/validation/entry point, reusing unchanged cook helpers) and the pure
cook_heads_contract.py. Only new jobs hash these head-only modules.

Added sibling config extensions through pipeline.load_config. The new render
jobs and expanded head atlas live in pipeline.cook-heads.json; the plan generator
writes only that extension. Packing, review and strip loading consume the merged
configuration. This preserves the existing hash algorithm and published stamps,
without a migration or regeneration. The legacy base config remains a whole-file
items input; edits to it still invalidate items. New independent jobs belong in
extensions: adding/editing another extension job does not change items or a
head's digest; changing that head's arguments does. A regression test checks
both directions and confirms changing the declared base config still invalidates
items. This is an alternative to per-job projection of the legacy config, which
would itself change the already-published items digest.

Fresh: cards, items, all nine cook-body jobs, cook-head-cap.
Stale/missing only: cook-head-uncle, cook-head-auntie, cook-head-makcik,
cook-head-bun, cook-head-specs, cook-head-turban, cook-head-songkok.
No stamp, sprite or distribution output was edited; no body render is needed.

Render requests for the integrator only (not executed):

```sh
python3 tools/assets/pipeline.py --render --only cook-head-uncle --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-auntie --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-makcik --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-bun --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-specs --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-turban --no-pack
python3 tools/assets/pipeline.py --render --only cook-head-songkok --no-pack
```

### Commands and results

Every command waited for one-minute load below 8. Full output and readings:
`uat/evidence/A-03-cook-heads/round-2-check-{1..7}.txt`.

| Command | Result |
| --- | --- |
| `python3 -m unittest tools/blender/test_cook_poses.py` | PASS: 12 tests |
| `python3 -m unittest discover -s tools/blender -p 'test_*.py'` | PASS: 15 tests |
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | PASS: 54 tests, 1 skipped (rendered acceptance pending) |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/assets` | PASS: 2 files, 5 tests |
| `pnpm exec eslint tools --max-warnings 0` | PASS |
| `pnpm run lint:design` | PASS: 416 files |
| `python3 tools/assets/pipeline.py --check-stale` | Exit 1 as expected: only seven new head jobs missing |

Close-out (historical Round 2): stamp isolation was verified. The integrator
later completed rendering and review1; see the current Close-out above. No
Blender, render, pnpm verify, UAT, performance, install or commit was run by
this implementing agent.

## Round 3 — empty south tint masks (TR-064, TR-061)

Cause: (a), an empty tint mask is legitimate. Only cap carries head tint;
the apron carries player/team colour for every character. The board-1 bun
ribbon is enclosed within hair and skin geometry in every facing, rather than
merely occluded from the south. All seven new heads therefore have empty masks.
The integrator/reviewer later confirmed this in all 56 new-head masks.

The defect is cook.py:350–353: max alpha must reach .99 before allow_empty is
consulted. Added a head-local validate wrapper at cook_heads.py:14–23. Only
exactly zero-alpha masks pass the empty exception, and only with allow_empty;
all nonzero masks delegate to the unchanged shared validator, including faint
values below 1/255. cook.py remains unchanged to preserve body/cap stamps.
South output will contain white RGB with zero alpha wherever no accent is
visible, rather than a silhouette mask of skin/hair. No render pixels were
changed or claimed visually accepted. Any faint nonzero mask still fails and requires inspection by the integrator.

Regression: test_empty_tint_mask_validation executes both production validators
without Blender and covers empty allowed/rejected, faint nonzero rejected,
opaque interior accepted, clipping rejected, empty sprite rejected, and decoded
hash preservation.

Checks (one-minute uptime load below 8 immediately before each):

- Load 5.63: `python3 -m pytest tools/assets/test_cook_heads.py -q` could not
  start: `No module named pytest` in the supplied python3 environment.
- Load 7.28: `PYTHONPATH=tools/assets python3 -m unittest tools/assets/test_cook_heads.py -q`
  passed: 6 tests run, 1 skipped pending rendered heads (5 passed).

Close-out (historical Round 3): code and isolated regression complete. The
integrator later completed rendering and review1; see the current Close-out.
test_cook_body was not run in Round 3, as requested. No Blender, verify, UAT,
perf, install, node_modules link or commit was run by this implementing agent.

Requests (historical): rerender the seven heads and inspect empty masks in
all directions. Run the same relevant pytest file in the environment with
pytest available; no dependency was added here.

## Round 4 — undithered head mask coverage (TR-064, TR-061)

Cause found in the code: the shared mask pass renders black/white emission to
an intermediate PNG, reloads it, then multiplies red by surface alpha. Head
setup leaves Blender's default render dithering enabled. Dithering the PNG RGB
can turn exact black occluder samples into faint positive values, which that
conversion promotes to mask alpha, even when no visible mesh uses the accent.
This explains why the exact-zero exception from round 3 cannot address the
source. The pass also inherits colour-render denoising, which is inappropriate
for coverage and can spread white across black boundaries. This diagnosis is
from code; no Blender pixels were inspected or rendering run in round 4.

Added a head-local mask wrapper disabling render.dither_intensity and Cycles
denoising only during the shared mask call, restoring both even on failure.
Black emission now reaches coverage conversion without RGB dithering or
 denoiser filtering; visible white emission retains its coverage. No threshold,
alpha clamp or relaxation of the .99 validation rule was added. cook.py and the
body/cap rendering inputs remain unchanged. Empty masks are still accepted only
when exactly zero and explicitly allowed. Faint-mask errors now include maximum
alpha, exact non-zero pixel count and inclusive bounding box in Blender's
bottom-left pixel coordinates (None for empty).

Only cap carries head tint. Uncle's warm-white towel is not the neutral-white
accent; the bun ribbon is enclosed within its hair. All seven new head masks
are empty in every facing, as confirmed by the later rendered review.

Checks, each immediately preceded by uptime with one-minute load below 8:

- Load 4.73: `python3 -m unittest discover -s tools/blender -p 'test_*.py'`
  passed all 21 tests. New test_cook_heads_mask.py executes production functions
  without Blender: empty allowed/rejected, faint (including sub-1/255) rejected
  with diagnostics, full coverage accepted, mask settings applied and restored
  on success/failure.
- Load 4.35: `python3 tools/assets/pipeline.py --check-stale` exited 1 as
  expected: only seven new head jobs missing; cards, items, all nine bodies and
  cap fresh.

Close-out (updated after review1): round-4 renders were completed and reviewed
by the integrator/reviewer; masks were confirmed empty for all seven new heads.
The bun/specs distinction failed review. Round 5 supersedes visual acceptance.
No Blender was run by this implementing agent.

## Round 5 — review1 fixes (TR-061, TR-064; TR-060)

D-142 integrator choice: bun radius **0.45hr**, centre **(0, 0.30hr, 1.35hr)**
relative to the head centre; specs unchanged. The analytic bun top is about
1.86 tiles (body nominal height remains 1.5); its head-only geometry check has
a 1.90-tile ceiling rather than the other new heads' 1.80. Round-6 renders confirm
outline breaks from s, se, sw and slightly e, w only; the knob remains inside
the dome from ne, n, nw. The 0.20 gate passes. Ribbon geometry stays enclosed. Turban uses the existing DESIGN §4.2
console **kopi brown #6B4426**, outside PLAYER_COLOURS and away from team blue
#2F7FD6 and red #D9483B. Both edits are head-local after K.cook; kalib.py is
unchanged. Makcik's opening and uncle's side-hair boundary receive subdivision
before shell thickness; the subdivision had no visible effect. Makcik's
opening steps and uncle's straight band cuts are inherited and unchanged.

The anchor-aligned greyscale gate counts brightness differences strictly greater
than 24/255 over at least 0.20 of the occupied union for all 28 pairs × 8 facings.
Passing/failing fixtures cover this gate, including equal-luma colour changes,
24/25 brightness boundaries and shifted anchors. Budget checking now explicitly
uses production encoding; the ineffective lossless override was removed.
Metadata refresh reads and writes only the base config; an extension regression
checks that extension jobs/sets are not copied into it.

Review outputs: eight character strips, each light/dark and 1x/4x (32 files),
head-difference.json, and four 1920×1080 greyscale boards per ground, two facing
rows per board with all eight cooks, source pixels unchanged (120px/tile).
Each board also has a 3m sampling proxy (labels unreadable after reduction) (3:1 BOX reduction followed by
nearest reconstruction); this is not a calibrated distance or recognition test.
All outputs are generated before pairwise rejection, so failures remain visible.
See REPORT.md for the current round-6 image inventory and review-2 findings.

A-02b follow-ups from review1: head-step unchanged on the shared socket/anchor;
SE chop knife visible only in raise frames 1–2 (D-177), and E extinguish mostly
hidden behind every head. No new runtime/action change is claimed.

Close-out (historical Round 5, superseded by round-6 render and review 2): source fixes and review preparation complete; seven head jobs are
stale after cook_heads.py changed. Round-5 pixels, pairwise results, atlas costs,
and visual acceptance await integrator rendering. No Blender, verify, UAT,
perf, install, node_modules link, merge or commit was run.

Requests: run the seven Round-2 render commands individually, then the review
command and open every output; finally pack with
`python3 tools/assets/pipeline.py`. Record new measurements and visual decisions
in REPORT.md and integrator-owned trackers. Test results are in round-5-check-*.txt and round-5-recheck-*.txt.

| Permitted command | Initial load/result | Recheck load/result |
| --- | --- | --- |
| Blender-directory unittest discover | 3.27; 25 pass | 2.83; 25 pass |
| Assets unittest discover | 3.27; 84 tests, 2 failures + 1 fixture error | 2.83; 85 tests, 83 pass + 2 render-dependent failures |
| Vitest tools/assets | 3.08; 5 pass, wrapper fails | 5.63; 5 pass, wrapper failed; review 2 identifies the remaining failure as the 60 s timeout |
| ESLint tools/assets | 2.78; pass | 5.24; pass |

The initial isolation-fixture error was fixed: its generic whole-config hashing
assertions now use a legacy job ID, rather than the merged items-specific stamp
projection. No production stamp logic changed. The new output-inventory fixture
accounts for the extra test in the recheck. All launch loads were below 8.

## Round 6 — specs brown hair (TR-061, TR-064)

Per the integrator's D-142 direction, specs now uses muted brown **#997C63**,
replacing only its inherited #1F1A17 hair material in head-local polish_head.
Skin, black glasses and geometry remain unchanged. Existing console secondary
#706151 is too close to turban #6B4426 (23.420/255 authored luma difference,
below 30/255), so the permitted muted brown is used instead. It sits near the
midpoint between turban and uncle grey, maximising the smaller separation.
No kalib.py, stamps or render pixels changed.

Rec. 601 luma computed directly on authored sRGB channels (0–255):

| Material | Hex | Luma | Absolute difference from specs |
| --- | --- | --- | --- |
| Specs hair | #997C63 | 129.821 | — |
| Bun hair | #2B211C | 35.420 | 94.401 |
| Uncle hair | #B9B6AE | 181.985 | 52.164 |
| Turban | #6B4426 | 76.241 | 53.580 |

The new unit test reads the production colours and requires >=40/255 against
bun and >=30/255 against uncle/turban. A production-function test confirms that
only specs hair receives the new hair-finish material. These are authored-colour
predictions, not rendered gate measurements: lighting, AgX, occlusion and pixel
coverage were subsequently measured in the round-6 integrator renders. The three requested round-5 images
were inspected; rear domes overlap heavily. The large brightness step is the
first correction; no extra shape cue is added without evidence it is needed.
Round-6 targets were bun/specs >=0.30 in every facing and all other pairs >=0.25;
bun/specs meets its target, but bun/songkok n 0.230 and auntie/bun sw 0.249
miss the margin. The existing 0.20 acceptance threshold is unchanged.

### Historical Round 6 handoff (superseded by render a2c7e34c and review 2)

At the historical handoff, source change and colour tests were complete and
rendering was pending. The integrator subsequently rendered all seven jobs at
a2c7e34c; review 2 confirms the 0.20 gate passes.
All seven new head jobs hash cook_heads.py and therefore need rendering for
fresh stamps, although only specs' appearance changes. Cap and bodies do not.
Run the seven individual Round-2 commands above, then the review command in
REPORT.md and inspect the new pairwise scores against the round-6 targets.
No Blender, verify, UAT, perf, install, node_modules link or commit was run.

### Checks

| Permitted check | Launch load | Result |
| --- | --- | --- |
| Blender-directory unittest | 4.08 | Initial new test errored parsing dict() AST; corrected test loader |
| Blender-directory unittest recheck | 4.00 | 27 passed |
| Assets unittest | 4.00 | 85 run, 83 passed, 2 render-dependent failures |
| Vitest tools/assets (requested environment) | 5.02 | 5 passed; Python wrapper failed (review 2: 60 s timeout, not those failures) |
| ESLint tools/assets | 5.26 | Passed |

Historical pre-render Python failures were test_retired_jobs_and_stamp_changes (shared head script stamp) and
test_published_heads_and_production_budget (round-5 bun/specs pixels).
Full outputs and launch loads: uat/evidence/A-03-cook-heads/round-6-*.txt.

## Round 7 — review 2 corrections (TR-061, TR-064; PERF-023/024)

Removed the full production pack from the published-head unit test, retaining
validate(). Production packing in the review command and pipeline still fails
closed on PERF-023/024. The Vitest spawn timeout is unchanged. Validation now
also gates cap tinted in every shared PLAYER_COLOURS entry against all seven
other heads in every facing; head-difference.json separates untinted and tinted_cap.
Dark lineup labels use DESIGN §4.2 marble #EFEAE2 against ink #2B2118.

The round-6 0.25 margin target was missed: bun/songkok n 0.230 and auntie/bun sw
0.249; the 0.20 acceptance gate passes. Bun/specs is 0.927–0.984. Inherited
straight hair-shell cuts also remain on bun/specs e/w and songkok band ends.
Specs #997C63 is a new one-off art colour, not a §4 token: proposed D-2xx under
D-142, subject to Randy overruling it. Turban #6B4426 is the existing kopi token.

Renderer comment corrections are recorded here to preserve render-input hashes:
`cook_heads.py:51` covers D-142 round-5 bun/turban and round-6 specs choices.
Lines 76–77 describe intended smoothing, but the subdivision had no visible
effect on makcik's opening or uncle's cut; both remain inherited and unchanged.
The pipeline hashes whole input bytes, including comments, so those comments
are deliberately left untouched.

### Requests

- A-02d: after body re-renders, re-run the review validate for socket rounding
  against every body frame (at most 1 px); static heads need no re-render.
- T-07: the TR-061 seat marker must clear the bun's 1.86-tile height. From n/ne/nw
  no apron shows and only cap shows player/team colour; the marker carries that clause.
- A-06: keep floors mid to light; bun/songkok nearly merge into dark ground in
  the 3 m sampling proxy.
- Integrator: publish the D-142 options artifact, allocate D-2xx decisions and
  update shared trackers/backlog. No options artifact is built in round 7.

### Round 7 checks

All launches below used one-minute load below 8. Full command outputs and elapsed
wall times are saved as `uat/evidence/A-03-cook-heads/round-7-*.txt`.

| Check | Launch load | Result / time |
| --- | --- | --- |
| Assets unittest, initial | 7.90 | 86 passed / 96.24 s (load rose above 12) |
| Assets unittest, padding-crop recheck | 6.73 | 86 passed / 75.77 s (load rose to 16.13) |
| Blender-directory unittest | 7.56 | 27 passed / 1.66 s |
| VITEST_MAX_WORKERS=2 Vitest tools/assets | 7.27 | 2 files, 6 tests passed / 40.17 s |
| Assets unittest, final | 4.37 | 86 passed / 50.66 s (50.80 s wall) |
| Check-stale | 6.31 | Exit 0, all 24 jobs fresh / 0.36 s |
| Review regeneration + production pack | 6.31 | Exit 0 / 125.60 s; PERF-023/024 passed, 8 atlases |

The earlier suite timings reflect machine contention; the Vitest wrapper now
passes within its unchanged 60 s spawn limit. Production budget results and
final quieter assets timing are recorded in the table. The standalone run is
under 60 s, but main's approximately 30 s timing was not reproduced here. No Blender, verify, UAT, perf,
install, node_modules link or commit was run in round 7.

Review JSON: all 224 untinted scores exactly match the committed round-6 values;
448 tinted-cap scores pass (minimum seat-3 yellow / specs / s 0.241124).
Production pack confirms heads 202,586 B / 4,126,464 B decoded, round transfer
2,219,376 B (2,597,804 B including manifest), decoded 54,234,208 B.
Opened all eight changed dark lineup boards (native and 3m sampling): native
labels are clearer; small text remains blurred by the 3:1 sampling proxy.
