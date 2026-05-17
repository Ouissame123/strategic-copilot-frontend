import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { agentsApi } from "@/api/agents.api";
import { useDashboard } from "@/hooks/useDashboard";
import { invalidateManagerRiskQueries, useManagerRiskData } from "@/hooks/use-manager-risk-data";
import { useRiskAlertAction } from "@/hooks/useNotifications";
import { useProjects } from "@/hooks/useProjects";
import { useWatchdogScan } from "@/hooks/useTeam";
import { useToast } from "@/providers/toast-provider";
import type { AlertItem, TopAlert } from "@/types/api.types";
import { cx } from "@/utils/cx";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";

const DRIVER_LABELS: Record<string, string> = {
    fragility_score: "Fragilité",
    anxiety_pulse: "Anxiété",
    chronic_overload_score: "Surcharge",
    chronic_overload: "Surcharge",
    critical_skills_gap_score: "Skill gap",
    key_talent_dependency_score: "Dépendance talent",
    skills_fit: "Adéquation compétences",
};

const CATEGORY_PRESETS = ["skill_gap", "overload", "anxiety", "dependency", "fragility"];

function timeAgo(iso: string | null | undefined): string {
    if (!iso) return "à l'instant";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "à l'instant";
    const diffMs = Date.now() - d.getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
}

function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

function scoreColorClass(score: number | null | undefined): string {
    if (score == null || !Number.isFinite(score)) return "text-tertiary";
    if (score >= 7) return "text-red-600";
    if (score >= 5) return "text-amber-600";
    return "text-emerald-600";
}

function severityBadgeClass(sev: string | undefined): string {
    const v = (sev ?? "").toLowerCase();
    if (v === "critical") return "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200";
    if (v === "high") return "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100";
    if (v === "medium") return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100";
    return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100";
}

function readAvgRiskScore(summary: { avg_risk_score?: number | null } | null | undefined): number | null {
    const raw = summary?.avg_risk_score;
    if (raw == null || !Number.isFinite(Number(raw))) return null;
    return clamp(Number(raw), 0, 10);
}

function severityRank(sev: string | undefined): number {
    const v = (sev ?? "").toLowerCase();
    if (v === "critical") return 4;
    if (v === "high") return 3;
    if (v === "medium") return 2;
    if (v === "low") return 1;
    return 0;
}

function heatmapCell(alert: DisplayAlert): { impact: 0 | 1 | 2; urgency: 0 | 1 | 2 } {
    const s = (alert.severity ?? "").toLowerCase();
    if (s === "critical" || s === "high") return { impact: 2, urgency: 2 };
    if (s === "medium") return { impact: 1, urgency: 1 };
    return { impact: 0, urgency: 0 };
}

function recommendedAction(alert: DisplayAlert): string {
    const sev = (alert.severity ?? "").toLowerCase();
    const cat = (alert.category ?? "").toLowerCase();
    if (sev === "critical" || sev === "high") return "Traiter en priorité et sécuriser les ressources clés.";
    if (cat.includes("overload") || cat.includes("surcharge")) return "Rééquilibrer la charge et arbitrer les affectations.";
    if (cat.includes("skill") || cat.includes("gap")) return "Valider le plan compétences / renfort ciblé.";
    return "Suivre et planifier une revue courte avec l'équipe.";
}

function shortReason(alert: DisplayAlert): string {
    const msg = alert.message.replace(/\s+/g, " ").trim();
    if (msg.length <= 120) return msg;
    return `${msg.slice(0, 117)}…`;
}

function ticketStatusPresentation(status: string | undefined): { label: string; className: string } {
    const s = (status ?? "").toLowerCase().trim();
    if (!s || s === "open" || s === "new") return { label: "Open", className: "border-secondary bg-secondary_subtle text-secondary" };
    if (s.includes("invest") || s === "in_progress" || s === "acknowledged")
        return { label: "Investigating", className: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40" };
    if (s.includes("resolv") || s === "closed" || s === "dismissed")
        return { label: "Resolved", className: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40" };
    return { label: status ?? "Open", className: "border-secondary bg-secondary_subtle text-secondary" };
}

type DisplayAlert = {
    patchId: string;
    severity: string;
    projectName: string;
    projectId?: string;
    category: string;
    message: string;
    riskScore?: number;
    detectedAt?: string;
    sourceAgent?: string;
    status?: string;
};

function toDisplayFromTop(a: TopAlert): DisplayAlert {
    return {
        patchId: a.id,
        severity: a.severity ?? "medium",
        projectName: a.project_name ?? "Projet",
        projectId: a.project_id,
        category: a.risk_type ?? "—",
        message: (a.message ?? a.title ?? "Alerte").trim() || "—",
        riskScore: typeof a.risk_score === "number" ? a.risk_score : undefined,
        detectedAt: a.created_at,
        sourceAgent: undefined,
        status: a.status,
    };
}

function toDisplayFromRiskItem(a: AlertItem): DisplayAlert {
    const patchId = String(a.alert_id ?? a.id ?? "").trim();
    return {
        patchId,
        severity: a.severity ?? "medium",
        projectName: a.project_name ?? "Projet",
        projectId: a.project_id,
        category: a.category ?? a.risk_type ?? "—",
        message: (a.message ?? a.title ?? "").trim() || "—",
        riskScore: typeof a.risk_score === "number" ? a.risk_score : undefined,
        detectedAt: a.detected_at,
        sourceAgent: a.source_agent,
        status: a.status,
    };
}

function priorityQueueIntro(items: DisplayAlert[]): string {
    if (!items.length) return "Aucune alerte à prioriser avec les filtres actuels.";
    const first = items[0];
    const cat = (first.category ?? "").toLowerCase();
    let reason = "le niveau d’alerte et l’exposition projet demandent une réponse rapide.";
    if (cat.includes("overload") || cat.includes("surcharge")) reason = "le risque combine charge élevée et tension sur la capacité de l’équipe.";
    else if (cat.includes("skill") || cat.includes("gap")) reason = "le risque combine besoins compétences et exposition sur les jalons.";
    else if (cat.includes("fragil") || cat.includes("dependency")) reason = "le risque combine dépendances clés et fragilité de livraison.";
    return `À traiter en premier : ${first.projectName}, car ${reason}`;
}

export default function RisksPage() {
    const { t } = useTranslation(["common", "nav"]);
    const { push } = useToast();
    const qc = useQueryClient();
    const [projectId, setProjectId] = useState("");
    const aggregateView = !projectId.trim();

    const [severityFilter, setSeverityFilter] = useState("Toutes");
    const [categoryFilter, setCategoryFilter] = useState("Toutes");
    const [selectedAlert, setSelectedAlert] = useState<DisplayAlert | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const projects = useProjects({ limit: 100 });
    const dashboard = useDashboard("mine", { enabled: aggregateView });
    const riskDetail = useManagerRiskData(projectId.trim() || null);

    const patchAlert = useRiskAlertAction();
    const watchdogScan = useWatchdogScan();
    const analyzeProject = useMutation({
        mutationFn: (pid: string) => agentsApi.projectAnalysis({ project_id: pid }).then((r) => r.data),
    });

    const displayAlerts: DisplayAlert[] = useMemo(() => {
        if (aggregateView) {
            const top = dashboard.data?.widgets.top_alerts ?? [];
            return top.map(toDisplayFromTop);
        }
        const rawItems = riskDetail.data?.items ?? [];
        return rawItems.map(toDisplayFromRiskItem);
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
            const sev = (a.severity ?? "").toLowerCase();
            if (severityFilter !== "Toutes" && sev !== severityFilter.toLowerCase()) return false;
            if (categoryFilter !== "Toutes" && a.category !== categoryFilter) return false;
            return true;
        });
    }, [displayAlerts, severityFilter, categoryFilter]);

    const priorityQueue = useMemo(() => {
        return [...filteredAlerts].sort((a, b) => {
            const rs = severityRank(b.severity) - severityRank(a.severity);
            if (rs !== 0) return rs;
            const sa = a.riskScore ?? -1;
            const sb = b.riskScore ?? -1;
            return sb - sa;
        });
    }, [filteredAlerts]);

    const heatmapBuckets = useMemo(() => {
        const buckets: DisplayAlert[][] = Array.from({ length: 9 }, () => []);
        for (const a of filteredAlerts) {
            const { impact, urgency } = heatmapCell(a);
            const idx = urgency * 3 + impact;
            buckets[idx].push(a);
        }
        return buckets;
    }, [filteredAlerts]);

    const leaderboardRows = useMemo(() => {
        if (aggregateView) {
            const fragile = dashboard.data?.widgets.fragile_projects ?? [];
            return fragile.slice(0, 5).map((p) => ({
                project_id: p.id,
                project_name: p.name,
                risk_score: p.viability_score ?? undefined,
                risk_level: p.decision ?? "—",
                drivers: {} as Record<string, number>,
                computed_at: undefined as string | undefined,
            }));
        }
        const rows = riskDetail.data?.projects ?? [];
        return rows.slice(0, 5).map((r) => ({
            ...r,
            risk_level: r.risk_level ?? "medium",
        }));
    }, [aggregateView, dashboard.data?.widgets.fragile_projects, riskDetail.data?.projects]);

    const totalAlerts = useMemo(() => {
        if (aggregateView) return dashboard.data?.widgets?.top_alerts?.length ?? 0;
        return riskDetail.data?.summary?.total_alerts ?? displayAlerts.length;
    }, [aggregateView, dashboard.data?.widgets?.top_alerts?.length, riskDetail.data?.summary?.total_alerts, displayAlerts.length]);

    const globalRiskScore = useMemo(
        () => readAvgRiskScore(riskDetail.data?.summary),
        [riskDetail.data?.summary],
    );

    const onPatch = ({ id, action, note }: { id: string; action: "resolve" | "dismiss"; note?: string }) => {
        patchAlert.mutate(
            { id, body: { action, note } },
            {
                onSuccess: async () => {
                    await invalidateManagerRiskQueries(qc);
                    push(action === "resolve" ? "Alerte résolue" : "Alerte ignorée", "success");
                    setDrawerOpen(false);
                    setSelectedAlert(null);
                },
                onError: () => push("Action impossible sur l'alerte.", "error"),
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

    const isLoading = aggregateView ? dashboard.isLoading || riskDetail.isLoading : riskDetail.isLoading;
    const isError = aggregateView ? dashboard.isError || riskDetail.isError : riskDetail.isError;

    const risksHeaderBadge = useMemo(
        () => (
            <span className="inline-flex shrink-0 rounded-full border border-brand-secondary/35 bg-gradient-to-r from-brand-primary/15 to-violet-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-secondary shadow-sm">
                AI Powered
            </span>
        ),
        [],
    );

    useWorkspaceTopbarMeta(t("nav:managerNavRisks"), t("managerWorkspace.risksPage.heroSubtitle"), risksHeaderBadge);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.risksPage.shellTitle")}
            description={false}
            omitHeader
        >
            {isLoading ? <p className="text-sm text-tertiary">{t("managerWorkspace.risksPage.loadData")}</p> : null}
            {isError ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                    {t("managerWorkspace.risksPage.loadError")}
                </div>
            ) : null}

            {!isLoading && !isError ? (
                <div className="space-y-6 lg:space-y-8">
                    {/* KPI */}
                    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {aggregateView ? (
                            <>
                                <KpiPremium
                                    label={t("managerWorkspace.risksPage.kpiOpenAlerts")}
                                    value={dashboard.data?.kpi_cards.alerts.total_open ?? 0}
                                    hint={t("managerWorkspace.risksPage.hintPortfolio")}
                                    tone="neutral"
                                />
                                <KpiPremium
                                    label={t("managerWorkspace.risksPage.kpiCriticalHigh")}
                                    value={dashboard.data?.kpi_cards.alerts.critical_or_high ?? 0}
                                    hint={t("managerWorkspace.risksPage.hintHighPriority")}
                                    tone="danger"
                                />
                                <KpiPremium
                                    label={t("managerWorkspace.risksPage.kpiOverloadedTalents")}
                                    value={dashboard.data?.kpi_cards.team.overloaded ?? 0}
                                    hint={t("managerWorkspace.risksPage.hintCapacity")}
                                    tone="warning"
                                />
                                <KpiPremium
                                    label={t("managerWorkspace.risksPage.kpiPendingRh")}
                                    value={dashboard.data?.kpi_cards.pending_rh_actions ?? 0}
                                    hint={t("managerWorkspace.risksPage.hintRhQueue")}
                                    tone="info"
                                />
                                <KpiPremium
                                    label={t("managerWorkspace.risksPage.kpiGlobalRiskScore")}
                                    value={globalRiskScore != null ? Number(globalRiskScore.toFixed(2)) : null}
                                    hint={t("managerWorkspace.risksPage.hintConsolidated")}
                                    tone="brand"
                                    display={globalRiskScore != null ? `${globalRiskScore.toFixed(2)}/10` : "—"}
                                />
                            </>
                        ) : (
                            <>
                                <KpiPremium
                                    label={t("managerWorkspace.risksPage.kpiOpened")}
                                    value={riskDetail.data?.summary.total_alerts ?? riskDetail.data?.items.length ?? 0}
                                    hint={t("managerWorkspace.risksPage.hintSelectedProject")}
                                    tone="neutral"
                                />
                                <KpiPremium
                                    label={t("managerWorkspace.risksPage.kpiCritical")}
                                    value={riskDetail.data?.summary.critical ?? 0}
                                    hint={t("managerWorkspace.risksPage.hintSeverity")}
                                    tone="danger"
                                />
                                <KpiPremium
                                    label={t("managerWorkspace.risksPage.kpiHigh")}
                                    value={riskDetail.data?.summary.high ?? 0}
                                    hint={t("managerWorkspace.risksPage.hintSeverity")}
                                    tone="warning"
                                />
                                <KpiPremium
                                    label={t("managerWorkspace.risksPage.kpiAtRiskProjects")}
                                    value={riskDetail.data?.summary.at_risk_projects ?? riskDetail.data?.projects?.length ?? 0}
                                    hint={t("managerWorkspace.risksPage.hintScope")}
                                    tone="info"
                                />
                                <KpiPremium
                                    label={t("managerWorkspace.risksPage.kpiGlobalRiskScore")}
                                    value={globalRiskScore != null ? Number(globalRiskScore.toFixed(2)) : null}
                                    hint={t("managerWorkspace.risksPage.hintAvgIndicators")}
                                    tone="brand"
                                    display={globalRiskScore != null ? `${globalRiskScore.toFixed(2)}/10` : "—"}
                                />
                            </>
                        )}
                    </section>

                    {/* Filtres + scan (inchangés fonctionnellement) */}
                    <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm">
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className="min-w-0 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
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
                                className="min-w-0 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
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
                                className="min-w-0 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm"
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
                                className="rounded-lg border border-brand-solid/50 bg-brand-primary/15 px-3 py-2 text-sm font-semibold text-brand-secondary shadow-sm transition hover:bg-brand-primary/25 disabled:opacity-50"
                                onClick={() => {
                                    const fallback = leaderboardRows[0]?.project_id;
                                    onScan(projectId.trim() || fallback);
                                }}
                            >
                                {watchdogScan.isPending ? "Scan…" : "Lancer scan Watchdog"}
                            </button>
                        </div>
                    </section>

                    <div className="space-y-4">
                            <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm lg:p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-sm font-semibold text-primary">Priorité IA</h2>
                                    <span className="rounded-full border border-secondary bg-secondary_subtle/60 px-2 py-0.5 text-[11px] font-medium text-tertiary">
                                        {priorityQueue.length} élément(s)
                                    </span>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-secondary">{priorityQueueIntro(priorityQueue)}</p>
                                <ul className="mt-4 space-y-2">
                                    {priorityQueue.slice(0, 8).map((a, idx) => (
                                        <li
                                            key={`${a.patchId}-pq-${idx}`}
                                            className="flex flex-col gap-2 rounded-xl border border-secondary bg-primary_alt p-3 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary/15 text-xs font-bold text-brand-secondary">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="truncate font-medium text-primary">{a.projectName}</span>
                                                    <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", severityBadgeClass(a.severity))}>
                                                        {a.severity}
                                                    </span>
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-xs text-secondary">{shortReason(a)}</p>
                                                <p className="mt-1 text-[11px] font-medium text-brand-secondary">{recommendedAction(a)}</p>
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <button
                                                    type="button"
                                                    className="rounded-lg border border-brand-secondary/50 bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-secondary hover:bg-brand-primary/20"
                                                    onClick={() => openDrawer(a)}
                                                >
                                                    Traiter
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <RiskHeatmap buckets={heatmapBuckets} onPick={openDrawer} />
                    </div>

                    {/* Top projets */}
                    {leaderboardRows.length > 0 ? (
                        <section className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">Top projets à risque</p>
                            <div className="mt-3 divide-y divide-secondary">
                                {leaderboardRows.map((row, idx) => {
                                    const pid = row.project_id ?? "";
                                    const drivers = row.drivers ?? {};
                                    const topDrivers = Object.entries(drivers)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 2)
                                        .map(([k]) => DRIVER_LABELS[k] ?? k)
                                        .join(" · ");
                                    const rl = (row.risk_level ?? "").toLowerCase();
                                    const cfgDot =
                                        rl === "critical" || rl === "stop" ? "bg-red-500" : rl === "high" || rl === "adjust" ? "bg-orange-500" : "bg-emerald-500";
                                    return (
                                        <div key={pid || `risk-row-${idx}`} className="flex items-start gap-3 py-3 first:pt-0">
                                            <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", cfgDot)} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-primary">{row.project_name ?? "Projet"}</span>
                                                    {row.risk_score != null ? (
                                                        <span className={cx("text-sm font-semibold tabular-nums", scoreColorClass(row.risk_score))}>
                                                            {Number(row.risk_score).toFixed(1)}/10
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {topDrivers ? <p className="mt-1 text-xs text-tertiary">{topDrivers}</p> : null}
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                {pid ? (
                                                    <Link className="rounded-lg border border-secondary px-2 py-1 text-xs font-medium hover:bg-secondary_subtle" to={managerProjectsOpenModalPath(pid)}>
                                                        Ouvrir
                                                    </Link>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    disabled={watchdogScan.isPending || !pid}
                                                    className="rounded-lg border border-brand-solid/40 bg-brand-primary/10 px-2 py-1 text-xs font-semibold text-brand-secondary transition hover:bg-brand-primary/20 disabled:opacity-50"
                                                    title={pid ? undefined : "Identifiant projet indisponible"}
                                                    onClick={() => pid && onScan(pid)}
                                                >
                                                    Scan
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}

                    {/* Tickets */}
                    <section>
                        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <h2 className="text-sm font-semibold text-primary">Risk tickets</h2>
                                <p className="mt-0.5 text-xs text-tertiary">
                                    {totalAlerts} ouvertes
                                    {filteredAlerts.length !== totalAlerts ? ` · ${filteredAlerts.length} affichées` : ""}
                                    {!aggregateView ? " · Détail projet" : " · Vue portefeuille"}
                                </p>
                            </div>
                        </div>
                        {filteredAlerts.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-secondary px-6 py-12 text-center text-sm text-tertiary">
                                Aucune alerte ne correspond aux filtres.
                            </div>
                        ) : (
                            <div className="grid gap-3 lg:grid-cols-2">
                                {filteredAlerts.map((alert) => (
                                    <RiskTicketCard
                                        key={`${alert.patchId}-${alert.message.slice(0, 24)}`}
                                        alert={alert}
                                        loading={patchAlert.isPending}
                                        analyzePending={analyzeProject.isPending}
                                        onOpen={() => openDrawer(alert)}
                                        onPatch={onPatch}
                                        onAnalyze={(pid) =>
                                            analyzeProject.mutate(pid, {
                                                onSuccess: () => push("Analyse IA lancée sur le projet.", "success"),
                                                onError: () => push("Analyse IA indisponible pour ce projet.", "error"),
                                            })
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                </div>
            ) : null}

            <AlertDetailDrawer
                open={drawerOpen}
                alert={selectedAlert}
                onClose={() => {
                    setDrawerOpen(false);
                }}
                loading={patchAlert.isPending}
                analyzePending={analyzeProject.isPending}
                onPatch={onPatch}
                onAnalyze={(pid) =>
                    analyzeProject.mutate(pid, {
                        onSuccess: () => push("Analyse IA lancée sur le projet.", "success"),
                        onError: () => push("Analyse IA indisponible pour ce projet.", "error"),
                    })
                }
            />
        </WorkspacePageShell>
    );
}

function KpiPremium({
    label,
    value,
    hint,
    tone,
    display,
}: {
    label: string;
    value: number | null;
    hint: string;
    tone: "neutral" | "danger" | "warning" | "info" | "brand";
    display?: string;
}) {
    const ring =
        tone === "danger"
            ? "ring-red-500/15"
            : tone === "warning"
              ? "ring-amber-500/15"
              : tone === "info"
                ? "ring-blue-500/15"
                : tone === "brand"
                  ? "ring-brand-secondary/20"
                  : "ring-secondary/20";
    return (
        <article className={cx("rounded-2xl border border-secondary bg-primary p-4 shadow-sm ring-1", ring)}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{display ?? (value != null ? value : "—")}</p>
            <p className="mt-1 text-[11px] text-tertiary">{hint}</p>
        </article>
    );
}

function RiskHeatmap({
    buckets,
    onPick,
}: {
    buckets: DisplayAlert[][];
    onPick: (a: DisplayAlert) => void;
}) {
    const labelsImpact = ["Impact faible", "Impact moyen", "Impact élevé"];
    const labelsUrgence = ["Surveillance", "Aujourd'hui", "Urgent"];

    return (
        <section className="rounded-xl border border-secondary bg-primary p-2.5 shadow-sm sm:p-3">
            <h2 className="text-xs font-semibold tracking-tight text-primary">Risk heatmap</h2>
            <p className="mt-0.5 text-[11px] leading-snug text-tertiary">Impact × urgence — cliquez sur une cellule pour ouvrir une alerte.</p>
            <div className="mt-2 max-h-[13rem] overflow-auto rounded-lg border border-secondary sm:max-h-[14rem]">
                <div className="grid min-h-0 grid-cols-[minmax(0,3.25rem)_repeat(3,minmax(0,1fr))] bg-secondary_subtle/30 text-[9px] font-semibold uppercase tracking-wide text-tertiary">
                    <div className="border-b border-r border-secondary px-1 py-1" />
                    {labelsImpact.map((lab) => (
                        <div key={lab} className="border-b border-r border-secondary px-1 py-1 text-center leading-tight last:border-r-0">
                            {lab}
                        </div>
                    ))}
                    {labelsUrgence.map((uLab, row) => (
                        <Fragment key={uLab}>
                            <div
                                className={cx(
                                    "flex items-center border-r border-secondary bg-primary px-1 py-1 text-[9px] font-semibold leading-tight text-secondary",
                                    row < labelsUrgence.length - 1 ? "border-b" : "",
                                )}
                            >
                                {uLab}
                            </div>
                            {[0, 1, 2].map((col) => {
                                const idx = row * 3 + col;
                                const cell = buckets[idx] ?? [];
                                return (
                                    <div
                                        key={`${row}-${col}`}
                                        className={cx(
                                            "relative min-h-[2.75rem] border-r border-secondary bg-primary p-1 sm:min-h-[3rem]",
                                            row < labelsUrgence.length - 1 ? "border-b" : "",
                                            col === 2 ? "last:border-r-0" : "",
                                        )}
                                    >
                                        {cell.slice(0, 3).map((a) => (
                                            <button
                                                key={a.patchId}
                                                type="button"
                                                onClick={() => onPick(a)}
                                                className={cx(
                                                    "mb-0.5 w-full max-w-full truncate rounded-md border px-1 py-0.5 text-left text-[9px] font-medium leading-tight transition last:mb-0 hover:brightness-95 sm:text-[10px]",
                                                    severityBadgeClass(a.severity),
                                                )}
                                                title={a.message}
                                            >
                                                {a.projectName}
                                            </button>
                                        ))}
                                        {cell.length > 3 ? (
                                            <button
                                                type="button"
                                                className="w-full py-0.5 text-[9px] font-semibold leading-none text-brand-secondary hover:underline sm:text-[10px]"
                                                onClick={() => onPick(cell[0])}
                                            >
                                                +{cell.length - 3}
                                            </button>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </Fragment>
                    ))}
                </div>
            </div>
        </section>
    );
}

function RiskTicketCard({
    alert,
    loading,
    analyzePending,
    onOpen,
    onPatch,
    onAnalyze,
}: {
    alert: DisplayAlert;
    loading: boolean;
    analyzePending: boolean;
    onOpen: () => void;
    onPatch: (p: { id: string; action: "resolve" | "dismiss"; note?: string }) => void;
    onAnalyze: (projectId: string) => void;
}) {
    const [showNote, setShowNote] = useState(false);
    const [note, setNote] = useState("");
    const st = ticketStatusPresentation(alert.status);

    const submit = (action: "resolve" | "dismiss") => {
        onPatch({ id: alert.patchId, action, note: note.trim() || undefined });
        setShowNote(false);
        setNote("");
    };

    return (
        <article className="flex flex-col rounded-2xl border border-secondary bg-primary p-4 shadow-sm transition hover:border-brand-secondary/30">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", severityBadgeClass(alert.severity))}>{alert.severity}</span>
                        <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold", st.className)}>{st.label}</span>
                    </div>
                    <h3 className="mt-2 truncate text-sm font-semibold text-primary">{alert.projectName}</h3>
                    <p className="mt-0.5 text-[11px] text-tertiary">
                        {alert.category}
                        {alert.riskScore != null ? (
                            <>
                                {" "}
                                · Score <span className={cx("font-semibold tabular-nums", scoreColorClass(alert.riskScore))}>{alert.riskScore.toFixed(1)}</span>
                            </>
                        ) : null}
                    </p>
                </div>
                <button type="button" onClick={onOpen} className="shrink-0 rounded-lg border border-secondary bg-primary_alt px-2.5 py-1 text-[11px] font-semibold text-secondary hover:bg-secondary_subtle">
                    Détail
                </button>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-secondary">{alert.message}</p>
            <p className="mt-2 text-xs text-tertiary">Détection {timeAgo(alert.detectedAt)}</p>

            {showNote ? (
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note optionnelle…"
                    rows={2}
                    className="mt-3 w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm outline-none"
                />
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={loading} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950/40 dark:text-emerald-100" onClick={() => submit("resolve")}>
                    Résoudre
                </button>
                <button type="button" disabled={loading} className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/40 dark:text-red-100" onClick={() => submit("dismiss")}>
                    Ignorer
                </button>
                <button type="button" className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary_subtle" onClick={() => setShowNote((v) => !v)}>
                    {showNote ? "Fermer note" : "Ajouter note"}
                </button>
                {alert.projectId ? (
                    <Link to={managerProjectsOpenModalPath(alert.projectId)} className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary_subtle">
                        Ouvrir projet
                    </Link>
                ) : null}
                <button
                    type="button"
                    disabled={!alert.projectId || analyzePending}
                    className="rounded-lg border border-brand-secondary/50 bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-secondary hover:bg-brand-primary/20 disabled:opacity-50"
                    onClick={() => alert.projectId && onAnalyze(alert.projectId)}
                >
                    Analyser avec IA
                </button>
            </div>
        </article>
    );
}

function RiskResolutionTimeline({ alert }: { alert: DisplayAlert }) {
    const st = (alert.status ?? "").toLowerCase();
    const steps = [
        { key: "detected", label: "Détecté", done: Boolean(alert.detectedAt) },
        { key: "analyzed", label: "Analysé", done: alert.riskScore != null },
        {
            key: "action",
            label: "Action recommandée",
            done: alert.riskScore != null || severityRank(alert.severity) >= 3,
        },
        { key: "decision", label: "Décision", done: st.includes("invest") || st === "in_progress" || st === "acknowledged" },
        { key: "resolved", label: "Résolu", done: st.includes("resolv") || st === "closed" || st === "dismissed" },
    ];

    return (
        <ol className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {steps.map((s, i) => (
                <li key={s.key} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-secondary bg-primary_alt px-3 py-2 text-xs">
                    <span className={cx("flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", s.done ? "bg-emerald-500 text-white" : "bg-secondary_subtle text-tertiary")}>
                        {i + 1}
                    </span>
                    <div className="min-w-0">
                        <p className="font-semibold text-primary">{s.label}</p>
                        <p className="text-[10px] text-tertiary">{s.done ? "Complété" : "À venir"}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

function AlertDetailDrawer({
    open,
    alert,
    onClose,
    loading,
    analyzePending,
    onPatch,
    onAnalyze,
}: {
    open: boolean;
    alert: DisplayAlert | null;
    onClose: () => void;
    loading: boolean;
    analyzePending: boolean;
    onPatch: (p: { id: string; action: "resolve" | "dismiss"; note?: string }) => void;
    onAnalyze: (projectId: string) => void;
}) {
    const [showNote, setShowNote] = useState(false);
    const [note, setNote] = useState("");

    if (!open || !alert) return null;

    const st = ticketStatusPresentation(alert.status);
    const submit = (action: "resolve" | "dismiss") => {
        onPatch({ id: alert.patchId, action, note: note.trim() || undefined });
        setShowNote(false);
        setNote("");
    };

    return (
        <div className="fixed inset-0 z-50">
            <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Fermer" />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-secondary bg-primary shadow-2xl">
                <header className="border-b border-secondary px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase text-tertiary">Alerte</p>
                            <h2 className="truncate text-lg font-semibold text-primary">{alert.projectName}</h2>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", severityBadgeClass(alert.severity))}>{alert.severity}</span>
                                <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold", st.className)}>{st.label}</span>
                                <span className="rounded-full border border-secondary bg-secondary_subtle px-2 py-0.5 text-[10px] text-secondary">{alert.category}</span>
                            </div>
                        </div>
                        <button type="button" className="rounded-lg border border-secondary px-2 py-1 text-xs font-medium hover:bg-secondary_subtle" onClick={onClose}>
                            Fermer
                        </button>
                    </div>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    <p className="text-sm text-secondary">{alert.message}</p>
                    <dl className="mt-4 grid gap-2 text-xs">
                        <div className="flex justify-between gap-2 rounded-lg border border-secondary bg-primary_alt px-3 py-2">
                            <dt className="text-tertiary">Impact estimé</dt>
                            <dd className="font-medium text-primary">
                                {alert.severity === "critical" || alert.severity === "high" ? "Élevé" : alert.severity === "medium" ? "Modéré" : "Faible"}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-2 rounded-lg border border-secondary bg-primary_alt px-3 py-2">
                            <dt className="text-tertiary">Action recommandée</dt>
                            <dd className="max-w-[60%] text-right font-medium text-primary">{recommendedAction(alert)}</dd>
                        </div>
                        {alert.riskScore != null ? (
                            <div className="flex justify-between gap-2 rounded-lg border border-secondary bg-primary_alt px-3 py-2">
                                <dt className="text-tertiary">Score</dt>
                                <dd className={cx("font-semibold tabular-nums", scoreColorClass(alert.riskScore))}>{alert.riskScore.toFixed(1)}</dd>
                            </div>
                        ) : null}
                    </dl>
                    <div className="mt-6">
                        <p className="text-xs font-semibold uppercase text-tertiary">Timeline</p>
                        <div className="mt-2">
                            <RiskResolutionTimeline alert={alert} />
                        </div>
                    </div>
                    {showNote ? (
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="mt-4 w-full rounded-lg border border-secondary px-3 py-2 text-sm"
                            rows={3}
                            placeholder="Note…"
                        />
                    ) : null}
                </div>
                <footer className="border-t border-secondary px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={loading} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold disabled:opacity-50" onClick={() => submit("resolve")}>
                            Résoudre
                        </button>
                        <button type="button" disabled={loading} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold disabled:opacity-50" onClick={() => submit("dismiss")}>
                            Ignorer
                        </button>
                        <button type="button" className="rounded-lg border border-secondary px-3 py-2 text-xs font-medium hover:bg-secondary_subtle" onClick={() => setShowNote((v) => !v)}>
                            Note
                        </button>
                        {alert.projectId ? (
                            <Link to={managerProjectsOpenModalPath(alert.projectId)} className="rounded-lg border border-secondary px-3 py-2 text-xs font-medium hover:bg-secondary_subtle">
                                Projet
                            </Link>
                        ) : null}
                        <button
                            type="button"
                            disabled={!alert.projectId || analyzePending}
                            className="rounded-lg border border-brand-secondary/40 bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-secondary disabled:opacity-50"
                            onClick={() => alert.projectId && onAnalyze(alert.projectId)}
                        >
                            Analyser IA
                        </button>
                    </div>
                </footer>
            </aside>
        </div>
    );
}
