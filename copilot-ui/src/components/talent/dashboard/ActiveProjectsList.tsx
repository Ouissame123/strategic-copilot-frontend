import type { TalentDashboard } from "@/types/talent-dashboard";
import { DashboardSectionCard } from "./DashboardSectionCard";
import type { TalentDashboardDensity } from "./use-talent-dashboard-density";
import { cx } from "@/utils/cx";

type ActiveProjectsListProps = {
    projects?: TalentDashboard["active_projects"];
    density: TalentDashboardDensity;
};

export function ActiveProjectsList({ projects, density }: ActiveProjectsListProps) {
    if (projects === undefined) return null;

    const compact = density === "compact";
    const items = projects.slice(0, 3);
    const empty = items.length === 0;

    return (
        <DashboardSectionCard
            title="Mes projets actifs"
            subtitle="Matchmaker"
            ctaLabel="Voir tout"
            ctaHref="/workspace/talent/projects"
            density={density}
            accent="action"
        >
            {empty ? (
                <p className={cx("text-tertiary", compact ? "text-xs" : "text-sm")}>Pas encore de projet assigné</p>
            ) : (
                <ul className="space-y-1.5">
                    {items.map((project) => (
                        <li
                            key={project.assignment_id}
                            className={cx(
                                "flex items-center justify-between gap-2 rounded-md border border-secondary/50 bg-secondary_subtle/20 px-2.5 py-2",
                            )}
                        >
                            <div className="min-w-0 flex-1">
                                <p className={cx("truncate font-medium text-primary", compact ? "text-xs" : "text-sm")}>
                                    {project.project_name}
                                </p>
                                <p className="text-[10px] text-tertiary">
                                    {[project.role_on_project, project.days_to_milestone != null ? `Jalon ${project.days_to_milestone}j` : null]
                                        .filter(Boolean)
                                        .join(" · ") || "—"}
                                </p>
                            </div>
                            <span className="shrink-0 rounded-md border border-brand-secondary/30 bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-brand-secondary">
                                {project.allocation_pct}%
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </DashboardSectionCard>
    );
}
