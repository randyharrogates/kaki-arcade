"""DATA-005: offline exact safe-code counts; run from the repository root. No writes."""
import functools
import re
from pathlib import Path

source = Path('apps/signal/src/core/codes.ts').read_text()
alphabet = re.search("CODE_ALPHABET = '(.*?)'", source)[1]
words = re.findall("'([^']+)'", source.split('const RUDE_WORDS = [')[1].split('];')[0])
prefixes = {word[:i] for word in words for i in range(len(word))}
translation = str.maketrans({'3': 'E', '4': 'A', '5': 'S', '7': 'T', '8': 'B', 'V': 'U', '6': 'G', '9': 'G'})

@functools.lru_cache(None)
def advance(state, char):
    text = state + char
    if any(text.endswith(word) for word in words):
        return None
    return max((prefix for prefix in prefixes if text.endswith(prefix)), key=len)

@functools.lru_cache(None)
def count(left, raw='', normal=''):
    if left == 0:
        return 1
    total = 0
    for char in alphabet:
        a, b = advance(raw, char), advance(normal, char.translate(translation))
        if a is not None and b is not None:
            total += count(left - 1, a, b)
    return total

print('Alphabet:', len(alphabet))
print('Conservative attempts/client/hour: 96 + 2 * 3600 = 7296')
for length in (8, 6):
    raw, safe = len(alphabet) ** length, count(length)
    print(f'{length} characters: raw={raw}; safe={safe}')
    for clients in (1, 1000):
        guesses = 7296 * clients
        print(f'  {clients} clients: raw probability <= {guesses/raw:.12g}; safe probability <= {guesses/safe:.12g} ({100*guesses/safe:.9g}%)')
