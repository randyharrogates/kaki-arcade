"""A-07: deterministic billboard particle specifications, in full-size pixels.

No physics, randomness, wobble or runtime blur. Particle births/deaths are fully
transparent; sampling modulo count omits the duplicate loop endpoint.
"""
import math

EFFECTS = {'steam': (64, 4, 8, (32, 53)),
           'sparks': (64, 4, 8, (32, 48)),
           'fire': (96, 4, 8, (48, 77)),
           'spray': (96, 4, 8, (13, 48)),
           'shadow': (64, 1, 1, (32, 32))}
COLOURS = {'steam': '#EFEAE2', 'sparks': '#F2B21B',
           'fire': '#F07C2A', 'core': '#E0A63A', 'edge': '#B5371F',
           'spray': '#EFEAE2', 'shadow': '#2B2118'}


def particles(effect, frame):
    """Return (x, screen-up y, radius-x, radius-y, alpha, colour) from origin."""
    _, count, _, _ = EFFECTS[effect]
    if effect == 'shadow':
        # Nested transparent ellipses bake a soft edge without runtime filtering.
        return [(0, 0, 23-i, (23-i)*.5, .025, COLOURS[effect]) for i in range(16)]
    if effect == 'fire':
        return []  # Fire uses pointed mesh tongues, never ellipsoid particles.
    t = (frame % count) / count
    result = []
    for i in range(5):
        age = (t + i/5) % 1
        fade = math.sin(math.pi*age)**2
        if effect == 'spray':
            x, y, rx, ry = 9+age*58, (i-2)*age*6, 3+age*6, 3+age*6
        elif effect == 'sparks':
            x, y, rx, ry = (i-2)*age*10, 6+age*26-12*age*age, 2, 3
        elif effect == 'steam':
            x, y, rx, ry = (i-2)*4, 5+age*33, 4+age*5, 5+age*5
        else:
            x, y, rx, ry = (i-2)*9, 9+age*36, 10-age*6, 16-age*8
        result.append((x, y, rx, ry, fade*.85, COLOURS[effect]))
    return result


def fire_tongues(frame):
    """TR-010/062: layered teardrops; fixed shared foot, periodic tip deformation.

    Each layer is (outline, alpha, palette colour). Coordinates are screen-up
    pixels relative to the unchanged fire anchor. The cubic sides round the belly
    but meet at a single sharp tip. No whole-sprite scale or translation occurs.
    """
    # Start with the left tip leaning outward, clear of the central tongue.
    phase = 2*math.pi*((frame + 2) % EFFECTS['fire'][1])/EFFECTS['fire'][1]
    layers = []
    # Draw side tongues first; the central tongue joins their overlapping feet.
    for x, width, height, offset in [(-13, 13, 43, 0), (13, 13, 48, 2.1),
                                      (0, 17, 64, 4.2)]:
        h = height + 4*math.sin(phase+offset)
        lean = 4*math.cos(phase+offset)
        for scale, alpha, colour in [(1, .32, COLOURS['edge']),
                                      (.94, .8, COLOURS['edge']),
                                      (.84, 1, COLOURS['fire']),
                                      (.53, 1, COLOURS['core'])]:
            tip = (x+lean*scale, 3+h*scale)
            left, right = (x-width*scale, 3), (x+width*scale, 3)
            def cubic(a, b, c, d, t):
                return tuple((1-t)**3*a[k]+3*(1-t)**2*t*b[k]
                             +3*(1-t)*t*t*c[k]+t**3*d[k] for k in (0, 1))
            # Broad lower belly, narrowing sides, pointed slightly curved top.
            outline = [cubic(left, (x-width*scale*1.3, 3+h*scale*.35),
                             (x+lean*scale-width*scale*.18, 3+h*scale*.64),
                             tip, i/16) for i in range(17)]
            outline += [cubic(tip, (x+lean*scale+width*scale*.12, 3+h*scale*.55),
                              (x+width*scale*1.3, 3+h*scale*.22),
                              right, i/16) for i in range(1, 17)]
            # Rounded common foot, with identical bottom and width every frame.
            outline += [(x+width*scale*math.cos(i*math.pi/16),
                         3-6*scale*math.sin(i*math.pi/16)) for i in range(1, 16)]
            layers.append((outline, alpha, colour))
    return layers


def frame_specs(effect):
    size, count, _, anchor = EFFECTS[effect]
    return [dict(id=f'{effect}-{i}', file=f'tabao-rush/effects/{effect}/{effect}-{i}.png',
                 anchor=list(anchor), anchors={'origin': list(anchor)},
                 blendMode='source-over', reducedMotionFrame=f'{effect}-0',
                 directionConvention=('screen +X; rotate about origin by atan2(-sin(theta)*sin(60deg),cos(theta)); theta from world +X toward +Y'
                                      if effect == 'spray' else 'none'),
                 shadowHeightRule=('scale=1/(1+heightTiles); opacity=1/(1+heightTiles); ground position follows arc XY'
                                   if effect == 'shadow' else 'none')) for i in range(count)]


def animation(effect):
    return dict(action=effect, fps=EFFECTS[effect][2], loop=True,
                frames=[f['id'] for f in frame_specs(effect)])
