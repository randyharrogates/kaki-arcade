import { Admission, RETENTION_MS, ROTATION_MS } from './core/admission';
import type { AdmissionOperation } from './core/admission';
export interface AdmissionEnv {
    ADMISSION: DurableObjectNamespace;
    ADMISSION_SECRET: string;
}
export interface AdmissionTicket { key: string[]; id: string }
export async function clientKey(address: string, secret: string, now: number): Promise<string> {
    const bytes = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', bytes.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = await crypto.subtle.sign('HMAC', key, bytes.encode(`${String(Math.floor(now / ROTATION_MS))}:${address}`));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function admission(env: Pick<AdmissionEnv, 'ADMISSION'>, key: string | string[], operation: AdmissionOperation): Promise<number> {
    if (Array.isArray(key)) {
        const accepted: string[] = [];
        let retry = 0;
        for (const part of key) {
            const result = await admission(env, part, operation);
            retry = Math.max(retry, result);
            if (retry && operation.kind !== 'finish' && operation.kind !== 'fail') break;
            accepted.push(part);
        }
        if (retry && (operation.kind === 'phone' || operation.kind === 'guess')) {
            for (const part of accepted) await admission(env, part, { kind: 'finish', id: operation.id, failed: false });
        }
        return retry;
    }
    const response = await env.ADMISSION.get(env.ADMISSION.idFromName(key.slice(0, 1))).fetch('https://admission/counter', {
        method: 'POST', body: JSON.stringify({ key, operation }),
    });
    if (!response.ok) throw new Error('Admission unavailable');
    const body = await response.text();
    if (!/^[0-9]+$/.test(body)) throw new Error('Invalid admission response');
    const retry = Number(body);
    if (!Number.isFinite(retry) || retry < 0) throw new Error('Invalid admission response');
    return Math.min(operation.kind === 'create' ? 600 : 60, Math.ceil(retry));
}
export class AdmissionObject {
    private readonly core = new Admission(() => Date.now());
    private activeUntil = 0;
    private retaining = false;
    constructor(private readonly ctx: Pick<DurableObjectState, 'waitUntil'>) {}
    private retain(): void {
        this.activeUntil = Date.now() + RETENTION_MS;
        if (this.retaining) return;
        this.retaining = true;
        const hold = (): void => {
            const remaining = this.activeUntil - Date.now();
            if (remaining <= 0) {
                this.core.sweep();
                this.retaining = false;
                return;
            }
            // One bounded in-memory task per shard, no client data in storage.
            // An idle refusal cache must not make live failure counters disappear.
            this.ctx.waitUntil(new Promise<void>((resolve) => {
                setTimeout(() => { resolve(); hold(); }, remaining);
            }));
        };
        hold();
    }
    async fetch(request: Request): Promise<Response> {
        this.retain();
        const { key, operation } = await request.json<{ key: string; operation: AdmissionOperation }>();
        return new Response(String(this.core.run(key, operation)));
    }
}
