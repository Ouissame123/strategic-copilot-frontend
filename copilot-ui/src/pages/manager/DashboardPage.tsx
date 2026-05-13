import { useEffect, useMemo } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useDashboard } from "@/hooks/useDashboard";
import { Link, useLocation } from "react-router";
import { Share04 } from "@untitledui/icons";
import type { CopilotDecisionItem, DecisionLabel, NotificationItem, ProjectKpi } from "@/types/api.types";
import { usePatchAlert } from "@/hooks/useNotifications";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { formatRelativeFromMs, formatRelativeShort } from "@/lib/format-relative-short";
import { localeForDateFormatting } from "@/lib/ui-locale";

function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

function Sparkline({
    points,
    tone,
}: {
    points: number[];
    tone: "neutral" | "info" | "warning" | "danger" | "brand";
}) {
    const w = 132;
    const h = 32;
    const safePoints = points.filter((p) => Number.isFinite(p));
    if (safePoints.length < 2) return null;
    const max = Math.max(...safePoints);
    const min = Math.min(...safePoints);
    const range = max - min || 1;
    const step = w / (safePoints.length - 1);
    const d = safePoints
        .map((p, i) => {
            const x = i * step;
            const y = h - ((p - min) / range) * (h - 6) - 3;
            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ");
    const cls =
        tone === "danger"
            ? "text-red-500"
            : tone === "warning"
              ? "text-amber-500"
              : tone === "info"
                ? "text-blue-500"
                : tone === "brand"
                  ? "text-brand-secondary"
                  : "text-secondary";

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={`mt-3 block ${cls}`} aria-hidden>
            <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Santé globale : score haut = mieux → arc vert / orange / rouge */
function healthGaugeColor(score: number): string {
    if (score >= 7.5) return "#22c55e";
    if (score >= 5) return "#ea580c";
    return "#dc2626";
}

/** Viabilité projet (0–10) : plus bas = plus fragile → barre « danger » */
function viabilityBarColor(score: number): string {
    if (score >= 7) return "#dc2626";
    if (score >= 5) return "#f59e0b";
    return "#22c55e";
}

function decisionTone(decision: string | undefined): string {
    const d = (decision ?? "").toLowerCase();
    if (d === "stop") return "text-red-600";
    if (d === "adjust") return "text-amber-600";
    if (d === "continue" || d === "proceed") return "text-emerald-600";
    return "text-secondary";
}

function healthTone(label: string | undefined): string {
    const value = (label ?? "").toLowerCase();
    if (value === "healthy") return "text-emerald-600";
    if (value === "watch") return "text-amber-600";
    if (value === "attention") return "text-orange-600";
    if (value === "critical") return "text-red-600";
    return "text-secondary";
}

function severityTone(severity: string | undefined): string {
    const value = (severity ?? "").toLowerCase();
    if (value === "critical") return "bg-red-50 text-red-700 border-red-200";
    if (value === "high") return "bg-orange-50 text-orange-700 border-orange-200";
    if (value === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

type DecisionBadgeCode = "critical" | "high" | "ok" | "other";

function decisionRiskBadge(decision: DecisionLabel | undefined): { code: DecisionBadgeCode; label: string } {
    const t = i18n.getFixedT(i18n.language, "common");
    const d = (decision ?? "").toLowerCase();
    if (d === "stop" || d === "reject")
        return { code: "critical", label: t("managerWorkspace.decisionBadge.critical") };
    if (d === "adjust") return { code: "high", label: t("managerWorkspace.decisionBadge.high") };
    if (d === "continue" || d === "proceed") return { code: "ok", label: t("managerWorkspace.decisionBadge.ok") };
    return { code: "other", label: (decision ?? "—").toUpperCase() };
}

function decisionRiskBadgeChipClass(code: DecisionBadgeCode): string {
    if (code === "critical") return "bg-red-50 text-red-800 border-red-200";
    if (code === "high") return "bg-orange-50 text-orange-800 border-orange-200";
    if (code === "ok") return "bg-emerald-50 text-emerald-800 border-emerald-200";
    return "bg-secondary_subtle text-secondary border-secondary";
}

/** Rangée projet fragile : hiérarchie danger (code interne pour styles, libellé traduit affiché). */
function fragileProjectRowTone(code: DecisionBadgeCode): string {
    if (code === "critical")
        return "border-l-4 border-l-red-500 bg-red-50/70 shadow-sm shadow-red-500/15 ring-1 ring-red-500/10 dark:bg-red-950/25 dark:shadow-red-900/20";
    if (code === "high")
        return "border-l-4 border-l-orange-500 bg-orange-50/60 dark:bg-orange-950/20";
    if (code === "ok")
        return "border-l-4 border-l-gray-300 bg-secondary_subtle/50 dark:border-l-gray-600";
    return "border-l-4 border-l-gray-200 bg-primary dark:border-l-gray-700";
}

/** Carte alerte : focus danger par sévérité */
function alertSeverityContainerClass(severity: string | undefined): string {
    const s = (severity ?? "").toLowerCase();
    if (s === "critical")
        return "border-l-4 border-l-red-500 bg-red-50/80 shadow-sm shadow-red-500/20 ring-1 ring-red-500/15 dark:bg-red-950/30 dark:shadow-red-900/25";
    if (s === "high") return "border-l-4 border-l-orange-500 bg-orange-50/60 dark:bg-orange-950/25";
    if (s === "medium") return "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20";
    return "border-l-4 border-l-gray-300 bg-primary dark:border-l-gray-600";
}

function pctClamp(num: number, denom: number): number {
    if (!Number.isFinite(num) || !Number.isFinite(denom) || denom <= 0) return 0;
    return Math.min(100, Math.round((num / denom) * 100));
}

function resolvePriorityHref(link: string): string {
    if (!link) return "/workspace/manager/dashboard";
    const lower = link.toLowerCase();
    // Priorité RH: certains backends envoient /notifications?tab=rh-actions.
    // Cette règle doit passer AVANT la règle générique notifications.
    if (lower.includes("tab=rh-actions")) {
        return "/workspace/rh/manager-requests";
    }
    if (lower.includes("notifications") || lower.startsWith("/notifications")) {
        // Le backend peut envoyer /notifications?... ; on garde cette destination manager.
        return link.startsWith("/workspace/manager") ? link : `/workspace/manager${link}`;
    }
    if (lower.includes("risk") || lower.endsWith("/risks") || link === "/risks")
        return "/workspace/manager/notifications?tab=alerts&filter=severity:critical";
    if (lower.includes("team") || lower.includes("surcharge") || lower.endsWith("/team") || link === "/team")
        return "/workspace/manager/team";
    if (lower.includes("action") || lower.includes("rh") || lower.endsWith("/actions") || link === "/actions")
        return "/workspace/rh/manager-requests";
    if (link.startsWith("/workspace/manager")) return link;
    if (link.startsWith("/")) return `/workspace/manager${link}`;
    return `/workspace/manager/${link}`;
}

/** Titre court + corps distinct si le backend renvoie le même texte deux fois */
function splitNotification(n: NotificationItem): { title: string; body: string | null } {
    const t = i18n.getFixedT(i18n.language, "common");
    const title = (n.title ?? "").trim();
    const msg = (n.message ?? "").trim();
    if (!msg || msg === title) return { title: title || t("managerWorkspace.dashboard.notificationDefault"), body: null };
    if (msg.toLowerCase().startsWith(title.toLowerCase()) && msg.length > title.length) {
        const rest = msg.slice(title.length).replace(/^\s*[·\-\u2014\—:]\s*/i, "").trim();
        return { title, body: rest || null };
    }
    return { title, body: msg };
}

function dedupeDecisionsByProject(decisions: CopilotDecisionItem[]): CopilotDecisionItem[] {
    const seen = new Set<string>();
    return decisions.filter((d) => {
        const k = (d.project_name?.trim() || d.id) as string;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

function confidencePercent(c: number | undefined): number {
    if (c == null || Number.isNaN(c)) return 0;
    if (c <= 1 && c >= 0) return Math.round(c * 100);
    return Math.min(100, Math.max(0, Math.round(c)));
}

function confidenceBarClass(pct: number): string {
    if (pct >= 70) return "bg-emerald-500";
    if (pct >= 45) return "bg-amber-500";
    return "bg-orange-600";
}

function trendColor(delta: number, isPositiveGood: boolean): string {
    const good = isPositiveGood ? delta >= 0 : delta < 0;
    return good ? "text-emerald-500" : "text-red-500";
}

function PremiumKpiCard({
    label,
    value,
    sub,
    href,
    tone,
    trend,
    spark,
}: {
    label: string;
    value: number;
    sub: string;
    href: string;
    tone: "info" | "warning" | "danger" | "brand";
    trend?: { delta: number; positiveGood: boolean; suffix?: string };
    spark?: number[];
}) {
    const { t } = useTranslation("common");
    const borderTone =
        tone === "danger"
            ? "hover:border-red-400/60"
            : tone === "warning"
              ? "hover:border-amber-400/60"
              : tone === "info"
                ? "hover:border-blue-400/60"
                : "hover:border-brand-secondary/60";
    const badgeTone =
        tone === "danger"
            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-200 dark:border-red-900/40"
            : tone === "warning"
              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/25 dark:text-amber-200 dark:border-amber-900/40"
              : tone === "info"
                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/25 dark:text-blue-200 dark:border-blue-900/40"
                : "bg-brand-primary/10 text-brand-secondary border-brand-secondary/30";
    const trendValue = trend?.delta ?? 0;
    const trendCls = trend ? trendColor(trendValue, trend.positiveGood) : "text-tertiary";
    const stableLabel = t("managerWorkspace.dashboard.trendStable");
    const trendLabel = trend
        ? `${trendValue === 0 ? stableLabel : `${trendValue > 0 ? "+" : ""}${trendValue}${trend.suffix ?? ""}`}`
        : null;

    return (
        <Link to={href} className="group block">
            <article
                className={`relative overflow-hidden rounded-2xl border border-secondary bg-primary p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${borderTone}`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">{label}</p>
                        <p className="mt-2 text-3xl font-semibold tabular-nums text-primary">{value}</p>
                        <p className="mt-1 text-xs text-tertiary">{sub}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${badgeTone}`}>
                        {t("managerWorkspace.dashboard.kpiView")}
                    </span>
                </div>
                {trendLabel ? (
                    <p className={`mt-2 text-xs font-medium ${trendCls}`} aria-label="tendance">
                        {trendLabel}
                    </p>
                ) : null}
                {spark ? <Sparkline points={spark} tone={tone} /> : null}
                <span className="pointer-events-none absolute right-3 top-3 text-xs text-tertiary opacity-0 transition group-hover:opacity-100">
                    →
                </span>
            </article>
        </Link>
    );
}

function isValidLabel(v: unknown): boolean {
    if (typeof v !== "string") return false;
    const s = v.trim();
    if (s.length < 3) return false;
    return /[a-zA-ZÀ-ÿ0-9]/.test(s);
}

function pickRhActionTitle(raw: unknown): string {
    const t = i18n.getFixedT(i18n.language, "common");
    return isValidLabel(raw) ? String(raw).trim() : t("managerWorkspace.dashboard.rhUntitled");
}

function inferNotificationSeverity(n: NotificationItem): "critical" | "high" | "medium" | "low" {
    const sev = String((n as unknown as { severity?: string }).severity ?? "").toLowerCase();
    if (sev === "critical" || sev === "high" || sev === "medium" || sev === "low") return sev;
    const text = `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase();
    if (text.includes("critical") || text.includes("critique") || text.includes("150%")) return "critical";
    if (text.includes("high") || text.includes("surcharge") || text.includes("risque")) return "high";
    if (text.includes("medium")) return "medium";
    return "low";
}

function notificationSeverityClasses(severity: "critical" | "high" | "medium" | "low"): { dot: string; badge: string } {
    if (severity === "critical") return { dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200" };
    if (severity === "high") return { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-200" };
    if (severity === "medium") return { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" };
    return { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" };
}

const GAUGE_SIZE = 120;
const GAUGE_STROKE = 8;
const R = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const C = 2 * Math.PI * R;

function HealthGaugeRing({ score, label, avgViability }: { score: number; label: string; avgViability: number }) {
    const { t } = useTranslation("common");
    const safe = Math.max(0, Math.min(10, score));
    const pct = safe / 10;
    const offset = C * (1 - pct);
    const stroke = healthGaugeColor(safe);

    return (
        <div className="flex shrink-0 flex-col items-center justify-center">
            {/* Cercle + score superposé au centre (le texte n’est plus sous l’anneau) */}
            <div className="relative" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
                <svg
                    width={GAUGE_SIZE}
                    height={GAUGE_SIZE}
                    viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
                    className="block -rotate-90"
                    aria-hidden
                >
                    <circle
                        cx={GAUGE_SIZE / 2}
                        cy={GAUGE_SIZE / 2}
                        r={R}
                        fill="none"
                        stroke="var(--color-border-tertiary)"
                        strokeWidth={GAUGE_STROKE}
                    />
                    <circle
                        cx={GAUGE_SIZE / 2}
                        cy={GAUGE_SIZE / 2}
                        r={R}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={GAUGE_STROKE}
                        strokeLinecap="round"
                        strokeDasharray={C}
                        strokeDashoffset={offset}
                        className="transition-[stroke-dashoffset] duration-500"
                    />
                </svg>
                <div
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
                    aria-live="polite"
                >
                    <p className={`text-2xl font-bold leading-none tabular-nums ${healthTone(label)}`}>
                        {safe.toFixed(1)}
                        <span className="text-sm font-medium text-tertiary"> / 10</span>
                    </p>
                </div>
            </div>
            <p className="mt-3 max-w-[14rem] text-center text-[11px] leading-snug text-tertiary">
                {t("managerWorkspace.dashboard.gaugePrefix")} <span className={healthTone(label)}>{label}</span>
                {" · "}
                {t("managerWorkspace.dashboard.avgViability", { avg: avgViability.toFixed(1) })}
            </p>
        </div>
    );
}

function ProjectScoreBar({ project }: { project: ProjectKpi }) {
    const raw = project.viability_score ?? project.project_health_score ?? 0;
    const score = typeof raw === "number" && !Number.isNaN(raw) ? Math.max(0, Math.min(10, raw)) : 0;
    const pct = (score / 10) * 100;
    const color = viabilityBarColor(score);

    return (
        <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary_subtle">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-semibold tabular-nums" style={{ color }}>
                {score.toFixed(1)}
            </span>
        </div>
    );
}

export default function DashboardPage() {
    const { t } = useTranslation(["common", "nav"]);
    const location = useLocation();
    const { data, isLoading, isError, refetch, isRefetching, dataUpdatedAt } = useDashboard("mine");
    const patchAlert = usePatchAlert();
    const fragileProjects = [...(data?.widgets.fragile_projects ?? [])]
        .sort((a, b) => (a.viability_score ?? 99) - (b.viability_score ?? 99))
        .slice(0, 5);
    const topAlerts = (data?.widgets.top_alerts ?? []).slice(0, 5);
    const latestNotifications = data?.widgets.recent_notifications ?? [];
    const groupedNotifs = useMemo(() => {
        const groups = new Map<string, NotificationItem[]>();
        for (const n of latestNotifications) {
            const match = n.message?.match(/^([A-ZÀ-Ü][a-zà-ü]+ [A-ZÀ-Ü][a-zà-ü]+)/);
            const key = match ? match[1] : `notif-${n.id}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(n);
        }
        return Array.from(groups.entries())
            .map(([talent, notifs]) => ({
                talent,
                severity: inferNotificationSeverity(notifs[0]),
                count: notifs.length,
                messages: notifs.map((n) => n.message),
                latest: notifs[0].created_at,
            }))
            .slice(0, 3);
    }, [latestNotifications]);
    const pendingRhActions = (data?.widgets.pending_rh_actions ?? []).slice(0, 5);
    const recentDecisions = useMemo(() => {
        const raw = (data?.widgets.recent_decisions ?? []).slice(0, 12);
        return dedupeDecisionsByProject(raw).slice(0, 5);
    }, [data?.widgets.recent_decisions]);
    const computedAt = data?.meta?.computed_at;

    const adjustStopTotal =
        data?.kpi_cards.decisions ? data.kpi_cards.decisions.adjust + data.kpi_cards.decisions.stop : 0;
    const kpiAlerts = data?.kpi_cards.alerts.critical_or_high ?? 0;
    const kpiOverload = data?.kpi_cards.team.overloaded ?? 0;
    const avgHealthScore = data?.health?.score ?? 0;
    const attentionLabel =
        avgHealthScore >= 7
            ? t("managerWorkspace.attention.stable")
            : avgHealthScore >= 5
              ? t("managerWorkspace.attention.needsAttention")
              : t("managerWorkspace.attention.immediate");
    const deltaAlerts = kpiAlerts;
    const deltaOverload = kpiOverload;

    useEffect(() => {
        if (!location.hash) return;
        const target = document.querySelector(location.hash);
        if (!target) return;
        const timer = setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
        return () => clearTimeout(timer);
    }, [location.hash, data]);

    return (
        <WorkspacePageShell
            role="manager"
            eyebrow={t("workspaceRoles.manager")}
            title={t("managerWorkspace.dashboard.heroTitle")}
            description={false}
            omitHeader
        >
        <div className="space-y-8">
            {isLoading ? (
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <article
                            key={`dashboard-skeleton-${index}`}
                            className="h-24 animate-pulse rounded-xl border border-secondary bg-primary p-4"
                        />
                    ))}
                </section>
            ) : null}
            {isError ? <p>{t("managerWorkspace.dashboard.loadError")}</p> : null}
            {data ? (
                <div className="space-y-8">
                    <PageHero
                        eyebrow={t("managerWorkspace.dashboard.heroEyebrow")}
                        title={t("managerWorkspace.dashboard.heroTitle")}
                        subtitle={t("managerWorkspace.dashboard.heroSubtitle")}
                        badge={t("workspaceRoles.manager")}
                        actions={
                            <button
                                type="button"
                                className="rounded-lg border border-secondary bg-primary_alt px-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary_subtle disabled:opacity-50"
                                disabled={isLoading || isRefetching}
                                onClick={() => {
                                    void refetch();
                                }}
                            >
                                {t("managerWorkspace.dashboard.refresh")}
                            </button>
                        }
                        metrics={
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-tertiary">
                                <span>
                                    {fragileProjects.length > 0
                                        ? t(
                                              fragileProjects.length > 1
                                                  ? "managerWorkspace.dashboard.fragileWatch_plural"
                                                  : "managerWorkspace.dashboard.fragileWatch",
                                              { count: fragileProjects.length },
                                          )
                                        : t("managerWorkspace.dashboard.noFragileToday")}
                                </span>
                                <span>
                                    {t("managerWorkspace.dashboard.updated", {
                                        time: formatRelativeShort(computedAt),
                                    })}
                                </span>
                            </div>
                        }
                    />

                    <section className="grid gap-4 lg:grid-cols-3">
                        <article className="relative overflow-hidden rounded-2xl border border-secondary bg-primary p-5 shadow-sm lg:col-span-2">
                            <div className="pointer-events-none absolute -left-20 -top-16 size-56 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden />
                            <div className="relative">
                                <div className="min-w-0">
                                    <p className="inline-flex items-center gap-2 rounded-full border border-secondary bg-secondary_subtle/50 px-3 py-1 text-xs font-semibold text-secondary">
                                        {t("managerWorkspace.dashboard.copilotInsight")}
                                    </p>
                                    <p className="mt-3 text-sm leading-relaxed text-secondary md:text-base">{data.headline}</p>
                                </div>
                            </div>
                        </article>

                        <article className="rounded-2xl border border-secondary bg-primary p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-sm font-semibold text-primary">{t("managerWorkspace.dashboard.priorityActions")}</h2>
                                <span className="rounded-full border border-secondary bg-secondary_subtle/50 px-2 py-0.5 text-[11px] font-medium text-tertiary">
                                    {data.priorities.length}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {data.priorities.map((priority) => (
                                    <Link
                                        key={`${priority.icon}-${priority.label}`}
                                        to={resolvePriorityHref(priority.link)}
                                        className="inline-flex items-center gap-2 rounded-full border border-secondary bg-primary px-3 py-1.5 text-xs font-semibold text-secondary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-secondary/60 hover:bg-secondary_subtle"
                                    >
                                        {priority.label}
                                        <Share04 className="size-3.5 shrink-0 opacity-70" aria-hidden />
                                    </Link>
                                ))}
                            </div>
                        </article>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-12">
                        <article className="rounded-2xl border border-secondary bg-primary p-5 shadow-sm lg:col-span-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                                        {t("managerWorkspace.dashboard.globalHealth")}
                                    </p>
                                    <p className={`mt-1 text-xs font-medium ${healthTone(data.health.label)}`}>{attentionLabel}</p>
                                </div>
                                <span className="rounded-full border border-secondary bg-secondary_subtle/50 px-2 py-0.5 text-[10px] font-semibold uppercase text-tertiary">
                                    {data.health.label}
                                </span>
                            </div>
                            <div className="mt-4 flex items-center justify-center">
                                <HealthGaugeRing score={data.health.score} label={data.health.label} avgViability={data.health.avg_viability} />
                            </div>
                        </article>

                        <div className="grid gap-4 lg:col-span-9 lg:grid-cols-4">
                            <PremiumKpiCard
                                label={t("managerWorkspace.dashboard.kpiActiveProjects")}
                                value={data.kpi_cards.projects.active}
                                sub={t("managerWorkspace.dashboard.kpiTotal", { count: data.kpi_cards.projects.total })}
                                href="/workspace/manager/projects?status=active"
                                tone="info"
                                spark={[
                                    clamp(data.kpi_cards.projects.total, 0, 1000),
                                    clamp(data.kpi_cards.projects.active, 0, 1000),
                                    clamp(fragileProjects.length, 0, 1000),
                                ]}
                            />
                            <PremiumKpiCard
                                label={t("managerWorkspace.dashboard.kpiAdjustStop")}
                                value={adjustStopTotal}
                                sub={t("managerWorkspace.dashboard.kpiUnscored", { count: data.kpi_cards.decisions.unscored })}
                                href="/workspace/manager/projects?status=stop"
                                tone="warning"
                                trend={{ delta: adjustStopTotal, positiveGood: false }}
                                spark={[
                                    clamp(data.kpi_cards.decisions.adjust, 0, 999),
                                    clamp(data.kpi_cards.decisions.stop, 0, 999),
                                    clamp(data.kpi_cards.decisions.unscored, 0, 999),
                                ]}
                            />
                            <PremiumKpiCard
                                label={t("managerWorkspace.dashboard.kpiAlerts")}
                                value={kpiAlerts}
                                sub={t("managerWorkspace.dashboard.kpiOpen", { count: data.kpi_cards.alerts.total_open })}
                                href="/workspace/manager/risks?severity=critical"
                                tone="danger"
                                trend={{ delta: deltaAlerts, positiveGood: false }}
                                spark={[
                                    clamp(data.kpi_cards.alerts.total_open, 0, 999),
                                    clamp(kpiAlerts, 0, 999),
                                    clamp(topAlerts.length, 0, 999),
                                ]}
                            />
                            <PremiumKpiCard
                                label={t("managerWorkspace.dashboard.kpiOverload")}
                                value={kpiOverload}
                                sub={t("managerWorkspace.dashboard.kpiTeam", { count: data.kpi_cards.team.size })}
                                href="/workspace/manager/team?filter=overloaded"
                                tone="brand"
                                trend={{ delta: deltaOverload, positiveGood: false }}
                                spark={[
                                    clamp(data.kpi_cards.team.size, 0, 999),
                                    clamp(kpiOverload, 0, 999),
                                    clamp(pendingRhActions.length, 0, 999),
                                ]}
                            />
                        </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-3">
                        <article className="rounded-2xl border border-secondary bg-primary p-5 shadow-sm lg:col-span-2">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-primary">{t("managerWorkspace.dashboard.topFragile")}</h3>
                                <Link to="/workspace/manager/projects" className="text-xs font-semibold text-brand-secondary hover:underline">
                                    {t("managerWorkspace.dashboard.viewAllProjects")}
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {fragileProjects.map((project) => {
                                    const badge = decisionRiskBadge(project.decision);
                                    const em = t("managerWorkspace.relative.emDash");
                                    return (
                                        <div
                                            key={project.id}
                                            className={`flex flex-col gap-2 rounded-xl px-3 py-3 sm:flex-row sm:items-start sm:justify-between ${fragileProjectRowTone(badge.code)} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-medium text-primary">{project.name}</p>
                                                    <span
                                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${decisionRiskBadgeChipClass(badge.code)}`}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                </div>
                                                <ProjectScoreBar project={project} />
                                                <p className="mt-1 text-xs text-tertiary">
                                                    {t("managerWorkspace.dashboard.milestone", {
                                                        date: project.milestone_at ? project.milestone_at.slice(0, 10) : em,
                                                    })}
                                                    {project.delay_days != null
                                                        ? ` ${t("managerWorkspace.dashboard.delay", { days: project.delay_days })}`
                                                        : ""}
                                                    {project.critical_alerts_count != null
                                                        ? ` ${t("managerWorkspace.dashboard.criticalAlerts", { count: project.critical_alerts_count })}`
                                                        : ""}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                                                <span className={`text-xs font-semibold uppercase ${decisionTone(project.decision)}`}>
                                                    {project.decision ?? em}
                                                </span>
                                                <Link
                                                    to={managerProjectsOpenModalPath(project.id)}
                                                    className="rounded-lg border border-secondary bg-primary_alt px-2.5 py-1.5 text-xs font-semibold text-brand-secondary hover:bg-secondary_subtle"
                                                >
                                                    {t("managerWorkspace.dashboard.adjust")}
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                                {fragileProjects.length === 0 ? (
                                    <p className="text-sm text-tertiary">{t("managerWorkspace.dashboard.noFragile")}</p>
                                ) : null}
                            </div>
                        </article>

                        <article className="rounded-2xl border border-secondary bg-primary p-5 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-primary">{t("managerWorkspace.dashboard.topAlerts")}</h3>
                                <Link to="/workspace/manager/risks" className="text-xs font-semibold text-brand-secondary hover:underline">
                                    {t("managerWorkspace.dashboard.viewAlerts")}
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {topAlerts.map((alert) => {
                                    const sevKey = String(alert.severity ?? "").toLowerCase();
                                    const sevLabel =
                                        sevKey === "critical" || sevKey === "high" || sevKey === "medium" || sevKey === "low"
                                            ? t(`managerWorkspace.commonSeverity.${sevKey as "critical" | "high" | "medium" | "low"}`)
                                            : alert.severity;
                                    return (
                                    <div
                                        key={alert.id}
                                        className={`block rounded-r-lg rounded-l-md px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${alertSeverityContainerClass(alert.severity)}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-primary">
                                                {alert.project_name ?? t("managerWorkspace.dashboard.projectUndefined")}
                                            </p>
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${severityTone(alert.severity)}`}
                                            >
                                                {sevLabel}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-tertiary">
                                            {alert.message ?? alert.title ?? t("managerWorkspace.dashboard.alertFallback")}
                                        </p>
                                        <p className="mt-1 text-[11px] text-tertiary">
                                            {t("managerWorkspace.dashboard.alertHours", { hours: alert.age_hours ?? "?" })}
                                        </p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <Link
                                                to={alert.project_id ? managerProjectsOpenModalPath(alert.project_id) : "/workspace/manager/risks"}
                                                className="text-[11px] font-semibold text-brand-secondary hover:underline"
                                            >
                                                {t("managerWorkspace.dashboard.openProject")}
                                            </Link>
                                            <button
                                                type="button"
                                                className="rounded-lg border border-secondary bg-primary_alt px-2.5 py-1 text-[11px] font-semibold text-secondary hover:bg-secondary_subtle"
                                                onClick={() => patchAlert.mutate({ id: alert.id, action: "resolve" })}
                                            >
                                                {t("managerWorkspace.dashboard.resolve")}
                                            </button>
                                        </div>
                                    </div>
                                );
                                })}
                                {topAlerts.length === 0 ? (
                                    <p className="text-sm text-tertiary">{t("managerWorkspace.dashboard.noCriticalAlerts")}</p>
                                ) : null}
                            </div>
                        </article>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                        <article
                            id="rh-actions"
                            className="rounded-2xl border border-secondary bg-primary p-5 shadow-sm"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-primary">{t("managerWorkspace.dashboard.pendingRh")}</h3>
                                <span className="rounded-full border border-secondary bg-secondary_subtle/50 px-2 py-0.5 text-[11px] font-medium text-tertiary">
                                    {data.kpi_cards.pending_rh_actions}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {pendingRhActions.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex flex-col gap-2 rounded-xl border border-secondary bg-primary_alt px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-primary">{pickRhActionTitle(item.message ?? item.type)}</p>
                                            <p className="text-xs text-tertiary">
                                                {item.project_name ?? t("managerWorkspace.pendingRh.projectUnknown")} ·{" "}
                                                {formatRelativeShort(item.created_at)}
                                            </p>
                                        </div>
                                        <Link
                                            to="/workspace/rh/manager-requests"
                                            className="shrink-0 self-end rounded-lg border border-secondary bg-primary px-2.5 py-1.5 text-xs font-semibold text-brand-secondary hover:bg-secondary_subtle sm:self-center"
                                        >
                                            {t("managerWorkspace.dashboard.respond")}
                                        </Link>
                                    </div>
                                ))}
                                {pendingRhActions.length === 0 ? (
                                    <p className="text-sm text-tertiary">{t("managerWorkspace.dashboard.noPendingRh")}</p>
                                ) : null}
                            </div>
                        </article>

                        <article className="rounded-2xl border border-secondary bg-primary p-5 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-primary">{t("managerWorkspace.dashboard.recentDecisions")}</h3>
                                <Link to="/workspace/manager/decision-log" className="text-xs font-semibold text-brand-secondary hover:underline">
                                    {t("managerWorkspace.dashboard.openJournal")}
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {recentDecisions.map((decision) => {
                                    const pct = confidencePercent(decision.confidence);
                                    const decisionProjectId = (decision as unknown as { project_id?: string }).project_id;
                                    const em = t("managerWorkspace.relative.emDash");
                                    return (
                                        <div key={decision.id} className="rounded-xl border border-secondary bg-primary_alt px-3 py-3">
                                            <p className="text-sm font-medium text-primary">
                                                {decision.decision} — {decision.project_name ?? t("managerWorkspace.dashboard.projectFallback")}
                                            </p>
                                            {decision.reason && decision.reason !== String(decision.project_name) ? (
                                                <p className="mt-0.5 line-clamp-2 text-xs text-tertiary">{decision.reason}</p>
                                            ) : null}
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[10px] uppercase tracking-wide text-tertiary">
                                                    {t("managerWorkspace.dashboard.confidence")}
                                                </span>
                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary_subtle">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${confidenceBarClass(pct)}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium tabular-nums text-secondary">{pct}%</span>
                                            </div>
                                            <p className="mt-1 text-[11px] text-tertiary">
                                                {t("managerWorkspace.dashboard.scoreLine", {
                                                    score: decision.score ?? em,
                                                    time: formatRelativeShort(decision.created_at),
                                                })}
                                            </p>
                                            {pct >= 70 && decisionProjectId ? (
                                                <div className="mt-2">
                                                    <Link
                                                        to={managerProjectsOpenModalPath(decisionProjectId)}
                                                        className="text-xs font-semibold text-brand-secondary hover:underline"
                                                    >
                                                        {t("managerWorkspace.dashboard.apply")}
                                                    </Link>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                                {recentDecisions.length === 0 ? (
                                    <p className="text-sm text-tertiary">{t("managerWorkspace.dashboard.noRecentDecisions")}</p>
                                ) : null}
                            </div>
                        </article>
                    </section>

                    <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-primary">{t("managerWorkspace.dashboard.lastNotifications")}</h3>
                            <Link to="/workspace/manager/notifications" className="text-xs font-semibold text-brand-secondary hover:underline">
                                {t("managerWorkspace.dashboard.openNotifications")}
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {groupedNotifs.map((group) => {
                                const sev = group.severity;
                                const sevClasses = notificationSeverityClasses(sev);
                                return (
                                    <Link
                                        key={group.talent}
                                        to="/workspace/manager/notifications"
                                        className="flex items-start justify-between gap-3 rounded-xl border border-secondary bg-primary_alt px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary_subtle hover:shadow-sm"
                                    >
                                        <div className="min-w-0 flex items-start gap-2">
                                            <span
                                                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${sevClasses.dot}`}
                                                aria-hidden
                                            />
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-medium text-primary">
                                                        {group.talent}
                                                        {group.count > 1 ? (
                                                            <span className="ml-2 text-xs font-normal text-tertiary">
                                                                {t("managerWorkspace.dashboard.alertsCount", { count: group.count })}
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${sevClasses.badge}`}>
                                                        {t(`managerWorkspace.commonSeverity.${sev}`)}
                                                    </span>
                                                </div>
                                                {group.count === 1 ? (
                                                    <p className="mt-0.5 text-xs text-tertiary">{group.messages[0]}</p>
                                                ) : (
                                                    <ul className="mt-1 space-y-1 text-xs text-tertiary">
                                                        {group.messages.map((m, i) => (
                                                            <li key={`${group.talent}-${i}`}>• {m}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                        <span className="whitespace-nowrap text-xs text-tertiary">
                                            {formatRelativeShort(group.latest)}
                                        </span>
                                    </Link>
                                );
                            })}
                            {groupedNotifs.length === 0 ? (
                                <p className="text-sm text-tertiary">{t("managerWorkspace.dashboard.noRecentNotifications")}</p>
                            ) : null}
                        </div>
                    </section>

                    <footer className="flex items-center justify-between rounded-2xl border border-secondary bg-primary px-4 py-3 text-xs text-tertiary">
                        <span
                            title={dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString(localeForDateFormatting(i18n.language)) : ""}
                            className="cursor-help"
                        >
                            {t("managerWorkspace.dashboard.footerUpdated", {
                                time: dataUpdatedAt ? formatRelativeFromMs(dataUpdatedAt) : formatRelativeShort(computedAt),
                            })}
                        </span>
                        <button
                            type="button"
                            className="rounded-lg border border-secondary bg-primary_alt px-2.5 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary_subtle disabled:opacity-50"
                            disabled={isLoading || isRefetching}
                            onClick={() => {
                                void refetch();
                            }}
                        >
                            {t("managerWorkspace.dashboard.refresh")}
                        </button>
                    </footer>
                </div>
            ) : null}
        </div>
        </WorkspacePageShell>
    );
}
