import type { ReallocationProposal } from "./parseReallocation";

export type DedupeableRhAction = {
    id: string;
    type: string;
    createdAt: string;
    projectId: string;
    projectName: string;
    proposals: ReallocationProposal[] | null;
};

export type DedupedRhAction<T extends DedupeableRhAction> = T & {
    /** Nombre d’actions fusionnées (1 = pas de doublon). */
    duplicateCount: number;
};

function isReallocationType(type: string): boolean {
    const t = type.toLowerCase().trim();
    return t === "reallocation" || t === "réaffectation" || t === "reaffectation";
}

function groupKey(action: DedupeableRhAction): string | null {
    if (!isReallocationType(action.type)) return null;
    if (!action.proposals || action.proposals.length === 0) return null;
    const firstTalentId = action.proposals[0]?.talent_id?.trim() ?? "";
    if (!firstTalentId) return null;
    const projectKey = (action.projectId || action.projectName).trim().toLowerCase();
    if (!projectKey) return null;
    return `${firstTalentId}::${projectKey}`;
}

function createdAtMs(iso: string): number {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : 0;
}

/**
 * Déduplication présentation : groupe les réaffectations parsables par
 * (premier talent_id, projet), garde la plus récente, badge ×{count} si count > 1.
 * Non parsables / autres types : jamais groupés.
 */
export function dedupeReallocationActions<T extends DedupeableRhAction>(actions: T[]): DedupedRhAction<T>[] {
    const groups = new Map<string, T[]>();
    const ungrouped: T[] = [];

    for (const action of actions) {
        const key = groupKey(action);
        if (!key) {
            ungrouped.push(action);
            continue;
        }
        const bucket = groups.get(key);
        if (bucket) bucket.push(action);
        else groups.set(key, [action]);
    }

    const deduped: DedupedRhAction<T>[] = [];

    for (const bucket of groups.values()) {
        const sorted = [...bucket].sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
        const newest = sorted[0];
        if (!newest) continue;
        deduped.push({ ...newest, duplicateCount: sorted.length });
    }

    for (const action of ungrouped) {
        deduped.push({ ...action, duplicateCount: 1 });
    }

    return deduped.sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
}
