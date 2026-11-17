"""S-02 / NN-4, TR-060: shared toy rig and independently registered cap head.

blender -b --factory-startup -P tools/blender/cook.py -- --check-only
blender -b --factory-startup -P tools/blender/cook.py -- --out assets/src/tabao-rush/cook-spike
Only publishes after every decoded-pixel and rig check succeeds. No Pillow required.
"""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import shutil
import sys
import tempfile
import time

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
import kalib as K

# Match tools/assets/pipeline.py: config paths are rooted at the repository.
ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / 'assets/src/pipeline.json'

# D-044 board 1C uses this height in vision_scenes.py.
K.PROPS['toy']['height'] = 1.5
P = K.PROPS['toy']
HIP = .07 + P['leg']
TORSO = HIP + P['rz'] * .82
TOP = TORSO + P['rz']
# Oversized staging canvas; crop_frames selects the minimum shared square after rendering.
SIZE = 256
PPU = 120
SCALE = P['height'] / (TOP + P['head_r'] * (P['sink'] + P['squash']))
SOCKET = Vector((0, 0, TOP)) * SCALE
DIRECTIONS = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw']
COUNTS = {'idle': 4, 'walk': 8}
TIMINGS = {'bodyAndMasks': 0.0, 'headAndMasks': 0.0, 'reference': 0.0}
MASK_EDGE_TOLERANCE = 16 / 255
STRIDE = .32 * P['height']


def require(condition, message):
    if not condition:
        raise RuntimeError('Cook validation: ' + message)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    K.STYLE = 'matte'
    created = []
    finish = K._fin
    def capture(*args, **kwargs):
        obj = finish(*args, **kwargs)
        created.append(obj)
        return obj
    K._fin = capture
    try:
        root = K.cook('matte', 'cap', same_body=True, apron='#FFFFFF')
    finally:
        K._fin = finish
    bpy.context.view_layer.update()
    meshes = created
    # Identify the head by the first head sphere in the helper's ordered construction.
    hz = TOP + P['head_r'] * P['sink']
    first = next(i for i, o in enumerate(meshes)
                 if abs(o.location.z - hz) < 1e-6 and abs(o.location.x) < 1e-6)
    heads = set(meshes[first:])
    bpy.ops.object.armature_add()
    rig = bpy.context.object
    rig.name = 'shared-cook'
    bpy.ops.object.mode_set(mode='EDIT')
    rig.data.edit_bones.remove(rig.data.edit_bones[0])
    definitions = {'hips': ((0, 0, HIP), None),
                   'spine': ((0, 0, TORSO), 'hips'),
                   'head': (tuple(SOCKET / SCALE), 'spine'),
                   'head_socket': (tuple(SOCKET / SCALE), 'head')}
    for side, x in [('l', -P['rx'] * .45), ('r', P['rx'] * .45)]:
        definitions['leg_' + side] = ((x, 0, HIP + .04), 'hips')
        definitions['arm_' + side] = ((x * 2, 0, TORSO + P['rz'] * .40), 'spine')
    for name, (point, parent) in definitions.items():
        bone = rig.data.edit_bones.new(name)
        bone.head = Vector(point) * SCALE
        bone.tail = bone.head + Vector((0, 0, P['leg'] * .5 * SCALE))
        if parent:
            bone.parent = rig.data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    body, head, tint = [], [], []
    for obj in meshes:
        world = obj.matrix_world.copy()
        x, _, z = obj.location
        if obj in heads:
            bone = 'head_socket'
            head.append(obj)
        else:
            bone = ('arm_' + ('l' if x < 0 else 'r') if abs(x) > P['rx'] * .8 else
                    'leg_' + ('l' if x < 0 else 'r') if z < HIP + .05 else 'spine')
            body.append(obj)
        # The exact shared accent material is neutral white, unlike the warm shirt.
        material = obj.data.materials[0]
        colour = material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
        if min(colour[:3]) > .99:
            tint.append(obj)
        obj.parent = rig
        obj.parent_type = 'BONE'
        obj.parent_bone = bone
        obj.matrix_world = world
    bpy.data.objects.remove(root, do_unlink=True)
    rig.animation_data_create()
    actions = {}
    for action, count in COUNTS.items():
        clip = bpy.data.actions.new(action)
        rig.animation_data.action = clip
        for frame in range(count + 1):
            for bone in rig.pose.bones:
                bone.location = (0, 0, 0)
                bone.rotation_mode = 'XYZ'
                bone.rotation_euler = (0, 0, 0)
                bone.scale = (1, 1, 1)
            if action == 'walk':
                bob = .012 * P['height'] * (1 - math.cos(frame * math.pi / 2))
                rig.pose.bones['spine'].location = (
                    rig.pose.bones['spine'].bone.matrix_local.to_3x3().inverted()
                    @ Vector((0, 0, bob)))
                # Authored forward travel is removed for sprite capture. A stance foot
                # travels backwards at exactly the root velocity; swing returns smoothly.
                for side, offset in [('l', 0), ('r', 4)]:
                    phase = (frame + offset) % 8
                    y = STRIDE * (phase / 8 - .25) if phase <= 4 else STRIDE * (.25 - (phase - 4) / 8)
                    lift = 0 if phase <= 4 else .08 * P['height'] * math.sin(math.pi * (phase - 4) / 4)
                    leg = rig.pose.bones['leg_' + side]
                    leg.location = leg.bone.matrix_local.to_3x3().inverted() @ Vector((0, y, lift))
                    rig.pose.bones['arm_' + side].rotation_euler.x = .18 * math.cos(phase * math.tau / 8)
            else:
                # Breathing changes torso volume only; socket stays registered.
                breath = .004 * (1 - math.cos(frame * math.tau / count))
                rig.pose.bones['spine'].scale = (1 + breath, 1, 1 + breath)
            for bone in rig.pose.bones:
                for prop in ['location', 'rotation_euler', 'scale']:
                    bone.keyframe_insert(prop, frame=frame + 1, group=bone.name)
        # Blender 4.4+ actions use channel bags; key only sampled frames, no overshoot.
        for layer in clip.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points:
                            key.interpolation = 'LINEAR'
        actions[action] = clip
    K.lights()
    # Configure with the same camera geometry as K.render, without rendering here.
    target = Vector((0, 0, .45 * P['height']))
    loc = target + Vector((0, -.5, math.sqrt(3) / 2)) * 18
    bpy.ops.object.camera_add(location=loc)
    camera = bpy.context.object
    camera.rotation_euler = (target - loc).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = SIZE / PPU
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.cycles.seed = 0
    scene.render.resolution_x = scene.render.resolution_y = SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    try:
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass
    # No receiver for the daylight SUN shadow. A bounded contact blob is baked
    # behind body/reference pixels after rendering, never into heads or masks.
    floor = bpy.data.objects.new('contact-shadow-marker', None)
    scene.collection.objects.link(floor)
    return rig, actions, body, head, tint, floor


def project(point):
    scene = bpy.context.scene
    p = world_to_camera_view(scene, scene.camera, point)
    return [SIZE * p.x, SIZE * (1 - p.y)]


def socket(rig):
    return project(bone_world(rig, 'head_socket'))


def bone_world(rig, name):
    evaluated = rig.evaluated_get(bpy.context.evaluated_depsgraph_get())
    return (evaluated.matrix_world @ evaluated.pose.bones[name].matrix).translation.copy()


def pose(rig, actions, action, frame, direction):
    rig.animation_data.action = actions[action]
    rig.animation_data.action_slot = actions[action].slots[0]
    rig.rotation_euler.z = math.radians(direction * 45)
    bpy.context.scene.frame_set(frame + 1)
    bpy.context.view_layer.update()
    bpy.context.evaluated_depsgraph_get().update()


def rig_checks(rig, actions, body, head):
    require(set(actions) == {'idle', 'walk'} and len(rig.data.bones) == 8, 'rig/actions')
    require(body and head and all(o.parent == rig and len(o.data.vertices) > 0
                                for o in body + head), 'mesh parenting/geometry')
    pose(rig, actions, 'idle', 0, 0)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    heights = []
    for obj in body + head:
        evaluated = obj.evaluated_get(depsgraph)
        heights.extend((evaluated.matrix_world @ Vector(corner)).z
                       for corner in evaluated.bound_box)
    height = max(heights) - min(heights)
    # kalib's 1.5 tiles (board 1C) runs from the sole to the top of the bare head; the cap shell
    # adds a constant 0.0494 tiles above it (measured), so the whole mesh is expected at 1.5494.
    # Allow about 1% either way: 1.53 to 1.565 tiles.
    require(P['height'] == 1.5 and 1.53 <= height <= 1.565,
            f'D-044 evaluated mesh height {height} tiles')
    print(f'Cook height: evaluated mesh {height:.4f} tiles including the cap')
    for direction in range(8):
        idle = []
        for frame in range(COUNTS['idle'] + 1):
            pose(rig, actions, 'idle', frame, direction)
            idle.append(socket(rig))
        require(all(math.dist(idle[0], point) < 1e-4 for point in idle), 'idle socket moves')
    maximum_slide = 0
    maximum_jump = 0
    lifts = []
    for direction in range(8):
        anchors = []
        for frame in range(9):
            pose(rig, actions, 'walk', frame, direction)
            anchors.append(socket(rig))
            for obj in body + head:
                for corner in obj.bound_box:
                    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
                    point = project(evaluated.matrix_world @ Vector(corner))
                    require(all(math.isfinite(v) and 1 < v < SIZE - 1 for v in point),
                            f'geometry outside frame: {obj.name}')
        maximum_jump = max(maximum_jump, *(math.dist(a, b) for a, b in zip(anchors, anchors[1:])))
        # Include gameplay root travel when measuring planted feet, not an in-place cheat.
        for side, offset in [('l', 0), ('r', 4)]:
            previous = None
            heights = []
            for frame in range(9):
                phase = (frame + offset) % 8
                pose(rig, actions, 'walk', frame, direction)
                foot = bone_world(rig, 'leg_' + side)
                heights.append(foot.z)
                foot += rig.matrix_world.to_3x3() @ Vector((0, -STRIDE * frame / 8, 0))
                point = project(foot)
                if phase in (1, 2, 3, 4) and previous is not None:
                    maximum_slide = max(maximum_slide, math.dist(point, previous))
                previous = point
            lift_px = (max(heights) - min(heights)) * PPU * .5
            require(lift_px >= 4, f'foot {side} lift {lift_px}px')
            lifts.append(lift_px)
        require(0 < max(math.dist(a, b) for a, b in zip(anchors, anchors[1:])),
                'walk has no head bob')
        forward = rig.matrix_world.to_3x3() @ Vector((0, -1, 0))
        origin = project(Vector((0, 0, 0)))
        actual = project(forward)
        angle = math.radians(direction * 45)
        expected = (120 * math.sin(angle), 120 * math.cos(angle) * math.sqrt(3) / 2)
        require(math.dist([actual[i] - origin[i] for i in range(2)], expected) < .01, 'direction order')
    require(maximum_slide < .5, f'foot slide {maximum_slide}px')
    require(0 < maximum_jump <= 6, f'anchor jump {maximum_jump}px')
    return dict(heightTiles=height, maxFootSlidePx=maximum_slide,
                maxAnchorJumpPx=maximum_jump, minFootLiftPx=min(lifts))


def pixels(path):
    image = bpy.data.images.load(str(path), check_existing=False)
    data = array('f', [0]) * (SIZE * SIZE * 4)
    image.pixels.foreach_get(data)
    bpy.data.images.remove(image)
    return data


def validate(path, allow_empty=False):
    data = pixels(path)
    alpha = data[3::4]
    if 'mask' in path.stem:
        require(max(alpha) >= .99, f'mask coverage below .99: {path.name}')
    occupied = [i for i, a in enumerate(alpha) if a > 1 / 255]
    require(allow_empty or len(occupied) > 16, f'empty frame {path.name}')
    if occupied:
        xs = [i % SIZE for i in occupied]
        ys = [i // SIZE for i in occupied]
        require(min(xs) >= 2 and max(xs) <= SIZE - 3 and min(ys) >= 2 and max(ys) <= SIZE - 3,
                f'clipped frame {path.name}')
        require(max(alpha) - min(alpha) > .1, f'uniform frame {path.name}')
    return data, hashlib.sha256(bytes(round(max(0, min(1, v)) * 255) for v in data)).hexdigest()


def bake_contact_shadow(path):
    # Analytic soft contact disk on Z=0, radius .35 × height (0.525 tiles), alpha <= .30.
    # Written into the sprite at build time; no runtime lighting or blur.
    image = bpy.data.images.load(str(path), check_existing=False)
    data = array('f', [0]) * (SIZE * SIZE * 4)
    image.pixels.foreach_get(data)
    cx, top = project(Vector((0, 0, 0)))
    cy = SIZE - top
    for y in range(SIZE):
        for x in range(SIZE):
            r2 = ((x + .5 - cx) / (PPU * .35 * P['height'])) ** 2 + ((y + .5 - cy) / (PPU * .35 * P['height'] * math.sqrt(3) / 2)) ** 2
            if r2 >= 1:
                continue
            shadow = .30 * (1 - r2) ** 3
            i = (y * SIZE + x) * 4
            old = data[i + 3]
            alpha = old + shadow * (1 - old)
            for c in range(3):
                data[i + c] *= old / alpha
            data[i + 3] = alpha
    image.pixels.foreach_set(data)
    image.filepath_raw = str(path)
    image.save()
    bpy.data.images.remove(image)


def render_frame(path):
    started = time.perf_counter()
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    pre_shadow_alpha = pixels(path)[3::4]
    if path.stem == 'reference' or (not path.stem.startswith('head-') and not path.stem.endswith('-mask')):
        bake_contact_shadow(path)
    category = ('reference' if path.stem == 'reference' else
                'headAndMasks' if path.stem.startswith('head-') else 'bodyAndMasks')
    TIMINGS[category] += time.perf_counter() - started
    return pre_shadow_alpha


def check_mask(mask_pixels, surface_alpha, label):
    spill = [m - a for m, a in zip(mask_pixels[3::4], surface_alpha)]
    require(max(spill) <= MASK_EDGE_TOLERANCE, f'mask outside {label}')
    require(sum(value > 4 / 255 for value in spill) <= 8,
            f'more than 8 mask pixels exceed {label} by 4/255')


def mask(path, meshes, tint, floor):
    # Keep all meshes as depth occluders. Black emission becomes transparent below.
    materials = [(o, list(o.data.materials)) for o in meshes]
    for obj, _ in materials:
        mat = bpy.data.materials.new('mask-emission')
        if mat.node_tree is None:  # Compatibility with Blender before 5.2.
            mat.use_nodes = True
        nodes = mat.node_tree.nodes
        nodes.clear()
        output = nodes.new('ShaderNodeOutputMaterial')
        emission = nodes.new('ShaderNodeEmission')
        emission.inputs[0].default_value = (1, 1, 1, 1) if obj in tint else (0, 0, 0, 1)
        mat.node_tree.links.new(emission.outputs[0], output.inputs['Surface'])
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    floor.hide_render = True
    settings = bpy.context.scene.view_settings
    previous = (settings.view_transform, settings.look)
    settings.view_transform = 'Standard'
    settings.look = 'None'
    try:
        render_frame(path)
    finally:
        settings.view_transform, settings.look = previous
    image = bpy.data.images.load(str(path), check_existing=False)
    data = array('f', [0]) * (SIZE * SIZE * 4)
    image.pixels.foreach_get(data)
    for i in range(0, len(data), 4):
        coverage = data[i] * data[i + 3]
        data[i:i+4] = array('f', (1, 1, 1, coverage))
    image.pixels.foreach_set(data)
    image.filepath_raw = str(path)
    image.save()
    bpy.data.images.remove(image)
    for obj, originals in materials:
        obj.data.materials.clear()
        for mat in originals:
            obj.data.materials.append(mat)


def compare(body, head, reference, shift):
    # Anchors use top-left coordinates; Blender pixels use bottom-left coordinates.
    dx, dy = round(shift[0]), -round(shift[1])
    composed = set()
    expected = set()
    for y in range(SIZE):
        for x in range(SIZE):
            i = y * SIZE + x
            hx, hy = x - dx, y - dy
            ha = head[(hy * SIZE + hx) * 4 + 3] if 0 <= hx < SIZE and 0 <= hy < SIZE else 0
            bi = i * 4
            if (body[bi + 3] > .99 and max(body[bi:bi + 3]) < .08
                    and max(abs(body[bi + c] - reference[bi + c]) for c in range(3)) > .08):
                require(ha >= .99, f'uncovered dark cavity at {x},{y}')
            a = ha + body[i * 4 + 3] * (1 - ha)
            if a > .1:
                composed.add((x, y))
            if reference[i * 4 + 3] > .1:
                expected.add((x, y))
    iou = len(composed & expected) / max(1, len(composed | expected))
    require(iou >= .95, f'head composition IoU {iou}')
    # Every silhouette pixel must be within two pixels in both directions.
    for source, target in [(composed, expected), (expected, composed)]:
        require(all(any((x+dx, y+dy) in target for dx in range(-2, 3) for dy in range(-2, 3)
                        if dx*dx + dy*dy <= 4) for x, y in source), 'composition ink exceeds 2px')
    return iou


def crop_frames(stage, records):
    """Smallest shared square containing every alpha > 1/255 plus 2px per edge."""
    global SIZE
    old_size = SIZE
    paths = sorted(stage.glob('*.png'))
    xmin = ymin = SIZE
    xmax = ymax = -1
    for path in paths:
        data = pixels(path)
        for i, alpha in enumerate(data[3::4]):
            if alpha > 1 / 255:
                x, y = i % SIZE, i // SIZE
                xmin, xmax = min(xmin, x), max(xmax, x)
                ymin, ymax = min(ymin, y), max(ymax, y)
    size = max(xmax - xmin + 1, ymax - ymin + 1) + 4
    require(size <= old_size, 'staging canvas too small')
    left = max(0, min(xmin - 2, old_size - size))
    bottom = max(0, min(ymin - 2, old_size - size))
    top = old_size - bottom - size
    for path in paths:
        image = bpy.data.images.load(str(path), check_existing=False)
        data = array('f', [0]) * (old_size * old_size * 4)
        image.pixels.foreach_get(data)
        cropped = array('f')
        for y in range(bottom, bottom + size):
            start = (y * old_size + left) * 4
            cropped.extend(data[start:start + size * 4])
        image.scale(size, size)
        image.pixels.foreach_set(cropped)
        image.filepath_raw = str(path)
        image.save()
        bpy.data.images.remove(image)
    SIZE = size
    for record in records:
        record['anchor'] = [record['anchor'][0] - left, record['anchor'][1] - top]
    return {path.name: validate(path, allow_empty='mask' in path.stem)[1] for path in paths}


def update_anchors(data, records):
    group = next(g for g in data['sets'] if g['id'] == 'tabao-rush-cook-spike')
    frames = {f['id']: f for f in group['frames']}
    expected = {}
    for record in records:
        anchor = [round(v, 3) for v in record['anchor']]
        for ident in (record['id'], Path(record['mask']).stem):
            require(ident in frames, f'packing config has no frame {ident}')
            expected[ident] = anchor
    require(set(expected) == set(frames), 'packing/render frame coverage differs')
    for ident, anchor in expected.items():
        frames[ident]['anchor'] = anchor
    require(all(frames[i]['anchor'] == a for i, a in expected.items()), 'anchor drift')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, default=Path('assets/src/tabao-rush/cook-spike'))
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    started = time.perf_counter()
    rig, actions, body, head, tint, floor = build()
    checks = rig_checks(rig, actions, body, head)
    # Exercise metadata coverage even without pixels; never write during the dry run.
    preflight = []
    for direction in range(8):
        pose(rig, actions, 'idle', 0, direction)
        preflight.append(dict(id=f'head-{direction}', anchor=socket(rig),
                              mask=f'head-mask-{direction}.png'))
        for action, count in COUNTS.items():
            for frame in range(count):
                pose(rig, actions, action, frame, direction)
                ident = f'{action}-{direction}-{frame}'
                preflight.append(dict(id=ident, anchor=socket(rig), mask=f'{ident}-mask.png'))
    update_anchors(json.loads(CONFIG.read_text()), preflight)
    if args.check_only:
        report = json.loads((args.out / 'render-validation.json').read_text())
        global SIZE
        SIZE = report['frameSize'][0]
        for record in report['frames']:
            surface, _ = validate(args.out / record['file'])
            colour_mask, _ = validate(args.out / record['mask'], allow_empty=True)
            if record['id'].startswith('head-'):
                check_mask(colour_mask, surface[3::4], record['id'])
        checks['bodyMaskContainment'] = 'SKIPPED: existing frames lack pre-shadow body alpha; no rendering in check-only'
        checks['existingFramesChecked'] = len(report['frames']) * 2
        print(json.dumps(checks, sort_keys=True))
        return
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.cook-', dir=args.out.parent) as folder:
        stage = Path(folder)
        records, hashes, head_data, head_anchors = [], {}, {}, {}
        for direction in range(8):
            pose(rig, actions, 'idle', 0, direction)
            head_anchors[direction] = socket(rig)
            for obj in body:
                obj.hide_render = True
            floor.hide_render = True
            path = stage / f'head-{direction}.png'
            render_frame(path)
            head_data[direction], hashes[path.name] = validate(path)
            mask_path = stage / f'head-mask-{direction}.png'
            mask(mask_path, body + head, tint, floor)
            head_mask, hashes[mask_path.name] = validate(mask_path, allow_empty=True)
            # Separate renders sample edges differently; a lone edge pixel differs by a few levels
            # (8/255 measured), while a real spill is far larger.
            check_mask(head_mask, head_data[direction][3::4], 'head')
            records.append(dict(id=f'head-{direction}', anchor=head_anchors[direction],
                                file=path.name, mask=mask_path.name))
            for obj in body:
                obj.hide_render = False
        for action, count in COUNTS.items():
            for direction in range(8):
                for frame in range(count):
                    pose(rig, actions, action, frame, direction)
                    ident = f'{action}-{direction}-{frame}'
                    anchor = socket(rig)
                    for obj in head:
                        obj.visible_camera = False
                    floor.hide_render = False
                    path = stage / f'{ident}.png'
                    pre_shadow_alpha = render_frame(path)
                    body_pixels, hashes[path.name] = validate(path)
                    mp = stage / f'{ident}-mask.png'
                    for obj in head:
                        obj.hide_render = True
                    mask(mp, body + head, tint, floor)
                    mask_pixels, hashes[mp.name] = validate(mp, allow_empty=True)
                    check_mask(mask_pixels, pre_shadow_alpha, ident)
                    for obj in head:
                        obj.hide_render = False
                        obj.visible_camera = True
                    floor.hide_render = False
                    reference = stage / 'reference.png'
                    render_frame(reference)
                    ref, _ = validate(reference)
                    iou = compare(body_pixels, head_data[direction], ref,
                                  [anchor[i] - head_anchors[direction][i] for i in range(2)])
                    records.append(dict(id=ident, anchor=anchor, file=path.name, mask=mp.name, compositionIoU=iou))
        (stage / 'reference.png').unlink()
        hashes = crop_frames(stage, records)
        report = dict(nominalHeightTiles=P['height'], frameSizing='minimum shared alpha bounds plus 2px per edge', requirements=['NN-4', 'TR-060', 'PERF-023', 'PERF-024'], frameSize=[SIZE, SIZE],
                      pixelsPerTile=PPU, directionOrder=DIRECTIONS, strideTiles=STRIDE,
                      walkFpsAtThreeTilesPerSecond=8*3/STRIDE,
                      secondsPerCharacter=TIMINGS['bodyAndMasks'] + TIMINGS['headAndMasks'],
                      totalSecondsIncludingValidation=time.perf_counter()-started,
                      renderSeconds=TIMINGS, checks=checks, frames=records,
                      decodedPixelSHA256=hashes)
        (stage / 'render-validation.json').write_text(json.dumps(report, indent=2) + '\n')
        # Resolve repository config exactly as pipeline.py does, independent of cwd.
        config = CONFIG
        data = json.loads(config.read_text())
        update_anchors(data, records)
        backup = args.out.with_name(args.out.name + '.previous')
        require(not backup.exists(), f'backup already exists: {backup}')
        if args.out.exists():
            args.out.rename(backup)
        try:
            shutil.move(str(stage), str(args.out))
        except Exception:
            if backup.exists():
                backup.rename(args.out)
            raise
        # Publish metadata only after frames successfully publish. Touch all outputs
        # afterwards because pipeline.json is a render input.
        config.write_text(json.dumps(data, indent=2) + '\n')
        for output in args.out.iterdir():
            output.touch()
        if backup.exists():
            shutil.rmtree(backup)
        print(json.dumps(report, sort_keys=True))


if __name__ == '__main__':
    main()
