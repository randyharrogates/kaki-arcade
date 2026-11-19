"""TR-060 / NN-4 choreography checks, with no Blender imports."""
import math
import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from cook_gait import poses as c


class CookPoseTests(unittest.TestCase):
    def test_non_walk_transforms_match_frozen_baseline(self):
        import json
        import hashlib
        baseline = json.loads((Path(__file__).parent/'fixtures/cook_non_walk_poses.json').read_text())
        for action, samples in baseline.items():
            for i, expected in enumerate(samples):
                self.assertEqual(json.loads(json.dumps(c.sample(action, i/8))),
                                 expected, (action, i/8))
        self.assertEqual(hashlib.sha256(Path(__file__).with_name('cook.py').read_bytes()).hexdigest(),
                         '5a5797d7e85c98caacba7bff2d12c078d90dd73cc14d27f103f37dd11bcf7dd3')

    def test_projected_walk_hand_margin(self):
        for action in ('walk', 'carry-walk'):
            for direction in c.DIRECTIONS:
                for side in ('l', 'r'):
                    points = [c.project(c.hand_positions(action, f)[side], direction)
                              for f in range(c.ACTIONS[action]['count'])]
                    self.assertGreaterEqual(max(math.dist(a,b) for a in points for b in points), 9,
                                            (action, direction, side))

    def test_table(self):
        expected = [('idle',4,4,True), ('walk',8,24/.72,True), ('carry-walk',8,24/.72,True),
                    ('chop',6,10,True), ('stir',8,10,True), ('wash',6,8,True),
                    ('serve',6,12,False), ('throw',6,12,False), ('extinguish',4,8,True)]
        self.assertEqual([(a,s['count'],s['fps'],s['loop']) for a,s in c.ACTIONS.items()], expected)
        self.assertEqual(sum(s['count'] for s in c.ACTIONS.values()),56)
        self.assertEqual(sum(len(c.frame_ids(a)) for a in c.ACTIONS),896)
        self.assertEqual(c.DIRECTIONS,['s','se','e','ne','n','nw','w','sw'])
        self.assertEqual(c.PROPS, {'chop':['knife'],'stir':['spatula'],'extinguish':['extinguisher']})
        for a, s in c.ACTIONS.items():
            self.assertEqual(s.get('strideTiles'), .72 if a in ('walk','carry-walk') else None)
            self.assertEqual(s.get('releaseFrame'),3 if a in ('serve','throw') else None)

    def test_gait(self):
        for f in range(8):
            walk, carry = c.sample('walk',f),c.sample('carry-walk',f)
            for bone in ('hips','leg_l','leg_r'):
                self.assertEqual(walk[bone],carry[bone])
            self.assertEqual(walk['spine'][0],carry['spine'][0])
        for offset, side in ((0,'l'),(4,'r')):
            for start in (0,8):
                for phase in range(c.STANCE_FRAMES):
                    frame = start+phase-offset
                    loc = c.legs(frame)['leg_'+side][0]
                    self.assertEqual(loc[2],0)
                    if phase:
                        previous = c.legs(frame-1)['leg_'+side][0]
                        # Forward is -Y: planted forward displacement is -stride/8.
                        self.assertAlmostEqual(-(loc[1]-previous[1]),-c.STRIDE_TILES/8,delta=1e-12)
                for phase in range(c.STANCE_FRAMES,8):
                    self.assertGreater(c.legs(start+phase-offset)['leg_'+side][0][2],0)
        self.assertGreater(c.legs(3)['spine'][0][2],c.legs(2)['spine'][0][2])

    def test_stride_sway_and_carried_hands(self):
        count = c.ACTIONS['walk']['count']
        for action in ('walk', 'carry-walk'):
            poses = [c.sample(action, f) for f in range(count)]
            self.assertAlmostEqual(max(p['spine'][0][2] for p in poses), .03)
            self.assertAlmostEqual(max(p['spine'][1][2] for p in poses), .04)
            self.assertAlmostEqual(min(p['spine'][1][2] for p in poses), -.04)
            for f in range(count*16):
                pose = c.sample(action, f/16)
                self.assertEqual(pose, c.sample(action, f/16+count))
                if action == 'carry-walk':
                    for side in ('l', 'r'):
                        self.assertEqual(pose['arm_'+side], c.CARRY['arm_'+side])

    def test_keys_and_bounds(self):
        for action,spec in c.ACTIONS.items():
            if spec['loop']:
                self.assertEqual(c.sample(action,spec['count']),c.sample(action,0))
            if action in ('serve','throw'):
                self.assertEqual(c.sample(action,0),c.CARRY)
                self.assertEqual(c.sample(action,spec['count']-1),c.REST)
            for i in range(spec['count']*8+1):
                frame = i/8
                pose = c.sample(action,frame)
                self.assertLessEqual(max(abs(r) for r in pose['spine'][1]),math.radians(25))
                if action not in ('walk','carry-walk'):
                    for bone in ('leg_l','leg_r'):
                        self.assertEqual(pose[bone][1:],c.REST[bone][1:])
                        self.assertEqual(tuple(a+b for a,b in zip(pose['hips'][0],pose[bone][0])),c.ZERO)
                local = frame%spec['count'] if spec['loop'] else min(frame,spec['count']-1)
                left,right = next((l,r) for (a,l),(b,r) in zip(c.KEYS[action],c.KEYS[action][1:]) if a<=local<=b)
                for bone in c.BONES:
                    # Socket rotation is derived after interpolation; its invariant
                    # is world orientation, checked separately, not authored bounds.
                    if bone == 'head_socket':
                        continue
                    for values,lo,hi in zip(pose[bone],left[bone],right[bone]):
                        for v,a,b in zip(values,lo,hi):
                            self.assertTrue(min(a,b)-1e-12<=v<=max(a,b)+1e-12)
            for frame in range(spec['count']):
                self.assertLessEqual(math.dist(c.sample(action,frame)['spine'][0],c.sample(action,frame+1)['spine'][0]),.04)
        for action,(bone,channel,axis) in c.MAIN.items():
            keys = c.KEYS[action]
            values = [pose[bone][channel][axis] for _,pose in keys[:3]]
            first,second = values[1]-values[0],values[2]-values[1]
            self.assertLess(first*second,0)
            self.assertTrue(.1<=abs(first/second)<=.4)
            if 'releaseFrame' in c.ACTIONS[action]:
                self.assertGreater(c.ACTIONS[action]['releaseFrame'],keys[1][0])

    def test_per_frame_anchor_displacement(self):
        # cook.py rig_checks checks socket(rig), not the wrists. This is the
        # exact rigid socket origin projected with its 120 px/tile ortho camera,
        # not a hand-motion bound. Include last->first only for looping clips.
        for action, spec in c.ACTIONS.items():
            for direction in c.DIRECTIONS:
                points = [c.project(c.head_position(action, f), direction)
                          for f in range(spec['count'])]
                if spec['loop']:
                    points.append(points[0])
                for frame, (a, b) in enumerate(zip(points, points[1:])):
                    self.assertLessEqual(math.dist(a, b), 6,
                                         (action, direction, frame, a, b))
        # Solver assumption: no rotating hips or translated/rotated head origin.
        for action, spec in c.ACTIONS.items():
            for f in range(spec['count']):
                pose = c.sample(action, f)
                self.assertEqual(pose['hips'][1:], (c.ZERO, c.ONE))
                self.assertEqual(pose['head'], c.REST['head'])
                self.assertEqual(pose['head_socket'][0], c.ZERO)
                self.assertEqual(pose['spine'][2], c.ONE)

    def test_work_projection(self):
        for action in c.WORK_ACTIONS:
            for direction in c.DIRECTIONS:
                points = [c.projected_anchors(action,f,direction)
                          for f in range(c.ACTIONS[action]['count'])]
                for anchor in (('hands','nozzle') if action == 'extinguish' else ('hands',)):
                    travel = max(math.dist(a[anchor],b[anchor]) for a in points for b in points)
                    self.assertGreaterEqual(travel,13,(action,direction,anchor,travel))
                for f in range(c.ACTIONS[action]['count']):
                    pose = c.sample(action,f)
                    for side in ('l','r'):
                        foot = tuple(a+b for a,b in zip(pose['hips'][0],pose['leg_'+side][0]))
                        self.assertEqual(c.project(foot,direction),c.project(c.ZERO,direction))
        for action,spec in c.ACTIONS.items():
            if spec['loop']:
                self.assertEqual(c.KEYS[action][0][1],c.KEYS[action][-1][1])
        # Camera basis vectors, independently from the rig solver.
        self.assertAlmostEqual(c.project((0,1,0))[1]-c.project((0,0,0))[1],-120*math.sqrt(3)/2)
        self.assertAlmostEqual(c.project((0,0,1))[1]-c.project((0,0,0))[1],-60)

    def test_upright_head_world_rotation(self):
        # Independent row-matrix composition: XYZ Euler = Rz @ Ry @ Rx.
        def multiply(a, b):
            return [[sum(a[i][k]*b[k][j] for k in range(3))
                     for j in range(3)] for i in range(3)]

        def euler(angles):
            x, y, z = angles
            cx, cy, cz = map(math.cos, angles)
            sx, sy, sz = map(math.sin, angles)
            return multiply(multiply([[cz,-sz,0],[sz,cz,0],[0,0,1]],
                                     [[cy,0,sy],[0,1,0],[-sy,0,cy]]),
                            [[1,0,0],[0,cx,-sx],[0,sx,cx]])

        def world(pose, direction):
            # The common vertical rest basis maps local Y to world Z.
            basis = [[1,0,0],[0,0,-1],[0,1,0]]
            transpose = list(map(list, zip(*basis)))
            result = euler((0,0,c.DIRECTIONS.index(direction)*math.pi/4))
            for bone in ('hips', 'spine', 'head', 'head_socket'):
                result = multiply(result, multiply(multiply(basis, euler(pose[bone][1])), transpose))
            return result

        def check(pose, direction, label):
            actual, rest = world(pose,direction), world(c.REST,direction)
            relative = multiply(list(map(list,zip(*rest))), actual)
            angle = math.acos(max(-1.,min(1.,(sum(relative[i][i] for i in range(3))-1)/2)))
            self.assertLessEqual(math.degrees(angle),.5,label)

        for action, spec in c.ACTIONS.items():
            for direction in c.DIRECTIONS:
                for i in range(spec['count']*8+1):
                    check(c.sample(action,i/8),direction,(action,direction,i/8))
        # Multiple noncommuting rotations catch component-wise negation and
        # an accidentally reversed parent chain, beyond today's single-axis keys.
        combined = c.changed(hips=(.12,-.08,.09), spine=(.2,.3,-.15), head=(-.04,.06,.03))
        for direction in c.DIRECTIONS:
            check(c.upright_head(combined),direction,('combined',direction))

    def test_shoulder_spheres_touch_torso(self):
        # Common spine/hips transforms preserve contact. kalib's shoulder
        # sphere radius is arm_r*1.35; torso radii have no outline padding.
        radii = tuple(v*c.TOY_SCALE for v in (.30, .26, .30))
        radius = .07*1.35*c.TOY_SCALE

        def signed_gap(point):
            if sum((v/r)**2 for v,r in zip(point,radii)) <= 1:
                return -radius  # centre is inside: sphere necessarily intersects
            # Exact nearest point on an axis-aligned ellipsoid, outside case.
            lo, hi = 0., 1.
            def constraint(t):
                return sum((r*v/(t+r*r))**2 for v,r in zip(point,radii))
            while constraint(hi) > 1:
                hi *= 2
            for _ in range(60):
                mid = (lo+hi)/2
                if constraint(mid) > 1:
                    lo = mid
                else:
                    hi = mid
            closest = tuple(r*r*v/(hi+r*r) for v,r in zip(point,radii))
            return math.dist(point,closest)-radius

        for action,spec in c.ACTIONS.items():
            for i in range(spec['count']*8+1):
                pose = c.sample(action,i/8)
                for side,sign in (('l',-1),('r',1)):
                    loc = pose['arm_'+side][0]
                    point = (sign*.30*.9*c.TOY_SCALE+loc[0],loc[1],
                             .30*.40*c.TOY_SCALE+loc[2])
                    self.assertLessEqual(signed_gap(point),0,(action,i/8,side))
        old = (.30*.9*c.TOY_SCALE+.189493,.019855,
               .30*.40*c.TOY_SCALE+.103033)
        self.assertGreater(signed_gap(old),0)  # detached round-5 negative control

    def test_release_and_idle_projection(self):
        for action in ('serve', 'throw'):
            spec = c.ACTIONS[action]
            last = spec['releaseFrame']
            for direction in c.DIRECTIONS:
                a,b = (c.projected_anchors(action,f,direction) for f in (0,last))
                for anchor in (('l','r') if action == 'serve' else ('r',)):
                    self.assertGreaterEqual(math.dist(a[anchor],b[anchor]),
                                            13,
                                            (action,direction,anchor))

        windup = c.hand_positions('throw',1)['r']
        release = c.hand_positions('throw',c.ACTIONS['throw']['releaseFrame'])['r']
        self.assertGreater(windup[2],c.SHOULDER+.1)
        self.assertGreater(windup[1],0)  # behind the shoulder; forward is -Y
        self.assertGreater(release[0],.45)  # beyond the cap's lateral radius

        for direction in c.DIRECTIONS:
            a,b = (c.project(c.sample('idle',f)['spine'][0],direction) for f in (0,2))
            self.assertGreaterEqual(math.dist(a,b),2)

    def test_unique_projected_frames_and_scrub_steps(self):
        expected = dict(idle=3, walk=8, **{'carry-walk':8}, chop=3,
                        stir=8, wash=6, serve=6, throw=6, extinguish=3)
        for action, count in expected.items():
            for direction in c.DIRECTIONS:
                signatures = []
                for f in range(c.ACTIONS[action]['count']):
                    # All transformed pose channels, projected in this view.
                    # Rounding ignores floating-point noise, not pixel changes.
                    pose = c.sample(action,f)
                    signatures.append(tuple(round(v,8) for bone in c.BONES
                        for channel in pose[bone] for v in c.project(channel,direction)))
                self.assertEqual(len(set(signatures)),count,(action,direction))
        def max_step(action):
            return max(math.dist(c.projected_anchors(action,f,d)[side],
                                 c.projected_anchors(action,f+1,d)[side])
                       for d in c.DIRECTIONS for side in ('l','r')
                       for f in range(c.ACTIONS[action]['count']))
        self.assertLessEqual(max_step('wash'),max_step('chop'))
        self.assertLessEqual(max_step('wash'),24)

    def test_side_raise_keeps_head_and_support_hand_still(self):
        raised = c.chop_pose(True)
        length = .24*1.12*c.TOY_SCALE/math.sqrt(1+.38**2)
        delta = c.bone_rotate((.38*length,0.,-length),raised['arm_r'][1])
        self.assertGreater(delta[0], .10)  # wrist beside shoulder
        self.assertGreater(delta[2], .04)  # wrist above shoulder
        for i in range(49):
            self.assertEqual(c.head_position('chop', i/8), c.head_position('chop', 0))
            self.assertEqual(c.hand_positions('chop', i/8)['l'], c.hand_positions('chop', 0)['l'])

    def test_canister_body_bound(self):
        for f in range(4):
            pose = c.sample('extinguish',f)
            hand = c.hand_positions('extinguish',f)['r']
            head = c.head_position('extinguish',f)
            hc = (head[0],head[1],head[2]+.36*.62*c.TOY_SCALE)
            brim = (hc[0],hc[1]-.349,hc[2]+.203)
            surface = []
            for i in range(25):
                for j in range(48):
                    a,b = i*math.pi/24,j*math.tau/48
                    offset = (.095*math.sin(a)*math.cos(b),
                              -.03+.095*math.sin(a)*math.sin(b),
                              -.10+.095*1.7*math.cos(a))
                    offset = c.bone_rotate(offset,pose['arm_r'][1])
                    offset = c.bone_rotate(offset,pose['spine'][1])
                    surface.append(tuple(a+b for a,b in zip(hand,offset)))
            # Enclosing spheres: torso .34, head/cap shell .47 (thickness
            # included), brim .252. A single canister surface point must be
            # outside ALL three projected discs by >=1 px in each view.
            for d in c.DIRECTIONS:
                margin = max(min(math.dist(c.project(point,d),c.project(centre,d))-r*c.PPU
                                 for centre,r in (((0,0,c.TORSO),.34),(hc,.47),(brim,.252)))
                             for point in surface)
                self.assertGreaterEqual(margin,1,(f,d,margin))

    def test_plan(self):
        jobs = c.jobs()
        self.assertEqual([j['id'] for j in jobs],['cook-body-'+a for a in c.ACTIONS]+['cook-head-cap'])
        outputs = [p for j in jobs for p in j['outputs']]
        self.assertEqual(len(outputs),len(set(outputs)))
        for a,j in zip(c.ACTIONS,jobs):
            folder = 'tabao-rush/cook-body/'+a
            self.assertEqual(j['outputs'],[folder+'/'+i+'.png' for i in c.frame_ids(a)]+[folder+'/frames.json',folder+'/render-validation.json'])
            self.assertEqual(j['timeoutSeconds'],math.ceil(2.5*(30+2*c.ACTIONS[a]['count']*8)/60)*60)
        self.assertEqual(jobs[-1]['timeoutSeconds'],120)
        self.assertEqual(len(c.animations()),18)


class CookDecisionTests(unittest.TestCase):
    def test_decided_default_keys(self):
        expected = {
            'chop': [(0,c.chop_pose()), (1,c.chop_pose(True)),
                     (3,c.chop_pose()), (6,c.chop_pose())],
            'extinguish': [(f,c.work_pose(left=(-.85,0.,1.05),right=(0.,0.,1.20),
                twist=math.radians(angle))) for f,angle in ((0,-25),(1,0),(2,25),(3,0),(4,-25))],
        }
        for action, keys in expected.items():
            self.assertEqual(c.KEYS[action],keys)

    def test_default_head_anchor_steps(self):
        from unittest.mock import patch

        def steps(action):
            # cook.py: camera target (0,0,.675), offset (0,-.5,sqrt(3)/2),
            # orthographic scale 256/120. Rotate the rig around world Z by
            # direction*45 degrees, then screen x=128+120*x and
            # screen y=128-120*(sqrt(3)/2*y + .5*(z-.675)).
            # head_position rotates the .30*TOY_SCALE spine-to-socket offset
            # in the vertical bone basis and adds hips/spine translations.
            # Upright socket rotation changes orientation, never its origin.
            for direction in c.DIRECTIONS:
                points = [c.project(c.head_position(action, f), direction)
                          for f in range(c.ACTIONS[action]['count'])]
                for frame, (a, b) in enumerate(zip(points, points[1:]+points[:1])):
                    yield math.dist(a, b), (action, direction, frame)

        def check(action):
            for distance, label in steps(action):
                self.assertLessEqual(distance, 5.5, label)

        for action in ('chop', 'extinguish'):
            check(action)
            # Guard the rigid-transform assumptions used by the pure predictor.
            for f in range(c.ACTIONS[action]['count']):
                pose = c.sample(action, f)
                self.assertEqual(pose['hips'][1:], (c.ZERO, c.ONE))
                self.assertEqual(pose['head'], c.REST['head'])
                self.assertEqual(pose['head_socket'][0], c.ZERO)
                self.assertEqual(pose['spine'][2], c.ONE)

        # Reproduce the integrator's failing round-2 chop using its exact keys.
        previous = dict(c.KEYS['chop'][1][1])
        previous['spine'] = (c.ZERO, (.436, .341467, .370941), c.ONE)
        keys = list(c.KEYS['chop'])
        keys[1] = (1, previous)
        with patch.dict(c.KEYS, chop=keys):
            maximum = max(distance for distance, _ in steps('chop'))
            self.assertAlmostEqual(maximum, 6.34396583306018, places=7)
            with self.assertRaises(AssertionError):
                check('chop')

    def test_default_hand_anchor_travel(self):
        from unittest.mock import patch
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'assets'))
        from cook_strips import MOTION_THRESHOLDS

        def check(action):
            for direction in c.DIRECTIONS:
                points = [c.projected_anchors(action, f, direction)
                          for f in range(c.ACTIONS[action]['count'])]
                # cook.py frame_record publishes the two-hand MIDPOINT as
                # hands, not the knife wrist. Use the same camera as the
                # head test, and the same diameter as cook_strips.py.
                # Extinguish uses nozzle (not hands) in motion_report.
                for anchor in ('hands', 'r') if action == 'chop' else ('nozzle',):
                    travel = max(math.dist(a[anchor], b[anchor])
                                 for a in points for b in points)
                    threshold = 15 if action == 'chop' else MOTION_THRESHOLDS[action][0]
                    self.assertGreaterEqual(travel, threshold,
                                            (action, direction, anchor, travel))

        for action in ('chop', 'extinguish'):
            check(action)
        # Exact round-3 keys: wrist-only prediction passed, published hands
        # failed. Keep this negative control independent of today's poses.
        lower = c.work_pose(right=(2.677454, 0., -1.360655))
        lower['spine'] = (c.ZERO, (.308530, .436, .257304), c.ONE)
        raised = c.work_pose(right=(3.062278, 0., -1.455367))
        raised['spine'] = (c.ZERO, (.4168795, .35564695, .35389545), c.ONE)
        previous = [(0, lower), (1, raised), (3, lower), (6, lower)]
        with patch.dict(c.KEYS, chop=previous):
            with self.assertRaises(AssertionError):
                check('chop')
            for direction in c.DIRECTIONS:
                points = [c.projected_anchors('chop', f, direction)['hands']
                          for f in range(c.ACTIONS['chop']['count'])]
                self.assertLess(max(math.dist(a, b) for a in points for b in points), 13)

    def test_default_bounds(self):
        for action in ('chop',):
            for i in range(c.ACTIONS[action]['count']*8+1):
                f=i/8
                pose=c.sample(action,f)
                for side in ('l','r'):
                    if action == 'chop' and side == 'r':
                        self.assertLessEqual(math.dist(pose['arm_r'][0], c.ZERO), .22)
                        self.assertEqual(pose['arm_r'][2], c.ONE)
                    else:
                        self.assertEqual(pose['arm_'+side][0], c.ZERO)
                    self.assertEqual(tuple(a+b for a,b in zip(pose['hips'][0],pose['leg_'+side][0])),c.ZERO)
                local=f%c.ACTIONS[action]['count']
                left,right=next((l,r) for (a,l),(b,r) in zip(c.KEYS[action],c.KEYS[action][1:]) if a<=local<=b)
                for bone in c.BONES:
                    if bone=='head_socket':
                        continue
                    for values,lo,hi in zip(pose[bone],left[bone],right[bone]):
                        for value,a,b in zip(values,lo,hi):
                            self.assertTrue(min(a,b)-1e-12<=value<=max(a,b)+1e-12)
                hands=c.hand_positions(action,f)
                self.assertGreater(hands['r'][0], 0)
                self.assertLessEqual(max(map(abs, pose['spine'][1])), math.radians(25))
                head = c.head_position(action, f)
                # Historical cap clearance describes the lower hold only. The
                # attached raise replaces the detached reach; visibility needs
                # the integrator's new render, rather than a cap-envelope claim.
                for d in c.DIRECTIONS if pose['arm_r'][0] == c.ZERO else ():
                    for shape, margin in silhouette_margins(pose, hands['r'], head, d).items():
                        if d == 'se':
                            # Centre penetration, in px, relative to the conservative
                            # envelope. This is not rendered occlusion or hand area.
                            self.assertLessEqual(max(0., -margin)*c.PPU, 10.555954, (f,d,shape))
                        else:
                            self.assertGreater(margin, 0., (f,d,shape,margin))

        for direction in c.DIRECTIONS:
            points = [c.project(c.hand_positions('chop', f)['r'], direction)
                      for f in range(c.ACTIONS['chop']['count'])]
            self.assertGreaterEqual(max(math.dist(a,b) for a in points for b in points), 13)


def silhouette_margins(pose, hand, head, direction):
    """Signed centre separation in tiles; exact support sampled every degree.

    Torso: rotating ellipsoid (.30,.26,.30)*scale + .015 per axis.
    Upright cap: r=.47 dome clipped at z=.18; brim (.252,.203,.024)
    at (0,-.349,.203) relative to the moving head centre.
    """
    angle = c.DIRECTIONS.index(direction)*math.pi/4
    u = (math.cos(angle), -math.sin(angle), 0)
    v = (math.sin(angle)*math.sqrt(3)/2, math.cos(angle)*math.sqrt(3)/2, .5)
    torso = tuple(a+b for a,b in zip((0,0,c.TORSO),
        tuple(a+b for a,b in zip(pose['hips'][0], pose['spine'][0]))))
    hc = (head[0], head[1], head[2]+.36*.62*c.TOY_SCALE)
    axes = [c.bone_rotate(tuple(float(j==k) for j in range(3)), pose['spine'][1])
            for k in range(3)]
    result = {}
    for shape, centre in (('torso',torso), ('shell',hc),
                          ('brim',(hc[0],hc[1]-.349,hc[2]+.203))):
        q = tuple(hand[j]-centre[j] for j in range(3))
        margins = []
        for k in range(360):
            theta = k*math.tau/360
            n = tuple(math.cos(theta)*u[j]+math.sin(theta)*v[j] for j in range(3))
            if shape == 'torso':
                support = math.sqrt(sum((sum(n[j]*axes[k][j] for j in range(3))
                    *(r*c.TOY_SCALE+.015))**2 for k,r in enumerate((.30,.26,.30))))
            elif shape == 'brim':
                support = math.sqrt(sum((n[j]*r)**2 for j,r in enumerate((.252,.203,.024))))
            elif .47*n[2] >= .18:
                support = .47
            else:
                support = .18*n[2]+math.sqrt(.47**2-.18**2)*math.hypot(n[0],n[1])
            margins.append(sum(q[j]*n[j] for j in range(3))-support)
        result[shape] = max(margins)
    return result


if __name__ == '__main__':
    unittest.main()
