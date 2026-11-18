"""TR-041 source-geometry smoke predictor; no Blender or asset writes.

Capture the actual portion builders, including transforms. Project at elevation
60 degrees for portions, 55 for icons: u=x, v=y*sin(elevation)+z*cos(elevation).
Boxes use their convex corner hull (ignoring bevels); ellipsoids
use sampled surfaces. Portion masks use 4x samples at 120 px/world unit and the
rounded manifest anchor translation. Later masks occlude earlier masks exactly
as the served PNG painter order does. The denominator includes an approximate
container silhouette and its one-pixel rim. Icons fit their authored union to 80%
of 55px, then use items.raster_mask's coverage threshold and one-pixel ink rim.
This predicts geometry coverage, not lighting, alpha filtering or rendered pixels.
"""
import math
from types import SimpleNamespace
from unittest.mock import patch


class Primitive(SimpleNamespace):
    __hash__ = object.__hash__


class Vector(tuple):
    def __add__(self, other):
        return Vector(a+b for a,b in zip(self, other))

    def __mul__(self, scale):
        return Vector(a*scale for a in self)

    __rmul__ = __mul__


def primitives(items, food, state, icon=False):
    root = SimpleNamespace(children=[])

    def record(kind):
        def add(loc, size, colour):
            obj = Primitive(location=Vector(loc), scale=Vector((1,1,1)),
                                  rotation_euler=SimpleNamespace(z=0), kind=kind, size=size, colour=colour)
            root.children.append(obj)
            return obj
        return add

    def strand(points, colour, width=.058):
        for a,b in zip(points, points[1:]):
            for i in range(9):
                record('ball')(tuple(x+(y-x)*i/8 for x,y in zip(a,b)),
                               (width,)*3, colour)

    def ribbon(points, colour, width=.058):
        # Mirror rice_ribbon's sheet normals and .009 solidify thickness;
        # a tube of spheres would double its width and erase silhouette gaps.
        edges = []
        for i,(x,y,z) in enumerate(points):
            before,after = points[max(0,i-1)],points[min(len(points)-1,i+1)]
            dx,dy = after[0]-before[0],after[1]-before[1]
            length = math.hypot(dx,dy)
            nx,ny = -dy/length*width/2,dx/length*width/2
            edges.append([(x+side*nx,y+side*ny,z+dz)
                          for side in (-1,1) for dz in (-.009,0)])
        for a,b in zip(edges,edges[1:]):
            record('mesh')((0,0,0),a+b,colour)

    def vessel(kind):
        radius,height = {'plate':(.31,.055),'bowl':(.28,.19),'cup':(.16,.28)}[kind]
        profile = [(0,.01),(radius*.65,.01),(radius,height),
                   (radius-.025,height+.008),(radius*.65-.02,.04),(0,.04)]
        points = [(r*math.cos(a*math.tau/48),r*math.sin(a*math.tau/48),h)
                  for r,h in profile for a in range(48)]
        record('mesh')((0,0,0),points,items.CERAMIC)
        if kind == 'cup':
            strand([(.15+.075*math.sin(t*math.pi/12),0,.15+.09*math.cos(t*math.pi/12))
                    for t in range(13)],items.CERAMIC,.025)

    with patch.object(items, 'model', root, create=True), \
            patch.object(items, 'Vector', Vector, create=True), \
            patch.object(items, 'ball', record('ball')), \
            patch.object(items, 'box', record('box')), \
            patch.object(items, 'strand', strand), \
            patch.object(items, 'rice_ribbon', ribbon), \
            patch.object(items, 'vessel', vessel):
        if icon:
            items.dish(food,state,icon=True)
        else:
            items.portion(food, state)
    return root.children


def hull(points):
    points = sorted(set(points))
    def half(sequence):
        result = []
        for p in sequence:
            while len(result) > 1:
                a,b = result[-2:]
                if (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]) > 0:
                    break
                result.pop()
            result.append(p)
        return result
    return half(points)[:-1]+half(reversed(points))[:-1]


def polygons(items, food, state, elevation, objects=None):
    result = []
    for obj in primitives(items, food, state) if objects is None else objects:
        if obj.kind == 'mesh':
            points = obj.size
        elif obj.kind == 'box':
            points = [(x*obj.size[0]/2,y*obj.size[1]/2,z*obj.size[2]/2)
                      for x in (-1,1) for y in (-1,1) for z in (-1,1)]
        else:
            points = [(obj.size[0]*math.cos(a)*math.sin(b),
                       obj.size[1]*math.sin(a)*math.sin(b), obj.size[2]*math.cos(b))
                      for a in (i*math.tau/48 for i in range(48))
                      for b in (j*math.pi/24 for j in range(25))]
        angle = obj.rotation_euler.z
        projected = []
        for x,y,z in points:
            x,y = x*math.cos(angle)-y*math.sin(angle), x*math.sin(angle)+y*math.cos(angle)
            x,y,z = (v*s+l for v,s,l in zip((x,y,z),obj.scale,obj.location))
            projected.append((x,y*math.sin(elevation)+z*math.cos(elevation)))
        result.append(hull(projected))
    return result


def triangles(polys):
    return [(p[0],p[i],p[i+1]) for p in polys for i in range(1,len(p)-1)]


def portion_shares(items):
    size = 356
    masks = []
    for food,state,_ in items.DISH_PARTS['rojak'][1]:
        ax,ay = items.slot_anchor(food)
        polys = [[((ax+120*x)/89, (89-ay+120*y)/89) for x,y in p]
                 for p in polygons(items,food,state,math.pi/3)]
        masks.append(items.triangle_samples(triangles(polys),size))
    # Outer plate radius .31 at z=.055; include an approximate 1px outline.
    plate = {(y*size+x) for y in range(size) for x in range(size)
             if ((x+.5-size/2)/(120*.31*4+4))**2
             + ((y+.5-size/2-120*.055*.5*4)/(120*.31*math.sin(math.pi/3)*4+4))**2 <= 1}
    denominator = len(plate.union(*masks))
    return [len(mask-set().union(*masks[i+1:]))/denominator for i,mask in enumerate(masks)]


def icon_masks(items, dishes=None):
    masks = {}
    for dish in items.DISHES if dishes is None else dishes:
        objects = primitives(items,dish,'plated',icon=True)
        polys = polygons(items,dish,'plated',math.radians(55),objects)
        xs = [x for p in polys for x,_ in p]
        ys = [y for p in polys for _,y in p]
        cx,cy = (max(xs)+min(xs))/2,(max(ys)+min(ys))/2
        span = max(max(xs)-min(xs),max(ys)-min(ys))/.8
        fitted = [[(.5+(x-cx)/span,.5+(y-cy)/span) for x,y in p] for p in polys]
        masks[dish] = items.raster_mask(triangles(fitted))
    return masks


def icon_iou(items):
    masks = icon_masks(items, ('chicken-rice','rojak'))
    a,b = masks['chicken-rice'],masks['rojak']
    return len(a&b)/len(a|b)


def polygon_samples(poly, size):
    """Convex hull scan at sample centres, avoiding a full canvas per primitive."""
    points = [(x*size,y*size) for x,y in poly]
    result = set()
    for y in range(max(0,math.ceil(min(y for _,y in points)-.5)),
                   min(size-1,math.floor(max(y for _,y in points)-.5))+1):
        crossings = [ax+(y+.5-ay)*(bx-ax)/(by-ay)
                     for (ax,ay),(bx,by) in zip(points,points[1:]+points[:1])
                     if min(ay,by) <= y+.5 < max(ay,by)]
        if len(crossings) >= 2:
            result.update(y*size+x for x in range(max(0,math.ceil(min(crossings)-.5)),
                                                min(size-1,math.floor(max(crossings)-.5))+1))
    return result


def dish_prediction(items, dish):
    """Flat authored-colour estimate, with 4x coverage and runtime RGBA metric.

    No lighting/bevel/ink simulation: drops require mean-channel difference >7.5,
    a 25% margin above the runtime 6 gate, independently of fractionOver40.
    Each 10px shift must also exceed 6.
    Base containers use an outer ellipse; their handles are omitted. Primitive
    painter order approximates depth inside each portion. Recipe painter order,
    rounded anchors and four 10px displacement probes match the render guard.
    """
    size = 356
    kind, parts = items.DISH_PARTS[dish]
    radius, height = {'plate':(.31,.055), 'bowl':(.28,.19), 'cup':(.16,.28)}[kind]
    ceramic = tuple(bytes.fromhex(items.CERAMIC[1:]))+(255,)
    blank = [(0,0,0,0)]*size**2
    base = list(blank)
    for y in range(size):
        for x in range(size):
            if ((x+.5-size/2)/(120*radius*4+4))**2 + ((y+.5-size/2-120*height*.5*4)/(120*radius*math.sin(math.pi/3)*4+4))**2 <= 1:
                base[y*size+x] = ceramic
    layers = []
    for food,state,_ in parts:
        ax,ay = items.slot_anchor(food)
        pixels = {}
        for obj in primitives(items,food,state):
            polys = [[((ax+120*x)/89, (89-ay+120*y)/89) for x,y in p]
                     for p in polygons(items,food,state,math.pi/3,[obj])]
            colour = tuple(bytes.fromhex(obj.colour[1:]))+(255,)
            for index in set().union(*(polygon_samples(p,size) for p in polys)):
                pixels[index] = colour
        layers.append(pixels)

    def compose(drop=None, shift=(0,0)):
        pixels = list(base)
        for i,layer in enumerate(layers):
            if i == drop and shift == (0,0):
                continue
            dx,dy = shift if i == drop else (0,0)
            for index,colour in layer.items():
                x,y = index%size+dx*4,index//size+dy*4
                if 0 <= x < size and 0 <= y < size:
                    pixels[y*size+x] = colour
        # Downsample the same sample grid to native 89px before scoring.
        return [tuple(round(sum(pixels[(y*4+v)*size+x*4+u][c]
                                for v in range(4) for u in range(4))/16)
                      for c in range(4)) for y in range(89) for x in range(89)]

    actual = compose()
    denominator = sum(p[3] >= 128 for p in actual)*16
    result = []
    for i,layer in enumerate(layers):
        later = set().union(*(set(p) for p in layers[i+1:]))
        share = len(set(layer)-later)/denominator
        scores = [items.composition_difference(actual,compose(i,shift))
                  for shift in ((0,0),(10,0),(-10,0),(0,10),(0,-10))]
        result.append({'food':parts[i][0], 'share':share,
                       'drop':max(scores[0]['meanAbsoluteRGBA']),
                       'shiftMin':min(max(s['meanAbsoluteRGBA']) for s in scores[1:]),
                       'scores':scores})
    return result
