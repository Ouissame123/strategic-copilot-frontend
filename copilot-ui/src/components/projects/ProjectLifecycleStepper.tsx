import { Fragment, useMemo, useState } from "react";
import {
    Activity,
    CheckCheck,
    CheckCircle2,
    ClipboardList,
    Loader2,
    PauseCircle,
    PlayCircle,
    XCircle,
} from "lucide-react";
import { cx } from "@/utils/cx";

export type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface ProjectLifecycleProject {
    id: string;
    status: ProjectStatus;
    progress_pct: number;
    milestone_at: string | null;
    completed_at?: string | null;
    start_date?: string | null;
}

export interface ProjectLifecycleTask {
    id: string;
    status: TaskStatus;
}

interface Props {
    project: ProjectLifecycleProject;
    tasks: ProjectLifecycleTask[];
    onComplete?: () => Promise<void>;
    onPause?: () => Promise<void>;
    readonly?: boolean;
}

type PhaseId = 1 | 2 | 3 | 4 | 5;
type PhaseState = "past" | "current" | "future" | "cancelled";

interface PhaseDef {
    id: PhaseId;
    label: string;
    shortLabel: string;
    Icon: typeof ClipboardList;
    description: string;
}

const PHASES: PhaseDef[] = [
    { id: 1, label: "Planifié", shortLabel: "Planif.", Icon: ClipboardList, description: "Projet créé, équipe en cours de constitution" },
    { id: 2, label: "Démarré", shortLabel: "Démarré", Icon: PlayCircle, description: "Statut actif, au moins 1 tâche en cours" },
    { id: 3, label: "En exécution", shortLabel: "Exéc.", Icon: Activity, description: "Progress ≥ 25% ou jalon dépassé" },
    { id: 4, label: "À valider", shortLabel: "Valider", Icon: CheckCheck, description: "Toutes les tâches terminées, en attente clôture" },
    { id: 5, label: "Terminé", shortLabel: "Terminé", Icon: CheckCircle2, description: "Projet clôturé par le manager" },
];

function getCurrentPhase(project: ProjectLifecycleProject, tasks: ProjectLifecycleTask[]): PhaseId | -1 {
    if (project.status === "cancelled") return -1;
    if (project.status === "completed") return 5;

    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const milestonePassed = project.milestone_at ? new Date(project.milestone_at).getTime() < Date.now() : false;

    if (total > 0 && done === total) return 4;
    if (inProgress > 0 || project.progress_pct >= 25 || milestonePassed) return 3;
    if (project.status === "active") return 2;
    return 1;
}

function getPhaseState(phaseId: PhaseId, currentPhase: PhaseId | -1): PhaseState {
    if (currentPhase === -1) return "cancelled";
    if (phaseId < currentPhase) return "past";
    if (phaseId === currentPhase) return "current";
    return "future";
}

const PHASE_CIRCLE: Record<PhaseState, string> = {
    past: "border-emerald-600 bg-emerald-500 text-white",
    current: "border-violet-600 bg-violet-600 text-white ring-2 ring-violet-400/40",
    future: "border-slate-200 bg-slate-50 text-slate-400 dark:border-secondary dark:bg-secondary_subtle dark:text-fg-quaternary",
    cancelled: "border-slate-200 bg-slate-50 text-slate-400",
};

const PHASE_LABEL: Record<PhaseState, string> = {
    past: "text-slate-600 dark:text-fg-secondary",
    current: "font-semibold text-violet-700 dark:text-violet-300",
    future: "text-slate-400 dark:text-fg-quaternary",
    cancelled: "text-slate-400",
};

export function ProjectLifecycleStepper({ project, tasks, onComplete, onPause, readonly }: Props) {
    const [loading, setLoading] = useState<"complete" | "pause" | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currentPhase = useMemo(() => getCurrentPhase(project, tasks), [project, tasks]);
    const readyToClose = currentPhase === 4;
    const isCompleted = currentPhase === 5;
    const isCancelled = currentPhase === -1;

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;

    async function handleComplete() {
        if (!onComplete || readonly || loading) return;
        setError(null);
        setLoading("complete");
        try {
            await onComplete();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Échec de la clôture");
        } finally {
            setLoading(null);
        }
    }

    async function handlePause() {
        if (!onPause || readonly || loading) return;
        setError(null);
        setLoading("pause");
        try {
            await onPause();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Échec de la mise en pause");
        } finally {
            setLoading(null);
        }
    }

    if (isCancelled) {
        return (
            <div className="flex max-h-[260px] items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-50 p-3 dark:border-secondary dark:bg-secondary_subtle">
                <XCircle className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-fg-primary">Projet annulé</p>
                    <p className="text-xs text-slate-500 dark:text-fg-tertiary">Ce projet n&apos;est plus actif.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-h-[260px] space-y-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-secondary dark:bg-primary">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-fg-primary">Cycle de vie projet</h4>
                    <p className="text-xs text-slate-500 dark:text-fg-tertiary">
                        <span className="font-medium text-slate-700 dark:text-fg-secondary">
                            {currentPhase !== -1 ? PHASES[currentPhase - 1].label : "—"}
                        </span>
                        {totalTasks > 0 ? (
                            <span className="text-slate-400"> · {doneTasks}/{totalTasks} tâches</span>
                        ) : null}
                    </p>
                </div>
                {isCompleted && project.completed_at ? (
                    <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                        Clôturé {formatDateShort(project.completed_at)}
                    </span>
                ) : null}
            </div>

            <CompactStepper currentPhase={currentPhase} />

            {readyToClose && !readonly ? (
                <div className="flex flex-col gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 sm:flex-row sm:items-center sm:gap-3 dark:border-emerald-800/40 dark:bg-emerald-950/25">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                        <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                                Tâches terminées ({doneTasks}/{totalTasks})
                            </p>
                            <p className="text-xs text-emerald-700 dark:text-emerald-200/90">
                                Validez pour clôturer le projet.
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                        {onPause ? (
                            <button
                                type="button"
                                onClick={() => void handlePause()}
                                disabled={loading !== null}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-secondary dark:bg-primary"
                                aria-label="Mettre le projet en pause"
                            >
                                {loading === "pause" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                ) : (
                                    <PauseCircle className="h-3.5 w-3.5" aria-hidden />
                                )}
                                Pause
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => void handleComplete()}
                            disabled={loading !== null}
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            aria-label="Valider et clôturer le projet"
                        >
                            {loading === "complete" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            )}
                            Clôturer
                        </button>
                    </div>
                </div>
            ) : null}

            {error ? (
                <p className="rounded border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-200">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function CompactStepper({ currentPhase }: { currentPhase: PhaseId | -1 }) {
    return (
        <div
            className="flex flex-wrap items-center justify-center gap-y-2 gap-x-0 sm:flex-nowrap sm:justify-between"
            role="list"
            aria-label={`Cycle de vie : phase ${currentPhase !== -1 ? PHASES[currentPhase - 1].label : "annulé"}`}
        >
            {PHASES.map((phase, index) => {
                const state = getPhaseState(phase.id, currentPhase);
                const Icon = phase.Icon;
                const connectorPast = currentPhase !== -1 && phase.id < currentPhase;

                return (
                    <Fragment key={phase.id}>
                        {index > 0 ? (
                            <div
                                className={cx(
                                    "mx-0.5 hidden h-1 min-w-[0.5rem] flex-1 self-center rounded-full sm:block",
                                    connectorPast ? "bg-emerald-500" : "bg-slate-200 dark:bg-secondary",
                                )}
                                aria-hidden
                            />
                        ) : null}
                        <div
                            role="listitem"
                            className="flex w-[4.75rem] flex-col items-center gap-1 sm:w-auto sm:min-w-0 sm:flex-1"
                            title={phase.description}
                        >
                            <div
                                className={cx(
                                    "relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors",
                                    PHASE_CIRCLE[state],
                                    state === "current" && "animate-pulse",
                                )}
                            >
                                {state === "current" ? (
                                    <span
                                        className="absolute inset-0 rounded-full border-2 border-violet-400/50"
                                        aria-hidden
                                    />
                                ) : null}
                                <Icon className="relative h-5 w-5 shrink-0" aria-hidden />
                            </div>
                            <span className={cx("max-w-[4.75rem] truncate text-center text-xs leading-tight sm:hidden", PHASE_LABEL[state])}>
                                {phase.shortLabel}
                            </span>
                            <span className={cx("hidden max-w-full truncate text-center text-sm leading-tight sm:block", PHASE_LABEL[state])}>
                                {phase.label}
                            </span>
                        </div>
                    </Fragment>
                );
            })}
        </div>
    );
}

function formatDateShort(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
