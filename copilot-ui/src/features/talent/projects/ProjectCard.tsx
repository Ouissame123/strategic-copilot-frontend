import { AlertCircle, Users } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { TalentProjectListItem } from "@/types/talent-projects";
import {
    PROJECT_LIFECYCLE_TAB_LABELS,
    PROJECT_LIFECYCLE_TAB_TONES,
    classifyProjectTab,
} from "./utils/classifyProjectTab";
import { formatDeadline } from "./utils/formatDeadline";
import { badgeToneClass } from "./talent-projects-ui";
import { cx } from "@/utils/cx";

type ProjectCardProps = {
    project: TalentProjectListItem;
    onClick?: (project: TalentProjectListItem) => void;
};

/** Préfère `milestone_at` ; sinon reconstruit une date relative depuis `days_to_milestone`. */
function resolveDeadlineDate(project: TalentProjectListItem): Date | null {
    if (project.milestone_at) {
        const parsed = new Date(project.milestone_at);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    if (project.days_to_milestone == null || !Number.isFinite(project.days_to_milestone)) return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + Math.trunc(project.days_to_milestone));
    return d;
}

function AllocationBar({ pct }: { pct: number }) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    return (
        <span className="inline-flex items-center gap-2" title={`${clamped}%`}>
            <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-secondary" aria-hidden>
                <span
                    className="absolute inset-y-0 left-0 rounded-full bg-brand-secondary"
                    style={{ width: `${clamped}%` }}
                />
            </span>
            <span className="text-xs tabular-nums text-tertiary">{clamped}%</span>
        </span>
    );
}

const DEADLINE_TONE_CLASS = {
    default: "text-tertiary",
    warning: "text-amber-700 dark:text-amber-300",
    danger: "text-red-600 dark:text-red-400",
} as const;

export function ProjectCard({ project, onClick }: ProjectCardProps) {
    const clickable = typeof onClick === "function";
    const lifecycle = classifyProjectTab(project);
    const statusTone = PROJECT_LIFECYCLE_TAB_TONES[lifecycle];
    const statusLabel = PROJECT_LIFECYCLE_TAB_LABELS[lifecycle];
    const roleLabel = project.role_on_project?.trim() || "Contributor";
    const description = project.project_description?.trim() ?? "";

    const deadlineDate = resolveDeadlineDate(project);
    const deadline = deadlineDate ? formatDeadline(deadlineDate) : null;

    const handleActivate = () => {
        if (clickable) onClick(project);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (!clickable) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick(project);
        }
    };

    return (
        <article
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={handleActivate}
            onKeyDown={handleKeyDown}
            className={cx(
                "flex h-full w-full flex-col gap-2.5 rounded-lg border border-secondary/60 bg-primary p-4 text-left shadow-sm transition",
                clickable && "cursor-pointer hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-solid",
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 font-semibold text-primary">{project.project_name}</p>
                <span className={cx("shrink-0", badgeToneClass(statusTone))}>{statusLabel}</span>
            </div>

            {description ? <p className="line-clamp-2 text-sm text-tertiary">{description}</p> : null}

            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-secondary bg-primary px-2.5 py-0.5 text-xs font-medium text-secondary ring-1 ring-inset ring-secondary/40">
                    {roleLabel}
                </span>
                <AllocationBar pct={project.allocation_pct} />
            </div>

            <footer className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 pt-0.5 text-xs text-tertiary">
                <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5 shrink-0" aria-hidden />
                    {project.team_size} talent{project.team_size > 1 ? "s" : ""}
                </span>
                {deadline ? (
                    <>
                        <span aria-hidden>·</span>
                        <span className={cx("inline-flex items-center gap-1", DEADLINE_TONE_CLASS[deadline.tone])}>
                            {deadline.tone === "danger" ? (
                                <AlertCircle className="size-3.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
                            ) : null}
                            {deadline.label}
                        </span>
                    </>
                ) : null}
            </footer>
        </article>
    );
}
