"""TR-050/TR-057: measure an explicitly selected empty-floor crop at 1×."""
import argparse
from PIL import Image, ImageStat

FLOOR_STDDEV_BAND = (3.0, 9.0)  # greyscale levels, 0–255, full-resolution render


def measure_floor(image, crop):
    if not (0 <= crop[0] < crop[2] <= image.width and 0 <= crop[1] < crop[3] <= image.height):
        raise ValueError('Crop must lie inside the render')
    return ImageStat.Stat(image.crop(crop).convert('L')).stddev[0]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image')
    parser.add_argument('--crop', nargs=4, type=int, required=True, metavar=('LEFT', 'TOP', 'RIGHT', 'BOTTOM'))
    args = parser.parse_args()
    with Image.open(args.image) as pixels:
        value = measure_floor(pixels, args.crop)
    print(f'Empty floor standard deviation: {value:.3f}; target {FLOOR_STDDEV_BAND}')
    raise SystemExit(0 if FLOOR_STDDEV_BAND[0] <= value <= FLOOR_STDDEV_BAND[1] else 1)
