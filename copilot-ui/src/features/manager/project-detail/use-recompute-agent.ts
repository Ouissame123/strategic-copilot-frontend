import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recomputeAgent } from "@/features/manager/project-detail/recompute.api";
import type { AgentKey } from "@/features/manager/project-detail/types";
import { queryKeys } from "@/lib/query-keys";

export function useRecomputeAgent(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (agent: AgentKey) => recomputeAgent({ project_id: projectId, agent }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.projectDetail(projectId) });
            void qc.invalidateQueries({ queryKey: queryKeys.projectRisks(projectId) });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(projectId) });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.projectRisks(projectId) });
        },
    });
}
