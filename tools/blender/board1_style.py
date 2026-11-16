"""Design gate board 1 (3D art style): the same kopitiam kitchen and cooks rendered three ways,
varying finish (glossy or matte), lighting (day or evening) and camera tilt.

Run: blender -b --factory-startup -P tools/blender/board1_style.py -- /abs/outdir
Env: SAMPLES (default 64), ONLY (comma list of option letters, e.g. A,C).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kalib as K
import vision_scenes as VS

ONLY = [s for s in os.environ.get("ONLY", "").split(",") if s]
rad = math.radians


def lights_evening():
    sc = bpy.context.scene
    bpy.ops.object.light_add(type='SUN', location=(6, -4, 5)); s = bpy.context.object
    s.data.energy = 2.2; s.data.color = (1, .68, .42); s.data.angle = rad(10); s.rotation_euler = (rad(62), 0, rad(48))
    bpy.ops.object.light_add(type='AREA', location=(-5, -4, 6)); a = bpy.context.object
    a.data.energy = 140; a.data.size = 7; a.data.color = (.62, .74, 1); a.rotation_euler = (rad(42), 0, rad(-52))
    for x in (-5.2, 0, 5.2):
        bpy.ops.object.light_add(type='POINT', location=(x, -4.15, 2.2)); p = bpy.context.object
        p.data.energy = 160; p.data.color = (1, .7, .4); p.data.shadow_soft_size = .4
    for x in (-4, 0, 4):
        bpy.ops.object.light_add(type='POINT', location=(x, 2.6, 2.6)); p = bpy.context.object
        p.data.energy = 220; p.data.color = (1, .82, .6); p.data.shadow_soft_size = .5
    wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True
    bg = wd.node_tree.nodes["Background"]; bg.inputs[0].default_value = (.35, .4, .6, 1); bg.inputs[1].default_value = .16


# letter: (finish, lighting, tilt in degrees, look-at y so the kitchen stays framed)
OPTIONS = {"A": ("toy", "day", 50, .75), "B": ("matte", "evening", 50, .75), "C": ("matte", "day", 60, .45), "D": ("toy", "day", 42, 1.0)}
for letter, (finish, light, tilt, ty) in OPTIONS.items():
    if ONLY and letter not in ONLY: continue
    for name, w, h, target, scale in ((f"b1_{letter}_full", 1920, 1080, (0, ty, 0), 16.0), (f"b1_{letter}_close", 1294, 800, (-2.4, 2.6, .6), 6.2)):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        VS.STYLE = finish; K.STYLE = finish
        VS.coop(); K.floor()
        K.lights() if light == "day" else lights_evening()
        K.render(name, w, h, target, tilt, scale)
print("BOARD1 DONE")
