import { useEffect, useMemo } from "react";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useDashboard } from "@/hooks/useDashboard";
import { Link, useLocation } from "react-router";
import type { DecisionLabel, ProjectKpi } from "@/types/api.types";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { formatRelativeFromMs, formatRelativeShort } from "@/lib/format-relative-short";
import { localeForDateFormatting } from "@/lib/ui-locale";
import { AnalystSection } from "@/components/manager/analyst-section";
import { MatchmakerSection } from "@/components/manager/matchmaker-section";
import { DashboardHeroCopilot } from "@/components/manager/dashboard/DashboardHeroCopilot";
import { DashboardKpiCard } from "@/components/manager/dashboard/DashboardKpiCard";
import { DashboardStickyNav } from "@/components/manager/dashboard/DashboardStickyNav";
import { MANAGER_DASHBOARD_SECTION_IDS, viabilityBarColor } from "@/lib/manager-dashboard-display";

function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

function decisionTone(decision: string | undefined): string {
    const d = (decision ?? "").toLowerCase();
    if (d === "stop") return "text-red-600";
    if (d === "adjust") return "text-amber-600";
    if (d === "continue" || d === "proceed") return "text-emerald-600";
    return "text-secondary";
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
        return "/workspace/manager/hr-requests";
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
        return "/workspace/manager/hr-requests";
    if (link.startsWith("/workspace/manager")) return link;
    if (link.startsWith("/")) return `/workspace/manager${link}`;
    return `/workspace/manager/${link}`;
}

/** Masque la priorité « Répondre à … action(s) RH » : les managers vont sur Demandes RH ailleurs. */
function shouldHideManagerDashboardRhPriorityPill(priority: { label: string; link: string }): boolean {
    const link = priority.link.toLowerCase();
    if (link.includes("tab=rh-actions") || link.includes("rh-actions")) return true;
    const lab = priority.label.toLowerCase();
    if (lab.includes("action(s) rh") || lab.includes("actions rh") || lab.includes("action rh")) return true;
    if (lab.includes("hr action") || lab.includes("hr actions")) return true;
    if ((lab.includes("répondre") || lab.includes("repondre")) && lab.includes("rh")) return true;
    if ((lab.includes("respond") || lab.includes("reply")) && lab.includes("hr") && lab.includes("action")) return true;
    const href = resolvePriorityHref(priority.link);
    if (
        (href === "/workspace/manager/hr-requests" || href.startsWith("/workspace/manager/hr-requests?")) &&
        lab.includes("rh")
    ) {
        return true;
    }
    return false;
}

/* legacy KPI cards removed — use DashboardKpiCard */

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
    const fragileProjects = [...(data?.widgets.fragile_projects ?? [])]
        .sort((a, b) => (a.viability_score ?? 99) - (b.viability_score ?? 99))
        .slice(0, 5);
    const computedAt = data?.meta?.computed_at;
    const visiblePriorities = useMemo(
        () => (data?.priorities ?? []).filter((p) => !shouldHideManagerDashboardRhPriorityPill(p)),
        [data?.priorities],
    );
    const copilotActionLines = useMemo(
        () =>
            visiblePriorities.map((p) => ({
                key: `${p.icon}-${p.label}`,
                label: p.label,
                href: resolvePriorityHref(p.link),
            })),
        [visiblePriorities],
    );

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
    useWorkspaceTopbarMeta(t("managerWorkspace.dashboard.heroTitle"), t("managerWorkspace.dashboard.heroSubtitle"));

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
        <div className="space-y-6">
            {isLoading ? (
                <section className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-2 lg:grid-cols-5 lg:gap-2.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <article
                            key={`dashboard-skeleton-${index}`}
                            className="min-h-[8.75rem] animate-pulse rounded-xl border border-secondary bg-primary p-3 sm:min-h-[9rem]"
                        />
                    ))}
                </section>
            ) : null}
            {isError ? <p>{t("managerWorkspace.dashboard.loadError")}</p> : null}
            {data ? (
                <div className="space-y-6">
                    <DashboardStickyNav />

                    <section id={MANAGER_DASHBOARD_SECTION_IDS.overview} className="scroll-mt-24 space-y-6">
                        <DashboardHeroCopilot headline={data.headline} priorities={copilotActionLines} />

                    <section className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-2 lg:grid-cols-5 lg:gap-2.5">
                        <DashboardKpiCard
                            variant="health"
                            label={t("managerWorkspace.dashboard.globalHealth")}
                            value={data.health.score}
                            sub={`${attentionLabel} · ${t("managerWorkspace.dashboard.avgViability", { avg: data.health.avg_viability.toFixed(1) })}`}
                            healthLabel={data.health.label}
                            href="/workspace/manager/risks"
                            tone="health"
                            positiveGood
                            sparkPoints={[
                                clamp(data.health.avg_viability, 0, 10),
                                clamp(data.health.score, 0, 10),
                            ]}
                        />
                        <DashboardKpiCard
                            label={t("managerWorkspace.dashboard.kpiActiveProjects")}
                            value={data.kpi_cards.projects.active}
                            sub={t("managerWorkspace.dashboard.kpiTotal", { count: data.kpi_cards.projects.total })}
                            href="/workspace/manager/projects?status=active"
                            tone="info"
                            positiveGood
                            sparkPoints={[
                                clamp(data.kpi_cards.projects.total, 0, 1000),
                                clamp(data.kpi_cards.projects.active, 0, 1000),
                                clamp(fragileProjects.length, 0, 1000),
                            ]}
                        />
                        <DashboardKpiCard
                            label={t("managerWorkspace.dashboard.kpiAdjustStop")}
                            value={adjustStopTotal}
                            sub={t("managerWorkspace.dashboard.kpiUnscored", { count: data.kpi_cards.decisions.unscored })}
                            href="/workspace/manager/projects?status=stop"
                            tone="warning"
                            positiveGood={false}
                            sparkPoints={[
                                clamp(data.kpi_cards.decisions.adjust, 0, 999),
                                clamp(data.kpi_cards.decisions.stop, 0, 999),
                                clamp(data.kpi_cards.decisions.unscored, 0, 999),
                            ]}
                        />
                        <DashboardKpiCard
                            label={t("managerWorkspace.dashboard.kpiAlerts")}
                            value={kpiAlerts}
                            sub={t("managerWorkspace.dashboard.kpiAlertsSub", { count: data.kpi_cards.alerts.total_open })}
                            href="/workspace/manager/risks?severity=critical"
                            tone="danger"
                            positiveGood={false}
                            sparkPoints={[
                                clamp(data.kpi_cards.alerts.total_open, 0, 999),
                                clamp(kpiAlerts, 0, 999),
                                clamp(data.kpi_cards.alerts.critical_or_high ?? 0, 0, 999),
                            ]}
                        />
                        <DashboardKpiCard
                            label={t("managerWorkspace.dashboard.kpiOverload")}
                            value={kpiOverload}
                            sub={t("managerWorkspace.dashboard.kpiTeam", { count: data.kpi_cards.team.size })}
                            href="/workspace/manager/team?filter=overloaded"
                            tone="brand"
                            positiveGood={false}
                            sparkPoints={[
                                clamp(data.kpi_cards.team.size, 0, 999),
                                clamp(kpiOverload, 0, 999),
                                clamp(data.kpi_cards.pending_rh_actions ?? 0, 0, 999),
                            ]}
                        />
                    </section>
                    </section>

                    <section id={MANAGER_DASHBOARD_SECTION_IDS.fragile} className="scroll-mt-24">
                        <article className="rounded-2xl border border-secondary bg-primary p-5 shadow-sm">
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

                    </section>

                    <MatchmakerSection />

                    <section id={MANAGER_DASHBOARD_SECTION_IDS.analyst} className="scroll-mt-24">
                        <AnalystSection />
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
