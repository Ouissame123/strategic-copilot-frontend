import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { orchestratorApi } from "@/api/orchestrator.api";
import { MATCHMAKER_KEYS } from "@/hooks/useMatchmakerQuery";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type {
    OrchestratorRecomputeRequest,
    OrchestratorRecomputeResponse,
} from "@/types/orchestrator-recompute.types";

function defaultEstimatedSeconds(scope: OrchestratorRecomputeRequest["scope"]): number {
    return scope === "project" ? 8 : 25;
}

export async function invalidateAfterOrchestratorRecompute(
    qc: QueryClient,
    variables: OrchestratorRecomputeRequest,
): Promise<void> {
    await qc.invalidateQueries({ queryKey: ["dashboard"] });

    if (variables.scope === "project" && variables.project_id?.trim()) {
        const projectId = variables.project_id.trim();
        await Promise.all([
            qc.invalidateQueries({ queryKey: MATCHMAKER_KEYS.forProject(projectId) }),
            qc.invalidateQueries({ queryKey: queryKeys.projectDetail(projectId) }),
            qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(projectId) }),
        ]);
        return;
    }

    await qc.invalidateQueries({ queryKey: ["manager-matchmaker"] });
}

export function useOrchestratorRecompute(options?: {
    onAwaitingChange?: (awaiting: boolean) => void;
}) {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: (payload: OrchestratorRecomputeRequest) => orchestratorApi.recompute(payload),
        onSuccess: (data: OrchestratorRecomputeResponse, variables) => {
            if (data.status === "accepted") {
                push(data.message, "success");
                options?.onAwaitingChange?.(true);

                const delayMs = (data.estimated_duration_seconds ?? defaultEstimatedSeconds(variables.scope)) * 1000;
                window.setTimeout(() => {
                    void invalidateAfterOrchestratorRecompute(qc, variables).finally(() => {
                        options?.onAwaitingChange?.(false);
                        push(
                            variables.scope === "project" ? "Analyse projet actualisée" : "Dashboard actualisé",
                            "success",
                        );
                    });
                }, delayMs);
                return;
            }

            push(data.message || "Recompute refusé.", "error");
        },
        onError: (err: Error) => {
            push(err.message || "Erreur réseau. Réessayez.", "error");
        },
    });
}
