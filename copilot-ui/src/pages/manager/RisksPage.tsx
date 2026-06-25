import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, ChevronDown, ChevronRight, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { AlertDetailDrawer } from "@/components/risks/AlertDetailDrawer";
import {
    readAvgRiskScore,
    resolveRiskAlertPatchId,
    toDisplayFromProjectRiskItem,
    type DisplayAlert,
    type RiskAlertPatchRequest,
} from "@/components/risks/risks-shared";
import { ProjectsEmptyState } from "@/components/manager/projects/ProjectsEmptyState";
import { RiskAlertCard } from "@/components/manager/risks/RiskAlertCard";
import { RiskAlertDedupDrawer } from "@/components/manager/risks/RiskAlertDedupDrawer";
import { RisksInsightBar } from "@/components/manager/risks/RisksInsightBar";
import { RisksSegmentsBar } from "@/components/manager/risks/RisksSegmentsBar";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { Button } from "@/components/base/buttons/button";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useDashboard } from "@/hooks/useDashboard";
import { useManagerRiskData } from "@/hooks/use-manager-risk-data";
import { useRiskAlertAction } from "@/hooks/useNotifications";
import { useProjects } from "@/hooks/useProjects";
import { useWatchdogScan } from "@/hooks/useTeam";
import {
    alertMatchesSearch,
    alertMatchesSegmentFilter,
    alertMatchesStatusFilter,
    buildManagerRisksCounts,
    dedupeRiskAlerts,
    groupRiskDedupEntriesByBucket,
    RISKS_BUCKET_LABELS,
    RISKS_BUCKET_ORDER,
    sortRiskDedupEntries,
    type RiskAlertDedupEntry,
    type RisksDensity,
    type RisksSegmentFilter,
    type RisksStatusFilter,
} from "@/lib/manager-risks-list-utils";
import { useToast } from "@/providers/toast-provider";
import { buildManagerListSearchParams, readUrlPagination } from "@/lib/manager-url-pagination";
import { WORKSPACE_PREFIX } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";

const DENSITY_STORAGE_KEY = "risks.density";
const SEGMENT_STORAGE_KEY = "risks.segmentFilter";
const STATUS_STORAGE_KEY = "risks.statusFilter";

function readInitialDensity(): RisksDensity {
    if (typeof window === "undefined") return "comfortable";
    return window.localStorage.getItem(DENSITY_STORAGE_KEY) === "compact" ? "compact" : "comfortable";
}

function readInitialSegmentFilter(): RisksSegmentFilter {
    if (typeof window === "undefined") return "all";
    const stored = window.localStorage.getItem(SEGMENT_STORAGE_KEY);
    if (stored === "all" || stored === "critical" || stored === "high" || stored === "today") return stored;
    return "all";
}

function readInitialStatusFilter(): RisksStatusFilter {
    if (typeof window === "undefined") return "open";
    const stored = window.localStorage.getItem(STATUS_STORAGE_KEY);
    if (stored === "open" || stored === "acknowledged" || stored === "resolved" || stored === "all") return stored;
    return "open";
}

export default function RisksPage() {
    const { t } = useTranslation(["common", "nav"]);
    const { push } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, limit } = readUrlPagination(searchParams);
    const urlSeverity = searchParams.get("severity") ?? undefined;
    const urlSearch = searchParams.get("search") ?? "";

    const [projectFilter, setProjectFilter] = useState(searchParams.get("project_id") ?? "");
    const [segmentFilter, setSegmentFilter] = useState<RisksSegmentFilter>(() => readInitialSegmentFilter());
    const [statusFilter, setStatusFilter] = useState<RisksStatusFilter>(() => readInitialStatusFilter());
    const [searchQuery, setSearchQuery] = useState(urlSearch);
    const [density, setDensity] = useState<RisksDensity>(() => readInitialDensity());
    const [collapsedBuckets, setCollapsedBuckets] = useState<Set<string>>(new Set());
    const [selectedAlert, setSelectedAlert] = useState<DisplayAlert | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [dedupDrawerEntry, setDedupDrawerEntry] = useState<RiskAlertDedupEntry | null>(null);
    const [closedAlertIds, setClosedAlertIds] = useState<Set<string>>(() => new Set());

    const projects = useProjects({ limit: 100 });
    const dashboard = useDashboard("mine");
    const riskDetail = useManagerRiskData({
        page,
        limit,
        severity: urlSeverity || (segmentFilter === "critical" || segmentFilter === "high" ? segmentFilter : undefined),
        status: statusFilter === "all" ? "all" : statusFilter === "resolved" ? "resolved" : "open",
        project_id: projectFilter.trim() || undefined,
        search: searchQuery.trim() || undefined,
        scope: "mine",
    });
    const patchAlert = useRiskAlertAction();
    const watchdogScan = useWatchdogScan();

    const displayAlerts = useMemo(
        () => (riskDetail.data?.items ?? []).map(toDisplayFromProjectRiskItem),
        [riskDetail.data?.items],
    );

    const counts = useMemo(() => {
        const summary = riskDetail.data?.summary;
        if (summary) {
            return buildManagerRisksCounts(dashboard.data, summary);
        }
        return buildManagerRisksCounts(dashboard.data, undefined);
    }, [dashboard.data, riskDetail.data?.summary]);

    const riskGlobalScore = useMemo(() => {
        const fromSummary = readAvgRiskScore(riskDetail.data?.summary);
        if (fromSummary != null) return fromSummary;
        const raw = dashboard.data?.health?.avg_viability;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    }, [riskDetail.data?.summary, dashboard.data?.health?.avg_viability]);

    useEffect(() => {
        window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
    }, [density]);

    useEffect(() => {
        window.localStorage.setItem(SEGMENT_STORAGE_KEY, segmentFilter);
    }, [segmentFilter]);

    useEffect(() => {
        window.localStorage.setItem(STATUS_STORAGE_KEY, statusFilter);
    }, [statusFilter]);

    useCopilotPage();

    const updateListParams = useCallback(
        (next: Partial<{ page: number; limit: number; severity?: string; status?: string; search?: string; project_id?: string }>) => {
            const merged = {
                page: next.page ?? page,
                limit: next.limit ?? limit,
                severity: next.severity !== undefined ? next.severity : urlSeverity,
                status: next.status !== undefined ? next.status : statusFilter !== "open" ? statusFilter : undefined,
                search: next.search !== undefined ? next.search : searchQuery.trim() || undefined,
                project_id: next.project_id !== undefined ? next.project_id : projectFilter.trim() || undefined,
            };
            const resetPage =
                next.severity !== undefined ||
                next.status !== undefined ||
                next.search !== undefined ||
                next.project_id !== undefined ||
                next.limit !== undefined;
            setSearchParams(
                buildManagerListSearchParams(
                    {
                        severity: merged.severity,
                        status: merged.status && merged.status !== "open" ? merged.status : undefined,
                        search: merged.search,
                        project_id: merged.project_id,
                    },
                    { page: resetPage && next.page === undefined ? 1 : merged.page, limit: merged.limit },
                ),
            );
        },
        [limit, page, projectFilter, searchQuery, setSearchParams, statusFilter, urlSeverity],
    );

    const filteredAlerts = useMemo(() => {
        return displayAlerts.filter((alert) => {
            const patchKey = resolveRiskAlertPatchId(alert);
            if (patchKey && closedAlertIds.has(patchKey)) return false;
            return (
                alertMatchesSegmentFilter(alert, segmentFilter) &&
                alertMatchesStatusFilter(alert, statusFilter) &&
                alertMatchesSearch(alert, searchQuery)
            );
        });
    }, [displayAlerts, closedAlertIds, segmentFilter, statusFilter, searchQuery]);

    const dedupedSorted = useMemo(() => {
        const deduped = dedupeRiskAlerts(filteredAlerts);
        return sortRiskDedupEntries(deduped);
    }, [filteredAlerts]);

    const groupedEntries = useMemo(() => groupRiskDedupEntriesByBucket(dedupedSorted), [dedupedSorted]);

    const onPatch = useCallback(
        ({ alert, action, note }: RiskAlertPatchRequest) => {
            const alertId = resolveRiskAlertPatchId(alert);
            if (!alertId) {
                push("ID alerte introuvable", "error");
                return;
            }
            patchAlert.mutate(
                { id: alertId, body: { action, note }, projectId: alert.projectId },
                {
                    onSuccess: () => {
                        if (action === "resolve" || action === "ignore") {
                            setClosedAlertIds((prev) => new Set(prev).add(alertId));
                        }
                        setDrawerOpen(false);
                        setSelectedAlert(null);
                    },
                    onError: () => {
                        push(action === "resolve" ? "Erreur lors de la résolution" : "Erreur lors de l'ignorance", "error");
                    },
                },
            );
        },
        [patchAlert, push],
    );

    const openDrawer = useCallback((alert: DisplayAlert) => {
        setSelectedAlert(alert);
        setDrawerOpen(true);
    }, []);

    const runScan = useCallback(() => {
        const pid = projectFilter.trim() || undefined;
        watchdogScan.mutate({ project_id: pid, use_ai: true });
    }, [projectFilter, watchdogScan]);

    const toggleBucket = (bucket: string) => {
        setCollapsedBuckets((prev) => {
            const next = new Set(prev);
            if (next.has(bucket)) next.delete(bucket);
            else next.add(bucket);
            return next;
        });
    };

    const isLoading = dashboard.isLoading || riskDetail.isLoading;
    const isError = dashboard.isError || riskDetail.isError;
    const showEmptyCritical = !isLoading && dedupedSorted.length === 0 && segmentFilter === "critical";
    const showEmptySearch = !isLoading && dedupedSorted.length === 0 && Boolean(searchQuery.trim());

    return (
        <WorkspacePageShell role="manager" eyebrow="" title="" omitHeader>
            <div className="mx-auto max-w-5xl space-y-3 px-4 py-4 sm:px-6 lg:px-8">
                <header className="space-y-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {riskGlobalScore != null ? (
                            <p className="mr-auto text-xs text-slate-500 dark:text-slate-400">
                                Score risque enterprise : {riskGlobalScore.toFixed(2)}/10
                            </p>
                        ) : null}
                        <Button
                            type="button"
                            color="tertiary"
                            size="sm"
                            onClick={runScan}
                            isDisabled={watchdogScan.isPending}
                            isLoading={watchdogScan.isPending}
                            iconLeading={watchdogScan.isPending ? undefined : Shield}
                        >
                            {watchdogScan.isPending ? "Analyse…" : "Lancer Watchdog"}
                        </Button>
                    </div>

                    <RisksInsightBar counts={counts} onFilterClick={setSegmentFilter} />

                    <RisksSegmentsBar
                        segmentFilter={segmentFilter}
                        onSegmentChange={(seg) => {
                            setSegmentFilter(seg);
                            updateListParams({
                                severity: seg === "critical" || seg === "high" ? seg : "",
                                page: 1,
                            });
                        }}
                        statusFilter={statusFilter}
                        onStatusChange={(st) => {
                            setStatusFilter(st);
                            updateListParams({ status: st, page: 1 });
                        }}
                        counts={counts}
                        searchQuery={searchQuery}
                        onSearchChange={(q) => {
                            setSearchQuery(q);
                            updateListParams({ search: q.trim(), page: 1 });
                        }}
                        projectFilter={projectFilter}
                        onProjectChange={(pid) => {
                            setProjectFilter(pid);
                            updateListParams({ project_id: pid.trim(), page: 1 });
                        }}
                        projects={projects.data?.items ?? []}
                    />
                </header>

                {isLoading && !riskDetail.data ? (
                    <p className="py-6 text-center text-sm text-slate-500">{t("managerWorkspace.risksPage.loadData")}</p>
                ) : null}

                {isError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                        {t("managerWorkspace.risksPage.loadError")}{" "}
                        <button type="button" onClick={() => void riskDetail.refetch()} className="underline">
                            Réessayer
                        </button>
                    </div>
                ) : null}

                {showEmptyCritical ? (
                    <ProjectsEmptyState
                        icon={CheckCircle}
                        title="Aucune alerte critique active"
                        description="Le Watchdog continue de surveiller en arrière-plan."
                    />
                ) : null}

                {showEmptySearch ? (
                    <ProjectsEmptyState
                        title={`Aucune alerte ne correspond à « ${searchQuery.trim()} »`}
                        actionLabel="Réinitialiser"
                        onAction={() => setSearchQuery("")}
                    />
                ) : null}

                {!isLoading && !showEmptyCritical && !showEmptySearch && dedupedSorted.length > 0 ? (
                    <div className={cx(density === "compact" ? "space-y-4" : "space-y-5")}>
                        {RISKS_BUCKET_ORDER.map((bucket) => {
                            const list = groupedEntries[bucket];
                            if (list.length === 0) return null;
                            const collapsed = collapsedBuckets.has(bucket);
                            return (
                                <section key={bucket}>
                                    <button
                                        type="button"
                                        onClick={() => toggleBucket(bucket)}
                                        className="mb-2 flex w-full items-center gap-1.5 text-left text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    >
                                        {collapsed ? (
                                            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
                                        ) : (
                                            <ChevronDown className="size-3.5 shrink-0" aria-hidden />
                                        )}
                                        {RISKS_BUCKET_LABELS[bucket]}
                                        <span className="text-slate-400 tabular-nums">({list.length})</span>
                                    </button>
                                    {!collapsed ? (
                                        <div className={cx(density === "compact" ? "space-y-1" : "space-y-1.5")}>
                                            {list.map((entry) => (
                                                <RiskAlertCard
                                                    key={entry.ids.join("-")}
                                                    entry={entry}
                                                    density={density}
                                                    patchPending={patchAlert.isPending}
                                                    onOpenDrawer={openDrawer}
                                                    onPatch={onPatch}
                                                    onShowDuplicates={entry.count > 1 ? setDedupDrawerEntry : undefined}
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </section>
                            );
                        })}
                    </div>
                ) : null}

                {!isLoading && dedupedSorted.length === 0 && !showEmptyCritical && !showEmptySearch ? (
                    <ProjectsEmptyState
                        title="Aucune alerte pour ce filtre"
                        description="Élargis la période ou change le statut."
                        actionLabel="Voir toutes les alertes"
                        onAction={() => {
                            setSegmentFilter("all");
                            setStatusFilter("all");
                        }}
                    />
                ) : null}

                {!isLoading && dedupedSorted.length > 0 ? (
                    <PaginationFooter
                        pagination={riskDetail.pagination}
                        onPageChange={(p) => updateListParams({ page: p })}
                        onPageSizeChange={(size) => updateListParams({ limit: size, page: 1 })}
                        itemLabel="alertes"
                        loading={riskDetail.isFetching}
                    />
                ) : null}

                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    <Link to={`${WORKSPACE_PREFIX.manager}/projects`} className="text-violet-600 hover:underline dark:text-violet-400">
                        Voir le top des projets à risque →
                    </Link>
                </p>
            </div>

            <RiskAlertDedupDrawer
                entry={dedupDrawerEntry}
                onClose={() => setDedupDrawerEntry(null)}
                onOpenAlert={(alert) => {
                    setDedupDrawerEntry(null);
                    openDrawer(alert);
                }}
            />

            <AlertDetailDrawer
                open={drawerOpen}
                alert={selectedAlert}
                onClose={() => setDrawerOpen(false)}
                loading={patchAlert.isPending}
                analyzePending={false}
                onPatch={onPatch}
                onAnalyze={() => push("Analyse IA — ouvrir le projet depuis le menu.", "info")}
                onTransfer={() => push("Transfert RH — fonctionnalité à venir.", "info")}
            />
        </WorkspacePageShell>
    );
}
