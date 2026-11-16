"""Diagnostic geometry only: not game art. Reproducible eight-direction walk inputs."""
import argparse
import math
from pathlib import Path
from PIL import Image, ImageDraw
from pipeline import DIRECTIONS, write_json


def generate(output):
    output.mkdir(parents=True, exist_ok=True)
    frames, directions = [], {}
    for d, direction in enumerate(DIRECTIONS):
        directions[direction] = []
        for index in range(4):
            ident = f'walk-{direction}-{index}'
            image = Image.new('RGBA', (32, 32))
            draw = ImageDraw.Draw(image)
            colour = (40 + d * 25, 180, 220 - d * 20, 255)
            draw.ellipse((8, 6, 23, 23), fill=colour)
            angle = d * math.pi / 4 - math.pi / 2
            draw.line((16, 14, 16 + int(10 * math.cos(angle)), 14 + int(10 * math.sin(angle))), fill=(255, 255, 255, 255), width=2)
            shift = index % 2 * 3
            draw.rectangle((9 + shift, 24, 12 + shift, 28), fill=colour)
            draw.rectangle((19 - shift, 24, 22 - shift, 28), fill=colour)
            image.save(output / f'{ident}.png')
            frames.append(dict(id=ident, file=f'{ident}.png', anchor=[16, 6]))
            directions[direction].append(ident)
    config = dict(sets=[dict(id='diagnostic-walk', frames=frames,
                  animations=[dict(action='walk', fps=12, directions=directions)])],
                  rounds={'diagnostic': ['diagnostic-walk']}, powerOfTwo=True)
    write_json(output / 'pipeline.json', config)
    return config


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    generate(parser.parse_args().output)
