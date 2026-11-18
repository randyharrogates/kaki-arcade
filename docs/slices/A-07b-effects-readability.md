# A-07b — effect readability

Requirements: TR-010, TR-062; carried TR-009 shadow metadata preserved.
Authority: A-07 review 4 should-fixes 1, 2 and 4; D-190 and D-192.

## Plan

Improve spark readability with unlit red-rimmed dots; remove volatile PNG
text; eliminate shadow grain; strengthen light-marble steam/spray edges; expose
half detail and greyscale in review sheets without resetting review status.
Keep canvas sizes, animation metadata, palette tokens and no-overshoot paths.

## What changed

`effects.py` shares fire's Emission/Standard mesh path with sparks, strips every
PNG text chunk, and saves an analytic soft ellipse for the shadow.
`effect_geometry.py` supplies the spark layers, shadow falloff and a faint warm
edge that greys the whole steam/spray lobe slightly. Review panels are 233:144 with
one speckle treatment; half-detail and greyscale frame-zero columns are included.
The strip script preserves existing review.json and can refresh an existing folder.
Tests cover spark sizes/palette/bounds, loop endpoint, shadow colour/falloff and
PNG timing-text stripping without changing other chunks.

## Round 2 — review corrections

Shadow now writes sRGB #2B2118 directly to the byte image at peak alpha .5,
with the same smooth quadratic falloff and unchanged height metadata.
Sparks use a 7×9 px outer red ellipse around a 4×6 px gold core, peak alpha 1,
with the existing arc, period 4 and transparent endpoints. The existing 64 px
canvas is preserved and contains the enlarged ring.
Half-detail review frames return to full play size with bilinear sampling.
Tests cover written shadow RGB/alpha and review.json preservation; dead shadow
particle/depth branches are removed. ART-PIPELINE cites D-207.
Steam/spray keep the round-1 geometry: whole lobes grey slightly, with measured
light peak contrast about 1.7→2.2 : 1 and dark about 5.1→4.4 : 1.

## Checks

Round 2 rendered by the integrator at 4e8634b2 and reviewed (review 2 clean on code and
pixels). Assets 80 OK, tools/blender 23 OK, Vitest tools/assets 6 passed, --check-stale
exit 0. Measured figures are in uat/evidence/A-07b-effects-readability/REPORT.md.

## Close-out

Closed at merge. Decision D-207. Not yet: drawn in game (T-07); steam/spray lobe grain.
