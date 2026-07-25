import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { classifyManagerProjectDeleteError } from "@/api/manager-projects.api";
import { ManagerProjectsPortfolioTable } from "@/components/manager/manager-projects-portfolio-table";
import { CreateProjectModal } from "@/components/manager/projects/CreateProjectModal";
import { DeleteProjectDialog } from "@/components/manager/projects/DeleteProjectDialog";
import { ProjectsEmptyState } from "@/components/manager/projects/ProjectsEmptyState";
import { ProjectsFiltersBar, type ProjectsListFilters } from "@/components/manager/projects/ProjectsFiltersBar";
import {
    sortProjectsList,
    type ProjectsListSortDirection,
    type ProjectsListSortKey,
} from "@/components/manager/projects/projects-list-sort";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useDeleteProject, useProjects } from "@/hooks/useProjects";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { looksLikeUuidOrTechnicalId, stripTechnicalIdentifiers } from "@/lib/matchmaker-display";
import { useToast } from "@/providers/toast-provider";
import type { ProjectListItem } from "@/types/api.types";
import { managerProjectMissionControlPath, parseMissionControlTabParam } from "@/utils/workspace-routes";

const MANAGER_PROJECTS_LIST_LIMIT = 200;
const SEARCH_DEBOUNCE_MS = 350;

function projectDisplayName(name: string, t: TFunction<"common", undefined>): string {
    if (looksLikeUuidOrTechnicalId(name)) return t("managerWorkspace.projects.nameWithoutDisplay");
    const stripped = stripTechnicalIdentifiers(name).trim();
    if (!stripped || looksLikeUuidOrTechnicalId(stripped)) return t("managerWorkspace.projects.nameWithoutDisplay");
    return stripped;
}

export default function ProjectsPage() {
    const { t } = useTranslation("common");
    const { push: pushToast } = useToast();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const deleteProject = useDeleteProject();

    const [filters, setFilters] = useState<ProjectsListFilters>({
        search: "",
        status: "",
    });
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sortKey, setSortKey] = useState<ProjectsListSortKey | null>(null);
    const [sortDirection, setSortDirection] = useState<ProjectsListSortDirection>("asc");
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
    const [deleteBlockerMessage, setDeleteBlockerMessage] = useState<string | null>(null);

    useWorkspaceTopbarMeta(t("managerWorkspace.projects.heroTitle"), t("managerWorkspace.projects.listSubtitle"));

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearch(filters.search.trim());
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timeoutId);
    }, [filters.search]);

    const projectsQuery = useProjects({
        limit: MANAGER_PROJECTS_LIST_LIMIT,
        status: filters.status || undefined,
        search: debouncedSearch || undefined,
    });
    const listItems = projectsQuery.data?.items ?? [];
    const hasActiveFilters = Boolean(filters.status || debouncedSearch);

    useEffect(() => {
        const openId = searchParams.get("openProjectId")?.trim() || searchParams.get("project_id")?.trim();
        if (!openId) return;
        const tab = parseMissionControlTabParam(searchParams.get("tab"));
        navigate(managerProjectMissionControlPath(openId, tab), { replace: true });
    }, [navigate, searchParams]);

    const displayedProjects = useMemo(() => {
        if (!sortKey) return listItems;
        return sortProjectsList(listItems, sortKey, sortDirection);
    }, [listItems, sortDirection, sortKey]);

    const handleSort = useCallback(
        (nextKey: ProjectsListSortKey) => {
            if (nextKey === sortKey) {
                setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
                return;
            }
            setSortKey(nextKey);
            setSortDirection(nextKey === "project" ? "asc" : "desc");
        },
        [sortKey],
    );

    const onSelectProject = useCallback(
        (projectId: string) => {
            navigate(managerProjectMissionControlPath(projectId));
        },
        [navigate],
    );

    const onRequestDelete = useCallback((project: ProjectListItem) => {
        setDeleteBlockerMessage(null);
        setDeleteTarget(project);
    }, []);

    const onConfirmDelete = useCallback(() => {
        if (!deleteTarget || deleteProject.isPending) return;
        const id = deleteTarget.id;
        deleteProject.mutate(id, {
            onSuccess: () => {
                setDeleteTarget(null);
                setDeleteBlockerMessage(null);
            },
            onError: (err) => {
                const classified = classifyManagerProjectDeleteError(err);
                if (classified.kind === "not_found") {
                    setDeleteTarget(null);
                    setDeleteBlockerMessage(null);
                    return;
                }
                if (classified.kind === "not_deletable") {
                    setDeleteTarget(null);
                    setDeleteBlockerMessage(classified.message);
                    return;
                }
                pushToast(classified.message || t("managerWorkspace.projects.deleteProjectError"), "error");
                setDeleteTarget(null);
            },
        });
    }, [deleteProject, deleteTarget, pushToast, t]);

    const showEmpty = !projectsQuery.isLoading && !projectsQuery.isError && listItems.length === 0;

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.projects.heroTitle")}
            description={false}
            omitHeader
        >
            <div className="flex flex-col gap-4">
                <ProjectsFiltersBar filters={filters} onChange={setFilters} onCreate={() => setCreateOpen(true)} />

                {deleteBlockerMessage ? (
                    <div
                        role="alert"
                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <p className="whitespace-pre-wrap font-medium">{deleteBlockerMessage}</p>
                            <button
                                type="button"
                                className="shrink-0 text-xs font-medium underline"
                                onClick={() => setDeleteBlockerMessage(null)}
                            >
                                {t("managerWorkspace.projects.deleteBlockerDismiss")}
                            </button>
                        </div>
                    </div>
                ) : null}

                {projectsQuery.isError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                        <p className="font-medium">{t("managerWorkspace.projects.loadError")}</p>
                        <button
                            type="button"
                            className="mt-2 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-100 dark:hover:bg-red-900/60"
                            onClick={() => void projectsQuery.refetch()}
                        >
                            {t("managerWorkspace.dashboard.retry")}
                        </button>
                    </div>
                ) : null}

                {projectsQuery.isLoading ? (
                    <div className="space-y-2" aria-label={t("loading")}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/50"
                                style={{ opacity: 1 - i * 0.08 }}
                            />
                        ))}
                    </div>
                ) : null}

                {showEmpty ? (
                    <ProjectsEmptyState
                        title={
                            hasActiveFilters
                                ? t("managerWorkspace.projects.listEmptyNoMatch")
                                : t("managerWorkspace.projects.listEmptyNone")
                        }
                        description={
                            hasActiveFilters
                                ? t("managerWorkspace.projects.listEmptyNoMatchHint")
                                : t("managerWorkspace.projects.emptyCreateDescription")
                        }
                        actionLabel={
                            hasActiveFilters
                                ? t("managerWorkspace.projects.emptyResetSearch")
                                : t("managerWorkspace.projects.emptyCreateAction")
                        }
                        onAction={
                            hasActiveFilters
                                ? () => setFilters({ search: "", status: "" })
                                : () => setCreateOpen(true)
                        }
                    />
                ) : null}

                {!projectsQuery.isLoading && !projectsQuery.isError && listItems.length > 0 ? (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span>
                                {t("managerWorkspace.projects.listCountShown", {
                                    shown: displayedProjects.length,
                                    total: projectsQuery.data?.total ?? listItems.length,
                                })}
                            </span>
                        </div>
                        <ManagerProjectsPortfolioTable
                            rows={displayedProjects}
                            projectDisplayName={(name) => projectDisplayName(name, t)}
                            onSelectProject={onSelectProject}
                            onDeleteProject={onRequestDelete}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                        />
                    </>
                ) : null}
            </div>

            <CreateProjectModal open={createOpen} onOpenChange={setCreateOpen} />

            <DeleteProjectDialog
                open={Boolean(deleteTarget)}
                projectName={deleteTarget ? projectDisplayName(deleteTarget.name, t) : ""}
                isDeleting={deleteProject.isPending}
                onOpenChange={(open) => {
                    if (!open && !deleteProject.isPending) setDeleteTarget(null);
                }}
                onConfirm={onConfirmDelete}
            />
        </WorkspacePageShell>
    );
}
