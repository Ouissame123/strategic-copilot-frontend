import { useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
    deltaToneClass,
    healthGaugeStrokeColor,
    kpiCardBorderHoverClass,
    kpiValueToneClass,
    normalizeSparklineToSevenPoints,
    sparklineStrokeClass,
    weekOverWeekDelta,
    type KpiSemanticTone,
} from "@/lib/manager-dashboard-kpi";
import { cx } from "@/utils/cx";
import { DashboardKpiSparkline } from "./DashboardKpiSparkline";

const CARD_CLASS =
    "relative flex h-full min-h-[8.75rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 sm:min-h-[9rem]";

type DashboardKpiCardProps = {
    label: string;
    value: number;
    sub: string;
    href: string;
    tone: KpiSemanticTone;
    positiveGood: boolean;
    sparkPoints?: number[];
    variant?: "default" | "health";
    healthLabel?: string;
};

function HealthGaugeRing({ score, size = 44 }: { score: number; size?: number }) {
    const stroke = 4;
    const R = (size - stroke) / 2;
    const C = 2 * Math.PI * R;
    const safe = Math.max(0, Math.min(10, score));
    const offset = C * (1 - safe / 10);
    const strokeCol = healthGaugeStrokeColor(safe);

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block shrink-0 -rotate-90" aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={R} fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={stroke} />
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

export function DashboardKpiCard({
    label,
    value,
    sub,
    href,
    tone,
    positiveGood,
    sparkPoints,
    variant = "default",
    healthLabel,
}: DashboardKpiCardProps) {
    const { t } = useTranslation("common");

    const series = useMemo(() => normalizeSparklineToSevenPoints(sparkPoints, value), [sparkPoints, value]);
    const delta = weekOverWeekDelta(series);
    const deltaCls = deltaToneClass(delta, positiveGood);
    const valueCls = kpiValueToneClass(tone, variant === "health" ? value : undefined);
    const sparkCls = sparklineStrokeClass(tone);

    const badgeTone =
        tone === "danger"
            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            : tone === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
              : tone === "info"
                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200"
                : tone === "health"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200";

    const deltaLabel =
        delta === 0
            ? t("managerWorkspace.dashboard.trendStable")
            : t("managerWorkspace.dashboard.kpiDeltaWeek", {
                  sign: delta > 0 ? "+" : "",
                  value: delta,
              });

    return (
        <Link to={href} className="group block h-full min-h-0">
            <article className={cx(CARD_CLASS, kpiCardBorderHoverClass(tone))}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                        <p className={cx("mt-1 text-2xl font-semibold tabular-nums leading-tight", valueCls)}>
                            {variant === "health" ? (
                                <>
                                    {value.toFixed(1)}
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/10</span>
                                </>
                            ) : (
                                value
                            )}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{sub}</p>
                    </div>
                    <span className={cx("shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none", badgeTone)}>
                        {t("managerWorkspace.dashboard.kpiView")}
                    </span>
                </div>

                <div className="mt-2 flex items-end justify-between gap-2">
                    <div>
                        <p className={cx("text-[11px] font-medium tabular-nums", deltaCls)}>{deltaLabel}</p>
                        <DashboardKpiSparkline points={series} className={cx("mt-1", sparkCls)} />
                    </div>
                    {variant === "health" ? (
                        <div className="flex flex-col items-center gap-1">
                            {healthLabel ? (
                                <span className="max-w-[4.5rem] truncate text-center text-[9px] font-medium uppercase text-slate-500 dark:text-slate-400">
                                    {healthLabel}
                                </span>
                            ) : null}
                            <HealthGaugeRing score={value} />
                        </div>
                    ) : null}
                </div>

                <span className="pointer-events-none absolute right-2.5 top-2.5 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100 dark:text-slate-500">
                    →
                </span>
            </article>
        </Link>
    );
}
