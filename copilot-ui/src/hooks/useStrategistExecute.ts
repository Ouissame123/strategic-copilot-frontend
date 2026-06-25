import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
    getStrategistExecuteErrorCode,
    managerStrategistApi,
    type StrategistAction,
    type StrategistExecuteResponse,
} from "@/api/manager-strategist-options.api";
import { COPILOT_DECISIONS_QUERY_ROOT } from "@/hooks/useDecisions";
import { MANAGER_HR_ACTIONS_QUERY_ROOT } from "@/hooks/use-manager-hr-actions";
import { invalidateManagerRiskQueries } from "@/hooks/use-manager-risk-data";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { ProjectDetailResponse } from "@/types/api.types";

export type StrategistExecuteVars = {
    optionId: string;
    action?: StrategistAction;
};

type OptimisticContext = {
    prev: ProjectDetailResponse | undefined;
};

export function useStrategistExecute(projectId: string) {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    const pid = projectId.trim();
    const detailKey = queryKeys.projectDetail(pid);

    return useMutation<StrategistExecuteResponse, unknown, StrategistExecuteVars, OptimisticContext>({
        mutationFn: (vars) =>
            managerStrategistApi.execute(vars.optionId, vars.action ?? "execute").then((r) => r.data),

        onMutate: async (vars) => {
            await qc.cancelQueries({ queryKey: detailKey });
            const prev = qc.getQueryData<ProjectDetailResponse>(detailKey);
            if (prev) {
                qc.setQueryData<ProjectDetailResponse>(detailKey, {
                    ...prev,
                    arbitrage_options: (prev.arbitrage_options ?? []).filter((o) => o.id !== vars.optionId),
                });
            }
            return { prev };
        },

        onError: (err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(detailKey, ctx.prev);

            const status = isAxiosError(err) ? err.response?.status : undefined;
            const code = getStrategistExecuteErrorCode(err);

            if (status === 404) {
                toast("Cette option n'est plus disponible (déjà exécutée ou expirée).", "error");
            } else if (code === "FORBIDDEN_PROJECT" || status === 403) {
                toast("Action interdite sur ce projet.", "error");
            } else {
                toast("Erreur lors de l'exécution de l'option Strategist.", "error");
            }
        },

        onSuccess: (data) => {
            const summary = data.decision_executed?.summary?.trim();
            if (summary) toast(summary, "success", 6000);

            const rhActionId = data.db_result?.rh_action_id;
            const rhActionType = data.db_result?.rh_action_type;
            if (rhActionId) {
                const typeLabel = rhActionType?.trim() || "RH";
                toast(`Demande RH créée (type: ${typeLabel}). Visible dans Demandes RH.`, "info", 5000);
            }

            if (data.effect === "applied_delay" && data.db_result?.project_updated?.milestone_at) {
                toast("Échéance projet décalée. Recompute en cours.", "success", 4000);
            }
        },

        onSettled: async () => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: detailKey }),
                qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(pid) }),
                qc.invalidateQueries({ queryKey: ["manager-risk-page"] }),
                qc.invalidateQueries({ queryKey: MANAGER_HR_ACTIONS_QUERY_ROOT }),
                qc.invalidateQueries({ queryKey: ["manager-notifications"] }),
                qc.invalidateQueries({ queryKey: COPILOT_DECISIONS_QUERY_ROOT }),
                invalidateManagerRiskQueries(qc),
            ]);
        },
    });
}
