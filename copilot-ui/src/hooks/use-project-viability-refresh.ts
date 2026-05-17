import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orchestratorApi } from "@/api/orchestrator.api";
import {
    buildProjectViabilityRefreshBody,
    invalidateAfterProjectViabilityRefresh,
} from "@/lib/project-viability-refresh";

export type ProjectViabilityRefreshVariables = {
    projectId: string;
    enterpriseId: string;
};

/** POST `/webhook/api/project/viability` — photo complète projet (remplace Risk_KPI pour le modal). */
export function useProjectViabilityRefresh() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, enterpriseId }: ProjectViabilityRefreshVariables) =>
            orchestratorApi
                .computeViability(buildProjectViabilityRefreshBody(projectId, enterpriseId))
                .then((r) => r.data),
        onSuccess: async (_data, { projectId }) => {
            await invalidateAfterProjectViabilityRefresh(qc, projectId);
        },
    });
}
