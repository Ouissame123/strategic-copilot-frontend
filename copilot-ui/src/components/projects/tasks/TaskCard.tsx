import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProjectTask } from "@/types/project-tasks.types";
import type { CompleteTaskPayload } from "@/types/project-tasks.types";
import { formatTaskDate, formatTaskHours, taskStatusBadgeClass } from "@/lib/project-tasks-display";
import { cx } from "@/utils/cx";

export type TaskCardProps = {
    task: ProjectTask;
    onEdit: () => void;
    onComplete: (body: CompleteTaskPayload) => Promise<void>;
    onDelete: () => void;
    completing?: boolean;
    deleting?: boolean;
};

export function TaskCard({ task, onEdit, onComplete, onDelete, completing = false, deleting = false }: TaskCardProps) {
    const { t } = useTranslation("common");
    const tt = (key: string, opts?: Record<string, string | number>) =>
        String(opts ? t(`managerWorkspace.missionControl.tasks.${key}`, opts as never) : t(`managerWorkspace.missionControl.tasks.${key}`));

    const [completeOpen, setCompleteOpen] = useState(false);
    const [effortActual, setEffortActual] = useState(String(task.effort_hours_actual ?? task.effort_hours_planned ?? ""));
    const [completionNote, setCompletionNote] = useState("");

    const statusLabel =
        task.status === "done"
            ? tt("statusDone")
            : task.status === "in_progress"
              ? tt("statusInProgress")
              : tt("statusTodo");

    const typeLabel =
        task.task_type === "deliverable"
            ? tt("typeDeliverable")
            : task.task_type === "milestone"
              ? tt("typeMilestone")
              : tt("typeTask");

    const handleComplete = async () => {
        try {
            await onComplete({
                effort_hours_actual: Number(effortActual) || 0,
                completion_note: completionNote.trim(),
            });
            setCompleteOpen(false);
        } catch {
            /* toast + message : parent (ProjectTasksTab) */
        }
    };

    return (
        <article className="rounded-2xl border border-secondary bg-primary p-3 shadow-xs transition hover:border-brand-secondary/30">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", taskStatusBadgeClass(task.status))}>
                            {statusLabel}
                        </span>
                        {task.is_critical ? (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                                {tt("criticalBadge")}
                            </span>
                        ) : null}
                        {task.is_overdue ? (
                            <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
                                {tt("overdueBadge")}
                            </span>
                        ) : null}
                    </div>
                    <h4 className="mt-1.5 text-sm font-semibold leading-snug text-fg-primary">{task.title}</h4>
                </div>
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-fg-tertiary">
                    {tt("priorityShort", { value: task.priority })}
                </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-fg-tertiary">
                <span>{typeLabel}</span>
                <span>{tt("dueLabel")} {formatTaskDate(task.due_date)}</span>
                {task.days_until_due != null ? (
                    <span>
                        {task.days_until_due >= 0
                            ? tt("daysLeft", { count: task.days_until_due })
                            : tt("daysLate", { count: Math.abs(task.days_until_due) })}
                    </span>
                ) : null}
                <span>{formatTaskHours(task.effort_hours_actual, task.effort_hours_planned)}</span>
            </div>

            <p className="mt-1 text-xs text-fg-secondary">
                {task.assigned_talent_name?.trim() || tt("unassigned")}
            </p>

            {completeOpen && task.status !== "done" ? (
                <div className="mt-3 space-y-2 rounded-xl border border-secondary bg-secondary_subtle/40 p-2.5">
                    <label className="block text-xs font-medium text-fg-secondary">
                        {tt("effortActualLabel")}
                        <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={effortActual}
                            onChange={(e) => setEffortActual(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-secondary bg-primary px-2 py-1.5 text-sm"
                        />
                    </label>
                    <label className="block text-xs font-medium text-fg-secondary">
                        {tt("completionNoteLabel")}
                        <textarea
                            value={completionNote}
                            onChange={(e) => setCompletionNote(e.target.value)}
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-secondary bg-primary px-2 py-1.5 text-sm"
                        />
                    </label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={completing}
                            onClick={() => void handleComplete()}
                            className="rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                            {completing ? tt("saving") : tt("confirmComplete")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setCompleteOpen(false)}
                            className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-medium text-fg-secondary"
                        >
                            {tt("cancel")}
                        </button>
                    </div>
                </div>
            ) : null}

            <footer className="mt-3 flex flex-wrap gap-1.5 border-t border-secondary/60 pt-2">
                <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-lg border border-secondary px-2.5 py-1 text-xs font-semibold text-fg-secondary hover:bg-secondary_subtle"
                >
                    {tt("edit")}
                </button>
                {task.status !== "done" ? (
                    <button
                        type="button"
                        onClick={() => setCompleteOpen((v) => !v)}
                        disabled={completing}
                        className="rounded-lg border border-brand-secondary/40 bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-secondary hover:bg-brand-primary/20 disabled:opacity-50"
                    >
                        {tt("complete")}
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleting}
                    className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                    {tt("delete")}
                </button>
            </footer>
        </article>
    );
}
