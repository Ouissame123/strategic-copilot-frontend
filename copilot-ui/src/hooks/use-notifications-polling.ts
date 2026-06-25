import { useQuery } from "@tanstack/react-query";
import { getRhNotifications } from "@/api/rh-notifications.api";
import { authStorage } from "@/lib/auth-storage";
import { queryKeys } from "@/lib/query-keys";

/** Badge cloche header — poll 30s, unread count uniquement. */
export function useNotificationsBellPolling(enabled = true) {
    const token = authStorage.getAccessToken();
    return useQuery({
        queryKey: queryKeys.rh.notificationsBellPoll(),
        queryFn: () => getRhNotifications({ only_unread: true, limit: 1 }),
        enabled: enabled && Boolean(token),
        refetchInterval: 30_000,
        staleTime: 15_000,
        select: (d) => ({
            unread_count: d.summary?.unread_count ?? 0,
            critical_unread: d.summary?.critical_unread ?? 0,
        }),
    });
}
