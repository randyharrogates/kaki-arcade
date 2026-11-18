"""TR-060 / NN-4 choreography checks, with no Blender imports."""
import math
import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import cook_poses as c


class CookPoseTests(unittest.TestCase):
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

    def test_shoulders_inside_torso(self):
        # Evaluate in torso space: spine/hips are a common rigid transform.
        # kalib's torso is an ellipsoid; check the actual shoulder bone heads.
        for action, keys in c.KEYS.items():
            for frame, pose in keys:
                for side, sign in (('l', -1), ('r', 1)):
                    loc = pose['arm_'+side][0]
                    shoulder = (sign*.30*.9*c.TOY_SCALE+loc[0], loc[1],
                                .30*.40*c.TOY_SCALE+loc[2])
                    radii = tuple(v*c.TOY_SCALE for v in (.30,.26,.30))
                    self.assertLessEqual(sum((v/r)**2 for v,r in zip(shoulder,radii)),
                                         1., (action,frame,side,shoulder))
                    self.assertEqual(loc, c.ZERO)

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
        expected = dict(idle=3, walk=8, **{'carry-walk':8}, chop=6,
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

    def test_knife_raise_cap_bound(self):
        # Conservative cap shell sphere (r=.47 tiles, clipped z>=.18 above
        # head centre) plus brim ellipsoid (.252,.203,.024) at (0,-.349,.203).
        # Test the hand's visible lower edge, not full-hand clearance. The bound includes shell thickness; require at least 6 px of
        # the spherical hand below the entire projected cap envelope.
        for d in c.DIRECTIONS:
            h = c.head_position('chop',1)
            hc = h[2]+.36*.62*c.TOY_SCALE
            angle = c.DIRECTIONS.index(d)*math.pi/4
            shell = hc*.5+.18*.5-math.sqrt(.47**2-.18**2)*math.sqrt(3)/2
            brim = (hc*.5+.203*.5-.349*math.cos(angle)*math.sqrt(3)/2
                    -math.sqrt((.252*math.sin(angle))**2*.75
                               +(.203*math.cos(angle))**2*.75+(.024*.5)**2))
            bottom = 128-120*(min(shell,brim)-.675*.5)
            hand = c.projected_anchors('chop',1,d)['r']
            self.assertGreaterEqual(hand[1]+.09*c.TOY_SCALE*c.PPU-bottom,6,
                                    (d,hand,bottom))

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


if __name__ == '__main__':
    unittest.main()
