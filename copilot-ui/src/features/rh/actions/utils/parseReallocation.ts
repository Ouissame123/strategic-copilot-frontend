export interface ReallocationProposal {
    talent_id: string;
    talent_name: string;
    current_load_pct: number;
    matching_skills_count: number;
    proposed_allocation_pct: number;
}

function coerceNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeProposal(item: unknown): ReallocationProposal | null {
    if (!isRecord(item)) return null;
    const talent_name = String(item.talent_name ?? "").trim();
    if (!talent_name) return null;
    return {
        talent_id: String(item.talent_id ?? "").trim(),
        talent_name,
        current_load_pct: coerceNumber(item.current_load_pct),
        matching_skills_count: coerceNumber(item.matching_skills_count),
        proposed_allocation_pct: coerceNumber(item.proposed_allocation_pct),
    };
}

function tryParseArraySlice(slice: string): unknown[] | null {
    try {
        const parsed: unknown = JSON.parse(slice);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        const lastBrace = slice.lastIndexOf("}");
        if (lastBrace < 0) return null;
        try {
            const repaired = `${slice.slice(0, lastBrace + 1)}]`;
            const parsed: unknown = JSON.parse(repaired);
            return Array.isArray(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }
}

/**
 * Extrait un tableau de propositions de réaffectation depuis un message brut
 * (souvent préfixé + JSON, parfois tronqué en BDD). Ne throw jamais.
 */
export function parseReallocation(raw: string): ReallocationProposal[] | null {
    const text = String(raw ?? "");
    const start = text.indexOf("[");
    if (start < 0) return null;

    const slice = text.slice(start);
    const parsed = tryParseArraySlice(slice);
    if (!parsed) return null;

    const proposals = parsed.map(normalizeProposal).filter((p): p is ReallocationProposal => p != null);
    return proposals.length > 0 ? proposals : null;
}
