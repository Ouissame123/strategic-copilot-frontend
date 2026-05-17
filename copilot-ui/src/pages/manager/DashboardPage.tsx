import { useEffect, useMemo } from "react";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-shell";
import { useWorkspaceTopbarMeta } from "@/layouts/workspace-topbar-meta";
import { useDashboard } from "@/hooks/useDashboard";
import { Link, useLocation } from "react-router";
import { Share04 } from "@untitledui/icons";
import type { DecisionLabel, ProjectKpi } from "@/types/api.types";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { formatRelativeFromMs, formatRelativeShort } from "@/lib/format-relative-short";
import { localeForDateFormatting } from "@/lib/ui-locale";
import {
    buildExecutiveRecommendations,
    buildSkillGapsSorted,
    buildUnassignedGroupsByProject,
    looksLikeUuidOrTechnicalId,
    type MatchmakerRecommendationRow,
    type MatchmakerSkillGapRow,
    type MatchmakerUnassignedGroup,
} from "@/lib/matchmaker-display";
import { AnalystSection } from "@/components/manager/analyst-section";

function clamp(n: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, n));
}

function Sparkline({
    points,
    tone,
    compact,
}: {
    points: number[];
    tone: "neutral" | "info" | "warning" | "danger" | "brand";
    /** Variante plus basse pour la rangée KPI compacte. */
    compact?: boolean;
}) {
    const w = compact ? 88 : 132;
    const h = compact ? 22 : 32;
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
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={`${compact ? "mt-2" : "mt-3"} block ${cls}`} aria-hidden>
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

function readMatchmakerNumber(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function formatMatchmakerStatDisplay(n: number | null): string {
    if (n === null) return "—";
    return String(n);
}

function formatMatchmakerScore10(n: number | null): string {
    if (n === null) return "—";
    return `${n.toFixed(1)} / 10`;
}

function MatchmakerMiniKpiCard({ label, value }: { label: string; value: string }) {
    return (
        <article className="rounded-xl border border-secondary/90 bg-primary px-4 py-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-primary">{value}</p>
        </article>
    );
}

function matchmakerExecutiveBorderClass(rank: number): string {
    if (rank >= 4) return "border-l-[3px] border-l-red-500 pl-3.5";
    if (rank >= 3) return "border-l-[3px] border-l-orange-500 pl-3.5";
    if (rank >= 2) return "border-l-[3px] border-l-amber-500 pl-3.5";
    if (rank >= 1) return "border-l-[3px] border-l-emerald-600/80 pl-3.5";
    return "border-l-[3px] border-l-gray-300 pl-3.5 dark:border-l-gray-600";
}

function matchmakerExecutiveBadgeClass(rank: number): string {
    if (rank >= 4) return "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";
    if (rank >= 3) return "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100";
    if (rank >= 2) return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100";
    if (rank >= 1) return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100";
    return "border-secondary bg-secondary_subtle text-secondary";
}

function matchmakerPriorityLabelForRow(
    row: MatchmakerRecommendationRow,
    t: (key: string) => string,
): string {
    const raw = row.priorityRaw?.trim() ?? "";
    if (raw && !looksLikeUuidOrTechnicalId(raw) && raw.length <= 36) return raw;
    const r = row.severityRank;
    if (r >= 4) return t("managerWorkspace.commonSeverity.critical");
    if (r >= 3) return t("managerWorkspace.commonSeverity.high");
    if (r >= 2) return t("managerWorkspace.commonSeverity.medium");
    if (r >= 1) return t("managerWorkspace.commonSeverity.low");
    return t("managerWorkspace.dashboard.matchmakerPriorityUnspecified");
}

function MatchmakerRecommendationsBlock({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: unknown[];
    emptyLabel: string;
}) {
    const { t } = useTranslation("common");
    const rows = useMemo(() => buildExecutiveRecommendations(items, 5), [items]);
    const showEmpty = items.length === 0 || rows.length === 0;

    return (
        <article className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl border border-secondary/80 bg-primary shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <div className="border-b border-secondary/60 bg-gradient-to-r from-secondary_subtle/40 to-transparent px-5 py-4 dark:from-secondary_subtle/15">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold tracking-tight text-primary">{title}</h4>
                    <span className="shrink-0 rounded-full border border-brand-secondary/35 bg-brand-primary/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">
                        Matchmaker
                    </span>
                </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
                {showEmpty ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-12 text-center dark:bg-secondary_subtle/10">
                        <p className="max-w-xs text-sm leading-relaxed text-tertiary">{emptyLabel}</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {rows.map((row) => (
                            <li
                                key={row.key}
                                className={`rounded-xl border border-secondary/70 bg-primary_alt/70 py-3 pr-3 dark:bg-secondary_subtle/25 ${matchmakerExecutiveBorderClass(row.severityRank)}`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                                    <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-primary">{row.projectName}</p>
                                    <span
                                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${matchmakerExecutiveBadgeClass(row.severityRank)}`}
                                    >
                                        {matchmakerPriorityLabelForRow(row, t)}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-secondary">{row.actionSummary}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </article>
    );
}

function MatchmakerUnassignedBlock({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: unknown[];
    emptyLabel: string;
}) {
    const { t } = useTranslation("common");
    const groups = useMemo(() => buildUnassignedGroupsByProject(items, 5), [items]);
    const showEmpty = items.length === 0 || groups.length === 0;

    return (
        <article className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl border border-secondary/80 bg-primary shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <div className="border-b border-secondary/60 bg-gradient-to-r from-secondary_subtle/40 to-transparent px-5 py-4 dark:from-secondary_subtle/15">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold tracking-tight text-primary">{title}</h4>
                    <span className="shrink-0 rounded-full border border-brand-secondary/35 bg-brand-primary/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">
                        Matchmaker
                    </span>
                </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
                {showEmpty ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-12 text-center dark:bg-secondary_subtle/10">
                        <p className="max-w-xs text-sm leading-relaxed text-tertiary">{emptyLabel}</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {groups.map((g: MatchmakerUnassignedGroup) => (
                            <li
                                key={g.key}
                                className="rounded-xl border border-secondary/70 border-l-[3px] border-l-indigo-600 bg-primary_alt/70 py-3 pl-4 pr-3 dark:bg-secondary_subtle/25"
                            >
                                <p className="text-sm font-semibold leading-snug text-primary">{g.projectName}</p>
                                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                                    {t("managerWorkspace.dashboard.matchmakerCandidatesCaption")}
                                </p>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {g.candidates.map((name) => (
                                        <span
                                            key={`${g.key}-${name}`}
                                            className="rounded-full border border-secondary/80 bg-primary px-2.5 py-1 text-xs font-medium text-secondary shadow-sm"
                                        >
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </article>
    );
}

function MatchmakerSkillGapsBlock({
    title,
    items,
    emptyLabel,
}: {
    title: string;
    items: unknown[];
    emptyLabel: string;
}) {
    const { t } = useTranslation("common");
    const rows = useMemo(() => buildSkillGapsSorted(items, 5), [items]);
    const showEmpty = items.length === 0 || rows.length === 0;

    return (
        <article className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl border border-secondary/80 bg-primary shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <div className="border-b border-secondary/60 bg-gradient-to-r from-secondary_subtle/40 to-transparent px-5 py-4 dark:from-secondary_subtle/15">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold tracking-tight text-primary">{title}</h4>
                    <span className="shrink-0 rounded-full border border-brand-secondary/35 bg-brand-primary/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-secondary">
                        Matchmaker
                    </span>
                </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
                {showEmpty ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-secondary/80 bg-primary_alt/80 px-4 py-12 text-center dark:bg-secondary_subtle/10">
                        <p className="max-w-xs text-sm leading-relaxed text-tertiary">{emptyLabel}</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {rows.map((row: MatchmakerSkillGapRow) => (
                            <li
                                key={row.key}
                                className="rounded-xl border border-secondary/70 border-l-[3px] border-l-amber-600 bg-primary_alt/70 px-4 py-3 dark:bg-secondary_subtle/25"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-primary">{row.title}</p>
                                    {row.occurrenceCount > 0 ? (
                                        <span className="shrink-0 rounded-full border border-secondary bg-primary px-2 py-0.5 text-[10px] font-semibold tabular-nums text-secondary">
                                            {t("managerWorkspace.dashboard.matchmakerOccurrencesBadge", {
                                                count: row.occurrenceCount,
                                            })}
                                        </span>
                                    ) : null}
                                </div>
                                {row.subtitle ? <p className="mt-1.5 text-xs leading-relaxed text-tertiary">{row.subtitle}</p> : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </article>
    );
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

function trendColor(delta: number, isPositiveGood: boolean): string {
    const good = isPositiveGood ? delta >= 0 : delta < 0;
    return good ? "text-emerald-500" : "text-red-500";
}

/** Coque visuelle commune pour la rangée KPI (santé + métriques). */
const MANAGER_KPI_CARD_CLASS =
    "relative flex h-full min-h-[8.75rem] flex-col overflow-hidden rounded-xl border border-secondary bg-primary p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:min-h-[9rem]";

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
        <Link to={href} className="group block h-full min-h-0">
            <article className={`${MANAGER_KPI_CARD_CLASS} ${borderTone}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{label}</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums leading-tight text-primary">{value}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-tertiary">{sub}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none ${badgeTone}`}>
                        {t("managerWorkspace.dashboard.kpiView")}
                    </span>
                </div>
                {trendLabel ? (
                    <p className={`mt-1 text-[11px] font-medium leading-snug ${trendCls}`} aria-label="tendance">
                        {trendLabel}
                    </p>
                ) : null}
                {spark ? <Sparkline points={spark} tone={tone} compact /> : null}
                <span className="pointer-events-none absolute right-2.5 top-2.5 text-xs text-tertiary opacity-0 transition group-hover:opacity-100">
                    →
                </span>
            </article>
        </Link>
    );
}

/** Anneau de santé compact (le score est affiché dans la carte, pas au centre du cercle). */
function HealthGaugeMini({ score, size = 44 }: { score: number; size?: number }) {
    const stroke = 4;
    const R = (size - stroke) / 2;
    const C = 2 * Math.PI * R;
    const safe = Math.max(0, Math.min(10, score));
    const pct = safe / 10;
    const offset = C * (1 - pct);
    const strokeCol = healthGaugeColor(safe);

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="block shrink-0 -rotate-90"
            aria-hidden
        >
            <circle
                cx={size / 2}
                cy={size / 2}
                r={R}
                fill="none"
                stroke="var(--color-border-tertiary)"
                strokeWidth={stroke}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={R}
                fill="none"
                stroke={strokeCol}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-500"
            />
        </svg>
    );
}

function GlobalHealthKpiCard({
    score,
    healthLabel,
    attentionLabel,
    avgViability,
}: {
    score: number;
    healthLabel: string;
    attentionLabel: string;
    avgViability: number;
}) {
    const { t } = useTranslation("common");
    const safe = Math.max(0, Math.min(10, score));

    return (
        <Link to="/workspace/manager/risks" className="group block h-full min-h-0">
            <article className={`${MANAGER_KPI_CARD_CLASS} hover:border-brand-secondary/50`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                            {t("managerWorkspace.dashboard.globalHealth")}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums leading-tight text-primary">
                            {safe.toFixed(1)}
                            <span className="text-xs font-medium text-tertiary">/10</span>
                        </p>
                        <p className={`mt-0.5 text-[11px] font-medium leading-snug ${healthTone(healthLabel)}`}>{attentionLabel}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-secondary bg-secondary_subtle/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none text-tertiary">
                        {healthLabel}
                    </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-tertiary">
                    {t("managerWorkspace.dashboard.gaugePrefix")} <span className={healthTone(healthLabel)}>{healthLabel}</span>
                    {" · "}
                    {t("managerWorkspace.dashboard.avgViability", { avg: avgViability.toFixed(1) })}
                </p>
                <div className="mt-auto flex justify-center pt-1">
                    <HealthGaugeMini score={safe} size={44} />
                </div>
                <span className="pointer-events-none absolute right-2.5 top-2.5 text-xs text-tertiary opacity-0 transition group-hover:opacity-100">
                    →
                </span>
            </article>
        </Link>
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
    const fragileProjects = [...(data?.widgets.fragile_projects ?? [])]
        .sort((a, b) => (a.viability_score ?? 99) - (b.viability_score ?? 99))
        .slice(0, 5);
    const computedAt = data?.meta?.computed_at;
    const visiblePriorities = useMemo(
        () => (data?.priorities ?? []).filter((p) => !shouldHideManagerDashboardRhPriorityPill(p)),
        [data?.priorities],
    );

    const matchmaker = data?.matchmaker;
    const stats = matchmaker?.stats;
    const topRecommendations = Array.isArray(matchmaker?.top_recommendations) ? matchmaker.top_recommendations : [];
    const topUnassignedMatches = Array.isArray(matchmaker?.top_unassigned_matches) ? matchmaker.top_unassigned_matches : [];
    const topSkillGaps = Array.isArray(matchmaker?.top_skill_gaps) ? matchmaker.top_skill_gaps : [];

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
                    <section className="grid gap-3 lg:grid-cols-3 lg:gap-4">
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
                                    {visiblePriorities.length}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {visiblePriorities.map((priority) => (
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

                    <section className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-2 lg:grid-cols-5 lg:gap-2.5">
                        <GlobalHealthKpiCard
                            score={data.health.score}
                            healthLabel={data.health.label}
                            attentionLabel={attentionLabel}
                            avgViability={data.health.avg_viability}
                        />
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
                                clamp(data.kpi_cards.alerts.critical_or_high ?? 0, 0, 999),
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
                                clamp(data.kpi_cards.pending_rh_actions ?? 0, 0, 999),
                            ]}
                        />
                    </section>

                    <section>
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

                    <section className="space-y-5 rounded-2xl border border-secondary bg-primary p-5 shadow-sm">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-primary">{t("managerWorkspace.dashboard.matchmakerTitle")}</h3>
                                <span className="rounded-full border border-brand-secondary/40 bg-brand-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-brand-secondary">
                                    Matchmaker
                                </span>
                            </div>
                            <p className="max-w-3xl text-sm text-secondary">{t("managerWorkspace.dashboard.matchmakerSubtitle")}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                            <MatchmakerMiniKpiCard
                                label={t("managerWorkspace.dashboard.matchmakerKpiProjects")}
                                value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.projects_with_matching))}
                            />
                            <MatchmakerMiniKpiCard
                                label={t("managerWorkspace.dashboard.matchmakerKpiAvgScore")}
                                value={formatMatchmakerScore10(readMatchmakerNumber(stats?.avg_match_score))}
                            />
                            <MatchmakerMiniKpiCard
                                label={t("managerWorkspace.dashboard.matchmakerKpiGaps")}
                                value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.total_gaps))}
                            />
                            <MatchmakerMiniKpiCard
                                label={t("managerWorkspace.dashboard.matchmakerKpiRecruitment")}
                                value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.recruitment_needed))}
                            />
                            <MatchmakerMiniKpiCard
                                label={t("managerWorkspace.dashboard.matchmakerKpiTraining")}
                                value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.training_needed))}
                            />
                            <MatchmakerMiniKpiCard
                                label={t("managerWorkspace.dashboard.matchmakerKpiRedeploy")}
                                value={formatMatchmakerStatDisplay(readMatchmakerNumber(stats?.redeploy_possible))}
                            />
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
                            <MatchmakerRecommendationsBlock
                                title={t("managerWorkspace.dashboard.matchmakerBlockRecommendations")}
                                items={topRecommendations}
                                emptyLabel={t("managerWorkspace.dashboard.matchmakerEmptyRecommendations")}
                            />
                            <MatchmakerUnassignedBlock
                                title={t("managerWorkspace.dashboard.matchmakerBlockUnassigned")}
                                items={topUnassignedMatches}
                                emptyLabel={t("managerWorkspace.dashboard.matchmakerEmptyUnassigned")}
                            />
                            <MatchmakerSkillGapsBlock
                                title={t("managerWorkspace.dashboard.matchmakerBlockSkillGaps")}
                                items={topSkillGaps}
                                emptyLabel={t("managerWorkspace.dashboard.matchmakerEmptySkillGaps")}
                            />
                        </div>
                    </section>

                    <AnalystSection analyst={data?.analyst} />

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
