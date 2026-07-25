import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { createTask, type Task, type TaskForm, type TaskStatus, type TaskType } from "@/api/tasks";

export type AssignedTalentOption = { id: string; name: string; allocation_pct: number };

export type CreateTaskModalProps = {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    token: string;
    defaultStatus?: TaskStatus;
    assignedTalents: AssignedTalentOption[];
    onCreated: (task: Task) => void;
    onError: (message: string) => void;
};

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";

function defaultForm(status: TaskStatus): TaskForm & { title: string } {
    return {
        title: "",
        status,
        task_type: "task",
        priority: 5,
        is_critical: false,
        effort_hours_planned: 0,
        due_date: "",
        planned_start_date: "",
        assigned_talent_id: null,
    };
}

export function CreateTaskModal({
    isOpen,
    onClose,
    projectId,
    token,
    defaultStatus = "todo",
    assignedTalents,
    onCreated,
    onError,
}: CreateTaskModalProps) {
    const [formValues, setFormValues] = useState(defaultForm(defaultStatus));
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setFormValues(defaultForm(defaultStatus));
        setFieldErrors({});
        setCreateError(null);
    }, [isOpen, defaultStatus]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !createLoading) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, createLoading, onClose]);

    if (!isOpen) return null;

    async function handleCreate() {
        if (!formValues.title?.trim() || formValues.title.trim().length < 2) {
            setFieldErrors({ title: "Le titre est requis (min. 2 caractères)" });
            return;
        }
        setCreateLoading(true);
        setCreateError(null);
        try {
            const body: Partial<TaskForm> = {
                title: formValues.title.trim(),
                status: formValues.status || "todo",
                task_type: (formValues.task_type as TaskType) || "task",
                priority: formValues.priority ?? 5,
                is_critical: formValues.is_critical ?? false,
                assigned_talent_id: formValues.assigned_talent_id || null,
                effort_hours_planned: formValues.effort_hours_planned ?? 0,
                due_date: formValues.due_date?.trim() || null,
                planned_start_date: formValues.planned_start_date?.trim() || null,
            };
            const result = await createTask(projectId, body, token);
            if (String(result.status).toLowerCase() === "success") {
                onCreated(result.task);
                onClose();
            } else {
                setCreateError("Erreur inconnue");
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Erreur réseau";
            setCreateError(msg);
            onError(msg);
        } finally {
            setCreateLoading(false);
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-4" onClick={() => !createLoading && onClose()}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-task-title"
                className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-[#1e2130]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 id="create-task-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Nouvelle tâche
                    </h2>
                    <button type="button" onClick={onClose} disabled={createLoading} className="text-slate-400 hover:text-slate-600" aria-label="Fermer">
                        <X className="size-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-1 md:col-span-2">
                        <span className="text-sm font-medium">Titre *</span>
                        <input
                            type="text"
                            value={formValues.title}
                            onChange={(e) => {
                                setFormValues((p) => ({ ...p, title: e.target.value }));
                                setFieldErrors((p) => ({ ...p, title: undefined }));
                            }}
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
                        <span className="text-sm font-medium">Priorité (1–10)</span>
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
                            checked={Boolean(formValues.is_critical)}
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
                                    {t.name.slice(0, 2).toUpperCase()} · {t.name} ({t.allocation_pct}%)
                                </option>
                            ))}
                        </select>
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
                        <span className="text-sm font-medium">Date de début</span>
                        <input
                            type="date"
                            value={formValues.planned_start_date ?? ""}
                            onChange={(e) => setFormValues((p) => ({ ...p, planned_start_date: e.target.value }))}
                            className={inputClass}
                        />
                    </label>

                    <label className="flex flex-col gap-1 md:col-span-2">
                        <span className="text-sm font-medium">Date d&apos;échéance</span>
                        <input
                            type="date"
                            value={formValues.due_date ?? ""}
                            onChange={(e) => setFormValues((p) => ({ ...p, due_date: e.target.value }))}
                            className={inputClass}
                        />
                    </label>
                </div>

                {createError ? <p className="mt-3 text-sm text-red-600">{createError}</p> : null}

                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={createLoading} className="rounded-lg border px-4 py-2 text-sm text-slate-600">
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleCreate()}
                        disabled={createLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                        {createLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                        Créer la tâche
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
