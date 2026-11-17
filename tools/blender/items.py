"""Original primitive-built hawker food, TR-001/TR-040/TR-041.
89 px item canvases at 120 px/world unit; 55 px high three-quarter order icons.
No external models, textures, randomness or runtime geometry dependencies.
"""
import argparse
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
import shutil
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
# Kept literal and checked against recipes.ts and state.ts before building anything.
INGREDIENTS = ('rice', 'chicken', 'cucumber', 'kway-teow', 'satay', 'laksa-broth',
               'noodles', 'pineapple', 'turnip', 'bread', 'kopi', 'teh')
STATES = ('raw', 'chopped', 'cooked', 'burnt')
# Appearance keys: spread remains cooked in the simulation, with grill,spread history.
REACHABLE = {
    'rice': ('raw', 'cooked', 'burnt'),
    'chicken': ('raw', 'chopped'), 'cucumber': ('raw', 'chopped'),
    'kway-teow': ('raw', 'chopped', 'cooked', 'burnt'),
    'satay': ('raw', 'chopped', 'cooked', 'burnt'),
    'laksa-broth': ('raw', 'cooked', 'burnt'), 'noodles': ('raw', 'cooked'),
    'pineapple': ('raw', 'chopped'), 'turnip': ('raw', 'chopped'),
    'bread': ('raw', 'cooked', 'burnt', 'spread'),
    'kopi': ('raw', 'cooked'), 'teh': ('raw', 'cooked'),
}
DISHES = ('chicken-rice', 'char-kway-teow', 'satay', 'laksa', 'rojak', 'kaya-toast', 'kopi-teh')

# One world-space placement per portion: dish(), manifest anchors and composition checks
# all consume this table. Camera is fixed at 60 degrees and 120 pixels/world unit.
PORTIONS = {
    'rice': (('cooked',), (-.09, .05, .06), .66),
    'chicken': (('chopped',), (.10, -.09, .07), .55),
    'cucumber': (('chopped',), (.13, .12, .07), .42),
    'kway-teow': (('cooked',), (0, 0, .08), .9),
    'satay': (('cooked',), (-.10, -.03, .05), .78),
    'laksa-broth': (('cooked',), (0, 0, .165), 1),
    'noodles': (('cooked',), (0, 0, .18), .72),
    'pineapple': (('chopped',), (-.12, -.07, .07), .75),
    'turnip': (('chopped',), (.04, -.14, .09), .95),
    'bread': (('cooked', 'spread'), (-.09, -.04, .06), .63),
    'kopi': (('cooked',), (0, 0, .255), 1),
    'teh': (('cooked',), (0, 0, .255), 1),
    'rojak-dressing': (('clean',), (0, 0, .16), 1),
    'side-cup': (('clean',), (0, 0, 0), .68),
    'side-kopi': (('cooked',), (0, 0, 0), .68),
    'side-teh': (('cooked',), (0, 0, 0), .68),
    'drink-side': (('clean',), (.08, -.04, .06), .68),
}
# Explicit back-to-front order, also exported in frame metadata.
DISH_PARTS = {
    'chicken-rice': ('plate', (('rice', 'cooked', 10), ('chicken', 'chopped', 20), ('cucumber', 'chopped', 30))),
    'char-kway-teow': ('plate', (('kway-teow', 'cooked', 10),)),
    'satay': ('plate', (('cucumber', 'chopped', 10), ('satay', 'cooked', 20))),
    'laksa': ('bowl', (('laksa-broth', 'cooked', 10), ('noodles', 'cooked', 20))),
    'rojak': ('plate', (('pineapple', 'chopped', 10), ('turnip', 'chopped', 20), ('cucumber', 'chopped', 30), ('rojak-dressing', 'clean', 40))),
    'kaya-toast': ('plate', (('bread', 'spread', 10), ('drink-side', 'clean', 20))),
    'kopi-teh': ('cup', (('kopi', 'cooked', 10),)),
}


def dish_layers(ident):
    return [{'frame': f'portion-{food}-{state}', 'slot': food, 'order': order}
            for food, state, order in sorted(DISH_PARTS[ident][1], key=lambda part: part[2])]


def container_anchors(kind):
    # Any ready food is accepted by the rules. Non-recipe food sits at the
    # interior centre; recipe food retains its deliberate plating position.
    centre = {'plate': [44.5, 40.5], 'bowl': [44.5, 34.5], 'cup': [44.5, 29.5]}[kind]
    anchors = {food: list(centre) for food in INGREDIENTS}
    if kind == 'plate':
        anchors.update({food: slot_anchor(food) for food in ('rojak-dressing', 'drink-side')})
        anchors.update({food: slot_anchor('drink-side') for food in ('kopi', 'teh')})
    for container, parts in DISH_PARTS.values():
        if container == kind:
            anchors.update({food: slot_anchor(food) for food, _, _ in parts})
    return anchors


def container_scales(kind):
    # Portion PNGs are centred at their own origin. Scale about their frame anchor
    # before translating to the named container anchor; metadata is dimensionless.
    food_scale = {'plate': 1, 'bowl': .70, 'cup': .36}[kind]
    scales = {food: food_scale for food in INGREDIENTS}
    if kind == 'bowl':
        scales.update({'laksa-broth': 1, 'noodles': 1})
    if kind == 'cup':
        scales.update({'kopi': 1, 'teh': 1})
    if kind == 'plate':
        scales.update({'rojak-dressing': 1, 'drink-side': 1, 'kopi': .68, 'teh': .68})
    return scales


def plate_drinks():
    side = slot_anchor('drink-side')
    liquid = [side[0], side[1]-round(120*.255*.5*.68)]
    return {drink: [
        {'frame': 'portion-side-cup-clean', 'anchor': side, 'scale': 1, 'order': 10},
        {'frame': f'portion-side-{drink}-cooked', 'anchor': liquid, 'scale': 1, 'order': 20},
    ] for drink in ('kopi', 'teh')}


def served_composition(ident):
    if ident == 'kaya-toast':
        bread = dish_layers(ident)[:1]
        return {'container': 'container-plate-clean', 'ingredient': 'servedDrink',
                'variants': {drink: bread + [dict(layer, order=layer['order']+10)
                                            for layer in layers]
                             for drink, layers in plate_drinks().items()}}
    return {'container': 'container-cup-clean', 'ingredient': 'servedDrink',
            'variants': {drink: [{'frame': f'portion-{drink}-cooked', 'slot': drink, 'order': 10}]
                         for drink in ('kopi', 'teh')}}


def slot_anchor(ident):
    x, y, z = PORTIONS[ident][1]
    # PNG coordinates run downwards; orthographic camera looks along +Y/-Z.
    return [44.5+round(120*x), 44.5-round(120*(y*math.sin(math.pi/3)+z*.5))]


def portion(ident, state, placed=False):
    _, offset, scale = PORTIONS[ident]
    start = set(model.children)
    if ident == 'rojak-dressing':
        # Short unequal drizzles cross only small patches of the mixed heap.
        for points in (
                [(-.23,-.11,.01),(-.18,-.09,.018),(-.13,-.12,.01)],
                [(-.05,-.20,.01),(.01,-.16,.018),(.05,-.17,.01)],
                [(.10,-.07,.01),(.14,-.02,.018),(.20,-.04,.01)],
                [(-.12,.06,.01),(-.07,.10,.018),(.01,.08,.01)],
                [(.04,.18,.01),(.10,.15,.018),(.17,.17,.01)]):
            strand(points, '#513022', .009)
        for x, y, angle in ((-.18,-.08,.3),(-.04,-.18,1.2),(.12,-.03,.7),
                            (-.08,.10,-.4),(.08,.15,1.8),(.20,.07,.2)):
            fleck = box((x, y, .035), (.025, .016, .012), '#C7A16A')
            fleck.rotation_euler.z = angle
    elif ident == 'side-cup':
        vessel('cup')
    elif ident in ('side-kopi', 'side-teh'):
        portion(ident[5:], state)
    elif ident == 'drink-side':
        vessel('cup')
        ball((0, 0, .255), (.125, .125, .018), '#462D20')
        strand([(.10*math.cos(t*math.tau/32), .10*math.sin(t*math.tau/32), .271)
                for t in range(33)], '#CDAC71', .008)
    elif ident in ('kopi', 'teh', 'laksa-broth'):
        radius = .125 if ident != 'laksa-broth' else .245
        ball((0, 0, 0), (radius, radius, .018),
             {'kopi': '#462D20', 'teh': '#AD7445', 'laksa-broth': '#DF702D'}[ident])
        if ident == 'laksa-broth':
            for i in range(5):
                ball((.13*math.cos(i*1.3), .13*math.sin(i*1.3), .018), (.025, .025, .009), '#A54624')
        elif ident == 'kopi':
            strand([(.10*math.cos(t*math.tau/32), .10*math.sin(t*math.tau/32), .016)
                    for t in range(33)], '#CDAC71', .008)
    else:
        ingredient(ident, state)
    for obj in set(model.children)-start:
        obj.location *= scale
        obj.scale *= scale
        if placed:
            obj.location += Vector(offset)



def specifications():
    frames = [(f'item-{i}-{s}', i, s, 89, False) for i, states in REACHABLE.items() for s in states]
    frames += [(f'container-{i}-{s}', i, s, 89, False)
               for i in ('plate', 'bowl', 'cup') for s in ('clean', 'dirty')]
    frames += [('item-extinguisher', 'extinguisher', 'clean', 89, False)]
    frames += [(f'dish-{i}-plated', i, 'plated', 89, False) for i in DISHES]
    frames += [(f'icon-{i}', i, 'plated', 55, True) for i in DISHES]
    frames += [(f'portion-{i}-{s}', i, s, 89, False)
               for i, (states, _, _) in PORTIONS.items() for s in states]
    return frames


def coverage():
    recipes = (ROOT / 'games/tabao-rush/src/rules/recipes.ts').read_text()
    ingredients = set(re.findall(r"part\('([^']+)'", recipes))
    if 'drink' in ingredients:
        ingredients.remove('drink')
        ingredients.update(('kopi', 'teh'))
    dishes = set(re.findall(r"\{ id: '([^']+)', basePoints:", recipes))
    state = (ROOT / 'games/tabao-rush/src/rules/state.ts').read_text()
    kinds = set(re.findall(r"'([^']+)'", re.search(r'readonly kind: ([^;]+);', state[state.index('export interface Item {'):])[1]))
    if ingredients != set(INGREDIENTS) or dishes != set(DISHES):
        raise RuntimeError('Recipe IDs changed: update models and sprite table')
    if kinds != set(STATES) | {'dirty-plate', 'plate', 'dish', 'extinguisher'}:
        raise RuntimeError('Simulation item kinds changed: update sprite coverage')
    # Fail closed if processing grammar changes, including a new step on an existing item.
    expected = {
        'rice': ('rice',), 'chicken': ('chop',), 'cucumber': ('chop',),
        'kway-teow': ('chop', 'wok'), 'satay': ('chop', 'grill'),
        'laksa-broth': ('pot',), 'noodles': ('pot',), 'pineapple': ('chop',),
        'turnip': ('chop',), 'bread': ('grill', 'spread'), 'drink': ('drinks',)}
    for match in re.finditer(r"part\('([^']+)'([^)]*)\)", recipes):
        if tuple(re.findall(r"'([^']+)'", match[2])) != expected[match[1]]:
            raise RuntimeError('Recipe process changed: update state artwork')
    check_composition_guard()
    config = json.loads((ROOT / 'assets/src/pipeline.json').read_text())
    group = next(g for g in config['sets'] if g['id'] == 'tabao-rush-items')
    if {f['id'] for f in group['frames']} != {s[0] for s in specifications()}:
        raise RuntimeError('Pipeline frame list differs from model coverage')
    check_outline_scales({f['id']: f for f in group['frames']})
    for frame in group['frames']:
        if frame['id'].startswith('container-'):
            if frame.get('anchors') != container_anchors(frame['id'].split('-')[1]):
                raise RuntimeError('Container slot anchors differ from dish placements')
            if frame.get('portionScales') != container_scales(frame['id'].split('-')[1]):
                raise RuntimeError('Container portion scales differ from opening sizes')
            if frame['id'].split('-')[1] == 'plate' and frame.get('contentCompositions') != plate_drinks():
                raise RuntimeError('Plate drinks must use side cups')
        if frame['id'].startswith('dish-'):
            ident = frame['id'][5:-7]
            if frame.get('composition') != dish_layers(ident):
                raise RuntimeError('Dish draw order differs from manifest')
            if ident in ('kopi-teh', 'kaya-toast') and frame.get('servedComposition') != served_composition(ident):
                raise RuntimeError('Dish must select the served drink portion')


# Blender imports are delayed so the coverage table remains easy to inspect.
def ball(loc, scale, colour):
    return K.ball(model, loc, 1, material(colour), scale)


def box(loc, size, colour):
    return K.rbox(model, loc, size, material(colour), min(.025, min(size)/3))


def cylinder(loc, radius, depth, colour):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    K._fin(obj, material(colour), model)
    return obj


def material(colour):
    if colour not in materials:
        materials[colour] = K.mat(colour)
    return materials[colour]


def strand(points, colour, width=.018):
    curve = bpy.data.curves.new('food curve', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = width
    curve.bevel_resolution = 3
    spline = curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    obj = bpy.data.objects.new('food strand', curve)
    bpy.context.collection.objects.link(obj)
    obj.parent = model
    curve.materials.append(material(colour))


def ribbon_points(index, state):
    """Wide sheet centreline: staggered curls, never a grid of parallel strands."""
    if state == 'raw':
        return [(-.20+t*.04, (index-2.5)*.045+.012*math.sin(t*.7),
                 .04+index*.014+.045*math.sin(t*math.pi/10)**2) for t in range(11)]
    if state == 'chopped':
        angle = (.3, 1.1, -.5, 2.1, .7, -1.2)[index]
        cx, cy = ((-.12,-.10), (.09,-.08), (-.09,.06), (.12,.08), (0,.14), (.01,-.15))[index]
        return [((t-4)*.035*math.cos(angle)+cx,
                 (t-4)*.035*math.sin(angle)+cy,
                 .04+index*.012+.018*math.sin(t*.8+index)) for t in range(9)]
    angle = index*2.39996
    cx, cy = .105*math.cos(angle), .10*math.sin(angle)
    length = 19 if state == 'chopped' else 31
    return [(cx+(.12+.018*math.sin(index))*math.cos(t*.16+angle),
             cy+.11*math.sin(t*.16+angle),
             .045+index*.011+.028*math.sin(t*.32+index)) for t in range(length)]


def rice_ribbon(points, colour, width=.058):
    vertices = []
    for i, (x, y, z) in enumerate(points):
        before, after = points[max(0, i-1)], points[min(len(points)-1, i+1)]
        dx, dy = after[0]-before[0], after[1]-before[1]
        length = math.hypot(dx, dy)
        nx, ny = -dy/length*width/2, dx/length*width/2
        vertices.extend([(x+nx, y+ny, z), (x-nx, y-ny, z)])
    mesh = bpy.data.meshes.new('flat rice ribbon')
    mesh.from_pydata(vertices, [], [(2*i, 2*i+1, 2*i+3, 2*i+2) for i in range(len(points)-1)])
    mesh.update()
    obj = bpy.data.objects.new('flat rice ribbon', mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = model
    mesh.materials.append(material(colour))
    solid = obj.modifiers.new('sheet thickness', 'SOLIDIFY')
    solid.thickness = .009


def vessel(kind, dirty=False, offset=(0, 0, 0), filled=None):
    x, y, z = offset
    radius, height = {'plate': (.31, .055), 'bowl': (.28, .19), 'cup': (.16, .28), 'glass': (.145, .35)}[kind]
    # Lathed open profile: visible interior, substantial rounded rim, closed base.
    profile = [(0, .01), (radius*.65, .01), (radius, height),
               (radius-.025, height+.008), (radius*.65-.02, .04), (0, .04)]
    verts = [(x+r*math.cos(a*math.tau/48), y+r*math.sin(a*math.tau/48), z+h)
             for r, h in profile for a in range(48)]
    faces = [(j*48+a, j*48+(a+1)%48, (j+1)*48+(a+1)%48, (j+1)*48+a)
             for j in range(len(profile)-1) for a in range(48)]
    mesh = bpy.data.meshes.new('ceramic profile'); mesh.from_pydata(verts, [], faces); mesh.update()
    obj = bpy.data.objects.new(kind, mesh); bpy.context.collection.objects.link(obj)
    K._fin(obj, material('#F4EBDD'), model)
    if kind == 'cup':
        strand([(x+.15+.075*math.sin(t*math.pi/12), y, z+.15+.09*math.cos(t*math.pi/12)) for t in range(13)], '#F4EBDD', .025)
    if filled:
        ball((x, y, z+height-.025), (radius-.035, radius-.035, .018), filled)
    if dirty:
        # Broken, asymmetric wipes follow the interior profile, never concentric rings.
        def surface(u, v):
            r = radius*math.hypot(u, v)
            inner = radius*.65-.02
            h = .04+(height-.032)*max(0, (r-inner)/(radius-.025-inner))
            return (x+radius*u, y+radius*v, z+h+.008)

        sauce = '#956C50'  # muted brown-orange residue
        for points, width in (
                ([(-.66, -.21), (-.46, -.30), (-.19, -.25), (.02, -.34)], .060),
                ([(-.52, -.06), (-.32, .02), (-.05, -.08)], .052),
                ([(.16, .40), (.37, .48), (.57, .32)], .045),
                ([(.38, -.52), (.50, -.40)], .028)):
            strand([surface(u, v) for u, v in points], sauce, radius*width)
        # Flattened overlapping daubs broaden the main wipe to roughly a third
        # of the interior, with ragged margins and clear untouched gaps.
        for u, v, sx, sy in ((-.43, -.22, .24, .19), (-.17, -.18, .25, .17),
                              (-.35, .05, .18, .15), (.30, .36, .18, .12)):
            ball(surface(u, v), (radius*sx, radius*sy, .006), sauce)
        for u, v, colour in ((-.58, .33, '#B99C69'), (.17, -.55, '#AD8656'),
                              (.58, -.08, '#7B7951'), (-.05, .60, '#B99C69')):
            ball(surface(u, v), (radius*.045, radius*.065, .009), colour)
        for u, length in ((-.28, .62), (.43, .30)):
            near = -math.sqrt(1-u*u)
            strand([(x+radius*u, y+radius*near, z+height+.008),
                    (x+radius*(u+.025), y+radius*near-.008, z+height*(1-length)),
                    (x+radius*(u+.06), y+radius*near, z+height*(1-length)-.012)],
                   sauce, radius*.035)



def ingredient(ident, state, offset=(0, 0, 0), scale=1):
    # All food fits a .60-world-unit footprint; chunking changes silhouette.
    start = set(model.children)
    burnt = state == 'burnt'
    colours = {'rice': '#F2E3BA', 'chicken': '#E9BC8F', 'cucumber': '#3D873E',
               'kway-teow': '#DCC697' if state in ('raw', 'chopped') else '#6B4426',
               'satay': '#D99488' if state in ('raw', 'chopped') else '#DF9A58', 'laksa-broth': '#DF702D', 'noodles': '#E4AD65' if state == 'cooked' else '#F4D695',
               'pineapple': '#E9BB38', 'turnip': '#EEE4CF', 'bread': '#C98A45',
               'kopi': '#462D20', 'teh': '#AD7445'}
    c = '#29201C' if burnt else colours[ident]
    if ident in ('kopi', 'teh'):
        if state == 'cooked':
            cylinder((0, 0, .17), .18, .30, '#706151')
            cylinder((0, 0, .325), .165, .015, c)
            strand([(.17, 0, .26), (.29, 0, .24), (.29, 0, .09), (.17, 0, .09)], '#A8987B', .023)
            if ident == 'kopi':
                strand([(.12*math.cos(t*math.tau/32), .12*math.sin(t*math.tau/32), .339)
                        for t in range(33)], '#CDAC71', .012)
            # One drink per cup; kopi and teh differ by liquid colour.
        else:
            # Tall metal tins with an unmistakable side label/band facing the camera.
            cylinder((0, 0, .19), .14, .36, '#A8987B')
            cylinder((0, 0, .22), .143, .26, '#462D20' if ident == 'kopi' else '#417842')
            box((0, -.144, .23), (.12, .014, .055), '#EFE0BC')
            cylinder((0, 0, .38), .125, .018, '#C4AC76')
    elif ident == 'laksa-broth':
        # A low stock pot with two handles, distinct from ceramic bowl and cup.
        cylinder((0, 0, .095), .235, .16, '#706151')
        cylinder((0, 0, .18), .22, .025, '#29201C' if burnt else '#EED1AA' if state == 'raw' else c)
        for side in (-1, 1):
            strand([(side*.21, 0, .12), (side*.31, 0, .13), (side*.31, .06, .14),
                    (side*.21, .06, .14)], '#706151', .022)
        if state == 'cooked':
            for i in range(5):
                ball((.13*math.cos(i*1.3), .13*math.sin(i*1.3), .20), (.025, .025, .009), '#A54624')
    elif ident == 'noodles':
        for j in range(5):
            strand([(-.23+t*.046, (j-2)*.075+.055*math.sin(t*.8+j),
                     .045+j%2*.03) for t in range(11)], c, .022)
    elif ident == 'kway-teow':
        palette = ('#161310', '#231B16') if burnt else (('#EEE3C9', '#DCCDAF')
                  if state in ('raw', 'chopped') else ('#583019', '#754326'))
        for j in range(6):
            points = ribbon_points(j, state)
            rice_ribbon(points, palette[j%2])
            if state == 'cooked':
                # Small warm reflections on the sauce, retaining the matte art finish.
                strand([(x, y, z+.007) for x, y, z in points[6:12]], '#AB7546', .004)
        if state == 'cooked':
            for x, y, z in ((-.16, -.09, .13), (.12, .10, .15), (.05, -.16, .12)):
                strand([(x-.035, y, z), (x, y+.02, z+.018),
                        (x+.035, y+.01, z+.012)], '#E8DDB5', .007)
                leaf = box((x+.025, y-.025, z+.012), (.045, .013, .009), '#468044')
                leaf.rotation_euler.z = x*8
    elif ident == 'satay' and state == 'raw':
        # Two splayed bare sticks, with irregular pink marinated chunks and no char.
        for i, x in enumerate((-.12, .12)):
            lean = (-.045, .055)[i]
            strand([(x-lean, -.29, .035), (x+lean, .27, .035)], '#C7A16A', .010)
            for j, y in enumerate((-.07, .055, .18)):
                meat = ball((x+lean*y/.27, y, .070),
                            (.060, .049, .043), '#C87870' if (i+j)%2 else '#D99488')
                meat.rotation_euler.z = (j-1)*.23+i*.15
                strand([(x+lean*y/.27-.028, y-.016, .106),
                        (x+lean*y/.27+.015, y+.014, .109)], '#E7B3A0', .007)
    elif ident == 'satay' and state != 'raw':
        for x in (-.15, 0, .15):
            strand([(x, -.29, .045), (x, .25, .045)], '#B88A4B', .012)
            for y in (-.08, .04, .16):
                box((x, y, .09), (.11, .09, .10), c)
                if state in ('cooked', 'burnt'):
                    box((x, y, .144), (.075, .018, .008), '#38261B')
    elif ident == 'bread':
        for x in (-.13, .13):
            box((x, 0, .07), (.23, .34, .13), c)
            box((x, 0, .141), (.18, .28, .018), '#859749' if state == 'spread' else '#EBC681' if state == 'raw' else '#9F602F' if not burnt else '#171615')
    elif ident == 'rice':
        if state == 'raw':
            ball((0, 0, .14), (.21, .18, .14), '#BA9462')
            box((0, .04, .26), (.32, .22, .045), '#8E704B')
            ball((0, .04, .28), (.14, .09, .025), c)
        else:
            ball((0, 0, .09), (.24, .22, .09), c)
            ball((0, 0, .13), (.20, .19, .16), c)
        for i in range(24):
            a = i*2.4; r = .025+.014*(i%9)
            ball((r*math.cos(a), .04+r*.6*math.sin(a), .30-.035*(i%3)), (.027, .011, .012), c)
    elif ident == 'chicken':
        if state == 'raw':
            ball((0, .025, .14), (.17, .20, .14), '#E6BCAB')
            for side in (-1, 1):
                ball((side*.17, -.10, .09), (.095, .12, .08), '#E6BCAB')
                ball((side*.16, -.22, .07), (.04, .075, .04), '#EAD9BC')
                ball((side*.16, .10, .10), (.09, .08, .07), '#D4A38D')
        else:
            for i in range(5):
                x = (i-2)*.095
                ball((x, (i%2)*.025, .065), (.040, .12-abs(i-2)*.012, .045), '#EFE0BC')
                # Broad skin cap at one end, leaving a clear pale cut face.
                ball((x, .055, .105), (.040, .060, .018), '#AA682E')
                strand([(x-.026, .014, .12), (x, .012, .126), (x+.026, .014, .12)], '#D3A65C', .009)
    elif ident == 'pineapple' and state == 'raw':
        # Upright oval fruit; diamond lattice follows the curved skin in both directions.
        ball((0, 0, .22), (.155, .145, .215), '#C6A044')
        for handed in (-1, 1):
            for phase in range(9):
                points = []
                for j in range(25):
                    t = -.95+j*1.90/24
                    a = phase*math.tau/9+handed*t*2.8
                    r = math.sqrt(1-t*t)
                    points.append((.158*r*math.cos(a), .148*r*math.sin(a), .22+.215*t))
                strand(points, '#8A783D', .006)
        # Tapered leaf blades, with pointed tips rather than green bumps.
        for i in range(9):
            a = i*2.4
            reach = .15 if i%3 else .065
            tip = (.0+reach*math.cos(a), reach*math.sin(a), .49+(i%3)*.035)
            verts = [(-.025*math.sin(a), .025*math.cos(a), .385),
                     (.025*math.sin(a), -.025*math.cos(a), .385),
                     (reach*.55*math.cos(a), reach*.55*math.sin(a), .46), tip]
            mesh = bpy.data.meshes.new('pineapple leaf')
            mesh.from_pydata(verts, [], [(0, 1, 2), (0, 2, 3), (1, 3, 2)])
            mesh.update()
            leaf = bpy.data.objects.new('spiky crown', mesh)
            bpy.context.collection.objects.link(leaf)
            K._fin(leaf, material('#417842' if i%2 else '#607D43'), model)
    elif state == 'raw':
        ball((0, 0, .12), (.25, .10 if ident == 'cucumber' else .18, .12), c)
        if ident == 'turnip':
            strand([(.18, 0, .10), (.28, -.02, .045)], c, .022)
            strand([(-.20, 0, .12), (-.27, .05, .19)], '#417842', .025)
    else:
        for i in range(9 if ident == 'turnip' else 5):
            x, y = (i%3-1)*.15, (i//3-.5)*.17
            if ident == 'cucumber':
                ball((x, y, .055), (.075, .075, .035), c)
                ball((x, y, .088), (.052, .052, .009), '#BFD07B' if not burnt else '#40362B')
            elif ident == 'pineapple':
                obj = box((x, y, .065), (.12, .085, .10), c)
                obj.rotation_euler.z = (i%3-1)*.55
                strand([(x-.04, y-.025, .12), (x+.04, y+.025, .12)], '#F3D269', .012)
            elif ident == 'turnip':
                x, y = (i%3-1)*.085, (i//3-1)*.075
                angle = (.2, -.4, .7, -.2, .4, 1.0, -.7, .1, -.3)[i]
                obj = box((x, y, .045+(i%3)*.018), (.050, .135, .045), '#CEBA96')
                obj.rotation_euler.z = angle
                face = box((x, y, .069+(i%3)*.018), (.041, .126, .009), '#EEE9DD')
                face.rotation_euler.z = angle
            else:
                box((x, y, .06), (.12, .12, .10), c)
    if burnt and ident in ('rice', 'laksa-broth', 'bread'):
        # Curling smoke silhouette and broken crust: state reads without colour.
        strand([(-.12, .02, .32), (-.17, .04, .38), (-.10, .05, .44),
                (-.14, .07, .50)], '#A8987B', .018)
        for x in (-.08, .06):
            strand([(x-.04, -.08, .29), (x, -.03, .31), (x-.02, .03, .30)], '#B99C69', .016)
    if ident == 'bread' and state == 'cooked':
        for x in (-.13, .13):
            strand([(x-.06, -.10, .155), (x+.06, .10, .155)], '#6B4426', .009)
    for obj in set(model.children)-start:
        obj.location = Vector(offset) + obj.location*scale
        obj.scale *= scale


def dish(ident, state, icon=False):
    global dish_groups
    dish_groups = []
    container, parts = DISH_PARTS[ident]
    # Food-only plate icons retain distinctive silhouettes; laksa keeps its wide bowl.
    if not icon or container != 'plate':
        vessel(container)
        dish_groups.append((set(model.children), None))
    for ingredient_id, appearance, _ in sorted(parts, key=lambda part: part[2]):
        before = set(model.children)
        portion(ingredient_id, appearance, placed=True)
        dish_groups.append((set(model.children)-before, ingredient_id))
    # Spoon belongs to the icon only, never the 89 px dish or its composition.
    if icon and ident == 'laksa':
        strand([(.12, .02, .23), (.36, .09, .43)], '#F4EBDD', .025)
        ball((.37, .09, .44), (.055, .035, .025), '#F4EBDD')


def model_root(ident, state):
    global model
    model = K.new_root(ident+'-'+state)


def build(ident, state, icon=False):
    model_root(ident, state)
    if ident in ('plate', 'bowl', 'cup'):
        vessel(ident, state == 'dirty')
    elif ident == 'extinguisher':
        ball((0, 0, .19), (.11, .10, .19), '#B5371F')
        box((0, 0, .40), (.17, .07, .04), '#373530')
        strand([(.07, 0, .38), (.17, 0, .34), (.18, 0, .18)], '#373530', .025)
        box((0, -.10, .21), (.10, .014, .13), '#F4EBDD')
    elif state in ('plated', 'burnt-dish') or ident in DISHES and ident not in INGREDIENTS:
        dish(ident, 'burnt' if state == 'burnt-dish' else state, icon)
    else:
        ingredient(ident, state)
    if icon:
        icon_outline(ident, state)
    return model


def icon_outline(ident, state):
    """Dish-specific silhouette cues at order-card size."""
    if ident == 'char-kway-teow':
        for x in (.13, .19):
            strand([(x-.18, -.16, .13), (x+.13, .30, .22)], '#B88A4B', .016)
    elif ident == 'satay':
        start = set(model.children)
        vessel('bowl', filled='#6B4426')
        for obj in set(model.children)-start:
            obj.location = Vector((.29, -.18, .02))+obj.location*.32
            obj.scale *= .32


def camera(size, icon):
    scene = bpy.context.scene
    # world_to_camera_view uses render aspect, so establish this frame BEFORE fitting.
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
    bpy.ops.object.camera_add(location=(0, -2.294305745, 3.276608177) if icon else (0, -2, 3.464101615))
    cam = bpy.context.object
    target = Vector((0, 0, 0))
    cam.rotation_euler = (target-cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = .82 if icon else size/120
    scene.camera = cam
    if icon:
        from bpy_extras.object_utils import world_to_camera_view
        bpy.context.view_layer.update()
        deps = bpy.context.evaluated_depsgraph_get()
        points = []
        for obj in model.children:
            evaluated = obj.evaluated_get(deps)
            mesh = evaluated.to_mesh()
            try:
                points.extend([world_to_camera_view(scene, cam, evaluated.matrix_world @ v.co) for v in mesh.vertices])
            finally:
                evaluated.to_mesh_clear()
        lo = Vector((min(p.x for p in points), min(p.y for p in points)))
        hi = Vector((max(p.x for p in points), max(p.y for p in points)))
        centre = (lo+hi)/2-Vector((.5, .5))
        rotation = cam.rotation_euler.to_quaternion()
        cam.location += rotation @ Vector((centre.x*cam.data.ortho_scale, centre.y*cam.data.ortho_scale, 0))
        # Fit geometry to 80% of the square canvas in both validation modes.
        cam.data.ortho_scale *= max(hi.x-lo.x, hi.y-lo.y)/.80
        bpy.context.view_layer.update()
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    return cam


def geometry_check(root, cam, name):
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in root.children:
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        try:
            if not mesh or not mesh.vertices:
                raise RuntimeError(name+': empty geometry')
            for v in mesh.vertices:
                point = evaluated.matrix_world @ v.co
                if not all(math.isfinite(n) for n in point):
                    raise RuntimeError(name+': non-finite geometry')
                points.append(world_to_camera_view(bpy.context.scene, cam, point))
        finally:
            evaluated.to_mesh_clear()
    if not points or any(p.z <= 0 or not .025 < p.x < .975 or not .025 < p.y < .975 for p in points):
        raise RuntimeError(name+': empty or clipped projected geometry')
    if max(p.x for p in points)-min(p.x for p in points) < .15:
        raise RuntimeError(name+': geometry too small')


def pixels_check(path, size):
    image = bpy.data.images.load(str(path), check_existing=False)
    try:
        pixels = list(image.pixels)
        opaque = [i for i in range(size*size) if pixels[4*i+3] > .1]
        if tuple(image.size) != (size, size) or len(opaque) < size*size*.015:
            raise RuntimeError(str(path)+': empty silhouette')
        edges = sorted({name for i in opaque for name, hit in (
            ('left', i%size < 2), ('right', i%size >= size-2),
            ('bottom', i//size < 2), ('top', i//size >= size-2)) if hit})
        if edges:
            raise RuntimeError(str(path)+': alpha clips frame edge ('+', '.join(edges)+')')
        luminance = [sum(pixels[4*i:4*i+3])/3 for i in opaque]
        mean = sum(luminance)/len(luminance)
        variance = sum((v-mean)**2 for v in luminance)/len(luminance)
        if variance < .00008 or len(opaque) > size*size*.90:
            raise RuntimeError(str(path)+': near-uniform sprite')
        return {'opaquePixels': len(opaque), 'luminanceVariance': variance}
    finally:
        bpy.data.images.remove(image)


# Byte PNG image.pixels is display space, matching the Marble ink token.
RIM = tuple(value/255 for value in (0x2B, 0x21, 0x18))


def triangle_samples(triangles, size):
    """Union projected mesh triangles at sample centres.

    Scan only each triangle's covered rows, merging horizontal spans into bitsets.
    Coordinates are normalised camera coordinates; holes and disconnected pieces survive.
    This helper needs neither Blender nor an image library.
    """
    rows = [0]*size
    for triangle in triangles:
        points = [(x*size, y*size) for x, y in triangle]
        low = max(0, math.ceil(min(y for _, y in points)-.5))
        high = min(size-1, math.floor(max(y for _, y in points)-.5))
        for y in range(low, high+1):
            scan = y+.5
            crossings = []
            for (ax, ay), (bx, by) in zip(points, points[1:]+points[:1]):
                if min(ay, by) <= scan < max(ay, by):
                    crossings.append(ax+(scan-ay)*(bx-ax)/(by-ay))
            if len(crossings) < 2:
                continue
            left = max(0, math.ceil(min(crossings)-.5))
            right = min(size-1, math.floor(max(crossings)-.5))
            if right >= left:
                rows[y] |= ((1 << (right-left+1))-1) << left
    return {y*size+x for y, row in enumerate(rows) for x in range(size) if row & (1 << x)}


def rim_mask(mask, size):
    rows = [sum(1 << x for x in range(size) if y*size+x in mask) for y in range(size)]
    limit = (1 << size)-1
    expanded = []
    for y in range(size):
        row = 0
        for neighbour in rows[max(0, y-1):min(size, y+2)]:
            row |= neighbour | neighbour << 1 | neighbour >> 1
        expanded.append(row & limit)
    return {y*size+x for y, row in enumerate(expanded) for x in range(size) if row & (1 << x)}


def alpha_mask(alpha):
    return {i for i, value in enumerate(alpha) if value > .5}


def raster_mask(triangles, size=55):
    """Rasterise the union of evaluated triangles; threshold coverage like PNG alpha."""
    samples = 4
    high = size*samples
    covered = triangle_samples(triangles, high)
    counts = [0]*(size*size)
    for index in covered:
        counts[(index//high//samples)*size+(index%high//samples)] += 1
    return rim_mask(alpha_mask([count/(samples*samples) for count in counts]), size)


def projected_mask(root, cam, size=55):
    """Use evaluated meshes (including bevels and curves) and the actual fitted camera."""
    from bpy_extras.object_utils import world_to_camera_view
    deps = bpy.context.evaluated_depsgraph_get()

    def triangles():
        for obj in root.children:
            evaluated = obj.evaluated_get(deps)
            mesh = evaluated.to_mesh()
            try:
                mesh.calc_loop_triangles()
                points = [world_to_camera_view(bpy.context.scene, cam, evaluated.matrix_world @ v.co)
                          for v in mesh.vertices]
                for tri in mesh.loop_triangles:
                    yield [(points[i].x, points[i].y) for i in tri.vertices]
            finally:
                evaluated.to_mesh_clear()

    return raster_mask(triangles(), size)


def check_icon_size(name, mask, size=55):
    """Apply the same ink-bounds guard to projected and rendered rimmed masks."""
    if not mask:
        raise RuntimeError(name+': empty icon mask')
    xs, ys = [i % size for i in mask], [i // size for i in mask]
    width, height = max(xs)-min(xs)+1, max(ys)-min(ys)+1
    if not 41 <= max(width, height) <= 47:
        raise RuntimeError(f'{name}: icon ink {width} x {height}px outside 41-47px')
    if min(xs) < 2 or max(xs) >= size-2 or min(ys) < 2 or max(ys) >= size-2:
        raise RuntimeError(name+': icon rim clips frame edge')


def check_icon_mask(name, mask, previous_masks):
    if not mask:
        raise RuntimeError(name+': empty icon mask')
    for other, previous in previous_masks.items():
        similarity = len(mask & previous)/len(mask | previous)
        if similarity > .90:
            raise RuntimeError(f'{name} / {other}: alpha-mask IoU {similarity:.3f} > .90')
    previous_masks[name] = mask


def closest_pair(masks):
    pairs = [(len(a & b)/len(a | b), left, right)
             for i, (left, a) in enumerate(masks.items())
             for right, b in list(masks.items())[i+1:]]
    return max(pairs)


def add_rim(path, size):
    """Draw a one-pixel ink-token rim around the sprite silhouette (Blender 5 has no scene compositor tree)."""
    image = bpy.data.images.load(str(path), check_existing=False)
    try:
        px = list(image.pixels)
        w, h = image.size
        alpha = px[3::4]
        out = px[:]
        for y in range(h):
            for x in range(w):
                i = y*w + x
                if alpha[i] > .5:
                    continue
                near = max((alpha[(y+dy)*w + x+dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                            if 0 <= x+dx < w and 0 <= y+dy < h), default=0)
                if near > .5:
                    a = alpha[i]
                    for c in range(3):
                        out[i*4+c] = px[i*4+c]*a + RIM[c]*(1-a)
                    out[i*4+3] = 1.0
        image.pixels[:] = out
        image.filepath_raw = str(path); image.file_format = 'PNG'
        image.save()
        written = png_rgba(path)
        for i, (before, after) in enumerate(zip(alpha, out[3::4])):
            if before == 0 and after == 1:
                pixel = written[(h-1-i//w)*w+i%w]
                if any(abs(pixel[c]-value) > 1 for c, value in enumerate((43, 33, 24))):
                    raise RuntimeError('Written PNG rim differs from #2B2118')
    finally:
        bpy.data.images.remove(image)


def png_mask(mask, size):
    """Blender pixels/projections are bottom-up; manifest anchors use PNG top-left."""
    return {(size-1-i//size)*size+i%size for i in mask}


@contextmanager
def staged_output(destination, check_only=False):
    if check_only:
        yield destination
        return
    # All expensive rendering and checks finish before any published file changes.
    with tempfile.TemporaryDirectory(prefix='tabao-items-') as temporary:
        staged = Path(temporary)
        yield staged
        destination.mkdir(parents=True, exist_ok=True)
        # Copy first so os.replace is always on the destination filesystem.
        with tempfile.TemporaryDirectory(prefix='.publish-', dir=destination.parent) as publish:
            for path in staged.iterdir():
                shutil.copyfile(path, Path(publish)/path.name)
            for path in sorted(Path(publish).iterdir(), key=lambda p: p.name == 'render-validation.json'):
                os.replace(path, destination/path.name)
        expected = {name+'.png' for name, *_ in specifications()}
        for path in destination.iterdir():
            if path.name.startswith(('item-', 'container-', 'dish-', 'icon-', 'portion-')) and path.name not in expected:
                path.unlink()


def compose_masks(container, layers, size=89):
    result = set(container)
    for mask, anchor in layers:
        dx, dy = (round(value-44.5) for value in anchor)
        result.update((i//size+dy)*size+i%size+dx for i in mask
                      if 0 <= i%size+dx < size and 0 <= i//size+dy < size)
    return result


def check_compositions(masks):
    config = json.loads((ROOT/'assets/src/pipeline.json').read_text())
    frames = {f['id']: f for g in config['sets'] if g['id'] == 'tabao-rush-items' for f in g['frames']}
    scores = {}
    for ident, (container, parts) in DISH_PARTS.items():
        base = 'container-'+container+'-clean'
        combined = compose_masks(masks[base], [
            (masks[f'portion-{ingredient}-{state}'], frames[base]['anchors'][ingredient])
            for ingredient, state, _ in sorted(parts, key=lambda part: part[2])])
        dish_mask = masks[f'dish-{ident}-plated']
        score = len(combined & dish_mask)/len(combined | dish_mask)
        if score < .90:
            raise RuntimeError(f'{ident}: container + portions alpha IoU {score:.3f} < .90')
        scores[ident] = score
    return scores


def png_rgba(path):
    """Read the written 8-bit RGBA PNG bytes, independent of Blender colour space."""
    import struct
    import zlib
    data = Path(path).read_bytes()
    pos, compressed = 8, b''
    while pos < len(data):
        length = int.from_bytes(data[pos:pos+4], 'big')
        kind, payload = data[pos+4:pos+8], data[pos+8:pos+8+length]
        if kind == b'IHDR':
            width, height, depth, colour, _, _, interlace = struct.unpack('>IIBBBBB', payload)
            if (depth, colour, interlace) != (8, 6, 0):
                raise RuntimeError('Expected non-interlaced 8-bit RGBA PNG')
        if kind == b'IDAT':
            compressed += payload
        pos += length+12
    raw = zlib.decompress(compressed)
    stride = width*4
    previous = [0]*stride
    result = []
    for y in range(height):
        offset = y*(stride+1)
        mode, row = raw[offset], list(raw[offset+1:offset+1+stride])
        for x in range(stride):
            left = row[x-4] if x >= 4 else 0
            up = previous[x]
            corner = previous[x-4] if x >= 4 else 0
            estimate = left+up-corner
            distances = (abs(estimate-left), abs(estimate-up), abs(estimate-corner))
            paeth = (left, up, corner)[distances.index(min(distances))]
            predictors = (0, left, up, (left+up)//2, paeth)
            row[x] = (row[x]+predictors[mode]) % 256
        result.extend(tuple(row[x:x+4]) for x in range(0, stride, 4))
        previous = row
    return result


def compose_rgba(base, layers, size=89):
    result = list(base)
    for pixels, anchor in layers:
        dx, dy = (round(value-44.5) for value in anchor)
        for i, source in enumerate(pixels):
            x, y = i%size+dx, i//size+dy
            if not (0 <= x < size and 0 <= y < size) or not source[3]:
                continue
            j = y*size+x
            dest = result[j]
            a, b = source[3]/255, dest[3]/255
            alpha = a+b*(1-a)
            result[j] = tuple(round((source[c]*a+dest[c]*b*(1-a))/alpha) for c in range(3))+(round(alpha*255),)
    return result


def scaled_rgba(pixels, scale, size=89):
    """Nearest source sample, scaling about the source frame anchor."""
    result = [(0, 0, 0, 0)]*(size*size)
    for y in range(size):
        for x in range(size):
            sx, sy = round((x-44)/scale+44), round((y-44)/scale+44)
            if 0 <= sx < size and 0 <= sy < size:
                result[y*size+x] = pixels[sy*size+sx]
    return result


def composition_layers(frame, base):
    return [(layer['frame'], layer.get('anchor', base['anchors'].get(layer.get('slot'))),
             layer.get('scale', 1)) for layer in frame]


def footprint(pixels):
    # Full-resolution row bitsets preserve holes and rim ink, unlike a bounding box.
    opaque = {i for i, p in enumerate(pixels) if p[3] >= 128}
    ink = {i for i in opaque if max(abs(pixels[i][c]-v) for c, v in enumerate((43,33,24))) <= 2}
    return {key: ':'.join(format(sum(1 << x for x in range(89) if y*89+x in mask), 'x')
                             for y in range(89)) for key, mask in (('opaque', opaque), ('ink', ink))}


def footprint_pixels(record, interior=False):
    rows = [int(row, 16) for row in record['opaque'].split(':')]
    ink = [int(row, 16) for row in record['ink'].split(':')]
    return [(255,255,255,255) if rows[y] & (1 << x) and not (interior and ink[y] & (1 << x))
            else (0,0,0,0) for y in range(89) for x in range(89)]


def check_outline_scales(frames):
    """Baked raster ink must retain its authored pixel width in every composition."""
    def check(base, label, layers):
        for ident, _, scale in composition_layers(layers, base):
            if frames[ident].get('bakedOutline', False) and scale != 1:
                raise ValueError(f'{label}/{ident}: baked outline requires scale 1, got {scale}')
    for base in frames.values():
        for slot, layers in base.get('contentCompositions', {}).items():
            check(base, base['id']+'/'+slot, layers)
        if 'servedComposition' in base:
            served = base['servedComposition']
            for drink, layers in served['variants'].items():
                check(frames[served['container']], base['id']+'/'+drink, layers)
        if 'composition' in base:
            container = 'container-'+DISH_PARTS[base['id'][5:-7]][0]+'-clean'
            check(frames[container], base['id'], base['composition'])
        for slot, scale in base.get('portionScales', {}).items():
            if slot in base.get('contentCompositions', {}):
                continue
            for ident, frame in frames.items():
                if ident.startswith('portion-'+slot+'-'):
                    check(base, base['id']+'/'+slot, [{'frame': ident, 'scale': scale}])


def check_containment(frames, footprints):
    """At most two offending pixels per layer, including off-canvas pixels.

    Test all accepted generic portions, content overrides and served variants.
    Render invokes this with fresh footprints; unit tests first assert recorded
    footprints equal committed PNG footprints, then check containment using records.
    """
    checks = []
    for base in frames.values():
        if not base['id'].startswith('container-') or not base['id'].endswith('-clean'):
            continue
        overrides = base.get('contentCompositions', {})
        for slot, anchor in base['anchors'].items():
            if slot in overrides:
                checks.append((base, slot, overrides[slot]))
                continue
            for ident in footprints:
                if ident.startswith('portion-'+slot+'-'):
                    checks.append((base, ident, [{'frame': ident, 'anchor': anchor,
                                                  'scale': base['portionScales'][slot]}]))
    for frame in frames.values():
        if 'servedComposition' in frame:
            served = frame['servedComposition']
            for drink, layers in served['variants'].items():
                checks.append((frames[served['container']], frame['id']+'/'+drink, layers))
    failures = []
    for base, label, layers in checks:
        safe = footprint_pixels(footprints[base['id']], interior=True)
        for ident, anchor, scale in composition_layers(layers, base):
            pixels = scaled_rgba(footprint_pixels(footprints[ident]), scale)
            dx, dy = (round(value-44.5) for value in anchor)
            bad = 0
            for i, pixel in enumerate(pixels):
                if pixel[3] < 128:
                    continue
                x, y = i%89+dx, i//89+dy
                if not (0 <= x < 89 and 0 <= y < 89) or safe[y*89+x][3] < 128:
                    bad += 1
            if bad > 2:
                failures.append(f"{base['id']}/{label}/{ident}: {bad} pixels outside opaque interior or on rim ink > 2")
    if failures:
        raise RuntimeError('\n'.join(failures))
    return len(checks)


def finish_side_cup(output):
    """Use exactly the published rimmed cup and liquid for the fixed kaya frame."""
    frames = {f['id']: f for g in json.loads((ROOT/'assets/src/pipeline.json').read_text())['sets']
              if g['id'] == 'tabao-rush-items' for f in g['frames']}
    base = frames['container-plate-clean']
    blank = [(0,0,0,0)]*89**2
    side = slot_anchor('drink-side')
    layers = [(scaled_rgba(png_rgba(output/(ident+'.png')), scale), anchor)
              for ident, anchor, scale in composition_layers(plate_drinks()['kopi'], base)]
    cup = compose_rgba(blank, layers)
    # Preserve the legacy portion ID while making it pixel-identical to the override.
    centred = compose_rgba(blank, [(cup, [89-side[0], 89-side[1]])])
    write_rgba(output/'portion-drink-side-clean.png', centred)
    bread = (png_rgba(output/'portion-bread-spread.png'), slot_anchor('bread'))
    plate = png_rgba(output/'container-plate-clean.png')
    write_rgba(output/'dish-kaya-toast-plated.png', rim_rgba(compose_rgba(plate, [bread]+layers), container=plate))


def composition_difference(actual, expected):
    differences = [tuple(abs(a-b) for a, b in zip(pixel, expected[i]))
                   for i, pixel in enumerate(actual) if pixel[3] >= 128]
    if not differences:
        raise RuntimeError('Empty dish composition')
    mean = [sum(d[c] for d in differences)/len(differences) for c in range(4)]
    fraction = sum(max(d) > 40 for d in differences)/len(differences)
    return {'meanAbsoluteRGBA': mean, 'fractionOver40': fraction,
            'passes': max(mean) <= 6 and fraction <= .01}


def check_composition_guard():
    # Runs in --check-only too: checks threshold behaviour without rendered pixels.
    blank = [(0,0,0,0)]*89**2
    layer = list(blank)
    for y in range(30,50):
        for x in range(30,50):
            layer[y*89+x] = (210,120,50,255)
    actual = compose_rgba(blank, [(layer, [44.5,44.5])])
    if not composition_difference(actual, actual)['passes']:
        raise RuntimeError('Exact composition rejected')
    for broken in (blank, compose_rgba(blank, [(layer, [54.5,44.5])])):
        if composition_difference(actual, broken)['passes']:
            raise RuntimeError('Missing or displaced portion accepted')


def write_rgba(path, pixels, size=89):
    import struct
    import zlib
    def chunk(kind, data):
        return struct.pack('>I', len(data))+kind+data+struct.pack('>I', zlib.crc32(kind+data))
    raw = b''.join(b'\0'+bytes(value for pixel in pixels[y*size:(y+1)*size] for value in pixel)
                   for y in range(size))
    Path(path).write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR', struct.pack('>IIBBBBB', size,size,8,6,0,0,0))
                          +chunk(b'IDAT', zlib.compress(raw))+chunk(b'IEND', b''))


def render_dish_layers(path):
    """Render the dish's ordered groups in isolation, as runtime plating draws them.

    This avoids depth/shadow interactions that cannot be represented by PNG layers.
    The saved dish uses model groups and world placements; validation independently
    reads the published portion PNGs and manifest placements.
    """
    objects = set(model.children)
    layers = []
    base = None
    for group, food in dish_groups:
        for obj in objects:
            obj.hide_render = obj not in group
        offset = Vector(PORTIONS[food][1]) if food else Vector((0,0,0))
        for obj in group:
            obj.location -= offset
        temporary = path.with_name('.dish-layer.png')
        bpy.context.scene.render.filepath = str(temporary)
        bpy.ops.render.render(write_still=True)
        if food is None:
            add_rim(temporary, 89)
            base = png_rgba(temporary)
        else:
            layers.append((png_rgba(temporary), slot_anchor(food)))
        for obj in group:
            obj.location += offset
        temporary.unlink()
    for obj in objects:
        obj.hide_render = False
    write_rgba(path, rim_rgba(compose_rgba(base, layers), container=base))


def rim_rgba(pixels, size=89, container=None):
    mask = {i for i, pixel in enumerate(pixels) if pixel[3] > 127}
    result = list(pixels)
    protected = rim_mask({i for i, pixel in enumerate(container) if pixel[3] > 127}, size) if container else set()
    for i in rim_mask(mask, size)-mask-protected:
        a = pixels[i][3]/255
        result[i] = tuple(round(pixels[i][c]*a+RIM[c]*255*(1-a)) for c in range(3))+(255,)
    return result


def check_portion_visibility(actual, base, layers, ident):
    """Each layer must remain visible after all later layers, and affect completion."""
    opaque = sum(pixel[3] >= 128 for pixel in actual)
    shares = []
    for i, (pixels, anchor) in enumerate(layers):
        # Alpha contribution after occlusion, independent of matching food colours.
        isolated = compose_rgba([(0,0,0,0)]*89**2, [(pixels, anchor)])
        later = compose_rgba([(0,0,0,0)]*89**2, layers[i+1:])
        share = sum(p[3]/255*(1-q[3]/255) for p, q in zip(isolated, later))/opaque
        shares.append(share)
        if share < .04:
            raise RuntimeError(f'{ident}: portion {i} visible share {share:.4f} < .04')
        alternatives = [layers[:i]+layers[i+1:]]
        for dx, dy in ((10,0),(-10,0),(0,10),(0,-10)):
            alternatives.append(layers[:i]+[(pixels, [anchor[0]+dx, anchor[1]+dy])]+layers[i+1:])
        for index, alternative in enumerate(alternatives):
            expected = rim_rgba(compose_rgba(base, alternative), container=base)
            if composition_difference(actual, expected)['passes']:
                action = 'dropping' if index == 0 else 'shifting 10 px'
                raise RuntimeError(f'{ident}: {action} portion {i} failed to break composition')
    return {'dropPortionRejected': True, 'shiftPortionRejected': True, 'visiblePortionShares': shares}


def check_colour_compositions(output):
    config = json.loads((ROOT/'assets/src/pipeline.json').read_text())
    frames = {f['id']: f for g in config['sets'] if g['id'] == 'tabao-rush-items' for f in g['frames']}
    scores = {}
    for ident, (container, _) in DISH_PARTS.items():
        base = frames['container-'+container+'-clean']
        layers = [(png_rgba(output/(layer['frame']+'.png')), base['anchors'][layer['slot']])
                  for layer in frames['dish-'+ident+'-plated']['composition']]
        actual = png_rgba(output/f'dish-{ident}-plated.png')
        score = composition_difference(actual, rim_rgba(compose_rgba(png_rgba(output/(base['id']+'.png')), layers), container=png_rgba(output/(base['id']+'.png'))))
        if not score['passes']:
            raise RuntimeError(f'{ident}: colour composition failed: {score}')
        score.update(check_portion_visibility(actual, png_rgba(output/(base['id']+'.png')), layers, ident))
        scores[ident] = score
    return scores


def check_unique_item(name, encoded, pixels, previous):
    # Compare all 89 px food states, including loose versus served.
    ident = 'food'
    for other, old_encoded, old_pixels in previous.get(ident, []):
        if encoded == old_encoded or pixels == old_pixels:
            raise RuntimeError(f'{name} / {other}: identical item states')
    previous.setdefault(ident, []).append((name, encoded, pixels))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, default=ROOT/'assets/src/tabao-rush/items')
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    coverage()
    if args.out.resolve() != ROOT/'assets/src/tabao-rush/items':
        parser.error('Output must be assets/src/tabao-rush/items')
    global bpy, K, Vector, materials
    import bpy
    import kalib as K
    from mathutils import Vector
    K.STYLE = 'matte'
    with staged_output(args.out, args.check_only) as output:
        args.out = output
        metrics = {}
        icon_masks = {}
        projected_masks = {}
        composition_masks = {}
        previous_items = {}
        for name, ident, state, size, icon in specifications():
            bpy.ops.wm.read_factory_settings(use_empty=True)
            materials = {}
            # Satay is both a portion ingredient and a finished recipe.
            if name.startswith('portion-'):
                model_root(ident, state)
                portion(ident, state)
            else:
                build(ident, 'burnt-dish' if name.startswith('dish-') and state == 'burnt' else state, icon)
            cam = camera(size, icon)
            geometry_check(model, cam, name)
            if icon:
                projected_masks[name] = projected_mask(model, cam, size)
            if args.check_only:
                if not icon and name.startswith(('container-', 'portion-', 'dish-')):
                    composition_masks[name] = png_mask(projected_mask(model, cam, size), size)
                if icon:
                    mask = projected_masks[name]
                    check_icon_size(name, mask, size)
                    check_icon_mask(name, mask, icon_masks)
                continue
            K.lights()
            scene = bpy.context.scene
            scene.render.engine = 'CYCLES'; scene.cycles.samples = 32
            scene.cycles.seed = 4; scene.cycles.use_denoising = True
            scene.render.film_transparent = True
            scene.render.image_settings.file_format = 'PNG'
            scene.render.image_settings.color_mode = 'RGBA'
            scene.view_settings.view_transform = 'AgX'
            path = args.out/(name+'.png')
            scene.render.filepath = str(path)
            if name.startswith('dish-'):
                render_dish_layers(path)
            else:
                bpy.ops.render.render(write_still=True)
            if not name.startswith(('portion-', 'dish-')) or name == 'portion-side-cup-clean':
                add_rim(path, size)
            metrics[name] = pixels_check(path, size)
            image = bpy.data.images.load(str(path), check_existing=False)
            try:
                rgba = tuple(image.pixels)
                mask = alpha_mask(rgba[3::4])
            finally:
                bpy.data.images.remove(image)
            if name.startswith(('item-', 'dish-', 'portion-')):
                check_unique_item(name, path.read_bytes(), rgba, previous_items)
            if not icon and name.startswith(('container-', 'portion-', 'dish-')):
                composition_masks[name] = png_mask(mask, size)
            if icon:
                check_icon_size(name, mask, size)
                check_icon_mask(name, mask, icon_masks)
        if not args.check_only:
            finish_side_cup(args.out)
            for name in ('portion-drink-side-clean', 'dish-kaya-toast-plated'):
                composition_masks[name] = {i for i, p in enumerate(png_rgba(args.out/(name+'.png'))) if p[3] >= 128}
                metrics[name] = pixels_check(args.out/(name+'.png'), 89)
            config = json.loads((ROOT/'assets/src/pipeline.json').read_text())
            frames = {f['id']: f for g in config['sets'] if g['id'] == 'tabao-rush-items' for f in g['frames']}
            fresh = {ident: footprint(png_rgba(args.out/(ident+'.png'))) for ident in frames
                     if ident.startswith(('container-', 'portion-'))}
            check_containment(frames, fresh)
            metrics['containment'] = {'tolerancePixels': 2, 'passed': True}
        composition_scores = check_compositions(composition_masks)
        score, left, right = closest_pair(projected_masks)
        print(f'Projected closest: {left} / {right}: IoU {score:.6f}')
        if not args.check_only:
            rendered_score, rendered_left, rendered_right = closest_pair(icon_masks)
            print(f'Rendered closest: {rendered_left} / {rendered_right}: IoU {rendered_score:.6f}')
            print(f'Projected closest pair rendered IoU: {len(icon_masks[left] & icon_masks[right])/len(icon_masks[left] | icon_masks[right]):.6f}')
            for i, (left, a) in enumerate(projected_masks.items()):
                for right, b in list(projected_masks.items())[i+1:]:
                    projected = len(a & b)/len(a | b)
                    ra, rb = icon_masks[left], icon_masks[right]
                    rendered = len(ra & rb)/len(ra | rb)
                    if (projected > .90) != (rendered > .90):
                        raise RuntimeError(f'{left} / {right}: projected/rendered verdict disagreement')
        if not args.check_only:
            metrics['compositionIoU'] = composition_scores
            metrics['compositionColour'] = check_colour_compositions(args.out)
            (args.out/'render-validation.json').write_text(json.dumps(metrics, indent=2)+'\n')
        print(f'ITEMS: {len(specifications())} models checked; '+('no rendering or writes' if args.check_only else 'all PNG silhouettes validated'))



if __name__ == '__main__':
    try:
        main()
    except Exception:
        import traceback
        traceback.print_exc()
        sys.stdout.flush(); sys.stderr.flush()
        os._exit(1)  # Blender otherwise can exit zero on a Python exception.
