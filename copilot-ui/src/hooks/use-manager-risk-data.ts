import { type QueryClient, useQuery } from "@tanstack/react-query";
import { getProjectRisks } from "@/api/project-risks.api";
import type { RisksResponse } from "@/api/project-risks.api";

export type ManagerRiskDataFilters = {
    page?: number;
    limit?: number;
    severity?: string;
    status?: string;
    project_id?: string;
    search?: string;
    scope?: string;
};

export const managerRiskQueryKey = (filters: ManagerRiskDataFilters = {}) =>
    ["manager-risk-page", filters] as const;

function resolveProjectId(input: string | null | ManagerRiskDataFilters | undefined): string | null {
    if (input == null) return null;
    if (typeof input === "string") return input.trim() || null;
    return input.project_id?.trim() || null;
}

/** GET /webhook/api/project/risks — vue manager (tous projets) ou filtrée par projet. */
export function useManagerRiskData(projectIdOrFilters?: string | null | ManagerRiskDataFilters) {
    const filters: ManagerRiskDataFilters =
        typeof projectIdOrFilters === "object" && projectIdOrFilters !== null
            ? projectIdOrFilters
            : { project_id: typeof projectIdOrFilters === "string" ? projectIdOrFilters : undefined };

    const projectId = resolveProjectId(filters);

    const query = useQuery({
        queryKey: managerRiskQueryKey(filters),
        queryFn: () => getProjectRisks(projectId ?? undefined),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        retry: false,
    });

    return {
        ...query,
        data: query.data as RisksResponse | undefined,
        pagination: undefined,
    };
}

/** Invalidation après scan Watchdog, patch alerte, ou refresh backend risques. */
export async function invalidateManagerRiskQueries(qc: QueryClient): Promise<void> {
    await Promise.all([
        qc.invalidateQueries({ queryKey: ["manager-risk-page"] }),
        qc.invalidateQueries({ queryKey: ["manager", "project-risks"] }),
        qc.invalidateQueries({ queryKey: ["project-risks"] }),
        qc.invalidateQueries({ queryKey: ["risks"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
}
