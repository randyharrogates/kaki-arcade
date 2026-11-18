"""A-02 / TR-060 / NN-4: staged cook action and registered cap-head renders."""
import argparse
from array import array
import hashlib
import json
import math
import os
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
import cook_poses as C

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/src'

# D-044 board 1C uses this height in vision_scenes.py.
K.PROPS['toy']['height'] = 1.5
P = K.PROPS['toy']
HIP = .07 + P['leg']
TORSO = HIP + P['rz'] * .82
TOP = TORSO + P['rz']
# Fixed full-resolution canvas for every action and head.
SIZE = 256
PPU = 120
SCALE = P['height'] / (TOP + P['head_r'] * (P['sink'] + P['squash']))
SOCKET = Vector((0, 0, TOP)) * SCALE
DIRECTIONS = C.DIRECTIONS
COUNTS = {a: v['count'] for a, v in C.ACTIONS.items()}
PROPS = {}
HANDS = {}
NOZZLE = None
TIMINGS = {'bodyAndMasks': 0.0, 'headAndMasks': 0.0, 'reference': 0.0}
MASK_EDGE_TOLERANCE = 16 / 255
STRIDE = C.STRIDE_TILES


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
            for name, (location, rotation, scale) in C.sample(action, frame).items():
                bone = rig.pose.bones[name]
                bone.location = bone.bone.matrix_local.to_3x3().inverted() @ Vector(location)
                bone.rotation_euler = rotation
                bone.scale = scale
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
    rig.animation_data.action = actions['idle']
    rig.animation_data.action_slot = actions['idle'].slots[0]
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    # Use exactly kalib's resting hand centres, preserving world transforms when
    # attaching to the arm bones. Props follow the same right-hand transform.
    for side, sign in (('l', -1), ('r', 1)):
        shoulder = Vector((sign*P['rx']*.9, 0, TORSO+P['rz']*.40))
        delta = Vector((sign*.38, 0, -1)).normalized()*P['arm']
        hand = bpy.data.objects.new('hand_'+side, None)
        bpy.context.scene.collection.objects.link(hand)
        hand.location = (shoulder+delta*1.12)*SCALE
        bpy.context.view_layer.update()
        attach(hand, rig, 'arm_'+side)
        HANDS[side] = hand
    make_props(rig, body)
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


def attach(obj, rig, bone):
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = 'BONE'
    obj.parent_bone = bone
    obj.matrix_world = world


def make_props(rig, body):
    global NOZZLE
    root = K.new_root('tools')
    steel, wood, red = K.mat('#9DABA9'), K.mat('#77513A'), K.mat('#B84432')
    hand = HANDS['r'].matrix_world.translation
    groups = {}
    for name in ('knife', 'spatula', 'extinguisher'):
        before = set(bpy.data.objects)
        if name == 'extinguisher':
            K.ball(root, hand+Vector((0, -.03, -.10)), .095, red, (1, 1, 1.7))
            K.limb(root, hand+Vector((0, 0, .04)), hand+Vector((0, -.17, .04)), .025, .022, steel)
        else:
            # A single bevelled handle avoids the two dark spherical end caps
            # of K.limb clustering around the raised knife hand.
            K.rbox(root, hand+Vector((0, -.065, 0)), (.04, .13, .04), wood, .008)
            K.rbox(root, hand+Vector((0, -.21, 0)),
                   (.10 if name == 'spatula' else .045, .16, .025), steel, .008)
        bpy.context.view_layer.update()
        groups[name] = [o for o in set(bpy.data.objects)-before if o.type == 'MESH']
        for obj in groups[name]:
            attach(obj, rig, 'arm_r')
            obj['cook_prop'] = name
            body.append(obj)
    bpy.context.view_layer.update()
    NOZZLE = bpy.data.objects.new('nozzle', None)
    bpy.context.scene.collection.objects.link(NOZZLE)
    NOZZLE.location = hand+Vector((0, -.17, .04))
    bpy.context.view_layer.update()
    attach(NOZZLE, rig, 'arm_r')
    PROPS.update(groups)
    bpy.data.objects.remove(root, do_unlink=True)


def visible_props(action):
    for name, objects in PROPS.items():
        for obj in objects:
            obj.hide_render = name not in C.PROPS.get(action, [])


def empty_world(obj):
    return obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).matrix_world.translation.copy()


def frame_record(rig, ident, folder, heads=False):
    head = socket(rig)
    anchors = {'head': head}
    result = dict(id=ident, file=folder+'/'+ident+'.png', anchor=head, anchors=anchors)
    if not heads:
        hands = (empty_world(HANDS['r']) if ident.startswith('throw-') else
                 (empty_world(HANDS['l'])+empty_world(HANDS['r']))/2)
        anchors.update(root=project(Vector((0, 0, 0))),
                       hands=project(hands),
                       throwHand=project(empty_world(HANDS['r'])))
        camera = bpy.context.scene.camera.matrix_world.inverted()
        result['handsInFront'] = (camera @ hands).z > (camera @ bone_world(rig, 'spine')).z
        if ident.startswith('extinguish-'):
            anchors['nozzle'] = project(empty_world(NOZZLE))
    return result


def rig_checks(rig, actions, body, head, action):
    require(set(actions) == set(C.ACTIONS) and len(rig.data.bones) == 8, 'rig/actions')
    require(body and head and all(o.parent == rig and len(o.data.vertices) > 0
                                for o in body+head), 'mesh parenting/geometry')
    require(all(h.parent == rig and h.parent_bone == 'arm_'+side
                for side, h in HANDS.items()), 'hand parenting')
    pose(rig, actions, 'idle', 0, 0)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    heights = [(o.evaluated_get(depsgraph).matrix_world @ Vector(c)).z
               for o in body+head if 'cook_prop' not in o for c in o.bound_box]
    height = max(heights)-min(heights)
    require(P['height'] == 1.5 and 1.53 <= height <= 1.565, f'D-044 mesh height {height}')
    maximum_slide = maximum_jump = 0.
    lifts = []
    count = COUNTS[action]
    for direction in range(8):
        anchors, feet = [], {'l': [], 'r': []}
        for frame in range(count):
            pose(rig, actions, action, frame, direction)
            visible_props(action)
            anchors.append(socket(rig))
            for side in feet:
                feet[side].append(bone_world(rig, 'leg_'+side))
            for obj in body+head:
                if obj.hide_render:
                    continue
                evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
                for corner in evaluated.bound_box:
                    point = project(evaluated.matrix_world @ Vector(corner))
                    require(all(math.isfinite(v) and 2 <= v <= SIZE-3 for v in point),
                            f'geometry outside canvas: {action}/{direction}/{frame}/{obj.name}')
        pairs = list(zip(anchors, anchors[1:]))
        if C.ACTIONS[action]['loop']:
            pairs.append((anchors[-1], anchors[0]))
        maximum_jump = max(maximum_jump, *(math.dist(a, b) for a, b in pairs))
        if action == 'idle':
            require(all(math.dist(anchors[0], a) < 5 for a in anchors), 'idle breath exceeds 5px')
        moving = action in ('walk', 'carry-walk')
        for side, offset in (('l', 0), ('r', 4)):
            points = feet[side]
            if moving:
                lifts.append((max(p.z for p in points)-min(p.z for p in points))*PPU*.5)
                require(lifts[-1] >= 4, f'{side} lift {lifts[-1]}px')
                for f in range(count):
                    if (f+offset)%8 >= C.STANCE_FRAMES-1:
                        continue
                    a, b = points[f].copy(), points[(f+1)%count].copy()
                    travel = rig.matrix_world.to_3x3() @ Vector((0, -STRIDE/8, 0))
                    maximum_slide = max(maximum_slide, math.dist(project(a), project(b+travel)))
            else:
                maximum_slide = max(maximum_slide, *(math.dist(project(points[0]), project(p)) for p in points))
        forward = rig.matrix_world.to_3x3() @ Vector((0, -1, 0))
        origin, actual = project(Vector((0, 0, 0))), project(forward)
        angle = math.radians(direction*45)
        expected = (PPU*math.sin(angle), PPU*math.cos(angle)*math.sqrt(3)/2)
        require(math.dist([actual[i]-origin[i] for i in range(2)], expected) < .01, 'direction order')
    require(maximum_slide < .5, f'foot slide {maximum_slide}px')
    require(maximum_jump <= 6, f'anchor jump {maximum_jump}px')
    return dict(heightTiles=height, maxFootSlidePx=maximum_slide,
                maxAnchorJumpPx=maximum_jump, minFootLiftPx=min(lifts) if lifts else 0)


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


def publish(stage, out):
    backup = out.with_name(out.name+'.previous')
    require(not backup.exists(), f'backup already exists: {backup}')
    if out.exists():
        out.rename(backup)
    try:
        stage.rename(out)
    except BaseException:
        if backup.exists():
            backup.rename(out)
        raise
    if backup.exists():
        shutil.rmtree(backup)


def main():
    parser = argparse.ArgumentParser()
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument('--action', choices=list(C.ACTIONS))
    selection.add_argument('--heads', action='store_true')
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    out = (SOURCE/args.out).resolve()
    require(out.is_relative_to(SOURCE) and out != SOURCE, 'output outside source')
    folder = out.relative_to(SOURCE).as_posix()
    started = time.perf_counter()
    rig, actions, body, head, tint, floor = build()
    selected = args.action or 'idle'
    checks = rig_checks(rig, actions, body, head, selected)
    setup = time.perf_counter()-started
    if args.check_only:
        report = json.loads((out/'render-validation.json').read_text())
        records = json.loads((out/'frames.json').read_text())
        require(records == report['frames'], 'published frame metadata differs')
        expected = C.head_ids() if args.heads else C.frame_ids(selected)
        require([r['id'] for r in records] == expected, 'published frame coverage differs')
        for record in records:
            path = out/(record['id']+'.png')
            _, digest = validate(path, allow_empty=record['id'].endswith('-mask'))
            require(digest == report['decodedPixelSHA256'][path.name], 'decoded hash differs')
            require(record['anchor'] == record['anchors']['head'], 'head anchor differs')
        print(json.dumps(checks, sort_keys=True))
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.cook-', dir=out.parent) as temp:
        stage = Path(temp)/'publish'
        stage.mkdir()
        scratch = Path(temp)/'heads'
        scratch.mkdir()
        records, hashes, head_data, head_anchors = [], {}, {}, {}
        for direction, name in enumerate(DIRECTIONS):
            pose(rig, actions, 'idle', 0, direction)
            visible_props('idle')
            head_anchors[direction] = socket(rig)
            for obj in body:
                obj.hide_render = True
            floor.hide_render = True
            ident = 'head-cap-'+name
            path = (stage if args.heads else scratch)/(ident+'.png')
            render_frame(path)
            head_data[direction], digest = validate(path)
            mp = path.with_name(ident+'-mask.png')
            mask(mp, body+head, tint, floor)
            mask_pixels, mask_digest = validate(mp, allow_empty=True)
            check_mask(mask_pixels, head_data[direction][3::4], ident)
            if args.heads:
                hashes[path.name], hashes[mp.name] = digest, mask_digest
                for suffix in ('', '-mask'):
                    records.append(frame_record(rig, ident+suffix, folder, heads=True))
            for obj in body:
                obj.hide_render = False
        if not args.heads:
            for direction, name in enumerate(DIRECTIONS):
                for frame in range(COUNTS[selected]):
                    pose(rig, actions, selected, frame, direction)
                    visible_props(selected)
                    ident = f'{selected}-{name}-{frame}'
                    for obj in head:
                        obj.visible_camera = False
                    floor.hide_render = False
                    path = stage/(ident+'.png')
                    pre_shadow_alpha = render_frame(path)
                    body_pixels, hashes[path.name] = validate(path)
                    mp = stage/(ident+'-mask.png')
                    for obj in head:
                        obj.hide_render = True
                    mask(mp, body+head, tint, floor)
                    mask_pixels, hashes[mp.name] = validate(mp, allow_empty=True)
                    check_mask(mask_pixels, pre_shadow_alpha, ident)
                    for obj in head:
                        obj.hide_render = False
                        obj.visible_camera = True
                    floor.hide_render = False
                    reference = Path(temp)/'reference.png'
                    render_frame(reference)
                    ref, _ = validate(reference)
                    anchor = socket(rig)
                    iou = compare(body_pixels, head_data[direction], ref,
                                  [anchor[i]-head_anchors[direction][i] for i in range(2)])
                    for suffix in ('', '-mask'):
                        record = frame_record(rig, ident+suffix, folder)
                        record['compositionIoU'] = iou
                        records.append(record)
        spec = dict(count=1, fps=1, loop=True) if args.heads else C.ACTIONS[selected]
        elapsed = time.perf_counter()-started
        report = dict(action='cap' if args.heads else selected,
                      **dict(spec, strideTiles=spec.get('strideTiles')), frameSize=[SIZE, SIZE],
                      pixelsPerTile=PPU, directionOrder=DIRECTIONS, checks=checks,
                      frames=records, decodedPixelSHA256=hashes, setupSeconds=setup,
                      secondsPerFrame=(elapsed-setup)/len(records), totalSeconds=elapsed)
        (stage/'frames.json').write_text(json.dumps(records, indent=2)+'\n')
        (stage/'render-validation.json').write_text(json.dumps(report, indent=2)+'\n')
        publish(stage, out)
        print(json.dumps(report, sort_keys=True))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        import traceback
        traceback.print_exc()
        sys.stdout.flush(); sys.stderr.flush()
        os._exit(1)
