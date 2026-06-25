import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { talentNotificationsApi } from "@/api/talent-notifications.api";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";

export function useTalentNotificationsSummary() {
    return useQuery({
        queryKey: queryKeys.talent.notificationsSummary(),
        queryFn: ({ signal }) => talentNotificationsApi.summary({ signal }),
        retry: false,
        refetchInterval: 60_000,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentNotificationsList(unreadOnly: boolean, enabled: boolean) {
    return useQuery({
        queryKey: queryKeys.talent.notificationsList(unreadOnly),
        queryFn: ({ signal }) => talentNotificationsApi.list(unreadOnly, 30, { signal }),
        enabled,
        retry: false,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useTalentNotificationMarkRead() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => talentNotificationsApi.markRead(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.notifications() });
        },
    });
}

export function useTalentNotificationMarkAllRead() {
    const qc = useQueryClient();
    const { push } = useToast();

    return useMutation({
        mutationFn: () => talentNotificationsApi.markAllRead(),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.talent.notifications() });
            push("Toutes les notifications marquées lues", "success");
        },
    });
}
