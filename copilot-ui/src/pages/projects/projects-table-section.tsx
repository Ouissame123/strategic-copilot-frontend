import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ErrorBanner } from "@/components/application/error-banner/error-banner";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import type { ProjectWithViability, ProjectsPagination } from "@/hooks/use-projects-list-query";
import type { Project } from "@/types/crud-domain";
import {
    formatLastUpdate,
    getDecisionBadgeColor,
    getProjectField,
    normalizeProjectStatus,
} from "@/pages/projects/projects-utils";
import { useWorkspacePaths } from "@/hooks/use-workspace-paths";
import { useWhatIf } from "@/providers/what-if-provider";
import { cx } from "@/utils/cx";

type ProjectsTableSectionProps = {
    loading: boolean;
    error: string | null;
    empty: boolean;
    emptyDueToFilter?: boolean;
    filteredProjects: ProjectWithViability[];
    pagination: ProjectsPagination;
    perPage: number;
    pageSizeOptions: readonly number[];
    onPerPageChange: (perPage: number) => void;
    onRetry: () => void;
    onPageChange: (page: number) => void;
    onOpenDrawer: (project: Project) => void;
    onOpenDrawerAndScrollInsights: (project: Project) => void;
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
    fetchDisabled: boolean;
};

const STATUS_LABEL_FR: Record<string, string> = {
    active: "Actif",
    planned: "Planifié",
    paused: "En pause",
    completed: "Terminé",
    "at-risk": "À risque",
    cancelled: "Annulé",
};

const STATUS_DOT: Record<string, string> = {
    active: "bg-emerald-500",
    planned: "bg-sky-500",
    paused: "bg-amber-500",
    completed: "bg-emerald-600",
    "at-risk": "bg-red-500",
    cancelled: "bg-utility-gray-400",
};

function viabilityTone(score: number | null | undefined): "ok" | "watch" | "risk" | "empty" {
    if (score == null || !Number.isFinite(score)) return "empty";
    if (score >= 7) return "ok";
    if (score >= 4) return "watch";
    return "risk";
}

function riskTone(label: string | null | undefined): "high" | "medium" | "low" | "empty" {
    const v = String(label ?? "").trim().toLowerCase();
    if (v === "high" || v === "élevé" || v === "eleve") return "high";
    if (v === "medium" || v === "moyen") return "medium";
    if (v === "low" || v === "faible") return "low";
    return "empty";
}

function parseNumeric(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v.replace(",", "."));
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function getHealthScore(row: Project): number | null {
    const raw = getProjectField(row, [
        "health_score",
        "healthScore",
        "health",
        "sante",
        "health_index",
        "progress",
    ]);
    return parseNumeric(raw);
}

function healthBarColor(score: number | null): string {
    if (score == null) return "bg-utility-gray-300";
    if (score >= 6) return "bg-emerald-500";
    if (score >= 3.5) return "bg-amber-500";
    return "bg-red-500";
}

export function ProjectsTableSection({
    loading,
    error,
    empty,
    emptyDueToFilter = false,
    filteredProjects,
    pagination,
    perPage: _perPage,
    pageSizeOptions: _pageSizeOptions,
    onPerPageChange: _onPerPageChange,
    onRetry,
    onPageChange,
    onOpenDrawer,
    onOpenDrawerAndScrollInsights: _onOpenDrawerAndScrollInsights,
    onEdit: _onEdit,
    onDelete: _onDelete,
    fetchDisabled,
}: ProjectsTableSectionProps) {
    const { t } = useTranslation(["projects", "portfolio", "dataCrud", "common"]);
    const navigate = useNavigate();
    const paths = useWorkspacePaths();
    const { open: openWhatIf } = useWhatIf();
    const [jumpPage, setJumpPage] = useState(() => String(pagination.page));

    useEffect(() => {
        setJumpPage(String(pagination.page));
    }, [pagination.page]);

    return (
        <TableCard.Root size="md">
            {loading ? (
                <div className="flex min-h-48 items-center justify-center bg-primary p-8">
                    <LoadingIndicator type="line-simple" size="md" label={t("dataCrud:loading")} />
                </div>
            ) : error ? (
                <div className="bg-primary px-4 py-8 md:px-6">
                    <ErrorBanner message={`${t("dataCrud:errorLoad")} — ${error}`} onRetry={onRetry} />
                </div>
            ) : empty ? (
                <div className="bg-primary px-4 py-10 md:px-6">
                    <EmptyState size="md">
                        <EmptyState.Content>
                            <EmptyState.Title>
                                {emptyDueToFilter ? t("projects:table.emptyFilter") : t("dataCrud:empty")}
                            </EmptyState.Title>
                        </EmptyState.Content>
                    </EmptyState>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <Table aria-label={t("projects:table.title")} className="min-w-full">
                            <Table.Header className="sticky top-0 z-10">
                                <Table.Head id="name" label="Nom du projet" isRowHeader />
                                <Table.Head id="status" label="Statut" />
                                <Table.Head id="decision" label="Décision IA" />
                                <Table.Head id="viability" label="Viabilité" />
                                <Table.Head id="risk" label="Risque" />
                                <Table.Head id="health" label="Santé" />
                                <Table.Head id="updated" label="Dernière analyse" />
                                <Table.Head id="actions" label="Actions" />
                            </Table.Header>
                            <Table.Body items={filteredProjects}>
                                {(row) => {
                                    const statusKey = normalizeProjectStatus(String(row.status ?? ""));
                                    const statusLabel = STATUS_LABEL_FR[statusKey] ?? (row.status ? String(row.status) : "—");
                                    const statusDot = STATUS_DOT[statusKey] ?? "bg-utility-gray-400";

                                    const score =
                                        typeof row.viabilityScore === "number" && Number.isFinite(row.viabilityScore)
                                            ? row.viabilityScore
                                            : null;
                                    const tone = viabilityTone(score);

                                    const riskLabel = row.riskLabel != null ? String(row.riskLabel) : null;
                                    const risk = riskTone(riskLabel);

                                    const health = getHealthScore(row);
                                    const healthPct = health != null ? Math.max(0, Math.min(100, (health / 10) * 100)) : 0;

                                    const decision = row.decision != null ? String(row.decision).trim() : "";

                                    return (
                                        <Table.Row id={row.id}>
                                            <Table.Cell className="align-top">
                                                <button
                                                    type="button"
                                                    className="w-full max-w-full rounded-lg text-left outline-none transition hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-focus-ring"
                                                    onClick={() => onOpenDrawer(row)}
                                                >
                                                    <div className="text-base font-semibold leading-snug text-primary">
                                                        {row.name || "—"}
                                                    </div>
                                                    {row.description ? (
                                                        <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-tertiary">
                                                            {String(row.description)}
                                                        </div>
                                                    ) : null}
                                                </button>
                                            </Table.Cell>

                                            <Table.Cell className="align-top">
                                                <span className="inline-flex items-center gap-2 rounded-full bg-secondary/50 px-2.5 py-1 text-xs font-semibold text-secondary ring-1 ring-secondary">
                                                    <span className={cx("size-1.5 shrink-0 rounded-full", statusDot)} />
                                                    {statusLabel}
                                                </span>
                                            </Table.Cell>

                                            <Table.Cell className="align-top">
                                                {decision ? (
                                                    <Badge
                                                        type="pill-color"
                                                        size="sm"
                                                        color={getDecisionBadgeColor(decision)}
                                                    >
                                                        {decision}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-tertiary">—</span>
                                                )}
                                            </Table.Cell>

                                            <Table.Cell className="align-top">
                                                {score != null ? (
                                                    <span className="flex flex-col leading-tight">
                                                        <span
                                                            className={cx(
                                                                "text-sm font-semibold tabular-nums",
                                                                tone === "ok" && "text-emerald-600 dark:text-emerald-400",
                                                                tone === "watch" && "text-amber-600 dark:text-amber-400",
                                                                tone === "risk" && "text-red-600 dark:text-red-400",
                                                            )}
                                                        >
                                                            {score.toFixed(2).replace(/\.?0+$/, "")}
                                                        </span>
                                                        <span className="text-[11px] text-tertiary">/10</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-tertiary">—</span>
                                                )}
                                            </Table.Cell>

                                            <Table.Cell className="align-top">
                                                <span
                                                    className={cx(
                                                        "text-sm font-medium",
                                                        risk === "high" && "text-red-600 dark:text-red-400",
                                                        risk === "medium" && "text-amber-600 dark:text-amber-400",
                                                        risk === "low" && "text-emerald-600 dark:text-emerald-400",
                                                        risk === "empty" && "text-tertiary",
                                                    )}
                                                >
                                                    {riskLabel ?? "—"}
                                                </span>
                                            </Table.Cell>

                                            <Table.Cell className="align-top">
                                                {health != null ? (
                                                    <div className="flex min-w-[6rem] flex-col gap-1">
                                                        <span
                                                            className={cx(
                                                                "text-sm font-semibold tabular-nums",
                                                                health >= 6 && "text-emerald-600 dark:text-emerald-400",
                                                                health >= 3.5 && health < 6 && "text-amber-600 dark:text-amber-400",
                                                                health < 3.5 && "text-red-600 dark:text-red-400",
                                                            )}
                                                        >
                                                            {health.toFixed(1)}
                                                        </span>
                                                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                                                            <div
                                                                className={cx("h-full rounded-full transition-all", healthBarColor(health))}
                                                                style={{ width: `${healthPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-tertiary">—</span>
                                                )}
                                            </Table.Cell>

                                            <Table.Cell className="align-top">
                                                <span className="whitespace-nowrap text-xs text-secondary">
                                                    {formatLastUpdate(row)}
                                                </span>
                                            </Table.Cell>

                                            <Table.Cell className="align-top">
                                                <div className="flex flex-col items-stretch gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        color="primary"
                                                        onClick={() => {
                                                            const targetId = String(
                                                                (row as Record<string, unknown>).project_id ?? row.id ?? "",
                                                            ).trim();
                                                            if (!targetId) return;
                                                            navigate(paths.project(targetId));
                                                        }}
                                                    >
                                                        Ouvrir
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        color="secondary"
                                                        onClick={() => {
                                                            const pid = String(
                                                                (row as Record<string, unknown>).project_id ?? row.id ?? "",
                                                            ).trim();
                                                            if (!pid) return;
                                                            const pname = String(
                                                                (row as Record<string, unknown>).name ??
                                                                    (row as Record<string, unknown>).title ??
                                                                    "",
                                                            ).trim();
                                                            openWhatIf({ projectId: pid, projectName: pname });
                                                        }}
                                                    >
                                                        What-if
                                                    </Button>
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                }}
                            </Table.Body>
                        </Table>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-secondary bg-primary px-4 py-3 text-sm md:flex-row md:flex-wrap md:items-center md:justify-between md:px-6">
                        <span className="text-tertiary">
                            {pagination.total_items > 0
                                ? `+ ${Math.max(0, pagination.total_items - filteredProjects.length)} projet(s) supplémentaire(s) · page ${pagination.page} / ${pagination.total_pages}`
                                : `page ${pagination.page} / ${pagination.total_pages}`}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                color="tertiary"
                                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                                isDisabled={fetchDisabled || pagination.page <= 1}
                            >
                                ← {t("common:previous")}
                            </Button>
                            <Button
                                size="sm"
                                color="tertiary"
                                onClick={() => onPageChange(Math.min(pagination.total_pages, pagination.page + 1))}
                                isDisabled={fetchDisabled || pagination.page >= pagination.total_pages}
                            >
                                {t("common:next")} →
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </TableCard.Root>
    );
}
