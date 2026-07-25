import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getManagerProjectBudgetErrorCode, managerProjectBudgetApi } from "@/api/manager-project-budget.api";
import { projectDetailKeys } from "@/hooks/use-project-detail";
import { useToast } from "@/providers/toast-provider";

export const PROJECT_BUDGET_KEYS = {
    detail: (projectId: string) => ["mgr-project-budget", projectId] as const,
    history: (projectId: string) => ["mgr-project-budget", "history", projectId] as const,
};

export function useProjectBudget(projectId: string, enabled = true) {
    const id = projectId.trim();
    return useQuery({
        queryKey: PROJECT_BUDGET_KEYS.detail(id),
        queryFn: () => managerProjectBudgetApi.get(id),
        staleTime: 30_000,
        enabled: Boolean(id) && enabled,
        retry: false,
        refetchOnWindowFocus: false,
    });
}

export function useProjectBudgetHistory(projectId: string, enabled = true) {
    const id = projectId.trim();
    return useQuery({
        queryKey: PROJECT_BUDGET_KEYS.history(id),
        queryFn: () => managerProjectBudgetApi.history(id),
        staleTime: 30_000,
        enabled: Boolean(id) && enabled,
        retry: false,
        refetchOnWindowFocus: false,
    });
}

function invalidateBudget(qc: ReturnType<typeof useQueryClient>, projectId: string) {
    void qc.invalidateQueries({ queryKey: PROJECT_BUDGET_KEYS.detail(projectId) });
    void qc.invalidateQueries({ queryKey: PROJECT_BUDGET_KEYS.history(projectId) });
    void qc.invalidateQueries({ queryKey: projectDetailKeys.byId(projectId) });
}

export function usePatchProjectBudget(projectId: string) {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    const id = projectId.trim();

    return useMutation({
        mutationFn: (p: { budget_rh_planned: number; reason: string; currency?: string }) =>
            managerProjectBudgetApi.patch({ project_id: id, ...p }),
        onSuccess: (data) => {
            const delta = data.adjustment.delta;
            toast(`Budget mis à jour. Δ ${delta >= 0 ? "+" : ""}${delta} ${data.currency}`, "success");
            invalidateBudget(qc, id);
        },
        onError: (err: unknown) => {
            const code = getManagerProjectBudgetErrorCode(err);
            if (code === "VALIDATION_FAILED") toast("Montant ou raison invalide.", "error");
            else if (code === "PROJECT_FROZEN") toast("Budget figé — projet terminé ou archivé.", "error");
            else toast("Échec de la mise à jour du budget.", "error");
        },
    });
}

export function useResetProjectBudget(projectId: string) {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    const id = projectId.trim();

    return useMutation({
        mutationFn: (reason?: string) => managerProjectBudgetApi.reset({ project_id: id, reason }),
        onSuccess: () => {
            toast("Budget réinitialisé.", "success");
            invalidateBudget(qc, id);
        },
        onError: () => {
            toast("Échec de la réinitialisation du budget.", "error");
        },
    });
}
