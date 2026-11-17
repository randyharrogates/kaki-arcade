"""Read the shared card palette without loading Blender or a TypeScript runtime."""
from pathlib import Path
import re


def read_tokens(path):
    block = path.read_text().split('export const PEEK_POKER_CARDS = {', 1)[1].split('} as const;', 1)[0]
    result = {}
    for key in ('colour', 'from', 'to', 'spades', 'hearts', 'diamonds', 'clubs'):
        result[key] = re.search(r"\b" + key + r":\s*'(#[0-9A-Fa-f]{6})'", block)[1]
    result['stripe'] = re.search(r"paints:\s*\[\s*'(#[0-9A-Fa-f]{6})'", block)[1]
    return result


TOKENS = read_tokens(Path(__file__).resolve().parents[2] / 'packages/ui/src/themes.ts')
