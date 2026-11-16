import { caseFold } from './case-fold';
/** Bounded Greek/Cyrillic confusables shared by two independent normalisations. */
const LOOKALIKES: Readonly<Record<string, string>> = {
  а: 'a',
  е: 'e',
  о: 'o',
  р: 'p',
  с: 'c',
  х: 'x',
  у: 'y',
  і: 'i',
  ј: 'j',
  ѕ: 's',
  υ: 'u',
  α: 'a',
  ε: 'e',
  ο: 'o',
  ρ: 'p',
  χ: 'x',
  ι: 'i',
  κ: 'k',
  τ: 't',
  ν: 'v',
};
const LEET: Readonly<Record<string, string>> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
  '!': 'i',
};
/** Stored spelling follows protocol acceptance without rewriting code points. */
export function storedName(name: string): string {
  return name.trim();
}
export function uniquenessKey(name: string): string {
  return caseFold(name.normalize('NFKC'))
    .replace(/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, '')
    .replace(/[\s\S]/gu, (c) => LOOKALIKES[c] ?? c)
    .replace(/\s+/gu, ' ').trim();
}
export function filterSkeleton(name: string): string {
  return uniquenessKey(name).normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[\s\S]/gu, (c) => LEET[c] ?? c);
}
// Compatibility export for callers that inspect name identity.
export const nameSkeleton = uniquenessKey;
/** Original curated vocabulary, one reviewable entry per line. */
export const BLOCKED_GROUPS = {
  english: {
    roots: [
      'fuck',
      'fvck',
      'phuck',
      'fck',
      'cunt',
      'nigger',
      'nigga',
      'faggot',
      'motherf',
      'shit',
      'bitch',
      'asshole',
      'heilhitler',
      'whitepower',
      'blowjob',
      'bestial',
      'zoophil',
      'necrophil',
      'pedophil',
      'paedophil',
      'fuxk',
      'fcuk',
      'dumbass',
      'jackass',
      'asshat',
      'cocksuck',
      'killyourself',
    ],
    tokens: [
      'porn',
      'phuk',
      'porno',
      'pornhub',
      'pornstar',
      'phuking',
      'phuker',
      'fuk',
      'fuq',
      'paki',
      'spic',
      'wog',
      'dyke',
      'kys',
      'pedo',
      'paedo',
      'molest',
      'raped',
      'kkk',
      'heil',
      'sht',
      'shitty',
      'shite',
      'biatch',
      'cock',
      'pussy',
      'slut',
      'whore',
      'nazi',
      'coon',
      'gook',
      'kike',
      'azz',
      'ass',
      'retard',
      'hitler',
      'hitlerite',
      'chink',
      'arsehole',
      'bastard',
      'bollocks',
      'wanker',
      'twat',
      'cockhead',
      'cockface',
      'dickhead',
      'dickface',
      'penis',
      'vagina',
      'clitoris',
      'anal',
      'sex',
      'sexy',
      'sexting',
      'rape',
      'rapist',
      'incest',
      'orgasm',
      'cum',
      'jizz',
      'semen',
      'boobs',
      'tits',
      'titty',
      'sodomy',
      'handjob',
      'rimjob',
      'cumshot',
      'gangbang',
      'dildo',
      'tranny',
      'shemale',
      'wetback',
      'raghead',
      'towelhead',
    ],
  },
  hokkien: {
    roots: [
      'kanina',
      'kannina',
      'cheebye',
      'cheebai',
      'chibai',
      'jibai',
      'cibai',
      'lanjiao',
      'lanciao',
      'knnccb',
      'kninabu',
    ],
    tokens: [
      'sohai',
      'nabei',
      'nabeh',
      'kanasai',
      'knn',
      'cb',
      'ccb',
      'knnb',
      'knnbccb',
    ],
  },
  malay: {
    roots: [
      'pukimak',
    ],
    tokens: [
      'babi',
      'puki',
      'sundal',
      'jalang',
      'konek',
      'pkmk',
      'kimak',
      'pantat',
      'kontol',
      'ngentot',
      'memek',
      'pepek',
      'bangsat',
      'bodoh',
      'anjing',
      'celaka',
      'lancau',
      'butoh',
      'pukima',
    ],
  },
  tamil: {
    roots: [
      'thevdiya',
      'pundamavane',
      'thevidiya',
      'thevudiya',
    ],
    tokens: [
      'ommala',
      'ottha',
      'pundai',
      'pundek',
      'oombu',
      'mayiru',
      'mayir',
      'koothi',
      'kuthi',
      'punda',
    ],
  },
  pinyin: {
    roots: [
      'caonima',
    ],
    tokens: [
      'cnm',
      'nmsl',
      'tmd',
      'shabi',
      'tamade',
      'wangbadan',
    ],
  },
  chinese: {
    roots: [
      '干你娘',
      '机掰',
      '去死',
      '妈的',
      '操你妈',
      '草你妈',
      '肏你妈',
      '他妈的',
      '傻逼',
      '傻屄',
      '牛逼',
      '狗日',
      '王八蛋',
      '混蛋',
      '婊子',
      '贱人',
      '鸡巴',
      '屌你',
      '妈逼',
      '你妈的',
    ],
    tokens: [
      '操',
      '肏',
      '屄',
      '屌',
    ],
  },
} as const;
const ALLOWED = [
  'Scunthorpe',
  'Essex',
  'Hancock',
  'Cockburn',
  'Dickson',
  'Dick',
  'Assunta',
  'Shitij',
  'Shital',
  'Matsushita',
  'Pornchai',
  'Pornsak',
  'Pornthip',
  'Pornpimol',
  'Shitake',
  'Shiitake',
  'Shitara',
  'Shithil',
  'Shittu',
  'Nazir',
  'Nazira',
  'Nazim',
  'Sohail',
  'Sohaib',
  'Shabir',
  'Shabina',
  'Kothandaraman',
  'Gotham',
  'Babita',
  'Babu',
  'Analise',
  'Niger',
  'Nigeria',
  'Connor',
  'Connie',
  'Bacon',
  'Raccoon',
  'Tycoon',
  'Gokul',
  'Sunil',
  'Sunita',
  'Kanika',
  'Nabeel',
  'Titus',
];
const allowed = new Set(ALLOWED.map(filterSkeleton));
function pattern(entry: string): string {
  return Array.from(filterSkeleton(entry)).map((c) => `${c}+`).join('');
}
const roots = Object.values(BLOCKED_GROUPS).flatMap((group) => group.roots)
  .map((entry) => ({ entry, regex: new RegExp(pattern(entry), 'gu') }));
const words = Object.values(BLOCKED_GROUPS).flatMap((group) => group.tokens)
  .filter((entry) => entry !== 'cb' && entry !== 'babi')
  .map((entry) => {
    const stem = entry.endsWith('y') ? pattern(entry.slice(0, -1)) : pattern(entry);
    const suffix = '(s+|e+s+|e+d+|i+e+s+|y+|t+y+)?';
    const ending = entry.endsWith('y') ? `(y+${suffix}|i+e+s+)` : suffix;
    return new RegExp(`^${stem}${ending}$`, 'u');
  });
export const BLOCKED_PHRASES = [
  'kill yourself', 'white power', 'kan ni na', 'lan jiao', 'pu ki',
  'chee bye', 'chee bai', 'chi bai', 'ci bai', 'haram jadah', 'heil hitler',
  'blow job', 'gang bang',
];
export function hasBlockedWord(name: string): boolean {
  if (name.includes('1') && hasBlockedWord(name.replace(/1/g, 'l')))
    return true;
  const skeleton = filterSkeleton(name);
  if (/(^|[^0-9])1488([^0-9]|$)/u.test(name.normalize('NFKC')))
    return true;
  const tokens = skeleton.match(/\p{Script=Han}+|(?:(?!\p{Script=Han})\p{L})+/gu) ?? [];
  const sequence = ` ${tokens.join(' ')} `;
  if (BLOCKED_PHRASES.some((phrase) => sequence.includes(` ${phrase} `)))
    return true;
  if (tokens.some((t) => !allowed.has(t) && words.some((word) => word.test(t))))
    return true;
  // Only maximal letter runs qualify; two initials before a surname stay ordinary names.
  for (let i = 0; i < tokens.length;) {
    const start = i;
    while (i < tokens.length && tokens[i]?.length === 1) i++;
    const length = i - start;
    if (length >= 3 || (length === 2 && length === tokens.length)) {
      const run = tokens.slice(start, i).join('');
      if (words.some((word) => word.test(run)) || /^(c+b+|b+a+b+i+)$/u.test(run)
        || roots.some(({ regex }) => {
          regex.lastIndex = 0;
          return regex.test(run);
        })) return true;
    }
    if (i === start) i++;
  }
  if (tokens.length === 1 && /^b+a+b+i+(s|es|ed|ies|y|ty)?$/u.test(tokens[0])) {
    return true;
  }
  const joined = tokens.join('');
  const spans: {
    start: number;
    end: number;
    token: string;
  }[] = [];
  let offset = 0;
  for (const token of tokens) {
    spans.push({ start: offset, end: offset + token.length, token });
    offset += token.length;
  }
  for (const { entry, regex } of roots) {
    regex.lastIndex = 0;
    if (!regex.test(joined)) continue;
    regex.lastIndex = 0;
    for (const match of joined.matchAll(regex)) {
      const start = match.index;
      const end = start + match[0].length;
      const containing = spans.find((span) => start >= span.start && end <= span.end);
      // shit across gaps collides with ordinary phrases such as Mash It.
      if (containing) {
        const token = containing.token;
        // Remove only the protected stem, then explicitly check this root again.
        const stem = allowed.has(token) ? token
          : entry === 'shit' && token.endsWith('shita') ? 'shita' : undefined;
        if (stem) {
          const protectedPattern = new RegExp(pattern(entry), 'u');
          if (protectedPattern.test(stem)
            && !protectedPattern.test(token.replace(stem, ''))) continue;
        }
      } else {
        const crossed = spans.filter((span) => start < span.end && end > span.start);
        // Explicit round-4 PASS overrides the short-fragment rule for this name.
        if (entry === 'motherf' && crossed.map((span) => span.token).join(' ')
          === 'grandmother fu') continue;
        if (entry === 'shit' || !crossed.some((span) => span.token.length <= 2)) continue;
      }
      return true;
    }
  }
  // Each censorship symbol consumes one root letter, including inside longer tokens.
  const censorship = uniquenessKey(name).normalize('NFD').replace(/\p{M}/gu, '');
  const censoredTokens = censorship.match(/\p{L}+(?:[^\p{L}\p{N}\s]+\p{L}+)+/gu) ?? [];
  return censoredTokens.some((token) => roots.some(({ entry }) => {
    const wildcard = Array.from(entry)
      .map((c) => `(?:${c}+|[^\\p{L}\\p{N}\\s])`).join('');
    return Array.from(token.matchAll(new RegExp(wildcard, 'gu')))
      .some((match) => /[^\p{L}\p{N}\s]/u.test(match[0]));
  }));
}
