// Vowels and ambiguous characters are excluded; reject rude words and common leetspeak.
import { CODE_ALPHABET, CODE_LENGTH } from '@kaki/protocol';
export { CODE_ALPHABET, CODE_LENGTH } from '@kaki/protocol';
export type RandomBytes = (length: number) => Uint8Array;
export function normalizeCode(code: string): string {
    return code.toUpperCase().replace(/[ -]/g, '');
}
export const RUDE_WORDS = [
    'FUCK',
    'SHIT',
    'CUNT',
    'DICK',
    'COCK',
    'PISS',
    'TITS',
    'TWAT',
    'WANK',
    'ASS',
    'SEX',
    'BASTARD',
    'BITCH',
    'BOLLOCK',
    'PRICK',
    'SLUT',
    'WHORE',
    'PENIS',
    'VAGINA',
    'DILDO',
    'ANAL',
    'FAG',
    'DYKE',
    'NIGGER',
    'NIGGA',
    'KNN',
    'CB',
    'CCB',
    'LJ',
    'LANJIAO',
    'CHEEBYE',
    'FVCK',
    'FCK',
    'FK',
    'CNT',
    'CVNT',
    'DCK',
    'DVCK',
    'PSSY',
    'NGGR',
    'WNK',
    'WNKR',
    'SHT',
    'BTCH',
    'SLT',
    'FKN',
    'XXX',
    'KKK',
    'NGR',
    '69',
    '666',
    '1488',
    '420',
];
export function safeCode(code: string): boolean {
    const normal = code.replaceAll('3', 'E').replaceAll('4', 'A').replaceAll('5', 'S')
        .replaceAll('7', 'T').replaceAll('8', 'B').replaceAll('V', 'U')
        .replace(/[69]/g, 'G');
    return !RUDE_WORDS.some((word) => code.includes(word) || normal.includes(word));
}
export function randomText(alphabet: string, length: number, random: RandomBytes): string {
    const ceiling = 256 - (256 % alphabet.length);
    let out = '';
    while (out.length < length) {
        for (const byte of random(length)) {
            if (byte < ceiling)
                out += alphabet.charAt(byte % alphabet.length);
            if (out.length === length)
                break;
        }
    }
    return out;
}
export function generateCode(random: RandomBytes): string {
    for (;;) {
        const code = randomText(CODE_ALPHABET, CODE_LENGTH, random);
        if (safeCode(code))
            return code;
    }
}
export function generateToken(random: RandomBytes): string {
    return randomText('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', 32, random);
}
