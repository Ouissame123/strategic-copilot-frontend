import { useEffect } from "react";
import { X } from "lucide-react";
import { TalentProjectsApiError } from "@/api/talent-projects.api";
import { ErrorState } from "@/components/ui/ErrorState";
import { useTalentProjectDetail } from "@/hooks/useTalentProjects";
import type { TalentProjectListItem } from "@/types/talent-projects";
import {
    PROJECT_STATUS_TONES,
    SEVERITY_TONES,
    badgeToneClass,
    formatIsoDate,
} from "./talent-projects-ui";
import { cx } from "@/utils/cx";

type ProjectDetailDrawerProps = {
    open: boolean;
    projectId: string | null;
    listRow?: TalentProjectListItem | null;
    onClose: () => void;
};

function avatarInitial(name: string): string {
    const part = name.trim().split(/\s+/)[0];
    return part ? part[0]!.toUpperCase() : "?";
}

export function ProjectDetailDrawer({ open, projectId, listRow, onClose }: ProjectDetailDrawerProps) {
    const detailQuery = useTalentProjectDetail(open && projectId ? projectId : null);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open || !projectId) return null;

    const detail = detailQuery.data;
    const project = detail?.project;
    const is404 = detailQuery.error instanceof TalentProjectsApiError && detailQuery.error.httpStatus === 404;

    const headerName = project?.project_name ?? listRow?.project_name ?? "Projet";
    const headerStatusLabel = project?.project_status_label ?? listRow?.project_status_label;
    const headerStatus = project?.project_status ?? listRow?.project_status;

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]"
                aria-label="Fermer"
                onClick={onClose}
            />
            <aside
                className="fixed top-0 right-0 z-50 flex h-dvh w-full max-w-[520px] flex-col border-l border-secondary bg-primary shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="talent-project-drawer-title"
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            {headerStatusLabel && headerStatus ? (
                                <span className={badgeToneClass(PROJECT_STATUS_TONES[headerStatus])}>{headerStatusLabel}</span>
                            ) : null}
                            {detail?.viability?.score != null ? (
                                <span className={badgeToneClass("blue")}>{detail.viability.score}/10</span>
                            ) : null}
                            {detail?.viability?.decision_label ? (
                                <span className={badgeToneClass("slate")}>{detail.viability.decision_label}</span>
                            ) : null}
                        </div>
                        <h2 id="talent-project-drawer-title" className="line-clamp-2 text-base font-semibold text-primary">
                            {headerName}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-tertiary transition hover:bg-secondary_subtle hover:text-primary"
                        aria-label="Fermer"
                    >
                        <X className="size-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                    {detailQuery.isLoading && !detail ? (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-14 animate-pulse rounded-lg bg-secondary" />
                            ))}
                        </div>
                    ) : null}

                    {detailQuery.isError && !detail ? (
                        <ErrorState
                            title={is404 ? "Projet introuvable" : "Détail indisponible"}
                            message={
                                is404
                                    ? "Ce projet n'est pas accessible avec votre compte talent."
                                    : "Impossible de charger le détail de ce projet."
                            }
                            detail={
                                !is404 && detailQuery.error instanceof Error
                                    ? detailQuery.error.message
                                    : undefined
                            }
                            onRetry={is404 ? undefined : () => void detailQuery.refetch()}
                        />
                    ) : null}

                    {detail && project ? (
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Mon rôle</h3>
                                <dl className="mt-3 space-y-2 text-sm">
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-tertiary">Rôle</dt>
                                        <dd className="text-right font-medium text-primary">{project.my_role ?? "—"}</dd>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-tertiary">Allocation</dt>
                                        <dd className="text-right font-medium text-primary">{project.my_allocation_pct}%</dd>
                                    </div>
                                    {project.my_start_date ? (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-tertiary">Début</dt>
                                            <dd className="text-right text-secondary">{formatIsoDate(project.my_start_date)}</dd>
                                        </div>
                                    ) : null}
                                    {project.my_end_date ? (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-tertiary">Fin</dt>
                                            <dd className="text-right text-secondary">{formatIsoDate(project.my_end_date)}</dd>
                                        </div>
                                    ) : null}
                                </dl>
                            </section>

                            {project.project_description ? (
                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Description</h3>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">{project.project_description}</p>
                                </section>
                            ) : null}

                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Échéance & timeline</h3>
                                <dl className="mt-3 space-y-2 text-sm">
                                    {project.project_start_date ? (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-tertiary">Début projet</dt>
                                            <dd className="text-secondary">{formatIsoDate(project.project_start_date)}</dd>
                                        </div>
                                    ) : null}
                                    {project.milestone_at ? (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-tertiary">Jalon</dt>
                                            <dd className="text-secondary">{formatIsoDate(project.milestone_at)}</dd>
                                        </div>
                                    ) : null}
                                    {project.days_to_milestone != null ? (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-tertiary">Délai jalon</dt>
                                            <dd className="font-medium text-primary">{project.days_to_milestone} j</dd>
                                        </div>
                                    ) : null}
                                </dl>
                            </section>

                            {detail.team.length > 0 ? (
                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Équipe</h3>
                                    <ul className="mt-3 space-y-2">
                                        {detail.team.map((member) => (
                                            <li
                                                key={member.talent_id}
                                                className={cx(
                                                    "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                                                    member.is_me
                                                        ? "border-brand-secondary/40 bg-brand-primary/10"
                                                        : "border-secondary/70 bg-secondary_subtle/30",
                                                )}
                                            >
                                                <span
                                                    className={cx(
                                                        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                                        member.is_me
                                                            ? "bg-brand-solid text-white"
                                                            : "bg-secondary text-secondary",
                                                    )}
                                                >
                                                    {avatarInitial(member.name)}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-medium text-primary">{member.name}</p>
                                                        {member.is_me ? (
                                                            <span className={badgeToneClass("violet")}>Moi</span>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-xs text-tertiary">
                                                        {member.role_on_project ?? member.job_title} · {member.allocation_pct}%
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ) : null}

                            {detail.requirements.length > 0 ? (
                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                                        Compétences requises
                                    </h3>
                                    <ul className="mt-3 space-y-2">
                                        {detail.requirements.map((req) => (
                                            <li
                                                key={req.skill_id}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-secondary/70 bg-secondary_subtle/20 px-3 py-2"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-primary">{req.skill_name}</p>
                                                    {req.category ? (
                                                        <p className="text-xs text-tertiary">{req.category}</p>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className={badgeToneClass("blue")}>Niv. {req.level_required}</span>
                                                    {req.criticality ? (
                                                        <span className={badgeToneClass("amber")}>{req.criticality}</span>
                                                    ) : null}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ) : null}

                            {detail.alerts.length > 0 ? (
                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Alertes</h3>
                                    <ul className="mt-3 space-y-2">
                                        {detail.alerts.map((alert) => (
                                            <li
                                                key={alert.id}
                                                className={cx(
                                                    "rounded-lg border px-3 py-2.5",
                                                    badgeToneClass(SEVERITY_TONES[alert.severity]),
                                                )}
                                            >
                                                <p className="text-[10px] font-semibold uppercase">{alert.severity_label}</p>
                                                <p className="mt-1 text-sm font-medium text-primary">{alert.message}</p>
                                                {alert.impact_area ? (
                                                    <p className="mt-0.5 text-xs text-tertiary">{alert.impact_area}</p>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ) : null}

                            {detail.viability ? (
                                <section>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Viabilité</h3>
                                    <dl className="mt-3 space-y-2 text-sm">
                                        {detail.viability.score != null ? (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-tertiary">Score</dt>
                                                <dd className="font-medium text-primary">{detail.viability.score}/10</dd>
                                            </div>
                                        ) : null}
                                        {detail.viability.decision_label ? (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-tertiary">Décision</dt>
                                                <dd className="text-secondary">{detail.viability.decision_label}</dd>
                                            </div>
                                        ) : null}
                                        {detail.viability.confidence != null ? (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-tertiary">Confiance</dt>
                                                <dd className="text-secondary">{detail.viability.confidence}</dd>
                                            </div>
                                        ) : null}
                                    </dl>
                                </section>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </aside>
        </>
    );
}
