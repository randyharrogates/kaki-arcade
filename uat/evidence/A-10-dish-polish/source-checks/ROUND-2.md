# A-10 Round 2 source checks — TR-041; D-145

All five authorised checks passed; each began after `uptime` reported a 1-minute
load below 8. No Blender, rendering, UAT, performance run, install, memcheck,
whole-suite verification, generated asset edit, commit or merge was performed.

| Command | Pre-command load | Result |
|---|---:|---|
| `python3 -m unittest discover -s tools/assets -p 'test_*.py'` | 5.80 | PASS: 43 tests, 17.229 s |
| `python3 -m py_compile tools/blender/items.py` | 5.77 | PASS, exit 0 |
| `VITEST_MAX_WORKERS=2 pnpm exec vitest run tools/items.test.ts tools/assets` | 5.63 | PASS: 2 files, 9 tests, 20.65 s |
| `pnpm exec eslint tools --max-warnings 0` | 5.44 | PASS, exit 0 |
| `pnpm run lint:design` | 5.80 | PASS: 400 files scanned |

Earlier authorised Python-suite runs were used to develop the geometry predictor
and reject insufficient layouts. The original layout predicted shares
[0.040070, 0.135605, 0.008434, 0.363517] and icon IoU 0.686261; it fails the
new ≥0.05 share test. A compact cap alone also failed cucumber visibility.
The final source predicts shares [0.079791, 0.189596, 0.062535, 0.130979]
(pineapple, turnip, cucumber, dressing), and icon IoU 0.715709. The regression
limits are ≥0.05 per portion and ≤0.75 for chicken rice / rojak icon IoU.
Production limits remain ≥0.04 visible share and ≤0.90 icon IoU.

The integrator's original rendered pineapple share was 0.0286 and rendered icon
IoU was 0.7068 (projected 0.7036). No new rendered numbers are claimed here.
See the Round 2 slice note and `tools/assets/item_projection.py` for the projection
and its approximations. The full items render, pixel metadata refresh, visual
review (also chicken rice/satay's shared cucumber), containment and budget checks
remain with the integrator.
