import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/services/agents.api";

function invalidateProjectScopes(qc: ReturnType<typeof useQueryClient>) {
    void qc.invalidateQueries({ queryKey: ["project-detail"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
    void qc.invalidateQueries({ queryKey: ["manager", "project-risks"] });
    void qc.invalidateQueries({ queryKey: ["projects"] });
    void qc.invalidateQueries({ queryKey: ["decision-log"] });
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

export const useRiskKpi = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (projectId: string) => agentsApi.riskKpi(projectId).then((r) => r.data),
        onSuccess: () => invalidateProjectScopes(qc),
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
