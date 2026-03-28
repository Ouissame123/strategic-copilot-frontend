import { useTranslation } from "react-i18next";
import { KpiCards } from "@/components/application/portfolio/kpi-cards";
import { PortfolioTable } from "@/components/application/portfolio/portfolio-table";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePortfolio } from "@/hooks/use-portfolio";

export default function HomeScreen() {
    const { t } = useTranslation("dashboard");
    const { projects, summary, isLoading, error, retry } = usePortfolio();
    useCopilotPage("dashboard", t("title"));

    return (
        <div className="space-y-6">
            <header className="rounded-xl border border-secondary bg-primary p-5 md:p-6">
                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">{t("title")}</h1>
                <p className="mt-2 text-md text-tertiary">{t("subtitle")}</p>
            </header>

            <KpiCards summary={summary} />

            <PortfolioTable
                title={t("table.title")}
                description={t("table.description")}
                projects={projects}
                isLoading={isLoading}
                error={error}
                onRetry={retry}
                badge={`${summary.totalProjects}`}
            />

            <section className="rounded-xl border border-secondary bg-primary p-5 md:p-6">
                <h2 className="text-lg font-semibold text-primary">{t("highlightTitle")}</h2>
                <p className="mt-2 text-sm text-tertiary">{t("highlightDescription")}</p>
            </section>
        </div>
    );
}
