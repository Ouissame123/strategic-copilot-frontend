/**
 * Affichage monitoring manager : lecture de champs backend optionnels uniquement (pas de calcul métier).
 */

export function pickScalarDisplay(summary: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = summary[k];
        if (v == null) continue;
        if (typeof v === "number" && Number.isFinite(v)) return String(v);
        if (typeof v === "string" && v.trim()) return v.trim();
        if (typeof v === "boolean") return v ? "Oui" : "Non";
    }
    return "—";
}

export function getRowField(row: Record<string, unknown>, keys: string[]): unknown {
    for (const k of keys) {
        if (k in row && row[k] != null) return row[k];
    }
    return undefined;
}

export function formatRowText(value: unknown): string {
    if (value == null) return "—";
    if (typeof value === "object") return "—";
    return String(value);
}

export function groupCountByField(items: Record<string, unknown>[], field: string): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of items) {
        const raw = row[field];
        const key = raw != null && String(raw).trim() ? String(raw).trim() : "—";
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
}

/** Champs possibles côté backend pour regroupement (premier présent sur au moins une ligne). */
export function pickGroupField(items: Record<string, unknown>[]): string | null {
    const candidates = ["status", "risk_level", "risk", "project_status", "need_type"];
    for (const f of candidates) {
        if (items.some((row) => row[f] != null && String(row[f]).trim() !== "")) return f;
    }
    return null;
}

export function isAttentionRow(row: Record<string, unknown>): boolean {
    const status = String(getRowField(row, ["status", "project_status"]) ?? "").toLowerCase();
    const risk = String(getRowField(row, ["risk_level", "risk", "severity"]) ?? "").toLowerCase();
    const flag = getRowField(row, ["at_risk", "needs_attention", "attention"]);
    if (flag === true) return true;
    if (typeof flag === "string" && flag.toLowerCase() === "true") return true;
    if (status.includes("risk") || status.includes("attention") || status.includes("at-risk")) return true;
    if (risk === "high" || risk === "critical" || risk === "elevated") return true;
    return false;
}
