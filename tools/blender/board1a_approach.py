"""Design gate board 1A (modelling approach): the same cook built by script at three levels of
stylisation, a cast of four characters, a CC0 base model for comparison, and a placeholder
kitchen background. Renders are composed into frames by board1a_compose.py.

Run: blender -b --factory-startup -P tools/blender/board1a_approach.py -- /abs/outdir
Env: SAMPLES (default 64), ONLY (comma list of job-name prefixes), CC0_GLB (path to a .glb).
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1]
SAMPLES = int(os.environ.get("SAMPLES", "64"))
ONLY = [s for s in os.environ.get("ONLY", "").split(",") if s]
CC0 = os.environ.get("CC0_GLB", "")
STYLE = "toy"
rad = math.radians


def hexc(h):
    h = h.lstrip("#")
    return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))


# ---------------------------------------------------------------- materials
def mat(col, kind="hard"):
    """kind: skin | cloth | hard | gloss | hair. The finish depends on the board option."""
    m = bpy.data.materials.new("m"); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hexc(col), 1)

    def setv(name, v):
        if name in b.inputs: b.inputs[name].default_value = v

    def bump(scale, strength):
        n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = 4
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = strength
        nt.links.new(n.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])

    if kind == "gloss":
        setv("Roughness", 0.12); setv("Coat Weight", 1.0)
    elif STYLE == "toy":
        setv("Roughness", 0.42 if kind == "skin" else 0.3); setv("Coat Weight", 0.25 if kind == "skin" else 0.6)
    elif STYLE == "clay":
        setv("Roughness", 0.9); setv("Subsurface Weight", 0.12); setv("Subsurface Scale", 0.05)
        bump(22, 0.22)
    else:
        if kind == "skin":
            setv("Roughness", 0.5); setv("Subsurface Weight", 0.25); setv("Subsurface Scale", 0.02)
        elif kind in ("cloth", "hair"):
            setv("Roughness", 0.85); bump(260, 0.12)
        else:
            setv("Roughness", 0.45)
    return m


# ---------------------------------------------------------------- geometry
def _fin(o, m, root, smooth=True):
    o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    o.parent = root
    return o


def ball(root, loc, r, m, s=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1, location=loc)
    o = bpy.context.object; o.scale = (r * s[0], r * s[1], r * s[2])
    return _fin(o, m, root)


def limb(root, a, b, ra, rb, m):
    a = Vector(a); b = Vector(b); d = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=ra, radius2=rb, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); _fin(o, m, root)
    ball(root, a, ra, m); ball(root, b, rb, m)


def shell(root, loc, r, s, m, keep, thick=0.02):
    """Part of a sphere surface (clothing, hair) that hugs the ball it sits on."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1, location=loc)
    o = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co.x, v.co.y, v.co.z)], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.scale = (r * s[0], r * s[1], r * s[2])
    md = o.modifiers.new("s", "SOLIDIFY"); md.thickness = thick / r; md.offset = 1
    return _fin(o, m, root)


def rbox(root, loc, size, m, bevel=0.02, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot); o = bpy.context.object
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2); bpy.ops.object.transform_apply(scale=True)
    md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 5
    o.modifiers.new("w", "WEIGHTED_NORMAL")
    return _fin(o, m, root)


def new_root(name):
    bpy.ops.object.empty_add(location=(0, 0, 0)); o = bpy.context.object; o.name = name
    return o


# ---------------------------------------------------------------- stylised cook (toy, clay)
PROPS = {
    "toy": dict(head_r=.36, squash=.92, sink=.62, rx=.30, ry=.26, rz=.30, leg=.16, leg_r=.095, arm=.24,
                arm_r=.07, hand_r=.09, eye=.115, height=1.0),
    "clay": dict(head_r=.30, squash=1.0, sink=.74, rx=.25, ry=.22, rz=.34, leg=.30, leg_r=.08, arm=.34,
                 arm_r=.06, hand_r=.078, eye=.085, height=1.12),
}
LOOKS = {
    "cap":    dict(skin="#E8B58C", top="#F2D46B", bottom="#3F5E8C", shoe="#2E2E33", hair="#2B211C", head="cap", accent="#D9483B"),
    "uncle":  dict(skin="#D9A074", top="#F4F1E8", bottom="#4E6FA3", shoe="#3A6FB0", hair="#B9B6AE", head="uncle", accent="#D9483B",
                   tweak=dict(rx=.34, ry=.30)),
    "auntie": dict(skin="#F0C4A0", top="#E9A0B4", bottom="#6B4E7A", shoe="#7A3B4A", hair="#3A2A26", head="perm", accent="#D9483B",
                   tweak=dict(leg=.12, rz=.31)),
    "makcik": dict(skin="#C68E64", top="#4FA39A", bottom="#2F6F68", shoe="#2E2E33", hair="#E8DCC4", head="tudung", accent="#D9483B",
                   skirt=True),
}
PLAYER = ["#D9483B", "#2F7FD6", "#F2B21B", "#39A85B", "#8E5BD0", "#F07C2A", "#22A6A6", "#D95C9A"]


def stylised(root, style, look, pose="idle", apron=None, same_body=False):
    P = dict(PROPS[style]); L = LOOKS[look]
    if not same_body: P.update(L.get("tweak", {}))
    skin = mat(L["skin"], "skin"); top = mat(L["top"], "cloth"); bottom = mat(L["bottom"], "cloth")
    shoe = mat(L["shoe"], "hard"); hair = mat(L["hair"], "hair"); acc = mat(apron or L["accent"], "cloth")
    black = mat("#15120F", "gloss"); blush = mat("#E98C86", "skin"); white = mat("#F4F1E8", "cloth")
    if same_body: top = mat("#F4F1E8", "cloth"); bottom = mat("#3F5E8C", "cloth"); shoe = mat("#2E2E33", "hard")
    hr = P["head_r"]; hip_z = .07 + P["leg"]; bz = hip_z + P["rz"] * .82; topz = bz + P["rz"]
    hz = topz + hr * P["sink"]; hs = (1, .95, P["squash"])
    sw = rad(34) if pose == "walk" else 0
    skirt = L.get("skirt") and not same_body

    for side, sgn in ((-1, 1), (1, -1)):
        a = sgn * sw
        hip = Vector((side * P["rx"] * .45, 0, hip_z + .04))
        foot = hip + Vector((0, -math.sin(a) * P["leg"], -math.cos(a) * P["leg"]))
        limb(root, hip, foot, P["leg_r"], P["leg_r"] * .9, bottom if skirt else skin)
        ball(root, foot + Vector((0, -.045, -.02)), P["leg_r"] * 1.3, shoe, (1, 1.5, .72))
        # arm swings against the leg on the same side
        sh = Vector((side * P["rx"] * .9, 0, bz + P["rz"] * .40))
        d = Vector((side * .38, math.sin(a) * .9, -1)).normalized() * P["arm"]
        ball(root, sh, P["arm_r"] * 1.35, top)
        limb(root, sh, sh + d, P["arm_r"], P["arm_r"] * .92, skin)
        ball(root, sh + d * 1.12, P["hand_r"], skin)

    ball(root, (0, 0, bz), 1, top, (P["rx"], P["ry"], P["rz"]))
    if skirt:
        limb(root, (0, 0, bz - P["rz"] * .2), (0, 0, .16), P["rx"] * .92, P["rx"] * 1.08, bottom)
    else:
        shell(root, (0, 0, bz), 1.03, (P["rx"], P["ry"], P["rz"]), bottom, lambda x, y, z: z < -.3)
    shell(root, (0, 0, bz), 1.07, (P["rx"], P["ry"], P["rz"]), acc,
          lambda x, y, z: y < -.22 and -.8 < z < .5 and abs(x) < .78, .018)

    # head and face
    ball(root, (0, 0, hz), hr, skin, hs)
    for side in (-1, 1):
        ball(root, (side * hr * .97, .02, hz - hr * .05), hr * .16, skin, (.6, 1, 1.2))
        ball(root, (side * hr * .37, -hr * .87, hz + hr * .03), hr * P["eye"], black, (1, .55, 1.15))
        ball(root, (side * hr * .58, -hr * .74, hz - hr * .2), hr * .13, blush, (1, .3, .65))
    ball(root, (0, -hr * .91, hz - hr * .26), hr * .045, mat("#7A2E2A", "skin"), (2.0, .5, .6))
    if style == "clay":
        ball(root, (0, -hr * .95, hz - hr * .08), hr * .09, skin)

    H = (0, 0, hz)
    kind = L["head"]
    if kind == "cap":
        shell(root, H, hr * 1.03, hs, hair, lambda x, y, z: z > .3 or (y > .15 and z > -.4))
        shell(root, H, hr * 1.08, hs, acc, lambda x, y, z: z > .5, .02)
        ball(root, (0, -hr * .86, hz + hr * .5), hr, acc, (.62, .5, .06))
    elif kind == "uncle":
        shell(root, H, hr * 1.04, hs, hair, lambda x, y, z: y > -.15 and -.35 < z < .45)
        ball(root, (0, -hr * .93, hz - hr * .17), hr * .1, hair, (2.4, .6, .55))  # moustache
        bpy.ops.mesh.primitive_torus_add(major_radius=P["rx"] * .62, minor_radius=.055, location=(0, 0, topz - .05))
        t = bpy.context.object; t.scale = (1, .95, .7); _fin(t, white, root)
        for side in (-1, 1):
            rbox(root, (side * P["rx"] * .5, -P["ry"] * .86, topz - .2), (.11, .04, .26), white, .015)
            rbox(root, (side * P["rx"] * .5, -P["ry"] * .88, topz - .29), (.115, .042, .03), mat("#C8372D", "cloth"), .008)
    elif kind == "perm":
        for el, n in ((70, 5), (35, 9), (0, 9)):
            for i in range(n):
                az = rad(360 * i / n + el)
                x = math.cos(rad(el)) * math.cos(az); y = math.cos(rad(el)) * math.sin(az); z = math.sin(rad(el))
                if y < -.45 and z < .55: continue
                ball(root, (x * hr * .92, y * hr * .9, hz + z * hr * .9), hr * .3, hair)
        ball(root, (0, 0, hz + hr * .86), hr * .32, hair)
    elif kind == "tudung":
        shell(root, H, hr * 1.1, hs, hair, lambda x, y, z: not (y < -.52 and abs(x) < .66 and -.6 < z < .52), .025)
        ball(root, (0, .01, topz - .02), 1, hair, (P["rx"] * .98, P["ry"] * 1.02, .2))


# ---------------------------------------------------------------- realistic-proportion cook
def realistic(root, pose="idle"):
    skin = mat("#E8B58C", "skin"); shirt = mat("#F2D46B", "cloth"); tro = mat("#3F5E8C", "cloth")
    shoe = mat("#2E2E33", "hard"); hair = mat("#2B211C", "hair"); acc = mat("#D9483B", "cloth")
    white = mat("#F4F1E8", "hard"); dark = mat("#15120F", "gloss")
    sw = rad(26) if pose == "walk" else 0
    for side, sgn in ((-1, 1), (1, -1)):
        a = sgn * sw
        hip = Vector((side * .095, 0, .93))
        knee = hip + Vector((0, -math.sin(a) * .43, -math.cos(a) * .43))
        kb = a - (rad(30) if (sw and sgn < 0) else rad(3))
        ank = knee + Vector((0, -math.sin(kb) * .42, -math.cos(kb) * .42))
        limb(root, hip, knee, .085, .062, tro); limb(root, knee, ank, .062, .046, tro)
        ball(root, ank + Vector((0, -.07, -.03)), .056, shoe, (1, 2.1, .8))
        sh = Vector((side * .2, 0, 1.45))
        b = -a * .8
        el = sh + Vector((side * .035, -math.sin(b) * .29, -math.cos(b) * .29))
        fb = b + rad(14)
        wr = el + Vector((0, -math.sin(fb) * .26, -math.cos(fb) * .26))
        ball(root, sh, .06, shirt)
        limb(root, sh, sh.lerp(el, .62), .056, .052, shirt)
        limb(root, sh.lerp(el, .6), el, .047, .042, skin); limb(root, el, wr, .042, .033, skin)
        ball(root, wr + Vector((0, -.012, -.06)), 1, skin, (.03, .045, .07))
    ball(root, (0, 0, .97), 1, tro, (.17, .118, .13))
    ball(root, (0, 0, 1.13), 1, shirt, (.166, .116, .17))
    ball(root, (0, 0, 1.33), 1, shirt, (.19, .125, .2))
    rbox(root, (0, -.128, 1.3), (.2, .02, .26), acc, .008, (rad(-4), 0, 0))
    rbox(root, (0, -.126, .98), (.3, .02, .52), acc, .008, (rad(3), 0, 0))
    limb(root, (0, 0, 1.47), (0, 0, 1.58), .05, .046, skin)
    hz = 1.68; hs = (.1, .115, .13)
    ball(root, (0, 0, hz), 1, skin, hs)
    for side in (-1, 1):
        ball(root, (side * .038, -.1, hz + .02), .017, white, (1, .6, .8))
        ball(root, (side * .038, -.109, hz + .02), .0085, dark, (1, .5, 1))
        ball(root, (side * .1, .005, hz), 1, skin, (.012, .024, .034))
        rbox(root, (side * .038, -.108, hz + .048), (.036, .008, .007), hair, .002)
    ball(root, (0, -.117, hz - .005), 1, skin, (.014, .02, .024))
    ball(root, (0, -.107, hz - .05), 1, mat("#9C4A44", "skin"), (.028, .008, .006))
    shell(root, (0, 0, hz), 1.04, hs, hair, lambda x, y, z: z > .3 or (y > .1 and z > -.5), .004)
    shell(root, (0, 0, hz), 1.1, hs, acc, lambda x, y, z: z > .42, .004)
    ball(root, (0, -.115, hz + .062), 1, acc, (.07, .055, .007))


def place(root, height_now, height, rot_z=0, loc=(0, 0, 0)):
    k = height / height_now
    root.scale = (k, k, k); root.rotation_euler = (0, 0, rad(rot_z)); root.location = loc


def cook(style, look="cap", pose="idle", rot=0, loc=(0, 0, 0), apron=None, same_body=False):
    root = new_root("cook")
    if style == "real":
        realistic(root, pose); place(root, 1.81, 1.38, rot, loc)
    else:
        P = PROPS[style]; stylised(root, style, look, pose, apron, same_body)
        hip = .07 + P["leg"]; h = hip + P["rz"] * 1.82 + P["head_r"] * (P["sink"] + P["squash"])
        place(root, h, P["height"], rot, loc)
    return root


def cc0(rot=0):
    bpy.ops.import_scene.gltf(filepath=CC0)
    objs = list(bpy.context.selected_objects)
    bpy.context.view_layer.update()
    zs = [(o.matrix_world @ Vector(c)).z for o in objs if o.type == 'MESH' for c in o.bound_box]
    root = new_root("cc0")
    for o in objs:
        if o.parent is None: o.parent = root
    place(root, max(zs) - min(zs), 1.0, rot)


# ---------------------------------------------------------------- scene
def floor(catcher=False, size=60):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0)); fl = bpy.context.object
    if catcher:
        fl.is_shadow_catcher = True; return
    m = bpy.data.materials.new("floor"); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = .42
    ck = nt.nodes.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = size * 4
    ck.inputs["Color1"].default_value = (*hexc("#E6DCC3"), 1); ck.inputs["Color2"].default_value = (*hexc("#A9C2A4"), 1)
    nt.links.new(ck.outputs["Color"], b.inputs["Base Color"]); fl.data.materials.append(m)


def lights():
    sc = bpy.context.scene
    bpy.ops.object.light_add(type='SUN', location=(4, -4, 8)); s = bpy.context.object
    s.data.energy = 3.6; s.data.color = (1, .95, .86); s.data.angle = rad(14)
    s.rotation_euler = (rad(42), 0, rad(28))
    bpy.ops.object.light_add(type='AREA', location=(-4, -3, 6)); a = bpy.context.object
    a.data.energy = 220; a.data.size = 6; a.data.color = (.85, .92, 1); a.rotation_euler = (rad(40), 0, rad(-50))
    wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True
    bg = wd.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (.75, .80, .90, 1); bg.inputs[1].default_value = .3


def render(name, w, h, target, elev, scale, transparent=False):
    sc = bpy.context.scene; e = rad(elev); t = Vector(target)
    loc = t + Vector((0, -math.cos(e), math.sin(e))) * 18
    bpy.ops.object.camera_add(location=loc); cam = bpy.context.object; sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = scale
    cam.rotation_euler = (t - loc).to_track_quat('-Z', 'Y').to_euler()
    sc.render.engine = 'CYCLES'
    try:
        pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = 'METAL'; pr.get_devices()
        for dv in pr.devices: dv.use = True
        sc.cycles.device = 'GPU'
    except Exception as ex:
        print("GPU setup skipped:", ex)
    sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    sc.render.film_transparent = transparent
    try: sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception as ex: print("look skipped", ex)
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA' if transparent else 'RGB'
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)


def job(name, build, w, h, target, elev, scale, transparent=False):
    global STYLE
    if ONLY and not any(name.startswith(p) for p in ONLY): return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    STYLE = name.split("_")[1] if name.split("_")[1] in ("toy", "clay", "real") else "toy"
    build(); floor(catcher=transparent); lights()
    render(name, w, h, target, elev, scale, transparent)


def kitchen():
    steel_d = mat("#5C6670", "hard"); steel = mat("#C9D0D6", "hard"); wood = mat("#B98A55", "hard")
    r = new_root("k")
    for x, y, w in ((-4.6, 4.3, 5.6), (4.6, 4.3, 5.6), (-3.4, 0.2, 3.0), (3.4, 0.2, 3.0), (0, -3.9, 4.0)):
        rbox(r, (x, y, .45), (w, 1.0, .9), steel_d, .04); rbox(r, (x, y, .93), (w + .08, 1.08, .06), steel, .02)
    rbox(r, (-7.4, 0.2, .45), (1.0, 3.0, .9), wood, .04)
    rbox(r, (7.4, 0.2, .45), (1.0, 3.0, .9), wood, .04)


SPR = dict(w=384, h=384, target=(0, 0, .42), elev=50, scale=1.6, transparent=True)
for st in ("toy", "clay", "real"):
    job(f"close_{st}", lambda st=st: cook(st, rot=28), 800, 800, (0, 0, .62), 30, 1.75)
    job(f"spr_{st}_idle", lambda st=st: cook(st), **SPR)
    job(f"spr_{st}_walk", lambda st=st: cook(st, pose="walk", rot=50), **SPR)

CAST = ["uncle", "auntie", "cap", "makcik"]
job("cast_full", lambda: [cook("toy", lk, rot=18 - 12 * i, loc=(-1.8 + 1.2 * i, 0, 0), apron=PLAYER[i]) for i, lk in enumerate(CAST)],
    1600, 620, (0, 0, .5), 30, 5.0)
job("cast_heads", lambda: [cook("toy", lk, rot=18 - 12 * i, loc=(-1.8 + 1.2 * i, 0, 0), apron=PLAYER[i], same_body=True) for i, lk in enumerate(CAST)],
    1600, 620, (0, 0, .5), 30, 5.0)
for i, lk in enumerate(CAST):
    job(f"sprcast_{lk}", lambda lk=lk, i=i: cook("toy", lk, pose="walk" if i % 2 else "idle", rot=50 if i % 2 else 0, apron=PLAYER[i]), **SPR)
if CC0:
    job("close_cc0", lambda: cc0(28), 800, 800, (0, 0, .62), 30, 1.75)
    job("sprcc0_idle", lambda: cc0(0), **SPR)
job("bg_kitchen", kitchen, 1920, 1080, (0, 0, 0), 50, 16.0)
print("BOARD1A DONE")
