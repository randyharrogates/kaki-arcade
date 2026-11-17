"""A-08 stage 2 / PP-030, PP-031. Final style-B cards; shared palette and bundled D-150 font.

blender -b --factory-startup -P tools/blender/cards.py -- --out assets/src/peek-poker/cards
Shared modelling and pixel checks live in board_cards.py.
Dry run: blender -b --factory-startup -P tools/blender/cards.py -- --check-only
"""
import argparse
import json
import math
from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
import board_cards as B
import bpy
from mathutils import Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

WIDTH, HEIGHT = 176, 231
RANKS = ('A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K')
FLIP_PROGRESS = (0, .25, .5, .75, 1)


def camera(scene):
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
    scene.render.resolution_percentage = 100
    bpy.ops.object.camera_add(location=(0, -9, 9*math.sqrt(3)))
    cam = bpy.context.object
    cam.rotation_euler = (-cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'
    scene.camera = cam
    cam.data.ortho_scale = 2
    bpy.context.view_layer.update()
    left = world_to_camera_view(scene, cam, Vector((-.5, 0, 0)))
    right = world_to_camera_view(scene, cam, Vector((.5, 0, 0)))
    cam.data.ortho_scale *= (right.x-left.x)*WIDTH/150
    bpy.context.view_layer.update()
    return cam


def flip(t):
    root = face('A', 's', back=t>.5, neutral=t<=.5)
    # These are angle samples, not elapsed-time samples of the runtime easing.
    # The back is authored facing forward: subtract pi after switching sides.
    turn = math.pi*(t if t<=.5 else t-1)
    root.rotation_euler = (Matrix.Rotation(math.radians(30), 4, 'X') @
                           Matrix.Rotation(turn, 4, 'Y')).to_euler()
    root.location.z = .08*math.sin(math.pi*t)
    return root


def check_width(name, width, face_width, t, thickness):
    expected = abs(math.cos(math.pi*t))*face_width
    tolerance = 3 if t == .5 else .05*expected
    target = thickness if t == .5 else expected
    if abs(width-target) > tolerance:
        raise RuntimeError(f'{name}: opaque width {width:.3f}px; '
                           f'expected {target:.3f} +/- {tolerance:.3f}px')
    return {'opaqueWidth': width, 'expectedWidth': target,
            'widthTolerance': tolerance, 'angleDegrees': 180*t}


def geometry_width(root, scene, cam):
    """Project evaluated opaque geometry, including Solidify, without shadows."""
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    xs = []
    for obj in root.children:
        if obj.type != 'MESH' or any(
                mat and mat.use_nodes and any(n.type == 'BSDF_TRANSPARENT'
                                             for n in mat.node_tree.nodes)
                for mat in obj.data.materials):
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            xs.extend(world_to_camera_view(scene, cam,
                      evaluated.matrix_world @ v.co).x*WIDTH for v in mesh.vertices)
        finally:
            evaluated.to_mesh_clear()
    if not xs:
        raise RuntimeError('No opaque flip geometry')
    return max(xs)-min(xs)


def remove(root):
    for obj in list(root.children):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.objects.remove(root, do_unlink=True)


def fit(obj, box):
    a = B.ink_bounds(obj)
    scale = min((box[2]-box[0])/(a[2]-a[0]),
                (box[3]-box[1])/(a[3]-a[1]))
    obj.scale *= scale
    a = B.ink_bounds(obj)
    obj.location.x += (box[0]+box[2]-a[0]-a[2])/2
    obj.location.y += (box[1]+box[3]-a[1]-a[3])/2


def raw_face(rank, kind, back=False):
    # Stage 1 checks unfinished geometry and stops at its first collision.
    # Defer that check until the final layout is complete; leave its source intact.
    original = B.check_ink
    B.check_ink = lambda *_: None
    try:
        return B.card('B', rank, kind, back)
    finally:
        B.check_ink = original


def distance(a, b):
    return math.hypot(max(a[0]-b[2], b[0]-a[2], 0),
                      max(a[1]-b[3], b[1]-a[3], 0))


def indices(root):
    return [obj for obj in root.children if obj.get('face_ink', False)
            and abs((B.ink_bounds(obj)[0]+B.ink_bounds(obj)[2])/2) > .25]


# Card-local regions; corner boxes extend toward the edge to retain .04 margin.
# Their inner edge at ±.26 leaves .05 to the central region at ±.21.
INDEX_BOXES = {1: (-.46, (205/150)/2-.245, -.26, (205/150)/2-.095),
               -1: (.26, -(205/150)/2+.095, .46, -(205/150)/2+.245)}
RANK_BOX = (-.21, .02, .21, .50)
RANK_SIZES = {}
CAP_HEIGHTS = {}


def reference_layout():
    """Measure the deck once: one font size (hence cap height) per role.

    Q's tail and round overshoots participate in fitting, but cannot alter an
    individual rank's cap size. The A measures the common flat cap height.
    """
    samples = [B.text(None, rank, 0, 0, 1, None) for rank in RANKS]
    bounds = [B.ink_bounds(obj) for obj in samples]
    cap = bounds[0][3]-bounds[0][1]
    # Keep a positive inter-digit ink gap across Blender versions (older
    # versions subtract spacing additively; newer ones contract advances).
    # Font-table ratio: gap 24 / A cap 700. No glyph is stretched or shrunk.
    one = B.text(None, '1', 0, 0, 1, None)
    zero = B.text(None, '0', 0, 0, 1, None)
    a, b = B.ink_bounds(one), B.ink_bounds(zero)
    target_width = a[2]-a[0]+b[2]-b[0]+cap*24/700
    ten = samples[RANKS.index('10')]
    tight_width = bounds[RANKS.index('10')][2]-bounds[RANKS.index('10')][0]
    ten.data.space_character = 1
    a = B.ink_bounds(ten)
    normal_width = a[2]-a[0]
    B.RANK_TEN_SPACING = 1-(normal_width-target_width)*.25/(normal_width-tight_width)
    if not 0 < B.RANK_TEN_SPACING <= 1:
        raise RuntimeError('Cannot tighten 10 with a positive inter-digit gap')
    ten.data.space_character = B.RANK_TEN_SPACING
    bounds[RANKS.index('10')] = B.ink_bounds(ten)
    print(f'CARDS CHECK: 10 character spacing {B.RANK_TEN_SPACING:.6f}.')
    for obj in (one, zero):
        bpy.data.objects.remove(obj, do_unlink=True)
    for role, box in (('index', INDEX_BOXES[1]), ('central', RANK_BOX)):
        size = min(min((box[2]-box[0])/(a[2]-a[0]),
                       (box[3]-box[1])/(a[3]-a[1])) for a in bounds)
        RANK_SIZES[role] = size
        CAP_HEIGHTS[role] = {
            'cardUnits': size*cap,
            'pixels1080p': size*cap*150,
        }
        # The card normal faces the fixed camera: both axes are 150 px/unit.
        print(f'CARDS CHECK: {role} shared cap height '
              f'{size*cap:.6f} card units / '
              f'{size*cap*150:.3f} px at 1080p.')
    for obj in samples:
        bpy.data.objects.remove(obj, do_unlink=True)
    return INDEX_BOXES, .05


def place_rank(obj, box, role):
    """Centre ink without independently scaling any glyph, including 10."""
    obj.scale = (1, 1, 1)
    obj.data.size = RANK_SIZES[role]
    a = B.ink_bounds(obj)
    obj.location.x += (box[0]+box[2]-a[0]-a[2])/2
    obj.location.y += (box[1]+box[3]-a[1]-a[3])/2


def check_ink(root, name, clearance):
    shapes = [(obj, B.ink_bounds(obj)) for obj in root.children
              if obj.get('face_ink', False)]
    corners = set(indices(root))
    failures = []
    if not shapes:
        failures.append(f'No face ink to check: {name}')
    for i, (obj, a) in enumerate(shapes):
        for other, b in shapes[i+1:]:
            detail = f'{name}: {obj.name} {a} / {other.name} {b}'
            if min(a[2], b[2]) > max(a[0], b[0])+1e-6 and min(a[3], b[3]) > max(a[1], b[1])+1e-6:
                failures.append(f'Overlapping face ink: {detail}')
            elif (obj in corners) != (other in corners) and distance(a, b)+1e-6 < clearance:
                failures.append(f'Insufficient corner clearance ({distance(a, b):.6f} < {clearance:.6f}): {detail}')
    return failures


def face(rank, kind, back=False, neutral=False, index_boxes=None):
    root = raw_face(rank, kind, back)
    if neutral:
        for obj in list(root.children):
            if obj.get('face_ink', False):
                bpy.data.objects.remove(obj, do_unlink=True)
    elif not back:
        corners = set(indices(root))
        for obj in corners:
            if obj.type == 'FONT':
                place_rank(obj, (index_boxes or INDEX_BOXES)[1 if obj.location.y > 0 else -1], 'index')
        for obj in root.children:
            if obj.get('face_ink', False) and obj not in corners:
                if obj.type == 'FONT':
                    place_rank(obj, RANK_BOX, 'central')
                else:
                    fit(obj, (-.21, -.39, .21, -.06))
        if rank in ('J', 'Q', 'K'):
            # Original flat court badges: pennant, crown, and battlement.
            # All sit below the shared rank/suit field, clear of both indices.
            outlines = {
                'J': [(-.10,-.44),(.10,-.44),(.04,-.50),(.10,-.56),(-.10,-.56)],
                'Q': [(-.10,-.56),(-.12,-.46),(-.05,-.50),(0,-.43),
                      (.05,-.50),(.12,-.46),(.10,-.56)],
                'K': [(-.11,-.56),(-.11,-.44),(-.06,-.44),(-.06,-.49),
                      (-.025,-.49),(-.025,-.44),(.025,-.44),(.025,-.49),
                      (.06,-.49),(.06,-.44),(.11,-.44),(.11,-.56)],
            }
            mark = B.polygon(root, outlines[rank], B.flat_ink(B.SUITS[kind]))
            mark.name = f'court {rank}'
            mark['face_ink'] = True
    return root


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out')
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    if not args.check_only and not args.out:
        parser.error('--out is required unless --check-only is used')
    if not args.check_only:
        out = Path(args.out).resolve()
        allowed = Path(__file__).resolve().parents[2] / 'assets/src/peek-poker/cards'
        if out != allowed:
            parser.error('Final cards must go to assets/src/peek-poker/cards')
        (out / 'render_validation.json').unlink(missing_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    B.K.STYLE = 'matte'
    index_boxes, clearance = reference_layout()
    failures = []
    for kind in B.SUITS:
        for rank in RANKS:
            root = face(rank, kind, index_boxes=index_boxes)
            failures.extend(check_ink(root, f'B_{rank}{kind}', clearance))
            remove(root)
    if failures:
        raise RuntimeError('Deck ink check failed:\n' + '\n'.join(failures))
    print('CARDS CHECK: 52 faces validated; no ink overlaps; '
          f'corner clearance >= {clearance:.6f} card units.')
    scene = bpy.context.scene
    cam = camera(scene)
    widths = []
    for t in FLIP_PROGRESS:
        root = flip(t)
        widths.append(geometry_width(root, scene, cam))
        remove(root)
    # Paper Solidify thickness is .025 units at the fixed 150 px/unit scale.
    edge_thickness = .025*150
    geometry_metrics = [check_width(f'flip geometry {i}', width, widths[0], t,
                                    edge_thickness)
                        for i, (t, width) in enumerate(zip(FLIP_PROGRESS, widths))]
    print('CARDS CHECK: flip geometry widths (px): ' +
          ', '.join(f'{width:.3f}' for width in widths))
    if args.check_only:
        print('CARDS CHECK: check-only complete; no frames rendered or files written.')
        return
    out = Path(args.out).resolve()
    allowed = Path(__file__).resolve().parents[2] / 'assets/src/peek-poker/cards'
    if out != allowed:
        parser.error('Final cards must go to assets/src/peek-poker/cards')
    out.mkdir(parents=True, exist_ok=True)
    validation = out / 'render_validation.json'
    validation.unlink(missing_ok=True)
    start = time.monotonic()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    B.K.STYLE = 'matte'
    B.K.lights()
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    scene.cycles.seed = 8
    scene.cycles.transparent_max_bounces = 32
    scene.render.use_border = False
    scene.render.use_compositing = False
    scene.render.use_sequencer = False
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    cam = camera(scene)
    metrics, paths = {}, []
    opaque_widths = {}

    def render(root, name, full_face=False, progress=None):
        path = out / (name+'.png')
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        # Coverage follows angular projection; retain a small thickness allowance.
        window = None
        if progress is not None:
            projected = .737*abs(math.cos(math.pi*progress))
            window = (.008, .035) if progress == .5 else (projected*.90, projected*1.10+.025)
        metrics[name] = B.check_face(
            path, face=full_face, back=name == 'card-back' or
            (progress is not None and progress > .5), coverage_window=window,
            paper=progress is not None and progress <= .5)
        image = bpy.data.images.load(str(path), check_existing=False)
        try:
            if tuple(image.size) != (WIDTH, HEIGHT):
                raise RuntimeError(f'Wrong dimensions: {name}')
            if max(image.pixels[3::4]) < .02:
                raise RuntimeError(f'Empty frame: {name}')
            # Opaque paper, excluding the soft baked shadow and antialias fringe.
            columns = [i % WIDTH for i, alpha in enumerate(image.pixels[3::4])
                       if alpha >= .95]
            if not columns:
                raise RuntimeError(f'No opaque pixels: {name}')
            opaque_widths[name] = max(columns)-min(columns)+1
            if progress is not None:
                metrics[name].update(check_width(
                    name, opaque_widths[name], opaque_widths['card-as'],
                    progress, edge_thickness))
        finally:
            bpy.data.images.remove(image)
        paths.append(path)
        for obj in list(root.children):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.objects.remove(root, do_unlink=True)

    for kind in B.SUITS:
        for rank in RANKS:
            render(face(rank, kind, index_boxes=index_boxes), f'card-{rank.lower()}{kind}', True)
    render(face('A', 's', back=True), 'card-back')
    for i, t in enumerate(FLIP_PROGRESS):
        render(flip(t), f'card-flip-{i}', progress=t)
    if len(paths) != 58:
        raise RuntimeError('Incomplete deck')
    validation.write_text(json.dumps({
        'version': 6, 'requirements': ['PP-030', 'PP-031'], 'style': 'B',
        'flipGeometry': geometry_metrics,
        'rankCapHeights': CAP_HEIGHTS,
        'tenCharacterSpacing': B.RANK_TEN_SPACING,
        'sourceSize': [WIDTH, HEIGHT], 'anchor': [WIDTH/2, HEIGHT/2],
        'seconds': time.monotonic()-start, 'frames': metrics,
        'hashEncoding': 'decoded RGBA8, bottom row first (Blender image.pixels)',
        'sha256': {p.name: B.pixel_hash(p) for p in paths},
    }, indent=2)+'\n')
    print('CARDS: 58 renders validated; ready for atlas packing.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Blender otherwise may return success after a Python exception.
        import os
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(1)
