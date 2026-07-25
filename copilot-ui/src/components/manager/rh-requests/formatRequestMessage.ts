export type ReallocationTalentCard = {
    talent_id?: string;
    talent_name: string;
    matching_skills_count?: number | string | null;
    current_load_pct?: number | string | null;
    proposed_allocation_pct?: number | string | null;
    skills?: unknown;
    raw: Record<string, unknown>;
};

export type ParsedRequestMessage = {
    prefix: string;
    summary: string;
    talents: ReallocationTalentCard[];
    /** true si du JSON a été détecté et interprété (jamais afficher le brut). */
    fromJson: boolean;
};

function asPct(value: unknown): string | null {
    if (value == null || value === "") return null;
    const n = Number(value);
    if (Number.isFinite(n)) return `${n} %`;
    const s = String(value).trim();
    return s ? (s.endsWith("%") ? s : `${s} %`) : null;
}

function talentDisplayName(item: Record<string, unknown>, index: number): string {
    const name = item.talent_name ?? item.name ?? item.full_name;
    const s = name == null ? "" : String(name).trim();
    return s || `Talent ${index + 1}`;
}

function toTalentCard(item: Record<string, unknown>, index: number): ReallocationTalentCard {
    return {
        talent_id: item.talent_id != null ? String(item.talent_id) : undefined,
        talent_name: talentDisplayName(item, index),
        matching_skills_count: (item.matching_skills_count ?? item.skills_count ?? item.matching_skills) as
            | number
            | string
            | null
            | undefined,
        current_load_pct: (item.current_load_pct ?? item.current_load ?? item.load_pct) as
            | number
            | string
            | null
            | undefined,
        proposed_allocation_pct: (item.proposed_allocation_pct ?? item.allocation_pct ?? item.proposed_allocation) as
            | number
            | string
            | null
            | undefined,
        skills: item.skills ?? item.matching_skills_list,
        raw: item,
    };
}

function summarizeTalents(prefix: string, talents: ReallocationTalentCard[]): string {
    const head = prefix
        ? /réaffect|realloc/i.test(prefix)
            ? "Réaffectation proposée"
            : prefix.replace(/:\s*$/, "").trim() || "Réaffectation proposée"
        : "Réaffectation proposée";

    if (talents.length === 0) return head;
    if (talents.length > 1) return `${head} · ${talents.length} talents concernés`;

    const t = talents[0];
    const parts: string[] = [head, t.talent_name];
    const skills =
        t.matching_skills_count != null && String(t.matching_skills_count).trim() !== ""
            ? Number(t.matching_skills_count)
            : null;
    if (skills != null && Number.isFinite(skills)) {
        parts.push(`${skills} compétence${skills === 1 ? "" : "s"} correspondante${skills === 1 ? "" : "s"}`);
    }
    const load = asPct(t.current_load_pct);
    if (load) parts.push(`charge actuelle ${load}`);
    return parts.slice(0, 4).join(" · ");
}

function summarizeObject(prefix: string, obj: Record<string, unknown>): string {
    const head = prefix.replace(/:\s*$/, "").trim() || "Demande";
    const parts: string[] = [head];
    const name = obj.talent_name ?? obj.name ?? obj.full_name ?? obj.project_name;
    if (name != null && String(name).trim()) parts.push(String(name).trim());
    const skills = obj.matching_skills_count ?? obj.skills_count;
    if (skills != null && String(skills).trim() !== "") {
        const n = Number(skills);
        if (Number.isFinite(n)) {
            parts.push(`${n} compétence${n === 1 ? "" : "s"} correspondante${n === 1 ? "" : "s"}`);
        }
    }
    const load = asPct(obj.current_load_pct ?? obj.current_load);
    if (load) parts.push(`charge actuelle ${load}`);
    return parts.slice(0, 4).join(" · ");
}

function tryParseJsonBlob(text: string): { prefix: string; parsed: unknown } | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const suffixMatch = trimmed.match(/^(.*?):\s*(\[[\s\S]*\]|\{[\s\S]*\})\s*$/s);
    if (suffixMatch) {
        try {
            return { prefix: suffixMatch[1].trim(), parsed: JSON.parse(suffixMatch[2]) };
        } catch {
            /* next */
        }
    }

    const arrayStart = trimmed.indexOf("[");
    if (arrayStart >= 0) {
        try {
            const parsed = JSON.parse(trimmed.slice(arrayStart));
            const prefix = trimmed
                .slice(0, arrayStart)
                .replace(/[:\s]+$/u, "")
                .trim();
            return { prefix, parsed };
        } catch {
            /* next */
        }
    }

    const objStart = trimmed.indexOf("{");
    if (objStart >= 0) {
        try {
            const parsed = JSON.parse(trimmed.slice(objStart));
            const prefix = trimmed
                .slice(0, objStart)
                .replace(/[:\s]+$/u, "")
                .trim();
            return { prefix, parsed };
        } catch {
            return null;
        }
    }

    try {
        return { prefix: "", parsed: JSON.parse(trimmed) };
    } catch {
        return null;
    }
}

function extractTalentsFromParsed(parsed: unknown): ReallocationTalentCard[] {
    if (Array.isArray(parsed)) {
        return parsed
            .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object" && !Array.isArray(x))
            .map((item, i) => toTalentCard(item, i));
    }
    if (parsed && typeof parsed === "object") {
        const o = parsed as Record<string, unknown>;
        const nested = o.talents ?? o.candidates ?? o.recommendations ?? o.items;
        if (Array.isArray(nested)) {
            return nested
                .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object" && !Array.isArray(x))
                .map((item, i) => toTalentCard(item, i));
        }
        if (o.talent_name || o.name || o.full_name || o.talent_id) {
            return [toTalentCard(o, 0)];
        }
    }
    return [];
}

function looksLikeEmbeddedJson(text: string): boolean {
    const t = text.trim();
    if (!t) return false;
    if (t.startsWith("[") || t.startsWith("{")) return true;
    return /:\s*[\[{]/.test(t);
}

function humanFallbackForUnparsedJson(text: string): ParsedRequestMessage {
    const suffixMatch = text.trim().match(/^(.*?):\s*[\[{]/s);
    const prefix = (suffixMatch?.[1] ?? "").trim();
    const head =
        /réaffect|realloc/i.test(prefix) || /réaffect|realloc/i.test(text)
            ? "Réaffectation proposée"
            : prefix.replace(/:\s*$/, "").trim() || "Demande";
    return { prefix, summary: head, talents: [], fromJson: true };
}

/** Parse le message RH et produit un résumé humain (jamais de JSON brut). */
export function parseRequestMessage(message?: string | null): ParsedRequestMessage {
    const text = String(message ?? "").trim();
    if (!text) {
        return { prefix: "", summary: "", talents: [], fromJson: false };
    }

    const embedded = tryParseJsonBlob(text);
    if (!embedded) {
        if (looksLikeEmbeddedJson(text)) {
            return humanFallbackForUnparsedJson(text);
        }
        return { prefix: "", summary: text, talents: [], fromJson: false };
    }

    const { prefix, parsed } = embedded;
    const talents = extractTalentsFromParsed(parsed);

    if (talents.length > 0) {
        return {
            prefix,
            summary: summarizeTalents(prefix, talents),
            talents,
            fromJson: true,
        };
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
            prefix,
            summary: summarizeObject(prefix, parsed as Record<string, unknown>),
            talents: [],
            fromJson: true,
        };
    }

    if (Array.isArray(parsed) && parsed.length === 0) {
        const head = prefix.replace(/:\s*$/, "").trim() || "Demande";
        return { prefix, summary: `${head} · aucun élément`, talents: [], fromJson: true };
    }

    return { prefix, summary: prefix || "Demande", talents: [], fromJson: true };
}

/** Résumé FR une ligne pour la table / Kanban (jamais de JSON brut). */
export function formatRequestMessage(request: { message?: string | null } | string | null | undefined): string {
    const message = typeof request === "string" || request == null ? request : request.message;
    const summary = parseRequestMessage(message).summary.trim();
    if (!summary) return "";
    if (summary.startsWith("[") || summary.startsWith("{") || looksLikeEmbeddedJson(summary)) {
        return humanFallbackForUnparsedJson(String(message ?? "")).summary;
    }
    return summary;
}

export function formatTalentLoad(value: unknown): string {
    return asPct(value) ?? "—";
}
