"""End-goal vision board: a full Tabao Rush kopitiam kitchen (co-op and versus), the 8 cooks and
the 7 dishes. First-pass target art to show Randy the aim; the real assets come from track A.

Run: blender -b --factory-startup -P tools/blender/vision_scenes.py -- /abs/outdir
Env: SAMPLES (default 64), ONLY (comma list of job-name prefixes).
World: 1 unit = one floor tile = 120 px at 1080p. Camera: orthographic, 50 degrees.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kalib as K
from mathutils import Vector

K.OUT = sys.argv[sys.argv.index("--") + 1]
K.SAMPLES = int(os.environ.get("SAMPLES", "64"))
ONLY = [s for s in os.environ.get("ONLY", "").split(",") if s]
K.PROPS["toy"]["height"] = 1.5
rad = math.radians
TOP = 0.92  # counter top height
STYLE = "toy"


def pm(col, rough=.55, metal=0.0, emit=0.0, coat=0.0):
    m = bpy.data.materials.new("p"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*K.hexc(col), 1)
    b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if K.STYLE == "matte": rough, coat = max(rough, .62) if not metal else rough, 0.0
    if coat and "Coat Weight" in b.inputs: b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = (*K.hexc(col), 1); b.inputs["Emission Strength"].default_value = emit
    return m


def M():
    """Fresh material set (materials are wiped with each scene)."""
    return dict(
        cream=pm("#EFE6CF", .5), jade=pm("#5E9C84", .45, coat=.3), steel=pm("#C9D0D6", .32, .9), iron=pm("#2A2B2E", .5, .6),
        wood=pm("#C89A62", .6), woodd=pm("#6B4426", .6), red=pm("#C8372D", .4, coat=.4), white=pm("#F4F2EC", .3, coat=.5),
        marble=pm("#ECE9E2", .25, coat=.4), rice=pm("#F3EBD2", .8), chick=pm("#EBD2A8", .55), cuke=pm("#4E9A4A", .45),
        cukel=pm("#BFDD9A", .5), chilli=pm("#D5281E", .4), noodle=pm("#E8C25A", .6), dark=pm("#4A2C1A", .55),
        soup=pm("#E8862E", .3), kopi=pm("#5A3520", .25), flame=pm("#FF7A1A", .5, emit=14), ember=pm("#FF5A14", .6, emit=4),
        brown=pm("#9A5B2C", .6), toast=pm("#C98A45", .7), kaya=pm("#8FA63C", .5), egg=pm("#F7F1DC", .4), yolk=pm("#F2B21B", .4),
        prawn=pm("#F08A5B", .45), blue=pm("#2F7FD6", .4, coat=.4), yellow=pm("#F2B21B", .45), water=pm("#7FC4D9", .1),
        black=pm("#17171A", .4), peanut=pm("#A8672E", .7), bluec=pm("#3A6FB0", .45), gold=pm("#D9A93A", .3, .9))


def cyl(loc, r, h, m, rot=(0, 0, 0), s=(1, 1, 1), bevel=.012, verts=40):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = s
    if bevel:
        md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 3
        o.modifiers.new("w", "WEIGHTED_NORMAL")
    return K._fin(o, m, None)


def ball(loc, r, m, s=(1, 1, 1)): return K.ball(None, loc, r, m, s)
def box(loc, size, m, bevel=.02, rot=(0, 0, 0)): return K.rbox(None, loc, size, m, bevel, rot)


def bowl(loc, r, m, depth=.55):
    return K.shell(None, (loc[0], loc[1], loc[2] + r * depth), r, (1, 1, depth), m, lambda x, y, z: z < .02, .02)


# ---------------------------------------------------------------- dishes (base at loc, plate radius about .22)
def plate(c, m, r=.22):
    cyl((c[0], c[1], c[2] + .015), r, .03, m["white"], bevel=.01); cyl((c[0], c[1], c[2] + .032), r * .72, .006, m["white"], bevel=.002)


def chicken_rice(c, m):
    plate(c, m); x, y, z = c
    ball((x - .05, y + .02, z + .035), .12, m["rice"], (1, 1, .6))
    for i in range(3): box((x + .09, y + .08 - .07 * i, z + .06), (.16, .055, .04), m["chick"], .014)
    for i in range(3): cyl((x - .1 + .05 * i, y - .14, z + .045), .035, .012, m["cukel"], bevel=.003)
    ball((x - .15, y + .12, z + .045), .03, m["chilli"], (1, 1, .6))


def ckt(c, m):
    plate(c, m); x, y, z = c
    ball((x, y, z + .04), .15, m["dark"], (1, .95, .42))
    for dx, dy in ((.06, .04), (-.07, .03), (0, -.07)): ball((x + dx, y + dy, z + .1), .035, m["prawn"], (1.3, .8, .7))
    for dx, dy in ((.02, .08), (-.05, -.05), (.08, -.04), (-.02, .0)): ball((x + dx, y + dy, z + .095), .02, m["cuke"], (1.6, .6, .5))


def satay(c, m):
    plate(c, m); x, y, z = c
    for i in range(3):
        yy = y + .08 - .07 * i
        cyl((x - .02, yy, z + .05), .006, .34, m["wood"], rot=(0, rad(90), 0), bevel=0)
        for k in range(3): ball((x - .1 + .06 * k, yy, z + .055), .03, m["brown"], (1.1, .8, .7))
    cyl((x + .13, y - .1, z + .05), .05, .035, m["white"], bevel=.006); cyl((x + .13, y - .1, z + .066), .04, .006, m["peanut"], bevel=0)


def laksa(c, m):
    x, y, z = c; bowl(c, .2, m["white"]); cyl((x, y, z + .085), .17, .01, m["soup"], bevel=0)
    for i in range(5):
        a = rad(72 * i)
        bpy.ops.mesh.primitive_torus_add(major_radius=.05, minor_radius=.012, location=(x + .06 * math.cos(a), y + .06 * math.sin(a), z + .092))
        K._fin(bpy.context.object, m["noodle"], None)
    ball((x + .07, y + .05, z + .1), .04, m["egg"], (1, 1, .6)); ball((x + .07, y + .05, z + .12), .018, m["yolk"], (1, 1, .5))
    ball((x - .07, y - .05, z + .1), .03, m["prawn"], (1.3, .8, .7)); ball((x, y - .08, z + .1), .02, m["cuke"], (1.6, .7, .5))


def rojak(c, m):
    x, y, z = c; bowl(c, .2, m["woodd"]); cyl((x, y, z + .08), .165, .01, m["dark"], bevel=0)
    for i, (dx, dy, k) in enumerate(((.06, .04, "cukel"), (-.06, .05, "toast"), (0, -.07, "yellow"), (-.08, -.03, "cukel"), (.08, -.05, "toast"), (0, .02, "yellow"))):
        box((x + dx, y + dy, z + .1), (.07, .06, .05), m[k], .012, (rad(12 * i), 0, rad(30 * i)))
    for dx, dy in ((.03, .09), (-.03, -.02), (.09, .0)): ball((x + dx, y + dy, z + .13), .012, m["peanut"])


def kaya_toast(c, m):
    plate(c, m); x, y, z = c
    for dx in (-.115, .02):
        box((x + dx, y + .03, z + .055), (.12, .15, .025), m["toast"], .008)
        box((x + dx, y + .03, z + .075), (.105, .135, .012), m["kaya"], .004)
        box((x + dx, y + .03, z + .092), (.12, .15, .025), m["toast"], .008)
    cyl((x + .13, y - .08, z + .06), .055, .06, m["white"], bevel=.008); cyl((x + .13, y - .08, z + .088), .045, .006, m["kopi"], bevel=0)


def kopi(c, m):
    x, y, z = c
    cyl((x, y, z + .01), .15, .02, m["white"], bevel=.006)
    cyl((x, y, z + .085), .095, .13, m["white"], bevel=.012); cyl((x, y, z + .148), .08, .006, m["kopi"], bevel=0)
    bpy.ops.mesh.primitive_torus_add(major_radius=.04, minor_radius=.012, location=(x + .11, y, z + .085), rotation=(rad(90), 0, 0))
    K._fin(bpy.context.object, m["white"], None)
    cyl((x, y, z + .1), .097, .02, m["jade"], bevel=0)


DISHES = dict(chicken_rice=chicken_rice, ckt=ckt, satay=satay, laksa=laksa, rojak=rojak, kaya_toast=kaya_toast, kopi=kopi)


# ---------------------------------------------------------------- kitchen parts
def counter(cx, cy, w, d, m, top="steel", trim="jade"):
    box((cx, cy, .43), (w, d, .86), m["cream"], .03); box((cx, cy, .1), (w + .012, d + .012, .2), m[trim], .02)
    box((cx, cy, .89), (w + .06, d + .06, .06), m[top], .015)


def wok(x, y, m, burning=False):
    cyl((x, y, TOP + .04), .34, .08, m["iron"]); bpy.ops.mesh.primitive_torus_add(major_radius=.24, minor_radius=.04, location=(x, y, TOP + .09))
    K._fin(bpy.context.object, m["flame"], None)
    K.shell(None, (x, y, TOP + .36), .42, (1, 1, .58), m["iron"], lambda a, b, c: c < .02, .03)
    cyl((x + .62, y, TOP + .36), .04, .5, m["woodd"], rot=(0, rad(90), 0), bevel=.006)
    for i, (dx, dy, k) in enumerate(((-.1, .05, "noodle"), (.1, -.06, "cuke"), (.07, .12, "prawn"), (-.08, -.12, "dark"), (0, 0, "noodle"))):
        ball((x + dx, y + dy, TOP + .2), .1, m["black" if burning else k], (1, 1, .6))
    if burning:
        for dx, dy, h in ((0, 0, .5), (-.14, .06, .34), (.13, -.05, .38), (.02, .14, .3)):
            bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=.11, radius2=0, depth=h, location=(x + dx, y + dy, TOP + .3 + h / 2))
            K._fin(bpy.context.object, m["ember"], None)
    bpy.ops.object.light_add(type='POINT', location=(x, y - .2, TOP + .8)); p = bpy.context.object
    p.data.energy = 90 if burning else 30; p.data.color = (1, .5, .2)


def chop_board(x, y, m, item=True):
    box((x, y, TOP + .035), (.7, .5, .06), m["wood"], .02)
    if item:
        ball((x - .12, y + .04, TOP + .12), .06, m["cuke"], (2.6, 1, 1))
        for dx, dy in ((.14, .1), (.22, -.02), (.12, -.12)): cyl((x + dx, y + dy, TOP + .075), .055, .02, m["cukel"], bevel=.004)
    box((x + .1, y - .2, TOP + .075), (.3, .09, .012), m["steel"], .003, (0, 0, rad(-12))); box((x - .1, y - .16, TOP + .08), (.14, .035, .03), m["woodd"], .008, (0, 0, rad(-12)))


def rice_cooker(x, y, m):
    cyl((x, y, TOP + .2), .3, .36, m["white"], bevel=.03); cyl((x, y, TOP + .16), .305, .08, m["red"], bevel=0)
    ball((x, y, TOP + .38), .29, m["white"], (1, 1, .38)); ball((x, y, TOP + .5), .05, m["black"], (1, 1, .6))
    ball((x, y - .3, TOP + .2), .03, m["ember"])


def soup_pot(x, y, m):
    cyl((x, y, TOP + .26), .34, .5, m["steel"], bevel=.02); cyl((x, y, TOP + .5), .31, .02, m["soup"], bevel=0)
    for sx in (-1, 1): ball((x + sx * .37, y, TOP + .4), .05, m["iron"], (1, 1.6, .6))
    K.limb(None, (x + .1, y - .05, TOP + .52), (x + .42, y - .3, TOP + .85), .018, .018, m["steel"])


def grill(x, y, m):
    box((x, y, TOP + .09), (.86, .58, .18), m["iron"], .02); box((x, y, TOP + .175), (.76, .48, .02), m["ember"], .004)
    for i in range(8): cyl((x - .35 + .1 * i, y, TOP + .2), .008, .5, m["steel"], rot=(rad(90), 0, 0), bevel=0)
    for i in range(4):
        xx = x - .24 + .16 * i
        cyl((xx, y - .06, TOP + .225), .006, .56, m["wood"], rot=(rad(90), 0, 0), bevel=0)
        for k in range(3): ball((xx, y + .16 - .09 * k, TOP + .235), .04, m["brown"], (.8, 1.1, .7))


def drinks(x, y, m):
    cyl((x - .22, y + .08, TOP + .22), .16, .42, m["steel"], bevel=.02); cyl((x - .22, y + .08, TOP + .45), .12, .04, m["steel"], bevel=.01)
    K.limb(None, (x - .1, y + .08, TOP + .2), (x + .1, y + .08, TOP + .42), .03, .018, m["steel"])
    for i, dx in enumerate((.12, .34)):
        cyl((x + dx, y - .12, TOP + .06), .09, .11, m["white"], bevel=.01); cyl((x + dx, y - .12, TOP + .118), .075, .006, m["kopi"], bevel=0)
        cyl((x + dx, y - .12, TOP + .07), .092, .02, m["jade"], bevel=0)
    cyl((x + .32, y + .2, TOP + .1), .08, .2, m["red"], bevel=.01); cyl((x + .32, y + .2, TOP + .1), .082, .09, m["white"], bevel=0)


def plate_stack(x, y, m, n=5):
    for i in range(n): cyl((x, y, TOP + .015 + .028 * i), .2, .025, m["white"], bevel=.008)


def crate(x, y, m, kind):
    box((x, y, TOP + .15), (.78, .7, .3), m["wood"], .02); box((x, y, TOP + .27), (.68, .6, .08), m["woodd"], .01)
    pts = ((-.18, .12), (.16, .14), (-.05, -.05), (.2, -.12), (-.2, -.15), (.02, .18))
    for i, (dx, dy) in enumerate(pts):
        p = (x + dx, y + dy, TOP + .34)
        if kind == "chicken": ball(p, .11, m["chick"], (1.2, .9, .7))
        elif kind == "cucumber": ball(p, .06, m["cuke"], (2.6, 1, 1))
        elif kind == "noodle":
            bpy.ops.mesh.primitive_torus_add(major_radius=.1, minor_radius=.03, location=p); K._fin(bpy.context.object, m["noodle"], None)
        elif kind == "prawn": ball(p, .08, m["prawn"], (1.4, .8, .7))
        elif kind == "bread": box(p, (.2, .16, .12), m["toast"], .03, (0, 0, rad(40 * i)))


def sink(cx, cy, m):
    box((cx, cy - .45, TOP + .0), (.62, .7, .03), m["iron"], .01); box((cx, cy - .45, TOP + .012), (.54, .62, .02), m["water"], .01)
    cyl((cx - .34, cy - .45, TOP + .16), .03, .3, m["steel"], bevel=.005)
    K.limb(None, (cx - .34, cy - .45, TOP + .3), (cx - .14, cy - .45, TOP + .3), .025, .025, m["steel"])
    box((cx, cy + .55, TOP + .03), (.6, .7, .04), m["steel"], .01)
    for i in range(5): cyl((cx, cy + .3 + .12 * i, TOP + .2), .17, .02, m["white"], rot=(rad(72), 0, 0), bevel=.006)


def serving(cx, cy, m, trim="red"):
    ball((cx - .1, cy + .9, TOP + .04), .1, m["gold"], (1, 1, .8)); cyl((cx - .1, cy + .9, TOP + .12), .02, .04, m["gold"], bevel=0)
    for i in range(3):
        box((cx, cy - 1.0 + .05 * i, TOP + .14 + .0 * i), (.3, .2, .28), m["brown"], .03, (0, 0, rad(12 * i)))
    box((cx + .42, cy, 1.45), (.1, 2.6, .5), m[trim], .03); box((cx + .36, cy, 1.45), (.02, 2.3, .34), m["white"], .01)
    for yy in (-1.25, 1.25): cyl((cx + .42, cy + yy, .75), .04, 1.5, m["steel"], bevel=0)


def bin_(x, y, m): cyl((x, y, .32), .3, .64, m["jade"], bevel=.03); cyl((x, y, .66), .32, .06, m["iron"], bevel=.02)


def extinguisher(x, y, m):
    cyl((x, y, .3), .13, .6, m["red"], bevel=.04); cyl((x, y, .66), .05, .14, m["black"], bevel=.01)
    K.limb(None, (x, y, .7), (x + .16, y - .06, .5), .02, .02, m["black"])


def table(x, y, m):
    cyl((x, y, .74), .62, .06, m["marble"], bevel=.02); cyl((x, y, .37), .07, .72, m["woodd"], bevel=.01); cyl((x, y, .03), .3, .05, m["woodd"], bevel=.01)
    for i in range(4):
        a = rad(45 + 90 * i); cyl((x + .95 * math.cos(a), y + .95 * math.sin(a), .22), .21, .44, m["red"], bevel=.03)


def wall(m, banners=()):
    box((0, 5.15, .9), (17.4, .24, 1.8), m["cream"], .01); box((0, 5.13, .36), (17.4, .26, .72), m["jade"], .01)
    for i, (x, k) in enumerate(((-5.6, "red"), (-2.0, "yellow"), (1.8, "red"), (5.4, "yellow"))):
        box((x, 5.0, 1.3), (2.4, .06, .66), m[k], .02)
        for j in range(3): box((x - .72 + .72 * j, 4.96, 1.3), (.56, .03, .44), m["white"], .01)
    for x, k in banners: box((x, 5.0, 1.3), (1.2, .08, .7), m[k], .02)
    cyl((0, 5.0, 1.42), .28, .05, m["white"], rot=(rad(90), 0, 0), bevel=.01)


def cook(i, look, loc, rot, pose="idle", colour=None):
    return K.cook(STYLE, look, pose, rot, (loc[0], loc[1], 0), apron=colour or K.PLAYER[i], same_body=True)


def held(loc, rot, fn, m, dist=.52, z=.6):
    a = rad(rot); f = Vector((math.sin(a), -math.cos(a), 0))
    fn((loc[0] + f.x * dist, loc[1] + f.y * dist, z), m)


def coop():
    m = M(); wall(m)
    counter(0, 4.4, 15.2, 1.0, m)
    for x, k in ((-6.9, "chicken"), (-5.9, "cucumber"), (-4.9, "noodle")): crate(x, 4.4, m, k)
    rice_cooker(-3.2, 4.4, m); wok(-1.4, 4.4, m); wok(0.6, 4.4, m, burning=True); soup_pot(2.5, 4.4, m); grill(4.4, 4.4, m); drinks(6.4, 4.4, m)
    counter(0, 0.7, 7.0, 1.0, m, top="marble")
    chop_board(-2.6, 0.7, m); chop_board(-1.2, 0.7, m, item=False); plate_stack(0.3, 0.75, m); chicken_rice((1.3, 0.7, TOP), m); laksa((2.2, 0.7, TOP), m); ckt((3.0, 0.7, TOP), m); ball((-0.5, 0.75, TOP + .07), .08, m["prawn"], (1.4, .8, .7))
    counter(-7.45, 0.2, 1.0, 3.4, m); sink(-7.45, 0.2, m)
    counter(7.45, 0.2, 1.0, 3.4, m, top="wood", trim="red"); serving(7.45, 0.2, m); satay((7.4, 0.3, TOP), m)
    bin_(-5.6, -1.9, m); extinguisher(5.7, 3.3, m)
    for x in (-5.2, 0, 5.2): table(x, -4.15, m)
    cook(0, "uncle", (-1.4, 3.3), 180, "act")
    cook(1, "auntie", (-2.6, 1.75), 0, "act")
    cook(2, "cap", (5.3, -0.4), 90, "carry"); held((5.3, -0.4), 90, chicken_rice, m)
    cook(3, "makcik", (-6.4, -0.2), -90, "act")
    cook(4, "bun", (-4.6, 2.7), 55, "walk")
    cook(5, "specs", (3.3, -2.3), -90, "throw")
    ball((0.7, -2.3, 2.1), .11, m["cuke"], (2.4, 1, 1))
    cook(6, "turban", (-2.0, -2.3), 90, "catch")
    cook(7, "songkok", (6.4, 3.3), 180, "act")


def versus():
    m = M(); wall(m, banners=((-7.2, "red"), (7.2, "blue")))
    counter(0, 1.2, 1.0, 5.6, m, top="wood", trim="yellow")
    crate(0, 2.6, m, "prawn"); plate_stack(0, 0.2, m, 3)
    for s, trim, col in ((-1, "red", "#D9483B"), (1, "blue", "#2F7FD6")):
        counter(s * 4.5, 4.4, 6.2, 1.0, m, trim=trim)
        crate(s * 2.2, 4.4, m, "chicken"); crate(s * 3.2, 4.4, m, "cucumber"); rice_cooker(s * 4.5, 4.4, m); wok(s * 5.8 - .2, 4.4, m); soup_pot(s * 7.0, 4.4, m)
        counter(s * 3.9, 0.9, 3.2, 1.0, m, top="marble", trim=trim)
        chop_board(s * 3.3, 0.9, m); plate_stack(s * 4.6, 0.95, m, 4)
        counter(s * 7.45, 0.0, 1.0, 3.0, m, top="wood", trim=trim)
        chicken_rice((s * 7.4, 0.2, TOP), m); ball((s * 7.4, -.9, TOP + .04), .1, m["gold"], (1, 1, .8))
        counter(s * 3.2, -2.8, 2.6, 1.0, m, trim=trim); box((s * 3.2, -2.8, TOP), (.9, .6, .03), m["water"], .01); plate_stack(s * 4.0, -2.8, m, 2)
        bin_(s * 6.3, -2.9, m)
    for x in (-5.4, 5.4): table(x, -4.6, m)
    L = [("uncle", (-5.6, 3.3), 180, "act"), ("auntie", (-3.3, 2.0), 0, "act"), ("cap", (-6.3, 0.5), -90, "carry"), ("makcik", (-1.3, -0.6), 90, "carry")]
    Rt = [("bun", (5.6, 3.3), 180, "act"), ("specs", (3.3, 2.0), 0, "act"), ("turban", (6.3, -0.9), 90, "walk"), ("songkok", (1.4, 2.5), -90, "catch")]
    for i, (lk, loc, rot, pose) in enumerate(L): cook(i, lk, loc, rot, pose, "#D9483B")
    for i, (lk, loc, rot, pose) in enumerate(Rt): cook(i, lk, loc, rot, pose, "#2F7FD6")
    held((-6.3, 0.5), -90, chicken_rice, m)
    held((-1.3, -0.6), 90, lambda c, mm: ball((c[0], c[1], c[2] + .07), .08, mm["prawn"], (1.4, .8, .7)), m)


def heads8():
    for i, lk in enumerate(K.CAST8): K.cook("toy", lk, "idle", 14 - 4 * i, (-5.6 + 1.6 * i, 0, 0), apron=K.PLAYER[i], same_body=True)


def run(name, build, w, h, target, elev, scale, transparent=False, floor=True):
    if ONLY and not any(name.startswith(p) for p in ONLY): return
    bpy.ops.wm.read_factory_settings(use_empty=True); K.STYLE = STYLE
    build()
    if floor: K.floor(catcher=transparent)
    K.lights(); K.render(name, w, h, target, elev, scale, transparent)


if __name__ == "__main__":
    run("tr_coop", coop, 1920, 1080, (0, .75, 0), 50, 16.0)
    run("tr_versus", versus, 1920, 1080, (0, .75, 0), 50, 16.0)
    run("heads8", heads8, 1920, 420, (0, 0, .78), 24, 13.2)
    for nm, fn in DISHES.items():
        run("dish_" + nm, lambda fn=fn: fn((0, 0, 0), M()), 320, 320, (0, 0, .06), 50, .62, transparent=True)
    print("VISION DONE")
