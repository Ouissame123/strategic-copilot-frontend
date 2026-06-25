import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, FolderPlus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Button } from "@/components/base/buttons/button";
import { ProjectEditDialog } from "@/components/project-mission-control/ProjectEditDialog";
import {
    ManagerProjectsPortfolioTable,
    projectDecisionRaw,
    sortPortfolioProjects,
    type PortfolioTableSortKey,
    type ProjectsTableDensity,
} from "@/components/manager/manager-projects-portfolio-table";
import { ProjectsEmptyState } from "@/components/manager/projects/ProjectsEmptyState";
import { ProjectsInsightBar, type ProjectsSegmentFilter } from "@/components/manager/projects/ProjectsInsightBar";
import { ProjectsSegments } from "@/components/manager/projects/ProjectsSegments";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWatchdogScan } from "@/hooks/useTeam";
import { useCreateProject, useDeleteProject, useProjects } from "@/hooks/useProjects";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { looksLikeUuidOrTechnicalId, stripTechnicalIdentifiers } from "@/lib/matchmaker-display";
import { managerProjectMissionControlPath, parseMissionControlTabParam } from "@/utils/workspace-routes";
import type { ProjectListItem, ProjectStatus } from "@/types/api.types";

const MANAGER_PROJECTS_LIST_LIMIT = 100;
const DENSITY_STORAGE_KEY = "projects.density";

function coerceFiniteNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizedProjectStatus(project: ProjectListItem): ProjectStatus {
    const s = String(project.status ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
    if (s === "on_hold" || s === "onhold") return "on_hold";
    if (s === "active" || s === "planned" || s === "completed" || s === "cancelled") return s;
    return "planned";
}

function statusLabel(t: TFunction<"common", undefined>, status: ProjectStatus): string {
    switch (status) {
        case "active":
            return t("managerWorkspace.projects.statusActive");
        case "planned":
            return t("managerWorkspace.projects.statusPlanned");
        case "on_hold":
            return t("managerWorkspace.projects.statusOnHold");
        case "completed":
            return t("managerWorkspace.projects.statusCompleted");
        case "cancelled":
            return t("managerWorkspace.projects.statusCancelledRow");
        default:
            return status;
    }
}

function projectDisplayName(name: string, t: TFunction<"common", undefined>): string {
    if (looksLikeUuidOrTechnicalId(name)) return t("managerWorkspace.projects.nameWithoutDisplay");
    const stripped = stripTechnicalIdentifiers(name).trim();
    if (!stripped || looksLikeUuidOrTechnicalId(stripped)) return t("managerWorkspace.projects.nameWithoutDisplay");
    return stripped;
}

function readInitialDensity(): ProjectsTableDensity {
    if (typeof window === "undefined") return "comfortable";
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return stored === "compact" ? "compact" : "comfortable";
}

function matchesSegmentFilter(project: ProjectListItem, filter: ProjectsSegmentFilter): boolean {
    if (filter === "all") return true;
    const decision = projectDecisionRaw(project).toLowerCase();
    if (filter === "action_required") return decision === "adjust" || decision === "stop" || decision === "reject";
    if (filter === "stable") return decision === "continue";
    if (filter === "surveillance") return decision === "proceed";
    if (filter === "due_soon") {
        const days = coerceFiniteNumber(project.days_to_milestone);
        return days != null && days >= 0 && days <= 30;
    }
    return true;
}

export default function ProjectsPage() {
    const { t } = useTranslation("common");
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [segmentFilter, setSegmentFilter] = useState<ProjectsSegmentFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [density, setDensity] = useState<ProjectsTableDensity>(() => readInitialDensity());
    const [sortKey, setSortKey] = useState<PortfolioTableSortKey>("fragility_score");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [createMode, setCreateMode] = useState(false);
    const [editTarget, setEditTarget] = useState<ProjectListItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [createPayload, setCreatePayload] = useState({
        name: "",
        status: "planned" as ProjectStatus,
        priority: 5,
        milestone_at: "",
    });

    const projectsQuery = useProjects({ limit: MANAGER_PROJECTS_LIST_LIMIT });
    const createProject = useCreateProject();
    const deleteProject = useDeleteProject();
    const watchdogScan = useWatchdogScan();

    const listItems = projectsQuery.data?.items ?? [];
    const counts = projectsQuery.data?.counts;
    const apiTotal = projectsQuery.data?.total ?? listItems.length;

    useEffect(() => {
        window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
    }, [density]);

    useEffect(() => {
        const openId = searchParams.get("openProjectId")?.trim() || searchParams.get("project_id")?.trim();
        if (!openId) return;
        const tab = parseMissionControlTabParam(searchParams.get("tab"));
        navigate(managerProjectMissionControlPath(openId, tab), { replace: true });
    }, [navigate, searchParams]);

    useEffect(() => {
        const decisionParam = searchParams.get("decision")?.trim();
        if (!decisionParam) return;
        const wanted = decisionParam.toLowerCase();
        if (wanted === "adjust" || wanted === "stop") {
            setSegmentFilter("action_required");
        }
    }, [searchParams]);

    useWorkspaceTopbarMeta(t("managerWorkspace.projects.heroTitle"), undefined, null);

    const filteredProjects = useMemo(() => {
        const searchLc = searchQuery.trim().toLowerCase();
        return listItems.filter((project) => {
            if (!matchesSegmentFilter(project, segmentFilter)) return false;
            if (!searchLc) return true;
            return projectDisplayName(project.name, t).toLowerCase().includes(searchLc);
        });
    }, [listItems, segmentFilter, searchQuery, t]);

    const sortedProjects = useMemo(
        () => sortPortfolioProjects(filteredProjects, sortKey, sortDir),
        [filteredProjects, sortKey, sortDir],
    );

    const toggleDensity = useCallback(() => {
        setDensity((d) => (d === "comfortable" ? "compact" : "comfortable"));
    }, []);

    const toggleSort = useCallback((k: PortfolioTableSortKey) => {
        setSortKey((prev) => {
            if (prev === k) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                return prev;
            }
            setSortDir(k === "name" ? "asc" : "desc");
            return k;
        });
    }, []);

    const handleDeleteRequest = useCallback((project: { id: string; name: string }) => {
        setDeleteTarget(project);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!deleteTarget) return;
        deleteProject.mutate(deleteTarget.id, {
            onSettled: () => setDeleteTarget(null),
        });
    }, [deleteProject, deleteTarget]);

    const handleRunAnalysis = useCallback(
        (projectId: string) => {
            watchdogScan.mutate({ project_id: projectId });
        },
        [watchdogScan],
    );

    const onCreate = () => {
        if (!createPayload.name.trim()) return;
        createProject.mutate(
            {
                name: createPayload.name.trim(),
                status: createPayload.status,
                priority: Number(createPayload.priority),
                milestone_at: createPayload.milestone_at || undefined,
            },
            {
                onSuccess: () => {
                    setCreateMode(false);
                    setCreatePayload({ name: "", status: "planned", priority: 5, milestone_at: "" });
                },
            },
        );
    };

    const projectDetailPath = useCallback((projectId: string) => managerProjectMissionControlPath(projectId), []);

    const showEmptyAll = !projectsQuery.isLoading && !projectsQuery.isError && segmentFilter === "all" && !searchQuery.trim() && listItems.length === 0;
    const showEmptySegment =
        !projectsQuery.isLoading && !projectsQuery.isError && sortedProjects.length === 0 && segmentFilter === "action_required";
    const showEmptySearch =
        !projectsQuery.isLoading && !projectsQuery.isError && sortedProjects.length === 0 && Boolean(searchQuery.trim());

    return (
        <WorkspacePageShell role="manager" eyebrow={t("workspaceRoles.manager")} title={t("managerWorkspace.projects.heroTitle")} description={false} omitHeader>
            <div className="flex flex-col gap-4">
                <header className="space-y-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            {t("managerWorkspace.projects.heroTitle")}
                            {counts?.total !== undefined ? (
                                <span className="ml-2 text-base font-normal text-slate-400">{counts.total}</span>
                            ) : apiTotal > 0 ? (
                                <span className="ml-2 text-base font-normal text-slate-400">{apiTotal}</span>
                            ) : null}
                        </h1>
                        <div className="flex items-center gap-2">
                            <Button type="button" color="tertiary" size="sm" onClick={toggleDensity}>
                                {density === "comfortable"
                                    ? t("managerWorkspace.projects.densityToggleCompact")
                                    : t("managerWorkspace.projects.densityToggleComfortable")}
                            </Button>
                            <Button type="button" color="primary" size="sm" onClick={() => setCreateMode((v) => !v)}>
                                {createMode
                                    ? t("managerWorkspace.projects.toggleCreateClose")
                                    : t("managerWorkspace.projects.newProjectShort")}
                            </Button>
                        </div>
                    </div>

                    {!projectsQuery.isLoading ? (
                        <ProjectsInsightBar counts={counts} onFilterClick={setSegmentFilter} />
                    ) : null}
                </header>

                {projectsQuery.isError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                        {t("managerWorkspace.projects.loadError")}
                    </p>
                ) : null}

                {!projectsQuery.isLoading && projectsQuery.data ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t("managerWorkspace.projects.searchPlaceholder")}
                                aria-label={t("managerWorkspace.projects.searchPlaceholder")}
                                className="min-w-[12rem] max-w-[20rem] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                            <ProjectsSegments
                                counts={counts}
                                totalFallback={apiTotal}
                                active={segmentFilter}
                                onChange={setSegmentFilter}
                            />
                        </div>
                    </div>
                ) : null}

                {createMode ? (
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                        <div className="grid gap-2 md:grid-cols-4">
                            <input
                                value={createPayload.name}
                                onChange={(e) => setCreatePayload((p) => ({ ...p, name: e.target.value }))}
                                placeholder={t("managerWorkspace.projects.namePlaceholder")}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            />
                            <select
                                value={createPayload.status}
                                onChange={(e) => setCreatePayload((p) => ({ ...p, status: e.target.value as ProjectStatus }))}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                                <option value="planned">{t("managerWorkspace.projects.statusPlanned")}</option>
                                <option value="active">{t("managerWorkspace.projects.statusActive")}</option>
                                <option value="on_hold">{t("managerWorkspace.projects.statusOnHold")}</option>
                                <option value="completed">{t("managerWorkspace.projects.statusCompleted")}</option>
                                <option value="cancelled">{t("managerWorkspace.projects.statusCancelledRow")}</option>
                            </select>
                            <input
                                value={createPayload.priority}
                                type="number"
                                min={1}
                                max={10}
                                onChange={(e) => setCreatePayload((p) => ({ ...p, priority: Number(e.target.value) }))}
                                placeholder={t("managerWorkspace.projects.priorityPlaceholder")}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                            />
                            <div className="flex gap-2">
                                <input
                                    value={createPayload.milestone_at}
                                    type="date"
                                    onChange={(e) => setCreatePayload((p) => ({ ...p, milestone_at: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                                />
                                <Button
                                    type="button"
                                    color="secondary"
                                    size="md"
                                    className="shrink-0"
                                    onClick={onCreate}
                                    isDisabled={createProject.isPending}
                                    isLoading={createProject.isPending}
                                >
                                    {t("managerWorkspace.projects.add")}
                                </Button>
                            </div>
                        </div>
                    </section>
                ) : null}

                {projectsQuery.isLoading ? (
                    <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/40" />
                ) : null}

                {showEmptyAll ? (
                    <ProjectsEmptyState
                        icon={FolderPlus}
                        title={t("managerWorkspace.projects.emptyCreateTitle")}
                        description={t("managerWorkspace.projects.emptyCreateDescription")}
                        actionLabel={t("managerWorkspace.projects.emptyCreateAction")}
                        onAction={() => setCreateMode(true)}
                    />
                ) : null}

                {showEmptySegment ? (
                    <ProjectsEmptyState
                        icon={CheckCircle}
                        title={t("managerWorkspace.projects.emptyNoActionTitle")}
                        description={t("managerWorkspace.projects.emptyNoActionDescription")}
                    />
                ) : null}

                {showEmptySearch ? (
                    <ProjectsEmptyState
                        title={t("managerWorkspace.projects.emptySearchTitle", { query: searchQuery.trim() })}
                        actionLabel={t("managerWorkspace.projects.emptyResetSearch")}
                        onAction={() => setSearchQuery("")}
                    />
                ) : null}

                {!projectsQuery.isLoading && sortedProjects.length > 0 ? (
                    <ManagerProjectsPortfolioTable
                        rows={sortedProjects}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        density={density}
                        onSort={toggleSort}
                        projectDetailPath={projectDetailPath}
                        t={t}
                        statusLabel={(s) => statusLabel(t, s)}
                        projectDisplayName={(name) => projectDisplayName(name, t)}
                        onDeleteRequest={handleDeleteRequest}
                        onEditRequest={setEditTarget}
                        onRunAnalysis={handleRunAnalysis}
                        isAnalysisPending={watchdogScan.isPending}
                    />
                ) : null}

                {editTarget ? (
                    <ProjectEditDialog
                        open={Boolean(editTarget)}
                        onOpenChange={(open) => {
                            if (!open) setEditTarget(null);
                        }}
                        projectId={editTarget.id}
                        initial={{
                            status: normalizedProjectStatus(editTarget),
                            priority: Math.round(coerceFiniteNumber(editTarget.priority) ?? 5),
                            milestone_at: editTarget.milestone_at ?? "",
                        }}
                    />
                ) : null}

                <ConfirmDialog
                    isOpen={Boolean(deleteTarget)}
                    onOpenChange={(open) => {
                        if (!open && !deleteProject.isPending) setDeleteTarget(null);
                    }}
                    title={t("managerWorkspace.projects.deleteProjectTitle")}
                    body={
                        <div className="space-y-2">
                            {deleteTarget ? (
                                <p className="font-medium text-primary">
                                    {t("managerWorkspace.projects.deleteProjectSubtitle", { name: deleteTarget.name })}
                                </p>
                            ) : null}
                            <p>{t("managerWorkspace.projects.deleteProjectBody")}</p>
                        </div>
                    }
                    confirmLabel={t("managerWorkspace.projects.deleteProjectConfirm")}
                    cancelLabel={t("managerWorkspace.projects.deleteProjectCancel")}
                    tone="danger"
                    isConfirmLoading={deleteProject.isPending}
                    onConfirm={handleConfirmDelete}
                />
            </div>
        </WorkspacePageShell>
    );
}
