"""TR-060: walk-only render entry point, including gate landmarks."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import cook
import cook_gait


def frame_record(rig, ident, folder, heads=False):
    result = original_record(rig, ident, folder, heads)
    if not heads:
        for side in ('l', 'r'):
            result['anchors']['hand_'+side] = cook.project(cook.empty_world(cook.HANDS[side]))
            result['anchors']['foot_'+side] = cook.project(cook.bone_world(rig, 'leg_'+side))
    return result


if __name__ == '__main__':
    if '--action' not in sys.argv or sys.argv[sys.argv.index('--action')+1] not in ('walk', 'carry-walk'):
        raise ValueError('walk renderer requires walk or carry-walk')
    cook.C = cook_gait.poses
    original_record = cook.frame_record
    cook.frame_record = frame_record
    cook.main()
