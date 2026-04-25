import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRhActionsList, patchRhAction, postRhAction, type PostRhActionBody } from "@/api/rh-actions.api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { getApiAuthToken } from "@/utils/apiClient";

export function useRhActionsListQuery() {
    const { user } = useAuth();
    const token = getApiAuthToken();
    return useQuery({
        queryKey: [...queryKeys.rh.actions(), user?.id ?? "session"],
        queryFn: ({ signal }) => fetchRhActionsList({ limit: 500 }, { signal }),
        enabled: Boolean(token),
    });
}

export function usePatchRhActionMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => patchRhAction(id, body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.rh.actions() });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.dashboard() });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.orgAlerts() });
            void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.all });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.workspace() });
        },
    });
}

export function usePostRhActionMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: PostRhActionBody) => postRhAction(body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.rh.actions() });
            void qc.invalidateQueries({ queryKey: queryKeys.rh.all, refetchType: "active" });
            void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
            void qc.invalidateQueries({ queryKey: queryKeys.portfolio.all });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.workspace() });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.all });
        },
    });
}
