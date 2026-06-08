import { useQuery } from "@tanstack/react-query";
import { fetchProjectsListPage } from "@/api/projects-list.api";
import { queryKeys } from "@/lib/query-keys";
import type { Project } from "@/types/crud-domain";

export type ProjectsPagination = {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
};

export type ProjectWithViability = Project & {
    viabilityScore?: number | null;
    riskLabel?: string | null;
    /** Affichage responsable / chef de projet si fourni par l’API. */
    ownerLabel?: string | null;
};

function toProjectRow(input: unknown, index: number): Project {
    const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    const id = row.project_id ?? row.id ?? `project-${index + 1}`;
    return {
        ...row,
        id: String(id),
        name: String(row.name ?? ""),
        description: row.description != null ? String(row.description) : row.summary != null ? String(row.summary) : null,
        status: row.status != null ? String(row.status) : null,
    } as Project;
}

/** Champs affichés à partir de la ligne liste uniquement (aucun appel API supplémentaire). */
function toProjectRowWithViability(input: unknown, index: number): ProjectWithViability {
    const p = toProjectRow(input, index);
    const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    const viabilityScore =
        typeof row.viability_score === "number"
            ? row.viability_score
            : typeof row.viabilityScore === "number"
              ? row.viabilityScore
              : null;
    const decision =
        row.decision != null && String(row.decision).trim()
            ? String(row.decision)
            : p.decision != null && String(p.decision).trim()
              ? String(p.decision)
              : null;
    const riskLabel =
        row.risk_label != null
            ? String(row.risk_label)
            : row.riskLabel != null
              ? String(row.riskLabel)
              : null;
    const ownerRaw = getOwnerFromRow(row);
    const ownerLabel = ownerRaw?.trim() ? ownerRaw.trim() : null;
    return { ...p, viabilityScore, decision, riskLabel, ownerLabel };
}

/** Priorité d’affichage Responsable — alignée sur le contrat documenté dans `projects-list.api.ts`. */
function getOwnerFromRow(row: Record<string, unknown>): string | null {
    const keys = [
        "owner_name",
        "project_manager_name",
        "manager_name",
        "chef_projet",
        "lead_name",
        "responsible_name",
        "owner",
    ];
    for (const k of keys) {
        const v = row[k];
        if (v != null && String(v).trim()) return String(v).trim();
    }
    return null;
}

export type ProjectsListQueryData = {
    projects: ProjectWithViability[];
    pagination: ProjectsPagination;
};

export async function fetchProjectsListEnriched(page: number, perPage: number, signal?: AbortSignal): Promise<ProjectsListQueryData> {
    const payload = (await fetchProjectsListPage(page, perPage, { signal })) as Record<string, unknown>;
    const items = Array.isArray(payload.items) ? payload.items : [];
    const projects = items.map((row, idx) => toProjectRowWithViability(row, idx));
    const p = payload.pagination && typeof payload.pagination === "object" ? (payload.pagination as Record<string, unknown>) : {};
    const pagination: ProjectsPagination = {
        page: Number(p.page ?? page) || page,
        per_page: Number(p.per_page ?? 10) || 10,
        total_items: Number(p.total_items ?? items.length) || items.length,
        total_pages: Number(p.total_pages ?? 1) || 1,
    };
    return { projects, pagination };
}

export function useProjectsListQuery(page: number, perPage: number) {
    return useQuery({
        queryKey: queryKeys.projects.list(page, perPage),
        queryFn: ({ signal }) => fetchProjectsListEnriched(page, perPage, signal),
    });
}
