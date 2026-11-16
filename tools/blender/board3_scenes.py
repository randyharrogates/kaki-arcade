"""Design gate board 3 (big-screen layouts): the co-op and versus kitchens in the decided art
style (board 1 option C: matte, daylight, camera tilted 60 degrees), without any overlay.

Run: blender -b --factory-startup -P tools/blender/board3_scenes.py -- /abs/outdir
"""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kalib as K
import vision_scenes as VS

for name, build in (("b3_coop", VS.coop), ("b3_versus", VS.versus)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    VS.STYLE = "matte"; K.STYLE = "matte"
    build(); K.floor(); K.lights()
    K.render(name, 1920, 1080, (0, .45, 0), 60, 16.0)
print("BOARD3 DONE")
