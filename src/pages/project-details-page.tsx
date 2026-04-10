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
                <ErrorState title="Erreur de chargement" message={error} onRetry={retry} retryLabel="Reessayer" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Button color="secondary" size="sm" iconLeading={ArrowLeft} href="/projects">
                    Retour aux projets
                </Button>
                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">Projet {projectId}</h1>
            </header>

            <section className="rounded-xl border border-secondary bg-primary p-5 md:p-6" aria-labelledby="vue-projet-heading">
                <h2 id="vue-projet-heading" className="text-lg font-semibold text-primary mb-4">Vue Projet</h2>
                <p className="text-sm text-tertiary mb-4">Score de viabilité, décision et justification.</p>
                <ProjectViabilityCard viability={viability} />
            </section>

            <section className="rounded-xl border border-secondary bg-primary p-5 md:p-6" aria-labelledby="vue-ressources-heading">
                <h2 id="vue-ressources-heading" className="text-lg font-semibold text-primary mb-4">Vue Ressources</h2>
                <p className="text-sm text-tertiary mb-4">Charge et compétences critiques.</p>
                <KpiBreakdownPanel kpi={details ?? viability?.kpi ?? null} />
                <RiskIndicatorsPanel risks={risks} />
                <TalentFitTable talents={talents} />
            </section>

            <WhatIfSimulator projectId={projectId} onRun={runWhatIf} />
        </div>
    );
}
