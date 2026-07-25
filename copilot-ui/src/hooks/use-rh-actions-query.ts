import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRhActionsList, patchRhAction, postRhAction } from "@/api/rh-actions.api";
import { queryKeys } from "@/lib/query-keys";
import type {
    PatchRhActionBody,
    PostRhActionBody,
    RhActionItem,
    RhActionsListResponse,
} from "@/types/manager-rh-actions.types";
import { getApiAuthToken } from "@/utils/apiClient";
import { mapRhActionsWorkflowError } from "@/utils/rh-actions-workflow";

export type RhActionsListFilters = {
    status?: string;
    project_id?: string;
};

type RhActionsCacheEntry = RhActionsListResponse | undefined;

function patchItemInCaches(
    qc: ReturnType<typeof useQueryClient>,
    id: string,
    updater: (item: RhActionItem) => RhActionItem,
): { key: readonly unknown[]; previous: RhActionsCacheEntry }[] {
    const snapshots: { key: readonly unknown[]; previous: RhActionsCacheEntry }[] = [];
    const entries = qc.getQueriesData<RhActionsListResponse>({ queryKey: queryKeys.rh.actions() });
    for (const [key, data] of entries) {
        if (!data?.items) continue;
        snapshots.push({ key, previous: data });
        qc.setQueryData<RhActionsListResponse>(key, {
            ...data,
            items: data.items.map((item) => (item.id === id ? updater(item) : item)),
        });
    }
    return snapshots;
}

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
        onMutate: async ({ id, body }) => {
            await qc.cancelQueries({ queryKey: queryKeys.rh.actions() });
            const snapshots = patchItemInCaches(qc, id, (item) => ({
                ...item,
                status: body.status ?? item.status,
                response_message:
                    body.response_message !== undefined ? body.response_message : item.response_message,
                updated_at: new Date().toISOString(),
            }));
            return { snapshots };
        },
        onError: (_err, _vars, ctx) => {
            for (const snap of ctx?.snapshots ?? []) {
                qc.setQueryData(snap.key, snap.previous);
            }
        },
        onSettled: () => {
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
