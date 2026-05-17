import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { invalidateAfterStrategistArbitrage } from "@/lib/strategist-arbitrage";
import type { ViabilityRequest } from "@/types/api.types";

/** Corps POST `/webhook/api/project/viability` pour un re-scan projet cohérent (viabilité + risques + KPI). */
export function buildProjectViabilityRefreshBody(projectId: string, enterpriseId: string): ViabilityRequest {
    return {
        project_id: projectId.trim(),
        enterprise_id: enterpriseId.trim(),
        enable_strategist: true,
        use_ai: true,
        force_refresh: true,
    };
}

/** Invalide / refetch les vues liées après un calcul viabilité (pas d’appel Risk_KPI). */
export async function invalidateAfterProjectViabilityRefresh(qc: QueryClient, projectId: string): Promise<void> {
    const pid = projectId.trim();
    await invalidateAfterStrategistArbitrage(qc);
    if (!pid) return;
    await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.projectDetail(pid) }),
        qc.invalidateQueries({ queryKey: queryKeys.manager.projectDetail(pid) }),
        qc.invalidateQueries({ queryKey: queryKeys.projectRisks(pid) }),
        qc.invalidateQueries({ queryKey: queryKeys.manager.projectRisks(pid) }),
        qc.refetchQueries({ queryKey: queryKeys.projectDetail(pid) }),
        qc.refetchQueries({ queryKey: queryKeys.manager.projectDetail(pid) }),
    ]);
}
