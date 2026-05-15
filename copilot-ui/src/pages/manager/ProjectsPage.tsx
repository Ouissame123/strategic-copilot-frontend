import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { localeForDateFormatting } from "@/lib/ui-locale";
import { Button } from "@/components/base/buttons/button";
import { ManagerProjectsKanbanView } from "@/components/manager/manager-projects-kanban";
import { ProjectMissionControlModal } from "@/components/manager/project-mission-control-modal";
import { useCreateProject, useProjects } from "@/hooks/useProjects";
import type { ProjectListItem, ProjectStatus } from "@/types/api.types";
import { looksLikeUuidOrTechnicalId, stripTechnicalIdentifiers } from "@/lib/matchmaker-display";
import type { TFunction } from "i18next";

type RiskLevel = "all" | "low" | "medium" | "high";
type DeadlineChipFilter = "all" | "overdue" | "soon";
type ProjectsSmartTab = "all" | "critical" | "adjust" | "soon";
type ProjectsViewMode = "table" | "kanban";
type ProjectsTableSortKey =
    | "name"
    | "status"
    | "priority"
    | "milestone_at"
    | "progress_pct"
    | "latest_viability_score"
    | "latest_decision"
    | "active_alerts_count"
    | "team_size";

/** Limite unique GET /manager/projects — KPI + tableau dérivés des mêmes `items` / `total`. */
const MANAGER_PROJECTS_LIST_LIMIT = 500;

/** L’API peut renvoyer des nombres en string ; évite `.toFixed` / tris sur une valeur non-numérique (crash React). */
function coerceFiniteNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/** GET /manager/projects : `active_alerts_count` uniquement (nombre, jamais concaténation string). */
function activeAlertsCountStrict(project: ProjectListItem): number {
    return Math.round(coerceFiniteNumber(project.active_alerts_count) ?? 0);
}

/** Normalise `project.status` (casse / espaces) vers le type attendu par les filtres et les libellés. */
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

const PROJECT_KPI_GRID_CLASS =
    "grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-4 xl:grid-cols-6 xl:gap-4";

/** Pastilles statut — palette douce (dashboard premium). */
function projectStatusBadge(status: string | null | undefined): { label: string; className: string } {
    const s = (status ?? "").toLowerCase().trim();
    if (!s) return { label: "—", className: "border-secondary/60 bg-secondary_subtle/50 text-tertiary" };
    if (s === "active")
        return {
            label: "active",
            className:
                "border border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-200/90",
        };
    if (s === "on_hold")
        return {
            label: "on_hold",
            className:
                "border border-amber-200/80 bg-amber-50/90 text-amber-900/90 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-200/85",
        };
    if (s === "cancelled")
        return {
            label: "cancelled",
            className:
                "border border-red-200/80 bg-red-50/90 text-red-800 dark:border-red-800/40 dark:bg-red-950/25 dark:text-red-200/85",
        };
    if (s === "planned")
        return {
            label: "planned",
            className:
                "border border-blue-200/80 bg-blue-50/90 text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/25 dark:text-blue-200/85",
        };
    if (s === "completed")
        return {
            label: "completed",
            className:
                "border border-violet-200/70 bg-violet-50/80 text-violet-800 dark:border-violet-800/35 dark:bg-violet-950/20 dark:text-violet-200/80",
        };
    return {
        label: status ?? "—",
        className: "border border-secondary/60 bg-secondary_subtle/40 text-secondary",
    };
}

/** Pastille décision — tons discrets, bordures légères. */
function decisionBadge(decision: string | null | undefined): { label: string; className: string } {
    const d = (decision ?? "").toLowerCase().trim();
    if (!d) return { label: "—", className: "border border-secondary/50 bg-secondary_subtle/30 text-tertiary" };
    if (d === "stop" || d === "reject")
        return {
            label: decision ?? "Stop",
            className:
                "border border-red-200/70 bg-red-50/80 font-medium text-red-800/95 dark:border-red-800/35 dark:bg-red-950/20 dark:text-red-200/80",
        };
    if (d === "adjust")
        return {
            label: "Adjust",
            className:
                "border border-amber-200/70 bg-amber-50/80 font-medium text-amber-900/85 dark:border-amber-800/35 dark:bg-amber-950/20 dark:text-amber-200/75",
        };
    if (d === "continue" || d === "proceed")
        return {
            label: decision ?? "Continue",
            className:
                "border border-emerald-200/70 bg-emerald-50/80 font-medium text-emerald-800/95 dark:border-emerald-800/35 dark:bg-emerald-950/20 dark:text-emerald-200/80",
        };
    return { label: decision ?? "—", className: "border border-secondary/50 bg-secondary_subtle/30 text-secondary" };
}

/** Pastille alertes — discret si &gt; 0 (évite rouge vif partout). */
function alertsCountPresentation(n: number): { className: string } {
    if (n > 0)
        return {
            className:
                "border border-amber-200/70 bg-amber-50/70 font-medium text-amber-900/80 dark:border-amber-800/35 dark:bg-amber-950/20 dark:text-amber-200/75",
        };
    return { className: "border border-transparent bg-transparent text-tertiary" };
}

/** Barre de progression — piste fine, couleurs atténuées. */
function projectProgressBarTone(pct: number): { bar: string; text: string; track: string } {
    if (pct < 35)
        return {
            bar: "bg-red-300/75 dark:bg-red-500/35",
            text: "text-red-700/80 dark:text-red-300/70",
            track: "bg-red-100/45 dark:bg-red-950/25",
        };
    if (pct < 75)
        return {
            bar: "bg-amber-300/70 dark:bg-amber-500/32",
            text: "text-amber-800/78 dark:text-amber-300/65",
            track: "bg-amber-100/35 dark:bg-amber-950/18",
        };
    return {
        bar: "bg-emerald-300/65 dark:bg-emerald-500/30",
        text: "text-emerald-800/78 dark:text-emerald-300/65",
        track: "bg-emerald-100/35 dark:bg-emerald-950/18",
    };
}

function viabilityScoreTextClass(score: number): string {
    if (score >= 8) return "text-emerald-700/90 dark:text-emerald-300/80";
    if (score >= 6) return "text-amber-800/85 dark:text-amber-300/75";
    return "text-red-700/90 dark:text-red-300/80";
}

type ProjectKpiAccent = "slate" | "emerald" | "blue" | "amber" | "red" | "violet";

const PROJECT_KPI_ACCENT: Record<ProjectKpiAccent, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100",
    blue: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100",
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
    red: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100",
    violet: "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100",
};

function computeRiskLevel(project: ProjectListItem): Exclude<RiskLevel, "all"> {
    const alerts = activeAlertsCountStrict(project);
    const viability = coerceFiniteNumber(project.latest_viability_score) ?? 10;
    if (alerts >= 3 || viability < 5) return "high";
    if (alerts >= 1 || viability < 7) return "medium";
    return "low";
}

function normalizeDecisionRaw(project: ProjectListItem): string {
    return String(project.latest_decision ?? "").trim();
}

function translateDecision(t: TFunction<"common", undefined>, raw: string): string {
    const d = raw.trim().toLowerCase();
    if (!d) return t("managerWorkspace.projects.decisionUnknown");
    if (d === "continue" || d === "proceed") return t("managerWorkspace.projects.decisionContinue");
    if (d === "adjust") return t("managerWorkspace.projects.decisionAdjust");
    if (d === "stop" || d === "reject") return t("managerWorkspace.projects.decisionStop");
    return raw;
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

function startOfLocalDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function matchesDeadlineChipFilter(project: ProjectListItem, deadline: DeadlineChipFilter): boolean {
    if (deadline === "all") return true;
    const raw = project.milestone_at;
    if (raw == null || String(raw).trim() === "") return false;
    const m = new Date(raw as string);
    if (Number.isNaN(m.getTime())) return false;
    const today = startOfLocalDay(new Date());
    if (deadline === "overdue") return m < today;
    const days = Math.floor((m.getTime() - Date.now()) / 86_400_000);
    return days >= 0 && days <= 30;
}

function matchesProjectsSmartTab(project: ProjectListItem, tab: ProjectsSmartTab): boolean {
    if (tab === "all") return true;
    if (tab === "critical") {
        return computeRiskLevel(project) === "high" || (coerceFiniteNumber(project.latest_viability_score) ?? 99) < 5;
    }
    if (tab === "adjust") return normalizeDecisionRaw(project).toLowerCase() === "adjust";
    if (tab === "soon") return matchesDeadlineChipFilter(project, "soon");
    return true;
}

/** Masque jalons très anciens ou entrées « test » (nom court + pas d’équipe) tant que la case n’est pas cochée. */
function isProjectHiddenByLegacyFilter(project: ProjectListItem, showLegacy: boolean): boolean {
    if (showLegacy) return false;
    const cutoff = startOfLocalDay(new Date());
    cutoff.setDate(cutoff.getDate() - 365);
    const raw = project.milestone_at;
    if (raw != null && String(raw).trim() !== "") {
        const m = new Date(raw as string);
        if (!Number.isNaN(m.getTime()) && m < cutoff) return true;
    }
    const nameTrim = String(project.name ?? "").trim();
    const team = Math.round(coerceFiniteNumber(project.team_size) ?? 0);
    if (nameTrim.length < 3 && team === 0) return true;
    return false;
}

function sortKeyIsNull(project: ProjectListItem, key: ProjectsTableSortKey): boolean {
    switch (key) {
        case "name":
            return false;
        case "status":
            return false;
        case "priority":
            return coerceFiniteNumber(project.priority) == null;
        case "milestone_at":
            return project.milestone_at == null || String(project.milestone_at).trim() === "";
        case "progress_pct":
            return project.progress_pct == null || String(project.progress_pct).trim() === "" || Number.isNaN(Number(project.progress_pct));
        case "latest_viability_score":
            return coerceFiniteNumber(project.latest_viability_score) == null;
        case "latest_decision":
            return !normalizeDecisionRaw(project);
        case "active_alerts_count":
            return false;
        case "team_size":
            return coerceFiniteNumber(project.team_size) == null;
        default:
            return false;
    }
}

function compareProjectsForSort(a: ProjectListItem, b: ProjectListItem, key: ProjectsTableSortKey, t: TFunction<"common", undefined>): number {
    const rowA = normalizedProjectStatus(a);
    const rowB = normalizedProjectStatus(b);
    switch (key) {
        case "name": {
            const na = projectDisplayName(a.name, t).toLowerCase();
            const nb = projectDisplayName(b.name, t).toLowerCase();
            return na.localeCompare(nb, undefined, { sensitivity: "base" });
        }
        case "status":
            return rowA.localeCompare(rowB);
        case "priority":
            return (coerceFiniteNumber(a.priority) ?? 0) - (coerceFiniteNumber(b.priority) ?? 0);
        case "milestone_at": {
            const ta = a.milestone_at ? new Date(a.milestone_at as string).getTime() : NaN;
            const tb = b.milestone_at ? new Date(b.milestone_at as string).getTime() : NaN;
            const va = Number.isFinite(ta) ? ta : 0;
            const vb = Number.isFinite(tb) ? tb : 0;
            return va - vb;
        }
        case "progress_pct":
            return (coerceFiniteNumber(a.progress_pct) ?? 0) - (coerceFiniteNumber(b.progress_pct) ?? 0);
        case "latest_viability_score":
            return (coerceFiniteNumber(a.latest_viability_score) ?? 0) - (coerceFiniteNumber(b.latest_viability_score) ?? 0);
        case "latest_decision":
            return normalizeDecisionRaw(a).toLowerCase().localeCompare(normalizeDecisionRaw(b).toLowerCase());
        case "active_alerts_count":
            return activeAlertsCountStrict(a) - activeAlertsCountStrict(b);
        case "team_size":
            return (coerceFiniteNumber(a.team_size) ?? 0) - (coerceFiniteNumber(b.team_size) ?? 0);
        default:
            return 0;
    }
}

function sortProjectsWithKey(
    items: ProjectListItem[],
    sortKey: ProjectsTableSortKey,
    sortDir: "asc" | "desc",
    t: TFunction<"common", undefined>,
): ProjectListItem[] {
    const arr = [...items];
    arr.sort((a, b) => {
        const nullA = sortKeyIsNull(a, sortKey);
        const nullB = sortKeyIsNull(b, sortKey);
        if (nullA && nullB) return 0;
        if (nullA) return 1;
        if (nullB) return -1;
        const cmp = compareProjectsForSort(a, b, sortKey, t);
        return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
}

type ProjectKpiStatCardProps = {
    label: string;
    value: number;
    accent: ProjectKpiAccent;
};

function ProjectKpiStatCard({ label, value, accent }: ProjectKpiStatCardProps) {
    const n = Number(value);
    const display = Number.isFinite(n) ? Math.round(n) : 0;
    return (
        <article className={`rounded-2xl border px-4 py-4 shadow-sm ${PROJECT_KPI_ACCENT[accent]}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{display}</p>
        </article>
    );
}

function SortableTh({
    columnKey,
    currentSortKey,
    sortDir,
    onSort,
    className = "",
    children,
}: {
    columnKey: ProjectsTableSortKey;
    currentSortKey: ProjectsTableSortKey;
    sortDir: "asc" | "desc";
    onSort: (k: ProjectsTableSortKey) => void;
    className?: string;
    children: ReactNode;
}) {
    const active = currentSortKey === columnKey;
    return (
        <th className={`whitespace-nowrap px-4 py-3.5 font-medium ${className}`}>
            <button
                type="button"
                onClick={() => onSort(columnKey)}
                className="inline-flex items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-wide text-tertiary hover:text-fg-primary"
            >
                {children}
                {active ? <span className="text-[10px] font-bold tabular-nums text-fg-secondary">{sortDir === "asc" ? "↑" : "↓"}</span> : null}
            </button>
        </th>
    );
}

export default function ProjectsPage() {
    const { t } = useTranslation("common");
    const [searchParams, setSearchParams] = useSearchParams();
    const [status, setStatus] = useState<"all" | ProjectStatus>("all");
    const [riskLevel, setRiskLevel] = useState<RiskLevel>("all");
    const [search, setSearch] = useState("");
    const [smartTab, setSmartTab] = useState<ProjectsSmartTab>("all");
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ProjectsViewMode>("table");
    const [sortKey, setSortKey] = useState<ProjectsTableSortKey>("milestone_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [showLegacyProjects, setShowLegacyProjects] = useState(false);
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

    const projectsQuery = useProjects({ limit: MANAGER_PROJECTS_LIST_LIMIT });
    const createProject = useCreateProject();
    const listItems = projectsQuery.data?.items ?? [];
    const selectedProject = listItems.find((p) => p.id === selectedProjectId);

    /** `count` du GET /manager/projects (via `normalizeProjectsList` → `total`). */
    const apiCount = projectsQuery.data?.total;

    const projectKpis = useMemo(() => {
        const items = listItems;
        const total = Math.round(coerceFiniteNumber(apiCount) ?? items.length);
        return {
            total,
            active: items.filter((p) => normalizedProjectStatus(p) === "active").length,
            planned: items.filter((p) => normalizedProjectStatus(p) === "planned").length,
            onHold: items.filter((p) => normalizedProjectStatus(p) === "on_hold").length,
            cancelled: items.filter((p) => normalizedProjectStatus(p) === "cancelled").length,
            alertsOpen: items.reduce((sum, p) => sum + activeAlertsCountStrict(p), 0),
        };
    }, [listItems, apiCount]);

    useEffect(() => {
        const openId = searchParams.get("openProjectId")?.trim();
        if (!openId) return;
        if (projectsQuery.isLoading) return;
        setSelectedProjectId(openId);
        const next = new URLSearchParams(searchParams);
        next.delete("openProjectId");
        setSearchParams(next, { replace: true });
    }, [searchParams, projectsQuery.isLoading, setSearchParams]);

    const baseAfterStatusRiskUrl = useMemo(() => {
        const raw = [...listItems];
        const list =
            status === "all" ? raw.filter((p) => normalizedProjectStatus(p) !== "cancelled") : raw.filter((p) => normalizedProjectStatus(p) === status);
        const byRisk = riskLevel === "all" ? list : list.filter((p) => computeRiskLevel(p) === riskLevel);
        if (decisionParam) {
            const wanted = decisionParam
                .split(",")
                .map((d) => d.trim())
                .filter(Boolean)
                .map((d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase());
            return byRisk.filter((project) => {
                const decision = normalizeDecisionRaw(project);
                const dLower = decision.toLowerCase();
                return wanted.some((w) => w.toLowerCase() === dLower);
            });
        }
        if (statusParamLegacy === "stop") {
            return byRisk.filter((project) => {
                const decision = normalizeDecisionRaw(project);
                const dLower = decision.toLowerCase();
                return dLower === "stop" || dLower === "adjust" || dLower === "reject";
            });
        }
        return byRisk;
    }, [listItems, riskLevel, decisionParam, statusParamLegacy, status]);

    const pipelineAfterUrlRisk = useMemo(() => {
        const searchLc = search.trim().toLowerCase();
        if (!searchLc) return baseAfterStatusRiskUrl;
        return baseAfterStatusRiskUrl.filter((p) => projectDisplayName(p.name, t).toLowerCase().includes(searchLc));
    }, [baseAfterStatusRiskUrl, search, t]);

    const miniBarTabCounts = useMemo(() => {
        const items = baseAfterStatusRiskUrl;
        return {
            all: items.length,
            critical: items.filter((p) => matchesProjectsSmartTab(p, "critical")).length,
            adjust: items.filter((p) => matchesProjectsSmartTab(p, "adjust")).length,
            soon: items.filter((p) => matchesProjectsSmartTab(p, "soon")).length,
        };
    }, [baseAfterStatusRiskUrl]);

    const afterSmartTab = useMemo(
        () => pipelineAfterUrlRisk.filter((p) => matchesProjectsSmartTab(p, smartTab)),
        [pipelineAfterUrlRisk, smartTab],
    );

    const visibleProjects = useMemo(
        () => afterSmartTab.filter((p) => !isProjectHiddenByLegacyFilter(p, showLegacyProjects)),
        [afterSmartTab, showLegacyProjects],
    );

    const sortedTableRows = useMemo(
        () => sortProjectsWithKey(visibleProjects, sortKey, sortDir, t),
        [visibleProjects, sortKey, sortDir, t],
    );

    const quickChipsActive = smartTab !== "all";

    const resetMiniBarFilters = useCallback(() => {
        setSmartTab("all");
        setSearch("");
        setStatus("all");
        setRiskLevel("all");
        setSearchParams({});
    }, [setSearchParams]);

    const toggleSort = useCallback((k: ProjectsTableSortKey) => {
        setSortKey((prev) => {
            if (prev === k) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                return prev;
            }
            setSortDir("asc");
            return k;
        });
    }, []);
    const filterBannerVisible = Boolean(decisionParam || statusParamLegacy || quickChipsActive);

    const filterLabelForBanner = useMemo(() => {
        if (decisionParam) {
            return decisionParam
                .split(",")
                .map((d) => d.trim())
                .filter(Boolean)
                .join(" · ");
        }
        if (statusParamLegacy) return statusParamLegacy;
        return "";
    }, [decisionParam, statusParamLegacy]);

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

    const openProjectMissionControl = useCallback((projectId: string) => {
        setSelectedProjectId(projectId);
    }, []);

    const topbarTrailing = useMemo(
        () => (
            <div className="flex w-full max-w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div
                    className="inline-flex shrink-0 items-center gap-2 self-end sm:self-auto"
                    role="group"
                    aria-label={t("managerWorkspace.projects.viewToggleAria")}
                >
                    <button
                        type="button"
                        onClick={() => setViewMode("table")}
                        className={
                            viewMode === "table"
                                ? "h-10 rounded-xl border border-violet-600 bg-violet-600 px-4 text-sm font-medium text-white shadow-sm transition-all duration-200"
                                : "h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
                        }
                    >
                        {t("managerWorkspace.projects.viewTable")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("kanban")}
                        className={
                            viewMode === "kanban"
                                ? "h-10 rounded-xl border border-violet-600 bg-violet-600 px-4 text-sm font-medium text-white shadow-sm transition-all duration-200"
                                : "h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
                        }
                    >
                        {t("managerWorkspace.projects.viewKanban")}
                    </button>
                </div>
                <Button
                    type="button"
                    color={createMode ? "secondary" : "primary"}
                    size="md"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => setCreateMode((v) => !v)}
                >
                    {createMode ? t("managerWorkspace.projects.toggleCreateClose") : t("managerWorkspace.projects.toggleCreateOpen")}
                </Button>
            </div>
        ),
        [createMode, viewMode, t],
    );

    useWorkspaceTopbarMeta(t("managerWorkspace.projects.heroTitle"), t("managerWorkspace.projects.heroSubtitle"), topbarTrailing);

    const emDash = t("managerWorkspace.relative.emDash");

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.projects.heroTitle")}
            description={false}
            omitHeader
        >
            <div className="space-y-6">
                {projectsQuery.isLoading ? (
                    <section className={PROJECT_KPI_GRID_CLASS}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={`kpi-skel-${i}`}
                                className="h-[5.5rem] animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/40"
                            />
                        ))}
                    </section>
                ) : null}

                {!projectsQuery.isLoading && projectsQuery.data ? (
                    <section className={PROJECT_KPI_GRID_CLASS}>
                        <ProjectKpiStatCard label={t("managerWorkspace.projects.kpiTotal")} value={projectKpis.total} accent="slate" />
                        <ProjectKpiStatCard label={t("managerWorkspace.projects.kpiActive")} value={projectKpis.active} accent="emerald" />
                        <ProjectKpiStatCard label={t("managerWorkspace.projects.kpiPlanned")} value={projectKpis.planned} accent="blue" />
                        <ProjectKpiStatCard label={t("managerWorkspace.projects.kpiOnHold")} value={projectKpis.onHold} accent="amber" />
                        <ProjectKpiStatCard label={t("managerWorkspace.projects.kpiCancelled")} value={projectKpis.cancelled} accent="red" />
                        <ProjectKpiStatCard label={t("managerWorkspace.projects.kpiAlertsOpen")} value={projectKpis.alertsOpen} accent="violet" />
                    </section>
                ) : null}

                {projectsQuery.isError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                        {t("managerWorkspace.projects.loadError")}
                    </p>
                ) : null}

                {!projectsQuery.isLoading && projectsQuery.data ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t("managerWorkspace.projects.searchPlaceholder")}
                                aria-label={t("managerWorkspace.projects.searchPlaceholder")}
                                className="min-w-[10rem] max-w-[20rem] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 sm:min-w-[12rem]"
                            />
                            <div
                                className="flex flex-wrap items-center gap-1"
                                role="tablist"
                                aria-label={t("managerWorkspace.projects.miniBarSmartTabsAria")}
                            >
                                {(
                                    [
                                        ["all", t("managerWorkspace.projects.chipAll"), miniBarTabCounts.all],
                                        ["critical", t("managerWorkspace.projects.miniBarTabCritical"), miniBarTabCounts.critical],
                                        ["adjust", t("managerWorkspace.projects.chipDecisionAdjust"), miniBarTabCounts.adjust],
                                        ["soon", t("managerWorkspace.projects.chipSoon"), miniBarTabCounts.soon],
                                    ] as const
                                ).map(([id, label, count]) => {
                                    const active = smartTab === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            onClick={() => setSmartTab(id)}
                                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                                active
                                                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                            }`}
                                        >
                                            <span>{label}</span>
                                            <span
                                                className={`tabular-nums rounded-full px-1.5 py-px text-[10px] font-semibold leading-none ${
                                                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
                                <button
                                    type="button"
                                    aria-expanded={advancedFiltersOpen}
                                    onClick={() => setAdvancedFiltersOpen((o) => !o)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                                >
                                    {t("managerWorkspace.projects.miniBarAdvancedFilters")}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetMiniBarFilters}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                                >
                                    {t("managerWorkspace.projects.resetQuickFilters")}
                                </button>
                            </div>
                        </div>
                        {advancedFiltersOpen ? (
                            <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm">
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as "all" | ProjectStatus)}
                                        className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary"
                                    >
                                        <option value="all">{t("managerWorkspace.projects.statusAll")}</option>
                                        <option value="active">{t("managerWorkspace.projects.statusActive")}</option>
                                        <option value="planned">{t("managerWorkspace.projects.statusPlanned")}</option>
                                        <option value="on_hold">{t("managerWorkspace.projects.statusOnHold")}</option>
                                        <option value="completed">{t("managerWorkspace.projects.statusCompleted")}</option>
                                        <option value="cancelled">{t("managerWorkspace.projects.statusCancelled")}</option>
                                    </select>
                                    <select
                                        value={riskLevel}
                                        onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                                        className="rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-fg-primary"
                                    >
                                        <option value="all">{t("managerWorkspace.projects.riskAll")}</option>
                                        <option value="low">{t("managerWorkspace.projects.riskLow")}</option>
                                        <option value="medium">{t("managerWorkspace.projects.riskMedium")}</option>
                                        <option value="high">{t("managerWorkspace.projects.riskHigh")}</option>
                                    </select>
                                </div>
                                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-secondary">
                                    <input
                                        type="checkbox"
                                        checked={showLegacyProjects}
                                        onChange={(e) => setShowLegacyProjects(e.target.checked)}
                                        className="rounded border-secondary text-brand-solid focus:ring-brand"
                                    />
                                    {t("managerWorkspace.projects.showLegacyProjects")}
                                </label>
                            </section>
                        ) : null}
                    </div>
                ) : null}
                {filterBannerVisible ? (
                    <section className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-500/40 dark:bg-amber-950/40">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-amber-900 dark:text-amber-100">
                                {decisionParam || statusParamLegacy
                                    ? t("managerWorkspace.projects.filterActive", { label: filterLabelForBanner })
                                    : t("managerWorkspace.projects.filterActiveChipsOnly")}{" "}
                                <span className="ml-1 text-xs font-normal">
                                    {t(
                                        visibleProjects.length > 1
                                            ? "managerWorkspace.projects.projectsCount_plural"
                                            : "managerWorkspace.projects.projectsCount",
                                        { count: visibleProjects.length },
                                    )}
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchParams({});
                                    resetMiniBarFilters();
                                }}
                                className="ml-auto rounded border border-amber-300/60 bg-white px-2 py-1 text-xs text-amber-900 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-900/50 dark:text-amber-50 dark:hover:bg-amber-800/60"
                            >
                                {t("managerWorkspace.projects.clearFilter")}
                            </button>
                        </div>
                    </section>
                ) : null}

                {createMode ? (
                    <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm">
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

                {viewMode === "kanban" ? (
                    <ManagerProjectsKanbanView projects={visibleProjects} onOpenProject={openProjectMissionControl} t={t} />
                ) : (
                    <div className="max-h-[min(70vh,calc(100vh-360px))] overflow-auto overflow-x-auto rounded-2xl border border-secondary bg-primary shadow-sm">
                        <table className="min-w-[1040px] w-full border-collapse text-sm">
                            <thead className="sticky top-0 z-10 border-b border-secondary/80 bg-zinc-50/95 text-left shadow-sm backdrop-blur-sm dark:bg-zinc-900/95">
                                <tr>
                                    <SortableTh
                                        columnKey="name"
                                        currentSortKey={sortKey}
                                        sortDir={sortDir}
                                        onSort={toggleSort}
                                        className="max-w-[220px]"
                                    >
                                        {t("managerWorkspace.projects.colProject")}
                                    </SortableTh>
                                    <SortableTh columnKey="status" currentSortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                                        {t("managerWorkspace.projects.colStatus")}
                                    </SortableTh>
                                    <SortableTh columnKey="priority" currentSortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                                        {t("managerWorkspace.projects.colPriority")}
                                    </SortableTh>
                                    <SortableTh columnKey="milestone_at" currentSortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                                        {t("managerWorkspace.projects.colMilestone")}
                                    </SortableTh>
                                    <SortableTh
                                        columnKey="progress_pct"
                                        currentSortKey={sortKey}
                                        sortDir={sortDir}
                                        onSort={toggleSort}
                                        className="min-w-[140px]"
                                    >
                                        {t("managerWorkspace.projects.colProgress")}
                                    </SortableTh>
                                    <SortableTh columnKey="latest_viability_score" currentSortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                                        {t("managerWorkspace.projects.colAiScore")}
                                    </SortableTh>
                                    <SortableTh
                                        columnKey="latest_decision"
                                        currentSortKey={sortKey}
                                        sortDir={sortDir}
                                        onSort={toggleSort}
                                        className="min-w-[120px]"
                                    >
                                        {t("managerWorkspace.projects.colAiDecision")}
                                    </SortableTh>
                                    <SortableTh columnKey="active_alerts_count" currentSortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                                        {t("managerWorkspace.projects.colAlerts")}
                                    </SortableTh>
                                    <SortableTh columnKey="team_size" currentSortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                                        {t("managerWorkspace.projects.colTeam")}
                                    </SortableTh>
                                    <th className="whitespace-nowrap px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                                        {t("managerWorkspace.projects.colAction")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-fg-primary">
                                {sortedTableRows.map((project) => {
                                const rowStatus = normalizedProjectStatus(project);
                                const st = projectStatusBadge(rowStatus);
                                const decisionRaw = normalizeDecisionRaw(project);
                                const decStyle = decisionBadge(decisionRaw || null);
                                const progress = project.progress_pct;
                                const progressNull =
                                    progress == null || String(progress).trim() === "" || Number.isNaN(Number(progress));
                                const progressNum = progressNull ? null : Number(progress);
                                const showVerifyBadge =
                                    !progressNull && progressNum === 0 && rowStatus === "active";
                                const viability = coerceFiniteNumber(project.latest_viability_score);
                                const criticalViability = viability != null && viability < 5;
                                const alertsCount = activeAlertsCountStrict(project);
                                const alertsStyle = alertsCountPresentation(alertsCount);
                                const priorityNum = coerceFiniteNumber(project.priority);
                                const teamNum = coerceFiniteNumber(project.team_size);
                                const progTone =
                                    progressNum != null
                                        ? projectProgressBarTone(Math.round(Math.min(100, Math.max(0, progressNum))))
                                        : null;

                                return (
                                    <tr
                                        key={project.id}
                                        className="border-b border-secondary/60 transition-colors last:border-b-0 hover:bg-zinc-50/90 dark:border-secondary/50 dark:hover:bg-white/[0.04]"
                                    >
                                        <td className="max-w-[220px] px-4 py-3.5 align-middle">
                                            <span className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-primary">
                                                {projectDisplayName(project.name, t)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${st.className}`}
                                            >
                                                {statusLabel(t, rowStatus)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 align-middle tabular-nums text-secondary">
                                            {priorityNum != null ? Math.round(priorityNum) : emDash}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 align-middle text-secondary">
                                            {project.milestone_at
                                                ? new Date(project.milestone_at).toLocaleDateString(localeForDateFormatting(i18n.language))
                                                : emDash}
                                        </td>
                                        <td className="px-4 py-3.5 align-middle">
                                            {progressNull ? (
                                                <span className="text-tertiary">{emDash}</span>
                                            ) : (
                                                <div className="flex min-w-[120px] flex-col gap-1.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div
                                                            className={`h-1 flex-1 overflow-hidden rounded-full ${progTone?.track ?? "bg-secondary_subtle"}`}
                                                            aria-hidden
                                                        >
                                                            <div
                                                                className={`h-full rounded-full ${progTone?.bar ?? "bg-emerald-300/65 dark:bg-emerald-500/30"}`}
                                                                style={{ width: `${Math.min(100, Math.max(0, progressNum!))}%` }}
                                                            />
                                                        </div>
                                                        <span
                                                            className={`w-11 shrink-0 text-right text-[11px] font-medium tabular-nums ${progTone?.text ?? "text-secondary"}`}
                                                        >
                                                            {Math.round(progressNum!)}%
                                                        </span>
                                                    </div>
                                                    {showVerifyBadge ? (
                                                        <span className="w-fit rounded-md border border-amber-200/60 bg-amber-50/50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900/75 dark:border-amber-800/30 dark:bg-amber-950/15 dark:text-amber-200/70">
                                                            {t("managerWorkspace.projects.badgeProgressVerify")}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 align-middle">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {viability == null ? (
                                                    <span className="text-tertiary">{emDash}</span>
                                                ) : (
                                                    <span className={`text-[15px] font-semibold tabular-nums ${viabilityScoreTextClass(viability)}`}>
                                                        {viability.toFixed(1)}
                                                    </span>
                                                )}
                                                {criticalViability ? (
                                                    <span className="rounded-md border border-red-200/60 bg-red-50/60 px-1.5 py-0.5 text-[10px] font-medium text-red-800/90 dark:border-red-800/30 dark:bg-red-950/20 dark:text-red-200/75">
                                                        {t("managerWorkspace.projects.badgeCriticalRisk")}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 align-middle">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${decStyle.className}`}
                                            >
                                                {translateDecision(t, decisionRaw)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`tabular-nums text-[13px] ${alertsCount > 0 ? "font-medium text-secondary" : "text-tertiary"}`}
                                                >
                                                    {alertsCount}
                                                </span>
                                                {alertsCount > 0 ? (
                                                    <span
                                                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${alertsStyle.className}`}
                                                    >
                                                        {t("managerWorkspace.projects.badgeAlertsCount", { count: alertsCount })}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3.5 align-middle tabular-nums text-secondary">
                                            {teamNum != null ? Math.round(teamNum) : 0}
                                        </td>
                                        <td className="px-4 py-3.5 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                className="rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-semibold text-white shadow-sm ring-1 ring-transparent transition hover:bg-brand-solid_hover"
                                                onClick={() => openProjectMissionControl(project.id)}
                                            >
                                                {t("managerWorkspace.projects.viewDetails")}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {viewMode === "table" && !sortedTableRows.length && !projectsQuery.isLoading ? (
                        <p className="border-t border-secondary p-4 text-sm text-tertiary">{t("managerWorkspace.projects.empty")}</p>
                    ) : null}
                </div>
                )}
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
