import { ChevronRight } from "lucide-react";
import { cx } from "@/utils/cx";
import type { ImpactedProject } from "./validations-page-data";
import { validationCardClass } from "./validation-ui";

type TopImpactedProjectsCardProps = {
    projects: ImpactedProject[];
    onSelectProject?: (projectId: string) => void;
    activeProjectId?: string;
};

export function TopImpactedProjectsCard({ projects, onSelectProject, activeProjectId }: TopImpactedProjectsCardProps) {
    const max = projects[0]?.count ?? 1;

    return (
        <div className={validationCardClass}>
            <div className="border-b border-secondary/60 px-4 py-3">
                <h2 className="text-sm font-semibold text-primary">Projets les plus impactés</h2>
            </div>
            {projects.length === 0 ? (
                <p className="px-4 py-6 text-sm text-tertiary">Aucun projet identifié</p>
            ) : (
                <div className="max-h-[280px] divide-y divide-secondary/50 overflow-auto">
                    {projects.map((project) => (
                        <button
                            key={project.project_id}
                            type="button"
                            onClick={() => onSelectProject?.(project.project_id)}
                            className={cx(
                                "group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary_subtle/50",
                                activeProjectId === project.project_id && "bg-brand-primary/5",
                            )}
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-primary">{project.name}</p>
                                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary_subtle">
                                    <div
                                        className="h-full rounded-full bg-brand-secondary/40 transition-all group-hover:bg-brand-secondary/60"
                                        style={{ width: `${(project.count / max) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <span className="shrink-0 text-sm font-medium tabular-nums text-secondary">{project.count}</span>
                            <ChevronRight className="size-3.5 shrink-0 text-tertiary/50" aria-hidden />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
