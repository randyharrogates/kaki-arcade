"""Design gate board 4 (phone controller): the eight cook characters in the decided matte style,
front on, on a transparent background, for the cook picker.

Run: blender -b --factory-startup -P tools/blender/board4_scenes.py -- /abs/outdir
"""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kalib as K

K.OUT = sys.argv[sys.argv.index("--") + 1]
K.SAMPLES = int(os.environ.get("SAMPLES", "64"))

bpy.ops.wm.read_factory_settings(use_empty=True)
K.STYLE = "matte"
for i, lk in enumerate(K.CAST8):
    K.cook("matte", lk, "idle", 0, (-5.6 + 1.6 * i, 0, 0), apron=K.PLAYER[i], same_body=True)
K.floor(catcher=True); K.lights()
K.render("b4_cast8", 1920, 420, (0, 0, .78), 24, 13.2, True)
print("BOARD4 DONE")
