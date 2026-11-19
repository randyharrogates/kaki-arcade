"""TR-050/TR-057: deterministic static kitchen bake; importable without Blender.

Grid south is Blender -Y. Body roots stay at floor height, matching A-05 sprites.
The camera's look-at Y0 incorporates T-07's bottom HUD reservation.
"""
import argparse
import json
import math
from pathlib import Path
import sys

# Venue trim jade (kopitiam tiles, from the A-06 board; kept here, not in the station palette,
# so the station renders' stamps do not change). Named in the A-06 decision.
VENUE_JADE = '#5E9C84'

# Blender runs this file with -P, which does not put its folder on the path; kalib sits beside it.
sys.path.insert(0, str(Path(__file__).resolve().parent))

SOURCE = Path(__file__).resolve().parents[2] / 'assets/src'
LOOKS = ('terrazzo', 'tile', 'golden')
PHI = 1.618
COUNTER_TOP = .675
COUNTER_HEIGHT = .60


def body_kind(kind):
    return 'ingredient-crate' if kind == 'crate' else kind


def baked_body(kind):
    # Only the shared static fixture set is baked. Item bodies (carried or
    # consumable) are absent by default, including future item station kinds.
    import station_geometry as G
    return body_kind(kind) in G.FIXTURES and G.metadata(body_kind(kind))['staticBody']


def body_top(kind):
    import station_geometry as G
    return max(p['at'][2] + p['size'][2] / (2 if p['shape'] == 'box' else 1)
               for p in G.geometry(body_kind(kind)))


def surround_top(kind):
    import station_geometry as G
    # Compare the structural body, excluding crate contents and accessories.
    parts = G.geometry(body_kind(kind))
    base_top = parts[0]['at'][2] + parts[0]['size'][2]/2
    return COUNTER_TOP if base_top >= COUNTER_HEIGHT and body_top(kind) > COUNTER_TOP else None


def golden_band_height():
    return COUNTER_HEIGHT / (1 + PHI)


def camera(level):
    centre = min(540, 881-55-level['height']*.866*120/2)
    return dict(width=1920, height=1080, pixelsPerTile=120, tilt=60,
                Y0=(centre-540)/(120*.866), centreY=centre)


def project(level, x, y, z=0):
    c = camera(level)
    return [round(960+120*(x-level['width']/2), 4),
            round(540-((level['height']/2-y-c['Y0'])*.866+z*.5)*120, 4)]


def exports(level):
    def point(entry):
        tile = entry['tile']
        return dict(entry, screen=project(level, tile % level['width']+.5,
                                         tile//level['width']+.5))
    anchors = dict(levelId=level['id'], camera=camera(level),
                   stations=[point(a) for a in level['stations']],
                   spawns=[point(a) for a in level['spawns']],
                   tiles=[point(dict(tile=t)) for t in range(level['width']*level['height'])])
    collision = list(level['collision'])
    for anchor in level['stations']:
        collision[anchor['tile']] = 'counter'
    return anchors, dict(levelId=level['id'], width=level['width'], height=level['height'], tiles=collision)


def write_exports(level, out):
    out.mkdir(parents=True, exist_ok=True)
    for name, value in zip(('anchors', 'collision'), exports(level)):
        (out/(name+'.json')).write_text(json.dumps(value, indent=2)+'\n')


def build(level, look, out):
    import bpy
    import kalib as K
    import station_geometry as G
    bpy.ops.wm.read_factory_settings(use_empty=True)
    K.STYLE, K.OUT, K.SAMPLES = 'matte', str(out), 32

    def material(colour, treatment='grain'):
        # One low-contrast treatment per surface: grain, terrazzo or tile joints.
        m = K.mat(colour)
        nt = m.node_tree
        shader = nt.nodes['Principled BSDF']
        if treatment == 'terrazzo':
            # World tile units, not normalised slab coordinates: chips span
            # roughly 2–7 pixels at 120 px/tile, in three muted palette tones.
            coords = nt.nodes.new('ShaderNodeTexCoord')
            previous = None
            for scale, threshold, tone, weight in ((9, .26, 'wood', .72), (18, .25, 'steel', .78), (32, .24, 'ink', .32)):
                texture = nt.nodes.new('ShaderNodeTexVoronoi')
                texture.inputs['Scale'].default_value = scale
                nt.links.new(coords.outputs['Object'], texture.inputs['Vector'])
                mask = nt.nodes.new('ShaderNodeMath')
                mask.operation = 'LESS_THAN'
                mask.inputs[1].default_value = threshold
                nt.links.new(texture.outputs['Distance'], mask.inputs[0])
                mix = nt.nodes.new('ShaderNodeMixRGB')
                nt.links.new(mask.outputs[0], mix.inputs[0])
                if previous is None:
                    mix.inputs[1].default_value = (*K.hexc(colour), 1)
                else:
                    nt.links.new(previous, mix.inputs[1])
                base, chip = K.hexc(colour), K.hexc(G.PALETTE[tone])
                mix.inputs[2].default_value = tuple((1-weight)*b+weight*c for b,c in zip(base,chip))+(1,)
                previous = mix.outputs[0]
            nt.links.new(previous, shader.inputs['Base Color'])
            return m
        texture = nt.nodes.new('ShaderNodeTexBrick' if treatment == 'tile' else 'ShaderNodeTexNoise')
        coords = nt.nodes.new('ShaderNodeTexCoord')
        nt.links.new(coords.outputs['Object'], texture.inputs['Vector'])
        if treatment == 'tile':
            texture.offset = 0
            texture.inputs['Scale'].default_value = 4
            texture.inputs['Mortar Size'].default_value = .015
            texture.inputs['Color1'].default_value = (*K.hexc(colour), 1)
            texture.inputs['Color2'].default_value = (*K.hexc(colour), 1)
            texture.inputs['Mortar'].default_value = (*K.hexc('#D8CDBB'), 1)
            nt.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
        else:
            texture.inputs['Scale'].default_value = 55
            ramp = nt.nodes.new('ShaderNodeValToRGB')
            rgb = K.hexc(colour)
            ramp.color_ramp.elements[0].position = 0
            ramp.color_ramp.elements[1].position = 1
            ramp.color_ramp.elements[0].color = tuple(v*.87 for v in rgb)+(1,)
            ramp.color_ramp.elements[1].color = (*rgb, 1)
            nt.links.new(texture.outputs['Fac'], ramp.inputs[0])
            nt.links.new(ramp.outputs[0], shader.inputs['Base Color'])
        return m

    cream = material('#F4F1E8')
    trim = material(G.PALETTE['wood'] if look == 'tile' else VENUE_JADE)
    floor = material('#EFEAE2' if level['venue'] == 'kopitiam' else '#E6DCC3',
                     'tile' if look == 'tile' else 'terrazzo')
    w, h = level['width'], level['height']
    # Quiet grain backdrop continues behind HUD; no kitchen fixtures enter that band.
    K.rbox(None, (0, 0, -.24), (60, 60, .12), material('#EFEAE2'), bevel=0)
    # Finite floor extent leaves HUD clear. World surface is at z=0.
    K.rbox(None, (0, 0, -.06), (w, h, .12), floor, bevel=.015)
    band = golden_band_height() if look == 'golden' else .21
    occupied = {a['tile']: a for a in level['stations']}
    for tile, kind in enumerate(level['collision']):
        x, y = tile % w+.5-w/2, h/2-(tile//w+.5)
        if kind == 'wall':
            K.rbox(None, (x, y, .6), (.98, .98, 1.2), cream, bevel=.04)
        anchor = occupied.get(tile)
        surround = anchor is None or not baked_body(anchor['kind']) or surround_top(anchor['kind']) is not None
        if (anchor is not None or kind == 'counter') and surround:
            # Surround A-05's body without lifting it or changing its silhouette.
            K.rbox(None, (x, y, .30), (.99, .99, .60), cream, bevel=.02)
            K.rbox(None, (x, y, .635), (1, 1, .08), trim, bevel=.015)
            if anchor is None or not baked_body(anchor['kind']):
                # Empty counters retain a trim edge around a station-tone top.
                K.rbox(None, (x, y, .675), (.90, .90, .02),
                       material(G.PALETTE['steel']), bevel=.01)
            K.rbox(None, (x, y, band/2), (1, 1, band), trim, bevel=.015)
    for anchor in level['stations']:
        if not baked_body(anchor['kind']):
            continue
        kind = body_kind(anchor['kind'])
        root = K.new_root(anchor['id'])
        for part in G.geometry(kind):
            m = K.mat(G.PALETTE[part['colour']])
            if part['shape'] == 'box':
                K.rbox(root, part['at'], part['size'], m, bevel=.04)
            else:
                K.ball(root, part['at'], 1, m, part['size'])
        # A-05's front is -Y (south), facing 2; grid facing increments clockwise.
        root.rotation_euler.z = math.radians((2-anchor['facing'])*45)
        root.location = (anchor['tile'] % w+.5-w/2, h/2-(anchor['tile']//w+.5), 0)
    K.lights()
    # Blender orthographic scale is frame WIDTH in landscape, hence 1920/120.
    K.render('background', 1920, 1080, (0, camera(level)['Y0'], 0), 60, 16)
    write_exports(level, out)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--level', required=True)
    parser.add_argument('--look', choices=LOOKS, default='terrazzo')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    level = json.loads((SOURCE/'tabao-rush/levels'/(args.level+'.json')).read_text())
    out = SOURCE/'tabao-rush/levels'/args.level/args.look
    out.mkdir(parents=True, exist_ok=True)
    build(level, args.look, out)


if __name__ == '__main__':
    main()
