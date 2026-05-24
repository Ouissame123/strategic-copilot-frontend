import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRhActionsList, patchRhAction, postRhAction } from "@/api/rh-actions.api";
import { queryKeys } from "@/lib/query-keys";
import type { PatchRhActionBody, PostRhActionBody } from "@/types/manager-rh-actions.types";
import { getApiAuthToken } from "@/utils/apiClient";
import { mapRhActionsWorkflowError } from "@/utils/rh-actions-workflow";

export type RhActionsListFilters = {
    status?: string;
    project_id?: string;
};

export function useRhActionsListQuery(
    filters: RhActionsListFilters = {},
    options?: { enabled?: boolean },
) {
    const token = getApiAuthToken();
    const enabled = (options?.enabled ?? true) && Boolean(token);

    return useQuery({
        queryKey: [...queryKeys.rh.actions(), filters],
        queryFn: ({ signal }) => fetchRhActionsList(filters, { signal }),
        enabled,
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
    });
}

export function usePatchRhActionMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: PatchRhActionBody }) => patchRhAction(id, body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.rh.actions() });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.all });
        },
    });
}

export function usePostRhActionMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: PostRhActionBody) => postRhAction(body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.rh.actions() });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.all });
        },
    });
}

export { mapRhActionsWorkflowError };
