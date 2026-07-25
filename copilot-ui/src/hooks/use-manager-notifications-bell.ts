import { useQuery } from "@tanstack/react-query";
import { managerNotificationsApi } from "@/api/manager-notifications.api";
import { authStorage } from "@/lib/auth-storage";
import type { ManagerNotificationTimeFilter } from "@/types/manager-notifications.types";

export const managerNotificationsQueryKeys = {
    counts: () => ["manager-notifications", "counts"] as const,
    list: (filters: { time_filter?: ManagerNotificationTimeFilter; severity?: string; limit?: number }) =>
        ["manager-notifications", "list", filters] as const,
};

/** Compteur cloche — poll 60s. */
export function useManagerNotificationCounts(enabled = true) {
    const token = authStorage.getAccessToken();
    return useQuery({
        queryKey: managerNotificationsQueryKeys.counts(),
        queryFn: () => managerNotificationsApi.fetchCounts(),
        enabled: enabled && Boolean(token?.trim()),
        refetchInterval: 60_000,
        staleTime: 30_000,
        retry: 1,
    });
}

/** Liste notifications — chargée à la demande (cloche ou page). */
export function useManagerNotificationsList(
    filters: { time_filter?: ManagerNotificationTimeFilter; severity?: string; limit?: number },
    enabled = true,
) {
    const token = authStorage.getAccessToken();
    return useQuery({
        queryKey: managerNotificationsQueryKeys.list(filters),
        queryFn: () => managerNotificationsApi.fetchList(filters),
        enabled: enabled && Boolean(token?.trim()),
        staleTime: 15_000,
        retry: 1,
    });
}
