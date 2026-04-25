import { AlertTriangle, Stars01 } from "@untitledui/icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import type { PortfolioProject } from "@/hooks/use-portfolio";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { cx } from "@/utils/cx";

const panelShell =
    "rounded-2xl border border-secondary/65 bg-primary p-6 shadow-md ring-1 ring-secondary/40 dark:bg-gradient-to-b dark:from-primary dark:to-secondary/25 dark:shadow-lg dark:ring-secondary/30 md:p-7";

export interface PortfolioInsightsPanelProps {
    projects: PortfolioProject[];
    isLoading: boolean;
}

export function PortfolioInsightsPanel({ projects, isLoading }: PortfolioInsightsPanelProps) {
    const { t } = useTranslation("portfolio");
    const paths = useWorkspacePaths();

    const alerts = useMemo(() => {
        return projects.filter((p) => p.riskLevel === "high" || p.status === "at-risk");
    }, [projects]);

    const recoKeys = useMemo(() => {
        const keys: string[] = [];
        const highRisk = projects.filter((p) => p.riskLevel === "high").length;
        const atRiskStatus = projects.filter((p) => p.status === "at-risk").length;
        const avgBudget =
            projects.length === 0 ? 0 : Math.round(projects.reduce((s, p) => s + p.budgetUsage, 0) / projects.length);

        if (highRisk > 0) keys.push("recoHighRisk");
        if (atRiskStatus > 0) keys.push("recoAtRiskStatus");
        if (avgBudget > 80) keys.push("recoBudget");
        if (keys.length === 0) keys.push("recoStable");
        return keys;
    }, [projects]);

    if (isLoading) {
        return (
            <aside className={panelShell}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-quaternary">{t("insights.title")}</h2>
                <div className="mt-8 flex min-h-32 items-center justify-center">
                    <LoadingIndicator type="line-simple" size="sm" label={t("table.loading")} />
                </div>
            </aside>
        );
    }

    return (
        <aside className="rounded-2xl border border-secondary/65 bg-gradient-to-b from-primary to-secondary/25 p-6 shadow-md ring-1 ring-secondary/40 dark:shadow-lg dark:ring-secondary/30 md:p-7">
            <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-warning-primary/15 p-2.5 text-warning-primary">
                    <AlertTriangle className="size-5" aria-hidden />
                </div>
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-quaternary">{t("insights.title")}</h2>
                    <p className="text-xs text-tertiary">{t("insights.subtitle")}</p>
                </div>
            </div>

            <section className="mt-6">
                <h3 className="text-xs font-semibold text-secondary">{t("insights.alertsTitle")}</h3>
                {alerts.length === 0 ? (
                    <p className="mt-3 rounded-2xl border border-dashed border-secondary/80 bg-primary/50 px-4 py-5 text-sm text-tertiary">{t("insights.emptyAlerts")}</p>
                ) : (
                    <ul className="mt-3 space-y-3">
                        {alerts.slice(0, 6).map((p) => (
                            <li key={p.id}>
                                <Link
                                    to={paths.project(p.id)}
                                    className="flex items-start gap-3 rounded-2xl border border-secondary/65 bg-primary px-4 py-3 text-sm shadow-xs transition hover:border-secondary/90 hover:bg-primary_hover"
                                >
                                    <span
                                        className={cx(
                                            "mt-0.5 size-2 shrink-0 rounded-full",
                                            p.riskLevel === "high" ? "bg-error-primary" : "bg-warning-primary",
                                        )}
                                        aria-hidden
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="line-clamp-2 font-medium text-primary">{p.name}</span>
                                        <span className="mt-0.5 block text-xs text-tertiary">
                                            {p.riskLevel === "high" ? t("insights.alertHighRisk") : t("insights.alertAtRisk")}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="mt-8 border-t border-secondary/70 pt-6">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-utility-brand-100/80 p-2.5 text-utility-brand-800 dark:bg-utility-brand-900/40 dark:text-utility-brand-200">
                        <Stars01 className="size-5" aria-hidden />
                    </div>
                    <h3 className="text-xs font-semibold text-secondary">{t("insights.recoTitle")}</h3>
                </div>
                <ul className="mt-4 space-y-3">
                    {recoKeys.map((key) => (
                        <li
                            key={key}
                            className="line-clamp-1 rounded-2xl border border-secondary/55 bg-primary/85 px-4 py-3 text-sm font-medium leading-tight text-secondary shadow-xs"
                        >
                            {t(`insights.${key}`)}
                        </li>
                    ))}
                </ul>
            </section>
        </aside>
    );
}
