"""TR-064: phone cooks from the committed A-03 heads and shared A-02 idle body."""
import hashlib
import io
from PIL import Image

HEADS = ('cap', 'uncle', 'auntie', 'makcik', 'bun', 'specs', 'turban', 'songkok')
SIZE = (202, 256)  # 844-wide picture cell's inner box at 2x.
BUDGET = 60_000


def pack_portraits(source, output):
    body_path = source / 'tabao-rush/cook-body/idle/idle-s-0.png'
    mask_path = source / 'tabao-rush/cook-body/idle/idle-s-0-mask.png'
    files = []
    for head in HEADS:
        relative = f'tabao-rush/cook-heads/{head}/head-{head}-s.png'
        head_mask_path = source / f'tabao-rush/cook-heads/{head}/head-{head}-s-mask.png'
        with Image.open(source / relative) as original, Image.open(body_path) as body_source, Image.open(mask_path) as mask_source, Image.open(head_mask_path) as head_mask:
            # Both renders use the same head socket and source dimensions.
            body = body_source.convert('RGBA')
            image = Image.alpha_composite(body, original.convert('RGBA'))
            box = image.getbbox()
            image = image.crop(box)
            # The head and body source canvases share the head socket, just as
            # the renderer aligns their named head anchors. Include cap tint.
            mask = Image.alpha_composite(mask_source.convert('RGBA'), head_mask.convert('RGBA')).crop(box)
            scale = min(SIZE[0] / image.width, SIZE[1] / image.height)
            image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
            alpha = mask.resize(image.size, Image.Resampling.LANCZOS).getchannel('A')
            mask = Image.new('RGBA', image.size, (255, 255, 255, 0))
            mask.putalpha(alpha)
            for suffix, picture, source_key in [('', image, relative), ('-mask', mask, f'tabao-rush/phone/cook-{head}-mask.webp')]:
                buffer = io.BytesIO()
                picture.save(buffer, 'WEBP', quality=82, alpha_quality=60, method=6, exact=False)
                data = buffer.getvalue()
                digest = hashlib.sha256(data).hexdigest()
                name = f'portrait-{head}{suffix}.{digest[:16]}.webp'
                (output / name).write_bytes(data)
                files.append(dict(file=name, bytes=len(data), sha256=digest, source=source_key))
    if sum(f['bytes'] for f in files) > BUDGET:
        raise ValueError('TR-064 phone portraits and apron masks exceed 60000 bytes')
    return files
