import { Calendar, Users } from "lucide-react";
import type { TalentProjectListItem } from "@/types/talent-projects";
import { PROJECT_STATUS_TONES, badgeToneClass, type TalentProjectsDensity } from "./talent-projects-ui";
import { cx } from "@/utils/cx";

type ProjectCardProps = {
    project: TalentProjectListItem;
    density: TalentProjectsDensity;
    onClick: (project: TalentProjectListItem) => void;
};

export function ProjectCard({ project, density, onClick }: ProjectCardProps) {
    const isCompact = density === "compact";
    const statusTone = PROJECT_STATUS_TONES[project.project_status] ?? "slate";

    return (
        <button
            type="button"
            onClick={() => onClick(project)}
            className={cx(
                "flex w-full flex-col rounded-lg border border-secondary/60 bg-primary text-left shadow-sm transition hover:border-brand-secondary/40 hover:shadow-md",
                isCompact ? "gap-2 p-3" : "gap-2.5 p-4",
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <p className={cx("min-w-0 flex-1 font-semibold text-primary", isCompact ? "text-sm line-clamp-1" : "text-base line-clamp-2")}>
                    {project.project_name}
                </p>
                {project.project_status_label ? (
                    <span className={cx("shrink-0", badgeToneClass(statusTone))}>{project.project_status_label}</span>
                ) : null}
            </div>

            <p className={cx("text-secondary", isCompact ? "text-xs" : "text-sm")}>
                {project.role_on_project ? `Mon rôle : ${project.role_on_project}` : "Mon rôle : —"}
                {" · "}
                {project.allocation_pct}% allocation
            </p>

            <div className={cx("flex flex-wrap items-center gap-3 text-tertiary", isCompact ? "text-[11px]" : "text-xs")}>
                <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5 shrink-0" aria-hidden />
                    {project.team_size} talents
                </span>
                {project.days_to_milestone != null ? (
                    <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3.5 shrink-0" aria-hidden />
                        Échéance dans {project.days_to_milestone} j
                    </span>
                ) : null}
            </div>

            {!isCompact && project.project_description ? (
                <p className="line-clamp-2 text-sm text-tertiary">{project.project_description}</p>
            ) : null}
        </button>
    );
}
