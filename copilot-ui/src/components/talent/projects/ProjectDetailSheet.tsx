import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { TalentProjectsApiError } from "@/api/talent-projects.api";
import { ErrorState } from "@/components/ui/ErrorState";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useTalentProjectDetail } from "@/hooks/useTalentProjects";
import type { TalentProjectListItem } from "@/types/talent-projects";
import { formatDeadline } from "@/features/talent/projects/utils/formatDeadline";
import { ProjectAlertItem } from "./ProjectAlertItem";
import { ProjectTimelineMini } from "./ProjectTimelineMini";
import { SkillChips } from "./SkillChips";
import { TeamMemberRow } from "./TeamMemberRow";
import {
    PROJECT_LIFECYCLE_TAB_TONES,
    badgeToneClass,
    classifyFromProjectStatus,
    formatIsoDate,
    type BadgeTone,
} from "./talent-projects-ui";
import { cx } from "@/utils/cx";

const VIABILITY_SECTION_ID = "talent-project-viability";
const ALERTS_PREVIEW = 3;

type ProjectDetailSheetProps = {
    open: boolean;
    projectId: string | null;
    listRow?: TalentProjectListItem | null;
    onClose: () => void;
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
        container.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

function viabilityTone(score: number): BadgeTone {
    if (score >= 7) return "emerald";
    if (score >= 4) return "amber";
    return "red";
}

function formatViabilityScore(score: number): string {
    return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function decisionBadgeClass(): string {
    return cx(
        "inline-flex items-center rounded-full border border-emerald-500/60 bg-transparent px-2.5 py-0.5 text-xs font-semibold",
        "text-emerald-700 dark:border-emerald-400/50 dark:text-emerald-300",
    );
}

function deadlineToneClass(tone: "default" | "warning" | "danger"): string {
    if (tone === "danger") return "font-medium text-red-600 dark:text-red-400";
    if (tone === "warning") return "font-medium text-amber-700 dark:text-amber-300";
    return "font-medium text-primary";
}

function SectionTitle({ children }: { children: string }) {
    return <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">{children}</h3>;
}

export function ProjectDetailSheet({ open, projectId, listRow, onClose }: ProjectDetailSheetProps) {
    const detailQuery = useTalentProjectDetail(open && projectId ? projectId : null);
    const panelRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const [alertsExpanded, setAlertsExpanded] = useState(false);

    useLockBodyScroll(open);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (!open) setAlertsExpanded(false);
    }, [open, projectId]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                handleClose();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, handleClose]);

    useEffect(() => {
        if (!open) return;

        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const frame = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const container = panelRef.current;
        if (!container) {
            return () => cancelAnimationFrame(frame);
        }

        const onTabKey = (e: KeyboardEvent) => {
            if (e.key !== "Tab") return;
            const focusable = getFocusableElements(container);
            if (focusable.length === 0) return;
            const first = focusable[0]!;
            const last = focusable[focusable.length - 1]!;
            const active = document.activeElement;
            if (e.shiftKey) {
                if (active === first || !container.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        container.addEventListener("keydown", onTabKey);

        return () => {
            cancelAnimationFrame(frame);
            container.removeEventListener("keydown", onTabKey);
            previousFocusRef.current?.focus();
        };
    }, [open]);

    if (!open || !projectId) return null;

    const detail = detailQuery.data;
    const project = detail?.project;
    const is404 = detailQuery.error instanceof TalentProjectsApiError && detailQuery.error.httpStatus === 404;

    const headerName = project?.project_name ?? listRow?.project_name ?? "Projet";
    const headerStatusLabel = project?.project_status_label ?? listRow?.project_status_label;
    const headerStatus = project?.project_status ?? listRow?.project_status;
    const statusTone = headerStatus
        ? PROJECT_LIFECYCLE_TAB_TONES[classifyFromProjectStatus(headerStatus)]
        : ("slate" as const);

    const milestoneDate = project?.milestone_at ?? listRow?.milestone_at ?? null;
    const startDate = project?.project_start_date ?? listRow?.project_start_date ?? null;
    const deadline = milestoneDate ? formatDeadline(milestoneDate) : null;

    const viabilityScore = detail?.viability?.score ?? null;
    const alerts = detail?.alerts ?? [];
    const visibleAlerts = alertsExpanded ? alerts : alerts.slice(0, ALERTS_PREVIEW);
    const hiddenAlertCount = Math.max(0, alerts.length - ALERTS_PREVIEW);

    const scrollToViability = () => {
        const el = document.getElementById(VIABILITY_SECTION_ID);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 bg-overlay/60 backdrop-blur-[2px]"
                aria-label="Fermer"
                onClick={handleClose}
            />
            <aside
                ref={panelRef}
                className="fixed top-0 right-0 z-50 flex h-dvh w-full min-w-0 max-w-[520px] flex-col border-l border-secondary bg-primary shadow-2xl sm:min-w-[420px]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="talent-project-drawer-title"
                tabIndex={-1}
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <h2 id="talent-project-drawer-title" className="line-clamp-2 text-lg font-semibold text-primary">
                            {headerName}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {headerStatusLabel && headerStatus ? (
                                <span className={badgeToneClass(statusTone)}>{headerStatusLabel}</span>
                            ) : null}
                            {detail?.viability?.decision_label ? (
                                <span className={decisionBadgeClass()}>{detail.viability.decision_label}</span>
                            ) : null}
                            {viabilityScore != null ? (
                                <button
                                    type="button"
                                    onClick={scrollToViability}
                                    className={cx(
                                        badgeToneClass(viabilityTone(viabilityScore)),
                                        "cursor-pointer transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary",
                                    )}
                                >
                                    Viabilité {formatViabilityScore(viabilityScore)}/10
                                </button>
                            ) : null}
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={handleClose}
                        className="shrink-0 rounded-lg p-2 text-tertiary transition hover:bg-secondary_subtle hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                        aria-label="Fermer"
                    >
                        <X className="size-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pr-5">
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
                        <div className="[&>section+section]:border-t [&>section+section]:border-secondary/60 [&>section+section]:pt-6 [&>section+section]:mt-6">
                            <section>
                                <SectionTitle>Mon rôle</SectionTitle>
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
                                    <SectionTitle>Description</SectionTitle>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">{project.project_description}</p>
                                </section>
                            ) : null}

                            <section>
                                <SectionTitle>Échéance & timeline</SectionTitle>
                                <dl className="mt-3 space-y-2 text-sm">
                                    {startDate ? (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-tertiary">Début projet</dt>
                                            <dd className="text-secondary">{formatIsoDate(startDate)}</dd>
                                        </div>
                                    ) : null}
                                    {milestoneDate ? (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-tertiary">Jalon</dt>
                                            <dd className="text-secondary">{formatIsoDate(milestoneDate)}</dd>
                                        </div>
                                    ) : null}
                                    {deadline ? (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-tertiary">Délai jalon</dt>
                                            <dd className={cx("inline-flex items-center gap-1.5", deadlineToneClass(deadline.tone))}>
                                                {deadline.tone === "danger" ? (
                                                    <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                                                ) : null}
                                                {deadline.label}
                                            </dd>
                                        </div>
                                    ) : null}
                                </dl>
                                <ProjectTimelineMini startDate={startDate} milestoneDate={milestoneDate} />
                            </section>

                            {detail.team.length > 0 ? (
                                <section>
                                    <SectionTitle>Équipe</SectionTitle>
                                    <ul className="mt-3 space-y-2">
                                        {detail.team.map((member) => (
                                            <TeamMemberRow
                                                key={member.talent_id}
                                                name={member.name}
                                                role={member.role_on_project}
                                                jobTitle={member.job_title}
                                                allocationPct={member.allocation_pct}
                                                isMe={member.is_me}
                                            />
                                        ))}
                                    </ul>
                                </section>
                            ) : null}

                            {detail.requirements.length > 0 ? (
                                <section>
                                    <SectionTitle>Compétences requises</SectionTitle>
                                    <SkillChips requirements={detail.requirements} />
                                </section>
                            ) : null}

                            {alerts.length > 0 ? (
                                <section>
                                    <SectionTitle>Alertes</SectionTitle>
                                    <ul className="mt-3 space-y-2">
                                        {visibleAlerts.map((alert) => (
                                            <ProjectAlertItem key={alert.id} alert={alert} />
                                        ))}
                                    </ul>
                                    {!alertsExpanded && hiddenAlertCount > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => setAlertsExpanded(true)}
                                            className="mt-2 text-xs font-semibold text-brand-secondary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                                        >
                                            Voir les {hiddenAlertCount} autre{hiddenAlertCount > 1 ? "s" : ""}
                                        </button>
                                    ) : null}
                                </section>
                            ) : null}

                            {detail.viability ? (
                                <section id={VIABILITY_SECTION_ID} className="scroll-mt-4">
                                    <SectionTitle>Viabilité</SectionTitle>
                                    <dl className="mt-3 space-y-2 text-sm">
                                        {detail.viability.score != null ? (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-tertiary">Score</dt>
                                                <dd className="font-medium text-primary">
                                                    {formatViabilityScore(detail.viability.score)}/10
                                                </dd>
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

/** Alias rétrocompatible avec l’ancien nom drawer. */
export { ProjectDetailSheet as ProjectDetailDrawer };
