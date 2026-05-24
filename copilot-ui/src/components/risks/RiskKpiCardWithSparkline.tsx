import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { DashboardKpiSparkline } from "@/components/manager/dashboard/DashboardKpiSparkline";
import { deltaToneClass, normalizeSparklineToSevenPoints, weekOverWeekDelta } from "@/lib/manager-dashboard-kpi";
import { cx } from "@/utils/cx";
import { RISK_CARD } from "./risks-shared";

type Tone = "neutral" | "danger" | "warning" | "info" | "brand";

const SPARK_CLASS: Record<Tone, string> = {
    neutral: "text-slate-400 dark:text-slate-500",
    danger: "text-rose-400",
    warning: "text-amber-400",
    info: "text-blue-400",
    brand: "text-violet-300",
};

type RiskKpiCardWithSparklineProps = {
    label: string;
    value: number | string;
    sub?: string;
    tone?: Tone;
    sparkPoints?: number[];
    positiveGood?: boolean;
    variant?: "default" | "hero";
};

function RiskSparkline({ points, className }: { points: number[]; className?: string }) {
    return <DashboardKpiSparkline points={points} className={className} />;
}

export function RiskKpiHeroCard({
    score,
    sub,
    sparkPoints,
}: {
    score: number | null;
    sub: string;
    sparkPoints?: number[];
}) {
    const display = score != null ? score.toFixed(2) : "—";
    const numeric = score ?? 0;
    const series = useMemo(() => normalizeSparklineToSevenPoints(sparkPoints, numeric), [sparkPoints, numeric]);
    const delta = weekOverWeekDelta(series);
    const deltaCls = deltaToneClass(delta, false);

    return (
        <article
            className={cx(
                "relative col-span-1 overflow-hidden rounded-3xl p-5 shadow-xl sm:col-span-2 lg:col-span-4 lg:row-span-2 lg:p-6",
                "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white",
            )}
        >
            <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-100">Score risque global</p>
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
                {display}
                <span className="text-lg font-medium text-violet-200">/10</span>
            </p>
            <p className="mt-1 text-sm text-violet-100">{sub}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                    <span
                        className={cx(
                            "inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums backdrop-blur-sm",
                            delta === 0 ? "text-violet-100" : deltaCls.replace("text-", "text-").replace("dark:", ""),
                        )}
                    >
                        {delta > 0 ? <TrendingUp className="size-3" aria-hidden /> : delta < 0 ? <TrendingDown className="size-3" aria-hidden /> : null}
                        {delta === 0 ? "Stable vs J-7" : `${delta > 0 ? "+" : ""}${delta} vs J-7`}
                    </span>
                    <RiskSparkline points={series} className="mt-2 text-white/90" />
                </div>
            </div>
        </article>
    );
}

export function RiskKpiCardWithSparkline({
    label,
    value,
    sub,
    tone = "neutral",
    sparkPoints,
    positiveGood = false,
    variant = "default",
}: RiskKpiCardWithSparklineProps) {
    const numeric = typeof value === "number" ? value : Number(value);
    const safeNum = Number.isFinite(numeric) ? numeric : 0;
    const series = useMemo(() => normalizeSparklineToSevenPoints(sparkPoints, safeNum), [sparkPoints, safeNum]);
    const delta = weekOverWeekDelta(series);
    const deltaCls = deltaToneClass(delta, positiveGood);

    if (variant === "hero") {
        return <RiskKpiHeroCard score={typeof value === "number" ? value : null} sub={sub ?? ""} sparkPoints={sparkPoints} />;
    }

    return (
        <article className={cx(RISK_CARD, "p-4 hover:-translate-y-0.5 hover:shadow-lg")}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
            {sub ? <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{sub}</p> : null}
            <div className="mt-2 flex items-end justify-between gap-2">
                <p className={cx("text-[11px] font-medium tabular-nums", deltaCls)}>
                    {delta === 0 ? "Stable J-7" : `${delta > 0 ? "+" : ""}${delta} J-7`}
                </p>
                <RiskSparkline points={series} className={SPARK_CLASS[tone]} />
            </div>
        </article>
    );
}

export type RiskKpiSectionProps = {
    heroScore: number | null;
    heroSub: string;
    kpis: Array<{
        label: string;
        value: number | string;
        sub?: string;
        tone?: Tone;
        sparkPoints?: number[];
        positiveGood?: boolean;
    }>;
};

export function RiskKpiSection({ heroScore, heroSub, kpis }: RiskKpiSectionProps) {
    const heroSpark = kpis[0]?.sparkPoints;
    return (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <RiskKpiHeroCard score={heroScore} sub={heroSub} sparkPoints={heroSpark} />
            {kpis.map((k) => (
                <div key={k.label} className="lg:col-span-2">
                    <RiskKpiCardWithSparkline {...k} />
                </div>
            ))}
        </section>
    );
}
