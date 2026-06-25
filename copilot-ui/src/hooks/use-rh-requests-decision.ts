import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchRhRequestById,
    fetchRhRequestHistory,
    fetchRhRequestsList,
    fetchRhRequestsSummary,
    patchRhRequestDecision,
    type RhRequestPatchBody,
    type RhRequestsListFilters,
} from "@/api/rh-requests-decision.api";
import {
    RH_REQUEST_PATCH_REASON_DEFAULTS,
    RH_REQUEST_PATCH_STATUS,
} from "@/api/rh-requests-decision.constants";
import { queryKeys } from "@/lib/query-keys";
import { getApiAuthToken } from "@/utils/apiClient";
import { mapRhRequestsDecisionError, parseRhRequestsListResponse, parseRhRequestsSummary } from "@/utils/rh-requests-decision";

export function useRhRequestsListQuery(
    filters: RhRequestsListFilters = {},
    options?: { enabled?: boolean },
) {
    const token = getApiAuthToken();
    const enabled = (options?.enabled ?? true) && Boolean(token);

    return useQuery({
        queryKey: [...queryKeys.rh.requests(), filters],
        queryFn: async ({ signal }) => {
            const raw = await fetchRhRequestsList(filters, { signal });
            return parseRhRequestsListResponse(raw);
        },
        enabled,
        staleTime: 30_000,
        retry: false,
        refetchOnWindowFocus: false,
    });
}

export function useRhRequestsSummaryQuery(options?: { enabled?: boolean }) {
    const token = getApiAuthToken();
    const enabled = (options?.enabled ?? true) && Boolean(token);

    return useQuery({
        queryKey: queryKeys.rh.requestsSummary(),
        queryFn: async ({ signal }) => {
            const raw = await fetchRhRequestsSummary({ signal });
            return parseRhRequestsSummary(raw);
        },
        enabled,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: false,
        refetchInterval: 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useRhRequestDetailQuery(id: string | null, options?: { enabled?: boolean }) {
    const token = getApiAuthToken();
    const enabled = (options?.enabled ?? true) && Boolean(token) && Boolean(id?.trim());

    return useQuery({
        queryKey: [...queryKeys.rh.requests(), "detail", id],
        queryFn: async ({ signal }) => {
            const res = await fetchRhRequestById(id!, { signal });
            return res.data;
        },
        enabled,
        staleTime: 15_000,
    });
}

export function useRhRequestHistoryQuery(id: string | null, options?: { enabled?: boolean }) {
    const token = getApiAuthToken();
    const enabled = (options?.enabled ?? true) && Boolean(token) && Boolean(id?.trim());

    return useQuery({
        queryKey: [...queryKeys.rh.requests(), "history", id],
        queryFn: ({ signal }) => fetchRhRequestHistory(id!, { signal }),
        enabled,
        staleTime: 15_000,
    });
}

export function useRhRequestsDecision() {
    const qc = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({ id, body }: { id: string; body: RhRequestPatchBody }) => patchRhRequestDecision(id, body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.rh.requests() });
        },
    });

    const decide = (id: string, body: RhRequestPatchBody) => mutation.mutateAsync({ id, body });

    return {
        ...mutation,
        acceptRequest: (id: string, comment?: string) =>
            decide(id, {
                status: RH_REQUEST_PATCH_STATUS.accepted,
                reason: comment?.trim() || RH_REQUEST_PATCH_REASON_DEFAULTS.accepted,
            }),
        rejectRequest: (id: string, comment?: string) =>
            decide(id, {
                status: RH_REQUEST_PATCH_STATUS.rejected,
                reason: comment?.trim() || RH_REQUEST_PATCH_REASON_DEFAULTS.rejected,
            }),
        setInProgress: (id: string, comment?: string) =>
            decide(id, {
                status: RH_REQUEST_PATCH_STATUS.in_progress,
                reason: comment?.trim() || RH_REQUEST_PATCH_REASON_DEFAULTS.in_progress,
            }),
        markDone: (id: string, comment?: string) =>
            decide(id, {
                status: RH_REQUEST_PATCH_STATUS.done,
                reason: comment?.trim() || RH_REQUEST_PATCH_REASON_DEFAULTS.done,
            }),
    };
}

export { mapRhRequestsDecisionError };
