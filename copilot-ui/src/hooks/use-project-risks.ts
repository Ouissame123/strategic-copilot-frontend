import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/api/agents.api";
import { queryKeys } from "@/lib/query-keys";

export function useProjectRisks(projectId: string | null) {
    const id = projectId?.trim() || null;
    return useQuery({
        queryKey: queryKeys.manager.projectRisks(id),
        queryFn: () => {
            if (!id) return Promise.resolve({ project_id: "", alerts: [], summary: {} });
            return agentsApi.riskKpi({ project_id: id, use_ai: true }).then((res) => res.data);
        },
        enabled: Boolean(id),
        staleTime: 60_000,
    });
}
