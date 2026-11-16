"""Cuts each motion sample out of the held frames and lays its nine frames side by side
(start on the left, end on the right; an eighth of the motion between frames). Samples are
stacked into two sheets per theme. Needs Pillow. Run capture.sh first; frames/ is not kept."""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).parent
STEPS = ["0", "0.125", "0.25", "0.375", "0.5", "0.625", "0.75", "0.875", "1"]
NAMES = ["press", "enter", "rows", "tile-opens", "arc", "pulse", "count-up", "screen-change", "card-turn"]
SHEETS = {"a": NAMES[:5], "b": NAMES[5:]}
CELL, GAP, STAGE_W, STAGE_H = 345, 21, 339, 210
TOP = 55 + 55 + 34 + 55 + 34          # safe margin, heading, gap, replay row, gap
ROW = 3 + STAGE_H + 13 + 55 + 13 + 3  # edge, stage, body, edge

for theme in ("console", "peek-poker"):
    frames = [Image.open(HERE / "frames" / f"{theme}-{step}.png") for step in STEPS]
    for sheet, names in SHEETS.items():
        width = STAGE_W * len(frames) + 5 * (len(frames) - 1)
        out = Image.new("RGB", (width, STAGE_H * len(names) + 5 * (len(names) - 1)), "white")
        for row, name in enumerate(names):
            index = NAMES.index(name)
            x = 55 + (index % 5) * (CELL + GAP) + 3
            y = TOP + (index // 5) * (ROW + GAP) + 3
            for i, frame in enumerate(frames):
                out.paste(frame.crop((x, y, x + STAGE_W, y + STAGE_H)), (i * (STAGE_W + 5), row * (STAGE_H + 5)))
        target = HERE / f"strip-{theme}-{sheet}-{'-'.join(names)}.png"
        out.save(target)
        print(target.name)
