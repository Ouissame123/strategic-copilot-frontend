import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { managerTalentRequestsApi } from "@/api/manager-talent-requests.api";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type {
    ManagerTalentRequestDecisionBody,
    ManagerTalentRequestStatusPatch,
    TalentRequest,
    TalentRequestsFilters,
    TalentRequestsSummary,
} from "@/types/talent-requests";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

function readMutationError(err: unknown, fallback: string): string {
    if (isAxiosError(err)) {
        const root = unwrapN8nRoot(err.response?.data);
        return String(root.message ?? root.error ?? fallback);
    }
    return err instanceof Error ? err.message : fallback;
}

const STATUS_LABELS: Record<ManagerTalentRequestStatusPatch, string> = {
    accepted: "Acceptée",
    rejected: "Refusée",
    pending: "En attente",
    transferred_to_hr: "Transférée RH",
};

export function useManagerTalentRequestsList(filters: TalentRequestsFilters = {}) {
    return useQuery({
        queryKey: queryKeys.manager.talentRequestsList(filters as Record<string, unknown>),
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
            else if (vars.body.action === "reconsider") push("Demande remise en attente", "success");
            else push("Demande transférée aux RH", "success");
        },
        onError: (err: unknown) => {
            push(readMutationError(err, "Erreur lors de la mise à jour"), "error");
        },
    });
}

type PatchStatusContext = {
    previousLists: [readonly unknown[], TalentRequest[] | undefined][];
    previousSummary: TalentRequestsSummary | undefined;
};

/** Mutation PATCH status (même endpoint que la page) avec updates optimistes. */
export function useManagerTalentRequestPatchStatus() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: ManagerTalentRequestStatusPatch }) =>
            managerTalentRequestsApi.patchStatus(id, status),
        onMutate: async ({ id, status }): Promise<PatchStatusContext> => {
            await qc.cancelQueries({ queryKey: queryKeys.manager.talentRequestsRoot() });

            const previousLists = qc.getQueriesData<TalentRequest[]>({
                queryKey: [...queryKeys.manager.talentRequestsRoot(), "list"],
            });
            const previousSummary = qc.getQueryData<TalentRequestsSummary>(
                queryKeys.manager.talentRequestsSummary(),
            );

            qc.setQueriesData<TalentRequest[]>(
                { queryKey: [...queryKeys.manager.talentRequestsRoot(), "list"] },
                (prev) =>
                    prev?.map((row) =>
                        row.id === id
                            ? {
                                  ...row,
                                  status,
                                  status_label: STATUS_LABELS[status] ?? row.status_label,
                              }
                            : row,
                    ) ?? prev,
            );

            return { previousLists, previousSummary };
        },
        onError: (err: unknown, _vars, context) => {
            if (context?.previousLists) {
                for (const [key, data] of context.previousLists) {
                    qc.setQueryData(key, data);
                }
            }
            if (context?.previousSummary !== undefined) {
                qc.setQueryData(queryKeys.manager.talentRequestsSummary(), context.previousSummary);
            }
            push(readMutationError(err, "Erreur lors de la mise à jour"), "error");
        },
        onSuccess: (_data, vars) => {
            if (vars.status === "accepted") push("Demande acceptée.", "success");
            else if (vars.status === "rejected") push("Demande refusée.", "success");
            else if (vars.status === "pending") push("Demande remise en attente.", "success");
            else push("Demande transférée aux RH.", "success");
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.manager.talentRequestsRoot() });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.requests() });
        },
    });
}
