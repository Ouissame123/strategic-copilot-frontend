import { useState } from "react";
import { AlertCircle, Check, Circle, Clock } from "lucide-react";
import {
    buildLifecycleSteps,
    canTransitionLifecycle,
    lifecycleDbStatusForStep,
    LIFECYCLE_STEPS,
} from "@/utils/lifecycle";
import { usePatchProject } from "@/hooks/use-project-detail";
import type { LifecycleStatus, MissionControlProject, ProjectStatus } from "@/types/api.types";
import { useToast } from "@/providers/toast-provider";
import { useMissionControlT } from "../use-mission-control-i18n";
import { cx } from "@/utils/cx";

type LifecycleKanbanProps = {
    project: MissionControlProject;
    enterpriseId: string;
};

export function LifecycleKanban({ project }: LifecycleKanbanProps) {
    const { mc, lifecycle } = useMissionControlT();
    const { push: toast } = useToast();
    const patch = usePatchProject(project.id);
    const [confirmStep, setConfirmStep] = useState<LifecycleStatus | null>(null);

    const steps = buildLifecycleSteps(project.status);
    const displaySteps = LIFECYCLE_STEPS.filter((s) => s.id !== "cancelled").slice(0, 5);

    const handleTransition = async (stepId: LifecycleStatus) => {
        const dbStatus = lifecycleDbStatusForStep(stepId) as ProjectStatus;
        try {
            await patch.mutateAsync({
                status: dbStatus,
                priority: project.priority ?? 5,
                milestone_at: project.milestone_at,
            });
            toast(mc("projectChangesSaved"), "success");
            setConfirmStep(null);
        } catch {
            toast(mc("projectStatusSaveErrorFallback"), "error");
        }
    };

    return (
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {displaySteps.map((def) => {
                    const visual = steps.find((s) => s.id === def.id);
                    const state = visual?.state ?? "idle";
                    const clickable = canTransitionLifecycle(project.status, def.id) && def.id !== "initiation";
                    return (
                        <button
                            key={def.id}
                            type="button"
                            disabled={!clickable || patch.isPending}
                            onClick={() => (clickable ? setConfirmStep(def.id) : undefined)}
                            className={cx(
                                "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition",
                                state === "done" && "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
                                state === "active" && "border-primary-300 bg-primary-50 ring-1 ring-primary-200 dark:border-primary-700 dark:bg-primary-950/30",
                                state === "blocked" && "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
                                state === "idle" && "border-slate-200 bg-white opacity-80 dark:border-slate-700 dark:bg-slate-900",
                                clickable && "hover:ring-2 hover:ring-primary-300",
                            )}
                        >
                            {state === "done" ? (
                                <Check size={14} className="text-emerald-600" />
                            ) : state === "blocked" ? (
                                <AlertCircle size={14} className="text-rose-600" />
                            ) : state === "active" ? (
                                <Clock size={14} className="text-primary-600" />
                            ) : (
                                <Circle size={14} className="text-slate-300" />
                            )}
                            <span className="text-[11px] font-semibold leading-tight text-slate-700 dark:text-slate-200">
                                {lifecycle(def.id)}
                            </span>
                        </button>
                    );
                })}
            </div>

            {confirmStep ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                    <span>
                        {mc("lifecycle.confirmTransition", { step: lifecycle(confirmStep) })}
                    </span>
                    <button
                        type="button"
                        className="rounded bg-primary-600 px-3 py-1 text-xs font-semibold text-white"
                        onClick={() => void handleTransition(confirmStep)}
                    >
                        {mc("arbitrage.applyBtn")}
                    </button>
                    <button type="button" className="text-xs text-slate-600 underline dark:text-slate-400" onClick={() => setConfirmStep(null)}>
                        {mc("arbitrage.cancelBtn")}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
