import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formatHorizonFromBackend, ProjectListRow } from "@/features/manager/pages/MyProjects/ProjectListRow";
import { localeForDateFormatting } from "@/lib/ui-locale";
import type { ProjectListItem, ProjectStatus } from "@/types/api.types";
import { cx } from "@/utils/cx";

export type PortfolioTableSortKey =
    | "name"
    | "fragility_score"
    | "decision"
    | "days_to_milestone"
    | "milestone_at"
    | "progress_pct";

type SortDir = "asc" | "desc";
export type ProjectsTableDensity = "comfortable" | "compact";

function coerceFiniteNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export function projectDecisionRaw(project: ProjectListItem): string {
    const aiDecision = project.ai_recommendation?.decision;
    if (aiDecision != null && String(aiDecision).trim() !== "") return String(aiDecision).trim();
    return String(project.decision ?? project.latest_decision ?? "").trim();
}

function SortableTh({
    columnKey,
    currentSortKey,
    sortDir,
    onSort,
    className = "",
    children,
}: {
    columnKey: PortfolioTableSortKey;
    currentSortKey: PortfolioTableSortKey;
    sortDir: SortDir;
    onSort: (k: PortfolioTableSortKey) => void;
    className?: string;
    children: ReactNode;
}) {
    const active = currentSortKey === columnKey;
    return (
        <th className={cx("whitespace-nowrap px-2 font-medium", className)}>
            <button
                type="button"
                onClick={() => onSort(columnKey)}
                className="inline-flex items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
                {children}
                {active ? <span className="text-[10px] font-bold tabular-nums">{sortDir === "asc" ? "↑" : "↓"}</span> : null}
            </button>
        </th>
    );
}

export function comparePortfolioProjects(a: ProjectListItem, b: ProjectListItem, key: PortfolioTableSortKey): number {
    switch (key) {
        case "name":
            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        case "fragility_score":
            return (coerceFiniteNumber(a.fragility_score) ?? -1) - (coerceFiniteNumber(b.fragility_score) ?? -1);
        case "decision":
            return projectDecisionRaw(a).localeCompare(projectDecisionRaw(b), undefined, { sensitivity: "base" });
        case "days_to_milestone":
            return (coerceFiniteNumber(a.days_to_milestone) ?? 9999) - (coerceFiniteNumber(b.days_to_milestone) ?? 9999);
        case "milestone_at": {
            const ta = a.milestone_at ? new Date(a.milestone_at).getTime() : Number.NaN;
            const tb = b.milestone_at ? new Date(b.milestone_at).getTime() : Number.NaN;
            return (Number.isFinite(ta) ? ta : 9999999999999) - (Number.isFinite(tb) ? tb : 9999999999999);
        }
        case "progress_pct":
            return (coerceFiniteNumber(a.progress_pct) ?? -1) - (coerceFiniteNumber(b.progress_pct) ?? -1);
        default:
            return 0;
    }
}

export function sortPortfolioProjects(
    rows: ProjectListItem[],
    sortKey: PortfolioTableSortKey,
    sortDir: SortDir,
): ProjectListItem[] {
    const arr = [...rows];
    arr.sort((a, b) => {
        const cmp = comparePortfolioProjects(a, b, sortKey);
        return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
}

export function ManagerProjectsPortfolioTable({
    rows,
    sortKey,
    sortDir,
    density,
    onSort,
    onOpenProject,
    t,
    statusLabel,
    projectDisplayName,
    onDeleteRequest,
    onEditRequest,
    onRunAnalysis,
    isAnalysisPending,
}: {
    rows: ProjectListItem[];
    sortKey: PortfolioTableSortKey;
    sortDir: SortDir;
    density: ProjectsTableDensity;
    onSort: (k: PortfolioTableSortKey) => void;
    onOpenProject: (project: ProjectListItem) => void;
    t: TFunction<"common", undefined>;
    statusLabel: (status: ProjectStatus) => string;
    projectDisplayName: (name: string) => string;
    onDeleteRequest?: (project: { id: string; name: string }) => void;
    onEditRequest?: (project: ProjectListItem) => void;
    onRunAnalysis?: (projectId: string) => void;
    isAnalysisPending?: boolean;
}) {
    const { i18n } = useTranslation("common");
    const dateLocale = localeForDateFormatting(i18n.resolvedLanguage ?? i18n.language);
    const rowPadding = density === "compact" ? "py-1.5 text-sm" : "py-3";
    const headerPadding = density === "compact" ? "py-2" : "py-2.5";

    return (
        <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <table className="min-w-[880px] w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-left backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
                    <tr>
                        <SortableTh
                            columnKey="name"
                            currentSortKey={sortKey}
                            sortDir={sortDir}
                            onSort={onSort}
                            className={cx("max-w-[320px] pl-3", headerPadding)}
                        >
                            {t("managerWorkspace.projects.colPortfolioProject")}
                        </SortableTh>
                        <SortableTh
                            columnKey="fragility_score"
                            currentSortKey={sortKey}
                            sortDir={sortDir}
                            onSort={onSort}
                            className={headerPadding}
                        >
                            {t("managerWorkspace.projects.colPortfolioFragility")}
                        </SortableTh>
                        <SortableTh
                            columnKey="decision"
                            currentSortKey={sortKey}
                            sortDir={sortDir}
                            onSort={onSort}
                            className={cx("min-w-[180px]", headerPadding)}
                        >
                            {t("managerWorkspace.projects.colPortfolioDecision")}
                        </SortableTh>
                        <SortableTh
                            columnKey="days_to_milestone"
                            currentSortKey={sortKey}
                            sortDir={sortDir}
                            onSort={onSort}
                            className={headerPadding}
                        >
                            {t("managerWorkspace.projects.colPortfolioHorizon")}
                        </SortableTh>
                        <SortableTh
                            columnKey="progress_pct"
                            currentSortKey={sortKey}
                            sortDir={sortDir}
                            onSort={onSort}
                            className={cx("min-w-[120px]", headerPadding)}
                        >
                            {t("managerWorkspace.projects.colProgress")}
                        </SortableTh>
                        <th className={cx("w-10 pr-3 text-right", headerPadding)}>
                            <span className="sr-only">{t("managerWorkspace.projects.colAction")}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((project) => {
                        const horizon = formatHorizonFromBackend(project, t, dateLocale);
                        const displayName = projectDisplayName(project.name);

                        return (
                            <ProjectListRow
                                key={project.id}
                                project={project}
                                rowPadding={rowPadding}
                                displayName={displayName}
                                statusLabel={statusLabel}
                                horizon={horizon}
                                t={t}
                                onOpenProject={onOpenProject}
                                onEditRequest={onEditRequest}
                                onDeleteRequest={onDeleteRequest}
                                onRunAnalysis={onRunAnalysis}
                                isAnalysisPending={isAnalysisPending}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
