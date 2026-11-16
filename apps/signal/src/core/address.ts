// DATA-005: canonical network identities; never retain the input address.
export function clientNetworks(input: string | null): string[] | null {
    if (!input) return null;
    const address = input.split('%')[0] ?? '';
    const ipv4 = (value: string): string | null => {
        const parts = value.split('.');
        if (parts.length !== 4 || parts.some((p) => !/^(0|[1-9][0-9]{0,2})$/.test(p) || Number(p) > 255)) return null;
        return parts.map(Number).join('.');
    };
    if (!address.includes(':') && address !== input) return null;
    if (!/^[0-9a-f:.]+$/i.test(address)) return null;
    if (!address.includes(':')) { const v4 = ipv4(address); return v4 ? [v4] : null; }
    try {
        const host = new URL(`http://[${address}]/`).hostname.slice(1, -1);
        const halves = host.split('::');
        const left = (halves[0] ?? '').split(':').filter(Boolean);
        const right = (halves[1] ?? '').split(':').filter(Boolean);
        const words = halves.length === 2 ? [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right] : left;
        if (words.length !== 8 || words.some((w) => !/^[0-9a-f]{1,4}$/i.test(w))) return null;
        const n = words.map((w) => parseInt(w, 16));
        if (n.slice(0, 5).every((w) => w === 0) && n[5] === 65535) {
            const a = n[6] ?? 0; const b = n[7] ?? 0;
            return [`${String(a >> 8)}.${String(a & 255)}.${String(b >> 8)}.${String(b & 255)}`];
        }
        return [n.slice(0, 4).map((w) => w.toString(16)).join(':') + '::/64',
            n.slice(0, 3).map((w) => w.toString(16)).join(':') + '::/48'];
    } catch { return null; }
}
