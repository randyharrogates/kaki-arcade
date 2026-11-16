"""Build design gate board 1 (3D art style) from the renders made by tools/blender/board1_style.py.

Run: python3 tools/boards/build_board1.py <render dir> <out html>
"""
import base64, io, os, sys
from PIL import Image

R, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))


def uri(name, q):
    b = io.BytesIO(); Image.open(os.path.join(R, name + ".png")).convert("RGB").save(b, "JPEG", quality=q, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()


html = open(os.path.join(HERE, "board1_template.html")).read()
for L in "ABCD":
    html = html.replace("{{full_%s}}" % L, uri(f"b1_{L}_full", 82)).replace("{{close_%s}}" % L, uri(f"b1_{L}_close", 84))
assert "{{" not in html
open(OUT, "w").write(html)
print("wrote", OUT, round(len(html) / 1e6, 2), "MB")
