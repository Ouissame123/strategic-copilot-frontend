import { useTranslation } from "react-i18next";
import { BarChart01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import type { ObserverForecast, ObserverTrends } from "@/features/manager/types/observer";
import {
    DELTA_FIELDS,
    FORECAST_META,
    TREND_META,
    deltaColor,
    deltaIcon,
    formatDelta,
    formatRelativeDate,
} from "@/features/manager/utils/trend-helpers";
import { localeForDateFormatting } from "@/lib/ui-locale";
import { cx } from "@/utils/cx";

export type EvolutionPanelProps = {
    trends?: ObserverTrends | null;
    forecast?: ObserverForecast | null;
    nextReviewAt?: string | null;
    onTriggerAnalysis?: () => void;
    isAnalysisPending?: boolean;
};

function isEmptyEvolution(trends?: ObserverTrends | null): boolean {
    if (trends == null) return true;
    return trends.health_trend === "first_analysis" || trends.health_trend == null;
}

export function EvolutionPanel({
    trends,
    forecast,
    nextReviewAt,
    onTriggerAnalysis,
    isAnalysisPending,
}: EvolutionPanelProps) {
    const { t, i18n } = useTranslation("common");
    const te = (key: string, opts?: Record<string, string | number>) =>
        String(opts ? t(`managerWorkspace.projects.evolution.${key}`, opts as never) : t(`managerWorkspace.projects.evolution.${key}`));
    const dateLocale = localeForDateFormatting(i18n.resolvedLanguage ?? i18n.language);

    if (isEmptyEvolution(trends)) {
        return (
            <section className="rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-900 dark:bg-primary-950/30">
                <div className="flex items-start gap-3">
                    <BarChart01 className="size-5 shrink-0 text-primary-600" aria-hidden />
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-primary-900 dark:text-primary-100">{te("sectionTitle")}</h2>
                        <p className="mt-1 text-sm text-primary-800 dark:text-primary-200">{te("emptyBody")}</p>
                        {nextReviewAt ? (
                            <p className="mt-2 text-xs text-primary-700 dark:text-primary-300">
                                {te("nextReview", { date: new Date(nextReviewAt).toLocaleDateString(dateLocale) })}
                            </p>
                        ) : null}
                        {onTriggerAnalysis ? (
                            <Button
                                type="button"
                                color="primary"
                                size="sm"
                                className="mt-3"
                                isDisabled={isAnalysisPending}
                                isLoading={isAnalysisPending}
                                onClick={onTriggerAnalysis}
                            >
                                {te("scheduleNow")}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </section>
        );
    }

    const trendKey = trends!.health_trend ?? "stable";
    const trendMeta = TREND_META[trendKey] ?? TREND_META.stable;
    const TrendIcon = trendMeta.Icon;
    const forecastDirection = forecast?.direction ?? "flat";
    const forecastMeta = FORECAST_META[forecastDirection] ?? FORECAST_META.flat;
    const ForecastIcon = forecastMeta.Icon;

    return (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
            <header className="flex items-center gap-2">
                <BarChart01 className="size-5 text-slate-600" aria-hidden />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{te("sectionTitle")}</h2>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <article className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{te("trendCardTitle")}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <TrendIcon className={cx("size-5 shrink-0", trendMeta.colorClass)} aria-hidden />
                        <span className={cx("text-sm font-medium", trendMeta.colorClass)}>{te(`trend.${trendMeta.labelKey}`)}</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatDelta(trends!.health_delta)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        {trends!.previous_health_score != null
                            ? te("previousScore", { score: trends!.previous_health_score })
                            : null}
                        {trends!.previous_computed_at
                            ? ` · ${te("previousAt", { when: formatRelativeDate(trends!.previous_computed_at, dateLocale) })}`
                            : null}
                        {trends!.days_since_last_analysis != null
                            ? ` · ${te("daysSinceAnalysis", { days: trends!.days_since_last_analysis })}`
                            : null}
                    </p>
                </article>

                {forecast != null ? (
                    <article className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{te("forecastCardTitle")}</p>
                        <div className="mt-2 flex items-center gap-2">
                            <ForecastIcon className={cx("size-5 shrink-0", forecastMeta.colorClass)} aria-hidden />
                            <span className={cx("text-sm font-medium", forecastMeta.colorClass)}>
                                {te(`forecast.${forecastMeta.labelKey}`)}
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                            {forecast.projected_health_30d != null && Number.isFinite(forecast.projected_health_30d)
                                ? forecast.projected_health_30d
                                : "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {forecast.confidence != null && Number.isFinite(forecast.confidence)
                                ? te("forecastConfidence", { percent: Math.round(forecast.confidence) })
                                : null}
                            {forecast.daily_change_rate != null && Number.isFinite(forecast.daily_change_rate)
                                ? ` · ${te("dailyChangeRate", { rate: forecast.daily_change_rate })}`
                                : null}
                        </p>
                    </article>
                ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {DELTA_FIELDS.map(({ key, labelKey, inverted }) => {
                    const value = trends![key];
                    const DeltaIcon = deltaIcon(value);
                    return (
                        <div
                            key={key}
                            className="rounded-lg border border-slate-100 px-3 py-2.5 dark:border-slate-800"
                        >
                            <p className="text-[11px] font-medium text-slate-500">{te(`delta.${labelKey}`)}</p>
                            <div className="mt-1 flex items-center gap-1.5">
                                <DeltaIcon className={cx("size-4 shrink-0", deltaColor(value, inverted))} aria-hidden />
                                <span className={cx("text-sm font-semibold tabular-nums", deltaColor(value, inverted))}>
                                    {formatDelta(value)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {nextReviewAt ? (
                <p className="text-xs text-slate-500">
                    {te("nextReview", { date: new Date(nextReviewAt).toLocaleDateString(dateLocale) })}
                </p>
            ) : null}
        </section>
    );
}
