import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/api/agents.api";

export const managerRiskQueryKey = (projectId: string | null) => ["manager-risk-page", projectId ?? "all"] as const;

/** Risques KPI pour un projet — POST /webhook/api/project/risks */
export function useManagerRiskData(projectId: string | null) {
    const id = projectId?.trim() || null;
    return useQuery({
        queryKey: managerRiskQueryKey(id),
        queryFn: () =>
            agentsApi.riskKpi({
                project_id: id ?? undefined,
                use_ai: true,
            }).then((r) => r.data),
        staleTime: 60_000,
        refetchOnWindowFocus: true,
        retry: false,
        enabled: Boolean(id),
    });
}
