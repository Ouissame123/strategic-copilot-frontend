import { useMemo } from "react";
import { type QueryClient, useQuery } from "@tanstack/react-query";
import { managerDashboardApi } from "@/api/manager-dashboard.api";
import type { RisksResponse } from "@/api/project-risks.api";
import { mapDashboardToRisksResponse } from "@/lib/manager-dashboard-risks";

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

function resolveDashboardScope(filters: ManagerRiskDataFilters): "mine" | "enterprise" {
    return filters.scope === "enterprise" ? "enterprise" : "mine";
}

/** Alertes manager — GET `/webhook/manager/dashboard` (pas `/webhook/api/project/risks`). */
export function useManagerRiskData(projectIdOrFilters?: string | null | ManagerRiskDataFilters) {
    const filters: ManagerRiskDataFilters =
        typeof projectIdOrFilters === "object" && projectIdOrFilters !== null
            ? projectIdOrFilters
            : { project_id: typeof projectIdOrFilters === "string" ? projectIdOrFilters : undefined };

    const projectId = resolveProjectId(filters);
    const scope = resolveDashboardScope(filters);

    const query = useQuery({
        queryKey: ["dashboard", scope],
        queryFn: () => managerDashboardApi.get(scope).then((r) => r.data),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        retry: false,
    });

    const data = useMemo((): RisksResponse | undefined => {
        if (!query.data) return undefined;
        return mapDashboardToRisksResponse(query.data, projectId);
    }, [query.data, projectId]);

    return {
        ...query,
        data,
        pagination: undefined,
    };
}

/** Invalidation après scan Watchdog, patch alerte, ou refresh backend risques. */
export async function invalidateManagerRiskQueries(qc: QueryClient): Promise<void> {
    await Promise.all([
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["manager-risk-page"] }),
        qc.invalidateQueries({ queryKey: ["manager", "project-risks"] }),
        qc.invalidateQueries({ queryKey: ["project-risks"] }),
        qc.invalidateQueries({ queryKey: ["risks"] }),
    ]);
}
