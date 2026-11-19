"""TR-060: isolated walk choreography; shared cook sources stay unchanged."""
import math
from pathlib import Path
import types

# A private namespace avoids changing shared poses in a long-lived Python process.
poses = types.ModuleType('walk_poses')
exec(compile(Path(__file__).with_name('cook_poses.py').read_bytes(),
             'cook_poses.py', 'exec'), poses.__dict__)
original_legs = poses.legs


def legs(frame):
    result = original_legs(frame)
    count = poses.ACTIONS['walk']['count']
    phase = frame % count
    index = math.floor(phase)
    t = phase-index
    t = t*t*(3-2*t)
    def wave(offset=0.):
        a = math.sin((index+offset)*math.tau/count)
        b = math.sin((index+1+offset)*math.tau/count)
        return a+(b-a)*t
    x, y = wave(), wave(count/4)
    result['spine'] = ((.05*x, .05*y, .015*(1-y)), (.04*y, 0., -.04*x), poses.ONE)
    return result


original_sample = poses.sample


def sample(action, frame):
    if action not in ('walk', 'carry-walk'):
        return original_sample(action, frame)
    frame %= poses.ACTIONS[action]['count']
    result = legs(frame)
    for side, offset in (('l', 0), ('r', 4)):
        result['arm_'+side] = (poses.CARRY if action == 'carry-walk' else
            poses.changed(**{'arm_'+side: (.06*math.cos((frame+offset)*math.tau/8), 0., 0.)}))['arm_'+side]
    return poses.upright_head(result)


poses.sample = sample
poses.legs = legs
for action in ('walk', 'carry-walk'):
    poses.KEYS[action] = [(f, poses.sample(action, f)) for f in range(9)]


def jobs():
    result = poses.jobs()
    for job in result:
        if job['id'] in ('cook-body-walk', 'cook-body-carry-walk'):
            job['script'] = 'cook_walk.py'
            job['extraInputs'] += ['tools/blender/cook.py', 'tools/blender/cook_gait.py']
    return result
