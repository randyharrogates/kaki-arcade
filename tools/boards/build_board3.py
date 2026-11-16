"""Build design gate board 3 (big-screen layouts) from its template.

The template is generated once from board 2B's styles and then edited by hand.
Run: python3 tools/boards/build_board3.py <board 3 render dir> <dish render dir> <trivia photo jpg> <out html>
"""
import base64, io, os, sys
from PIL import Image

R, DISH, PHOTO, OUT = sys.argv[1:5]
HERE = os.path.dirname(os.path.abspath(__file__))


def uri(im, fmt="JPEG", q=80):
    b = io.BytesIO()
    if fmt == "JPEG": im.convert("RGB").save(b, "JPEG", quality=q, optimize=True)
    else: im.save(b, "PNG", optimize=True)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(b.getvalue()).decode()


def dish(name):
    im = Image.open(os.path.join(DISH, f"dish_{name}.png")).convert("RGBA").resize((180, 180), Image.LANCZOS)
    im.putalpha(im.getchannel("A").point(lambda a: 0 if a < 14 else int((a - 14) * 255 / 241)))
    return uri(im, "PNG")


images = {
    "coop": uri(Image.open(os.path.join(R, "b3_coop.png"))), "versus": uri(Image.open(os.path.join(R, "b3_versus.png"))),
    "photo": uri(Image.open(PHOTO).resize((720, 540), Image.LANCZOS), q=82),
    "d_cr": dish("chicken_rice"), "d_lk": dish("laksa"), "d_st": dish("satay"),
}
html = open(os.path.join(HERE, "board3_template.html")).read()
for k, v in images.items():
    assert "{{" + k + "}}" in html, k
    html = html.replace("{{" + k + "}}", v)
assert "{{" not in html, html[html.index("{{"):][:40]
open(OUT, "w").write(html)
print("wrote", OUT, round(len(html) / 1e6, 2), "MB")
