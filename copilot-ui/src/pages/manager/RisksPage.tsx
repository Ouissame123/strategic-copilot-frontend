import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertDetailDrawer } from "@/components/risks/AlertDetailDrawer";
import { RiskFilterChips } from "@/components/risks/RiskFilterChips";
import { RiskHeatmapInteractive } from "@/components/risks/RiskHeatmapInteractive";
import { RiskKpiSection } from "@/components/risks/RiskKpiCardWithSparkline";
import { RiskPriorityList } from "@/components/risks/RiskPriorityList";
import { RiskProjectGrid } from "@/components/risks/RiskProjectCard";
import { RiskTicketKanban } from "@/components/risks/RiskTicketKanban";
import {
    type DisplayAlert,
    matchesQuickFilter,
    readAvgRiskScore,
    RISK_PAGE_BG,
    severityRank,
    toDisplayFromRiskItem,
    toDisplayFromTop,
    type RiskLeaderboardRow,
    displayAlertToHeatmapInput,
    resolveRiskAlertPatchId,
    type RiskAlertPatchRequest,
    type RiskQuickFilterId,
} from "@/components/risks/risks-shared";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { agentsApi } from "@/api/agents.api";
import { useDashboard } from "@/hooks/useDashboard";
import { invalidateManagerRiskQueries, useManagerRiskData } from "@/hooks/use-manager-risk-data";
import { useRiskAlertAction } from "@/hooks/useNotifications";
import { useProjects } from "@/hooks/useProjects";
import { useWatchdogScan } from "@/hooks/useTeam";
import {
    buildHeatmapNestedBuckets,
    logHeatmapBucketDebug,
} from "@/lib/risk-alert-display";
import { useToast } from "@/providers/toast-provider";
import { cx } from "@/utils/cx";
const CATEGORY_PRESETS = ["skill_gap", "overload", "anxiety", "dependency", "fragility"];

function syntheticSpark(value: number): number[] {
    const v = Number.isFinite(value) ? value : 0;
    return Array.from({ length: 7 }, (_, i) => Math.max(0, v + (i - 3) * 0.15));
}

export default function RisksPage() {
    const { t } = useTranslation(["common", "nav"]);
    const { push } = useToast();
    const qc = useQueryClient();
    const [projectId, setProjectId] = useState("");
    const aggregateView = !projectId.trim();

    const [severityFilter, setSeverityFilter] = useState("Toutes");
    const [categoryFilter, setCategoryFilter] = useState("Toutes");
    const [quickFilters, setQuickFilters] = useState<Set<RiskQuickFilterId>>(new Set());
    const [selectedAlert, setSelectedAlert] = useState<DisplayAlert | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    /** Retrait immédiat après resolve / ignore (avant refetch). */
    const [closedAlertIds, setClosedAlertIds] = useState<Set<string>>(() => new Set());

    const projects = useProjects({ limit: 100 });
    const dashboard = useDashboard("mine", { enabled: aggregateView });
    const riskDetail = useManagerRiskData(projectId.trim() || null);

    const patchAlert = useRiskAlertAction();
    const watchdogScan = useWatchdogScan();
    const analyzeProject = useMutation({
        mutationFn: (pid: string) => agentsApi.projectAnalysis({ project_id: pid }).then((r) => r.data),
    });

    const managerProjectIds = useMemo(() => {
        return new Set((projects.data?.items ?? []).map((p) => p.id).filter(Boolean));
    }, [projects.data?.items]);

    const displayAlerts: DisplayAlert[] = useMemo(() => {
        if (aggregateView) {
            const top = dashboard.data?.widgets.top_alerts ?? [];
            return top.map(toDisplayFromTop);
        }
        return (riskDetail.data?.items ?? []).map(toDisplayFromRiskItem);
    }, [aggregateView, dashboard.data?.widgets.top_alerts, riskDetail.data]);

    const categoriesAvailable = useMemo(() => {
        const set = new Set<string>(CATEGORY_PRESETS);
        displayAlerts.forEach((a) => {
            if (a.category && a.category !== "—") set.add(a.category);
        });
        return ["Toutes", ...Array.from(set)];
    }, [displayAlerts]);

    const filteredAlerts = useMemo(() => {
        return displayAlerts.filter((a) => {
            const patchKey = resolveRiskAlertPatchId(a);
            if (patchKey && closedAlertIds.has(patchKey)) return false;
            const sev = (a.severity ?? "").toLowerCase();
            if (severityFilter !== "Toutes" && sev !== severityFilter.toLowerCase()) return false;
            if (categoryFilter !== "Toutes" && a.category !== categoryFilter) return false;
            for (const f of quickFilters) {
                if (!matchesQuickFilter(a, f, managerProjectIds)) return false;
            }
            return true;
        });
    }, [displayAlerts, closedAlertIds, severityFilter, categoryFilter, quickFilters, managerProjectIds]);

    const priorityQueue = useMemo(() => {
        return [...filteredAlerts].sort((a, b) => {
            const rs = severityRank(b.severity) - severityRank(a.severity);
            if (rs !== 0) return rs;
            return (b.riskScore ?? -1) - (a.riskScore ?? -1);
        });
    }, [filteredAlerts]);

    const heatmapBuckets = useMemo(() => {
        const inputs = filteredAlerts.map(displayAlertToHeatmapInput);
        if (import.meta.env.DEV) logHeatmapBucketDebug(inputs);
        return buildHeatmapNestedBuckets(filteredAlerts);
    }, [filteredAlerts]);

    const leaderboardRows: RiskLeaderboardRow[] = useMemo(() => {
        if (aggregateView) {
            return (dashboard.data?.widgets.fragile_projects ?? []).slice(0, 6).map((p) => ({
                project_id: p.id,
                project_name: p.name,
                risk_score: p.viability_score ?? undefined,
                risk_level: p.decision ?? "—",
                drivers: {} as Record<string, number>,
            }));
        }
        return (riskDetail.data?.projects ?? []).slice(0, 6).map((r) => ({
            ...r,
            risk_level: r.risk_level ?? "medium",
        }));
    }, [aggregateView, dashboard.data?.widgets.fragile_projects, riskDetail.data?.projects]);

    const globalRiskScore = useMemo(() => readAvgRiskScore(riskDetail.data?.summary), [riskDetail.data?.summary]);

    const projectsImpacted = useMemo(() => {
        return new Set(filteredAlerts.map((a) => a.projectId).filter(Boolean)).size;
    }, [filteredAlerts]);

    const kpiSection = useMemo(() => {
        if (aggregateView) {
            const cards = dashboard.data?.kpi_cards;
            const open = cards?.alerts.total_open ?? filteredAlerts.length;
            const crit = cards?.alerts.critical_or_high ?? 0;
            const overloaded = cards?.team.overloaded ?? 0;
            const rh = cards?.pending_rh_actions ?? 0;
            const score = globalRiskScore ?? dashboard.data?.health.avg_viability ?? null;
            return {
                heroScore: score,
                heroSub: t("managerWorkspace.risksPage.hintConsolidated"),
                kpis: [
                    { label: t("managerWorkspace.risksPage.kpiOpenAlerts"), value: open, sub: t("managerWorkspace.risksPage.hintPortfolio"), tone: "neutral" as const, sparkPoints: syntheticSpark(open) },
                    { label: t("managerWorkspace.risksPage.kpiCriticalHigh"), value: crit, sub: t("managerWorkspace.risksPage.hintHighPriority"), tone: "danger" as const, sparkPoints: syntheticSpark(crit), positiveGood: false },
                    { label: t("managerWorkspace.risksPage.kpiOverloadedTalents"), value: overloaded, sub: t("managerWorkspace.risksPage.hintCapacity"), tone: "warning" as const, sparkPoints: syntheticSpark(overloaded), positiveGood: false },
                    { label: t("managerWorkspace.risksPage.kpiPendingRh"), value: rh, sub: t("managerWorkspace.risksPage.hintRhQueue"), tone: "info" as const, sparkPoints: syntheticSpark(rh), positiveGood: false },
                    { label: "Projets impactés", value: projectsImpacted, sub: "Portefeuille filtré", tone: "brand" as const, sparkPoints: syntheticSpark(projectsImpacted) },
                ],
            };
        }
        const summary = riskDetail.data?.summary;
        const score = globalRiskScore;
        const open = summary?.total_alerts ?? filteredAlerts.length;
        return {
            heroScore: score,
            heroSub: t("managerWorkspace.risksPage.hintAvgIndicators"),
            kpis: [
                { label: t("managerWorkspace.risksPage.kpiOpened"), value: open, sub: t("managerWorkspace.risksPage.hintSelectedProject"), tone: "neutral" as const, sparkPoints: syntheticSpark(open) },
                { label: t("managerWorkspace.risksPage.kpiCritical"), value: summary?.critical ?? 0, sub: t("managerWorkspace.risksPage.hintSeverity"), tone: "danger" as const, sparkPoints: syntheticSpark(summary?.critical ?? 0) },
                { label: t("managerWorkspace.risksPage.kpiHigh"), value: summary?.high ?? 0, sub: t("managerWorkspace.risksPage.hintSeverity"), tone: "warning" as const, sparkPoints: syntheticSpark(summary?.high ?? 0) },
                { label: t("managerWorkspace.risksPage.kpiAtRiskProjects"), value: summary?.at_risk_projects ?? 0, sub: t("managerWorkspace.risksPage.hintScope"), tone: "info" as const, sparkPoints: syntheticSpark(summary?.at_risk_projects ?? 0) },
                { label: "Projets impactés", value: projectsImpacted, sub: "Vue projet", tone: "brand" as const, sparkPoints: syntheticSpark(projectsImpacted) },
            ],
        };
    }, [aggregateView, dashboard.data, filteredAlerts.length, globalRiskScore, projectsImpacted, riskDetail.data?.summary, t]);

    const onPatch = ({ alert, action, note }: RiskAlertPatchRequest) => {
        const alertId = resolveRiskAlertPatchId(alert);
        if (import.meta.env.DEV) {
            console.log("PATCH alert", alertId, action);
            console.log("PATCH ALERT", { alertId, action, alert });
        }
        if (!alertId) {
            push("ID alerte introuvable", "error");
            return;
        }
        patchAlert.mutate(
            { id: alertId, body: { action, note } },
            {
                onSuccess: async () => {
                    if (action === "resolve" || action === "ignore") {
                        setClosedAlertIds((prev) => new Set(prev).add(alertId));
                    } else if (action === "reopen") {
                        setClosedAlertIds((prev) => {
                            const next = new Set(prev);
                            next.delete(alertId);
                            return next;
                        });
                    }
                    await invalidateManagerRiskQueries(qc);
                    push(
                        action === "resolve" ? "Alerte résolue" : action === "reopen" ? "Alerte réouverte" : "Alerte ignorée",
                        "success",
                    );
                    setDrawerOpen(false);
                    setSelectedAlert(null);
                },
                onError: (err) => {
                    console.error(action === "resolve" ? "Resolve error" : "Ignore error", err);
                    push(action === "resolve" ? "Erreur lors de la résolution" : "Erreur lors de l'ignorance", "error");
                },
            },
        );
    };

    const onScan = (pid?: string) => {
        watchdogScan.mutate(
            { project_id: pid, use_ai: true },
            {
                onSuccess: async () => {
                    await invalidateManagerRiskQueries(qc);
                    push("Scan Watchdog terminé, données actualisées", "success");
                },
                onError: () => push("Échec du scan Watchdog.", "error"),
            },
        );
    };

    const openDrawer = (a: DisplayAlert) => {
        setSelectedAlert(a);
        setDrawerOpen(true);
    };

    const toggleQuickFilter = (id: RiskQuickFilterId) => {
        setQuickFilters((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const isLoading = aggregateView ? dashboard.isLoading || riskDetail.isLoading : riskDetail.isLoading;
    const isError = aggregateView ? dashboard.isError || riskDetail.isError : riskDetail.isError;

    const risksHeaderBadge = useMemo(
        () => (
            <span className="inline-flex shrink-0 rounded-full border border-violet-400/40 bg-gradient-to-r from-violet-500/15 to-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                AI Powered
            </span>
        ),
        [],
    );

    useWorkspaceTopbarMeta(t("nav:managerNavRisks"), t("managerWorkspace.risksPage.heroSubtitle"), risksHeaderBadge);

    return (
        <WorkspacePageShell role="manager" eyebrow={t("workspaceRoles.manager")} title={t("managerWorkspace.risksPage.shellTitle")} description={false} omitHeader>
            <div className={cx(RISK_PAGE_BG, "-mx-4 -mt-2 px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8")}>
                {isLoading ? <p className="text-sm text-slate-500">{t("managerWorkspace.risksPage.loadData")}</p> : null}
                {isError ? (
                    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                        {t("managerWorkspace.risksPage.loadError")}
                    </div>
                ) : null}

                {!isLoading && !isError ? (
                    <div className="mx-auto max-w-7xl space-y-6 lg:space-y-8">
                        <RiskKpiSection heroScore={kpiSection.heroScore} heroSub={kpiSection.heroSub} kpis={kpiSection.kpis} />

                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <RiskFilterChips active={quickFilters} onToggle={toggleQuickFilter} className="mb-4" />
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                                >
                                    <option value="">Tous les projets</option>
                                    {(projects.data?.items ?? []).map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={severityFilter}
                                    onChange={(e) => setSeverityFilter(e.target.value)}
                                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                                >
                                    <option value="Toutes">Toutes sévérités</option>
                                    <option value="critical">critical</option>
                                    <option value="high">high</option>
                                    <option value="medium">medium</option>
                                    <option value="low">low</option>
                                </select>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                                >
                                    {categoriesAvailable.map((c) => (
                                        <option key={c} value={c}>
                                            {c === "Toutes" ? "Tous types" : c}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={watchdogScan.isPending}
                                    onClick={() => onScan(projectId.trim() || leaderboardRows[0]?.project_id)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-violet-700 disabled:opacity-50"
                                >
                                    <Shield className="size-4" aria-hidden />
                                    {watchdogScan.isPending ? "Scan…" : "Lancer scan Watchdog"}
                                </button>
                            </div>
                        </section>

                        <div className="grid gap-6 lg:grid-cols-12">
                            <div className="space-y-6 lg:col-span-7">
                                <RiskPriorityList items={priorityQueue} onTreat={openDrawer} />
                            </div>
                            <div className="lg:col-span-5">
                                <RiskHeatmapInteractive
                                    buckets={heatmapBuckets}
                                    onCellPick={(cellAlerts) => {
                                        if (cellAlerts[0]) openDrawer(cellAlerts[0]);
                                    }}
                                />
                            </div>
                        </div>

                        <RiskProjectGrid rows={leaderboardRows} scanPending={watchdogScan.isPending} onScan={onScan} />

                        <RiskTicketKanban
                            alerts={filteredAlerts}
                            loading={patchAlert.isPending}
                            analyzePending={analyzeProject.isPending}
                            onOpen={openDrawer}
                            onPatch={onPatch}
                            onAnalyze={(pid) =>
                                analyzeProject.mutate(pid, {
                                    onSuccess: () => push("Analyse IA lancée sur le projet.", "success"),
                                    onError: () => push("Analyse IA indisponible pour ce projet.", "error"),
                                })
                            }
                        />
                    </div>
                ) : null}
            </div>

            <AlertDetailDrawer
                open={drawerOpen}
                alert={selectedAlert}
                onClose={() => setDrawerOpen(false)}
                loading={patchAlert.isPending}
                analyzePending={analyzeProject.isPending}
                onPatch={onPatch}
                onAnalyze={(pid) =>
                    analyzeProject.mutate(pid, {
                        onSuccess: () => push("Analyse IA lancée sur le projet.", "success"),
                        onError: () => push("Analyse IA indisponible pour ce projet.", "error"),
                    })
                }
                onTransfer={() => push("Transfert RH — fonctionnalité à venir.", "info")}
            />
        </WorkspacePageShell>
    );
}
