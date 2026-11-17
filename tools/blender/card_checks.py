"""Blender-free pixel validation; RGBA tuples are encoded sRGB floats, bottom row first."""
from collections import Counter
import math
from pathlib import Path
from card_tokens import TOKENS


def token_rgb(name):
    value = TOKENS[name]
    return tuple(int(value[i:i+2], 16) for i in (1, 3, 5))


def check_pixels(rgba, width, height, path, face=True, back=False, coverage_window=None, paper=False):
    path = Path(path)
    pixels = [channel for pixel in rgba for channel in pixel]
    values = []
    opaque = []
    for i in range(0, len(pixels), 4):
        if pixels[i+3] < .95:
            continue
        # Loaded 8-bit PNG image.pixels are already sRGB encoded.
        rgb = pixels[i:i+3]
        opaque.append(tuple(round(v*255) for v in rgb))
        values.append(sum(v*w for v,w in zip(rgb, (.2126,.7152,.0722))))
    for y in range(height):
        for x in range(width):
            if min(x, y, width-1-x, height-1-y) >= 5:
                continue
            i = 4*(y*width+x)
            rgb = pixels[i:i+3]
            alpha = pixels[i+3]
            if alpha > .01 and max(rgb)-min(rgb) > .12:
                raise RuntimeError(f'Saturated tile-edge colour: {path.name} at {x},{y}')
            if alpha > .02:
                raise RuntimeError(f'Clipped sprite/shadow: {path.name} at {x},{y}')
    coverage = len(values)/(width*height)
    mean = sum(values)/len(values) if values else 0
    deviation = math.sqrt(sum((v-mean)**2 for v in values)/len(values)) if values else 0
    print(f'FACE CHECK {path.name}: coverage={coverage:.3f} mean={mean:.3f} std={deviation:.3f}')
    if face and (not (.60 < coverage < .90) or not (.05 < mean < .98) or deviation < .025):
        raise RuntimeError(f'Broken face tile: {path.name}; coverage={coverage:.3f}, mean={mean:.3f}, std={deviation:.3f}')
    metrics = {'coverage':coverage, 'mean':mean, 'stddev':deviation}
    window = coverage_window or ((.60, .90) if back else None)
    if window and not window[0] < coverage < window[1]:
        raise RuntimeError(f'Broken coverage: {path.name}: {coverage}, expected {window}')
    if back:
        dominant = Counter(opaque).most_common(1)[0][0] if opaque else (0,0,0)
        # Denoised emission varies by a level or two, so count pixels near the token, not exact matches.
        count = sum(1 for rgb in opaque if max(abs(a-b) for a,b in zip(rgb, token_rgb('colour'))) <= 3)
        if (max(abs(a-b) for a,b in zip(dominant, token_rgb('colour'))) > 3
                or count < len(opaque)*.25 or deviation < .025):
            raise RuntimeError(f'Broken back paint: {path.name}: {dominant}, near-token share={count/max(1,len(opaque)):.3f}, std={deviation}')
        stripe_count = sum(1 for rgb in opaque if max(abs(a-b) for a,b in zip(rgb, token_rgb('stripe'))) <= 3)
        dark_count = sum(1 for rgb in opaque if sum((a-b)*w for a,b,w in zip(rgb, token_rgb('colour'), (.2126,.7152,.0722))) < -3)
        # The paint covers 5 of every 13 px, but the paper border and anti-aliased stripe edges fall
        # outside the ±3 window: the correct render measures 0.174. No stripes measures 0.
        share, dark = stripe_count/max(1,len(opaque)), dark_count/max(1,len(opaque))
        if not .12 < share < .45 or dark > .005:
            raise RuntimeError(f'Broken back stripes: {path.name}: stripe share {share:.3f}, dark share {dark:.4f}')
        metrics['stripeShare'] = stripe_count/max(1,len(opaque))
        metrics['darkShare'] = dark_count/max(1,len(opaque))
        metrics['dominantRGB'] = dominant
    if face or paper:
        # Pale pixels isolate paper from ink and the red back. Reject clipped
        # white as well as a wrong paper tint; mean tolerance is 3 byte levels.
        pale = [rgb for rgb in opaque if min(rgb) >= 224]
        expected = tuple((a+b)/2 for a,b in zip(token_rgb('from'), token_rgb('to')))
        means = [sum(rgb[c] for rgb in pale)/len(pale) for c in range(3)] if pale else [0]*3
        if (len(pale) < len(opaque)*.5 or len(set(pale)) < 4
                or any(abs(a-b) > 3 for a,b in zip(means, expected))):
            raise RuntimeError(f'Broken paper gradient: {path.name}: mean RGB={means}')
        # Blender rows start at the bottom; sample opaque interior paper only.
        bands = []
        for low, high in ((.15, .35), (.65, .85)):
            band = [sum(pixels[4*(y*width+x):4*(y*width+x)+3])*255/3
                    for y in range(int(height*low), int(height*high))
                    for x in range(int(width*.2), int(width*.8))
                    if pixels[4*(y*width+x)+3] == 1
                    and min(pixels[4*(y*width+x):4*(y*width+x)+3])*255 >= 224]
            bands.append(sum(band)/len(band) if band else 0)
        if not all(bands) or bands[1]-bands[0] < 6:
            raise RuntimeError(f'Broken paper gradient direction: {path.name}: bands={bands}')
        metrics['paperBandDelta'] = bands[1]-bands[0]
        metrics['paperMeanRGB'] = means
    return metrics
