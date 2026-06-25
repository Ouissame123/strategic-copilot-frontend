import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { TALENT_SURFACE, TALENT_SURFACE_ACCENT } from "@/components/talent/ui/talent-workspace-ui";
import type { TalentDashboard } from "@/types/talent-dashboard";
import { cx } from "@/utils/cx";

type ActiveProjectsCardProps = {
    projects?: TalentDashboard["active_projects"];
};

function allocationBarColor(pct: number): string {
    if (pct >= 80) return "bg-red-500";
    if (pct >= 60) return "bg-orange-500";
    if (pct >= 30) return "bg-emerald-500";
    return "bg-amber-500";
}

export function ActiveProjectsCard({ projects }: ActiveProjectsCardProps) {
    if (projects === undefined) return null;

    const items = projects.slice(0, 3);
    const empty = items.length === 0;

    return (
        <section className={cx(TALENT_SURFACE, TALENT_SURFACE_ACCENT.action, "flex h-full flex-col p-5")} aria-labelledby="talent-active-projects-title">
            <header className="mb-4 flex items-start justify-between gap-2">
                <div>
                    <h2 id="talent-active-projects-title" className="text-base font-semibold text-primary">
                        Mes projets actifs
                    </h2>
                    <p className="mt-1 text-xs text-tertiary">Vos missions en cours</p>
                </div>
                <Link
                    to="/workspace/talent/projects"
                    className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                    aria-label="Voir tous mes projets"
                >
                    Voir tout
                    <ArrowRight className="size-3" aria-hidden />
                </Link>
            </header>

            {empty ? (
                <div className="py-6 text-center">
                    <p className="text-sm text-tertiary">Pas encore de projet assigné.</p>
                    <Link
                        to="/workspace/talent/projects"
                        className="mt-2 inline-block text-sm font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                    >
                        Voir mes projets
                    </Link>
                </div>
            ) : (
                <ul className="space-y-3">
                    {items.map((project) => {
                        const subtitle = [project.role_on_project, project.days_to_milestone != null ? `Jalon ${project.days_to_milestone}j` : null]
                            .filter(Boolean)
                            .join(" · ");

                        return (
                            <li
                                key={project.assignment_id}
                                className="rounded-lg border border-secondary/50 bg-secondary_subtle/20 p-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-primary">{project.project_name}</p>
                                        {subtitle ? <p className="mt-0.5 text-xs text-tertiary">{subtitle}</p> : null}
                                    </div>
                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-brand-secondary">
                                        {project.allocation_pct}%
                                    </span>
                                </div>
                                <div
                                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary/60"
                                    role="progressbar"
                                    aria-valuenow={project.allocation_pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`Allocation sur ${project.project_name}`}
                                >
                                    <div
                                        className={cx("h-full transition-all", allocationBarColor(project.allocation_pct))}
                                        style={{ width: `${Math.min(100, Math.max(0, project.allocation_pct))}%` }}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
