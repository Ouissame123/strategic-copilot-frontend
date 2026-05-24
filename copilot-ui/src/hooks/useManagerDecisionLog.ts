import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { decisionsApi, type DecisionLogStatus, type ManagerDecisionLogResponse } from "@/services/decisions.api";
import { normalizeDecisionKind } from "@/utils/decisionLogHelpers";

export function removeDecisionFromManagerLogCache(
    qc: QueryClient,
    enterpriseId: string,
    decisionId: string,
    limit = 100,
): void {
    qc.setQueryData<ManagerDecisionLogResponse>(["manager-decision-log", enterpriseId, limit], (old) => {
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

        return { ...old, decisions, count: decisions.length, kpis };
    });
}

export function applyDecisionStatusInManagerLogCache(
    qc: QueryClient,
    enterpriseId: string,
    decisionId: string,
    status: DecisionLogStatus,
    limit = 100,
): void {
    qc.setQueryData<ManagerDecisionLogResponse>(["manager-decision-log", enterpriseId, limit], (old) => {
        if (!old) return old;
        const decisions = old.decisions.map((d) =>
            d.decision_id === decisionId ? { ...d, status } : d,
        );
        return { ...old, decisions };
    });
}

/** GET /webhook/manager/decisions/log?enterprise_id=… (journal décisions manager). */
export function useManagerDecisionLog(enterpriseId: string | undefined, options?: { limit?: number; enabled?: boolean }) {
    const eid = enterpriseId?.trim() || undefined;
    const enabled = (options?.enabled ?? true) && Boolean(eid);

    return useQuery({
        queryKey: ["manager-decision-log", eid, options?.limit ?? 100],
        queryFn: () => decisionsApi.getManagerLog(eid!, { limit: options?.limit }).then((r) => r.data),
        enabled,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });
}
