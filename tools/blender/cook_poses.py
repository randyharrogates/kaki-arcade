"""TR-060 / NN-4: Blender-free cook choreography and render contract.

Channels are (world-axis tile location, bone-local XYZ radians, scale).
Forward is negative Y. Each step has three planted samples and one flight sample.
"""
import math

DIRECTIONS = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw']
PPU = 120
WALK_SPEED_TILES = 3
STRIDE_TILES = .72
STANCE_FRAMES = 3
ACTIONS = {
    'idle': dict(count=4, fps=4, loop=True),
    'walk': dict(count=8, fps=8*WALK_SPEED_TILES/STRIDE_TILES, loop=True, strideTiles=STRIDE_TILES),
    'carry-walk': dict(count=8, fps=8*WALK_SPEED_TILES/STRIDE_TILES, loop=True, strideTiles=STRIDE_TILES),
    'chop': dict(count=6, fps=10, loop=True),
    'stir': dict(count=8, fps=10, loop=True),
    'wash': dict(count=6, fps=8, loop=True),
    'serve': dict(count=6, fps=12, loop=False, releaseFrame=3),
    'throw': dict(count=6, fps=12, loop=False, releaseFrame=3),
    'extinguish': dict(count=4, fps=8, loop=True),
}
PROPS = {'chop': ['knife'], 'stir': ['spatula'], 'extinguish': ['extinguisher']}
BONES = ('hips', 'spine', 'leg_l', 'leg_r', 'arm_l', 'arm_r', 'head', 'head_socket')
ZERO = (0., 0., 0.)
ONE = (1., 1., 1.)
REST = {bone: (ZERO, ZERO, ONE) for bone in BONES}
# Arms rotate forward around their local X axis (bones point along world Z).
CARRY = dict(REST, arm_l=(ZERO, (-.45, 0., 1.40), ONE),
             arm_r=(ZERO, (-.45, 0., -1.40), ONE))


def changed(base=REST, **rotations):
    return dict(base, **{bone: (base[bone][0], value, base[bone][2])
                         for bone, value in rotations.items()})


# MAIN = (bone, channel index, component index). Anticipation is the first
# displacement from the initial pose; the second displacement is the main move.
MAIN = {a: ('arm_r', 1, 0) for a in ('serve', 'throw')}


def work_pose(left=(-.85, 0., 1.05), right=(-.85, 0., -1.05),
              twist=0., lean=0., dip=0.):
    """Rigid arms pivot at fixed shoulders; only the spine leans and twists."""
    pose = changed(arm_l=left, arm_r=right, spine=(lean, twist, 0.))
    pose['hips'] = ((0., 0., -dip), ZERO, ONE)
    for side in ('l', 'r'):
        pose['leg_'+side] = ((0., 0., dip), ZERO, ONE)
    return pose


def chop_pose(raise_hand=False):
    """Fixed torso; outward/up shoulder reach and rigid knife-arm arc (TR-060).

    The toy rig has one arm bone, so shoulder, elbow mesh and wrist move
    together without changing limb length. The <=.22-tile shoulder excursion
    supplies reach independently of the head; the supporting hand stays put.
    """
    spine = (.308530, .436, .257304)
    if raise_hand:
        arm = (4.195185, -.241275, -.918249)
        # Keep the sleeve sphere overlapping the torso; rotation supplies
        # the raised wrist instead of translating the whole arm away.
        shoulder = (.065, .019855, .025)
    else:
        arm, shoulder = (2.677454, 0., -1.360655), ZERO
    pose = work_pose(right=arm)
    pose['arm_r'] = (shoulder, arm, ONE)
    pose['spine'] = (ZERO, spine, ONE)
    return pose


WORK_ACTIONS = ('chop', 'stir', 'wash', 'extinguish')
KEYS = {
    # Breath lifts the chest and shoulders, with a small sideways weight shift.
    'idle': [(0, REST), (2, dict(changed(arm_l=(-.10, 0., .08),
        arm_r=(-.10, 0., -.08)), spine=((.010, 0., .055), ZERO, ONE))), (4, REST)],
    # Keep anticipation shallow: distribute the socket's forward lean across
    # both reach samples without changing the arm extension or release timing.
    'serve': [(0, CARRY), (1, changed(CARRY, arm_r=(-.25, 0., -1.40),
        arm_l=(-.25, 0., 1.40), spine=(-.025, 0., 0.))),
        (3, work_pose(left=(-1.65, 0., .20), right=(-1.65, 0., -.20), lean=.25)),
        (5, REST)],
    # Wind back/up over the throwing shoulder; release out to the side of the
    # cap, rather than underneath its brim. No channel exceeds its keyed bounds.
    'throw': [(0, CARRY), (1, work_pose(right=(.10, 0., -2.60),
        twist=-.40, lean=-.10)),
        (3, work_pose(right=(-2.20, 0., -1.30), twist=.35, lean=.18)), (5, REST)],
    'chop': [(0, chop_pose()), (1, chop_pose(True)),
             (3, chop_pose()), (6, chop_pose())],
    'stir': [(f, work_pose(left=(-.85, 0., 1.05),
        right=(-1.25+y, 0., x), twist=x*.30))
        for f,x,y in ((0,.65,0.), (2,0.,-.65), (4,-.65,0.),
                      (6,0.,.65), (8,.65,0.))],
    # Three-frame outward/return strokes. A small depth circuit separates
    # the return samples from the outward samples without channel overshoot.
    'wash': [(f, work_pose(left=(-1.15+x*.25, 0., 1.0+x),
        right=(-1.15-x*.25+lean*3, 0., -1.0+x), twist=x*.35, lean=lean))
        for f,x,lean in ((0,-.65,0.),(1,-.313,.04),(2,.313,.04),
                         (3,.65,0.),(4,.313,-.04),(5,-.313,-.04),(6,-.65,0.))],
    # Hold the canister laterally with the throwing hand. The free hand
    # balances the sweep; fixed shoulders cannot support a two-handed side grip.
    'extinguish': [(f, work_pose(left=(-.85, 0., 1.05),
        right=(0., 0., 1.20), twist=math.radians(angle)))
        for f,angle in ((0,-25),(1,0),(2,25),(3,0),(4,-25))],
}


# Pure equivalent of cook.py's fixed orthographic camera and rigid bone rig.
TOY_SCALE = 1.5 / (.07+.16+.30*.82+.30+.36*(.62+.92))
TORSO = (.07+.16+.30*.82)*TOY_SCALE
SHOULDER = TORSO+.30*.40*TOY_SCALE


def rotate(point, angles):
    x,y,z = point
    a,b,c = angles
    y,z = y*math.cos(a)-z*math.sin(a), y*math.sin(a)+z*math.cos(a)
    x,z = x*math.cos(b)+z*math.sin(b), -x*math.sin(b)+z*math.cos(b)
    return (x*math.cos(c)-y*math.sin(c), x*math.sin(c)+y*math.cos(c), z)


def bone_rotate(point, angles):
    # Blender's vertical bones: local X=world X, Y=world Z, Z=world -Y.
    x,y,z = rotate((point[0], point[2], -point[1]), angles)
    return (x,-z,y)


def project(point, direction='s', size=256):
    x,y,z = rotate(point, (0.,0., DIRECTIONS.index(direction)*math.pi/4))
    return (size/2+PPU*x, size/2-PPU*(y*math.sqrt(3)/2+(z-.675)*.5))


def hand_positions(action, frame):
    pose = sample(action, frame)
    result = {}
    for side,sign in (('l',-1),('r',1)):
        shoulder = (sign*.30*.9*TOY_SCALE, 0., SHOULDER)
        length = .24*1.12*TOY_SCALE/math.sqrt(1+.38**2)
        delta = (sign*.38*length, 0., -length)
        loc,rot,_ = pose['arm_'+side]
        delta = bone_rotate(delta, rot)
        point = tuple(a+b+c for a,b,c in zip(shoulder,loc,delta))
        if side == 'r':
            nozzle_delta = bone_rotate((0.,-.17,.04),rot)
            result['nozzle'] = tuple(a+b for a,b in zip(point,nozzle_delta))
        result[side] = point
    for name,point in result.items():
        relative = (point[0],point[1],point[2]-TORSO)
        moved = bone_rotate(relative,pose['spine'][1])
        result[name] = tuple(a+b+c for a,b,c in zip(moved, (0.,0.,TORSO),
                              tuple(a+b for a,b in zip(pose['hips'][0],pose['spine'][0]))))
    result['hands'] = tuple((a+b)/2 for a,b in zip(result['l'],result['r']))
    return result


def head_position(action, frame):
    """Head-socket origin in tiles, matching cook.py's parallel rest bones.

    TOP - TORSO is the toy torso radius (.30 * scale). The head and
    socket share an origin, so their rotations do not move this anchor.
    Today's hips have translation only; the spine supplies lean/twist.
    """
    pose = sample(action, frame)
    offset = bone_rotate((0., 0., .30*TOY_SCALE), pose['spine'][1])
    return tuple(a+b+c for a,b,c in zip(offset, (0., 0., TORSO),
                 tuple(a+b for a,b in zip(pose['hips'][0], pose['spine'][0]))))


def projected_anchors(action, frame, direction):
    return {name: project(point,direction) for name,point in hand_positions(action,frame).items()}


def legs(frame):
    result = dict(REST)
    step = STRIDE_TILES/8
    # Three contact samples at phases 0, 1, 2; both feet fly at 3 and 7.
    for side, offset in (('l', 0), ('r', 4)):
        phase = (frame+offset) % 8
        if phase <= STANCE_FRAMES-1:
            forward, lift = (phase-1)*-step, 0.
        else:
            t = (phase-(STANCE_FRAMES-1))/(8-(STANCE_FRAMES-1))
            forward = -step + 2*step*t
            lift = .15*math.sin(math.pi*t)
        result['leg_'+side] = ((0., -forward, lift), ZERO, ONE)
    bob = .018*max(0., 1-abs(frame % 4-3))
    result['spine'] = ((0., 0., bob), ZERO, ONE)
    return result


def upright_head(pose):
    """Cancel inherited XYZ rotation at the socket, preserving its moving anchor.

    cook.py uses parallel vertical rest bones, parented hips -> spine -> head ->
    head_socket. In their shared local basis XYZ Euler means Rz @ Ry @ Rx.
    Derive the inverse after sampling: interpolating inverse Euler keys alone
    would not in general cancel combined parent rotations.
    """
    basis = [(1., 0., 0.), (0., 1., 0.), (0., 0., 1.)]
    for bone in ('head', 'spine', 'hips'):
        basis = [rotate(axis, pose[bone][1]) for axis in basis]
    # basis columns are the inherited matrix; its transpose is the inverse.
    inverse = basis
    y = math.asin(max(-1., min(1., -inverse[2][0])))
    if abs(math.cos(y)) > 1e-10:
        x = math.atan2(inverse[2][1], inverse[2][2])
        z = math.atan2(inverse[1][0], inverse[0][0])
    else:
        x = math.atan2(-inverse[1][2], inverse[1][1])
        z = 0.
    loc, _, scale = pose['head_socket']
    return dict(pose, head_socket=(loc, (x, y, z), scale))


def sample(action, frame):
    spec = ACTIONS[action]
    frame = frame % spec['count'] if spec['loop'] else min(max(frame, 0), spec['count']-1)
    if action in ('walk', 'carry-walk'):
        result = legs(frame)
        for side, offset in (('l', 0), ('r', 4)):
            result['arm_'+side] = (CARRY if action == 'carry-walk' else
                changed(**{'arm_'+side: (.18*math.cos((frame+offset)*math.tau/8), 0., 0.)}))['arm_'+side]
        return upright_head(result)
    keys = KEYS[action]
    for (a, left), (b, right) in zip(keys, keys[1:]):
        if a <= frame <= b:
            t = (frame-a)/(b-a)
            t = t*t*(3-2*t)
            return upright_head({bone: tuple(tuple(x+(y-x)*t for x, y in zip(l, r))
                                for l, r in zip(left[bone], right[bone])) for bone in BONES})
    return upright_head(dict(keys[-1][1]))


# Gait keys expose every sampled channel for bounds inspection, while the shared
# solver remains authoritative for exact stance compensation.
for _action in ('walk', 'carry-walk'):
    KEYS[_action] = [(f, sample(_action, f)) for f in range(9)]


def frame_ids(action):
    return [f'{action}-{direction}-{frame}{suffix}' for direction in DIRECTIONS
            for frame in range(ACTIONS[action]['count']) for suffix in ('', '-mask')]


def head_ids():
    return [f'head-cap-{direction}{suffix}' for direction in DIRECTIONS for suffix in ('', '-mask')]


def timeout(frames):
    return math.ceil(2.5*(30+2.*frames)/60)*60


def jobs():
    result = []
    for action in ACTIONS:
        folder = 'tabao-rush/cook-body/'+action
        result.append(dict(id='cook-body-'+action, script='cook.py',
            args=['--action', action, '--out', folder], inputs=[],
            extraInputs=['tools/blender/kalib.py', 'tools/blender/cook_poses.py'],
            outputs=[folder+'/'+ident+'.png' for ident in frame_ids(action)]+
                    [folder+'/frames.json', folder+'/render-validation.json'],
            timeoutSeconds=timeout(ACTIONS[action]['count']*len(DIRECTIONS))))
    folder = 'tabao-rush/cook-heads/cap'
    result.append(dict(id='cook-head-cap', script='cook.py', args=['--heads', '--out', folder],
        inputs=[], extraInputs=['tools/blender/kalib.py', 'tools/blender/cook_poses.py'],
        outputs=[folder+'/'+ident+'.png' for ident in head_ids()]+
                [folder+'/frames.json', folder+'/render-validation.json'], timeoutSeconds=120))
    return result


def animations():
    return [dict(action=action+suffix, **{k: v for k, v in spec.items() if k != 'count'},
                 directions={d: [f'{action}-{d}-{n}{suffix}' for n in range(spec['count'])]
                             for d in DIRECTIONS})
            for action, spec in ACTIONS.items() for suffix in ('', '-mask')]


def head_animations():
    return [dict(action='cap'+suffix, fps=1, loop=True,
                 directions={d: [f'head-cap-{d}{suffix}'] for d in DIRECTIONS})
            for suffix in ('', '-mask')]
