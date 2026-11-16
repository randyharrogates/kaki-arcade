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
        put: (key: string, value: unknown): Promise<void> => {
            this.writes++;
            this.records.set(key, structuredClone(value));
            return Promise.resolve();
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
