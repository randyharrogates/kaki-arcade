# A-01 revision evidence — PERF-023 / PERF-024

Reproduce with `python3 tools/assets/realistic.py` from the repository root. It writes
sources and encoded files to ignored `assets/dist/realistic/` inside this worktree, then
retains this compact manifest, summary and downscaled PNG previews. `pack.txt` records the
run. The reviewer generator path was unavailable, so this script provides the equivalent
workload. Pillow 11.1.0 / libwebp 1.5.0; byte identity depends on that pinned encoder.

This is diagnostic geometry, not production artwork. **Real Blender art has still not been
through the pipeline. No Blender process was started.**

Workload: cook body 9 actions × 8 named directions × 10 frames (720 frames), each 160×185,
with antialiased edges, partially transparent elliptical shadows, named foot/head/carry
anchors and event metadata. An independent white mask has cap and apron shapes. Additionally:
64 heads at 80×80, 12 stations at 300×300 and an opaque 1921×1081 lossy background, quality 85.
The level also preloads two JSON files and 8,192 bytes of synthetic audio placeholder data
(`sound.bin` is arbitrary diagnostic bytes, not playable audio).

Every one of the 26 retained page PNGs (13 texture pages × full/half) was opened and looked
at. Maximum PNG size is 283,359 bytes, below 300 KB. Preview compositing uses grey to reveal
transparency; the atlases themselves retain straight alpha.

Visual observations:

- Background full and half: regular alternating muted blue/purple/green tiles across a
  horizontal/vertical colour ramp, with fine texture. Half detail visibly softens the fine
  texture. There is no visible dark right or bottom seam at this preview scale.
- Cook pages 0–4, body full and half: densely arranged oval figures with two short dark legs,
  white directional strokes and pale translucent shadows on grey. Colours progress through
  blue, teal and purple. The small side-to-side shifts repeat across ten-frame sequences;
  these are diagnostics, not plausible walking or cooking performances. Soft silhouette
  edges remain readable at half size. No obvious neighbour colour intrusion is visible. Pages 0–3 have a short final row; page 4 is a narrower final page.
- Cook pages 0–4, mask full and half: rows of white flattened ovals above white apron
  rectangles, on the matching grey grid. Full and half preserve the same arrangement.
  Automated checks, rather than visual estimation, establish identical union-trim rectangles
  and page dimensions for body and mask.
- Heads full and half: a tall narrow grid of small numbered rounded blue/purple/pink squares;
  transparent rounded corners reveal grey diamond-shaped gaps. These are not actual heads.
- Stations full and half: two columns of six large numbered rounded blue/purple rectangles.
  Tiny white index marks survive, but are difficult to read in these downscaled previews.
  These are not actual station models. The shelves leave little unused margin.

| Set | Texture pages (including layers) | Area-weighted waste |
|---|---:|---:|
| Cook | 10 (5 body + 5 mask) | 7.97% |
| Heads | 1 | 9.30% |
| Stations | 1 | 2.61% |
| Background | 1 | 0.58% |

Waste includes guard pixels and unused area relative to aligned source rectangles. It does
not count internal transparent pixels inside a trimmed silhouette as wasted area. Every page
is ≤2048×2048. Individual page dimensions and waste are in `manifest.json` and `pack.txt`.

| Level-01 selected detail | All transfer bytes, including manifest + data | PERF-023 limit | Decoded texture bytes | PERF-024 limit |
|---|---:|---:|---:|---:|
| Full | 1,630,133 | 8,000,000 | 141,533,648 | 256,000,000 |
| Half | 526,607 | 8,000,000 | 35,383,412 | 256,000,000 |

The compact global manifest is 279,405 bytes, charged in full to each round; non-texture file
bytes are included in both round detail totals. No claim about decoded audio/data RAM or
real browser upload/runtime performance follows from these texture byte counts.

1920×1080 comparison of the same deterministic opaque diagnostic pattern, quality 85:

| Encoding | Full WebP bytes | Half WebP bytes |
|---|---:|---:|
| Lossless | 4,598 | 1,506 |
| Lossy | 63,470 | 8,642 |

The regular pattern compresses unusually well losslessly. This comparison demonstrates the
per-set encoder settings and is not representative of Blender background compression.
The workload's 1921×1081 background uses lossy encoding as requested.

Odd seam checks separately pack solid opaque 33×33 and 1921×1081 images losslessly.
Both recover the original full image byte-for-byte after sourceSize clipping. Every alpha
in the aligned tile, last row and last column is 255 at both full and half size; detailed
extrema are retained in `summary.json`. The Python tests additionally cover premultiplied
soft-edge filtering, extrusion, opposing-colour neighbour isolation, twin layers, sequence
page locality, invalid configuration, stale atlas removal, determinism and budget tampering.
A clean-checkout hook test packs a source round containing an over-8-MB data file and fails
PERF-023, with no pre-existing dist directory. All test temporary directories stay inside
this worktree's ignored assets area. Render tests use process stubs only.

`verify.txt` records whole-workspace verification, including a wrapper that requires exactly
14 passing Python tests. Current checked-in assets/src has no production sets, so the build
hook explicitly reports `no asset sets in assets/src yet`. The realistic workload is checked
by its own pack run and by the same manifest/budget checker.
