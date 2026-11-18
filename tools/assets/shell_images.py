"""D-176 / REL-002 / PLAT-020: reproducible 1x shell delivery, Pillow 11.1.0.
Run: python3 tools/assets/shell_images.py. No Blender or dist output.
"""
from pathlib import Path
from PIL import Image, features

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/src/images/shell'
OUTPUT = ROOT / 'apps/web/src/images'
# Round-one REPORT centred integer crop rectangles; exclusive right/bottom.
IMAGES = {
    'landing': ('landing-b.png', (0, 0, 1595, 986), (678, 419)),
    'tabao-rush': ('tile-tabao-rush-b.png', (0, 0, 1595, 986), (656, 405)),
    'peek-poker': ('tile-peek-poker-a.png', (0, 0, 1595, 986), (656, 405)),
    'rabakz': ('tile-rabakz-b.png', (1, 0, 1595, 985), (656, 405)),
}
if __name__ == '__main__':
    if not features.check('webp'):
        raise SystemExit('Existing Pillow lacks WebP; no dependency will be installed.')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for name, (source, crop, size) in IMAGES.items():
        with Image.open(SOURCE / source) as image:
            image = image.convert('RGB').crop(crop).resize(size, Image.Resampling.LANCZOS)
            target = OUTPUT / f'{name}.webp'
            image.save(target, 'WEBP', quality=82, method=6, exact=True)
            total += target.stat().st_size
            print(f'{target.relative_to(ROOT)}: {size}, {target.stat().st_size} bytes')
    print(f'Total: {total} bytes / 500000')
    if total > 500_000:
        raise SystemExit('Shell image budget exceeded')
