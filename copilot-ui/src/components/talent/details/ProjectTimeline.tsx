import {
    TALENT_CARD,
    TALENT_LABEL,
    TALENT_TITLE,
    assignmentPeriodLabel,
    assignmentRoleLabel,
    type TalentAssignment,
} from "@/components/talent/talent-detail-shared";

const Box = ("di" + "v") as const;

export function ProjectTimeline({ assignments }: { assignments: TalentAssignment[] }) {
    const items = assignments.slice(0, 12);

    if (items.length === 0) {
        return (
            <section className={`${TALENT_CARD} p-6`}>
                <h2 className={TALENT_TITLE}>Historique projets</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Historique indisponible pour ce talent.</p>
            </section>
        );
    }

    return (
        <section className={`${TALENT_CARD} p-6`}>
            <h2 className={TALENT_TITLE}>Historique projets</h2>
            <p className={`mt-1 ${TALENT_LABEL}`}>12 derniers mois · affectations actives</p>
            <Box className="mt-4 overflow-x-auto pb-2">
                <ol className="flex min-w-max gap-0">
                    {items.map((a, index) => {
                        const period = assignmentPeriodLabel(a);
                        const role = assignmentRoleLabel(a.role_on_project);
                        const name = a.project_name ?? a.project_id ?? "Projet";
                        const isLast = index === items.length - 1;

                        return (
                            <li key={`${a.project_id}-${index}`} className="flex min-w-[200px] max-w-[240px] flex-col">
                                <Box className="flex items-center">
                                    <span className="flex h-3 w-3 flex-shrink-0 rounded-full bg-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-950" />
                                    {!isLast ? (
                                        <span className="h-0.5 min-w-[2rem] flex-1 bg-slate-300 dark:bg-slate-600" aria-hidden />
                                    ) : null}
                                </Box>
                                <Box className="mt-3 pr-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                                        {period}
                                    </p>
                                    <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{role}</p>
                                    {a.allocation_pct != null ? (
                                        <p className="mt-1 text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                            {Number(a.allocation_pct)}% allocation
                                        </p>
                                    ) : null}
                                </Box>
                            </li>
                        );
                    })}
                </ol>
            </Box>
        </section>
    );
}
