import { useEffect, useRef } from "react";
import { isAxiosError } from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { matchmakerApi } from "@/services/agents.api";
import { normalizeProjectTalentMatchingResponse } from "@/lib/manager-matchmaker-normalize";
import type { ManagerProjectTalentMatchingResult } from "@/types/manager-matchmaker.types";
import { invalidateManagerRiskQueries } from "@/hooks/use-manager-risk-data";
import { useToast } from "@/providers/toast-provider";
import { unwrapN8nRoot } from "@/utils/unwrap-api-payload";

export type MatchmakerCachedResult = ManagerProjectTalentMatchingResult & {
    analysis_run_id: string;
};

export const MATCHMAKER_KEYS = {
    forProject: (projectId: string) => ["matchmaker", projectId.trim()] as const,
};

/** @deprecated Préférer `MATCHMAKER_KEYS.forProject`. */
export function projectMatchmakerQueryKey(projectId: string) {
    return MATCHMAKER_KEYS.forProject(projectId);
}

function getMatchmakerErrorCode(err: unknown): string | undefined {
    if (!isAxiosError(err)) return undefined;
    const root = unwrapN8nRoot(err.response?.data);
    const code = root.code ?? root.error ?? root.__code;
    return code != null ? String(code).trim().toUpperCase() : undefined;
}

export function useMatchmakerQuery(projectId: string, projectName: string, enabled: boolean) {
    const qc = useQueryClient();
    const { push } = useToast();
    const id = projectId.trim();
    const toastedRunIdRef = useRef<string | null>(null);
    const invalidatedRunIdRef = useRef<string | null>(null);

    const query = useQuery({
        queryKey: MATCHMAKER_KEYS.forProject(id),
        queryFn: async (): Promise<MatchmakerCachedResult> => {
            const { data } = await matchmakerApi.runForProject(id, {});
            if (data.status === "error") {
                throw new Error(data.explanation || "Échec du Matchmaker.");
            }
            const parsed = normalizeProjectTalentMatchingResponse(data, id, projectName || data.project?.name || "");
            if (!parsed) throw new Error("Réponse Matchmaker invalide");
            return { ...parsed, analysis_run_id: String(data.analysis_run_id ?? "").trim() };
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: enabled && Boolean(id),
        retry: false,
    });

    const refresh = () => {
        toastedRunIdRef.current = null;
        invalidatedRunIdRef.current = null;
        void qc.invalidateQueries({ queryKey: MATCHMAKER_KEYS.forProject(id) });
    };

    useEffect(() => {
        if (!query.data || query.isFetching) return;
        const runId = query.data.analysis_run_id;
        if (!runId || toastedRunIdRef.current === runId) return;
        toastedRunIdRef.current = runId;

        const count = query.data.top_talents.length;
        if (query.data.status === "no_matching_results" || count === 0) {
            push("Matchmaker terminé — aucun talent compatible dans le pool.", "info");
        } else {
            const adequacy = query.data.adequacy_score != null ? `${query.data.adequacy_score.toFixed(1)}/10` : "—";
            push(`Matchmaker terminé. ${count} suggestion(s), adéquation ${adequacy}.`, "success");
        }
    }, [query.data, query.isFetching, push]);

    useEffect(() => {
        if (!query.data?.analysis_run_id || query.isFetching) return;
        const runId = query.data.analysis_run_id;
        if (!runId || invalidatedRunIdRef.current === runId) return;
        invalidatedRunIdRef.current = runId;
        void qc.invalidateQueries({ queryKey: ["project-detail", id] });
        void invalidateManagerRiskQueries(qc);
    }, [query.data?.analysis_run_id, query.isFetching, id, qc]);

    useEffect(() => {
        if (!query.isError || !query.error) return;
        const err = query.error;
        const code = getMatchmakerErrorCode(err);
        const status = isAxiosError(err) ? err.response?.status : undefined;
        if (status === 403 && code === "ENTERPRISE_ID_MISMATCH") {
            push("Projet hors de votre entreprise.", "error");
            return;
        }
        if (status === 404 || code === "PROJECT_NOT_FOUND") {
            push("Projet introuvable.", "error");
            return;
        }
        if (status === 400 || code === "VALIDATION_FAILED" || code === "NO_REQUIREMENTS") {
            push(
                code === "NO_REQUIREMENTS"
                    ? "Définis d'abord les exigences de compétences dans l'onglet Compétences."
                    : "Requête Matchmaker invalide.",
                "error",
            );
            return;
        }
        push(err instanceof Error ? err.message : "Échec du Matchmaker. Réessayez dans un instant.", "error");
    }, [query.isError, query.error, push]);

    return { ...query, refresh };
}
