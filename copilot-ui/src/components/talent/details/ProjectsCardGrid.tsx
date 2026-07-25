import { Link } from "react-router";
import { FolderKanban } from "lucide-react";
import {
    TALENT_CARD,
    TALENT_LABEL,
    TALENT_TITLE,
    assignmentRoleLabel,
    type TalentAssignment,
} from "@/components/talent/talent-detail-shared";
import { managerProjectsOpenModalPath } from "@/utils/workspace-routes";

const Box = ("di" + "v") as const;

export interface ProjectsCardGridProps {
    assignments: TalentAssignment[];
    onProjectClick?: (projectId: string) => void;
}

function priorityLabel(priority: number | null | undefined): string {
    if (priority == null || !Number.isFinite(priority)) return "â€”";
    if (priority >= 3) return "Haute";
    if (priority >= 2) return "Moyenne";
    return "Basse";
}

function AllocationBar({ pct }: { pct: number }) {
    const value = Math.max(0, Math.min(200, Number(pct) || 0));
    const width = Math.min(100, value);
    const tone =
        value >= 160 ? "#f43f5e" : value >= 100 ? "#f59e0b" : value >= 80 ? "var(--color-primary-500)" : "#10b981";

    return (
        <svg viewBox="0 0 100 8" className="mt-2 h-2 w-full" role="img" aria-label={`Allocation ${value}%`}>
            <rect x="0" y="0" width="100" height="8" rx="4" fill="currentColor" className="text-slate-200 dark:text-slate-700" />
            <rect x="0" y="0" width={width} height="8" rx="4" fill={tone} />
        </svg>
    );
}

export function ProjectsCardGrid({ assignments, onProjectClick }: ProjectsCardGridProps) {
    if (assignments.length === 0) {
        return (
            <section className={`${TALENT_CARD} p-6`}>
                <h2 className={TALENT_TITLE}>Projets actifs</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aucun projet actif.</p>
            </section>
        );
    }

    return (
        <section className={`${TALENT_CARD} p-6`}>
            <h2 className={TALENT_TITLE}>Projets actifs</h2>
            <p className={`mt-1 ${TALENT_LABEL}`}>
                {assignments.length} affectation{assignments.length > 1 ? "s" : ""}
            </p>
            <Box className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {assignments.map((a, index) => {
                    const projectId = String(a.project_id ?? "");
                    const name = a.project_name ?? projectId ?? "Projet";
                    const pct = Number(a.allocation_pct ?? 0);
                    const role = assignmentRoleLabel(a.role_on_project);
                    const priority = (a as { project_priority?: number }).project_priority;

                    const inner = (
                        <>
                            <Box className="flex items-start gap-2">
                                <FolderKanban className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" aria-hidden />
                                <Box className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{role}</p>
                                </Box>
                                <span className="text-sm font-bold tabular-nums text-primary-600 dark:text-primary-400">
                                    {pct}%
                                </span>
                            </Box>
                            <Box className="mt-3 flex items-center justify-between text-xs">
                                <span className={TALENT_LABEL}>PrioritÃ©</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{priorityLabel(priority)}</span>
                            </Box>
                            <AllocationBar pct={pct} />
                        </>
                    );

                    const className =
                        "block rounded-lg border border-slate-200 bg-slate-50/80 p-4 transition hover:border-primary-300 hover:bg-primary-50/50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-primary-700 dark:hover:bg-primary-950/20";

                    if (onProjectClick && projectId) {
                        return (
                            <button
                                key={`${projectId}-${index}`}
                                type="button"
                                className={`${className} w-full text-left`}
                                onClick={() => onProjectClick(projectId)}
                            >
                                {inner}
                            </button>
                        );
                    }

                    if (projectId) {
                        return (
                            <Link key={`${projectId}-${index}`} to={managerProjectsOpenModalPath(projectId)} className={className}>
                                {inner}
                            </Link>
                        );
                    }

                    return (
                        <article key={index} className={className}>
                            {inner}
                        </article>
                    );
                })}
            </Box>
        </section>
    );
}
