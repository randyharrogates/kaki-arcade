"""TR-064/TR-061: regenerate the isolated head config extension."""
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'blender'))
import cook_heads_contract as C


def update(config):
    config['renders'] = C.jobs()
    group = next(g for g in config['sets'] if g['id'] == 'tabao-rush-cook-heads')
    group['frameFiles'] = ['tabao-rush/cook-heads/'+h+'/frames.json' for h in C.HEADS]
    group['animations'] = C.head_animations()
    return config


if __name__ == '__main__':
    path = Path(__file__).resolve().parents[2]/'assets/src/pipeline.cook-heads.json'
    path.write_text(json.dumps(update(json.loads(path.read_text())), indent=2)+'\n')
