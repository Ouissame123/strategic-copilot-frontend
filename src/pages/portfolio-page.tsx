import { ArrowUp } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { KpiCards } from "@/components/application/portfolio/kpi-cards";
import { PortfolioTable } from "@/components/application/portfolio/portfolio-table";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePortfolio } from "@/hooks/use-portfolio";

export function PortfolioPage() {
    const { t } = useTranslation("portfolio");
    const { projects, summary, isLoading, error, retry } = usePortfolio();
    useCopilotPage("portfolio", t("title"));

    return (
        <div className="space-y-8">
            <header className="rounded-xl border border-secondary bg-primary p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-display-sm font-semibold text-primary md:text-display-md">{t("title")}</h1>
                        <p className="mt-2 text-sm text-tertiary md:text-md">{t("subtitle")}</p>

                        <div className="mt-3">
                            <BadgeWithIcon color="gray" size="sm" type="modern" iconLeading={ArrowUp}>
                                {t("systemActive")}
                            </BadgeWithIcon>
                        </div>
                    </div>
                </div>
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
        </div>
    );
}
