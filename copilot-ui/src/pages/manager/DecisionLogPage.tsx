import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { isAxiosError } from "axios";
import { AlertCircle } from "lucide-react";
import i18n from "@/i18n";
import { localeForDateFormatting } from "@/lib/ui-locale";
import {
    ConfidenceChart,
    DecisionDistributionBar,
    DecisionEmptyState,
    DecisionFiltersBar,
    DecisionHeatmap,
    DecisionHistoryList,
    DecisionLogHeader,
    DecisionLogKpiRow,
    DecisionSkeleton,
    ImpactedProjectsCard,
    type DecisionLogDensity,
} from "@/components/decision-log";
import { ManagerPageLayout } from "@/components/layout/ManagerPageLayout";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import {
    applyDecisionStatusInManagerLogCache,
    removeDecisionFromManagerLogCache,
    useManagerDecisionLog,
} from "@/hooks/useManagerDecisionLog";
import { useToast } from "@/providers/toast-provider";
import { decisionsApi, type DecisionLogStatus, type DecisionStatusAction } from "@/services/decisions.api";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/providers/auth-provider";
import {
    computePrevWeekDelta,
    computeSparkline,
    computeWatchCount,
    confidencePercent,
    exportToCsv,
    isDecisionVisibleInLog,
    normalizeDecisionKind,
} from "@/utils/decisionLogHelpers";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { buildManagerListSearchParams, readUrlPagination } from "@/lib/manager-url-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination-utils";

const DENSITY_STORAGE_KEY = "decisionLogDensity";

function readDensity(): DecisionLogDensity {
    try {
        const v = localStorage.getItem(DENSITY_STORAGE_KEY);
        return v === "compact" ? "compact" : "comfortable";
    } catch {
        return "comfortable";
    }
}

export default function ManagerDecisionLogPage() {
    const { t } = useTranslation("common");
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, limit } = readUrlPagination(searchParams);
    const { user } = useAuth();
    const enterpriseId = (user?.enterpriseId ?? (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined) ?? "").trim();

    const queryClient = useQueryClient();
    const { push } = useToast();

    const [density, setDensity] = useState<DecisionLogDensity>(readDensity);
    const [deletingDecisionId, setDeletingDecisionId] = useState<string | null>(null);
    const [statusUpdatingDecisionId, setStatusUpdatingDecisionId] = useState<string | null>(null);
    const [filterDecision, setFilterDecision] = useState<string>("all");
    const [filterProject, setFilterProject] = useState<string>("all");
    const [filterPeriod, setFilterPeriod] = useState<"all" | "7d" | "30d" | "90d">("30d");
    const [reasonFilter, setReasonFilter] = useState<string | null>(null);
    const [projectFilterTop, setProjectFilterTop] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const serverProjectId = useMemo(() => {
        if (projectFilterTop) return projectFilterTop;
        return filterProject !== "all" ? filterProject : undefined;
    }, [projectFilterTop, filterProject]);

    const { data, isLoading, isError, isFetching } = useManagerDecisionLog(enterpriseId || undefined, {
        page,
        limit,
        project_id: serverProjectId,
    });
    const { data: projectsData } = useProjects({ limit: 100 });

    useEffect(() => {
        const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 200);
        return () => window.clearTimeout(id);
    }, [searchInput]);

    const decisions = useMemo(() => (data?.decisions ?? []).filter(isDecisionVisibleInLog), [data?.decisions]);
    const kpis = data?.kpis;
    const reasonsTop = data?.reasons_top ?? [];
    const projectsTop = data?.projects_top ?? [];
    const heatmap = data?.heatmap ?? {};
    const projects = projectsData?.items ?? [];

    const periodFiltered = useMemo(() => {
        if (filterPeriod === "all") return decisions;
        const days = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
        const cut = Date.now() - days * 86_400_000;
        return decisions.filter((d) => new Date(d.created_at).getTime() >= cut);
    }, [decisions, filterPeriod]);

    const filteredDecisions = useMemo(() => {
        let list = periodFiltered;
        const projectId = projectFilterTop ?? (filterProject !== "all" ? filterProject : null);
        if (projectId) list = list.filter((d) => d.project_id === projectId);
        if (filterDecision !== "all") {
            list = list.filter((d) => normalizeDecisionKind(d.decision) === filterDecision);
        }
        if (reasonFilter) list = list.filter((d) => d.reason_code === reasonFilter);
        if (debouncedSearch) {
            list = list.filter((d) => {
                const hay = `${d.project_name} ${d.reason_code} ${d.synthesis}`.toLowerCase();
                return hay.includes(debouncedSearch);
            });
        }
        return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [periodFiltered, filterProject, projectFilterTop, filterDecision, reasonFilter, debouncedSearch]);

    const sparkline = useMemo(() => computeSparkline(periodFiltered, 14), [periodFiltered]);
    const confDelta = useMemo(() => computePrevWeekDelta(periodFiltered, "confidence"), [periodFiltered]);
    const watchCount = useMemo(() => computeWatchCount(periodFiltered), [periodFiltered]);

    const confidenceTrend = useMemo(() => {
        const sorted = [...periodFiltered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return sorted.slice(-28).map((d, idx) => ({
            idx: idx + 1,
            label: new Date(d.created_at).toLocaleDateString(localeForDateFormatting(i18n.language), {
                month: "short",
                day: "numeric",
            }),
            conf: confidencePercent(d.confidence),
        }));
    }, [periodFiltered]);

    const filtersActive =
        filterDecision !== "all" ||
        filterProject !== "all" ||
        filterPeriod !== "30d" ||
        reasonFilter != null ||
        projectFilterTop != null ||
        debouncedSearch.length > 0;

    const resetFilters = useCallback(() => {
        setFilterDecision("all");
        setFilterProject("all");
        setFilterPeriod("30d");
        setReasonFilter(null);
        setProjectFilterTop(null);
        setSearchInput("");
        setSearchParams(buildManagerListSearchParams({}, { page: 1, limit }));
    }, [limit, setSearchParams]);

    const updatePagination = useCallback(
        (next: { page?: number; limit?: number }) => {
            const merged = { page: next.page ?? page, limit: next.limit ?? limit };
            setSearchParams(
                buildManagerListSearchParams(
                    { project_id: serverProjectId },
                    merged,
                ),
            );
        },
        [limit, page, serverProjectId, setSearchParams],
    );

    const handleDensityChange = useCallback((d: DecisionLogDensity) => {
        setDensity(d);
        try {
            localStorage.setItem(DENSITY_STORAGE_KEY, d);
        } catch {
            /* ignore */
        }
    }, []);

    const openProjectModal = useCallback(
        (projectId: string | null | undefined) => {
            const pid = projectId?.trim();
            if (!pid) return;
            navigate(managerProjectsOpenModalPath(pid));
        },
        [navigate],
    );

    const onExportCsv = useCallback(() => {
        if (!filteredDecisions.length) return;
        exportToCsv(filteredDecisions, `decisions_${new Date().toISOString().slice(0, 10)}.csv`);
    }, [filteredDecisions]);

    const onRefresh = useCallback(() => {
        if (!enterpriseId) return;
        void queryClient.invalidateQueries({ queryKey: ["manager-decision-log", enterpriseId] });
    }, [enterpriseId, queryClient]);

    const updateDecisionStatus = useCallback(
        async (decisionId: string, action: DecisionStatusAction) => {
            if (!enterpriseId) {
                push("Identifiant entreprise manquant", "error");
                return;
            }

            setStatusUpdatingDecisionId(decisionId);
            try {
                const res = await decisionsApi.markManagerDecisionHandled(enterpriseId, decisionId, action);
                if (res?.success) {
                    const status: DecisionLogStatus =
                        res.status ??
                        (action === "handled" ? "handled" : action === "dismissed" ? "dismissed" : "open");
                    applyDecisionStatusInManagerLogCache(queryClient, enterpriseId, decisionId, status);
                    if (action === "handled") {
                        push("Décision marquée comme traitée", "success");
                    } else if (action === "dismissed") {
                        push("Décision masquée", "success");
                    } else {
                        push("Décision réouverte", "success");
                    }
                } else {
                    push(res?.message ?? "Erreur de mise à jour", "error");
                }
            } catch (err) {
                const msg = isAxiosError(err)
                    ? String((err.response?.data as { message?: string })?.message ?? err.message)
                    : null;
                push(msg || "Erreur de mise à jour", "error");
            } finally {
                setStatusUpdatingDecisionId(null);
            }
        },
        [enterpriseId, push, queryClient],
    );

    const handleDeleteDecision = useCallback(
        async (decisionId: string) => {
            if (!enterpriseId) {
                push("Identifiant entreprise manquant", "error");
                return;
            }
            if (!window.confirm("Supprimer cette décision ?")) return;

            setDeletingDecisionId(decisionId);
            try {
                const res = await decisionsApi.deleteManagerDecision(enterpriseId, decisionId, "soft");
                if (res?.success) {
                    removeDecisionFromManagerLogCache(queryClient, enterpriseId, decisionId);
                    push("Décision supprimée", "success");
                } else {
                    push(res?.message ?? "Erreur lors de la suppression", "error");
                }
            } catch (err) {
                const msg = isAxiosError(err)
                    ? String((err.response?.data as { message?: string })?.message ?? err.message)
                    : null;
                push(msg || "Erreur lors de la suppression", "error");
            } finally {
                setDeletingDecisionId(null);
            }
        },
        [enterpriseId, push, queryClient],
    );

    const handleProjectFilterFromTop = useCallback(
        (projectId: string) => {
            setProjectFilterTop(projectId);
            setFilterProject("all");
            setSearchParams(buildManagerListSearchParams({ project_id: projectId }, { page: 1, limit }));
        },
        [limit, setSearchParams],
    );

    const handleProjectFilterChange = useCallback(
        (value: string) => {
            setFilterProject(value);
            setProjectFilterTop(null);
            const project_id = value !== "all" ? value : undefined;
            setSearchParams(buildManagerListSearchParams({ project_id }, { page: 1, limit }));
        },
        [limit, setSearchParams],
    );

    if (!isLoading && !isError && (kpis?.total ?? 0) === 0) {
        return (
            <WorkspacePageShell
                role="manager"
                eyebrow={t("workspaceRoles.manager")}
                title={t("managerWorkspace.decisionLogPage.shellTitle")}
                description={false}
                omitHeader
            >
                <div className="mx-auto flex min-h-[40vh] max-w-[1280px] flex-col items-center justify-center rounded-2xl border border-dashed border-secondary px-6 py-16 text-center">
                    <AlertCircle className="size-10 text-tertiary" aria-hidden />
                    <p className="mt-4 max-w-md text-sm text-secondary">
                        Les décisions sont générées par le Copilot IA après analyse
                    </p>
                </div>
            </WorkspacePageShell>
        );
    }

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.decisionLogPage.shellTitle")}
            description={false}
            omitHeader
        >
            <ManagerPageLayout
                header={
                    <DecisionLogHeader
                        onExport={onExportCsv}
                        onRefresh={onRefresh}
                        exportDisabled={!filteredDecisions.length}
                        refreshDisabled={isFetching}
                        density={density}
                        onDensityChange={handleDensityChange}
                    />
                }
                kpi={
                    isLoading ? (
                        <DecisionSkeleton variant="kpi" />
                    ) : kpis ? (
                        <DecisionLogKpiRow
                            kpis={kpis}
                            sparkline={sparkline}
                            confidenceDelta={confDelta}
                            watchCount={watchCount}
                        />
                    ) : null
                }
                distribution={!isLoading && kpis ? <DecisionDistributionBar kpis={kpis} /> : null}
                filters={
                    !isLoading && !isError ? (
                        <DecisionFiltersBar
                            search={searchInput}
                            onSearchChange={setSearchInput}
                            filterProject={filterProject}
                            onFilterProjectChange={handleProjectFilterChange}
                            filterDecision={filterDecision}
                            onFilterDecisionChange={setFilterDecision}
                            filterPeriod={filterPeriod}
                            onFilterPeriodChange={setFilterPeriod}
                            reasonFilter={reasonFilter}
                            onReasonFilterChange={setReasonFilter}
                            reasonsTop={reasonsTop}
                            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                            filtersActive={filtersActive}
                            onReset={resetFilters}
                            projectLabel={t("managerWorkspace.decisionLogPage.filterProjectLabel")}
                            projectAllLabel={t("managerWorkspace.decisionLogPage.filterProjectAll")}
                            decisionLabel={t("managerWorkspace.decisionLogPage.filterDecisionLabel")}
                            decisionAllLabel={t("managerWorkspace.decisionLogPage.filterDecisionAll")}
                            periodLabel={t("managerWorkspace.decisionLogPage.filterPeriodLabel")}
                            resetLabel={t("managerWorkspace.decisionLogPage.resetFilters")}
                        />
                    ) : null
                }
                main={
                    <>
                        {isError ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                                {t("managerWorkspace.decisionLogPage.loadError")}
                            </div>
                        ) : null}
                        {isLoading ? (
                            <DecisionSkeleton variant="history" />
                        ) : filteredDecisions.length > 0 ? (
                            <DecisionHistoryList
                                items={filteredDecisions}
                                density={density}
                                title={t("managerWorkspace.decisionLogPage.tableTitle")}
                                onOpenProject={openProjectModal}
                                onUpdateStatus={(id, action) => void updateDecisionStatus(id, action)}
                                statusUpdatingDecisionId={statusUpdatingDecisionId}
                                onDelete={(id) => void handleDeleteDecision(id)}
                                deletingDecisionId={deletingDecisionId}
                                footer={
                                    <PaginationFooter
                                        pagination={data?.pagination}
                                        onPageChange={(p) => updatePagination({ page: p })}
                                        onPageSizeChange={(size) => updatePagination({ limit: size, page: 1 })}
                                        itemLabel="décisions"
                                        loading={isFetching}
                                    />
                                }
                            />
                        ) : (
                            <DecisionEmptyState onReset={resetFilters} />
                        )}
                    </>
                }
                sidebar={
                    isLoading ? (
                        <DecisionSkeleton variant="sidebar" />
                    ) : (
                        <>
                            <ImpactedProjectsCard
                                projects={projectsTop}
                                activeProjectId={projectFilterTop}
                                onSelectProject={handleProjectFilterFromTop}
                                title={t("managerWorkspace.decisionLogPage.analyticsProjects")}
                                emptyLabel={t("managerWorkspace.decisionLogPage.analyticsProjectsEmpty")}
                            />
                            <ConfidenceChart
                                data={confidenceTrend}
                                title={t("managerWorkspace.decisionLogPage.chartTrendTitle")}
                                emptyLabel={t("managerWorkspace.decisionLogPage.chartTrendEmpty")}
                            />
                            <DecisionHeatmap heatmap={heatmap} />
                        </>
                    )
                }
            />
        </WorkspacePageShell>
    );
}
