import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRhBudgetErrorCode, rhBudgetApi, type BudgetStatus } from "@/api/rh-budget.api";
import { useToast } from "@/providers/toast-provider";

export const BUDGET_KEYS = {
    list: (p?: Record<string, unknown>) => ["rh-budget", "list", p] as const,
    detail: (projectId: string) => ["rh-budget", "detail", projectId] as const,
    history: (projectId: string) => ["rh-budget", "history", projectId] as const,
    summary: ["rh-budget", "summary"] as const,
};

export function useBudgetSummary() {
    return useQuery({
        queryKey: BUDGET_KEYS.summary,
        queryFn: () => rhBudgetApi.summary(),
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
    });
}

export function useBudgetProjects(params: { filter: BudgetStatus | "all"; search: string }) {
    return useQuery({
        queryKey: BUDGET_KEYS.list({ filter: params.filter, search: params.search }),
        queryFn: () =>
            rhBudgetApi.list({
                budget_status: params.filter,
                search: params.search || undefined,
            }),
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
    });
}

export function useBudgetProjectDetail(projectId: string) {
    const id = projectId.trim();
    return useQuery({
        queryKey: BUDGET_KEYS.detail(id),
        queryFn: () => rhBudgetApi.detail(id),
        staleTime: 30_000,
        enabled: Boolean(id),
        retry: false,
        refetchOnWindowFocus: false,
    });
}

export function useBudgetHistory(projectId: string) {
    const id = projectId.trim();
    return useQuery({
        queryKey: BUDGET_KEYS.history(id),
        queryFn: () => rhBudgetApi.history(id),
        staleTime: 30_000,
        enabled: Boolean(id),
        retry: false,
        refetchOnWindowFocus: false,
    });
}

export function useUpdateBudgetEnvelope() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: (p: Parameters<typeof rhBudgetApi.updateEnvelope>[0]) => rhBudgetApi.updateEnvelope(p),
        onSuccess: (data) => {
            const delta = data.adjustment.delta;
            toast(
                `Enveloppe mise à jour. Δ ${delta >= 0 ? "+" : ""}${delta} ${data.currency}`,
                "success",
            );
            void qc.invalidateQueries({ queryKey: ["rh-budget"] });
        },
        onError: (err: unknown) => {
            const code = getRhBudgetErrorCode(err);
            if (code === "VALIDATION_FAILED") {
                toast("Champs invalides — vérifie montant et raison.", "error");
            } else if (code === "PROJECT_NOT_FOUND") {
                toast("Projet introuvable.", "error");
            } else {
                toast("Échec de la mise à jour de l'enveloppe.", "error");
            }
        },
    });
}
