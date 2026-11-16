"""Build the end-goal vision board from the renders made by vision_scenes.py.

Run: python3 tools/blender/vision_compose.py <render dir> <out html>
"""
import base64, io, os, sys
from PIL import Image

R, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))


def img(name):
    return Image.open(os.path.join(R, name + ".png"))


def uri(im, fmt="JPEG", q=84):
    b = io.BytesIO()
    if fmt == "JPEG": im.convert("RGB").save(b, "JPEG", quality=q, optimize=True)
    else: im.save(b, "PNG", optimize=True)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(b.getvalue()).decode()


images = {
    "tr_coop": uri(img("tr_coop")),
    "tr_versus": uri(img("tr_versus")),
    "tr_tile": uri(img("tr_coop").crop((420, 120, 1500, 788)).resize((647, 400), Image.LANCZOS), q=80),
    "heads8": uri(img("heads8")),
}
for d in ("chicken_rice", "ckt", "satay", "laksa", "rojak", "kaya_toast", "kopi"):
    im = img("dish_" + d).convert("RGBA").resize((220, 220), Image.LANCZOS)
    # drop the faint ambient shading the shadow catcher leaves across the cell
    im.putalpha(im.getchannel("A").point(lambda a: 0 if a < 14 else int((a - 14) * 255 / 241)))
    images["dish_" + d] = uri(im, "PNG")

html = open(os.path.join(HERE, "vision_template.html")).read()
for k, v in images.items():
    assert "{{" + k + "}}" in html, k
    html = html.replace("{{" + k + "}}", v)
assert "{{" not in html, html[html.index("{{"):][:40]
open(OUT, "w").write(html)
print("wrote", OUT, round(len(html) / 1e6, 2), "MB")
