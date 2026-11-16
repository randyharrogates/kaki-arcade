"""Build design gate board 2 (visual identity) from its template and the sample trivia photos.

Run: python3 tools/boards/build_board2.py <photo dir> <out html>
The photo dir holds laksa_commons.jpg (required) and laksa_codex.png (optional).
"""
import base64, io, os, sys
from PIL import Image

P, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))


def uri(path, size=(900, 675)):
    im = Image.open(path).convert("RGB")
    w, h = im.size; t = size[0] / size[1]
    if w / h > t: nw = int(h * t); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else: nh = int(w / t); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    b = io.BytesIO(); im.resize(size, Image.LANCZOS).save(b, "JPEG", quality=82, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()


html = open(os.path.join(HERE, "board2_template.html")).read()
html = html.replace("{{photo_commons}}", uri(os.path.join(P, "laksa_commons.jpg")))
codex = os.path.join(P, "laksa_codex.png")
html = html.replace("{{photo_codex}}", uri(codex) if os.path.exists(codex) else "")
html = html.replace("{{has_codex}}", "yes" if os.path.exists(codex) else "no")
assert "{{" not in html
open(OUT, "w").write(html)
print("wrote", OUT, round(len(html) / 1e6, 2), "MB")
