// Hand-made local adapter fake: no runtime, account, network or dependency required.
export class FakeSocket {
    attachment: unknown = null;
    sent: string[] = [];
    closed = false;
    closeCode: number | undefined;
    closeReason: string | undefined;
    serializeAttachment(value: unknown): void {
        this.attachment = structuredClone(value);
    }
    deserializeAttachment(): unknown {
        return structuredClone(this.attachment);
    }
    send(data: string): void {
        if (this.closed)
            throw new Error('Closed socket');
        this.sent.push(data);
    }
    close(code?: number, reason?: string): void {
        this.closeCode = code;
        this.closeReason = reason;
        this.closed = true;
    }
}
export class FakeState {
    readonly tasks: Promise<unknown>[] = [];
    pendingTasks = 0;
    waitUntil(promise: Promise<unknown>): void {
        this.pendingTasks++;
        this.tasks.push(promise.finally(() => { this.pendingTasks--; }));
    }
    async drain(): Promise<void> { await Promise.all(this.tasks.splice(0)); }
    sockets: FakeSocket[] = [];
    records = new Map<string, unknown>();
    writes = 0;
    reads = 0;
    alarmAt: number | null = null;
    autoResponse: unknown;
    storage = {
        get: <T>(key: string): Promise<T | undefined> => {
            this.reads++;
            return Promise.resolve(structuredClone(this.records.get(key)) as T | undefined);
        },
        put: (key: string | Record<string, unknown>, value?: unknown): Promise<void> => {
            this.writes++;
            if (typeof key === 'string') this.records.set(key, structuredClone(value));
            else for (const [name, entry] of Object.entries(key)) this.records.set(name, structuredClone(entry));
            return Promise.resolve();
        },
        delete: (keys: string[]): Promise<number> => {
            let count = 0;
            for (const key of keys) if (this.records.delete(key)) count++;
            return Promise.resolve(count);
        },
        deleteAll: (): Promise<void> => {
            this.records.clear();
            return Promise.resolve();
        },
        deleteAlarm: (): Promise<void> => {
            this.alarmAt = null;
            return Promise.resolve();
        },
        setAlarm: (at: number): Promise<void> => {
            this.alarmAt = at;
            return Promise.resolve();
        },
        getAlarm: (): Promise<number | null> => Promise.resolve(this.alarmAt),
    };
    async blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T> {
        return callback();
    }
    acceptWebSocket(socket: FakeSocket): void {
        this.sockets.push(socket);
    }
    getWebSockets(): FakeSocket[] {
        return this.sockets.filter((s) => !s.closed);
    }
    setWebSocketAutoResponse(value: unknown): void {
        this.autoResponse = value;
    }
}

// Miniflare/workerd drops an idle object after ten seconds. Pending waitUntil
// work pins it; unlike durable storage, ordinary instance fields do not survive.
export class FakeIdleObject<T> {
    private lastUsed = -Infinity;
    private entry: { ctx: FakeState; object: T } | undefined;
    evictions = 0;
    constructor(private readonly create: (ctx: FakeState) => T) {}
    get(): { ctx: FakeState; object: T } {
        if (this.entry && Date.now() - this.lastUsed >= 10000 && !this.entry.ctx.pendingTasks) {
            this.entry = undefined;
            this.evictions++;
        }
        if (!this.entry) {
            const ctx = new FakeState();
            this.entry = { ctx, object: this.create(ctx) };
        }
        this.lastUsed = Date.now();
        return this.entry;
    }
}
