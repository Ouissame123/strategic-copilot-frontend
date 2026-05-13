import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { Eye, Trash01 } from "@untitledui/icons";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { localeForDateFormatting } from "@/lib/ui-locale";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { ProjectMissionControlModal } from "@/components/manager/project-mission-control-modal";
import { useCreateProject, useProjects, useUpdateProject } from "@/hooks/useProjects";
import { readUserFacingApiErrorMessage } from "@/lib/user-facing-api-error";
import { useToast } from "@/providers/toast-provider";
import type { ProjectStatus } from "@/types/api.types";

type RiskLevel = "all" | "low" | "medium" | "high";
type SortBy = "milestone" | "viability" | "alerts";

function computeRiskLevel(project: {
    latest_viability_score: number | null;
    active_alerts_count: number;
}): Exclude<RiskLevel, "all"> {
    if ((project.active_alerts_count ?? 0) >= 3 || (project.latest_viability_score ?? 10) < 5) return "high";
    if ((project.active_alerts_count ?? 0) >= 1 || (project.latest_viability_score ?? 10) < 7) return "medium";
    return "low";
}

export default function ProjectsPage() {
    const { t } = useTranslation("common");
    const [searchParams, setSearchParams] = useSearchParams();
    /** `all` = portefeuille actif (on masque les `cancelled`). Sinon filtre API sur le statut choisi. */
    const [status, setStatus] = useState<"all" | ProjectStatus>("all");
    const [riskLevel, setRiskLevel] = useState<RiskLevel>("all");
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<SortBy>("milestone");
    const [createMode, setCreateMode] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [createPayload, setCreatePayload] = useState({
        name: "",
        status: "planned" as ProjectStatus,
        priority: 5,
        milestone_at: "",
    });
    const decisionParam = searchParams.get("decision");
    const statusParamLegacy = (searchParams.get("status") ?? "").toLowerCase();

    const projectsQuery = useProjects({
        limit: 100,
        status: status === "all" ? undefined : status,
        search: search.trim() || undefined,
    });
    const createProject = useCreateProject();
    const selectedProject = (projectsQuery.data?.items ?? []).find((p) => p.id === selectedProjectId);

    const updateProject = useUpdateProject();
    const { push: pushToast } = useToast();

    useEffect(() => {
        const openId = searchParams.get("openProjectId")?.trim();
        if (!openId) return;
        if (projectsQuery.isLoading) return;
        setSelectedProjectId(openId);
        const next = new URLSearchParams(searchParams);
        next.delete("openProjectId");
        setSearchParams(next, { replace: true });
    }, [searchParams, projectsQuery.isLoading, setSearchParams]);

    const filteredProjects = useMemo(() => {
        const raw = [...(projectsQuery.data?.items ?? [])];
        /* « Tous les statuts » = tout sauf projets supprimés (soft-delete → cancelled). */
        const list = status === "all" ? raw.filter((p) => p.status !== "cancelled") : raw;
        const byRisk = riskLevel === "all" ? list : list.filter((p) => computeRiskLevel(p) === riskLevel);
        const byDecision = (() => {
            if (decisionParam) {
                const wanted = decisionParam
                    .split(",")
                    .map((d) => d.trim())
                    .filter(Boolean)
                    .map((d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase());
                return byRisk.filter((project) => {
                    const decision = String(project.latest_decision ?? project.decision ?? "").trim();
                    return wanted.includes(decision);
                });
            }
            if (statusParamLegacy === "stop") {
                return byRisk.filter((project) => {
                    const decision = String(project.latest_decision ?? project.decision ?? "").trim();
                    return ["Stop", "Adjust"].includes(decision);
                });
            }
            return byRisk;
        })();
        if (sortBy === "viability") {
            byDecision.sort((a, b) => (a.latest_viability_score ?? 99) - (b.latest_viability_score ?? 99));
        } else if (sortBy === "alerts") {
            byDecision.sort((a, b) => (b.active_alerts_count ?? 0) - (a.active_alerts_count ?? 0));
        } else {
            byDecision.sort((a, b) => (a.milestone_at ?? "9999-12-31").localeCompare(b.milestone_at ?? "9999-12-31"));
        }
        return byDecision;
    }, [projectsQuery.data?.items, riskLevel, sortBy, decisionParam, statusParamLegacy, status]);
    const filterLabel = decisionParam
        ? decisionParam
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean)
            .join(" ou ")
        : statusParamLegacy;

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

    const onDeleteProject = (projectId: string) => {
        const confirmed = window.confirm(t("managerWorkspace.projects.confirmDelete"));
        if (!confirmed) return;
        updateProject.mutate(
            {
                projectId,
                body: { status: "cancelled" },
            },
            {
                onSuccess: () => {
                    void projectsQuery.refetch();
                },
                onError: (err) => {
                    const message = readUserFacingApiErrorMessage(err, t("managerWorkspace.projects.cancelProjectErrorFallback"));
                    pushToast(t("managerWorkspace.projects.cancelProjectError", { message }), "error");
                },
            },
        );
    };

    /** Ouvre le modal Strategic Mission Control (même flux que `?openProjectId=`). */
    const openProjectMissionControl = useCallback((projectId: string) => {
        setSelectedProjectId(projectId);
    }, []);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.projects.heroTitle")}
            description={false}
            omitHeader
        >
            <PageHero
                eyebrow={t("managerWorkspace.projects.heroEyebrow")}
                title={t("managerWorkspace.projects.heroTitle")}
                subtitle={t("managerWorkspace.projects.heroSubtitle")}
                badge={t("workspaceRoles.manager")}
            />
            <div className="space-y-4">
                    {projectsQuery.isLoading ? <p>{t("managerWorkspace.projects.loading")}</p> : null}
                    <section className="rounded-xl border border-secondary bg-primary p-4">
                        <div className="grid gap-3 md:grid-cols-4">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("managerWorkspace.projects.searchPlaceholder")}
                            className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary placeholder:text-placeholder"
                        />
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as "all" | ProjectStatus)}
                            className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary"
                        >
                            <option value="all">{t("managerWorkspace.projects.statusAll")}</option>
                            <option value="active">active</option>
                            <option value="planned">planned</option>
                            <option value="on_hold">on_hold</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">{t("managerWorkspace.projects.statusCancelled")}</option>
                        </select>
                        <select
                            value={riskLevel}
                            onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                            className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary"
                        >
                            <option value="all">{t("managerWorkspace.projects.riskAll")}</option>
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortBy)}
                            className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary"
                        >
                            <option value="milestone">{t("managerWorkspace.projects.sortMilestone")}</option>
                            <option value="viability">{t("managerWorkspace.projects.sortViability")}</option>
                            <option value="alerts">{t("managerWorkspace.projects.sortAlerts")}</option>
                        </select>
                        </div>
                    </section>
                    {decisionParam || statusParamLegacy ? (
                    <section className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-500/40 dark:bg-amber-950/40">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-amber-900 dark:text-amber-100">
                                {t("managerWorkspace.projects.filterActive", { label: filterLabel })}{" "}
                                <span className="ml-2 text-xs">
                                    {t(
                                        filteredProjects.length > 1
                                            ? "managerWorkspace.projects.projectsCount_plural"
                                            : "managerWorkspace.projects.projectsCount",
                                        { count: filteredProjects.length },
                                    )}
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setSearchParams({})}
                                className="ml-auto rounded border border-amber-300/60 bg-white px-2 py-1 text-xs text-amber-900 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-900/50 dark:text-amber-50 dark:hover:bg-amber-800/60"
                            >
                                {t("managerWorkspace.projects.clearFilter")}
                            </button>
                        </div>
                    </section>
                ) : null}

                <section className="rounded-xl border border-secondary bg-primary p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-fg-primary">{t("managerWorkspace.projects.sectionTitle")}</h3>
                        <button type="button" className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm font-medium text-fg-secondary hover:bg-secondary_subtle" onClick={() => setCreateMode((v) => !v)}>
                            {createMode ? t("managerWorkspace.projects.toggleCreateClose") : t("managerWorkspace.projects.toggleCreateOpen")}
                        </button>
                    </div>
                    {createMode ? (
                        <div className="grid gap-2 md:grid-cols-4">
                            <input
                                value={createPayload.name}
                                onChange={(e) => setCreatePayload((p) => ({ ...p, name: e.target.value }))}
                                placeholder={t("managerWorkspace.projects.namePlaceholder")}
                                className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary placeholder:text-placeholder"
                            />
                            <select
                                value={createPayload.status}
                                onChange={(e) => setCreatePayload((p) => ({ ...p, status: e.target.value as ProjectStatus }))}
                                className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary"
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
                                className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary placeholder:text-placeholder"
                            />
                            <div className="flex gap-2">
                                <input
                                    value={createPayload.milestone_at}
                                    type="date"
                                    onChange={(e) => setCreatePayload((p) => ({ ...p, milestone_at: e.target.value }))}
                                    className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary"
                                />
                                <button
                                    type="button"
                                    onClick={onCreate}
                                    disabled={createProject.isPending}
                                    className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm font-medium text-fg-secondary hover:bg-secondary_subtle disabled:opacity-60"
                                >
                                    {t("managerWorkspace.projects.add")}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </section>

                <div className="overflow-x-auto rounded-xl border border-secondary bg-primary text-fg-primary">
                    <table className="min-w-full text-sm">
                        <thead className="bg-secondary_subtle text-fg-secondary">
                            <tr>
                                <th className="px-3 py-2 text-left">{t("managerWorkspace.projects.colName")}</th>
                                <th className="px-3 py-2 text-left">{t("managerWorkspace.projects.colStatus")}</th>
                                <th className="px-3 py-2 text-left">{t("managerWorkspace.projects.colPriority")}</th>
                                <th className="px-3 py-2 text-left">{t("managerWorkspace.projects.colMilestone")}</th>
                                <th className="px-3 py-2 text-left">{t("managerWorkspace.projects.colProgress")}</th>
                                <th className="px-3 py-2 text-left">{t("managerWorkspace.projects.colDecision")}</th>
                                <th className="px-3 py-2 text-left">{t("managerWorkspace.projects.colAlerts")}</th>
                                <th className="px-3 py-2 text-left">{t("managerWorkspace.projects.colTeam")}</th>
                                <th className="px-3 py-2 text-left">{t("managerWorkspace.projects.colAction")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjects.map((project) => (
                                <tr key={project.id} className="border-t border-secondary hover:bg-secondary_subtle/40">
                                    <td className="px-3 py-2 font-medium">{project.name}</td>
                                    <td className="px-3 py-2">{project.status}</td>
                                    <td className="px-3 py-2">{project.priority}</td>
                                    <td className="px-3 py-2">
                                        {project.milestone_at
                                            ? new Date(project.milestone_at).toLocaleDateString(localeForDateFormatting(i18n.language))
                                            : t("managerWorkspace.relative.emDash")}
                                    </td>
                                    <td className="px-3 py-2">{project.progress_pct ?? t("managerWorkspace.relative.emDash")}</td>
                                    <td className="px-3 py-2">{project.latest_decision ?? t("managerWorkspace.relative.emDash")}</td>
                                    <td className="px-3 py-2">{project.active_alerts_count ?? 0}</td>
                                    <td className="px-3 py-2">{project.team_size ?? 0}</td>
                                    <td
                                        className="px-3 py-2"
                                        onClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <Dropdown.Root>
                                            <Dropdown.DotsButton
                                                aria-label={t("managerWorkspace.projects.actionsForProject", { name: project.name })}
                                                onPointerDown={(e) => e.stopPropagation()}
                                            />
                                            <Dropdown.Popover className="w-min" onPointerDown={(e) => e.stopPropagation()}>
                                                <Dropdown.Menu
                                                    /* `onAction` au niveau Menu : fiable avec selectionMode="none" (react-aria-components). */
                                                    onAction={(key) => {
                                                        const id = String(key);
                                                        if (id.startsWith("mc-detail:")) {
                                                            openProjectMissionControl(id.slice("mc-detail:".length));
                                                            return;
                                                        }
                                                        if (id.startsWith("mc-delete:")) {
                                                            onDeleteProject(id.slice("mc-delete:".length));
                                                        }
                                                    }}
                                                >
                                                    <Dropdown.Item
                                                        id={`mc-detail:${project.id}`}
                                                        textValue={t("managerWorkspace.projects.detail")}
                                                        icon={Eye}
                                                        label={t("managerWorkspace.projects.detail")}
                                                    />
                                                    <Dropdown.Separator />
                                                    <Dropdown.Item
                                                        id={`mc-delete:${project.id}`}
                                                        textValue={t("managerWorkspace.projects.delete")}
                                                        icon={Trash01}
                                                        label={t("managerWorkspace.projects.delete")}
                                                    />
                                                </Dropdown.Menu>
                                            </Dropdown.Popover>
                                        </Dropdown.Root>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!filteredProjects.length ? <p className="p-4 text-sm text-fg-tertiary">{t("managerWorkspace.projects.empty")}</p> : null}
                </div>

            </div>

            {selectedProjectId ? (
                <ProjectMissionControlModal
                    key={selectedProjectId}
                    open
                    projectId={selectedProjectId}
                    listProject={selectedProject}
                    onClose={() => setSelectedProjectId(null)}
                />
            ) : null}
        </WorkspacePageShell>
    );
}
