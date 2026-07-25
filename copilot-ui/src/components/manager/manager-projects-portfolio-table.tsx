import { useTranslation } from "react-i18next";
import { ProjectPortfolioRow } from "@/components/manager/projects/ProjectPortfolioRow";
import type { ProjectsListSortDirection, ProjectsListSortKey } from "@/components/manager/projects/projects-list-sort";
import type { ProjectListItem } from "@/types/api.types";

type ManagerProjectsPortfolioTableProps = {
    rows: ProjectListItem[];
    projectDisplayName: (name: string) => string;
    onSelectProject: (projectId: string) => void;
    onDeleteProject: (project: ProjectListItem) => void;
    sortKey: ProjectsListSortKey | null;
    sortDirection: ProjectsListSortDirection;
    onSort: (key: ProjectsListSortKey) => void;
};

export function ManagerProjectsPortfolioTable({
    rows,
    projectDisplayName,
    onSelectProject,
    onDeleteProject,
    sortKey,
    sortDirection,
    onSort,
}: ManagerProjectsPortfolioTableProps) {
    const { t, i18n } = useTranslation("common");
    const dateLocale = i18n.language?.startsWith("ar") ? "ar" : i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";

    const cols: Array<{ key: ProjectsListSortKey; label: string; numeric?: boolean }> = [
        { key: "project", label: t("managerWorkspace.projects.listColsV2.project") },
        { key: "priority", label: t("managerWorkspace.projects.listColsV2.priority") },
        { key: "team", label: t("managerWorkspace.projects.listColsV2.team") },
        { key: "budget", label: t("managerWorkspace.projects.listColsV2.budget") },
        { key: "deadline", label: t("managerWorkspace.projects.listColsV2.deadline") },
        { key: "updated", label: t("managerWorkspace.projects.listColsV2.updated") },
    ];

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[8%]" />
                    <col className="w-[16%]" />
                    <col className="w-[13%]" />
                    <col className="w-[16%]" />
                    <col className="w-[13%]" />
                    <col className="w-[8%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
                    <tr>
                        {cols.map((column) => (
                            <th
                                key={column.key}
                                className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 ${
                                    column.numeric ? "text-right" : "text-left"
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => onSort(column.key)}
                                    className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
                                    aria-label={`${t("managerWorkspace.projects.listColsV2.sortBy")} ${column.label}`}
                                >
                                    {column.label}
                                    {sortKey === column.key ? (
                                        <span aria-hidden>{sortDirection === "asc" ? "↑" : "↓"}</span>
                                    ) : null}
                                </button>
                            </th>
                        ))}
                        <th className="px-2 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            <span className="sr-only">{t("managerWorkspace.projects.menuDelete")}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((project, i) => (
                        <ProjectPortfolioRow
                            key={project.id}
                            project={project}
                            displayName={projectDisplayName(project.name)}
                            isEven={i % 2 === 0}
                            onSelectProject={onSelectProject}
                            onDeleteProject={onDeleteProject}
                            dateLocale={dateLocale}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
