export function asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    return {};
}

export function textOf(row: Record<string, unknown>, keys: string[], fallback = "—"): string {
    for (const key of keys) {
        const v = row[key];
        if (v == null) continue;
        const t = String(v).trim();
        if (t) return t;
    }
    return fallback;
}

export function numOf(row: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
        const v = row[key];
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
            const n = Number(v.replace(/[^\d.-]/g, ""));
            if (Number.isFinite(n)) return n;
        }
    }
    return null;
}

