import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
    getManagerMonitoring,
    getManagerOverview,
    getManagerWorkspaceProjects,
    parseManagerWorkspaceProjectsResponse,
} from "@/api/workspace-manager.api";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { toUserMessage } from "@/hooks/crud/error-message";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useAuth } from "@/providers/auth-provider";
import { useWhatIf } from "@/providers/what-if-provider";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { formatRowText, getRowField } from "@/pages/workspace/manager-monitoring-display";

type Load = "idle" | "loading" | "ok" | "err";

function cx(...parts: (string | false | undefined)[]): string {
    return parts.filter(Boolean).join(" ");
}

function num(v: unknown): number | undefined {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
}

function formatRelativeFr(iso: string | undefined): string {
    if (!iso?.trim()) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const diffMs = Date.now() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 1) return "à l’instant";
    if (diffM < 60) return `il y a ${diffM} min`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 14) return `il y a ${diffD} j`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function parseViabilityScore(row: Record<string, unknown>): number | null {
    const raw = getRowField(row, ["viability_score", "score", "viability", "health_score"]);
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    const n = Number(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

function decisionPill(decision: unknown): { label: string; color: "success" | "warning" | "error" | "gray" } {
    const s = String(decision ?? "")
        .trim()
        .toLowerCase();
    if (s.includes("continue")) return { label: String(decision ?? "Continue").trim() || "Continue", color: "success" };
    if (s.includes("adjust")) return { label: String(decision ?? "Adjust").trim() || "Adjust", color: "warning" };
    if (s.includes("stop")) return { label: String(decision ?? "Stop").trim() || "Stop", color: "error" };
    return { label: formatRowText(decision), color: "gray" };
}

type KpiBarProps = {
    label: string;
    value: string | number;
    hint: string;
    progressPct: number;
    barClass: string;
    toneClass: string;
    badge: string;
    valueClassName?: string;
};

function KpiBarCard({ label, value, hint, progressPct, barClass, toneClass, badge, valueClassName }: KpiBarProps) {
    const pct = Math.min(100, Math.max(0, progressPct));
    return (
        <article className="group relative overflow-hidden rounded-2xl border border-secondary bg-primary p-4 shadow-xs ring-1 ring-secondary/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className={cx("pointer-events-none absolute inset-x-0 top-0 h-1 opacity-90", toneClass)} />
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-quaternary">{label}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                    {badge}
                </span>
            </div>
            <p className={cx("mt-3 text-display-xs font-semibold tabular-nums text-primary", valueClassName)}>{value}</p>
            <p className="mt-1 text-xs text-tertiary">{hint}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className={cx("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
            </div>
        </article>
    );
}

type PriorityTone = "critical" | "attention" | "ok";

function priorityToneClasses(tone: PriorityTone): string {
    if (tone === "critical") return "border-red-300/80 bg-red-500/5 ring-red-200/70";
    if (tone === "attention") return "border-amber-300/80 bg-amber-500/5 ring-amber-200/70";
    return "border-emerald-300/80 bg-emerald-500/5 ring-emerald-200/70";
}

function priorityToneBadgeClasses(tone: PriorityTone): string {
    if (tone === "critical") return "bg-red-500/15 text-red-700 ring-red-400/40 dark:text-red-300";
    if (tone === "attention") return "bg-amber-500/15 text-amber-800 ring-amber-400/40 dark:text-amber-300";
    return "bg-emerald-500/15 text-emerald-700 ring-emerald-400/40 dark:text-emerald-300";
}

function priorityToneLabel(tone: PriorityTone): string {
    if (tone === "critical") return "Critique";
    if (tone === "attention") return "Attention";
    return "Stable";
}

function formatRecommendedAction(action: unknown): string {
    const key = String(action ?? "").trim();
    if (!key) return "Revoir le projet";
    const labels: Record<string, string> = {
        rebalance_resources: "Rééquilibrer les ressources",
        review_allocations: "Revoir les allocations",
        launch_training_or_staffing: "Lancer une action formation / staffing",
        review_timeline: "Réviser le planning",
        stop_or_reassess: "Réévaluer ou stopper le projet",
        review_project: "Revoir le projet",
    };
    return labels[key] ?? key.replaceAll("_", " ");
}

export function ManagerDashboardPage() {
    const { t } = useTranslation(["common"]);
    const { user } = useAuth();
    const paths = useWorkspacePaths();
    const { open: openWhatIf } = useWhatIf();
    useCopilotPage("dashboard", t("nav:managerNavDashboard"));

    const [load, setLoad] = useState<Load>("idle");
    const [error, setError] = useState<string | null>(null);
    const [overviewRaw, setOverviewRaw] = useState<unknown>(null);
    const [monitoringItems, setMonitoringItems] = useState<Record<string, unknown>[]>([]);
    const [monitoringSummary, setMonitoringSummary] = useState<Record<string, unknown>>({});
    const [monitoringAlerts, setMonitoringAlerts] = useState<Record<string, unknown>[]>([]);
    const [previewProjects, setPreviewProjects] = useState<Record<string, unknown>[]>([]);

    const enterpriseId = useMemo(() => {
        const fromUser = user?.enterpriseId?.trim();
        const fromEnv = (import.meta.env.VITE_MANAGER_ENTERPRISE_ID as string | undefined)?.trim();
        return fromUser || fromEnv || "";
    }, [user?.enterpriseId]);

    const fetchAll = useCallback(async () => {
        setLoad("loading");
        setError(null);
        try {
            const [ov, mon, list] = await Promise.all([
                getManagerOverview({ enterprise_id: enterpriseId }),
                getManagerMonitoring({ enterprise_id: enterpriseId }),
                getManagerWorkspaceProjects({
                    page: 1,
                    limit: 13,
                    enterprise_id: enterpriseId,
                }),
            ]);
            setOverviewRaw(ov);
            setMonitoringItems(mon.items);
            setMonitoringSummary(mon.summary);
            const monRoot = mon.raw && typeof mon.raw === "object" ? (mon.raw as Record<string, unknown>) : {};
            setMonitoringAlerts(
                Array.isArray(monRoot.alerts)
                    ? monRoot.alerts
                          .map((item) => (item && typeof item === "object" ? ({ ...(item as Record<string, unknown>) } as Record<string, unknown>) : null))
                          .filter((item): item is Record<string, unknown> => item != null)
                    : [],
            );
            const parsed = parseManagerWorkspaceProjectsResponse(list);
            setPreviewProjects(parsed.items);
            setLoad("ok");
        } catch (e) {
            setError(toUserMessage(e));
            setLoad("err");
        }
    }, [enterpriseId]);

    useEffect(() => {
        void fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        const id = window.setInterval(() => void fetchAll(), 30_000);
        return () => window.clearInterval(id);
    }, [fetchAll]);

    const overviewPayload = useMemo(() => {
        const root = asRecord(overviewRaw);
        const data = asRecord(root.data);
        return Object.keys(data).length > 0 ? data : root;
    }, [overviewRaw]);
    const overviewSummary = useMemo(() => asRecord(overviewPayload.summary), [overviewPayload.summary]);
    const overviewInsights = useMemo(() => asRecord(overviewPayload.insights), [overviewPayload.insights]);
    const overviewPriorityActions = useMemo(
        () => asStringArray(overviewInsights.priority_actions),
        [overviewInsights.priority_actions],
    );

    const merged = useMemo(() => {
        const total = num(overviewSummary.total_projects);
        const active = num(overviewSummary.active_projects);
        const atRisk = num(overviewSummary.high_risk_projects);
        const stop = num(overviewSummary.stop_projects) ?? 0;
        const adjust = num(overviewSummary.adjust_projects) ?? 0;
        const lastAnalysis =
            typeof overviewSummary.last_analysis_at === "string" && overviewSummary.last_analysis_at.trim()
                ? overviewSummary.last_analysis_at.trim()
                : undefined;
        const portfolioStatus =
            typeof overviewSummary.portfolio_status === "string" && overviewSummary.portfolio_status.trim()
                ? overviewSummary.portfolio_status.trim()
                : "—";
        const portfolioExplanation =
            typeof overviewSummary.portfolio_explanation === "string" && overviewSummary.portfolio_explanation.trim()
                ? overviewSummary.portfolio_explanation.trim()
                : "—";
        return { total, active, atRisk, stop, adjust, lastAnalysis, portfolioStatus, portfolioExplanation };
    }, [overviewSummary]);

    const overloadedItems = useMemo(
        () =>
            monitoringItems.filter(
                (row) => String(getRowField(row, ["load_status"]) ?? "")
                    .trim()
                    .toLowerCase() === "overloaded",
            ),
        [monitoringItems],
    );
    const highLoadItems = useMemo(
        () =>
            monitoringItems.filter(
                (row) => String(getRowField(row, ["load_status"]) ?? "")
                    .trim()
                    .toLowerCase() === "high",
            ),
        [monitoringItems],
    );
    const itemsWithAlerts = useMemo(
        () =>
            monitoringItems.filter((row) => {
                const hasAlert = getRowField(row, ["has_alert", "hasAlert"]);
                if (typeof hasAlert === "boolean") return hasAlert;
                return String(hasAlert ?? "")
                    .trim()
                    .toLowerCase() === "true";
            }),
        [monitoringItems],
    );
    const monitoringActiveAlerts = useMemo(() => {
        return num(monitoringSummary.active_alerts) ?? monitoringAlerts.length;
    }, [monitoringSummary.active_alerts, monitoringAlerts.length]);
    const monitoringHighAlerts = useMemo(() => {
        return num(monitoringSummary.high_alerts) ?? 0;
    }, [monitoringSummary.high_alerts]);
    const monitoringAlertPreview = useMemo(() => {
        if (monitoringAlerts.length > 0) return monitoringAlerts;
        const prioritized = [...overloadedItems, ...highLoadItems, ...itemsWithAlerts];
        const seen = new Set<string>();
        return prioritized.filter((row) => {
            const key = String(getRowField(row, ["project_id", "id", "name", "project_name"]) ?? "");
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [highLoadItems, itemsWithAlerts, monitoringAlerts, overloadedItems]);

    const copilotManagerDashboardPayload = useMemo(
        () => ({
            portfolio_summary: {
                total_projects: merged.total,
                active_projects: merged.active,
                at_risk: merged.atRisk,
                stop_decisions: merged.stop,
                adjust_decisions: merged.adjust,
                last_analysis_at: merged.lastAnalysis,
            },
            projects: previewProjects.map((row) => ({
                id: String(getRowField(row, ["id", "project_id"]) ?? ""),
                name: formatRowText(getRowField(row, ["name", "project_name", "title"])),
                status: formatRowText(getRowField(row, ["status", "project_status"])),
                viability: parseViabilityScore(row),
                decision: formatRowText(getRowField(row, ["decision", "ai_decision", "copilot_decision", "viability_decision"])),
                risk: formatRowText(getRowField(row, ["risk", "risk_level", "alert_type"])),
            })),
            kpi: {
                total_projects: merged.total,
                active_projects: merged.active,
                at_risk: merged.atRisk,
                stop_decisions: merged.stop,
                adjust_decisions: merged.adjust,
                alerts_count: monitoringActiveAlerts,
            },
            alerts: monitoringAlertPreview.slice(0, 40).map((row) => ({
                project_id: formatRowText(getRowField(row, ["project_id", "id"])),
                alert: formatRowText(getRowField(row, ["alert", "alert_type", "blocking", "milestone_risk"])),
                detail: formatRowText(getRowField(row, ["detail", "message", "summary", "description"])),
            })),
        }),
        [merged, monitoringActiveAlerts, monitoringAlertPreview, previewProjects],
    );
    useCopilotPage("manager_dashboard", copilotManagerDashboardPayload);

    const priorityProjects = useMemo(() => {
        return previewProjects
            .map((row, i) => {
                const r = asRecord(row);
                const id = String(r.id ?? r.project_id ?? "").trim();
                if (!id) return null;
                const priorityLevel = String(getRowField(r, ["priority_level"]) ?? "")
                    .trim()
                    .toLowerCase();
                if (priorityLevel !== "critical" && priorityLevel !== "attention") return null;
                const name = formatRowText(getRowField(r, ["name", "title", "project_name"]));
                const dec = getRowField(r, ["decision", "ai_decision", "copilot_decision", "viability_decision"]);
                const pill = decisionPill(dec);
                const tone: PriorityTone = priorityLevel === "critical" ? "critical" : "attention";
                const insightSummary = formatRowText(getRowField(r, ["insight_summary", "summary", "explanation", "description"]));
                const recommendedAction = formatRecommendedAction(getRowField(r, ["recommended_action", "action"]));
                return { id, i, name, pill, tone, insightSummary, recommendedAction };
            })
            .filter((x): x is NonNullable<typeof x> => x != null)
            .slice(0, 6);
    }, [previewProjects]);

    const heroSubtitle = useMemo(() => {
        const insightSummary =
            typeof overviewInsights.summary === "string" && overviewInsights.summary.trim()
                ? overviewInsights.summary.trim()
                : typeof overviewInsights.analysis === "string" && overviewInsights.analysis.trim()
                  ? overviewInsights.analysis.trim()
                  : "";
        const base =
            merged.portfolioStatus && merged.portfolioStatus !== "—"
                ? merged.portfolioStatus
                : insightSummary || "Pilotage stratégique du portefeuille";
        if (!merged.lastAnalysis) return base;
        return `${base} · analyse ${formatRelativeFr(merged.lastAnalysis)}`;
    }, [merged.lastAnalysis, merged.portfolioStatus, overviewInsights.analysis, overviewInsights.summary]);

    const totalDisplay = merged.total ?? "—";

    const kpiCards = useMemo(() => {
        const totalN = num(overviewSummary.total_projects);
        const activeN = num(overviewSummary.active_projects);
        const atRiskN = num(overviewSummary.high_risk_projects);
        const stopN = num(overviewSummary.stop_projects) ?? 0;
        const adjustN = num(overviewSummary.adjust_projects) ?? 0;
        const alerts = monitoringActiveAlerts;

        const t = totalN ?? 0;
        const active = activeN ?? 0;
        const atRisk = atRiskN ?? 0;
        const activePct = t > 0 ? (active / t) * 100 : 0;
        const riskPct = t > 0 ? Math.min(100, (atRisk / t) * 100) : 0;
        const stopPct = t > 0 ? Math.min(100, (stopN / t) * 100) : 0;
        const adjustPct = t > 0 ? Math.min(100, (adjustN / t) * 100) : 0;
        const alertPct = t > 0 ? Math.min(100, (alerts / t) * 100) : 0;

        return [
            {
                label: "Projets (total)",
                value: totalN != null ? totalN : "—",
                hint: "Portefeuille complet",
                progressPct: 100,
                barClass: "bg-brand-secondary",
                toneClass: "bg-brand-secondary",
                badge: "global",
            },
            {
                label: "Actifs",
                value: activeN != null ? activeN : "—",
                hint: t > 0 && activeN != null ? `${Math.round((activeN / t) * 100)} % du total` : "—",
                progressPct: activePct,
                barClass: "bg-emerald-500",
                toneClass: "bg-emerald-500",
                badge: "delivery",
            },
            {
                label: "À risque",
                value: atRiskN != null ? atRiskN : "—",
                hint: atRiskN == null ? "—" : atRiskN === 0 ? "Aucun risque signalé" : "Attention requise",
                progressPct: atRiskN == null ? 0 : atRiskN === 0 ? 100 : riskPct,
                barClass:
                    atRiskN == null
                        ? "bg-utility-gray-300"
                        : atRiskN === 0
                          ? "bg-emerald-500"
                          : "bg-amber-500",
                toneClass: atRiskN === 0 ? "bg-emerald-500" : "bg-amber-500",
                badge: "risque",
            },
            {
                label: "Décisions Stop",
                value: stopN,
                hint: stopN === 0 ? "Aucune" : "Projets en arrêt",
                progressPct: stopN === 0 ? 100 : stopPct,
                barClass: stopN === 0 ? "bg-emerald-500" : "bg-red-500",
                toneClass: stopN === 0 ? "bg-emerald-500" : "bg-red-500",
                badge: "gouvernance",
                valueClassName: stopN > 0 ? "text-red-600 dark:text-red-400" : undefined,
            },
            {
                label: "Ajustements",
                value: adjustN,
                hint: "Projets avec décision Adjust",
                progressPct: adjustN === 0 ? 100 : adjustPct,
                barClass: adjustN === 0 ? "bg-emerald-500" : "bg-amber-500",
                toneClass: adjustN === 0 ? "bg-emerald-500" : "bg-amber-500",
                badge: "pilotage",
                valueClassName: adjustN > 0 ? "text-amber-600 dark:text-amber-400" : undefined,
            },
            {
                label: "Alertes",
                value: alerts,
                hint: "Sur le périmètre monitoring",
                progressPct: alerts === 0 ? 100 : alertPct,
                barClass: alerts === 0 ? "bg-emerald-500" : alerts > 2 ? "bg-red-500" : "bg-amber-500",
                toneClass: alerts === 0 ? "bg-emerald-500" : alerts > 2 ? "bg-red-500" : "bg-amber-500",
                badge: "monitoring",
                valueClassName:
                    alerts > 2
                        ? "text-red-600 dark:text-red-400"
                        : alerts > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : undefined,
            },
        ] as const;
    }, [monitoringActiveAlerts, overviewSummary]);

    return (
        <div className="space-y-6">
            {load === "loading" ? (
                <div className="flex min-h-48 items-center justify-center rounded-2xl border border-secondary bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("common:loading")} />
                </div>
            ) : null}

            {load === "err" ? (
                <div className="rounded-2xl border border-secondary bg-primary p-6">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>Tableau de bord indisponible</EmptyState.Title>
                            <EmptyState.Description>{error}</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <Button color="secondary" size="sm" onClick={() => void fetchAll()}>
                                {t("common:retry")}
                            </Button>
                        </EmptyState.Footer>
                    </EmptyState>
                </div>
            ) : null}

            {load === "ok" ? (
                <div className="space-y-7">
                    {/* Hero */}
                    <section className="grid grid-cols-[minmax(0,1fr)_10.5rem] items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_12.5rem] md:grid-cols-[minmax(0,1fr)_14rem] lg:grid-cols-[minmax(0,1fr)_18rem]">
                        <article className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-blue-900 shadow-xs ring-1 ring-blue-200/80 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100 dark:ring-blue-900 md:p-5">
                            <div className="min-w-0 space-y-3">
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-quaternary">Cockpit stratégique</p>
                                    <h1 className="text-2xl font-semibold tracking-tight text-primary md:text-3xl">Dashboard Manager</h1>
                                    <p className="max-w-3xl text-sm text-secondary">{heroSubtitle}</p>
                                </div>
                                <p className="max-w-2xl line-clamp-2 text-xs text-tertiary md:text-sm">{merged.portfolioExplanation}</p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tertiary">
                                    <span>Dernière analyse: {merged.lastAnalysis ? formatRelativeFr(merged.lastAnalysis) : "—"}</span>
                                </div>
                            </div>
                        </article>
                        <aside className="flex h-full min-h-32 flex-col justify-between rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-blue-900 shadow-xs ring-1 ring-blue-200/80 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100 dark:ring-blue-900 sm:p-4 lg:p-5">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-quaternary">Portefeuille</p>
                                    <p className="mt-1.5 text-3xl font-semibold tabular-nums leading-none text-primary sm:text-4xl md:text-5xl">{totalDisplay}</p>
                                    <p className="mt-1.5 text-xs text-tertiary">projets total</p>
                                </div>
                                <Button color="secondary" size="sm" href={paths.projects} className="mt-3 w-full">
                                    Voir mes projets
                                </Button>
                        </aside>
                    </section>

                    {/* Actions prioritaires */}
                    <div className="space-y-6">
                    {/* KPI */}
                        <section className="pt-1">
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                        {kpiCards.map((card) => (
                            <KpiBarCard key={card.label} {...card} />
                        ))}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-base font-semibold text-primary">Attention requise</h2>
                                    <p className="mt-0.5 text-xs text-tertiary">Décisions prioritaires à traiter en premier</p>
                                </div>
                                <Link to={paths.decisionLog} className="text-xs font-semibold text-brand-secondary underline">
                                    Voir tout
                                </Link>
                            </div>
                            <div className="mt-3 rounded-xl border border-secondary bg-secondary/20 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-quaternary">Signal portefeuille</p>
                                <p className="mt-1 text-sm font-semibold text-primary">{merged.portfolioStatus}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-secondary">{merged.portfolioExplanation}</p>
                                {overviewPriorityActions.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {overviewPriorityActions.slice(0, 3).map((line, index) => (
                                            <span key={`pa-${index}`} className="rounded-full bg-brand-primary_alt px-2 py-0.5 text-[11px] text-brand-secondary">
                                                {line}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            {priorityProjects.length === 0 ? <p className="mt-4 text-sm text-tertiary">Aucune priorité détectée.</p> : null}
                            <div className="mt-3 grid gap-3 xl:grid-cols-2">
                                {priorityProjects.slice(0, 4).map((item) => {
                                    const { id, i, name, pill, tone, insightSummary, recommendedAction } = item;
                                    return (
                                        <article
                                            key={`rd-${i}`}
                                            className={cx(
                                                "rounded-xl border p-3.5 shadow-xs ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                                                priorityToneClasses(tone),
                                            )}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="line-clamp-1 text-sm font-semibold text-primary">{name}</p>
                                                <span
                                                    className={cx(
                                                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                                                        priorityToneBadgeClasses(tone),
                                                    )}
                                                >
                                                    {priorityToneLabel(tone)}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <Badge type="pill-color" size="sm" color={pill.color}>
                                                    {pill.label}
                                                </Badge>
                                                <span className="line-clamp-1 text-[11px] text-tertiary">{recommendedAction}</span>
                                            </div>
                                            <p className="mt-2 line-clamp-2 text-xs text-secondary">{insightSummary}</p>
                                            {id ? (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Button
                                                        color="secondary"
                                                        size="sm"
                                                        onClick={() => openWhatIf({ projectId: id, projectName: name })}
                                                    >
                                                        Simuler
                                                    </Button>
                                                    <Button color="primary" size="sm" href={paths.project(id)}>
                                                        Ouvrir projet
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </article>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-base font-semibold text-primary">Alertes récentes</h2>
                                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-200">
                                    {monitoringActiveAlerts} active{monitoringActiveAlerts > 1 ? "s" : ""}
                                </span>
                    </div>
                            <p className="mt-1 text-xs text-tertiary">
                                Monitoring en temps réel{monitoringHighAlerts > 0 ? ` · ${monitoringHighAlerts} niveau élevé` : ""}
                            </p>
                            {monitoringAlertPreview.length === 0 ? (
                                <p className="mt-4 rounded-lg border border-secondary bg-secondary/20 px-3 py-2 text-sm text-tertiary">
                                    Aucune alerte active.
                                </p>
                            ) : (
                                <ul className="mt-3 space-y-2 text-sm text-secondary">
                                    {monitoringAlertPreview.slice(0, 5).map((row, i) => (
                                        <li
                                            key={`al-${i}`}
                                            className="rounded-lg border border-secondary/80 bg-secondary/20 px-3 py-2 transition-all duration-200 hover:bg-secondary/30"
                                        >
                                            <p className="line-clamp-1 font-medium text-primary">
                                                {formatRowText(getRowField(row, ["project_name", "name", "title", "project_id"]))}
                                            </p>
                                            <p className="mt-0.5 line-clamp-2 text-xs text-secondary">
                                                {formatRowText(
                                                    getRowField(row, ["alert", "message", "detail", "alert_message", "risk", "load_status"]),
                                                )}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                                </div>

                </div>
            ) : null}
        </div>
    );
}
