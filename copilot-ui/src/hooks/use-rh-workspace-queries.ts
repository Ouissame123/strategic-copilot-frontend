import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRhAnalytics, fetchRhNotifications } from "@/api/rh-dashboard.api";
import {
    fetchRhCriticalGaps,
    fetchRhDashboardSummary,
    fetchRhOrganizationalAlerts,
    fetchRhTrainingPlans,
    postRhReallocationSimulate,
    postRhReallocationValidate,
} from "@/api/rh-workspace.api";
import { queryKeys } from "@/lib/query-keys";

const RH_NOTIF_LIMIT = 50;

export function useRhAnalyticsQuery(enterpriseId: string | null | undefined) {
    const eid = enterpriseId?.trim() ?? "";
    return useQuery({
        queryKey: queryKeys.rh.analytics(eid),
        queryFn: ({ signal }) => fetchRhAnalytics(eid, { signal }),
        enabled: Boolean(eid),
        staleTime: 60_000,
    });
}

export function useRhNotificationsQuery(enterpriseId: string | null | undefined, limit = RH_NOTIF_LIMIT) {
    const eid = enterpriseId?.trim() ?? "";
    return useQuery({
        queryKey: queryKeys.rh.notifications(eid, limit),
        queryFn: ({ signal }) => fetchRhNotifications({ limit }, { signal, softFail: true }),
        enabled: Boolean(eid),
        staleTime: 30_000,
    });
}

export function useRhDashboardQuery() {
    return useQuery({
        queryKey: queryKeys.rh.dashboard(),
        queryFn: ({ signal }) => fetchRhDashboardSummary({ signal }),
    });
}

export function useRhCriticalGapsQuery() {
    return useQuery({
        queryKey: queryKeys.rh.criticalGaps(),
        queryFn: ({ signal }) => fetchRhCriticalGaps({ signal }),
    });
}

export function useRhTrainingPlansQuery() {
    return useQuery({
        queryKey: queryKeys.rh.trainingPlans(),
        queryFn: ({ signal }) => fetchRhTrainingPlans({ signal }),
    });
}

export function useRhOrganizationalAlertsQuery() {
    return useQuery({
        queryKey: queryKeys.rh.orgAlerts(),
        queryFn: ({ signal }) => fetchRhOrganizationalAlerts({ signal }),
    });
}

export function useRhReallocationSimulateMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Record<string, unknown>) => postRhReallocationSimulate(body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.rh.orgAlerts() });
        },
    });
}

export function useRhReallocationValidateMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Record<string, unknown>) => postRhReallocationValidate(body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: queryKeys.rh.all });
            void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
            void qc.invalidateQueries({ queryKey: queryKeys.manager.all });
            void qc.invalidateQueries({ queryKey: queryKeys.talent.all });
        },
    });
}
