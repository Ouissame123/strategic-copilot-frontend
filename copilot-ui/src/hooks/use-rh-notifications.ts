import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteRhNotification, fetchRhNotifications } from "@/api/rh-dashboard.api";
import { authStorage } from "@/lib/auth-storage";
import { queryKeys } from "@/lib/query-keys";
import type { RhNotification } from "@/types/rh-dashboard.types";

const RH_NOTIF_LIMIT = 50;

export function useRhNotificationsTopbar(enterpriseId: string | null | undefined) {
    const eid = enterpriseId?.trim() ?? "";
    const qc = useQueryClient();
    const token = authStorage.getAccessToken();

    const query = useQuery({
        queryKey: queryKeys.rh.notifications(eid, RH_NOTIF_LIMIT),
        queryFn: ({ signal }) =>
            fetchRhNotifications({ limit: RH_NOTIF_LIMIT }, { signal, token, softFail: true }),
        enabled: Boolean(eid),
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const invalidate = () => {
        void qc.invalidateQueries({ queryKey: queryKeys.rh.notifications(eid, RH_NOTIF_LIMIT) });
    };

    const markReadMutation = useMutation({
        mutationFn: (notificationId: string) => deleteRhNotification(notificationId, { token }),
        onSuccess: invalidate,
    });

    const markAllReadMutation = useMutation({
        mutationFn: async (notifications: RhNotification[]) => {
            const unread = notifications.filter((n) => !n.is_read);
            await Promise.allSettled(unread.map((n) => deleteRhNotification(n.id, { token })));
        },
        onSuccess: invalidate,
    });

    const notifications = query.data?.notifications ?? [];
    const unreadCount = query.data?.summary.unread_count ?? notifications.filter((n) => !n.is_read).length;

    return {
        notifications,
        unreadCount,
        summary: query.data?.summary ?? null,
        isLoading: query.isPending,
        isFetching: query.isFetching,
        isError: query.isError,
        markRead: markReadMutation.mutateAsync,
        markAllRead: () => markAllReadMutation.mutateAsync(notifications),
        isMarkingRead: markReadMutation.isPending,
        isMarkingAllRead: markAllReadMutation.isPending,
        refetch: query.refetch,
    };
}
