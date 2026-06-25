export type RequestTimeBucket = "now" | "today" | "yesterday" | "week" | "older";

export const REQUEST_TIME_BUCKET_ORDER: RequestTimeBucket[] = ["now", "today", "yesterday", "week", "older"];

export const REQUEST_TIME_BUCKET_LABELS: Record<RequestTimeBucket, string> = {
    now: "🔥 Moins de 4h",
    today: "Aujourd'hui",
    yesterday: "Hier",
    week: "7 derniers jours",
    older: "Plus ancien",
};

export function timeBucketOf(createdAt: string | null | undefined): RequestTimeBucket {
    if (!createdAt?.trim()) return "older";
    const t = new Date(createdAt).getTime();
    if (!Number.isFinite(t)) return "older";
    const ageHours = (Date.now() - t) / 3_600_000;
    if (ageHours < 4) return "now";
    if (ageHours < 24) return "today";
    if (ageHours < 48) return "yesterday";
    if (ageHours < 24 * 7) return "week";
    return "older";
}

export function groupRequestsByTimeBucket<T extends { created_at?: string | null; createdAt?: string | null }>(
    requests: T[],
): Record<RequestTimeBucket, T[]> {
    const groups: Record<RequestTimeBucket, T[]> = {
        now: [],
        today: [],
        yesterday: [],
        week: [],
        older: [],
    };
    for (const r of requests) {
        const created = r.created_at ?? r.createdAt ?? null;
        groups[timeBucketOf(created)].push(r);
    }
    return groups;
}
