"""A-05 / TR-030, TR-031, TR-010: pure station geometry and placement source.

All positions are world tiles; full-resolution source coordinates use 120 px/tile.
No simulation rules are introduced here. Safe kinds mirror rules/stations.ts.
"""
import math

KINDS = ('chop', 'wok', 'pot', 'grill', 'rice', 'drinks', 'plating', 'sink',
         'bin', 'serving', 'dish-rack', 'return-counter')
FIXTURES = KINDS + ('ingredient-crate',)
SAFE = ('serving', 'dish-rack', 'return-counter', 'ingredient-crate')
STATES = ('empty', 'working', 'done', 'burning', 'on-fire')
AUTOMATIC = ('wok', 'pot', 'grill', 'rice')
SIZE, PPU = 192, 120
PROGRESS_Y, CUE_Y = 58, 24
BAR_ROWS, PLAQUE_ROWS = (51, 65), (2, 46)
BAR_COLUMNS, PLAQUE_COLUMNS = (51, 141), (74, 118)
CELL_X, CELL_PITCH = 59, 10.5
SMOKE_MIN_Y = PLAQUE_ROWS[1] + 1
PALETTE = dict(cream='#F4F1E8', ink='#2B2118', wood='#C7A16A', red='#B5371F',
               gold='#E0A63A', steel='#B9B6AE', blue='#3F5E8C')


def project(point):
    x, y, z = point
    return [round(SIZE/2 + PPU*x, 4),
            round(128 - PPU*(y*math.sin(math.pi/3) + z*.5), 4)]


def screen_point(x, y, depth=2):
    """Screen-plane point moved towards camera; depth leaves projection unchanged."""
    return ((x-96)/PPU, (128-y)*math.sin(math.pi/3)/PPU-depth*.5,
            (128-y)*.5/PPU+depth*math.sin(math.pi/3))


def box(at, size, colour):
    return dict(shape='box', at=at, size=size, colour=colour)


def ball(at, size, colour):
    return dict(shape='ball', at=at, size=size, colour=colour)


def geometry(kind):
    """Rounded matte toy fixtures; static bodies are also usable by A-06 baking."""
    if kind not in FIXTURES:
        raise ValueError(kind)
    parts = [box((0, 0, .30), (.90, .90, .60), 'cream'),
             box((0, 0, .63), (.96, .96, .10), 'steel')]
    if kind == 'chop':
        parts += [box((0, 0, .71), (.72, .60, .08), 'wood'),
                  box((.36, 0, .71), (.12, .20, .08), 'wood')]
    elif kind in ('wok', 'pot', 'rice'):
        parts += [ball((0, 0, .72), (.37, .37, .12), 'ink')]
        if kind == 'wok':
            parts += [ball((0, 0, .79), (.32, .32, .08), 'steel'),
                      box((.36, 0, .77), (.28, .09, .07), 'wood')]
        elif kind == 'pot':
            parts += [ball((0, 0, .81), (.36, .34, .13), 'steel'),
                      ball((0, 0, .94), (.36, .34, .045), 'ink'),
                      ball((0, 0, 1.0), (.07, .07, .035), 'wood')]
            parts += [box((x, 0, .85), (.18, .14, .08), 'ink') for x in (-.40, .40)]
        else:
            parts += [box((0, 0, .91), (.53, .55, .45), 'cream'),
                      ball((0, 0, 1.12), (.28, .29, .12), 'ink'),
                      box((0, -.29, .91), (.26, .045, .17), 'ink'),
                      box((0, -.32, .92), (.15, .02, .065), 'cream')]
    elif kind == 'grill':
        parts += [box((0, 0, .72), (.76, .70, .08), 'ink')]
        parts += [box((x/10, 0, .78), (.035, .65, .035), 'steel') for x in range(-3, 4)]
    elif kind == 'drinks':
        parts += [ball((-.20, .13, .87), (.17, .17, .23), 'wood'),
                  ball((.20, .13, .87), (.17, .17, .23), 'steel'),
                  box((.20, -.10, .84), (.09, .22, .06), 'ink')]
    elif kind == 'sink':
        parts += [box((0, 0, .70), (.76, .72, .07), 'ink'),
                  box((0, 0, .72), (.60, .55, .035), 'blue'),
                  box((0, .35, .88), (.07, .07, .40), 'steel'),
                  box((0, .23, 1.06), (.07, .30, .07), 'steel')]
    elif kind in ('plating', 'dish-rack', 'return-counter'):
        for i in range(3 if kind == 'dish-rack' else 1):
            parts += [ball((0, 0, .72+i*.055), (.32, .32, .035),
                           'cream' if kind != 'return-counter' else 'wood')]
        if kind == 'dish-rack':
            parts += [box((x, .33, .89), (.045, .045, .38), 'wood') for x in (-.36, .36)]
    elif kind == 'serving':
        parts += [box((x, .30, .90), (.08, .08, .55), 'red') for x in (-.40, .40)]
        parts += [box((0, .30, 1.18), (.90, .16, .12), 'wood')]
    elif kind == 'bin':
        parts = [box((0, 0, .36), (.70, .70, .72), 'steel'),
                 box((0, 0, .76), (.77, .77, .10), 'cream'),
                 box((0, 0, .82), (.45, .45, .03), 'ink')]
    elif kind == 'ingredient-crate':
        parts = [box((0, 0, .28), (.86, .86, .56), 'wood')]
        parts += [box((0, y, .51), (.90, .06, .13), 'ink') for y in (-.42, .42)]
        parts += [ball((x, y, .60), (.12, .12, .12), 'cream')
                  for x in (-.2, .2) for y in (-.2, .2)]
    return parts


def states(kind):
    if kind == 'ingredient-crate':
        return ()
    if kind in SAFE:
        return ('empty',)
    if kind == 'bin':
        return ('empty', 'on-fire')
    return STATES if kind in AUTOMATIC else ('empty', 'working', 'done', 'on-fire')


def metadata(kind):
    return dict(stationKind=kind, footprint=[-.5, -.5, 1, 1],
                supportedStates=list(states(kind)), staticBody=True,
                layerOrder=["body", "food", "fire", "effect", "progress", "cue"],
                stateLayers={s: (['station-smoke-0'] if s == 'burning' else
                            ['station-progress-track'] if s == 'working' else []) +
                            ['station-cue-'+s] for s in states(kind)})


def overlay_ids():
    return (['cue-'+s for s in STATES] + ['progress-track'] +
            ['progress-'+str(i) for i in range(8)] +
            [effect+'-'+str(i) for effect in ('smoke',) for i in range(4)])


def specification(ident, folder):
    is_body = ident in FIXTURES
    anchors = dict(root=project((0, 0, 0)), item=project((0, 0, .85)),
                   progress=[96, PROGRESS_Y], cue=[96, CUE_Y], effect=project((0, 0, .85)), fire=[96, 120])
    if ident == 'drinks':
        anchors['item'] = [96, 101]
    return dict(id='station-'+ident, file=f'{folder}/{ident}.png', anchor=anchors['root'],
                anchors=anchors, **(metadata(ident) if is_body else dict(overlay=ident, **({'reducedMotionFrame': 'station-smoke-2'} if ident.startswith('smoke-') else {}))))


def progress_count(fraction):
    """Renderer fills left-to-right, no colour interpolation; 8 distinct blocks."""
    return min(8, max(0, math.floor(fraction*8)))


def effect_lobes(effect, frame):
    if effect != 'smoke' or frame not in range(4):
        raise ValueError((effect, frame))
    # Burning has no bar. Grow and lift 13.5 px, clearing the plaque at y46.
    return [(screen_point(96+x+frame, 80-i*5-frame*4.5, depth=0),
             (.034+i*.008+frame*.002, .034+i*.008+frame*.002,
              .034+i*.008+frame*.002)) for i, x in enumerate((-6, 1, 6))]
