import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { localeForDateFormatting } from "@/lib/ui-locale";
import {
    reasonCodeRank,
    type ManagerProjectPortfolioItem,
    type ManagerProjectReasonCode,
} from "@/lib/manager-projects-list-derived";
import type { ProjectStatus } from "@/types/api.types";

export type PortfolioTableSortKey =
    | "name"
    | "reason_code"
    | "time_to_impact_days"
    | "latest_viability_score"
    | "progress_pct"
    | "active_alerts_count";

type SortDir = "asc" | "desc";

function coerceFiniteNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function reasonChipClass(code: ManagerProjectReasonCode): string {
    if (code === "decision_stop" || code === "overdue_milestone" || code === "low_viability")
        return "border-rose-200/80 bg-rose-50/90 text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-200";
    if (code === "decision_adjust" || code === "high_alert_load" || code === "milestone_soon")
        return "border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-100";
    return "border-slate-200/80 bg-slate-50/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300";
}

function decisionBadgeClass(decision: string): string {
    const d = decision.toLowerCase();
    if (d === "stop" || d === "reject") return "border-rose-200/70 bg-rose-50/80 text-rose-800";
    if (d === "adjust") return "border-amber-200/70 bg-amber-50/80 text-amber-900";
    if (d === "continue" || d === "proceed") return "border-emerald-200/70 bg-emerald-50/80 text-emerald-800";
    return "border-slate-200/50 bg-slate-50/60 text-slate-600";
}

function viabilityClass(score: number): string {
    if (score >= 8) return "text-emerald-700 dark:text-emerald-300";
    if (score >= 6) return "text-amber-800 dark:text-amber-300";
    return "text-rose-700 dark:text-rose-300";
}

function translateDecisionLabel(t: TFunction<"common", undefined>, raw: string): string {
    const d = raw.trim().toLowerCase();
    if (!d) return t("managerWorkspace.projects.decisionUnknown");
    if (d === "continue" || d === "proceed") return t("managerWorkspace.projects.decisionContinue");
    if (d === "adjust") return t("managerWorkspace.projects.decisionAdjust");
    if (d === "stop" || d === "reject") return t("managerWorkspace.projects.decisionStop");
    return raw;
}

function formatHorizon(row: ManagerProjectPortfolioItem, t: TFunction<"common", undefined>): string {
    const days = row.time_to_impact_days;
    if (days == null) return "—";
    if (days < 0) return t("managerWorkspace.projects.horizonOverdue", { count: Math.abs(days) });
    if (days === 0) return t("managerWorkspace.projects.horizonToday");
    return t("managerWorkspace.projects.horizonJMinus", { days });
}

function SortableTh({
    columnKey,
    currentSortKey,
    sortDir,
    onSort,
    className = "",
    children,
}: {
    columnKey: PortfolioTableSortKey;
    currentSortKey: PortfolioTableSortKey;
    sortDir: SortDir;
    onSort: (k: PortfolioTableSortKey) => void;
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
                {active ? <span className="text-[10px] font-bold tabular-nums">{sortDir === "asc" ? "↑" : "↓"}</span> : null}
            </button>
        </th>
    );
}

export function comparePortfolioRows(
    a: ManagerProjectPortfolioItem,
    b: ManagerProjectPortfolioItem,
    key: PortfolioTableSortKey,
): number {
    switch (key) {
        case "name":
            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        case "reason_code":
            return reasonCodeRank(a.reason_code) - reasonCodeRank(b.reason_code);
        case "time_to_impact_days": {
            const da = a.time_to_impact_days ?? 9999;
            const db = b.time_to_impact_days ?? 9999;
            return da - db;
        }
        case "latest_viability_score":
            return (coerceFiniteNumber(a.latest_viability_score) ?? -1) - (coerceFiniteNumber(b.latest_viability_score) ?? -1);
        case "progress_pct":
            return (coerceFiniteNumber(a.progress_pct) ?? 0) - (coerceFiniteNumber(b.progress_pct) ?? 0);
        case "active_alerts_count":
            return (coerceFiniteNumber(a.active_alerts_count) ?? 0) - (coerceFiniteNumber(b.active_alerts_count) ?? 0);
        default:
            return 0;
    }
}

export function sortPortfolioRows(
    rows: ManagerProjectPortfolioItem[],
    sortKey: PortfolioTableSortKey,
    sortDir: SortDir,
): ManagerProjectPortfolioItem[] {
    const arr = [...rows];
    arr.sort((a, b) => {
        const cmp = comparePortfolioRows(a, b, sortKey);
        return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
}

export function ManagerProjectsPortfolioTable({
    rows,
    sortKey,
    sortDir,
    onSort,
    projectDetailPath,
    t,
    statusLabel,
    projectDisplayName,
    empty,
}: {
    rows: ManagerProjectPortfolioItem[];
    sortKey: PortfolioTableSortKey;
    sortDir: SortDir;
    onSort: (k: PortfolioTableSortKey) => void;
    projectDetailPath: (id: string) => string;
    t: TFunction<"common", undefined>;
    statusLabel: (status: ProjectStatus) => string;
    projectDisplayName: (name: string) => string;
    empty: boolean;
}) {
    const { i18n } = useTranslation("common");
    const dateLocale = localeForDateFormatting(i18n.resolvedLanguage ?? i18n.language);

    return (
        <div className="max-h-[min(70vh,calc(100vh-360px))] overflow-auto overflow-x-auto rounded-2xl border border-secondary bg-primary shadow-sm">
            <table className="min-w-[960px] w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 border-b border-secondary/80 bg-zinc-50/95 text-left shadow-sm backdrop-blur-sm dark:bg-zinc-900/95">
                    <tr>
                        <SortableTh columnKey="name" currentSortKey={sortKey} sortDir={sortDir} onSort={onSort} className="max-w-[240px]">
                            {t("managerWorkspace.projects.colPortfolioProject")}
                        </SortableTh>
                        <SortableTh columnKey="reason_code" currentSortKey={sortKey} sortDir={sortDir} onSort={onSort} className="min-w-[140px]">
                            {t("managerWorkspace.projects.colPortfolioWhy")}
                        </SortableTh>
                        <SortableTh columnKey="latest_viability_score" currentSortKey={sortKey} sortDir={sortDir} onSort={onSort}>
                            {t("managerWorkspace.projects.colPortfolioSignal")}
                        </SortableTh>
                        <SortableTh columnKey="time_to_impact_days" currentSortKey={sortKey} sortDir={sortDir} onSort={onSort}>
                            {t("managerWorkspace.projects.colPortfolioHorizon")}
                        </SortableTh>
                        <SortableTh columnKey="progress_pct" currentSortKey={sortKey} sortDir={sortDir} onSort={onSort} className="min-w-[120px]">
                            {t("managerWorkspace.projects.colProgress")}
                        </SortableTh>
                        <th className="min-w-[200px] px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                            {t("managerWorkspace.projects.colPortfolioArbitrage")}
                        </th>
                        <th className="whitespace-nowrap px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                            {t("managerWorkspace.projects.colAction")}
                        </th>
                    </tr>
                </thead>
                <tbody className="text-fg-primary">
                    {rows.map((row) => {
                        const viability = coerceFiniteNumber(row.latest_viability_score);
                        const decision = String(row.latest_decision ?? "").trim();
                        const progress = coerceFiniteNumber(row.progress_pct);
                        const reasonKey = `reason_${row.reason_code}` as const;
                        const milestoneLabel = row.milestone_at
                            ? new Date(row.milestone_at).toLocaleDateString(dateLocale)
                            : null;

                        return (
                            <tr
                                key={row.id}
                                className="border-b border-secondary/60 transition-colors last:border-b-0 hover:bg-zinc-50/90 dark:hover:bg-white/[0.04]"
                            >
                                <td className="max-w-[240px] px-4 py-3.5 align-top">
                                    <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-primary">
                                        {projectDisplayName(row.name)}
                                    </p>
                                    <p className="mt-1 text-[11px] text-tertiary">
                                        {statusLabel(row.status)} · P{Math.round(coerceFiniteNumber(row.priority) ?? 0)} · 👥{" "}
                                        {Math.round(coerceFiniteNumber(row.team_size) ?? 0)}
                                    </p>
                                </td>
                                <td className="px-4 py-3.5 align-top">
                                    <span
                                        className={`inline-flex max-w-[200px] rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-snug ${reasonChipClass(row.reason_code)}`}
                                    >
                                        {t(`managerWorkspace.projects.${reasonKey}`)}
                                    </span>
                                </td>
                                <td className="px-4 py-3.5 align-top">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {viability != null ? (
                                                <span className={`text-lg font-semibold tabular-nums ${viabilityClass(viability)}`}>
                                                    {viability.toFixed(1)}
                                                </span>
                                            ) : (
                                                <span className="text-tertiary">—</span>
                                            )}
                                            {decision ? (
                                                <span
                                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${decisionBadgeClass(decision)}`}
                                                >
                                                    {translateDecisionLabel(t, decision)}
                                                </span>
                                            ) : null}
                                        </div>
                                        {row.fragility_score != null ? (
                                            <span className="text-[11px] text-tertiary">
                                                {t("managerWorkspace.projects.fragilityProxy", {
                                                    score: row.fragility_score.toFixed(1),
                                                })}
                                            </span>
                                        ) : null}
                                        {row.score_trend_7d != null ? (
                                            <span className="text-[11px] tabular-nums text-secondary">
                                                {row.score_trend_7d >= 0 ? "+" : ""}
                                                {row.score_trend_7d.toFixed(1)} / 7j
                                            </span>
                                        ) : null}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3.5 align-top">
                                    <p
                                        className={`text-sm font-medium tabular-nums ${
                                            row.time_to_impact_days != null && row.time_to_impact_days < 0
                                                ? "text-rose-700 dark:text-rose-300"
                                                : row.time_to_impact_days != null && row.time_to_impact_days <= 14
                                                  ? "text-amber-800 dark:text-amber-300"
                                                  : "text-secondary"
                                        }`}
                                    >
                                        {formatHorizon(row, t)}
                                    </p>
                                    {milestoneLabel ? (
                                        <p className="mt-0.5 text-[11px] text-tertiary">{milestoneLabel}</p>
                                    ) : null}
                                </td>
                                <td className="px-4 py-3.5 align-top">
                                    {progress != null ? (
                                        <div className="flex min-w-[100px] items-center gap-2">
                                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary_subtle" aria-hidden>
                                                <div
                                                    className="h-full rounded-full bg-brand-solid"
                                                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                                />
                                            </div>
                                            <span className="w-10 text-right text-[11px] tabular-nums text-secondary">
                                                {Math.round(progress)}%
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-tertiary">—</span>
                                    )}
                                    {Math.round(coerceFiniteNumber(row.active_alerts_count) ?? 0) > 0 ? (
                                        <p className="mt-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                                            {t("managerWorkspace.projects.alertsOpenShort", {
                                                count: Math.round(coerceFiniteNumber(row.active_alerts_count) ?? 0),
                                            })}
                                        </p>
                                    ) : null}
                                </td>
                                <td className="px-4 py-3.5 align-top">
                                    <p className="line-clamp-3 text-[13px] leading-snug text-secondary">
                                        {row.top_arbitrage
                                            ? t(`managerWorkspace.projects.${row.top_arbitrage}`)
                                            : t("managerWorkspace.projects.arbitrageNone")}
                                    </p>
                                </td>
                                <td className="px-4 py-3.5 text-right align-top">
                                    <Link
                                        to={projectDetailPath(row.id)}
                                        className="inline-flex rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-solid_hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-solid"
                                    >
                                        {t("managerWorkspace.projects.viewDetails")}
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {empty ? <p className="border-t border-secondary p-4 text-sm text-tertiary">{t("managerWorkspace.projects.empty")}</p> : null}
        </div>
    );
}
