import type { ProjectListItem } from "@/types/api.types";

type ProjectsSummaryBarProps = {
    projects: ProjectListItem[];
};

/** Compteur factuel simple (sans décisions IA). */
export function ProjectsSummaryBar({ projects }: ProjectsSummaryBarProps) {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "active").length;
    const overdue = projects.filter((p) => p.deadline_urgency === "overdue").length;

    return (
        <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                {total} projet{total > 1 ? "s" : ""}
            </span>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                {active} actif{active > 1 ? "s" : ""}
            </span>
            {overdue > 0 ? (
                <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    {overdue} en retard
                </span>
            ) : null}
        </div>
    );
}
