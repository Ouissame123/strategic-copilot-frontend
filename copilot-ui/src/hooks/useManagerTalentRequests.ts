import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { managerTalentRequestsApi } from "@/api/manager-talent-requests.api";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { ManagerTalentRequestDecisionBody, TalentRequestsFilters } from "@/types/talent-requests";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function readMutationError(err: unknown, fallback: string): string {
    if (isAxiosError(err)) {
        const root = unwrapN8nRoot(err.response?.data);
        return String(root.message ?? root.error ?? fallback);
    }
    return err instanceof Error ? err.message : fallback;
}

export function useManagerTalentRequestsList(filters: TalentRequestsFilters = {}) {
    return useQuery({
        queryKey: queryKeys.manager.talentRequestsList(filters),
        queryFn: ({ signal }) => managerTalentRequestsApi.list(filters, { signal }),
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
    });
}

export function useManagerTalentRequestsSummary() {
    return useQuery({
        queryKey: queryKeys.manager.talentRequestsSummary(),
        queryFn: ({ signal }) => managerTalentRequestsApi.summary({ signal }),
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
    });
}

export function useManagerTalentRequestDetail(id: string | null) {
    return useQuery({
        queryKey: queryKeys.manager.talentRequestDetail(id ?? ""),
        queryFn: ({ signal }) => managerTalentRequestsApi.detail(id!, { signal }),
        enabled: Boolean(id),
        retry: false,
        staleTime: 10_000,
    });
}

export function useManagerTalentRequestDecision() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: ManagerTalentRequestDecisionBody }) =>
            managerTalentRequestsApi.decide(id, body),
        onSuccess: (_data, vars) => {
            void qc.invalidateQueries({ queryKey: queryKeys.manager.talentRequestsRoot() });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.requests() });
            if (vars.body.action === "accept") push("Demande acceptée", "success");
            else if (vars.body.action === "reject") push("Demande refusée", "success");
            else push("Demande transférée aux RH", "success");
        },
        onError: (err: unknown) => {
            push(readMutationError(err, "Erreur lors de la mise à jour"), "error");
        },
    });
}
