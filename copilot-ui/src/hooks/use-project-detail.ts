import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    executeArbitrage,
    fetchProjectDetail,
    patchProject,
    recomputeProject,
    simulateWhatIf,
} from "@/api/project-detail.api";
import { mapRawToCopilotData } from "@/lib/map-copilot-data";
import type {
    ExecuteArbitrageRequest,
    PatchProjectPayload,
    ProjectDetail,
    RecomputeRequest,
    WhatIfRequest,
} from "@/types/api.types";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export const projectDetailKeys = {
    all: ["mission-control-detail"] as const,
    byId: (id: string) => [...projectDetailKeys.all, id] as const,
};

export function useProjectDetail(id: string) {
    return useQuery({
        queryKey: projectDetailKeys.byId(id),
        queryFn: () => fetchProjectDetail(id),
        staleTime: 30_000,
        retry: 2,
        refetchOnWindowFocus: false,
        enabled: Boolean(id),
    });
}

export function usePatchProject(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: PatchProjectPayload) => patchProject(id, payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: projectDetailKeys.byId(id) });
        },
    });
}

export function useRecompute() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: RecomputeRequest) => recomputeProject(payload),
        onSuccess: (response, variables) => {
            const copilot = mapRawToCopilotData(unwrapN8nRoot(response));
            if (copilot) {
                qc.setQueryData<ProjectDetail>(projectDetailKeys.byId(variables.project_id), (old) =>
                    old ? { ...old, copilot_data: copilot } : old,
                );
            }
            window.setTimeout(() => {
                void qc.invalidateQueries({ queryKey: projectDetailKeys.byId(variables.project_id) });
            }, 35_000);
        },
    });
}

export function useWhatIfSimulation() {
    return useMutation({
        mutationFn: (payload: WhatIfRequest) => simulateWhatIf(payload),
    });
}

export function useExecuteArbitrage(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: ExecuteArbitrageRequest) => executeArbitrage(payload),
        onSuccess: () => {
            window.setTimeout(() => {
                void qc.invalidateQueries({ queryKey: projectDetailKeys.byId(projectId) });
            }, 5_000);
        },
    });
}
