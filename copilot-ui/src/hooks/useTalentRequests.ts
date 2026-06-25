import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { talentRequestsApi } from "@/api/talent-requests.api";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { CreateTalentRequestPayload, TalentRequestsFilters } from "@/types/talent-requests";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function readMutationError(err: unknown, fallback: string): string {
    if (isAxiosError(err)) {
        const root = unwrapN8nRoot(err.response?.data);
        return String(root.message ?? root.error ?? fallback);
    }
    return err instanceof Error ? err.message : fallback;
}

export function useTalentRequestsList(filters: TalentRequestsFilters = {}) {
    return useQuery({
        queryKey: queryKeys.talent.requestsList(filters),
        queryFn: ({ signal }) => talentRequestsApi.list(filters, { signal }),
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
    });
}

export function useTalentRequestsSummary() {
    return useQuery({
        queryKey: queryKeys.talent.requestsSummary(),
        queryFn: ({ signal }) => talentRequestsApi.summary({ signal }),
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
    });
}

export function useTalentRequestDetail(id: string | null) {
    return useQuery({
        queryKey: queryKeys.talent.requestDetail(id ?? ""),
        queryFn: ({ signal }) => talentRequestsApi.detail(id!, { signal }),
        enabled: Boolean(id),
        retry: false,
        staleTime: 10_000,
        gcTime: 5 * 60_000,
    });
}

export function useCreateTalentRequest() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: (payload: CreateTalentRequestPayload) => talentRequestsApi.create(payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.requests() });
            push("Demande envoyée", "success");
        },
        onError: (err: unknown) => {
            push(readMutationError(err, "Erreur lors de la création"), "error");
        },
    });
}

export function useCancelTalentRequest() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: (id: string) => talentRequestsApi.cancel(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.requests() });
            push("Demande annulée", "success");
        },
        onError: (err: unknown) => {
            push(readMutationError(err, "Impossible d'annuler"), "error");
        },
    });
}

export function useDeleteTalentRequest() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: (id: string) => talentRequestsApi.delete(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.requests() });
            push("Demande supprimée", "success");
        },
        onError: (err: unknown) => {
            push(readMutationError(err, "Impossible de supprimer"), "error");
        },
    });
}
