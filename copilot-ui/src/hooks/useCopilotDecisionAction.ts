import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getCopilotDecisionErrorCode,
    managerCopilotDecisionsApi,
    type CopilotDecisionAction,
} from "@/api/manager-copilot-decisions.api";
import { COPILOT_DECISIONS_QUERY_ROOT } from "@/hooks/useDecisions";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { CopilotDecision } from "@/services/decisions.api";

type DecisionsListCache = {
    decisions?: CopilotDecision[];
    [key: string]: unknown;
};

function filterDecisionFromCache(prev: unknown, decisionId: string): unknown {
    if (!prev || typeof prev !== "object") return prev;
    const bag = prev as DecisionsListCache;
    if (!Array.isArray(bag.decisions)) return prev;
    return {
        ...bag,
        decisions: bag.decisions.filter((d) => d.id !== decisionId),
    };
}

const CLOSING_ACTIONS: CopilotDecisionAction[] = ["apply", "dismiss", "ignore"];

export function usePatchCopilotDecision(projectId?: string) {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    const pid = projectId?.trim();

    return useMutation({
        mutationFn: (vars: { decisionId: string; action: CopilotDecisionAction; note?: string }) =>
            managerCopilotDecisionsApi
                .patch(vars.decisionId, { action: vars.action, note: vars.note })
                .then((r) => r.data),

        onMutate: async (vars) => {
            if (!CLOSING_ACTIONS.includes(vars.action)) return { snapshots: [] as Array<readonly [readonly unknown[], unknown]> };

            const queryRoots: readonly (readonly string[])[] = [COPILOT_DECISIONS_QUERY_ROOT, ["decisions"]];
            for (const root of queryRoots) {
                await qc.cancelQueries({ queryKey: root });
            }

            const snapshots: Array<readonly [readonly unknown[], unknown]> = [];

            for (const root of queryRoots) {
                for (const [key, prev] of qc.getQueriesData({ queryKey: root })) {
                    if (!prev) continue;
                    snapshots.push([key, prev] as const);
                    qc.setQueryData(key, filterDecisionFromCache(prev, vars.decisionId));
                }
            }

            return { snapshots };
        },

        onError: (err, _vars, ctx) => {
            ctx?.snapshots?.forEach(([key, prev]) => {
                qc.setQueryData(key, prev);
            });
            const code = getCopilotDecisionErrorCode(err);
            if (code === "COPILOT_DECISION_NOT_FOUND") {
                toast("Cette décision n'existe plus.", "error");
            } else {
                toast("Erreur lors de l'action sur la décision Copilot.", "error");
            }
        },

        onSuccess: (_data, vars) => {
            const labels: Record<CopilotDecisionAction, string> = {
                apply: "Décision appliquée. Audit trail enregistré.",
                dismiss: "Décision écartée.",
                ignore: "Décision ignorée.",
                reopen: "Décision rouverte.",
            };
            toast(labels[vars.action] ?? "Action appliquée.", "success");
        },

        onSettled: () => {
            void qc.invalidateQueries({ queryKey: COPILOT_DECISIONS_QUERY_ROOT });
            void qc.invalidateQueries({ queryKey: ["decisions"] });
            if (pid) {
                void qc.invalidateQueries({ queryKey: ["manager", "project", pid, "insights"] });
                void qc.invalidateQueries({ queryKey: queryKeys.projectDetail(pid) });
                void qc.invalidateQueries({ queryKey: ["project-detail", pid] });
            }
        },
    });
}
