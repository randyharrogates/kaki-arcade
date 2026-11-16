"""Compose board 1A: paste the rendered cook sprites onto the placeholder kitchen at real game
size (1920 x 1080, 120 px per floor tile), then build the board page from the template.

Run: python3 tools/blender/board1a_compose.py <render dir> <out html>
"""
import base64, io, os, sys
from PIL import Image, ImageDraw, ImageFont

R, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
PLAYER = ["#D9483B", "#2F7FD6", "#F2B21B", "#39A85B", "#8E5BD0", "#F07C2A", "#22A6A6", "#D95C9A"]
SPOTS = [(300, 362), (250+510, 345), (1160, 362), (1640, 345), (250, 800), (560, 740), (1380, 740), (1560, 930)]
SPR = 288          # a toy cook stands about 140 px tall on a 120 px tile
FOOT = 48          # feet sit this far below the sprite centre


def img(name):
    return Image.open(os.path.join(R, name + ".png")).convert("RGBA")


def frame(sprites, badge_lift):
    bg = img("bg_kitchen")
    font = ImageFont.load_default(size=26)
    order = sorted(range(8), key=lambda i: SPOTS[i][1])
    for i in order:
        x, y = SPOTS[i]
        s = img(sprites[i % len(sprites)]).resize((SPR, SPR), Image.LANCZOS)
        # drop the faint ambient shading the shadow catcher leaves across the whole cell
        s.putalpha(s.getchannel("A").point(lambda a: 0 if a < 14 else int((a - 14) * 255 / 241)))
        bg.alpha_composite(s, (x - SPR // 2, y - FOOT - SPR // 2))
    d = ImageDraw.Draw(bg)
    for i in order:
        x, y = SPOTS[i]; by = y - badge_lift
        d.ellipse((x - 21, by - 21, x + 21, by + 21), fill=PLAYER[i], outline="#FFFFFF", width=3)
        d.text((x, by), str(i + 1), fill="#FFFFFF", font=font, anchor="mm")
    return bg.convert("RGB")


def uri(im, q=82):
    b = io.BytesIO(); im.convert("RGB").save(b, "JPEG", quality=q, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()


images = {
    "close_toy": uri(img("close_toy").resize((640, 640), Image.LANCZOS), 86),
    "close_clay": uri(img("close_clay").resize((640, 640), Image.LANCZOS), 86),
    "close_real": uri(img("close_real").resize((640, 640), Image.LANCZOS), 86),
    "close_cc0": uri(img("close_cc0").resize((640, 640), Image.LANCZOS), 86),
    "cast_full": uri(img("cast_full"), 84),
    "cast_heads": uri(img("cast_heads"), 84),
    "frame_toy": uri(frame(["spr_toy_idle", "spr_toy_walk"], 176)),
    "frame_clay": uri(frame(["spr_clay_idle", "spr_clay_walk"], 190)),
    "frame_real": uri(frame(["spr_real_idle", "spr_real_walk"], 214)),
    "frame_cast": uri(frame(["sprcast_uncle", "sprcast_auntie", "sprcast_cap", "sprcast_makcik"], 176)),
}
html = open(os.path.join(HERE, "board1a_template.html")).read()
for k, v in images.items():
    assert "{{" + k + "}}" in html, k
    html = html.replace("{{" + k + "}}", v)
assert "{{" not in html
open(OUT, "w").write(html)
print("wrote", OUT, round(len(html) / 1e6, 2), "MB")
