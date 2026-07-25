import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
    decisionsApi,
    type DecisionLogStatus,
    type ManagerDecisionLogQueryParams,
    type ManagerDecisionLogResponse,
} from "@/services/decisions.api";
import { authStorage } from "@/lib/auth-storage";
import { normalizeDecisionKind } from "@/utils/decisionLogHelpers";

export type ManagerDecisionLogFilters = {
    period: ManagerDecisionLogQueryParams["period"];
    type?: string;
    project_id?: string;
    enterprise_id?: string;
};

export const managerDecisionLogQueryKeys = {
    log: (filters: ManagerDecisionLogFilters) => ["manager-decision-log", filters] as const,
};

export function removeDecisionFromManagerLogCache(
    qc: QueryClient,
    filters: ManagerDecisionLogFilters,
    decisionId: string,
): void {
    qc.setQueryData<ManagerDecisionLogResponse>(managerDecisionLogQueryKeys.log(filters), (old) => {
        if (!old) return old;
        const removed = old.decisions.find((d) => d.decision_id === decisionId);
        if (!removed) return old;

        const decisions = old.decisions.filter((d) => d.decision_id !== decisionId);
        const kind = normalizeDecisionKind(removed.decision);
        const kpis = {
            ...old.kpis,
            total: Math.max(0, old.kpis.total - 1),
            continue: kind === "continue" ? Math.max(0, old.kpis.continue - 1) : old.kpis.continue,
            adjust: kind === "adjust" ? Math.max(0, old.kpis.adjust - 1) : old.kpis.adjust,
            stop: kind === "stop" ? Math.max(0, old.kpis.stop - 1) : old.kpis.stop,
            other: kind === "other" ? Math.max(0, old.kpis.other - 1) : old.kpis.other,
        };

        return {
            ...old,
            decisions,
            count: decisions.length,
            kpis,
            watch_decision: old.watch_decision?.decision_id === decisionId ? null : old.watch_decision,
        };
    });
}

export function applyDecisionStatusInManagerLogCache(
    qc: QueryClient,
    filters: ManagerDecisionLogFilters,
    decisionId: string,
    status: DecisionLogStatus,
    handledAt?: string | null,
): void {
    qc.setQueryData<ManagerDecisionLogResponse>(managerDecisionLogQueryKeys.log(filters), (old) => {
        if (!old) return old;
        const decisions = old.decisions.map((d) =>
            d.decision_id === decisionId
                ? {
                      ...d,
                      status,
                      handled_at: status === "open" ? null : (handledAt ?? d.handled_at ?? new Date().toISOString()),
                  }
                : d,
        );
        return { ...old, decisions };
    });
}

/** GET `/webhook/manager/decisions/log` — filtres serveur (period, type, project_id). */
export function useManagerDecisionLog(filters: ManagerDecisionLogFilters) {
    const token = authStorage.getAccessToken();
    const queryFilters: ManagerDecisionLogFilters = {
        period: filters.period ?? "30d",
        type: filters.type && filters.type !== "all" ? filters.type : undefined,
        project_id: filters.project_id?.trim() || undefined,
        enterprise_id: filters.enterprise_id?.trim() || undefined,
    };

    return useQuery({
        queryKey: managerDecisionLogQueryKeys.log(queryFilters),
        queryFn: () => decisionsApi.getManagerLog(queryFilters),
        enabled: Boolean(token?.trim()),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });
}
