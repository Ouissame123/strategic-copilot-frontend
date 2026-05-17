import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orchestratorApi } from "@/api/orchestrator.api";
import { agentsApi } from "@/services/agents.api";
import { buildProjectViabilityRefreshBody, invalidateAfterProjectViabilityRefresh } from "@/lib/project-viability-refresh";
import { invalidateManagerRiskQueries } from "./use-manager-risk-data";

function invalidateProjectScopes(qc: ReturnType<typeof useQueryClient>) {
    void qc.invalidateQueries({ queryKey: ["project-detail"] });
    void qc.invalidateQueries({ queryKey: ["projects"] });
    void qc.invalidateQueries({ queryKey: ["decision-log"] });
    void invalidateManagerRiskQueries(qc);
}

export const useRecomputeFull = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (projectId: string) => agentsApi.recomputeFull(projectId).then((r) => r.data),
        onSuccess: () => invalidateProjectScopes(qc),
    });
};

export const useObserverKpi = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (projectId: string) => agentsApi.observerKpi(projectId).then((r) => r.data),
        onSuccess: () => invalidateProjectScopes(qc),
    });
};

/** @deprecated Préférer `useProjectViabilityRefresh` — POST viabilité (photo cohérente), pas Risk_KPI. */
export const useRiskKpi = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, enterpriseId }: { projectId: string; enterpriseId: string }) =>
            orchestratorApi
                .computeViability(buildProjectViabilityRefreshBody(projectId, enterpriseId))
                .then((r) => r.data),
        onSuccess: async (_data, { projectId }) => {
            invalidateProjectScopes(qc);
            await invalidateAfterProjectViabilityRefresh(qc, projectId);
        },
    });
};

export const useMatchmakerTalents = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (projectId: string) => agentsApi.matchmakerTalents(projectId).then((r) => r.data),
        onSuccess: () => invalidateProjectScopes(qc),
    });
};

export const useExecuteArbitrage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ optionId, action }: { optionId: string; action: "execute" | "reject" }) =>
            agentsApi.executeArbitrage(optionId, action).then((r) => r.data),
        onSuccess: () => invalidateProjectScopes(qc),
    });
};
