"""A-05 scripted board-1C fixtures and independently animated overlays.

Invoked by pipeline jobs. Never writes pipeline.json. Shared origin/canvas means
T-07 can composite layers at the station root, before adding separate food sprites.
"""
import argparse
import json
from pathlib import Path
import sys
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kalib as K
import station_geometry as G

SOURCE = Path(__file__).resolve().parents[2] / 'assets/src'


def unlit_material(colour):
    """TR-031: preserve authored sRGB progress colours without lighting wash."""
    material = bpy.data.materials.new('progress-'+colour)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    emission = nodes.new('ShaderNodeEmission')
    rgb = [int(colour[i:i+2], 16)/255 for i in (1, 3, 5)]
    emission.inputs['Color'].default_value = tuple(
        c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in rgb)+(1,)
    emission.inputs['Strength'].default_value = 1
    links.new(emission.outputs[0], output.inputs['Surface'])
    return material


def screen_box(root, x, y, w, h, colour, depth=2, unlit=False):
    # Front-facing plaques sit ahead of the fixture, with separated layers.
    # K.rbox bakes location into the mesh, so rotating the returned object turns it about the WORLD
    # origin; pass the tilt through rot= instead (A-05 review M1, which put plaques ~130 px low).
    obj = K.rbox(root, G.screen_point(x, y, depth),
                 (w/120, h/120, .015), unlit_material(colour) if unlit else K.mat(colour), bevel=.008,
                 rot=(K.rad(30), 0, 0))
    return obj


def stroke(root, a, b, width, colour):
    K.limb(root, G.screen_point(*a, depth=2.05), G.screen_point(*b, depth=2.05),
           width/240, width/240, K.mat(colour))


def overlay(root, ident, plaque='drawn'):
    ink, cream = G.PALETTE['ink'], G.PALETTE['cream']
    if ident.startswith('cue-'):
        # Dual contrast plaque, 34 px symbol. Distinct geometry, no text required.
        screen_box(root, 96, G.CUE_Y, 70 if plaque == 'phi' else 44, 44, cream, depth=1.975)
        screen_box(root, 96, G.CUE_Y, 68 if plaque == 'phi' else 42, 42, ink, depth=2)
        screen_box(root, 96, G.CUE_Y, 55 if plaque == 'phi' else 34, 34, cream, depth=2.025)
        state = ident[4:]
        paths = {
            'empty': [[(84, 3), (84, 25), (108, 25), (108, 3)]],
            'working': [[(87, 3), (105, 3), (87, 25), (105, 25), (87, 3)]],
            'done': [[(83, 14), (92, 24), (109, 3)]],
            'burning': [[(80, 29), (96, 3), (112, 29), (80, 29)],
                        [(96, 9), (96, 16)], [(96, 22), (96, 23)]],
            'on-fire': [[(86, 25), (83, 21), (84, 14), (88, 7),
                         (89, 18), (94, 14), (98, 3), (101, 12),
                         (101, 19), (106, 14), (108, 9), (110, 19),
                         (108, 24), (103, 25), (86, 25)]]}
        for path in paths[state]:
            for a, b in zip(path, path[1:]):
                stroke(root, (a[0], a[1]+10), (b[0], b[1]+10), 4, ink)
    elif ident == 'progress-track':
        screen_box(root, 96, G.PROGRESS_Y, 89, 13, ink, unlit=True)
        for i in range(8):
            screen_box(root, G.CELL_X+i*G.CELL_PITCH, G.PROGRESS_Y, 8, 8, cream, depth=2.025, unlit=True)
            screen_box(root, G.CELL_X+i*G.CELL_PITCH, G.PROGRESS_Y, 4, 4, ink, depth=2.05, unlit=True)
    elif ident.startswith('progress-'):
        i = int(ident.split('-')[1])
        screen_box(root, G.CELL_X+i*G.CELL_PITCH, G.PROGRESS_Y, 8, 8, G.PALETTE['gold'], unlit=True)
    else:
        effect, frame = ident.split('-')
        for i, (at, size) in enumerate(G.effect_lobes(effect, int(frame))):
            material = K.mat('#888888').copy()
            nodes, links = material.node_tree.nodes, material.node_tree.links
            surface = nodes.get('Principled BSDF')
            transparent = nodes.new('ShaderNodeBsdfTransparent')
            mix = nodes.new('ShaderNodeMixShader')
            mix.inputs[0].default_value = .45 * (1-i/4) * (1-int(frame)*.12)
            links.new(transparent.outputs[0], mix.inputs[1])
            links.new(surface.outputs[0], mix.inputs[2])
            links.new(mix.outputs[0], nodes.get('Material Output').inputs['Surface'])
            # Nested translucent shells soften the silhouette without runtime blur.
            for scale in (1, .8, .6):
                K.ball(root, at, 1, material, tuple(v*scale for v in size))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--kind', choices=G.FIXTURES+('overlays',), required=True)
    parser.add_argument('--plaque', choices=('drawn', 'phi'), default='drawn')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    folder = 'tabao-rush/stations/'+('phi' if args.plaque == 'phi' else args.kind)
    out = SOURCE / folder
    out.mkdir(parents=True, exist_ok=True)
    ids = (['cue-'+s for s in G.STATES] if args.plaque == 'phi' else
           G.overlay_ids() if args.kind == 'overlays' else [args.kind])
    for ident in ids:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        K.STYLE, K.OUT, K.SAMPLES = 'matte', str(out), 32
        root = K.new_root(ident)
        if args.kind == 'overlays':
            overlay(root, ident, args.plaque)
        else:
            for part in G.geometry(ident):
                material = K.mat(G.PALETTE[part['colour']])
                if part['shape'] == 'box':
                    K.rbox(root, part['at'], part['size'], material, bevel=.04)
                else:
                    K.ball(root, part['at'], 1, material, part['size'])
        if ident.startswith('progress-'):
            scene = bpy.context.scene
            scene.view_settings.view_transform = 'Standard'
            scene.view_settings.look = 'None'
            scene.view_settings.exposure = 0
            scene.view_settings.gamma = 1
        K.lights()
        K.render(ident, G.SIZE, G.SIZE, (0, 0, 8/15), 60, G.SIZE/G.PPU, transparent=True)
    (out/'frames.json').write_text(json.dumps([G.specification(i, folder) for i in ids], indent=2)+'\n')


if __name__ == '__main__':
    main()
