import { asRecord } from "@/utils/unwrap-api-payload";

/** Extrait un tableau d’objets depuis une réponse API n8n (racine ou `data`). */
export function rowsFromRhPayload(raw: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(raw)) return raw.map((x) => asRecord(x));
    const r = asRecord(raw);
    const inner = r.data && typeof r.data === "object" && !Array.isArray(r.data) ? asRecord(r.data) : r;
    for (const k of ["items", "data", "rows", "alerts", "gaps", "plans"]) {
        const v = inner[k];
        if (Array.isArray(v)) return v.map((x) => asRecord(x));
    }
    return [];
}

export function pickCell(row: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = row[k];
        if (v != null && String(v).trim() !== "") return String(v);
    }
    return "—";
}
