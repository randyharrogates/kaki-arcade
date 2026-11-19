"""TR-060: pre-render projected hand travel; no Blender or rendered inputs."""
import json
import math
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'blender'))
from cook_gait import poses as C


def report():
    result = {}
    for action in ('walk', 'carry-walk'):
        result[action] = {}
        for direction in C.DIRECTIONS:
            row = {}
            for side in ('l', 'r'):
                points = [C.project(C.hand_positions(action, f)[side], direction)
                          for f in range(C.ACTIONS[action]['count'])]
                row['hand_'+side] = round(max(math.dist(a,b) for a in points for b in points), 3)
            xs = [C.project(C.head_position(action, f), direction)[0]
                  for f in range(C.ACTIONS[action]['count'])]
            row['headSidewaysPx'] = round(max(xs)-min(xs), 3)
            result[action][direction] = row
    return result


if __name__ == '__main__':
    print(json.dumps(report(), indent=2))
