import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { projectDetailKeys } from "@/hooks/use-project-detail";
import {
    fireProjectViabilityAnalysis,
    pollProjectUntilAnalysisDone,
    readProjectComputedAt,
} from "@/lib/project-analysis-flow";
import { invalidateAfterProjectViabilityRefresh } from "@/lib/project-viability-refresh";
import { useToast } from "@/providers/toast-provider";
import type { ProjectDetail } from "@/types/api.types";

type UseProjectAnalyzePollingOptions = {
    projectId: string;
    enterpriseId: string | undefined;
    getCurrentDetail: () => Pick<ProjectDetail, "latest_viability" | "ai_recommendation"> | null | undefined;
    onComplete?: (detail: ProjectDetail) => void;
};

/** Analyser un projet : POST viabilité (fire & forget) + poll computed_at. */
export function useProjectAnalyzePolling({
    projectId,
    enterpriseId,
    getCurrentDetail,
    onComplete,
}: UseProjectAnalyzePollingOptions) {
    const qc = useQueryClient();
    const { push: toast } = useToast();
    const [analyzing, setAnalyzing] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(
        () => () => {
            abortRef.current?.abort();
        },
        [],
    );

    const analyze = useCallback(async () => {
        if (analyzing || !projectId.trim()) return;
        const eid = enterpriseId?.trim();
        if (!eid) {
            toast("Identifiant entreprise manquant", "error");
            return;
        }

        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        setAnalyzing(true);
        const previousComputedAt = readProjectComputedAt(getCurrentDetail());

        fireProjectViabilityAnalysis(projectId, eid);

        const detail = await pollProjectUntilAnalysisDone(projectId, previousComputedAt, { signal: ac.signal });

        if (ac.signal.aborted) {
            setAnalyzing(false);
            return;
        }

        if (detail) {
            qc.setQueryData(projectDetailKeys.byId(projectId), detail);
            void invalidateAfterProjectViabilityRefresh(qc, projectId);
            void qc.invalidateQueries({ queryKey: ["projects"] });
            onComplete?.(detail);
            toast("Analyse IA terminée ✓", "success");
        } else {
            toast("Analyse en cours — actualisez dans quelques secondes", "info");
        }

        setAnalyzing(false);
    }, [analyzing, enterpriseId, getCurrentDetail, onComplete, projectId, qc, toast]);

    return { analyzing, analyze };
}
