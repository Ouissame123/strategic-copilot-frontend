/**
 * WF_RH_Matching_Run — Talent Matching & Workforce Arbitration (enterprise AI).
 */
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_MIN_AVAILABILITY_PCT, DEFAULT_TOP_N } from "@/api/rh-matching.api";
import {
    mapRhMatchingApiError,
    useRhMatchingProjects,
    useRhMatchingResults,
    useRunRhWorkforceMatching,
} from "@/hooks/useRhWorkforceMatching";
import { useToast } from "@/providers/toast-provider";
import type { RhMatchingRunResponse } from "@/types/rh-matching.types";
import {
    buildHeroKpis,
    MatchingControlPanel,
    MatchingEmptyState,
    MatchingErrorBanner,
    MatchingHeroKpiStrip,
    MatchingHeroSection,
    MatchingLoadingPanel,
    MatchingResultsSection,
} from "@/components/rh/workforce-arbitration/workforce-arbitration-ui";

export type WorkforceArbitrationViewProps = {
    token?: string;
};

export function WorkforceArbitrationView({ token }: WorkforceArbitrationViewProps) {
    const { push: pushToast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [result, setResult] = useState<RhMatchingRunResponse | null>(null);
    const [loadSaved, setLoadSaved] = useState(false);

    const projectsQuery = useRhMatchingProjects(token);
    const savedQuery = useRhMatchingResults(projectId, loadSaved && !result, token);
    const runMutation = useRunRhWorkforceMatching(token);

    const display = result ?? savedQuery.data ?? null;
    const isRunning = runMutation.isPending;
    const isLoadingSaved = loadSaved && savedQuery.isLoading && !result;
    const isBusy = isRunning || isLoadingSaved;

    const projects = projectsQuery.data ?? [];

    useEffect(() => {
        console.log("projects loaded:", projects);
    }, [projects]);

    useEffect(() => {
        console.log("selected project:", projectId);
    }, [projectId]);

    const activeProjectName = projects.find((p) => p.id === projectId)?.name ?? null;
    const heroKpis = useMemo(() => buildHeroKpis(display), [display]);
    const hasResults = Boolean(display);

    const handleRun = async () => {
        if (!projectId.trim()) {
            pushToast("Sélectionnez un projet", "error");
            return;
        }
        setResult(null);
        setLoadSaved(false);
        try {
            const data = await runMutation.mutateAsync({
                project_id: projectId,
                top_n: DEFAULT_TOP_N,
                min_availability_pct: DEFAULT_MIN_AVAILABILITY_PCT,
            });
            setResult(data);
            pushToast("Matching IA terminé", "success");
        } catch (err) {
            pushToast(mapRhMatchingApiError(err), "error");
        }
    };

    const handleLoadSaved = () => {
        if (!projectId.trim()) {
            pushToast("Sélectionnez un projet", "error");
            return;
        }
        setResult(null);
        setLoadSaved(true);
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8 px-1 pb-16 pt-2">
            <MatchingHeroSection projectName={activeProjectName} />

            <MatchingHeroKpiStrip items={heroKpis} />

            <MatchingControlPanel
                projectId={projectId}
                projects={projects}
                projectsLoading={projectsQuery.isLoading}
                projectsError={projectsQuery.isError}
                isRunning={isRunning}
                onProjectChange={(id) => {
                    setProjectId(id);
                    setResult(null);
                    setLoadSaved(false);
                }}
                onRun={() => void handleRun()}
                onLoadSaved={handleLoadSaved}
            />

            {isBusy ? <MatchingLoadingPanel isRun={isRunning} /> : null}

            {!isBusy && savedQuery.isError && loadSaved && !result ? (
                <MatchingErrorBanner message={mapRhMatchingApiError(savedQuery.error)} />
            ) : null}

            {!isBusy && hasResults && display ? <MatchingResultsSection display={display} /> : null}

            {!isBusy && !hasResults ? <MatchingEmptyState /> : null}
        </div>
    );
}
