import { type QueryClient, useQuery } from "@tanstack/react-query";
import { getProjectRisks } from "@/api/project-risks.api";
export const managerRiskQueryKey = (projectId: string | null) => ["manager-risk-page", projectId ?? "all"] as const;

/** GET /webhook/api/project/risks — vue manager (tous projets) ou filtrée par projet. */
export function useManagerRiskData(projectId: string | null) {
    const id = projectId?.trim() || null;
    return useQuery({
        queryKey: managerRiskQueryKey(id),
        queryFn: () => getProjectRisks(id ?? undefined),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        retry: false,
    });
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
