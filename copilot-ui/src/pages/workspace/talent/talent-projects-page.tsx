import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ProjectDetailSheet } from "@/components/talent/projects/ProjectDetailSheet";
import { TALENT_PAGE_STACK } from "@/components/talent/ui/talent-workspace-ui";
import {
    ProjectCard,
    ProjectFilters,
    ProjectStatsBar,
    ProjectsEmptyState,
    ProjectsHeader,
    emptyMessageForTab,
    parseProjectTabParam,
    projectMatchesTab,
} from "@/features/talent/projects";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentProjects, useTalentProjectsSummary } from "@/hooks/useTalentProjects";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import type { ProjectTab, TalentProjectListItem } from "@/types/talent-projects";

export function TalentProjectsPage() {
    useCopilotPage("projects_list", "Mes projets");
    /** Titre/CTA dans `ProjectsHeader` — topbar sans CTA (breadcrumbs uniquement). */
    useWorkspaceTopbarMeta("", null);

    const navigate = useNavigate();
    const paths = useWorkspacePaths();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = parseProjectTabParam(searchParams.get("tab"));
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<TalentProjectListItem | null>(null);

    const summaryQuery = useTalentProjectsSummary();
    const listQuery = useTalentProjects(tab);

    /** Même handler que l'ancien CTA topbar (`AppLayoutHeaderActions`). */
    const onNewProject = useCallback(() => {
        navigate(`${paths.projects}?action=new`, { replace: false });
    }, [navigate, paths.projects]);

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

    const openDrawer = (project: TalentProjectListItem) => {
        setSelectedId(project.project_id);
        setSelectedRow(project);
    };

    const closeDrawer = () => {
        setSelectedId(null);
        setSelectedRow(null);
    };

    /** Filtre local avec la même classification que badge / compteurs (filet de cohérence). */
    const projects = useMemo(() => {
        const rows = listQuery.data ?? [];
        return rows.filter((project) => projectMatchesTab(project, tab));
    }, [listQuery.data, tab]);

    const activeCount = summaryQuery.data?.by_tab.active;
    const subtitle =
        activeCount != null
            ? `${activeCount} projet${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""}`
            : "Vos affectations et jalons";

    const showGlobalEmpty =
        !summaryQuery.isLoading && !summaryQuery.isError && summaryQuery.data?.total === 0;

    return (
        <div className={TALENT_PAGE_STACK}>
            <ProjectsHeader title="Mes projets" subtitle={subtitle} onNewProject={onNewProject} />

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
                <ProjectStatsBar summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
            )}

            {!showGlobalEmpty ? <ProjectFilters tab={tab} summary={summaryQuery.data} onTabChange={setTab} /> : null}

            {showGlobalEmpty ? (
                <ProjectsEmptyState
                    title="Aucun projet pour l'instant"
                    description="Vous n'avez pas encore d'affectation projet — créez-en un ou contactez votre manager."
                    onNewProject={onNewProject}
                />
            ) : null}

            {listQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-44 animate-pulse rounded-lg bg-secondary" />
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
                <ProjectsEmptyState title={emptyMessageForTab(tab)} onNewProject={onNewProject} />
            ) : null}

            {!listQuery.isLoading && !listQuery.isError && projects.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project) => (
                        <ProjectCard key={project.assignment_id} project={project} onClick={openDrawer} />
                    ))}
                </div>
            ) : null}

            <ProjectDetailSheet
                open={Boolean(selectedId)}
                projectId={selectedId}
                listRow={selectedRow}
                onClose={closeDrawer}
            />
        </div>
    );
}
