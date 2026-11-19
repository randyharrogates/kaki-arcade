"""TR-001: original front-facing recipe pictograms, in 34 px canvas coordinates.

Polygons are additive ink only: gaps are transparent, never background-coloured.
This module has no Blender or Pillow dependency.
"""
import math
import struct
import zlib

KINDS = ('chop', 'wok', 'pot', 'grill', 'rice', 'drinks', 'mix', 'spread',
         'plate', 'bowl', 'cup')
SIZE = 34
COLOUR = '#8E2A18'
FOLDER = 'tabao-rush/step-icons'
# At least 70 native-TV pixels differ; guards near-duplicates without claiming
# semantic recognition. Same gate on packed half detail reconstructed at 34 px.
MIN_DIFFERENCE = .06


def rectangle(x, y, w, h):
    return [(x, y), (x+w, y), (x+w, y+h), (x, y+h)]


def ellipse(x, y, rx, ry, count=32):
    return [(x+rx*math.cos(i*2*math.pi/count),
             y+ry*math.sin(i*2*math.pi/count)) for i in range(count)]


def stroke(a, b, width):
    dx, dy = b[0]-a[0], b[1]-a[1]
    length = math.hypot(dx, dy)
    x, y = -dy/length*width/2, dx/length*width/2
    return [(a[0]+x,a[1]+y),(b[0]+x,b[1]+y),
            (b[0]-x,b[1]-y),(a[0]-x,a[1]-y)]


def outline(points, width):
    return [stroke(a,b,width) for a,b in zip(points, points[1:])]


def geometry(kind):
    # Retain proportions and centre while allowing render-filter coverage inside
    # a two-pixel clear border (and a one-pixel border after BOX downscaling).
    return [[(17+(x-17)*.9,17+(y-17)*.9) for x,y in polygon]
            for polygon in _geometry(kind)]


def _geometry(kind):
    if kind == 'chop':
        # Sloped cutting edge and raised handle, separated from the board.
        return [rectangle(3,27,28,3),
                [(5,9),(21,9),(21,18),(6,22),(5,20)],
                rectangle(21,9,3,3), rectangle(24,7,7,5)]
    if kind == 'wok':
        return [[(3,17),(24,17),(22,23),(18,27),(10,27),(5,23)],
                stroke((23,18),(31,10),4)]
    if kind == 'pot':
        return [rectangle(7,14,20,14),rectangle(3,16,4,5),
                rectangle(27,16,4,5),[(6,11),(12,7),(22,7),(28,11)],
                rectangle(14,3,6,3)]
    if kind == 'grill':
        parts = outline([(4,5),(30,5),(30,27),(4,27),(4,5)],3)
        return parts + [rectangle(x,8,3,16) for x in (9,16,23)] + [
            rectangle(7,28,4,3),rectangle(23,28,4,3)]
    if kind == 'rice':
        # Squared rice cooker with open indicator slot and distinct domed lid.
        return [rectangle(6,13,22,3),rectangle(6,16,5,12),
                rectangle(23,16,5,12),rectangle(11,24,12,4),
                rectangle(11,16,12,3),ellipse(17,11,11,6),
                rectangle(14,3,6,3)]
    if kind == 'drinks':
        return [[(8,12),(27,12),(24,30),(11,30)],
                rectangle(6,9,23,3),stroke((19,10),(23,3),3),
                rectangle(22,2,9,3)]
    if kind == 'mix':
        return [[(3,21),(30,21),(25,30),(8,30)],
                *outline([(10,20),(7,13),(11,6),(18,7),(20,14),(16,20),(10,20)],2.5),
                stroke((17,8),(25,3),3)]
    if kind == 'spread':
        return [[(4,23),(18,9),(23,8),(26,11),(25,15),(11,28),(6,29)],
                stroke((24,11),(30,4),5)]
    if kind == 'plate':
        # Flat elliptical rim, not the filled deep-bowl silhouette.
        outer = [(17+11*math.cos(i*math.pi/16),19+6*math.sin(i*math.pi/16))
                 for i in range(33)]
        return outline(outer,3)
    if kind == 'bowl':
        return [[(3,10),(31,10),(28,20),(23,27),(11,27),(6,20)],
                rectangle(12,28,10,3)]
    if kind == 'cup':
        return [rectangle(6,7,17,3),rectangle(6,10,3,16),
                rectangle(20,10,3,16),rectangle(9,23,11,5),
                *outline([(23,11),(30,11),(30,20),(23,20)],3),
                rectangle(5,29,21,2)]
    raise ValueError(kind)


def specification(kind):
    if kind not in KINDS:
        raise ValueError(kind)
    return dict(id='step-'+kind, file=f'{FOLDER}/{kind}.png',
                anchor=[17,17], anchors=dict(centre=[17,17]))


def contains(poly, x, y):
    inside = False
    for a,b in zip(poly, poly[1:]+poly[:1]):
        if (a[1] > y) != (b[1] > y):
            if x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
                inside = not inside
    return inside


def silhouette(kind):
    polygons = geometry(kind)
    return {y*SIZE+x for y in range(SIZE) for x in range(SIZE)
            if any(contains(p,x+.5,y+.5) for p in polygons)}


def ink_png(width, height, alpha):
    """Encode fixed sRGB ink with rendered alpha; bypass colour management."""
    if len(alpha) != width*height:
        raise ValueError('Alpha size does not match canvas')
    ink = bytes.fromhex(COLOUR[1:])
    rows = b''.join(b'\0'+b''.join(ink+bytes([a]) for a in
                    alpha[y*width:(y+1)*width]) for y in range(height))

    def chunk(kind, data):
        return (struct.pack('>I',len(data))+kind+data+
                struct.pack('>I',zlib.crc32(kind+data)))

    return (b'\x89PNG\r\n\x1a\n'+
            chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))+
            chunk(b'IDAT',zlib.compress(rows))+chunk(b'IEND',b''))
