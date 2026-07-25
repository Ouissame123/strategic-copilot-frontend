import { useMemo } from "react";
import { ArrowLeft, Loader2, Pencil, Sparkles } from "lucide-react";
import { statusNeutralBadgeClass } from "@/components/manager/projects/projects-list-ui";
import type { MissionControlProject } from "@/types/api.types";
import { useMissionControlT } from "../use-mission-control-i18n";
import { cx } from "@/utils/cx";

type ProjectHeroProps = {
    project: MissionControlProject;
    analyzing: boolean;
    onAnalyze: () => void;
    onWhatIf: () => void;
    onBack?: () => void;
    onEdit?: () => void;
};

const STATUS_KEYS: Record<string, string> = {
    planned: "statusOptionPlanned",
    active: "statusOptionActive",
    on_hold: "statusOptionOnHold",
    completed: "statusOptionCompleted",
    cancelled: "statusOptionCancelled",
};

function fmtDateShort(value: string | null | undefined): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntilMilestone(milestoneAt: string | null | undefined): number | null {
    if (!milestoneAt) return null;
    const end = new Date(milestoneAt);
    if (Number.isNaN(end.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

function relativeUpdatedAt(updatedAt: string | null | undefined): string | null {
    if (!updatedAt) return null;
    const d = new Date(updatedAt);
    if (Number.isNaN(d.getTime())) return null;
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "il y a 1 min";
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs}h`;
    return `il y a ${Math.floor(hrs / 24)} j`;
}

export function ProjectHero({
    project,
    analyzing,
    onAnalyze,
    onWhatIf,
    onBack,
    onEdit,
}: ProjectHeroProps) {
    const { mc, common } = useMissionControlT();
    const statusKey = STATUS_KEYS[project.status];
    const statusLabel = statusKey ? mc(statusKey) : project.status.replace(/_/g, " ");

    const daysLeft = useMemo(() => daysUntilMilestone(project.milestone_at), [project.milestone_at]);
    const updatedLabel = useMemo(() => relativeUpdatedAt(project.updated_at), [project.updated_at]);
    const milestoneLabel = fmtDateShort(project.milestone_at);

    return (
        <header className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
            {/* ← PILOTAGE MISSION */}
            <div className="mb-3 flex items-center gap-2">
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label={common("back")}
                    >
                        <ArrowLeft size={16} />
                    </button>
                ) : null}
                <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
                    {mc("headerEyebrow")}
                </span>
            </div>

            {analyzing ? (
                <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 text-xs text-primary-950 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-100">
                    <span className="mt-0.5 inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600" />
                    <span>
                        <strong>Analyse IA en cours</strong> — Agent 1 Observer · Agent 4 Matchmaker · Agent 2
                        Watchdog · Agent 7 Orchestrateur
                        <br />
                        <span className="text-[11px] text-primary-700 dark:text-primary-300">
                            Résultat disponible dans ~10 secondes...
                        </span>
                    </span>
                </div>
            ) : null}

            {/* Titre + édition | Analyser + Simuler */}
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <h1 className="text-[22px] font-bold text-slate-900 dark:text-slate-50">{project.name}</h1>
                    {onEdit ? (
                        <button
                            type="button"
                            onClick={onEdit}
                            title="Modifier le projet"
                            className="shrink-0 rounded-md border border-slate-200 p-1 text-slate-400 transition hover:border-primary-600 hover:text-primary-600 dark:border-slate-600"
                            aria-label="Modifier le projet"
                        >
                            <Pencil className="size-4" aria-hidden />
                        </button>
                    ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={analyzing}
                        onClick={onAnalyze}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                        {analyzing ? (
                            <>
                                <Loader2 size={15} className="animate-spin" aria-hidden />
                                Analyse...
                            </>
                        ) : (
                            <>
                                <Sparkles size={15} aria-hidden />
                                {mc("actions.analyze")}
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onWhatIf}
                        className="rounded-lg border border-slate-300 px-4 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        {mc("actions.simulate")}
                    </button>
                </div>
            </div>

            {/* Badges + meta */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span
                    className={cx(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                        statusNeutralBadgeClass(project.status),
                    )}
                >
                    {statusLabel}
                </span>
                {project.priority != null ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        P{project.priority}
                    </span>
                ) : null}
                {milestoneLabel ? <span>· Échéance le {milestoneLabel}</span> : null}
                {daysLeft != null ? (
                    <span className="font-medium text-slate-500">
                        ·{" "}
                        {daysLeft < 0
                            ? `${Math.abs(daysLeft)} j de retard`
                            : `${daysLeft} j restants`}
                    </span>
                ) : null}
                {updatedLabel ? <span>· MAJ {updatedLabel}</span> : null}
            </div>
        </header>
    );
}
