import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { TalentOpportunitiesApiError, talentOpportunitiesApi } from "@/api/talent-opportunities.api";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { ExpressInterestPayload } from "@/types/talent-opportunities";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export function useTalentOpportunitiesList() {
    return useQuery({
        queryKey: queryKeys.talent.opportunitiesList(),
        queryFn: ({ signal }) => talentOpportunitiesApi.list({ limit: 50 }, { signal }),
        retry: false,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentOpportunitiesSummary() {
    return useQuery({
        queryKey: queryKeys.talent.opportunitiesSummary(),
        queryFn: ({ signal }) => talentOpportunitiesApi.summary({ signal }),
        retry: false,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentOpportunityDetail(projectId: string | null) {
    return useQuery({
        queryKey: queryKeys.talent.opportunityDetail(projectId ?? ""),
        queryFn: ({ signal }) => talentOpportunitiesApi.detail(projectId!, { signal }),
        enabled: Boolean(projectId),
        retry: false,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useExpressInterest() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: ({ project_id, message }: { project_id: string; message?: string }) => {
            const payload: ExpressInterestPayload = {};
            if (message?.trim()) payload.message = message.trim();
            return talentOpportunitiesApi.expressInterest(project_id, payload);
        },
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.opportunities() });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.requests() });
            push("Intérêt enregistré — ton manager sera notifié", "success");
        },
        onError: (err: unknown) => {
            if (err instanceof TalentOpportunitiesApiError && err.code === "ALREADY_INTERESTED") {
                push("Tu as déjà exprimé ton intérêt pour ce projet", "error");
                return;
            }
            if (isAxiosError(err)) {
                const root = unwrapN8nRoot(err.response?.data);
                const code = root.code != null ? String(root.code) : undefined;
                if (code === "ALREADY_INTERESTED" || err.response?.status === 409) {
                    push("Tu as déjà exprimé ton intérêt pour ce projet", "error");
                    return;
                }
                push(String(root.message ?? root.error ?? "Erreur"), "error");
                return;
            }
            push(err instanceof Error ? err.message : "Erreur", "error");
        },
    });
}
