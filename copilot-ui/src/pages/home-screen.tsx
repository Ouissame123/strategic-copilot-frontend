import { useTranslation } from "react-i18next";
import { KpiCards } from "@/components/application/portfolio/kpi-cards";
import { PortfolioTable } from "@/components/application/portfolio/portfolio-table";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePortfolio } from "@/hooks/use-portfolio";

export default function HomeScreen() {
    const { t } = useTranslation("dashboard");
    const { t: tPortfolio } = useTranslation("portfolio");
    const { projects, summary, isLoading, error, retry } = usePortfolio();
    useCopilotPage("dashboard", t("title"));

    return (
        <div className="space-y-8">
            <header className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">{t("eyebrow")}</p>
                <h1 className="mt-1 text-display-xs font-semibold text-primary md:text-display-sm">{t("title")}</h1>
                <p className="mt-2 text-md text-tertiary">{t("subtitle")}</p>
            </header>

            <KpiCards summary={summary} />

            <PortfolioTable
                title={tPortfolio("table.title")}
                description={tPortfolio("table.description")}
                projects={projects}
                isLoading={isLoading}
                error={error}
                onRetry={retry}
                badge={`${summary.totalProjects}`}
            />

            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <h2 className="text-lg font-semibold text-primary">{t("highlightTitle")}</h2>
                <p className="mt-2 text-sm text-tertiary">{t("highlightDescription")}</p>
            </section>
        </div>
    );
}
