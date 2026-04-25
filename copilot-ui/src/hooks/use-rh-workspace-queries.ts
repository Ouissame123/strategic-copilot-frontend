import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchRhCriticalGaps,
    fetchRhDashboardSummary,
    fetchRhOrganizationalAlerts,
    fetchRhTrainingPlans,
    postRhReallocationSimulate,
    postRhReallocationValidate,
} from "@/api/rh-workspace.api";
import { queryKeys } from "@/lib/query-keys";

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
