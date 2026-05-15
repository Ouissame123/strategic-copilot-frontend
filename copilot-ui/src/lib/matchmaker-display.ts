/** Utilitaires d’affichage Matchmaker (tableau de bord) — logique pure, sans appel API. */

const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/gi;

function readStr(o: Record<string, unknown>, k: string): string {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return "";
}

function readNum(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

/** Retire UUID / identifiants techniques du texte affiché. */
export function stripTechnicalIdentifiers(text: string): string {
    if (!text) return "";
    let s = text.replace(UUID_RE, " ");
    s = s.replace(/\b[0-9a-fA-F]{32}\b/gi, " ");
    s = s.replace(/\s{2,}/g, " ").replace(/\s*[·•]\s*[·•]/g, " · ");
    s = s.trim().replace(/^[\s·•,;:-]+|[\s·•,;:-]+$/g, "");
    return s;
}

export function looksLikeUuidOrTechnicalId(s: string): boolean {
    const t = s.trim();
    if (!t) return true;
    if (UUID_RE.test(t)) return true;
    if (/^[0-9a-f-]{36}$/i.test(t)) return true;
    if (/^[0-9a-f]{32}$/i.test(t)) return true;
    return false;
}

/** Rang de sévérité (plus élevé = plus prioritaire). */
export function matchmakerSeverityRank(priorityLevel: unknown, severity: unknown): number {
    const raw = `${String(priorityLevel ?? "")} ${String(severity ?? "")}`.toLowerCase();
    if (raw.includes("critical") || raw.includes("critique") || raw.includes("p0") || raw.includes("urgent")) return 4;
    if (raw.includes("high") || raw.includes("élev") || raw.includes("elev") || raw.includes("p1")) return 3;
    if (raw.includes("medium") || raw.includes("moyen") || raw.includes("p2")) return 2;
    if (raw.includes("low") || raw.includes("bas") || raw.includes("p3")) return 1;
    const n = readNum(priorityLevel) ?? readNum(severity);
    if (n !== null && n >= 0 && n <= 4 && Number.isInteger(n)) return n;
    if (n !== null && n >= 1 && n <= 10) return Math.min(4, Math.round(n / 2.5));
    return 0;
}

function normalizeRecKey(text: string): string {
    return stripTechnicalIdentifiers(text)
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

export type MatchmakerRecommendationRow = {
    key: string;
    projectId: string;
    projectName: string;
    actionSummary: string;
    priorityRaw: string;
    severityRank: number;
};

/**
 * Déduplication par (project_id, texte de recommandation), puis une ligne par projet
 * (recommandation de sévérité maximale), tri décroissant, max 5.
 */
export function buildExecutiveRecommendations(items: unknown[], limit = 5): MatchmakerRecommendationRow[] {
    const parsed: Array<{
        projectId: string;
        projectName: string;
        textRaw: string;
        textKey: string;
        rank: number;
        priorityRaw: string;
    }> = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const projectIdRaw = readStr(o, "project_id") || readStr(o, "projectId");
        const projectName = readStr(o, "project_name") || "—";
        const pid = projectIdRaw ? `id:${projectIdRaw}` : `name:${stripTechnicalIdentifiers(projectName) || "—"}`;

        let textRaw =
            readStr(o, "action_summary") ||
            readStr(o, "summary") ||
            readStr(o, "recommendation") ||
            readStr(o, "description") ||
            readStr(o, "message") ||
            "";
        const talent = readStr(o, "talent_name") || readStr(o, "talent");
        const skill = readStr(o, "skill_name") || readStr(o, "skill");
        if (!textRaw) {
            const bits: string[] = [];
            if (talent && !looksLikeUuidOrTechnicalId(talent)) bits.push(talent);
            if (skill && !looksLikeUuidOrTechnicalId(skill)) bits.push(skill);
            textRaw = bits.join(" · ");
        }
        textRaw = stripTechnicalIdentifiers(textRaw);
        if (!textRaw) textRaw = "—";

        const priorityRaw =
            readStr(o, "priority_level") ||
            readStr(o, "severity") ||
            readStr(o, "priority") ||
            readStr(o, "risk_level") ||
            "";
        const rank = matchmakerSeverityRank(
            readStr(o, "priority_level") || readStr(o, "priority"),
            readStr(o, "severity") || readStr(o, "risk_level"),
        );

        const textKey = normalizeRecKey(textRaw);
        parsed.push({ projectId: pid, projectName, textRaw, textKey, rank, priorityRaw });
    }

    const byProjectAndText = new Map<string, (typeof parsed)[0]>();
    for (const p of parsed) {
        const k = `${p.projectId}\u0000${p.textKey}`;
        const cur = byProjectAndText.get(k);
        if (!cur || p.rank > cur.rank) byProjectAndText.set(k, p);
    }

    const byProject = new Map<string, (typeof parsed)[0]>();
    for (const p of byProjectAndText.values()) {
        const cur = byProject.get(p.projectId);
        if (!cur || p.rank > cur.rank) byProject.set(p.projectId, p);
        else if (p.rank === cur.rank && p.textRaw.length > cur.textRaw.length) byProject.set(p.projectId, p);
    }

    const rows: MatchmakerRecommendationRow[] = [...byProject.values()]
        .sort((a, b) => b.rank - a.rank || b.textRaw.length - a.textRaw.length)
        .slice(0, limit)
        .map((p, idx) => ({
            key: `mm-rec-${p.projectId}-${idx}`,
            projectId: p.projectId,
            projectName: stripTechnicalIdentifiers(p.projectName) || "—",
            actionSummary: p.textRaw,
            priorityRaw: stripTechnicalIdentifiers(p.priorityRaw) || "",
            severityRank: p.rank,
        }));

    return rows;
}

export type MatchmakerUnassignedGroup = {
    key: string;
    projectName: string;
    candidates: string[];
};

function candidateNameFromRow(o: Record<string, unknown>): string {
    return (
        readStr(o, "talent_name") ||
        readStr(o, "candidate_name") ||
        readStr(o, "full_name") ||
        readStr(o, "name") ||
        readStr(o, "talent") ||
        ""
    );
}

/** Regroupe les talents non affectés par projet ; max `limit` projets, triés par nombre de candidats. */
export function buildUnassignedGroupsByProject(items: unknown[], limit = 5): MatchmakerUnassignedGroup[] {
    const map = new Map<
        string,
        { projectName: string; names: Set<string> }
    >();

    for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const projectIdRaw = readStr(o, "project_id") || readStr(o, "projectId");
        const projectName = readStr(o, "project_name") || "—";
        const key = projectIdRaw ? `id:${projectIdRaw}` : `name:${projectName}`;

        let name = candidateNameFromRow(o);
        name = stripTechnicalIdentifiers(name);
        if (!name || looksLikeUuidOrTechnicalId(name)) continue;

        if (!map.has(key)) map.set(key, { projectName, names: new Set() });
        map.get(key)!.names.add(name);
    }

    return [...map.entries()]
        .map(([k, v]) => ({
            key: k,
            projectName: stripTechnicalIdentifiers(v.projectName) || "—",
            candidates: [...v.names].sort((a, b) => a.localeCompare(b, "fr")),
        }))
        .sort((a, b) => b.candidates.length - a.candidates.length || a.projectName.localeCompare(b.projectName, "fr"))
        .slice(0, limit);
}

export type MatchmakerSkillGapRow = {
    key: string;
    title: string;
    subtitle: string | null;
    occurrenceCount: number;
};

function readOccurrenceCount(o: Record<string, unknown>): number {
    const keys = ["occurrence_count", "occurrences", "occurrence", "count", "detections", "frequency", "qty"];
    for (const k of keys) {
        const n = readNum(o[k]);
        if (n !== null && n >= 0) return Math.round(n);
    }
    return 0;
}

/** Trie les écarts par nombre d’occurrences décroissant ; max `limit` entrées. */
export function buildSkillGapsSorted(items: unknown[], limit = 5): MatchmakerSkillGapRow[] {
    const rows: MatchmakerSkillGapRow[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const skill = stripTechnicalIdentifiers(readStr(o, "skill_name") || readStr(o, "skill") || readStr(o, "gap"));
        const project = stripTechnicalIdentifiers(readStr(o, "project_name") || readStr(o, "project") || "");
        const title = skill || stripTechnicalIdentifiers(readStr(o, "title") || readStr(o, "label")) || "—";
        if (title === "—" && !project && !stripTechnicalIdentifiers(readStr(o, "message"))) continue;
        const subtitle =
            project && project !== title
                ? project
                : stripTechnicalIdentifiers(readStr(o, "message") || readStr(o, "description") || readStr(o, "gap_description")) ||
                  null;
        const occurrenceCount = readOccurrenceCount(o);
        rows.push({
            key: `gap-${i}-${title.slice(0, 24)}`,
            title,
            subtitle: subtitle && !looksLikeUuidOrTechnicalId(subtitle) ? subtitle : null,
            occurrenceCount,
        });
    }

    return rows
        .sort((a, b) => b.occurrenceCount - a.occurrenceCount || a.title.localeCompare(b.title, "fr"))
        .slice(0, limit);
}
