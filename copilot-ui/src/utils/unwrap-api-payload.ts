/** Lecture défensive de réponses JSON n8n — aucune logique métier. */

export function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Racine ou `data` si présent. */
export function unwrapDataPayload(raw: unknown): Record<string, unknown> {
    const r = asRecord(raw);
    const inner = r.data;
    if (inner && typeof inner === "object" && !Array.isArray(inner)) return asRecord(inner);
    return r;
}

export function firstArray(root: Record<string, unknown>, keys: string[]): unknown[] {
    for (const k of keys) {
        const v = root[k];
        if (Array.isArray(v)) return v;
    }
    return [];
}

export function firstScalar(root: Record<string, unknown>, keys: string[]): unknown {
    for (const k of keys) {
        const v = root[k];
        if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
}
