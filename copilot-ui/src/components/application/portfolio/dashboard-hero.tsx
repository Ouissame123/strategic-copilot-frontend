import { BarChart01, Stars01 } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import type { PortfolioSummary } from "@/hooks/use-portfolio";
import { cx } from "@/utils/cx";

interface DashboardHeroProps {
    summary: PortfolioSummary;
    displayName?: string;
    isRh?: boolean;
}

/** Hero « command view » : fond profond, métriques en mono, séparation nette données / texte. */
export function DashboardHero({ summary, displayName, isRh }: DashboardHeroProps) {
    const { t } = useTranslation("dashboard");
    const activePct =
        summary.totalProjects > 0 ? Math.round((summary.activeProjects / summary.totalProjects) * 100) : 0;
    const riskPct =
        summary.totalProjects > 0 ? Math.round((summary.highRiskProjects / summary.totalProjects) * 100) : 0;

    return (
        <section
            className={cx(
                "relative overflow-hidden rounded-2xl border border-white/10 p-8 shadow-xl md:p-10",
                "bg-[#0F1117] text-zinc-100",
                "dark:border-white/10 dark:bg-[#0B0D12] dark:shadow-lg",
            )}
        >
            <div
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand-600/20 blur-3xl dark:bg-brand-500/15"
                aria-hidden
            />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden />

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-200 ring-1 ring-white/10">
                            <Stars01 className="size-3.5 shrink-0 text-brand-300" aria-hidden />
                            {t("hero.badge")}
                        </span>
                    </div>
                    <h1 className="font-display mt-4 max-w-3xl text-display-xs font-semibold tracking-tight text-white md:text-display-sm">
                        {isRh
                            ? t("hero.welcomeRh")
                            : t("hero.welcome", { name: displayName?.trim() ? displayName.trim() : t("hero.fallbackName") })}
                    </h1>
                    <p className="mt-3 max-w-2xl text-md leading-relaxed text-zinc-400">{t("hero.summary", { total: summary.totalProjects })}</p>

                    <div className="my-8 h-px w-full max-w-xl bg-gradient-to-r from-white/25 via-white/10 to-transparent" aria-hidden />

                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 ring-1 ring-emerald-500/20">
                            <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
                            {t("hero.chipActive", { count: summary.activeProjects, pct: activePct })}
                        </span>
                        <span
                            className={cx(
                                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ring-1",
                                summary.highRiskProjects > 0
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-100 ring-amber-500/25"
                                    : "border-zinc-500/25 bg-zinc-500/10 text-zinc-200 ring-zinc-500/20",
                            )}
                        >
                            <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
                            {t("hero.chipRisk", { count: summary.highRiskProjects, pct: riskPct })}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-xl border border-brand-400/25 bg-brand-500/10 px-3 py-2 text-xs font-medium text-brand-100 ring-1 ring-brand-400/20">
                            <span className="size-1.5 rounded-full bg-brand-300" aria-hidden />
                            {t("hero.chipBudget", { pct: summary.averageBudgetUsage })}
                        </span>
                    </div>
                </div>

                <div className="flex w-full shrink-0 flex-col justify-center border-t border-white/10 pt-6 lg:w-auto lg:min-w-[14rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-brand-200 ring-1 ring-white/10">
                            <BarChart01 className="size-7" aria-hidden />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("hero.portfolioLabel")}</p>
                            <p className="font-kpi-mono text-display-md font-semibold tabular-nums tracking-tight text-white md:text-display-lg">
                                {summary.totalProjects}
                            </p>
                        </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-zinc-500">{t("hero.kpiHint")}</p>
                </div>
            </div>
        </section>
    );
}
