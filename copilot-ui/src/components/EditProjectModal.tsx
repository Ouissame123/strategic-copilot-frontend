import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { buildProjectPatchBody, patchProject, type ProjectEditForm } from "@/api/projects";
import { useToast } from "@/providers/toast-provider";
import type { MissionControlProject } from "@/types/api.types";
import { cx } from "@/utils/cx";

export type EditProjectModalProps = {
    project: MissionControlProject;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedProject: MissionControlProject) => void;
    token: string;
};

function projectToForm(project: MissionControlProject): ProjectEditForm {
    return {
        name: project.name || "",
        description: project.description || "",
        status: project.status || "planned",
        priority: Number(project.priority) || 1,
        milestone_at: project.milestone_at?.slice(0, 10) || "",
        start_date: project.start_date?.slice(0, 10) || "",
        budget_rh_planned: Number(project.budget_rh_planned) || 0,
        budget_rh_actual: Number(project.budget_rh_actual) || 0,
    };
}

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

export function EditProjectModal({ project, isOpen, onClose, onSuccess, token }: EditProjectModalProps) {
    const { push: showToast } = useToast();
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [formValues, setFormValues] = useState<ProjectEditForm>(() => projectToForm(project));
    const [initialValues, setInitialValues] = useState<ProjectEditForm>(() => projectToForm(project));
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProjectEditForm, string>>>({});

    useEffect(() => {
        if (!isOpen) return;
        const initial = projectToForm(project);
        setFormValues(initial);
        setInitialValues(initial);
        setSaveError(null);
        setFieldErrors({});
    }, [isOpen, project]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !saveLoading) onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose, saveLoading]);

    if (!isOpen) return null;

    function handleFieldChange(key: keyof ProjectEditForm, value: string | number) {
        setFormValues((prev) => ({ ...prev, [key]: value }));
        setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }

    function setFieldError(key: keyof ProjectEditForm, msg: string) {
        setFieldErrors((prev) => ({ ...prev, [key]: msg }));
    }

    async function handleSave() {
        if (!formValues.name?.trim()) {
            setFieldError("name", "Le nom est obligatoire");
            return;
        }
        if (formValues.priority < 1 || formValues.priority > 10) {
            setFieldError("priority", "La priorité doit être entre 1 et 10");
            return;
        }

        const changedFields = buildProjectPatchBody(formValues, initialValues);
        if (Object.keys(changedFields).length === 0) {
            showToast("Aucune modification détectée", "info");
            return;
        }

        setSaveLoading(true);
        setSaveError(null);
        try {
            const result = await patchProject(project.id, changedFields, token);
            if (String(result.status).toLowerCase() === "success") {
                onSuccess(result.project);
                onClose();
                showToast("Projet mis à jour", "success");
            } else {
                setSaveError(result.message || "Erreur inconnue");
            }
        } catch (e: unknown) {
            setSaveError(e instanceof Error ? e.message : "Erreur réseau");
        } finally {
            setSaveLoading(false);
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-4"
            role="presentation"
            onClick={() => {
                if (!saveLoading) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-project-title"
                className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-[#1e2130]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-start justify-between gap-3">
                    <h2 id="edit-project-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Modifier le projet
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saveLoading}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800"
                        aria-label="Fermer"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="col-span-1 flex flex-col gap-1 md:col-span-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom du projet *</span>
                        <input
                            type="text"
                            required
                            value={formValues.name}
                            onChange={(e) => handleFieldChange("name", e.target.value)}
                            className={inputClass}
                        />
                        {fieldErrors.name ? <span className="text-xs text-red-600">{fieldErrors.name}</span> : null}
                    </label>

                    <label className="col-span-1 flex flex-col gap-1 md:col-span-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</span>
                        <textarea
                            rows={3}
                            value={formValues.description}
                            onChange={(e) => handleFieldChange("description", e.target.value)}
                            className={inputClass}
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Statut</span>
                        <select
                            value={formValues.status}
                            onChange={(e) => handleFieldChange("status", e.target.value)}
                            className={inputClass}
                        >
                            <option value="planned">Planifié</option>
                            <option value="active">Actif</option>
                            <option value="on_hold">En pause</option>
                            <option value="completed">Terminé</option>
                            <option value="cancelled">Annulé</option>
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Priorité (1 = plus haute, 10 = plus basse)
                        </span>
                        <input
                            type="number"
                            min={1}
                            max={10}
                            step={1}
                            value={formValues.priority}
                            onChange={(e) => handleFieldChange("priority", Number(e.target.value))}
                            className={inputClass}
                        />
                        {fieldErrors.priority ? <span className="text-xs text-red-600">{fieldErrors.priority}</span> : null}
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Date jalon stratégique</span>
                        <input
                            type="date"
                            value={formValues.milestone_at}
                            onChange={(e) => handleFieldChange("milestone_at", e.target.value)}
                            className={inputClass}
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Date de début</span>
                        <input
                            type="date"
                            value={formValues.start_date}
                            onChange={(e) => handleFieldChange("start_date", e.target.value)}
                            className={inputClass}
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Budget RH prévu (€)</span>
                        <input
                            type="number"
                            min={0}
                            step={100}
                            value={formValues.budget_rh_planned}
                            onChange={(e) => handleFieldChange("budget_rh_planned", Number(e.target.value))}
                            className={inputClass}
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Budget RH réel (€)</span>
                        <input
                            type="number"
                            min={0}
                            step={100}
                            value={formValues.budget_rh_actual}
                            onChange={(e) => handleFieldChange("budget_rh_actual", Number(e.target.value))}
                            className={inputClass}
                        />
                    </label>
                </div>

                {saveError ? <p className="mt-4 text-sm text-red-600">{saveError}</p> : null}

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saveLoading}
                        className="rounded-lg border border-slate-200 bg-transparent px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={saveLoading}
                        className={cx(
                            "inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60",
                        )}
                    >
                        {saveLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" aria-hidden />
                                Enregistrement...
                            </>
                        ) : (
                            "Enregistrer"
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
