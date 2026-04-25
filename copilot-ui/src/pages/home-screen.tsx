import { useTranslation } from "react-i18next";
import { DashboardHero } from "@/components/application/portfolio/dashboard-hero";
import { KpiCards } from "@/components/application/portfolio/kpi-cards";
import { PortfolioActivityList } from "@/components/application/portfolio/portfolio-activity-list";
import { PortfolioTable } from "@/components/application/portfolio/portfolio-table";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useAuth } from "@/providers/auth-provider";

export default function HomeScreen() {
    const { t } = useTranslation("dashboard");
    const { t: tPortfolio } = useTranslation("portfolio");
    const { user, hasRole } = useAuth();
    useCopilotPage("dashboard", t("title"));

    const { projects, summary, insights, isLoading, error, retry } = usePortfolio();

    const displayName = user?.firstName || user?.fullName?.split(/\s+/)[0] || "";
    const isRh = hasRole("rh");

    return (
        <div className="space-y-10 md:space-y-12">
            <DashboardHero summary={summary} displayName={displayName} isRh={isRh} />

            <KpiCards summary={summary} />

            <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_min(100%,22rem)] xl:items-start">
                <div className="order-2 min-w-0 space-y-10 xl:order-1">
                    <PortfolioTable
                        title={tPortfolio("table.title")}
                        description={tPortfolio("table.description")}
                        projects={projects}
                        isLoading={isLoading}
                        error={error}
                        onRetry={retry}
                        badge={String(summary.totalProjects)}
                    />
                    <PortfolioActivityList projects={projects} isLoading={isLoading} />
                </div>
                <div className="order-1 min-w-0 xl:sticky xl:top-6 xl:order-2 xl:self-start">
                    <aside className="rounded-2xl border border-secondary/65 bg-primary p-6 shadow-md ring-1 ring-secondary/40 dark:bg-gradient-to-b dark:from-primary dark:to-secondary/25 dark:shadow-lg dark:ring-secondary/30 md:p-7">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-quaternary">Insights</h2>
                        <p className="mt-1 text-xs text-tertiary">Synthèse décisionnelle (données backend).</p>

                        {isLoading ? (
                            <p className="mt-6 text-sm text-tertiary">Chargement…</p>
                        ) : error ? (
                            <p className="mt-6 text-sm text-tertiary">{error}</p>
                        ) : (
                            <div className="mt-6 space-y-6">
                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-quaternary">Résumé</h3>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">
                                        {insights.summary?.trim() ? insights.summary : "—"}
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-quaternary">Analyse</h3>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">
                                        {insights.explanation?.trim() ? insights.explanation : "—"}
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-quaternary">Actions prioritaires</h3>
                                    {insights.recommendations_text.length === 0 ? (
                                        <p className="mt-2 text-sm text-tertiary">Aucune action prioritaire fournie.</p>
                                    ) : (
                                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-secondary">
                                            {insights.recommendations_text.map((item, idx) => (
                                                <li key={idx} className="whitespace-pre-wrap">
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
