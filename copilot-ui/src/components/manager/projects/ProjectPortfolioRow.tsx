import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Trash01 } from "@untitledui/icons";
import {
    budgetConsumptionPct,
    capacityLoadLabel,
    deadlineUrgencyBadge,
    statusNeutralBadgeClass,
} from "@/components/manager/projects/projects-list-ui";
import { formatRelativeShort } from "@/lib/format-relative-short";
import type { ProjectListItem } from "@/types/api.types";
import { managerProjectMissionControlPath } from "@/utils/workspace-routes";
import { cx } from "@/utils/cx";

type ProjectPortfolioRowProps = {
    project: ProjectListItem;
    displayName: string;
    isEven: boolean;
    onSelectProject: (projectId: string) => void;
    onDeleteProject: (project: ProjectListItem) => void;
    dateLocale: string;
};

function formatMilestone(iso: string | null, dateLocale: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
}

export function ProjectPortfolioRow({
    project,
    displayName,
    isEven,
    onSelectProject,
    onDeleteProject,
    dateLocale,
}: ProjectPortfolioRowProps) {
    const { t } = useTranslation("common");
    const detailPath = managerProjectMissionControlPath(project.id);
    const statusLabel = project.status_label?.trim() || "—";
    const load = capacityLoadLabel(project.capacity_load_pct);
    const loadLabel =
        load.labelKey === "unknown"
            ? "—"
            : t(`managerWorkspace.projects.listCapacity.${load.labelKey}`);
    const budgetPct = budgetConsumptionPct(project);
    const urgency = deadlineUrgencyBadge(project.deadline_urgency);

    return (
        <tr
            onClick={() => onSelectProject(project.id)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectProject(project.id);
                }
            }}
            tabIndex={0}
            role="link"
            className={cx(
                "cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-400 dark:border-slate-800 dark:hover:bg-slate-900/50",
                isEven ? "bg-white dark:bg-slate-950" : "bg-slate-50/40 dark:bg-slate-900/20",
            )}
        >
            <td className="px-3 py-2.5 align-middle">
                <Link
                    to={detailPath}
                    onClick={(e) => e.stopPropagation()}
                    className="block min-w-0 font-medium text-slate-900 hover:underline dark:text-slate-100"
                >
                    <span className="line-clamp-1">{displayName}</span>
                </Link>
                <span
                    className={cx(
                        "mt-1 inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                        statusNeutralBadgeClass(project.status),
                    )}
                >
                    {statusLabel}
                </span>
            </td>
            <td className="px-3 py-2.5 align-middle tabular-nums text-slate-700 dark:text-slate-300">
                P{project.priority}
            </td>
            <td className="px-3 py-2.5 align-middle">
                <div className="text-slate-800 dark:text-slate-200">
                    {t("managerWorkspace.projects.listRow.talents", { count: project.team_size })}
                </div>
                <div className={cx("mt-0.5 text-[11px] font-medium", load.toneClass)}>
                    {loadLabel}
                    {project.capacity_load_pct != null ? (
                        <span className="ml-1 tabular-nums opacity-70">({Math.round(project.capacity_load_pct)}%)</span>
                    ) : null}
                </div>
            </td>
            <td className="px-3 py-2.5 align-middle">
                {budgetPct == null ? (
                    <span className="text-slate-400">—</span>
                ) : (
                    <div className="min-w-[5rem] max-w-[8rem]">
                        <div className="mb-1 flex justify-between text-[10px] tabular-nums text-slate-500">
                            <span>{Math.round(budgetPct)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                                className={cx(
                                    "h-full rounded-full transition-[width]",
                                    budgetPct > 100 ? "bg-amber-500" : "bg-slate-500 dark:bg-slate-400",
                                )}
                                style={{ width: `${Math.min(100, Math.max(0, budgetPct))}%` }}
                            />
                        </div>
                    </div>
                )}
            </td>
            <td className="px-3 py-2.5 align-middle">
                <div className="text-slate-700 dark:text-slate-300">{formatMilestone(project.milestone_at, dateLocale)}</div>
                {urgency ? (
                    <span
                        className={cx(
                            "mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                            urgency.className,
                        )}
                    >
                        {t(`managerWorkspace.projects.listDeadline.${urgency.labelKey}`)}
                    </span>
                ) : null}
            </td>
            <td className="px-3 py-2.5 align-middle text-xs text-slate-500 dark:text-slate-400">
                {formatRelativeShort(project.updated_at)}
            </td>
            <td className="px-2 py-2.5 align-middle text-right">
                <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label={t("managerWorkspace.projects.menuDelete")}
                    title={t("managerWorkspace.projects.menuDelete")}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project);
                    }}
                >
                    <Trash01 className="size-4" aria-hidden />
                </button>
            </td>
        </tr>
    );
}
