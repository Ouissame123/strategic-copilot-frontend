/**
 * Formulaire édition talent — panneau inline (drawer) ou corps de modal.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Pencil, User } from "lucide-react";
import {
    RH_TALENT_DEPARTMENTS,
    RH_TALENT_SENIORITY_LEVELS,
    RH_TALENT_STATUSES,
} from "@/components/rh/CreateTalentModal";
import type { RhTalentEditInitial } from "@/components/rh/EditTalentModal";
import {
    buildUpdatePayload,
    toFormState,
    validateEditTalentForm,
    type EditTalentForm,
} from "@/components/rh/talent/talent-edit-shared";
import { mapRhTalentUpdateError } from "@/services/rh-talents.api";
import { useUpdateRhTalentMutation } from "@/hooks/use-rh-talents";
import type { RhTalentListItem } from "@/types/rh-talents.types";
import {
    RH_ALERT_ERROR,
    RH_BTN_PRIMARY,
    RH_BTN_SECONDARY,
    RH_INPUT,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    RH_TEXT_SECONDARY,
    WS_MUTED_SURFACE,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

const inputCls = cx("w-full px-2.5 py-1.5 text-sm", RH_INPUT);
const selectCls = cx("w-full px-2.5 py-1.5 text-sm", RH_INPUT);
const labelCls = cx("mb-0.5 block text-[11px] font-medium", RH_TEXT_MUTED);

export const TALENT_DRAWER_EDIT_FORM_ID = "talent-drawer-edit-form";

export type TalentEditPanelProps = {
    talent: RhTalentEditInitial;
    apiBase?: string;
    token?: string;
    onCancel: () => void;
    onSaved: (talent: RhTalentListItem) => void;
    /** Corps scrollable seul — footer géré par le parent (drawer). */
    embedInDrawer?: boolean;
    formId?: string;
};

function FormFields({
    form,
    fieldErrors,
    submitting,
    set,
    idPrefix,
}: {
    form: EditTalentForm;
    fieldErrors: Record<string, string>;
    submitting: boolean;
    set: (key: keyof EditTalentForm, value: string) => void;
    idPrefix: string;
}) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <section className="sm:col-span-2">
                <h4 className={cx("mb-2 text-[10px] font-bold uppercase tracking-wider", RH_TEXT_MUTED)}>Identité</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className={labelCls} htmlFor={`${idPrefix}-name`}>
                            Nom <span className="text-rose-500">*</span>
                        </label>
                        <input
                            id={`${idPrefix}-name`}
                            className={inputCls}
                            value={form.name}
                            onChange={(ev) => set("name", ev.target.value)}
                            disabled={submitting}
                            autoComplete="name"
                        />
                        {fieldErrors.name ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p> : null}
                    </div>
                    <div className="sm:col-span-2">
                        <label className={labelCls} htmlFor={`${idPrefix}-email`}>
                            Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                            id={`${idPrefix}-email`}
                            type="email"
                            className={inputCls}
                            value={form.email}
                            onChange={(ev) => set("email", ev.target.value)}
                            disabled={submitting}
                            autoComplete="email"
                        />
                        {fieldErrors.email ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p> : null}
                    </div>
                    <div>
                        <label className={labelCls} htmlFor={`${idPrefix}-phone`}>
                            Téléphone
                        </label>
                        <input
                            id={`${idPrefix}-phone`}
                            className={inputCls}
                            value={form.phone}
                            onChange={(ev) => set("phone", ev.target.value)}
                            disabled={submitting}
                        />
                    </div>
                </div>
            </section>

            <section className="sm:col-span-2">
                <h4 className={cx("mb-2 text-[10px] font-bold uppercase tracking-wider", RH_TEXT_MUTED)}>Poste</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelCls} htmlFor={`${idPrefix}-job`}>
                            Intitulé
                        </label>
                        <input
                            id={`${idPrefix}-job`}
                            className={inputCls}
                            value={form.job_title}
                            onChange={(ev) => set("job_title", ev.target.value)}
                            disabled={submitting}
                        />
                    </div>
                    <div>
                        <label className={labelCls} htmlFor={`${idPrefix}-dept`}>
                            Département
                        </label>
                        <select
                            id={`${idPrefix}-dept`}
                            className={selectCls}
                            value={form.department}
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
                        <label className={labelCls} htmlFor={`${idPrefix}-seniority`}>
                            Séniorité
                        </label>
                        <select
                            id={`${idPrefix}-seniority`}
                            className={selectCls}
                            value={form.seniority_level}
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
                        <label className={labelCls} htmlFor={`${idPrefix}-status`}>
                            Statut
                        </label>
                        <select
                            id={`${idPrefix}-status`}
                            className={selectCls}
                            value={form.status}
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
                        <label className={labelCls} htmlFor={`${idPrefix}-hire`}>
                            Date d&apos;arrivée
                        </label>
                        <input
                            id={`${idPrefix}-hire`}
                            type="date"
                            className={inputCls}
                            value={form.hire_date}
                            onChange={(ev) => set("hire_date", ev.target.value)}
                            disabled={submitting}
                        />
                    </div>
                </div>
            </section>

            <section className="sm:col-span-2">
                <h4 className={cx("mb-2 text-[10px] font-bold uppercase tracking-wider", RH_TEXT_MUTED)}>Présentation</h4>
                <label className={labelCls} htmlFor={`${idPrefix}-bio`}>
                    Bio
                </label>
                <textarea
                    id={`${idPrefix}-bio`}
                    rows={4}
                    className={cx(inputCls, "resize-y")}
                    value={form.bio}
                    onChange={(ev) => set("bio", ev.target.value)}
                    disabled={submitting}
                />
            </section>
        </div>
    );
}

export function TalentEditPanel({
    talent,
    apiBase,
    token,
    onCancel,
    onSaved,
    embedInDrawer = false,
    formId = TALENT_DRAWER_EDIT_FORM_ID,
}: TalentEditPanelProps) {
    const mutation = useUpdateRhTalentMutation();
    const [form, setForm] = useState<EditTalentForm>(() => toFormState(talent));
    const [initialForm, setInitialForm] = useState<EditTalentForm>(() => toFormState(talent));
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const submitting = mutation.isPending;
    const idPrefix = embedInDrawer ? "drawer-et" : "modal-et";

    const resetFromTalent = useCallback((t: RhTalentEditInitial) => {
        const next = toFormState(t);
        setForm(next);
        setInitialForm(next);
        setFieldErrors({});
        setFormError(null);
    }, []);

    useEffect(() => {
        resetFromTalent(talent);
    }, [talent.id, talent, resetFromTalent]);

    const set = (key: keyof EditTalentForm, value: string) => {
        setForm((f) => ({ ...f, [key]: value }));
        setFieldErrors((e) => {
            const next = { ...e };
            delete next[key];
            return next;
        });
        setFormError(null);
    };

    const hasChanges = useMemo(() => {
        return Object.keys(buildUpdatePayload(initialForm, form)).length > 0;
    }, [form, initialForm]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const errors = validateEditTalentForm(form);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        const payload = buildUpdatePayload(initialForm, form);
        if (Object.keys(payload).length === 0) {
            setFormError("Aucune modification détectée.");
            return;
        }

        setFormError(null);
        try {
            const result = await mutation.mutateAsync({
                talentId: talent.id,
                payload,
                apiBase,
                token,
            });
            onSaved(result.talent);
        } catch (err) {
            setFormError(mapRhTalentUpdateError(err));
        }
    };

    const formBody = (
        <>
            {formError ? (
                <div className={cx("mb-4 rounded-lg px-3 py-2 text-sm", RH_ALERT_ERROR)} role="alert">
                    {formError}
                </div>
            ) : null}
            <FormFields form={form} fieldErrors={fieldErrors} submitting={submitting} set={set} idPrefix={idPrefix} />
        </>
    );

    if (embedInDrawer) {
        return (
            <>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    <form id={formId} onSubmit={(e) => void handleSubmit(e)}>
                        {formBody}
                    </form>
                </div>
                <TalentEditDrawerFooter
                    formId={formId}
                    submitting={submitting}
                    hasChanges={hasChanges}
                    onCancel={onCancel}
                />
            </>
        );
    }

    return (
        <form id={formId} onSubmit={(e) => void handleSubmit(e)} className="overflow-y-auto px-4 py-3">
            {formBody}
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className={cx("rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50", RH_BTN_SECONDARY)}
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    disabled={submitting || !hasChanges}
                    className={cx(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                        RH_BTN_PRIMARY,
                    )}
                >
                    {submitting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" aria-hidden />
                            Enregistrement…
                        </>
                    ) : (
                        <>
                            <Pencil size={16} aria-hidden />
                            Enregistrer
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}

export type TalentEditDrawerFooterProps = {
    formId?: string;
    submitting?: boolean;
    hasChanges?: boolean;
    onCancel: () => void;
};

export function TalentEditDrawerFooter({
    formId = TALENT_DRAWER_EDIT_FORM_ID,
    submitting = false,
    hasChanges = true,
    onCancel,
}: TalentEditDrawerFooterProps) {
    return (
        <div
            className={cx(
                "flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95",
            )}
        >
            <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className={cx("rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50", RH_BTN_SECONDARY)}
            >
                Annuler
            </button>
            <button
                type="submit"
                form={formId}
                disabled={submitting || !hasChanges}
                className={cx(
                    "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                    RH_BTN_PRIMARY,
                )}
            >
                {submitting ? (
                    <>
                        <Loader2 size={16} className="animate-spin" aria-hidden />
                        Enregistrement…
                    </>
                ) : (
                    "Enregistrer"
                )}
            </button>
        </div>
    );
}

export function TalentEditDrawerHeader({ talentName }: { talentName: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className={cx("flex size-9 items-center justify-center rounded-lg", WS_MUTED_SURFACE, RH_TEXT_SECONDARY)}>
                <User size={18} aria-hidden />
            </span>
            <div>
                <p className={cx("text-[10px] font-semibold uppercase tracking-wider text-ws-accent")}>Mode édition</p>
                <h2 className={cx("text-base font-bold", RH_TEXT_PRIMARY)}>Modifier le profil</h2>
                <p className={cx("text-xs", RH_TEXT_MUTED)}>{talentName}</p>
            </div>
        </div>
    );
}
