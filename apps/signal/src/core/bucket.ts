export interface Bucket {
    tokens: number;
    at: number;
}
export const BURST = 60;
export const PER_SECOND = 30;
export function consume(bucket: Bucket, now: number): {
    bucket: Bucket;
    allowed: boolean;
} {
    const tokens = Math.min(BURST, bucket.tokens + Math.max(0, now - bucket.at) * PER_SECOND / 1000);
    return { bucket: { tokens: Math.max(0, tokens - 1), at: Math.max(now, bucket.at) }, allowed: tokens >=
            1 };
}
