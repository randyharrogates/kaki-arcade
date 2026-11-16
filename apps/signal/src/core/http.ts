export function allowedOrigin(origin: string | null, allowList: string | undefined): boolean {
    if (origin === null || origin === '' || origin === 'null' || !allowList)
        return false;
    return allowList.split(',').map((entry) => entry.trim()).includes(origin);
}
