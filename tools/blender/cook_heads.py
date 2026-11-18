"""A-03 / TR-064 / TR-061: head-only build, validation and render entry point.

Reuse the unchanged cap renderer's rig/render helpers. Only the seven new head
jobs import this module; body and cap stamps do not depend on it.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from cook import *
from cook import validate as validate_nonempty
from cook import mask as mask_shared
import cook_heads_contract as C


def validate(path, allow_empty=False):
    # Only cap carries head tint; the bun ribbon is enclosed in hair.
    # All seven new head masks are empty in every facing.
    # Keep the legacy renderer (and its published body/cap stamps) unchanged.
    if allow_empty and path.stem.endswith('-mask'):
        data = pixels(path)
        if all(alpha == 0 for alpha in data[3::4]):
            return data, hashlib.sha256(bytes(round(max(0, min(1, v)) * 255)
                                             for v in data)).hexdigest()
    if path.stem.endswith('-mask'):
        data = pixels(path)
        alpha = data[3::4]
        nonzero = [i for i, a in enumerate(alpha) if a != 0]
        bbox = (min(i % SIZE for i in nonzero), min(i // SIZE for i in nonzero),
                max(i % SIZE for i in nonzero), max(i // SIZE for i in nonzero)) if nonzero else None
        require(max(alpha) >= .99,
                f'mask coverage below .99: {path.name}; max alpha={max(alpha):.9g}; '
                f'non-zero pixels={len(nonzero)}; bbox={bbox} (bottom-left, inclusive)')
    # Even a faint nonzero mask must still meet the .99 coverage requirement.
    return validate_nonempty(path, allow_empty=allow_empty)


def mask(path, meshes, tint, floor):
    # The shared pass reads coverage back from an intermediate PNG. Dithering
    # perturbs even exact black into positive RGB; denoising can spread white
    # across occluders. Neither belongs in a coverage pass. Preserve all colour
    # sprite settings and the legacy body/cap renderer byte-for-byte.
    scene = bpy.context.scene
    previous = (scene.render.dither_intensity, scene.cycles.use_denoising)
    scene.render.dither_intensity = 0
    scene.cycles.use_denoising = False
    try:
        mask_shared(path, meshes, tint, floor)
    finally:
        scene.render.dither_intensity, scene.cycles.use_denoising = previous


# TR-061: D-142 round-5 choices, applied only to the new head jobs.
BUN_RADIUS = .45
BUN_HEIGHT = 1.35
SPECS_HAIR_COLOUR = '#997C63'  # TR-061: muted brown, separated from black/grey/kopi.
TURBAN_COLOUR = '#6B4426'  # DESIGN §4.2 console kopi brown, outside PLAYER_COLOURS.


def polish_head(character, meshes):
    hr = P['head_r']
    hz = TOP + hr * P['sink']
    if character == 'bun':
        bun = next(o for o in meshes if abs(o.location.z-(hz+hr*.98)) < 1e-6)
        bun.scale = (hr*BUN_RADIUS,) * 3
        bun.location.z = hz + hr*BUN_HEIGHT
        # Leave the ribbon enclosed at its board-1 location.
    elif character == 'specs':
        # Replace only the authored hair material; keep skin and black specs.
        for obj in meshes:
            material = obj.data.materials[0]
            colour = material.node_tree.nodes['Principled BSDF'].inputs['Base Color']
            if all(abs(a-b) < 1e-6 for a, b in zip(colour.default_value[:3], K.hexc('#1F1A17'))):
                obj.data.materials[0] = K.mat(SPECS_HAIR_COLOUR, 'hair')
    elif character == 'turban':
        for obj in meshes:
            material = obj.data.materials[0]
            colour = material.node_tree.nodes['Principled BSDF'].inputs['Base Color']
            if all(abs(a-b) < 1e-6 for a, b in zip(colour.default_value[:3], K.hexc('#2F5FA8'))):
                obj.data.materials[0] = K.mat(TURBAN_COLOUR, 'cloth')
    elif character in ('makcik', 'uncle'):
        # Round the cut boundary before adding shell thickness. This smooths
        # tudung opening corners/chips and the uncle side-hair termination.
        shell = next(o for o in meshes if abs(o.location.z-hz) < 1e-6
                     and any(m.type == 'SOLIDIFY' for m in o.modifiers))
        smooth = shell.modifiers.new('rounded-head-opening', 'SUBSURF')
        smooth.levels = smooth.render_levels = 2
        shell.modifiers.move(len(shell.modifiers)-1, 0)


def build(character='cap'):
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
        root = K.cook('matte', character, same_body=True, apron='#FFFFFF')
    finally:
        K._fin = finish
    polish_head(character, created)
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


def rig_checks(rig, actions, body, head, action, character='cap'):
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
    limits = ((1.53, 1.565) if character == 'cap' else
              (1.45, 1.90) if character == 'bun' else (1.45, 1.8))
    require(P['height'] == 1.5 and limits[0] <= height <= limits[1], f'D-044 mesh height {height}')
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


def main():
    parser = argparse.ArgumentParser()
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument('--action', choices=list(C.ACTIONS))
    selection.add_argument('--heads', action='store_true')
    parser.add_argument('--character', choices=C.HEADS, default='cap')
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    out = (SOURCE/args.out).resolve()
    require(out.is_relative_to(SOURCE) and out != SOURCE, 'output outside source')
    folder = out.relative_to(SOURCE).as_posix()
    started = time.perf_counter()
    require(args.heads or args.character == 'cap', 'body jobs use cap reference')
    rig, actions, body, head, tint, floor = build(args.character)
    selected = args.action or 'idle'
    checks = rig_checks(rig, actions, body, head, selected, args.character)
    setup = time.perf_counter()-started
    if args.check_only:
        report = json.loads((out/'render-validation.json').read_text())
        records = json.loads((out/'frames.json').read_text())
        require(records == report['frames'], 'published frame metadata differs')
        expected = C.head_ids(args.character) if args.heads else C.frame_ids(selected)
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
            ident = 'head-'+args.character+'-'+name
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
        report = dict(action=args.character if args.heads else selected,
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
