"""Count accepted eight-character codes exactly using substring-prefix dynamic programming."""
from collections import defaultdict
from pathlib import Path
import re

source = Path('apps/signal/src/core/codes.ts').read_text()
alphabet = re.search(r"CODE_ALPHABET = '([^']+)'", source)[1]
words_source = source.split('const RUDE_WORDS = [', 1)[1].split('];', 1)[0]
words = re.findall(r"'([^']+)'", words_source)
prefixes = {word[:i] for word in words for i in range(len(word))}
translation = str.maketrans({'3': 'E', '4': 'A', '5': 'S', '7': 'T', '8': 'B',
                            'V': 'U', '6': 'G', '9': 'G'})

def advance(prefix, character):
    value = prefix + character
    if any(value.endswith(word) for word in words):
        return None
    return max((p for p in prefixes if value.endswith(p)), key=len)

counts = {('', ''): 1}
for _ in range(8):
    following = defaultdict(int)
    for (raw, normal), count in counts.items():
        for character in alphabet:
            next_raw = advance(raw, character)
            next_normal = advance(normal, character.translate(translation))
            if next_raw is not None and next_normal is not None:
                following[(next_raw, next_normal)] += count
    counts = following
accepted = sum(counts.values())
print(f'Alphabet: {len(alphabet)}; raw space: {len(alphabet) ** 8:,}')
print(f'Accepted by current substring screen: {accepted:,}')
print(f'Rejected: {len(alphabet) ** 8 - accepted:,}')
print(f'720 guesses at one chosen room: {720 / accepted:.9g}')
print(f'720 guesses against 10,000 live rooms (union bound): {720 * 10000 / accepted:.9g}')
