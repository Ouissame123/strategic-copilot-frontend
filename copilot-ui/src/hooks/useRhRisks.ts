import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rhRisksApi } from "@/api/rh-risks.api";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import { getApiAuthToken } from "@/utils/apiClient";

export const RISKS_KEYS = {
    list: (p?: Record<string, unknown>) => queryKeys.rh.risksList(p),
    summary: queryKeys.rh.risksSummary(),
    talent: (id: string) => queryKeys.rh.risksTalent(id),
};

export function useRisksSummary(options?: { enabled?: boolean }) {
    const token = getApiAuthToken();
    const enabled = (options?.enabled ?? true) && Boolean(token);

    return useQuery({
        queryKey: RISKS_KEYS.summary,
        queryFn: () => rhRisksApi.summary(),
        staleTime: 60_000,
        retry: false,
        refetchOnWindowFocus: false,
        enabled,
    });
}

export function useRisksList(filters: { riskType: string; severity: string; search: string }) {
    const token = getApiAuthToken();
    const enabled = Boolean(token);

    return useQuery({
        queryKey: RISKS_KEYS.list({ riskType: filters.riskType, severity: filters.severity, search: filters.search }),
        queryFn: () =>
            rhRisksApi.list({
                risk_type: filters.riskType === "all" ? undefined : filters.riskType,
                severity: filters.severity === "all" ? undefined : filters.severity,
                limit: 200,
            }),
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
        enabled,
        select: (data) => {
            if (!filters.search.trim()) return data;
            const q = filters.search.trim().toLowerCase();
            return {
                ...data,
                risks: data.risks.filter((r) => r.talent_name.toLowerCase().includes(q)),
            };
        },
    });
}

export function useTalentRisks(talentId: string | null) {
    const token = getApiAuthToken();
    const id = talentId?.trim() ?? "";
    const enabled = Boolean(token) && Boolean(id);

    return useQuery({
        queryKey: RISKS_KEYS.talent(id),
        queryFn: () => rhRisksApi.talentDetail(id),
        staleTime: 60_000,
        enabled,
        retry: false,
        refetchOnWindowFocus: false,
    });
}

export function useCreateRiskAction() {
    const qc = useQueryClient();
    const { push: toast } = useToast();

    return useMutation({
        mutationFn: rhRisksApi.createAction,
        onSuccess: () => {
            toast("Action RH créée. Visible dans Demandes managers.", "success");
            void qc.invalidateQueries({ queryKey: queryKeys.rh.risks() });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.requests() });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.requestsSummary() });
        },
        onError: () => {
            toast("Échec de la création d'action RH.", "error");
        },
    });
}
