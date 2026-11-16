# A-01 — Asset pipeline

## Plan and scope

PERF-023 (all round assets ≤ 8,000,000 transferred bytes before play) and PERF-024
(≤ 256,000,000 decoded texture bytes) implement PRD NN-3/NFR-PERF. ART-PIPELINE §3
limits pages to 2048 × 2048. This revision addresses the independent A-01 review.
Only tooling, this note and A-01 evidence changed. No Blender was started.

## What was built

`pnpm assets` packs `assets/src/pipeline.json` into ignored `assets/dist/`.
`--config` and `--output` override these paths. Python 3 requires the pinned
`tools/assets/requirements.txt`: Pillow 11.1.0; its official wheels bundle libwebp 1.5.0.
Startup checks both versions and prints one install instruction without a traceback.
**Byte-identical output depends on the pinned encoder**, including libwebp, not just inputs.
No npm dependencies were added.

Trims align to two pixels; odd source dimensions repeat the true edge before alignment.
Reconstruction clips the aligned rectangle back to sourceSize. Lossless preserves alpha and
all visible RGB exactly; RGB under zero alpha is deliberately changed by edge-colour bleed.
Two extruded pixels and premultiplied BOX downsampling prevent neighbour bleed at half size.
Files store straight alpha. Renderer constraint: **no mipmaps**; two-pixel guards protect only
the base full/half levels, not arbitrary lower mip footprints.

Height-sorted shelves try deterministic page widths. Complete actions are atomic when one page can contain them; otherwise whole direction
sequences are kept together where they fit, and oversized sequences split. Set layers share union trims, page
membership, dimensions and rectangles. Hashed WebP filenames identify bytes. Before packing,
only old files matching the packer's hashed atlas filename pattern are removed.

The compact manifest drops duplicated halfFrames. Divide rect, trim, sourceSize, legacy
anchor and all named anchor coordinates by two for half detail; metadata is unchanged.
Track T should retain full logical coordinates for gameplay. UVs match between detail levels.
The manifest records encoding/quality, layers, anchors, metadata declarations, animations,
actual bytes, decoded bytes, hashes, set totals and round preload membership.

`pnpm verify`'s build hook always packs source sets to a temporary `assets/dist/.verify-*`
directory, checks budgets and removes that output; it never renders. With no source sets it
prints `no asset sets in assets/src yet`. A clean-checkout test supplies an over-budget source
data file and observes a failed hook without any existing dist. Checks charge each round for
all selected texture layers, declared data files and the complete manifest. One conservative
global manifest remains: a per-round manifest/index was considered but deferred to avoid
adding a second loader protocol before track T. Other levels' metadata is therefore charged.
Overall/set totals describe textures; round totals include non-texture files.

## How tracks A and T use it

Paths for frame files AND render inputs/outputs are relative to the config directory, and
must remain within it. Render scripts remain relative to `tools/blender/`. `--render` is
explicit; only stale jobs run. Before each Blender run the CLI calls
`tools/agents/memcheck.sh render`, refuses on wait, and enforces a 300-second render timeout
(30 seconds for the memory check). Failed processes print one clear line. Tests stub all
processes and never start Blender.

Example layered set and round (all referenced frames/files must exist):

```json
{
  "sets": [{
    "id": "cook", "layers": ["body", "mask"],
    "anchors": ["foot", "head", "carry"], "metadata": ["event"],
    "encoding": "lossless", "quality": 90,
    "frames": [{"id": "idle-0", "layers": {"body": "idle.png", "mask": "idle-mask.png"},
      "anchors": {"foot": [80,165], "head": [80,45], "carry": [110,100]}, "event": "idle"}],
    "animations": [{"action": "idle", "fps": 12, "frames": ["idle-0"]}]
  }],
  "rounds": {"level-01": {"sets": ["cook"], "files": ["audio.ogg"],
    "collisionMap": "collision.json", "stationAnchors": "stations.json"}}
}
```

Single-layer frames use `file`; omit `layers` on that set. Declared anchors are mandatory on
every frame, never defaulted to [0,0]. Anchor coordinates use the original top-left origin;
subtract trim for packed coordinates. Arbitrary extra fields listed in set `metadata` are
copied into frame metadata. Legacy singular `anchor` is retained for compatibility only.
Animations use either ordered `frames` (effects, flips, state loops), or `directions` with
exactly n/ne/e/se/s/sw/w/nw and equal non-zero sequence lengths. FPS must be a positive finite
number; actions must be unique. Missing fields give a one-line CLI error.

Use `encoding: "lossy"` and explicit quality for backgrounds; default lossless for hard-edged
sprites/masks. Both settings are recorded. Track T imports `AssetManifest` from
`tools/assets/manifest.d.ts`, chooses round/detail, downloads and decodes every referenced
atlas plus every round `files` entry before starting. collisionMap/stationAnchors name source
entries in `files`, whose hashed `file` is the actual download. Do not keep both details
resident; GPU totals assume one selected detail. Runtime loading remains track T's work.

## Evidence and Close-out

Reproduce entirely within this worktree:

```sh
python3 tools/assets/realistic.py > uat/evidence/A-01-asset-pipeline/pack.txt
pnpm verify > uat/evidence/A-01-asset-pipeline/verify.txt 2>&1
```

The reviewer generator path was unavailable; `realistic.py` builds an equivalent diagnostic
workload: 720 cook frames (9 actions × 8 directions × 10, 160×185) with soft edges,
see-through shadows and a separate mask; 64 80×80 heads; 12 300×300 stations; one opaque
1921×1081 lossy background. The retained compact manifest and summary record measurements;
26 downscaled full/half page previews were all opened and inspected, each below 300 KB.
See `REPORT.md` for actual visual observations and size tables. **Real Blender art has still
not been through the pipeline.** These are diagnostic shapes, not proposed game artwork.

Tests cover odd 33×33 and 1921×1081 full reconstruction and alpha-255 last rows/columns at
both details, union-trim twin layers, anchors and metadata, non-directional and directional
animations, page locality, <12% shelf waste on heads/stations, encodings, stale removal,
clear invalid inputs, round file budgets from clean checkout, render refusal/timeout,
determinism, premultiplied filtering, extrusion and manifest tampering. Vitest explicitly
asserts that 14 Python tests ran and passed, so empty discovery fails. Full verify evidence
is saved in `verify.txt`; integration and independent review remain Claude's responsibility.

## Requests

1. Git LFS is **not set up**. It is the owner's open question **OQ-008**, before real .blend
   sources are committed; no LFS changes were made.
2. Integrator: `docs/DECISIONS.md` needs a line authorising the Pillow 11.1.0 dependency and
   pinned libwebp 1.5.0 encoder. This file is outside the builder lane and was not edited.
3. Track A/T: run production Blender frames and a complete production round through this
   contract, then exercise actual preload/decode/detail selection in the renderer.
4. Integrator: independent review, shared tracker updates and any reconciliation of
   ART-PIPELINE rendering/LFS prose remain outside this slice. Review this revision before merge.

## Unsure

- Synthetic compression and memory measurements cannot predict production artwork or device
  runtime performance. The procedural background happens to compress better losslessly.
- The manifest is global and charged conservatively in every round; splitting by round is
  deferred. Source data is copied with content hashes; decoded non-texture memory is not GPU memory.
- Four-pixel RGB bleed supports base-level bilinear sampling near edges; mipmaps are forbidden.
- Changes are left in the working tree, uncommitted, as requested; no push or merge attempted.
