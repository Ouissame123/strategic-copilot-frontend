import { useMemo, useState } from "react";
import { AlertCircle } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { TableRowActionsDropdown } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { ProjectStatusBadge } from "@/components/project/project-status-badge";
import { Button } from "@/components/base/buttons/button";
import type { PortfolioProject } from "@/hooks/use-portfolio";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { cx } from "@/utils/cx";

const PAGE_SIZE = 6;

/** Conteneur principal — rayon, ombre douce et anneau léger alignés sur le dashboard. */
const shellClass =
    "overflow-hidden rounded-2xl border border-secondary/65 bg-primary shadow-md ring-1 ring-secondary/40 dark:shadow-lg dark:ring-secondary/30";

const projectCardClass =
    "group flex h-full min-h-[17rem] flex-col rounded-2xl border border-secondary/60 bg-gradient-to-b from-primary to-secondary/15 p-6 shadow-md ring-1 ring-secondary/40 transition hover:shadow-lg dark:shadow-lg dark:ring-secondary/35 dark:hover:shadow-xl";

const riskToBadgeColor: Record<PortfolioProject["riskLevel"], "success" | "warning" | "error"> = {
    low: "success",
    medium: "warning",
    high: "error",
};

const getInitials = (value: string) =>
    value
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("");

function BudgetBar({ value }: { value: number }) {
    const v = Math.max(0, Math.min(100, value));
    const tone = v > 85 ? "bg-error-primary" : v > 60 ? "bg-warning-primary" : "bg-success-primary";
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/90" role="presentation">
            <div className={cx("h-full rounded-full transition-all duration-500", tone)} style={{ width: `${v}%` }} />
        </div>
    );
}

interface PortfolioProjectCardsProps {
    title: string;
    description?: string;
    projects: PortfolioProject[];
    isLoading: boolean;
    error: string | null;
    onRetry: () => void;
    badge?: string;
}

export function PortfolioProjectCards({
    title,
    description,
    projects,
    isLoading,
    error,
    onRetry,
    badge,
}: PortfolioProjectCardsProps) {
    const { t, i18n } = useTranslation("portfolio");
    const paths = useWorkspacePaths();
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));

    const paginatedProjects = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return projects.slice(start, start + PAGE_SIZE);
    }, [page, projects]);

    const onPageChange = (nextPage: number) => {
        setPage(Math.max(1, Math.min(totalPages, nextPage)));
    };

    const locale =
        i18n.language.startsWith("ar") ? "ar-EG" : i18n.language.startsWith("en") ? "en-US" : "fr-FR";

    const formatDate = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "-";
        return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
    };

    if (isLoading) {
        return (
            <section className={shellClass}>
                <div className="border-b border-secondary/80 px-6 py-6 md:px-8">
                    <h2 className="text-lg font-semibold text-primary">{title}</h2>
                    {description ? <p className="mt-1 text-sm text-tertiary">{description}</p> : null}
                </div>
                <div className="flex min-h-64 items-center justify-center px-6 py-12 md:px-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("table.loading")} />
                </div>
            </section>
        );
    }

    if (error && projects.length === 0) {
        return (
            <section className={shellClass}>
                <div className="border-b border-secondary/80 px-6 py-6 md:px-8">
                    <h2 className="text-lg font-semibold text-primary">{title}</h2>
                </div>
                <div className="px-6 py-12 md:px-8">
                    <EmptyState size="md">
                        <EmptyState.Header pattern="none">
                            <EmptyState.FeaturedIcon icon={AlertCircle} color="error" theme="light" />
                        </EmptyState.Header>
                        <EmptyState.Content>
                            <EmptyState.Title>{t("table.errorTitle")}</EmptyState.Title>
                            <EmptyState.Description>{error}</EmptyState.Description>
                        </EmptyState.Content>
                        <EmptyState.Footer>
                            <Button color="secondary" onClick={onRetry}>
                                {t("table.errorRetry")}
                            </Button>
                        </EmptyState.Footer>
                    </EmptyState>
                </div>
            </section>
        );
    }

    if (projects.length === 0) {
        return (
            <section className={shellClass}>
                <div className="border-b border-secondary/80 px-6 py-6 md:px-8">
                    <h2 className="text-lg font-semibold text-primary">{title}</h2>
                </div>
                <div className="px-6 py-12 md:px-8">
                    <EmptyState size="md">
                        <EmptyState.Header>
                            <EmptyState.FeaturedIcon color="gray" />
                        </EmptyState.Header>
                        <EmptyState.Content>
                            <EmptyState.Title>{t("table.emptyTitle")}</EmptyState.Title>
                            <EmptyState.Description>{t("table.emptyDescription")}</EmptyState.Description>
                        </EmptyState.Content>
                    </EmptyState>
                </div>
            </section>
        );
    }

    const showStaleWarning = Boolean(error && projects.length > 0);

    return (
        <section className={shellClass}>
            <div className="flex flex-col gap-2 border-b border-secondary/80 px-6 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-primary">{title}</h2>
                        {badge ? (
                            <Badge color="brand" size="sm" type="pill-color">
                                {badge}
                            </Badge>
                        ) : null}
                    </div>
                    {description ? <p className="mt-1 text-sm text-tertiary">{description}</p> : null}
                </div>
            </div>
            {showStaleWarning && (
                <div
                    className="flex flex-col gap-3 border-b border-secondary/80 bg-secondary/35 px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8"
                    role="status"
                >
                    <p className="text-sm text-secondary">
                        <span className="font-medium text-primary">{t("table.errorTitle")}</span>
                        {" — "}
                        {error}
                    </p>
                    <Button color="secondary" size="sm" onClick={onRetry}>
                        {t("table.errorRetry")}
                    </Button>
                </div>
            )}
            <div className="grid auto-rows-fr grid-cols-1 gap-6 p-6 sm:grid-cols-2 md:p-8 lg:grid-cols-3">
                {paginatedProjects.map((project) => (
                    <article key={project.id} className={projectCardClass}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <Avatar size="sm" initials={getInitials(project.owner)} />
                                <div className="min-w-0">
                                    <Link
                                        to={paths.project(project.id)}
                                        className="line-clamp-2 font-semibold text-primary underline-offset-2 hover:underline"
                                    >
                                        {project.name}
                                    </Link>
                                    <p className="truncate text-xs text-tertiary">{project.owner}</p>
                                </div>
                            </div>
                            <TableRowActionsDropdown />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <ProjectStatusBadge status={project.status} />
                            <Badge color={riskToBadgeColor[project.riskLevel]} type="pill-color" size="sm">
                                {t(`risk.${project.riskLevel}`)}
                            </Badge>
                        </div>
                        <div className="mt-5 space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-medium text-secondary">
                                <span>{t("cards.budgetUse")}</span>
                                <span className="tabular-nums text-primary">{project.budgetUsage}%</span>
                            </div>
                            <BudgetBar value={project.budgetUsage} />
                        </div>
                        <p className="mt-4 text-xs text-quaternary">
                            {t("cards.updated")} {formatDate(project.updatedAt)}
                        </p>
                        <div className="mt-auto border-t border-secondary/70 pt-5">
                            <Link
                                to={paths.project(project.id)}
                                className={cx(
                                    "inline-flex w-full items-center justify-center rounded-2xl px-3 py-2.5 text-sm font-semibold shadow-xs ring-1 ring-inset transition duration-100 ease-linear",
                                    "bg-primary text-secondary ring-primary hover:bg-primary_hover hover:text-secondary_hover",
                                )}
                            >
                                {t("cards.open")}
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
            <PaginationCardMinimal page={page} total={totalPages} align="right" onPageChange={onPageChange} />
        </section>
    );
}
