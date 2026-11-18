"""TR-064/TR-061: Blender-free head-only declarations."""
from cook_poses import *

HEADS = ('cap', 'uncle', 'auntie', 'makcik', 'bun', 'specs', 'turban', 'songkok')


def head_ids(character='cap'):
    return [f'head-{character}-{direction}{suffix}' for direction in DIRECTIONS for suffix in ('', '-mask')]



def jobs():
    result = []
    for character in HEADS[1:]:
        folder = 'tabao-rush/cook-heads/'+character
        args = ['--heads', '--out', folder]
        if character != 'cap':
            args += ['--character', character]
        result.append(dict(id='cook-head-'+character, script='cook_heads.py', args=args,
            inputs=[], extraInputs=['tools/blender/kalib.py', 'tools/blender/cook_poses.py', 'tools/blender/cook.py', 'tools/blender/cook_heads_contract.py'],
            outputs=[folder+'/'+ident+'.png' for ident in head_ids(character)]+
                    [folder+'/frames.json', folder+'/render-validation.json'], timeoutSeconds=120))
    return result


def head_animations():
    return [dict(action=character+suffix, fps=1, loop=True,
                 directions={d: [f'head-{character}-{d}{suffix}'] for d in DIRECTIONS})
            for character in HEADS for suffix in ('', '-mask')]
