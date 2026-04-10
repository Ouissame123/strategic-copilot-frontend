import { useParams } from "react-router";
import { ArrowLeft } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ProjectViabilityCard } from "@/components/project/project-viability-card";
import { KpiBreakdownPanel } from "@/components/project/kpi-breakdown-panel";
import { RiskIndicatorsPanel } from "@/components/risk/risk-indicators-panel";
import { TalentFitTable } from "@/components/project/talent-fit-table";
import { WhatIfSimulator } from "@/components/project/what-if-simulator";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useProject } from "@/hooks/use-project";
import { decisionHighlightCardClass } from "@/utils/workspace-role-styles";
import { cx } from "@/utils/cx";

export function ProjectDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const projectId = id ?? "";
    const { viability, details, talents, risks, isLoading, error, retry, runWhatIf } = useProject(projectId);
    const projectTitle = `Projet ${projectId}`;
    useCopilotPage("project-detail", projectTitle, projectTitle, projectId);

    if (isLoading) {
        return <LoadingState label="Chargement du projet..." size="md" />;
    }

    if (error) {
        return (
            <div className="space-y-6">
                <Button color="secondary" size="sm" iconLeading={ArrowLeft} href="/projects">
                    Retour aux projets
                </Button>
                <div className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                    <ErrorState title="Erreur de chargement" message={error} onRetry={retry} retryLabel="Reessayer" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Button color="secondary" size="sm" iconLeading={ArrowLeft} href="/projects" className="shrink-0">
                    Retour aux projets
                </Button>
                <h1 className="min-w-0 text-display-xs font-semibold text-primary md:text-display-sm">Projet {projectId}</h1>
            </header>

            <section
                className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6"
                aria-labelledby="vue-projet-heading"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Vue</p>
                <h2 id="vue-projet-heading" className="mt-1 text-lg font-semibold text-primary">
                    Vue Projet
                </h2>
                <p className="mt-2 text-sm text-tertiary">Score de viabilité, décision et justification.</p>
                <div className={cx("mt-6 rounded-xl p-1", decisionHighlightCardClass())}>
                    <ProjectViabilityCard viability={viability} />
                </div>
            </section>

            <section
                className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6"
                aria-labelledby="vue-ressources-heading"
            >
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Ressources</p>
                <h2 id="vue-ressources-heading" className="mt-1 text-lg font-semibold text-primary">
                    Vue Ressources
                </h2>
                <p className="mt-2 text-sm text-tertiary">Charge et compétences critiques.</p>
                <div className="mt-6 space-y-8">
                    <KpiBreakdownPanel kpi={details ?? viability?.kpi ?? null} />
                    <RiskIndicatorsPanel risks={risks} />
                    <TalentFitTable talents={talents} />
                </div>
            </section>

            <WhatIfSimulator projectId={projectId} onRun={runWhatIf} />
        </div>
    );
}
