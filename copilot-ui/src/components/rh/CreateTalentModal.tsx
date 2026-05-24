/**
 * Modal création talent RH — POST /rh/talents (WF_RH_Talents_CRUD).
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { createRhTalent, mapRhTalentCreateError } from "@/api/rh-talents.api";
import type { CreateRhTalentPayload } from "@/types/rh-talents.types";
import type { RhTalentListItem } from "@/types/rh-talents.types";
import {
    RH_ALERT_ERROR,
    RH_BTN_PRIMARY,
    RH_BTN_SECONDARY,
    RH_INPUT,
    RH_MODAL_OVERLAY,
    RH_MODAL_PANEL,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_MODAL_HEADER,
    WS_MUTED_SURFACE,
    WS_TEXT_FAINT,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export const RH_TALENT_DEPARTMENTS = [
    "Engineering",
    "Data",
    "Frontend",
    "Backend",
    "DevOps",
    "QA",
    "Product",
    "Design",
] as const;

export const RH_TALENT_SENIORITY_LEVELS = ["Junior", "Mid", "Senior", "Lead"] as const;

export const RH_TALENT_STATUSES = [
    { value: "active", label: "Actif" },
    { value: "inactive", label: "Inactif" },
    { value: "onleave", label: "En congé" },
] as const;

const EMPTY_FORM: CreateRhTalentPayload = {
    name: "",
    email: "",
    phone: "",
    job_title: "",
    department: "",
    seniority_level: "",
    status: "active",
    hire_date: "",
};

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const inputCls = cx("w-full px-2.5 py-1.5 text-sm", RH_INPUT);
const selectCls = cx("w-full px-2.5 py-1.5 text-sm", RH_INPUT);
const labelCls = cx("mb-0.5 block text-[11px] font-medium", RH_TEXT_MUTED);

export type CreateTalentModalProps = {
    open: boolean;
    onClose: () => void;
    apiBase?: string;
    token?: string;
    onCreated?: (talent: RhTalentListItem) => void;
};

export function CreateTalentModal({ open, onClose, apiBase, token, onCreated }: CreateTalentModalProps) {
    const [form, setForm] = useState<CreateRhTalentPayload>({ ...EMPTY_FORM });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const resetForm = useCallback(() => {
        setForm({ ...EMPTY_FORM });
        setFieldErrors({});
        setFormError(null);
    }, []);

    useEffect(() => {
        if (!open) resetForm();
    }, [open, resetForm]);

    const set = (key: keyof CreateRhTalentPayload, value: string) => {
        setForm((f) => ({ ...f, [key]: value }));
        setFieldErrors((e) => {
            const next = { ...e };
            delete next[key];
            return next;
        });
        setFormError(null);
    };

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!form.name.trim()) errors.name = "Le nom est obligatoire.";
        if (!form.email.trim()) errors.email = "L’email est obligatoire.";
        else if (!isValidEmail(form.email)) errors.email = "Adresse email invalide.";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setFormError(null);
        try {
            const result = await createRhTalent(form, { apiBase, token });
            onCreated?.(result.talent);
            resetForm();
            onClose();
        } catch (err) {
            setFormError(mapRhTalentCreateError(err));
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <button
                type="button"
                className={cx("absolute inset-0", RH_MODAL_OVERLAY)}
                aria-label="Fermer"
                disabled={submitting}
                onClick={() => !submitting && onClose()}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-talent-title"
                className={cx(RH_MODAL_PANEL, "max-h-[min(90vh,720px)] w-full max-w-lg")}
            >
                <div className={cx("flex items-start justify-between px-4 py-3", WS_MODAL_HEADER)}>
                    <div className="flex items-center gap-2.5">
                        <span className={cx("flex size-9 items-center justify-center rounded-lg", WS_MUTED_SURFACE, RH_TEXT_SECONDARY)}>
                            <UserPlus size={18} aria-hidden />
                        </span>
                        <div>
                            <h2 id="create-talent-title" className={cx("text-base font-semibold", RH_TEXT_PRIMARY)}>
                                Nouveau talent
                            </h2>
                            <p className={cx("text-[11px]", RH_TEXT_MUTED)}>Ajout au répertoire RH de l’entreprise</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className={cx("rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800", WS_TEXT_FAINT)}
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={(e) => void handleSubmit(e)} className="overflow-y-auto px-4 py-3">
                    {formError ? (
                        <div className={cx("mb-3 rounded-lg px-3 py-2 text-sm", RH_ALERT_ERROR)} role="alert">
                            {formError}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className={labelCls} htmlFor="ct-name">
                                Nom <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="ct-name"
                                className={inputCls}
                                value={form.name}
                                onChange={(ev) => set("name", ev.target.value)}
                                autoComplete="name"
                                disabled={submitting}
                            />
                            {fieldErrors.name ? (
                                <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p>
                            ) : null}
                        </div>

                        <div className="sm:col-span-2">
                            <label className={labelCls} htmlFor="ct-email">
                                Email <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="ct-email"
                                type="email"
                                className={inputCls}
                                value={form.email}
                                onChange={(ev) => set("email", ev.target.value)}
                                autoComplete="email"
                                disabled={submitting}
                            />
                            {fieldErrors.email ? (
                                <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className={labelCls} htmlFor="ct-phone">
                                Téléphone
                            </label>
                            <input
                                id="ct-phone"
                                className={inputCls}
                                value={form.phone ?? ""}
                                onChange={(ev) => set("phone", ev.target.value)}
                                disabled={submitting}
                            />
                        </div>

                        <div>
                            <label className={labelCls} htmlFor="ct-job">
                                Poste
                            </label>
                            <input
                                id="ct-job"
                                className={inputCls}
                                value={form.job_title ?? ""}
                                onChange={(ev) => set("job_title", ev.target.value)}
                                disabled={submitting}
                            />
                        </div>

                        <div>
                            <label className={labelCls} htmlFor="ct-dept">
                                Département
                            </label>
                            <select
                                id="ct-dept"
                                className={selectCls}
                                value={form.department ?? ""}
                                onChange={(ev) => set("department", ev.target.value)}
                                disabled={submitting}
                            >
                                <option value="">—</option>
                                {RH_TALENT_DEPARTMENTS.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelCls} htmlFor="ct-seniority">
                                Séniorité
                            </label>
                            <select
                                id="ct-seniority"
                                className={selectCls}
                                value={form.seniority_level ?? ""}
                                onChange={(ev) => set("seniority_level", ev.target.value)}
                                disabled={submitting}
                            >
                                <option value="">—</option>
                                {RH_TALENT_SENIORITY_LEVELS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelCls} htmlFor="ct-status">
                                Statut
                            </label>
                            <select
                                id="ct-status"
                                className={selectCls}
                                value={form.status ?? "active"}
                                onChange={(ev) => set("status", ev.target.value)}
                                disabled={submitting}
                            >
                                {RH_TALENT_STATUSES.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelCls} htmlFor="ct-hire">
                                Date d&apos;arrivée
                            </label>
                            <input
                                id="ct-hire"
                                type="date"
                                className={inputCls}
                                value={form.hire_date ?? ""}
                                onChange={(ev) => set("hire_date", ev.target.value)}
                                disabled={submitting}
                            />
                        </div>

                    </div>

                    <div className={cx("mt-4 flex flex-wrap justify-end gap-2 border-t pt-3", WS_MODAL_HEADER)}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className={cx("rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50", RH_BTN_SECONDARY)}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={cx("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60", RH_BTN_PRIMARY)}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" aria-hidden />
                                    Création…
                                </>
                            ) : (
                                <>
                                    <UserPlus size={16} aria-hidden />
                                    Créer le talent
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
