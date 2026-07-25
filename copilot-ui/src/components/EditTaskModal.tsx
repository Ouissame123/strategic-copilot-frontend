import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { patchTask, type Task, type TaskForm, type TaskStatus, type TaskType } from "@/api/tasks";
import type { AssignedTalentOption } from "@/components/CreateTaskModal";

export type EditTaskModalProps = {
    task: Task;
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    token: string;
    assignedTalents: AssignedTalentOption[];
    onUpdated: (task: Task) => void;
    onError: (message: string) => void;
};

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";

type FormState = Required<
    Pick<
        TaskForm,
        | "title"
        | "status"
        | "priority"
        | "task_type"
        | "is_critical"
        | "effort_hours_planned"
        | "effort_hours_actual"
        | "due_date"
        | "planned_start_date"
        | "assigned_talent_id"
    >
>;

function taskToForm(task: Task): FormState {
    return {
        title: task.title,
        status: task.status,
        priority: task.priority,
        task_type: task.task_type,
        is_critical: task.is_critical,
        effort_hours_planned: task.effort_hours_planned,
        effort_hours_actual: task.effort_hours_actual,
        due_date: task.due_date?.slice(0, 10) ?? "",
        planned_start_date: task.planned_start_date?.slice(0, 10) ?? "",
        assigned_talent_id: task.assigned_talent_id,
    };
}

export function EditTaskModal({
    task,
    isOpen,
    onClose,
    projectId,
    token,
    assignedTalents,
    onUpdated,
    onError,
}: EditTaskModalProps) {
    const [formValues, setFormValues] = useState<FormState>(() => taskToForm(task));
    const [initialValues, setInitialValues] = useState<FormState>(() => taskToForm(task));
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

    useEffect(() => {
        if (!isOpen) return;
        const initial = taskToForm(task);
        setFormValues(initial);
        setInitialValues(initial);
        setEditError(null);
        setFieldErrors({});
    }, [isOpen, task]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !editLoading) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, editLoading, onClose]);

    if (!isOpen) return null;

    async function handleEditSave() {
        if (!formValues.title?.trim()) {
            setFieldErrors({ title: "Le titre est requis" });
            return;
        }

        const changed: Partial<TaskForm> = {};
        (Object.keys(formValues) as (keyof FormState)[]).forEach((key) => {
            const next = formValues[key];
            const prev = initialValues[key];
            if (String(next ?? "") !== String(prev ?? "")) {
                if (key === "due_date" || key === "planned_start_date") {
                    (changed as Record<string, unknown>)[key] = String(next).trim() || null;
                } else if (key === "assigned_talent_id") {
                    changed.assigned_talent_id = next as string | null;
                } else {
                    (changed as Record<string, unknown>)[key] = next;
                }
            }
        });

        if (Object.keys(changed).length === 0) {
            onError("Aucune modification");
            return;
        }

        if ("assigned_talent_id" in changed && changed.assigned_talent_id === null && initialValues.assigned_talent_id) {
            changed.assigned_talent_id = "__UNASSIGN__";
        }

        setEditLoading(true);
        setEditError(null);
        try {
            const result = await patchTask(projectId, task.id, changed, token);
            if (String(result.status).toLowerCase() === "success") {
                onUpdated(result.task);
                onClose();
            } else {
                setEditError("Erreur inconnue");
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Erreur réseau";
            setEditError(msg);
            onError(msg);
        } finally {
            setEditLoading(false);
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-4" onClick={() => !editLoading && onClose()}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-task-title"
                className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-[#1e2130]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 id="edit-task-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Modifier la tâche
                    </h2>
                    <button type="button" onClick={onClose} disabled={editLoading} aria-label="Fermer">
                        <X className="size-5 text-slate-400" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-1 md:col-span-2">
                        <span className="text-sm font-medium">Titre *</span>
                        <input
                            type="text"
                            value={formValues.title}
                            onChange={(e) => setFormValues((p) => ({ ...p, title: e.target.value }))}
                            className={inputClass}
                        />
                        {fieldErrors.title ? <span className="text-xs text-red-600">{fieldErrors.title}</span> : null}
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium">Statut</span>
                        <select
                            value={formValues.status}
                            onChange={(e) => setFormValues((p) => ({ ...p, status: e.target.value as TaskStatus }))}
                            className={inputClass}
                        >
                            <option value="todo">À faire</option>
                            <option value="in_progress">En cours</option>
                            <option value="done">Terminé</option>
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium">Priorité</span>
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={formValues.priority}
                            onChange={(e) => setFormValues((p) => ({ ...p, priority: Number(e.target.value) }))}
                            className={inputClass}
                        />
                    </label>

                    <div className="md:col-span-2">
                        <span className="text-sm font-medium">Type</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {(["task", "deliverable", "milestone"] as TaskType[]).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormValues((p) => ({ ...p, task_type: type }))}
                                    className={
                                        formValues.task_type === type
                                            ? "rounded-full bg-primary-600 px-3 py-1 text-xs font-medium text-white"
                                            : "rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                                    }
                                >
                                    {type === "task" ? "Tâche" : type === "deliverable" ? "Livrable" : "Jalon"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center gap-2 md:col-span-2">
                        <input
                            type="checkbox"
                            checked={formValues.is_critical}
                            onChange={(e) => setFormValues((p) => ({ ...p, is_critical: e.target.checked }))}
                        />
                        <span className="text-sm">Tâche critique</span>
                    </label>

                    <label className="flex flex-col gap-1 md:col-span-2">
                        <span className="text-sm font-medium">Assigné</span>
                        <select
                            value={formValues.assigned_talent_id ?? ""}
                            onChange={(e) =>
                                setFormValues((p) => ({ ...p, assigned_talent_id: e.target.value || null }))
                            }
                            className={inputClass}
                        >
                            <option value="">Non assigné</option>
                            {assignedTalents.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.allocation_pct}%)
                                </option>
                            ))}
                        </select>
                        {task.assigned_talent_id ? (
                            <button
                                type="button"
                                className="mt-1 text-left text-xs text-primary-600 underline"
                                onClick={() => setFormValues((p) => ({ ...p, assigned_talent_id: null }))}
                            >
                                Désassigner le talent
                            </button>
                        ) : null}
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium">Effort planifié (h)</span>
                        <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={formValues.effort_hours_planned}
                            onChange={(e) => setFormValues((p) => ({ ...p, effort_hours_planned: Number(e.target.value) }))}
                            className={inputClass}
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium">Heures réalisées</span>
                        <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={formValues.effort_hours_actual}
                            onChange={(e) => setFormValues((p) => ({ ...p, effort_hours_actual: Number(e.target.value) }))}
                            className={inputClass}
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium">Date de début</span>
                        <input
                            type="date"
                            value={formValues.planned_start_date ?? ""}
                            onChange={(e) => setFormValues((p) => ({ ...p, planned_start_date: e.target.value }))}
                            className={inputClass}
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium">Date d&apos;échéance</span>
                        <input
                            type="date"
                            value={formValues.due_date ?? ""}
                            onChange={(e) => setFormValues((p) => ({ ...p, due_date: e.target.value }))}
                            className={inputClass}
                        />
                    </label>
                </div>

                {editError ? <p className="mt-3 text-sm text-red-600">{editError}</p> : null}

                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={editLoading} className="rounded-lg border px-4 py-2 text-sm">
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleEditSave()}
                        disabled={editLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-60"
                    >
                        {editLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
