# Source-derived measurements (PP-030, PP-031)

Read directly from the supplied DMSans-Bold.ttf using Python struct, without
Blender, rendering or new dependencies. Units per em: 1000.

| Glyph | xmin | ymin | xmax | ymax | advance |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 22 | 0 | 686 | 700 | 709 |
| Q | 46 | -110 | 738 | 712 | 784 |
| 1 | 31 | 0 | 295 | 700 | 364 |
| 0 | 46 | -12 | 658 | 712 | 704 |

The full 13-rank table was inspected. Q constrains the corner height;
tightened 10 constrains the central width.

Corner cap = .15 / 822 × 700 × 150 = **19.16 px**.
Central 10 width at 75% advance = 364 × .75 + 658 − 31 = 900 font units.
Central cap = .42 / 900 × 700 × 150 = **49.00 px**.
Inter-digit AABB gap = 364 × .75 + 46 − 295 = **24 font units**.

Production calibrates curve.space_character from evaluated widths to keep this
positive gap across Blender spacing implementations, then measures every rank
at one shared size per role. No glyph is horizontally stretched or independently
shrunk. These figures are derived from font tables, not rendered pixel readings.
The external preflight prints evaluated card-unit and 1080p cap heights; a
successful render saves rankCapHeights and tenCharacterSpacing in the manifest.
All 52 faces must still pass the unchanged overlap and .05-clearance checks.
