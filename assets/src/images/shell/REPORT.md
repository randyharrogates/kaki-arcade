# A-09 shell imagery options

Requirements: REL-002, PLAT-020. Generated with the built-in image generation tool on 2026-11-18. Unselected review sources only; no app wiring. [Side-by-side gallery](options.html). [Exact prompts and generator source paths](prompts.json).

All eight final generations were visually inspected in the tool output. No text, explicit logos, money, chips or betting props were observed. No existing brand or game was requested as a reference.

## Sources and sizing

All paths below are relative to this directory, `assets/src/images/shell/`. Native tool dimensions vary slightly from the requested 1.618:1. The centred crop column is a suggested integer-pixel cut approximating 1.618:1 (rounding under 0.001); no pixels were resampled, upscaled or code-drawn. The PNGs preserve the full generated source. All suggested cuts exceed 1312 px wide and support a 1312 × 811 delivery crop for roughly 656 × 405 display pixels.

| Image | Native pixels | Suggested centred crop | PNG bytes | RGBA decoded MiB |
|---|---:|---:|---:|---:|
| landing-a.png | 1596 × 986 | 1595 × 986 | 2,618,205 | 6.00 |
| landing-b.png | 1596 × 986 | 1595 × 986 | 2,747,478 | 6.00 |
| tile-tabao-rush-a.png | 1606 × 979 | 1584 × 979 | 2,531,442 | 6.00 |
| tile-tabao-rush-b.png | 1595 × 986 | 1595 × 986 | 2,139,047 | 6.00 |
| tile-peek-poker-a.png | 1596 × 986 | 1595 × 986 | 2,828,878 | 6.00 |
| tile-peek-poker-b.png | 1595 × 986 | 1595 × 986 | 2,767,002 | 6.00 |
| tile-rabakz-a.png | 1589 × 990 | 1589 × 982 | 1,672,642 | 6.00 |
| tile-rabakz-b.png | 1596 × 985 | 1594 × 985 | 1,789,418 | 6.00 |

Landing compositions are landscape media to sit **within** the secondary column, not full-height portrait covers. Board source `tools/boards/board3_template.html:216` fixes the primary:secondary width split, not a full-height image rectangle. Keep the full composition visible with contain sizing; a tall cover crop would remove people/devices. Final panel geometry remains an integration decision. Published `design-gate/` HTML files were absent; DESIGN §4 and their source template were consulted.

## Options and review concerns

| Image | Meaningful difference | DESIGN §4 uncertainties |
|---|---|---|
| landing-a.png | Four friends in a semicircle, centred large TV, takeaway meal in foreground. | TV/phones read clearly; phone screens contain generic controller graphics rather than the exact app. Faces/cooks are illustrative, not exact game models. Busy plants, food and furniture may lose detail at secondary-column size. Warm colour grading may shift token colours. |
| landing-b.png | Three friends on an L sofa, TV at right, diagonal coffee-table composition and hawker counter behind. | TV is more oblique and may read less well at distance. Generic triple-camera phone backs may evoke familiar hardware despite no logo. Cup motifs are decorative, not lettering. More detailed soft furnishings than the game renders. |
| tile-tabao-rush-a.png | Close two-cook action: wok noodles and plated chicken rice. | Better large subject legibility, but generated faces, fabric texture and limb details differ from the source sprites. Stainless props have more highlights than the strict matte target. |
| tile-tabao-rush-b.png | Three-cook workflow across a compact kitchen diorama. | Wider scene makes food and hands smaller. Heads are not the eight authored heads; camera approximates the requested 60° orthographic view. Richer surface detail than source sprites. |
| tile-peek-poker-a.png | Complete 4 × 4 face-down memory grid, one selecting hand. | Very clear memory-grid motif; stylised wide cards differ from normal playing-card proportions. Gold trim can suggest a traditional card table, but no wagering props appear. |
| tile-peek-poker-b.png | Six large face-down cards, two hands, a raised swap card. | Stronger tactile close-up; six-card arrangement is illustrative, not a screenshot or complete rules layout. Card backs and felt are approximations of theme hex colours under lighting. |
| tile-rabakz-a.png | Four answer cards in a 2 × 2 grid framed by phone buzzers. | All shapes visible; phones have generic pill-shaped hardware cutouts. Dot pattern is stronger than the intended subtle treatment. Shape palette is prompted precisely but rendered shading is not token-exact. |
| tile-rabakz-b.png | Answer cards stand in a shallow semicircle behind hero phone buzzers. | Strong phones; card perspective is less orthographic than specified. Four familiar shapes can evoke controller conventions, but the required red/blue/amber/green palette and card arrangement avoid a copied logo. |

Across all images: matte/day/toy direction is recognisable, but generated stills are not reproducible Blender renders or an exact match to the authored cooks. Body and cap references inspected: `assets/src/tabao-rush/cook-body/idle/idle-s-0.png` and `assets/src/tabao-rush/cook-heads/cap/head-cap-s.png`; prompts use their squat white body, dark feet and rounded cap characteristics. No complete assembled cook preview was used. Physical TV-distance legibility and exact camera tilt have not been measured. No obvious existing game characters were observed; originality review remains with Randy/integrator.

## Integration and cost

At 656 px wide the picture slot must be **656 × approximately 405.4 px**, not 656 × 257 (2.55:1) or 656 × 213 (3.08:1). Reserve `aspect-ratio: 1.618 / 1` with stable sizing in picker **and** start-screen states; the current flex/grid sizing and expanding-card transitions need review. Do not squeeze artwork to current slot ratios. At 2×, cut at least 1312 × 811 pixels.

Every source PNG individually exceeds PERF-022's **1.5 MB total landing-to-lobby transfer budget**; these are marked **unsuitable for direct shipping unchanged**. Each decodes to about 6 MiB RGBA; all eight together about 48 MiB, before other assets, against PERF-024's 256 MB in-round budget. Static pre-rendered images add no live 3D work, but no frame-time, decode-time or transfer pass is claimed. Select one per use, derive appropriately compressed delivery assets through the existing pipeline, keep shell art off controller payloads, load selected game assets before play, and assess the total budget during integration.

No verify, UAT, perf, Blender, install, commit, tracker edits or app changes were run. Two exploratory portrait landing drafts were generated but rejected for insufficient source width; they were not copied into this deliverable set. The eight exact final prompts are in `prompts.json`.

