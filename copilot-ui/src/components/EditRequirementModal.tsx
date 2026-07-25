import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { patchRequirement, type Requirement } from "@/api/requirements";
import {
    CRITICALITY_OPTIONS,
    LEVEL_OPTIONS,
    REQUIREMENT_TYPE_OPTIONS,
    type RequirementFormValues,
} from "@/components/AddRequirementModal";

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";

function fromRequirement(req: Requirement): RequirementFormValues {
    return {
        skill_id: req.skill_id,
        skill_name: req.skill_name,
        level_required: req.level_required,
        criticality: req.criticality ?? 2,
        weight: req.weight ?? req.criticality ?? 2,
        requirement_type: req.requirement_type || "core",
        is_mandatory: req.is_mandatory ?? true,
        priority: req.priority ?? 5,
    };
}

export type EditRequirementModalProps = {
    requirement: Requirement | null;
    onClose: () => void;
    projectId: string;
    token: string;
    onUpdated: (requirement: Requirement) => void;
    onError: (message: string) => void;
};

export function EditRequirementModal({
    requirement,
    onClose,
    projectId,
    token,
    onUpdated,
    onError,
}: EditRequirementModalProps) {
    const [formValues, setFormValues] = useState<RequirementFormValues | null>(null);
    const [initialValues, setInitialValues] = useState<RequirementFormValues | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    useEffect(() => {
        if (!requirement) {
            setFormValues(null);
            setInitialValues(null);
            setEditError(null);
            return;
        }
        const initial = fromRequirement(requirement);
        setFormValues(initial);
        setInitialValues(initial);
        setEditError(null);
    }, [requirement]);

    useEffect(() => {
        if (!requirement) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !editLoading) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [requirement, editLoading, onClose]);

    if (!requirement || !formValues || !initialValues) return null;

    async function handleEditSave() {
        const changed: Record<string, string | number | boolean> = {};
        const keys = ["level_required", "criticality", "weight", "is_mandatory", "requirement_type", "priority"] as const;
        for (const key of keys) {
            if (String(formValues![key]) !== String(initialValues![key])) {
                changed[key] = formValues![key];
            }
        }
        if (Object.keys(changed).length === 0) {
            onError("Aucune modification");
            return;
        }

        setEditLoading(true);
        setEditError(null);
        try {
            const result = await patchRequirement(projectId, requirement!.requirement_id, changed, token);
            if (String(result.status).toLowerCase() === "success") {
                onUpdated(result.requirement);
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

    const modal = (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget && !editLoading) onClose();
            }}
        >
            <div
                className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-900"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-requirement-title"
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                    <h2 id="edit-requirement-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Modifier — {requirement.skill_name ?? "Compétence"}
                    </h2>
                    <button
                        type="button"
                        disabled={editLoading}
                        onClick={onClose}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Niveau requis</span>
                        <select
                            value={formValues.level_required}
                            onChange={(e) =>
                                setFormValues((p) => (p ? { ...p, level_required: Number(e.target.value) || 1 } : p))
                            }
                            className={inputClass}
                        >
                            {LEVEL_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <fieldset>
                        <legend className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">Criticité</legend>
                        <div className="flex flex-wrap gap-2">
                            {CRITICALITY_OPTIONS.map((o) => (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => setFormValues((p) => (p ? { ...p, criticality: o.value } : p))}
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                                        formValues.criticality === o.value
                                            ? "bg-primary-600 text-white"
                                            : "border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800"
                                    }`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Importance relative — {formValues.weight}
                        </span>
                        <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={formValues.weight}
                            onChange={(e) =>
                                setFormValues((p) => (p ? { ...p, weight: Number(e.target.value) } : p))
                            }
                            className="w-full"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Type de besoin</span>
                        <select
                            value={formValues.requirement_type}
                            onChange={(e) =>
                                setFormValues((p) => (p ? { ...p, requirement_type: e.target.value } : p))
                            }
                            className={inputClass}
                        >
                            {REQUIREMENT_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600">
                        <span className="text-sm text-slate-700 dark:text-slate-300">Compétence obligatoire</span>
                        <input
                            type="checkbox"
                            checked={formValues.is_mandatory}
                            onChange={(e) =>
                                setFormValues((p) => (p ? { ...p, is_mandatory: e.target.checked } : p))
                            }
                            className="size-4 rounded border-slate-300"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Priorité (1 = plus haute)
                        </span>
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={formValues.priority}
                            onChange={(e) =>
                                setFormValues((p) =>
                                    p
                                        ? {
                                              ...p,
                                              priority: Math.min(10, Math.max(1, Number(e.target.value) || 5)),
                                          }
                                        : p,
                                )
                            }
                            className={inputClass}
                        />
                    </label>

                    {editError ? <p className="text-sm text-rose-600">{editError}</p> : null}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
                    <button
                        type="button"
                        disabled={editLoading}
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        disabled={editLoading}
                        onClick={() => void handleEditSave()}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                        {editLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
