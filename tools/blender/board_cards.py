"""A-08 / PP-030, PP-031: Stage 1 board and shared production geometry. Blender 5.2; palette from packages/ui/src/themes.ts.
blender -b --factory-startup -P tools/blender/board_cards.py -- --out tools/boards/out/cards
cards.py imports this geometry for production and temporarily patches check_ink
until its final layout is complete.
Then: python3 tools/boards/build_board_cards.py --out tools/boards/out/cards
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector, Matrix
from mathutils.geometry import tessellate_polygon
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0, str(Path(__file__).resolve().parent))
import kalib as K

from card_checks import check_pixels
from card_tokens import TOKENS

RANK_TEN_SPACING = .75

SUITS = dict(zip('shdc', (TOKENS[name] for name in ('spades', 'hearts', 'diamonds', 'clubs'))))


def check_face(path, face=True, back=False, coverage_window=None, paper=False):
    """Inspect saved PNG pixels, excluding transparency (no Pillow in Blender)."""
    image = bpy.data.images.load(str(path), check_existing=False)
    try:
        width, height = image.size
        pixels = list(image.pixels)
        return check_pixels([tuple(pixels[i:i+4]) for i in range(0, len(pixels), 4)],
                            width, height, path, face, back, coverage_window, paper)
    finally:
        bpy.data.images.remove(image)


def pixel_hash(path):
    """SHA-256 of decoded row-major RGBA8, including transparent RGB."""
    image = bpy.data.images.load(str(path), check_existing=False)
    try:
        return hashlib.sha256(bytes(max(0, min(255, round(v*255)))
                                    for v in image.pixels)).hexdigest()
    finally:
        bpy.data.images.remove(image)


def polygon(parent, points, material, z=.018):
    mesh = bpy.data.meshes.new('generated ink')
    vertices=[Vector((x,y,z)) for x,y in points]
    triangles=tessellate_polygon([vertices])
    # tessellate_polygon returns vertex indices into the (single) outline.
    mesh.from_pydata(vertices, [], [list(tri) for tri in triangles])
    mesh.update()
    obj = bpy.data.objects.new('generated ink', mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(material)
    return obj


def suit(parent, kind, x, y, size, material, upside=False):
    # Each suit is one simple, non-overlapping boundary, including its stem.
    if kind in ('c','s'):
        if kind == 'c':
            shapes=[[(cx+.25*math.cos(i*math.tau/96),
                       cy+.25*math.sin(i*math.tau/96)) for i in range(96)]
                    for cx,cy in [(0,.23),(-.23,-.04),(.23,-.04)]]
        else:
            shapes=[[(16*math.sin(t)**3/32,
                       -(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))/32)
                      for t in [i*math.tau/128 for i in range(128)]]]
        shapes.append([(0,.05),(-.14,-.53),(.14,-.53)])
        # These shapes share the origin: their 2D union is star-shaped. The
        # furthest ray/edge intersection gives its single exterior boundary.
        points=[]
        for i in range(256):
            dx,dy=math.cos(i*math.tau/256),math.sin(i*math.tau/256)
            radius=0
            for shape in shapes:
                for a,b in zip(shape,shape[1:]+shape[:1]):
                    ex,ey=b[0]-a[0],b[1]-a[1]
                    cross=dx*ey-dy*ex
                    if abs(cross)<1e-10: continue
                    r=(a[0]*ey-a[1]*ex)/cross
                    u=(a[0]*dy-a[1]*dx)/cross
                    if r>=0 and 0<=u<=1: radius=max(radius,r)
            points.append((radius*dx,radius*dy))
    elif kind == 'h':
        points=[]
        for i in range(64):
            t=math.tau*i/64
            points.append((16*math.sin(t)**3/32,
                (13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))/32))
    else:
        points=[(0,.55),(.36,0),(0,-.55),(-.36,0)]
    return polygon(parent,[(x+a*size,y+b*size*(-1 if upside else 1)) for a,b in points],material)


def text(parent, body, x, y, size, material, angle=0):
    curve = bpy.data.curves.new('DM Sans Bold rank', 'FONT')
    font_path = Path(__file__).resolve().parents[2] / 'assets/src/fonts/dm-sans/DMSans-Bold.ttf'
    curve.font = bpy.data.fonts.load(str(font_path), check_existing=True)
    curve.body = body
    if body == '10':
        curve.space_character = RANK_TEN_SPACING  # Tight pair; common cap size, never horizontal scaling.
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.size = size
    obj = bpy.data.objects.new('rank '+body, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = (x,y,.020)
    obj.rotation_euler.z = angle
    obj.parent = parent
    if material is not None:
        curve.materials.append(material)
    return obj


def ink_bounds(obj):
    """Actual geometry bounds in card coordinates, before the card is tilted."""
    bpy.context.view_layer.update()
    points = [obj.matrix_local @ Vector(corner) for corner in obj.bound_box]
    return (min(p.x for p in points), min(p.y for p in points),
            max(p.x for p in points), max(p.y for p in points))


def fit_ink(obj, box):
    """Fit and centre actual font bounds, including the Q tail, in a region."""
    left, bottom, right, top = ink_bounds(obj)
    x0, y0, x1, y1 = box
    scale = min((x1-x0)/(right-left), (y1-y0)/(top-bottom))
    obj.scale *= scale
    obj.location.x += (x0+x1)/2 - (left+right)/2*scale
    obj.location.y += (y0+y1)/2 - (bottom+top)/2*scale


def check_ink(root, face):
    """Reject intersecting ink AABBs, excluding paper, shadows and back paint."""
    shapes = [(obj.name, ink_bounds(obj)) for obj in root.children
              if obj.get("face_ink", False)]
    if not shapes:
        raise RuntimeError(f"No face ink to check: {face}")
    for i, (name, a) in enumerate(shapes):
        for other, b in shapes[i+1:]:
            if min(a[2], b[2]) > max(a[0], b[0]) + 1e-6 and min(a[3], b[3]) > max(a[1], b[1]) + 1e-6:
                raise RuntimeError(f"Overlapping face ink: {face}: {name} {a} / {other} {b}")
    print(f"INK CHECK {face}: {len(shapes)} disjoint shapes")


def rounded(parent, width, height, z, material):
    radius = .065
    pts = []
    for cx,cy,start in [(width/2-radius,height/2-radius,0),(-width/2+radius,height/2-radius,90),(-width/2+radius,-height/2+radius,180),(width/2-radius,-height/2+radius,270)]:
        for i in range(9):
            a = math.radians(start+i*90/8)
            pts.append((cx+radius*math.cos(a),cy+radius*math.sin(a)))
    obj = polygon(parent,pts,material,z)
    solid = obj.modifiers.new('slight card thickness','SOLIDIFY')
    solid.thickness = .025
    return obj


def flat_ink(colour, alpha=1):
    material=bpy.data.materials.new('flat printed ink'); material.use_nodes=True
    nt=material.node_tree; nt.nodes.clear()
    output=nt.nodes.new('ShaderNodeOutputMaterial')
    emission=nt.nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value=(*K.srgb_hexc(colour),1)
    if alpha == 1:
        nt.links.new(emission.outputs[0],output.inputs['Surface'])
    else:
        transparent=nt.nodes.new('ShaderNodeBsdfTransparent')
        mix=nt.nodes.new('ShaderNodeMixShader'); mix.inputs[0].default_value=alpha
        nt.links.new(transparent.outputs[0],mix.inputs[1])
        nt.links.new(emission.outputs[0],mix.inputs[2])
        nt.links.new(mix.outputs[0],output.inputs['Surface'])
    return material


def card(style, rank, kind, back=False):
    root = K.new_root('one card model')
    height = 1.618 if style == 'C' else 205/150
    # PEEK_POKER_CARDS.face: one soft 170-degree paper gradient. Emission
    # preserves token values under Standard view, independently of day lights.
    paper = flat_ink(TOKENS['from'])
    nt = paper.node_tree
    coords = nt.nodes.new('ShaderNodeTexCoord')
    separate = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coords.outputs['Generated'], separate.inputs[0])
    # 0.15*(1-x): the darkest corner falls bottom-right like the 170-degree token CSS, and the
    # blend still spans 0..1 so the ramp is not clamped.
    x = nt.nodes.new('ShaderNodeMath'); x.operation = 'MULTIPLY_ADD'
    x.inputs[1].default_value = -.15
    x.inputs[2].default_value = .15
    y = nt.nodes.new('ShaderNodeMath'); y.operation = 'MULTIPLY'
    y.inputs[1].default_value = .85
    nt.links.new(separate.outputs['X'], x.inputs[0])
    nt.links.new(separate.outputs['Y'], y.inputs[0])
    blend = nt.nodes.new('ShaderNodeMath'); blend.operation = 'ADD'
    nt.links.new(x.outputs[0], blend.inputs[0]); nt.links.new(y.outputs[0], blend.inputs[1])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*K.srgb_hexc(TOKENS['to']),1)
    ramp.color_ramp.elements[1].color = (*K.srgb_hexc(TOKENS['from']),1)
    nt.links.new(blend.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], nt.nodes['Emission'].inputs['Color'])
    # Neutral, soft baked shadow on alpha; no opaque ground or helper geometry.
    for i in range(8,0,-1):
        shadow=rounded(root,1+i*.007,height+i*.007,-.04-i*.0001,
                       flat_ink(TOKENS['spades'],.025))
        shadow.modifiers.clear()
        shadow.location.y=-.015
    rounded(root,1,height,0,paper)
    if back:
        red = flat_ink(TOKENS['colour']); stripe = flat_ink(TOKENS['stripe'])
        rounded(root,.92,height-.08,.018,red)
        # x+y=c distances need sqrt(2) to give perpendicular 5/13 px stripes.
        w,h=.84,height-.16
        for offset in range(-22,23):
            c=offset*13*math.sqrt(2)/150
            pts=[(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]
            for bound,sign in [(c,1),(c+5*math.sqrt(2)/150,-1)]:
                result=[]
                for a,b in zip(pts,pts[1:]+pts[:1]):
                    va=sign*(a[1]+a[0]-bound); vb=sign*(b[1]+b[0]-bound)
                    if va>=0: result.append(a)
                    if (va>=0)!=(vb>=0):
                        t=va/(va-vb); result.append((a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])))
                pts=result
                if not pts: break
            # Discard clipped slivers smaller than one square screen pixel.
            area = abs(sum(a[0]*b[1]-b[0]*a[1]
                           for a,b in zip(pts,pts[1:]+pts[:1])))/2
            if len(pts)>=3 and area >= 1/150**2:
                paint = polygon(root,pts,stripe,.0181)
                # Emission paint casts no shadow: stripes are a single surface
                # treatment; tiny offset only prevents coplanar z-fighting.
                paint.visible_shadow = False
    else:
        decoration = set(root.children)
        ink=flat_ink(SUITS[kind])
        for sign in (1,-1):
            index = text(root,rank,0,0,.22,ink,0 if sign==1 else math.pi)
            cx, cy = -.34*sign, (height/2-.17)*sign
            fit_ink(index,(cx-.105,cy-.075,cx+.105,cy+.075))
            suit(root,kind,-.34*sign,(height/2-.36)*sign,.16,ink,sign<0)
        if style=='A':
            if rank=='A': suit(root,kind,0,0,.48,ink)
            elif rank=='10':
                # 4-2-4: two columns of four and two centre pips.
                # Entire field clears the index columns and corner rank heights.
                for x in (-.15,.15):
                    for y in (-.21,-.07,.07,.21): suit(root,kind,x,y,.12,ink,y<0)
                for y in (-.14,.14): suit(root,kind,0,y,.12,ink,y<0)
            else:
                # Original flat crown, clear of the large suit (no paper overlay).
                polygon(root,[(-.18,.13),(-.21,.30),(-.09,.23),(0,.35),
                              (.09,.23),(.21,.30),(.18,.13)],ink)
                suit(root,kind,0,-.18,.46,ink)
        elif style=='B':
            # One shared rank region and gap for A, 10 and Q; use real font
            # bounds so the Q descender cannot invade the suit region.
            rank_obj=text(root,rank,0,0,.70,ink)
            # Production replaces this board preview fit with shared cap sizing.
            fit_ink(rank_obj,(-.205 if rank=='10' else -.245,.02,
                              .205 if rank=='10' else .245,.40))
            symbol=suit(root,kind,0,0,.43,ink)
            bounds=ink_bounds(symbol)
            symbol.location.y=ink_bounds(rank_obj)[1]-.08-bounds[3]
        else:
            # C: usable centre height split into rank:suit regions exactly phi:1.
            usable=height-.56; lower=usable/(1+1.618); upper=usable-lower
            text(root,rank,0,lower/2,.70 if style=='B' else upper*.95,ink)
            suit(root,kind,0,-upper/2,.43 if style=='B' else lower*.90,ink)
        for obj in set(root.children)-decoration:
            obj['face_ink']=True
        check_ink(root,f'{style}_{rank}{kind}')
    root.rotation_euler.x=math.radians(30)  # Normal faces the decided 60-degree camera.
    return root


def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--out',required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    out=Path(args.out).resolve()
    allowed=Path(__file__).resolve().parents[1]/'boards/out/cards'
    if not out.is_relative_to(allowed): parser.error('Stage 1 outputs must be under tools/boards/out/cards')
    out.mkdir(parents=True,exist_ok=True)
    validation = out/'render_validation.json'
    validation.unlink(missing_ok=True)  # A failed/restarted run cannot reuse an old pass.
    start=time.monotonic()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    K.STYLE='matte'; K.lights()
    scene=bpy.context.scene; scene.render.engine='CYCLES'
    scene.cycles.samples=64; scene.cycles.use_denoising=True
    scene.cycles.denoiser='OPENIMAGEDENOISE'
    scene.cycles.seed=8
    scene.cycles.transparent_max_bounces=32
    scene.render.use_border=False
    scene.render.use_compositing=False
    scene.render.use_sequencer=False
    scene.render.film_transparent=True
    scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='Standard'
    scene.view_settings.look='None'
    scene.view_settings.exposure=0
    scene.view_settings.gamma=1
    bpy.ops.object.camera_add(location=(0,-9,9*math.sqrt(3)))
    cam=bpy.context.object; cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'; scene.camera=cam
    def render(root,name,style):
        scene.render.resolution_x=176
        scene.render.resolution_y=269 if style=='C' else 231
        scene.render.resolution_percentage=100
        # Calibrate from camera projection, independent of Blender sensor-fit rules.
        # 150 px card width + 13 px transparent gutter on either side, all styles.
        cam.data.ortho_scale=2
        bpy.context.view_layer.update()
        left=world_to_camera_view(scene,cam,Vector((-.5,0,0)))
        right=world_to_camera_view(scene,cam,Vector((.5,0,0)))
        cam.data.ortho_scale *= (right.x-left.x)*176/150
        bpy.context.view_layer.update()
        scene.render.filepath=str(out/(name+'.png'))
        bpy.ops.render.render(write_still=True)
    def remove(root):
        for obj in list(root.children): bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.objects.remove(root,do_unlink=True)
    faces=[]
    for style in 'ABC':
        for kind in SUITS:
            for rank in ('A','10','Q'):
                name=f'{style}_{rank}{kind}'
                root=card(style,rank,kind); render(root,name,style); remove(root)
                faces.append(out/(name+'.png'))
    root=card('B','A','s',True); render(root,'back','B'); remove(root)
    # Same object silhouette masks each side as it turns. Arc, ease-in-out, no overshoot.
    for i,t in enumerate((0,.25,.5,.75,1)):
        eased=t*t*(3-2*t)
        root=card('B','Q','h',t>.5)
        # Turn about the card's local vertical, after the camera-facing tilt.
        turn=math.pi*(eased if t<=.5 else eased-1)
        root.rotation_euler=(Matrix.Rotation(math.radians(30),4,'X') @
                             Matrix.Rotation(turn,4,'Y')).to_euler()
        root.location.z=.08*math.sin(math.pi*t)
        render(root,f'flip_{i}','B'); remove(root)
    # Validate all 36 saved faces before allowing composition. Edge-on flip frames
    # are intentionally excluded: their coverage/variance can legitimately be tiny.
    metrics={path.name:check_face(path) for path in faces}
    files=faces+[out/'back.png']+[out/f'flip_{i}.png' for i in range(5)]
    for path in files[len(faces):]:
        metrics[path.name]=check_face(path,face=False,back=path.name == 'back.png')
    elapsed=time.monotonic()-start
    validation.write_text(json.dumps({'version':4, 'seconds':elapsed, 'faces':metrics,
        'hashEncoding':'decoded RGBA8, bottom row first (Blender image.pixels)',
        'sha256':{p.name:pixel_hash(p) for p in files}},indent=2)+'\n')
    print(f'CARDS: 42 renders validated in {elapsed:.1f}s; compose separately.')

if __name__=='__main__':
    try:
        main()
    except Exception:
        # Blender normally reports Python exceptions without a non-zero process
        # status unless --python-exit-code is supplied; enforce failure ourselves.
        import os
        import traceback
        traceback.print_exc()
        sys.stdout.flush(); sys.stderr.flush()
        os._exit(1)
