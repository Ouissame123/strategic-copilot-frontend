import { useCallback, useState } from "react";
import { useSearchParams } from "react-router";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { ProjectCard } from "@/components/talent/projects/ProjectCard";
import { ProjectDetailDrawer } from "@/components/talent/projects/ProjectDetailDrawer";
import { ProjectsKpiBar } from "@/components/talent/projects/ProjectsKpiBar";
import { ProjectsTabs } from "@/components/talent/projects/ProjectsTabs";
import { TalentProjectsDensityToggle } from "@/components/talent/projects/TalentProjectsDensityToggle";
import {
    parseProjectTabParam,
    readTalentProjectsDensity,
    writeTalentProjectsDensity,
    type TalentProjectsDensity,
} from "@/components/talent/projects/talent-projects-ui";
import { TALENT_PAGE_STACK } from "@/components/talent/ui/talent-workspace-ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentProjects, useTalentProjectsSummary } from "@/hooks/useTalentProjects";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import type { ProjectTab, TalentProjectListItem } from "@/types/talent-projects";
import { cx } from "@/utils/cx";

export function TalentProjectsPage() {
    useCopilotPage("projects_list", "Mes projets");

    const [searchParams, setSearchParams] = useSearchParams();
    const tab = parseProjectTabParam(searchParams.get("tab"));
    const [density, setDensity] = useState<TalentProjectsDensity>(() => readTalentProjectsDensity());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<TalentProjectListItem | null>(null);

    const summaryQuery = useTalentProjectsSummary();
    const listQuery = useTalentProjects(tab);

    const activeCount = summaryQuery.data?.by_tab.active;
    useWorkspaceTopbarMeta(
        "Mes projets",
        activeCount != null ? `${activeCount} projet${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""}` : "Vos affectations et jalons",
    );

    const setTab = useCallback(
        (next: ProjectTab) => {
            setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                if (next === "active") params.delete("tab");
                else params.set("tab", next);
                return params;
            });
        },
        [setSearchParams],
    );

    const toggleDensity = () => {
        const next: TalentProjectsDensity = density === "compact" ? "comfortable" : "compact";
        setDensity(next);
        writeTalentProjectsDensity(next);
    };

    const openDrawer = (project: TalentProjectListItem) => {
        setSelectedId(project.project_id);
        setSelectedRow(project);
    };

    const closeDrawer = () => {
        setSelectedId(null);
        setSelectedRow(null);
    };

    const projects = listQuery.data ?? [];
    const showGlobalEmpty =
        !summaryQuery.isLoading && !summaryQuery.isError && summaryQuery.data?.total === 0;

    return (
        <div className={TALENT_PAGE_STACK}>
            {summaryQuery.isError ? (
                <ErrorState
                    title="Résumé indisponible"
                    message="Impossible de charger les indicateurs projets."
                    detail={
                        summaryQuery.error instanceof Error ? summaryQuery.error.message : String(summaryQuery.error)
                    }
                    onRetry={() => void summaryQuery.refetch()}
                />
            ) : (
                <ProjectsKpiBar summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
            )}

            {!showGlobalEmpty ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <ProjectsTabs tab={tab} summary={summaryQuery.data} onTabChange={setTab} />
                    <div className="flex flex-wrap items-center gap-3">
                        {!listQuery.isLoading && !listQuery.isError ? (
                            <p className="text-sm text-tertiary">
                                {projects.length} projet{projects.length > 1 ? "s" : ""} affiché
                                {projects.length > 1 ? "s" : ""}
                            </p>
                        ) : null}
                        <TalentProjectsDensityToggle density={density} onToggle={toggleDensity} />
                    </div>
                </div>
            ) : null}

            {showGlobalEmpty ? (
                <EmptyState
                    title="Aucun projet pour l'instant"
                    description="Vous n'avez pas encore d'affectation projet — revenez plus tard ou contactez votre manager."
                />
            ) : null}

            {listQuery.isLoading ? (
                <div
                    className={cx(
                        "grid gap-3",
                        density === "compact" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
                    )}
                >
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-44 animate-pulse rounded-2xl bg-secondary" />
                    ))}
                </div>
            ) : null}

            {listQuery.isError ? (
                <ErrorState
                    title="Projets indisponibles"
                    message="Impossible de charger vos projets."
                    detail={listQuery.error instanceof Error ? listQuery.error.message : String(listQuery.error)}
                    onRetry={() => void listQuery.refetch()}
                />
            ) : null}

            {!listQuery.isLoading && !listQuery.isError && !showGlobalEmpty && projects.length === 0 ? (
                <EmptyState
                    title="Aucun projet dans cet onglet"
                    description="Essayez un autre filtre (actifs, planifiés ou passés)."
                />
            ) : null}

            {!listQuery.isLoading && !listQuery.isError && projects.length > 0 ? (
                <div
                    className={cx(
                        "grid gap-3",
                        density === "compact" ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
                    )}
                >
                    {projects.map((project) => (
                        <ProjectCard
                            key={project.assignment_id}
                            project={project}
                            density={density}
                            onClick={openDrawer}
                        />
                    ))}
                </div>
            ) : null}

            <ProjectDetailDrawer
                open={Boolean(selectedId)}
                projectId={selectedId}
                listRow={selectedRow}
                onClose={closeDrawer}
            />
        </div>
    );
}
