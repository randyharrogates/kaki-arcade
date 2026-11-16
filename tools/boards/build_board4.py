"""Build design gate board 4 (phone controller) from its template.

Run: python3 tools/boards/build_board4.py <board 4 render dir> <out html>
"""
import base64, io, os, sys
from PIL import Image

R, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
strip = Image.open(os.path.join(R, "b4_cast8.png")).convert("RGBA")
strip.putalpha(strip.getchannel("A").point(lambda a: 0 if a < 14 else int((a - 14) * 255 / 241)))
html = open(os.path.join(HERE, "board4_template.html")).read()
for i in range(8):
    cx = 960 + (1920 / 13.2) * (-5.6 + 1.6 * i)          # cooks stand 1.6 units apart; 13.2 units span the frame
    cell = strip.crop((int(cx - 78), 150, int(cx + 78), 335))      # the cook fills rows 162 to 322
    b = io.BytesIO(); cell.save(b, "PNG", optimize=True)
    html = html.replace("{{h%d}}" % i, "data:image/png;base64," + base64.b64encode(b.getvalue()).decode())
assert "{{" not in html, html[html.index("{{"):][:40]
open(OUT, "w").write(html)
print("wrote", OUT, round(len(html) / 1e6, 2), "MB")
