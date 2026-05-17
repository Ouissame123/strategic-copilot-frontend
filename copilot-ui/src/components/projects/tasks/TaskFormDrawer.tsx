import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { ProjectTask } from "@/types/project-tasks.types";
import {
    EMPTY_TASK_FORM,
    formValuesToPayload,
    taskToFormValues,
    type TaskFormValues,
} from "@/lib/project-tasks-display";

export type TalentOption = { id: string; name: string };

export type TaskFormDrawerProps = {
    open: boolean;
    mode: "create" | "edit";
    task: ProjectTask | null;
    taskAssignableTalents: TalentOption[];
    saving?: boolean;
    onClose: () => void;
    onSubmit: (values: ReturnType<typeof formValuesToPayload>) => Promise<void>;
};

export function TaskFormDrawer({
    open,
    mode,
    task,
    taskAssignableTalents,
    saving = false,
    onClose,
    onSubmit,
}: TaskFormDrawerProps) {
    const { t } = useTranslation("common");
    const tt = (key: string) => t(`managerWorkspace.missionControl.tasks.${key}`);

    const [values, setValues] = useState<TaskFormValues>(EMPTY_TASK_FORM);

    useEffect(() => {
        if (!open) return;
        setValues(task ? taskToFormValues(task) : { ...EMPTY_TASK_FORM });
    }, [open, task]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.title.trim()) return;
        await onSubmit(formValuesToPayload(values));
    };

    return (
        <div className="fixed inset-0 z-[60] flex justify-end" role="presentation">
            <button type="button" className="absolute inset-0 bg-black/40" aria-label={tt("closeDrawer")} onClick={onClose} />
            <aside className="relative flex h-full w-full max-w-md flex-col border-l border-secondary bg-primary shadow-2xl">
                <header className="flex items-center justify-between border-b border-secondary px-4 py-3">
                    <h3 className="text-sm font-semibold text-fg-primary">
                        {mode === "create" ? tt("drawerCreateTitle") : tt("drawerEditTitle")}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-fg-tertiary hover:bg-secondary_subtle"
                        aria-label={tt("closeDrawer")}
                    >
                        <X className="size-4" />
                    </button>
                </header>

                <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
                    <div className="space-y-3">
                        <label className="block text-xs font-medium text-fg-secondary">
                            {tt("fieldTitle")}
                            <input
                                required
                                value={values.title}
                                onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
                                className="mt-1 w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm"
                            />
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-xs font-medium text-fg-secondary">
                                {tt("fieldEffortPlanned")}
                                <input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={values.effort_hours_planned}
                                    onChange={(e) => setValues((v) => ({ ...v, effort_hours_planned: e.target.value }))}
                                    className="mt-1 w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm"
                                />
                            </label>
                            <label className="block text-xs font-medium text-fg-secondary">
                                {tt("fieldPriority")}
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={values.priority}
                                    onChange={(e) => setValues((v) => ({ ...v, priority: e.target.value }))}
                                    className="mt-1 w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm"
                                />
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-xs font-medium text-fg-secondary">
                                {tt("fieldDueDate")}
                                <input
                                    type="date"
                                    value={values.due_date}
                                    onChange={(e) => setValues((v) => ({ ...v, due_date: e.target.value }))}
                                    className="mt-1 w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm"
                                />
                            </label>
                            <label className="block text-xs font-medium text-fg-secondary">
                                {tt("fieldStartDate")}
                                <input
                                    type="date"
                                    value={values.planned_start_date}
                                    onChange={(e) => setValues((v) => ({ ...v, planned_start_date: e.target.value }))}
                                    className="mt-1 w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm"
                                />
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-xs font-medium text-fg-secondary">
                                {tt("fieldType")}
                                <select
                                    value={values.task_type}
                                    onChange={(e) =>
                                        setValues((v) => ({
                                            ...v,
                                            task_type: e.target.value as TaskFormValues["task_type"],
                                        }))
                                    }
                                    className="mt-1 w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm"
                                >
                                    <option value="task">{tt("typeTask")}</option>
                                    <option value="deliverable">{tt("typeDeliverable")}</option>
                                    <option value="milestone">{tt("typeMilestone")}</option>
                                </select>
                            </label>
                            <label className="block text-xs font-medium text-fg-secondary">
                                {tt("fieldStatus")}
                                <select
                                    value={values.status}
                                    onChange={(e) =>
                                        setValues((v) => ({
                                            ...v,
                                            status: e.target.value as TaskFormValues["status"],
                                        }))
                                    }
                                    className="mt-1 w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm"
                                >
                                    <option value="todo">{tt("statusTodo")}</option>
                                    <option value="in_progress">{tt("statusInProgress")}</option>
                                    <option value="done">{tt("statusDone")}</option>
                                </select>
                            </label>
                        </div>

                        <label className="block text-xs font-medium text-fg-secondary">
                            {tt("fieldAssignee")}
                            <select
                                value={values.assigned_talent_id}
                                onChange={(e) => setValues((v) => ({ ...v, assigned_talent_id: e.target.value }))}
                                className="mt-1 w-full rounded-xl border border-secondary bg-primary px-3 py-2 text-sm"
                            >
                                <option value="">{tt("unassignedOption")}</option>
                                {taskAssignableTalents.map((talent) => (
                                    <option key={talent.id} value={talent.id}>
                                        {talent.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex items-center gap-2 text-sm text-fg-secondary">
                            <input
                                type="checkbox"
                                checked={values.is_critical}
                                onChange={(e) => setValues((v) => ({ ...v, is_critical: e.target.checked }))}
                                className="size-4 rounded border-secondary"
                            />
                            {tt("fieldCritical")}
                        </label>
                    </div>

                    <footer className="mt-6 flex gap-2 border-t border-secondary pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-secondary py-2 text-sm font-semibold text-fg-secondary hover:bg-secondary_subtle"
                        >
                            {tt("cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !values.title.trim()}
                            className="flex-1 rounded-xl bg-brand-solid py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? tt("saving") : mode === "create" ? tt("create") : tt("save")}
                        </button>
                    </footer>
                </form>
            </aside>
        </div>
    );
}
