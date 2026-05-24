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

/** Réponse n8n : tableau racine, `data[]`, ou champ `json`. */
export function unwrapN8nRoot(raw: unknown): Record<string, unknown> {
    if (Array.isArray(raw) && raw.length > 0) return unwrapN8nRoot(raw[0]);
    const r = asRecord(raw);
    const json = r.json;
    if (json && typeof json === "object" && !Array.isArray(json)) return asRecord(json);
    const data = r.data;
    if (Array.isArray(data) && data.length > 0) return asRecord(data[0]);
    return unwrapDataPayload(raw);
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
