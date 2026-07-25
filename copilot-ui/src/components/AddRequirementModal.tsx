import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";
import {
    createRequirement,
    fetchSkillsCatalog,
    isValidUuid,
    type Requirement,
    type SkillPickerItem,
} from "@/api/requirements";

export type RequirementFormValues = {
    skill_id: string;
    skill_name: string;
    level_required: number;
    criticality: number;
    weight: number;
    requirement_type: string;
    is_mandatory: boolean;
    priority: number;
};

export const LEVEL_OPTIONS = [
    { value: 1, label: "Niveau 1 — Débutant" },
    { value: 2, label: "Niveau 2 — Junior" },
    { value: 3, label: "Niveau 3 — Intermédiaire" },
    { value: 4, label: "Niveau 4 — Senior" },
    { value: 5, label: "Niveau 5 — Expert" },
] as const;

export const REQUIREMENT_TYPE_OPTIONS = [
    { value: "core", label: "Essentielle" },
    { value: "mandatory", label: "Obligatoire" },
    { value: "nice_to_have", label: "Souhaitable" },
    { value: "optional", label: "Optionnelle" },
] as const;

export const CRITICALITY_OPTIONS = [
    { value: 1, label: "Faible" },
    { value: 2, label: "Moyenne" },
    { value: 3, label: "Critique" },
] as const;

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";

function defaultForm(): RequirementFormValues {
    return {
        skill_id: "",
        skill_name: "",
        level_required: 3,
        criticality: 2,
        weight: 2,
        requirement_type: "core",
        is_mandatory: true,
        priority: 5,
    };
}

export type AddRequirementModalProps = {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    token: string;
    onCreated: (requirement: Requirement) => void;
    onReload: () => Promise<void>;
    onError: (message: string) => void;
};

export function AddRequirementModal({
    isOpen,
    onClose,
    projectId,
    token,
    onCreated,
    onReload,
    onError,
}: AddRequirementModalProps) {
    const [formValues, setFormValues] = useState(defaultForm);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<SkillPickerItem[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [skillSearch, setSkillSearch] = useState("");
    const [manualUuidMode, setManualUuidMode] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setFormValues(defaultForm());
        setFieldErrors({});
        setCreateError(null);
        setSkillSearch("");
        setManualUuidMode(false);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !token) return;
        const ctrl = new AbortController();
        setCatalogLoading(true);
        void fetchSkillsCatalog(token, ctrl.signal)
            .then((items) => {
                setCatalog(items);
                if (items.length === 0) setManualUuidMode(true);
            })
            .finally(() => setCatalogLoading(false));
        return () => ctrl.abort();
    }, [isOpen, token]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !createLoading) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, createLoading, onClose]);

    const filteredCatalog = useMemo(() => {
        const q = skillSearch.trim().toLowerCase();
        if (!q) return catalog;
        return catalog.filter(
            (s) =>
                s.skill_name.toLowerCase().includes(q) ||
                (s.skill_category ?? "").toLowerCase().includes(q) ||
                s.skill_id.toLowerCase().includes(q),
        );
    }, [catalog, skillSearch]);

    if (!isOpen) return null;

    async function handleCreate() {
        const nextErrors: Partial<Record<string, string>> = {};
        const skillId = formValues.skill_id.trim();
        if (!skillId) nextErrors.skill_id = "La compétence est requise";
        else if (!isValidUuid(skillId)) nextErrors.skill_id = "UUID compétence invalide";
        if (!formValues.level_required) nextErrors.level_required = "Le niveau est requis";
        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            return;
        }

        setCreateLoading(true);
        setCreateError(null);
        try {
            const result = await createRequirement(
                projectId,
                {
                    skill_id: skillId,
                    level_required: formValues.level_required,
                    criticality: formValues.criticality || 2,
                    weight: formValues.weight || formValues.criticality || 2,
                    is_mandatory: formValues.is_mandatory ?? true,
                    requirement_type: formValues.requirement_type || "core",
                    priority: formValues.priority || 5,
                },
                token,
            );
            if (String(result.status).toLowerCase() === "success") {
                onCreated(result.requirement);
                onClose();
                await onReload();
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

    const modal = (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget && !createLoading) onClose();
            }}
        >
            <div
                className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-900"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-requirement-title"
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                    <h2 id="add-requirement-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Ajouter une compétence requise
                    </h2>
                    <button
                        type="button"
                        disabled={createLoading}
                        onClick={onClose}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Compétence <span className="text-rose-500">*</span>
                        </span>
                        {!manualUuidMode && catalog.length > 0 ? (
                            <>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={skillSearch}
                                        onChange={(e) => setSkillSearch(e.target.value)}
                                        placeholder="Rechercher une compétence…"
                                        className={`${inputClass} pl-9`}
                                        disabled={catalogLoading}
                                    />
                                </div>
                                <select
                                    value={formValues.skill_id}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        const item = catalog.find((c) => c.skill_id === id);
                                        setFormValues((p) => ({
                                            ...p,
                                            skill_id: id,
                                            skill_name: item?.skill_name ?? p.skill_name,
                                        }));
                                        setFieldErrors((p) => ({ ...p, skill_id: undefined }));
                                    }}
                                    className={inputClass}
                                    disabled={catalogLoading}
                                >
                                    <option value="">Choisir une compétence…</option>
                                    {filteredCatalog.map((s) => (
                                        <option key={s.skill_id} value={s.skill_id}>
                                            {s.skill_name}
                                            {s.skill_category ? ` — ${s.skill_category}` : ""}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="text-left text-xs text-primary-600 hover:underline"
                                    onClick={() => setManualUuidMode(true)}
                                >
                                    Saisir un UUID manuellement
                                </button>
                            </>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={formValues.skill_id}
                                    onChange={(e) => {
                                        setFormValues((p) => ({ ...p, skill_id: e.target.value.trim() }));
                                        setFieldErrors((p) => ({ ...p, skill_id: undefined }));
                                    }}
                                    placeholder="Skill ID (UUID)"
                                    className={inputClass}
                                />
                                <input
                                    type="text"
                                    value={formValues.skill_name}
                                    onChange={(e) => setFormValues((p) => ({ ...p, skill_name: e.target.value }))}
                                    placeholder="Nom affiché (optionnel)"
                                    className={inputClass}
                                />
                                {catalog.length > 0 ? (
                                    <button
                                        type="button"
                                        className="text-left text-xs text-primary-600 hover:underline"
                                        onClick={() => setManualUuidMode(false)}
                                    >
                                        Retour au catalogue
                                    </button>
                                ) : null}
                            </>
                        )}
                        {fieldErrors.skill_id ? <span className="text-xs text-rose-600">{fieldErrors.skill_id}</span> : null}
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Niveau requis <span className="text-rose-500">*</span>
                        </span>
                        <select
                            value={formValues.level_required}
                            onChange={(e) =>
                                setFormValues((p) => ({ ...p, level_required: Number(e.target.value) || 1 }))
                            }
                            className={inputClass}
                        >
                            {LEVEL_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.level_required ? (
                            <span className="text-xs text-rose-600">{fieldErrors.level_required}</span>
                        ) : null}
                    </label>

                    <fieldset>
                        <legend className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">Criticité</legend>
                        <div className="flex flex-wrap gap-2">
                            {CRITICALITY_OPTIONS.map((o) => (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() =>
                                        setFormValues((p) => ({
                                            ...p,
                                            criticality: o.value,
                                            weight: p.weight === p.criticality ? o.value : p.weight,
                                        }))
                                    }
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
                            Importance relative (1 = faible, 5 = critique) — {formValues.weight}
                        </span>
                        <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={formValues.weight}
                            onChange={(e) => setFormValues((p) => ({ ...p, weight: Number(e.target.value) }))}
                            className="w-full"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Type de besoin</span>
                        <select
                            value={formValues.requirement_type}
                            onChange={(e) => setFormValues((p) => ({ ...p, requirement_type: e.target.value }))}
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
                            onChange={(e) => setFormValues((p) => ({ ...p, is_mandatory: e.target.checked }))}
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
                                setFormValues((p) => ({
                                    ...p,
                                    priority: Math.min(10, Math.max(1, Number(e.target.value) || 5)),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>

                    {createError ? <p className="text-sm text-rose-600">{createError}</p> : null}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
                    <button
                        type="button"
                        disabled={createLoading}
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        disabled={createLoading}
                        onClick={() => void handleCreate()}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                        {createLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                        Ajouter la compétence
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
