import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toUserMessage } from "@/hooks/crud/error-message";
import { useCreateProject, useDeleteProject, useUpdateProject } from "@/hooks/crud/projects";
import type { ProjectWithViability } from "@/hooks/use-projects-list-query";
import { useProjectsListQuery } from "@/hooks/use-projects-list-query";
import type { ProjectFormValues } from "@/pages/projects/projects-page-modals";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/providers/toast-provider";
import type { AnalysisRefreshPayload, Project } from "@/types/crud-domain";
import type { ProjectsDecisionFilter, ProjectsKpi, ProjectsTabId } from "@/pages/projects/projects-page-header";
import {
    countDecisionStopProjects,
    getProjectField,
    normalizeProjectStatus,
} from "@/pages/projects/projects-utils";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function formatRelativeFr(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const diffM = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffM < 1) return "à l’instant";
    if (diffM < 60) return `il y a ${diffM} min`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 14) return `il y a ${diffD}j`;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function toNumberOrNull(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v.replace(",", "."));
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

export function useProjectsPage() {
    const { t } = useTranslation(["projects", "portfolio", "dataCrud", "common", "copilot"]);
    const queryClient = useQueryClient();
    const { push } = useToast();

    const [tab, setTab] = useState<ProjectsTabId>("all");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [decisionFilter, setDecisionFilter] = useState<ProjectsDecisionFilter>("all");

    const { data, isPending, error, refetch, isFetching } = useProjectsListQuery(page, perPage);

    useEffect(() => {
        setPage(1);
    }, [perPage]);

    const projects = data?.projects ?? [];
    const pagination = data?.pagination ?? {
        page,
        per_page: perPage,
        total_items: 0,
        total_pages: 1,
    };

    const totalPages = Math.max(1, pagination.total_pages);
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const { create, loading: creating } = useCreateProject();
    const { update, loading: updating } = useUpdateProject();
    const { remove, loading: deleting } = useDeleteProject();
    const drawerInsightsRef = useRef<HTMLDivElement>(null);
    const scrollInsightsAfterDrawerOpen = useRef(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Project | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
    const [drawerProject, setDrawerProject] = useState<Project | null>(null);
    const [analysisRefresh, setAnalysisRefresh] = useState<AnalysisRefreshPayload | null>(null);

    const invalidateProjectsList = () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.talent.workspace() });
    };

    const defaultStatusOptions = useMemo(
        () => [
            { id: "planned", label: t("projects:filters.planned") },
            { id: "active", label: t("projects:filters.active") },
            { id: "paused", label: t("projects:filters.paused") },
            { id: "completed", label: t("projects:filters.completed") },
            { id: "at-risk", label: t("projects:filters.at-risk") },
            { id: "cancelled", label: t("projects:filters.cancelled") },
        ],
        [t],
    );

    const filteredProjects = useMemo(() => {
        let out = tab === "all"
            ? projects
            : projects.filter((project) => normalizeProjectStatus(String(project.status ?? "")) === tab);

        const q = searchQuery.trim().toLowerCase();
        if (q) {
            out = out.filter((p) => {
                const hay = [p.name, p.description, p.ownerLabel]
                    .map((v) => (v != null ? String(v).toLowerCase() : ""))
                    .join(" ");
                return hay.includes(q);
            });
        }

        if (decisionFilter !== "all") {
            out = out.filter((p) => {
                const dec = String(p.decision ?? "").trim().toLowerCase();
                if (decisionFilter === "adjust") return dec === "adjust";
                if (decisionFilter === "stop") return dec === "stop";
                if (decisionFilter === "risky") {
                    const risk = String(p.riskLabel ?? "").trim().toLowerCase();
                    return dec === "adjust" || dec === "stop" || risk === "high" || risk === "medium";
                }
                return true;
            });
        }

        return out;
    }, [tab, projects, searchQuery, decisionFilter]);

    const stopDecisionCount = useMemo(() => countDecisionStopProjects(projects), [projects]);

    const countByStatus = (status: string) =>
        projects.filter((p) => normalizeProjectStatus(String(p.status ?? "")) === status).length;

    const countDecision = (dec: string) =>
        projects.filter((p) => String(p.decision ?? "").trim().toLowerCase() === dec).length;

    const lastAnalysisIso = useMemo(() => {
        let latest: number | null = null;
        for (const p of projects) {
            const raw = getProjectField(p, ["last_analysis_at", "computed_at", "updated_at", "lastModified"]);
            if (raw == null) continue;
            const t = new Date(String(raw)).getTime();
            if (Number.isFinite(t)) latest = latest == null || t > latest ? t : latest;
        }
        return latest != null ? new Date(latest).toISOString() : null;
    }, [projects]);

    const avgProgress = useMemo(() => {
        const values: number[] = [];
        for (const p of projects) {
            const raw = getProjectField(p, ["progress", "progress_pct", "completion", "completion_pct", "advancement"]);
            const n = toNumberOrNull(raw);
            if (n == null) continue;
            values.push(n > 1 ? n : n * 100);
        }
        if (values.length === 0) return null;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }, [projects]);

    const heroSubtitle = useMemo(() => {
        const total = pagination.total_items || projects.length;
        const active = countByStatus("active");
        const parts: string[] = [];
        if (total > 0) parts.push(`${total} projet${total > 1 ? "s" : ""} suivi${total > 1 ? "s" : ""}`);
        parts.push(`${active} actif${active > 1 ? "s" : ""}`);
        if (lastAnalysisIso) parts.push(`dernière analyse ${formatRelativeFr(lastAnalysisIso)}`);
        return parts.join(" · ");
    }, [pagination.total_items, projects.length, lastAnalysisIso]);

    const kpis = useMemo<ProjectsKpi[]>(() => {
        const total = pagination.total_items || projects.length;
        const active = countByStatus("active");
        const atAttention =
            countByStatus("at-risk") +
            countDecision("adjust") +
            countDecision("stop");
        const stop = countDecisionStopProjects(projects);
        const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
        const attentionPct = total > 0 ? Math.min(100, (atAttention / total) * 100) : 0;
        const stopPct = total > 0 ? Math.min(100, (stop / total) * 100) : 0;
        const avgProgressPct = avgProgress != null ? Math.max(0, Math.min(100, avgProgress)) : 0;

        return [
            {
                id: "tracked",
                label: "Projets suivis",
                value: total,
                hint: "Portefeuille complet",
                progressPct: total > 0 ? 100 : 0,
                barClass: "bg-brand-secondary",
            },
            {
                id: "active",
                label: "Projets actifs",
                value: active,
                hint: total > 0 ? `${activePct}% du total` : "—",
                progressPct: activePct,
                barClass: "bg-emerald-500",
            },
            {
                id: "attention",
                label: "Projets à attention",
                value: atAttention,
                hint: atAttention === 0 ? "Aucun" : "À surveiller",
                progressPct: atAttention === 0 ? 100 : attentionPct,
                barClass: atAttention === 0 ? "bg-emerald-500" : "bg-amber-500",
            },
            {
                id: "stop",
                label: "Décisions Stop",
                value: stop,
                hint: stop === 0 ? "Aucune" : "Projets en arrêt",
                progressPct: stop === 0 ? 100 : stopPct,
                barClass: stop === 0 ? "bg-emerald-500" : "bg-red-500",
            },
            {
                id: "progress",
                label: "Avancement moyen",
                value: avgProgress != null ? `${avgProgress.toFixed(1)}%` : "—",
                hint: avgProgress == null
                    ? "—"
                    : avgProgress >= 70
                      ? "Bonne progression"
                      : avgProgress >= 40
                        ? "Progression correcte"
                        : "À accélérer",
                progressPct: avgProgressPct,
                barClass:
                    avgProgress == null
                        ? "bg-utility-gray-300"
                        : avgProgress >= 70
                          ? "bg-emerald-500"
                          : avgProgress >= 40
                            ? "bg-amber-500"
                            : "bg-red-500",
            },
        ];
    }, [projects, pagination.total_items, avgProgress]);

    const openCreate = () => {
        setEditing(null);
        setAnalysisRefresh(null);
        setFormOpen(true);
    };

    const openEdit = (project: Project) => {
        setEditing(project);
        setAnalysisRefresh(null);
        setFormOpen(true);
    };

    const openDrawer = (project: Project) => {
        scrollInsightsAfterDrawerOpen.current = false;
        setDrawerProject(project);
    };

    useEffect(() => {
        if (!drawerProject || !scrollInsightsAfterDrawerOpen.current) return;
        scrollInsightsAfterDrawerOpen.current = false;
        const id = window.setTimeout(() => drawerInsightsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        return () => window.clearTimeout(id);
    }, [drawerProject]);

    const openAnalyzeFromDrawer = () => {
        if (!drawerProject) return;
        const p = drawerProject;
        setDrawerProject(null);
        openEdit(p);
    };

    const scrollToInsights = () => {
        drawerInsightsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const openDrawerAndScrollInsights = (project: ProjectWithViability) => {
        scrollInsightsAfterDrawerOpen.current = true;
        setDrawerProject(project);
    };

    const submitProject = async (values: ProjectFormValues) => {
        try {
            const statusNorm = normalizeProjectStatus(values.status.trim()) || null;
            if (editing) {
                const res = await update(editing.id, {
                    name: values.name.trim(),
                    description: values.description.trim() || null,
                    status: statusNorm,
                });
                setAnalysisRefresh(res.analysisRefresh ?? null);
                push(res.message ?? t("dataCrud:save"), "success");
            } else {
                const res = await create({
                    name: values.name.trim(),
                    description: values.description.trim() || null,
                    status: statusNorm,
                });
                setAnalysisRefresh(res.analysisRefresh ?? null);
                push(res.message ?? t("dataCrud:createdSuccess"), "success");
            }
            await invalidateProjectsList();
            if (editing) {
                void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(editing.id) });
            }
            setFormOpen(false);
        } catch (e) {
            push(toUserMessage(e), "error");
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        try {
            const res = await remove(pendingDelete.id);
            push(res.message ?? t("dataCrud:deletedSuccess"), "success");
            setAnalysisRefresh(res.analysisRefresh ?? null);
            setPendingDelete(null);
            setDrawerProject((d) => (d?.id === pendingDelete.id ? null : d));
            await invalidateProjectsList();
            void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(pendingDelete.id) });
        } catch (e) {
            push(toUserMessage(e), "error");
        }
    };

    const tabs: { id: ProjectsTabId; label: string; count: number }[] = [
        { id: "all", label: t("projects:tabs.all"), count: projects.length },
        { id: "active", label: t("projects:tabs.active"), count: countByStatus("active") },
        { id: "at-risk", label: t("projects:tabs.atRisk"), count: countByStatus("at-risk") },
        { id: "completed", label: "Terminés", count: countByStatus("completed") },
        { id: "paused", label: "En pause", count: countByStatus("paused") },
    ];

    const loadError = error != null ? (error instanceof Error ? error.message : String(error)) : null;

    return {
        tab,
        setTab,
        setPage,
        perPage,
        setPerPage,
        pageSizeOptions: PAGE_SIZE_OPTIONS,
        projects,
        pagination,
        searchQuery,
        setSearchQuery,
        decisionFilter,
        setDecisionFilter,
        heroSubtitle,
        kpis,
        creating,
        updating,
        deleting,
        drawerInsightsRef,
        formOpen,
        setFormOpen,
        editing,
        pendingDelete,
        setPendingDelete,
        drawerProject,
        setDrawerProject,
        analysisRefresh,
        defaultStatusOptions,
        filteredProjects,
        emptyDueToFilter: projects.length > 0 && filteredProjects.length === 0,
        stopDecisionCount,
        openCreate,
        openEdit,
        openDrawer,
        openAnalyzeFromDrawer,
        scrollToInsights,
        openDrawerAndScrollInsights,
        submitProject,
        confirmDelete,
        tabs,
        loadError,
        isPending,
        refetch,
        isFetching,
    };
}
