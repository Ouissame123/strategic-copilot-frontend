import { useMemo, useState } from "react";
import { AlertCircle } from "@untitledui/icons";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { ProjectStatusBadge } from "@/components/project/project-status-badge";
import { Button } from "@/components/base/buttons/button";
import type { PortfolioProject } from "@/hooks/use-portfolio";

const PAGE_SIZE = 6;

const riskToBadgeColor: Record<PortfolioProject["riskLevel"], "success" | "warning" | "error"> = {
    low: "success",
    medium: "warning",
    high: "error",
};

function decisionBadgeTone(decision: string | undefined): "success" | "warning" | "error" | "gray" {
    const n = String(decision ?? "")
        .trim()
        .toLowerCase();
    if (n === "continue") return "success";
    if (n === "adjust") return "warning";
    if (n === "stop") return "error";
    return "gray";
}

const getInitials = (value: string) =>
    value
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("");

interface PortfolioTableProps {
    title: string;
    description: string;
    projects: PortfolioProject[];
    isLoading: boolean;
    error: string | null;
    onRetry: () => void;
    badge?: string;
}

export const PortfolioTable = ({ title, description, projects, isLoading, error, onRetry, badge }: PortfolioTableProps) => {
    const { t, i18n } = useTranslation("portfolio");
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));

    const paginatedProjects = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return projects.slice(start, start + PAGE_SIZE);
    }, [page, projects]);

    const onPageChange = (nextPage: number) => {
        const clampedPage = Math.max(1, Math.min(totalPages, nextPage));
        setPage(clampedPage);
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
            <TableCard.Root size="md">
                <TableCard.Header title={title} description={description} />
                <div className="flex min-h-64 items-center justify-center bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("table.loading")} />
                </div>
            </TableCard.Root>
        );
    }

    if (error && projects.length === 0) {
        return (
            <TableCard.Root size="md">
                <TableCard.Header title={title} description={description} />
                <div className="bg-primary px-4 py-10 md:px-6">
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
            </TableCard.Root>
        );
    }

    if (projects.length === 0) {
        return (
            <TableCard.Root size="md">
                <TableCard.Header title={title} description={description} />
                <div className="bg-primary px-4 py-10 md:px-6">
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
            </TableCard.Root>
        );
    }

    const showStaleWarning = Boolean(error && projects.length > 0);

    return (
        <TableCard.Root size="md">
            <TableCard.Header title={title} description={description} badge={badge} />
            {showStaleWarning && (
                <div
                    className="flex flex-col gap-3 border-b border-secondary bg-secondary/40 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6"
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
            <Table aria-label={t("table.ariaLabel")} className="min-w-full">
                <Table.Header className="sticky top-0 z-10">
                    <Table.Head id="project" label={t("table.columns.project")} />
                    <Table.Head id="status" label={t("table.columns.status")} />
                    <Table.Head id="decision" label={t("table.columns.decision")} />
                    <Table.Head id="risk" label={t("table.columns.risk")} />
                    <Table.Head id="budget" label={t("table.columns.budget")} />
                    <Table.Head id="updatedAt" label={t("table.columns.updated")} />
                    <Table.Head id="actions" />
                </Table.Header>
                <Table.Body items={paginatedProjects}>
                    {(project) => (
                        <Table.Row id={project.id}>
                            <Table.Cell>
                                <div className="flex items-center gap-3">
                                    <Avatar size="sm" initials={getInitials(project.owner)} />
                                    <div className="flex flex-col">
                                        <Button href={`/project/${project.id}`} color="tertiary" size="sm" className="h-auto justify-start p-0 text-left font-semibold">
                                            {project.name}
                                        </Button>
                                        <span className="text-xs text-tertiary md:text-sm">{project.owner}</span>
                                    </div>
                                </div>
                            </Table.Cell>
                            <Table.Cell>
                                <ProjectStatusBadge status={project.status} />
                            </Table.Cell>
                            <Table.Cell>
                                {project.aiDecision ? (
                                    <Badge color={decisionBadgeTone(project.aiDecision)} type="pill-color" size="sm">
                                        {project.aiDecision}
                                    </Badge>
                                ) : (
                                    <span className="text-sm text-tertiary">—</span>
                                )}
                            </Table.Cell>
                            <Table.Cell>
                                <Badge color={riskToBadgeColor[project.riskLevel]} type="pill-color" size="sm">
                                    {t(`risk.${project.riskLevel}`)}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell>
                                <div className="flex min-w-32 items-center gap-2">
                                    <span className="text-xs font-medium text-secondary md:text-sm">{project.budgetUsage}%</span>
                                    <Badge
                                        type="pill-color"
                                        size="sm"
                                        color={
                                            project.budgetUsage > 85
                                                ? "error"
                                                : project.budgetUsage > 60 && project.budgetUsage <= 85
                                                  ? "warning"
                                                  : "success"
                                        }
                                    >
                                        {t("budget.label")}
                                    </Badge>
                                </div>
                            </Table.Cell>
                            <Table.Cell>
                                <span className="text-xs text-tertiary md:text-sm">{formatDate(project.updatedAt)}</span>
                            </Table.Cell>
                            <Table.Cell>
                                <TableRowActionsDropdown />
                            </Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
            <PaginationCardMinimal page={page} total={totalPages} align="right" onPageChange={onPageChange} />
        </TableCard.Root>
    );
};
