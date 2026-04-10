import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { PortfolioTable } from "@/components/application/portfolio/portfolio-table";
import type { PortfolioStatus } from "@/hooks/use-portfolio";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { usePortfolio } from "@/hooks/use-portfolio";
import { cx } from "@/utils/cx";

export const ProjectsPage = () => {
    const { t } = useTranslation(["projects", "portfolio"]);
    useCopilotPage("projects", t("projects:title"));
    const [filter, setFilter] = useState<"all" | PortfolioStatus>("all");
    const { projects, isLoading, error, retry } = usePortfolio();

    const statusFilters: { label: string; value: "all" | PortfolioStatus }[] = [
        { label: t("projects:filters.all"), value: "all" },
        { label: t("projects:filters.active"), value: "active" },
        { label: t("projects:filters.at-risk"), value: "at-risk" },
        { label: t("projects:filters.planned"), value: "planned" },
        { label: t("projects:filters.paused"), value: "paused" },
        { label: t("projects:filters.completed"), value: "completed" },
    ];

    const filteredProjects = useMemo(() => {
        if (filter === "all") return projects;
        return projects.filter((project) => project.status === filter);
    }, [filter, projects]);

    return (
        <div className="space-y-6">
            <header className="rounded-xl border border-secondary bg-primary p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                            {t("projects:title")}
                        </h1>
                        <p className="mt-2 text-md text-tertiary">{t("projects:subtitle")}</p>
                    </div>
                    <Badge size="md" type="pill-color" color="gray">
                        {t("projects:lines", { count: filteredProjects.length })}
                    </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {statusFilters.map((statusFilter) => (
                        <Button
                            key={statusFilter.value}
                            size="sm"
                            color={filter === statusFilter.value ? "primary" : "secondary"}
                            className={cx("capitalize", filter === statusFilter.value && "pointer-events-none")}
                            onClick={() => setFilter(statusFilter.value)}
                        >
                            {statusFilter.label}
                        </Button>
                    ))}
                </div>
            </header>

            <PortfolioTable
                title={t("projects:table.title")}
                description={t("projects:table.description")}
                projects={filteredProjects}
                isLoading={isLoading}
                error={error}
                onRetry={retry}
                badge={
                    filter === "all"
                        ? t("projects:table.badgeAll")
                        : t(`portfolio:status.${filter as PortfolioStatus}`)
                }
            />
        </div>
    );
};
