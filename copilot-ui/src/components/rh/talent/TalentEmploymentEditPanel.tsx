/**
 * Drawer « Modifier le contrat » — synchronisé GET/PUT `/rh/talents/:id/employment`.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Briefcase, Loader2 } from "lucide-react";
import {
    contractStatusBadgeMeta,
    formatTenureFromBackend,
} from "@/lib/rh-employment-display";
import { parseFlexibleDateToIso, parseSalaryToNumber, toDateInputValue } from "@/lib/rh-date-iso";
import {
    mapRhTalentEmploymentApiError,
    useTalentEmployment,
    useUpdateTalentEmployment,
} from "@/hooks/useTalentEmployment";
import type { EmploymentManager, UpdateEmploymentPayload } from "@/types/rh-employment.types";
import { RH_EMPLOYMENT_CONTRACT_TYPES } from "@/types/rh-employment.types";
import {
    RH_ALERT_ERROR,
    RH_BTN_PRIMARY,
    RH_BTN_SECONDARY,
    RH_TEXT_MUTED,
    RH_TEXT_PRIMARY,
    WS_MUTED_SURFACE,
} from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

const inputCls = cx(
    "w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-sm shadow-sm",
    "focus:border-ws-accent/60 focus:outline-none focus:ring-2 focus:ring-ws-accent/20",
    "dark:border-slate-700 dark:bg-slate-900",
);
const labelCls = cx("mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400");
const readonlyCls = cx(
    "w-full rounded-lg border border-dashed border-slate-200/90 bg-slate-50/80 px-2.5 py-1.5 text-sm text-slate-700",
    "dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200",
);

export const TALENT_EMPLOYMENT_DRAWER_FORM_ID = "talent-employment-drawer-form";

type EmploymentFormState = {
    role: string;
    salary: string;
    contract_type: string;
    integration_date: string;
    contract_end_date: string;
};

const EMPTY_FORM: EmploymentFormState = {
    role: "",
    salary: "",
    contract_type: "",
    integration_date: "",
    contract_end_date: "",
};

function responseToForm(employment: {
    role?: string | null;
    salary?: string | number | null;
    contract_type?: string | null;
    integration_date?: string | null;
    contract_end_date?: string | null;
} | null): EmploymentFormState {
    if (!employment) return { ...EMPTY_FORM };
    return {
        role: employment.role?.trim() ?? "",
        salary: employment.salary != null && employment.salary !== "" ? String(employment.salary) : "",
        contract_type: employment.contract_type?.trim() ?? "",
        integration_date: toDateInputValue(employment.integration_date),
        contract_end_date: toDateInputValue(employment.contract_end_date),
    };
}

function formToPayload(form: EmploymentFormState): UpdateEmploymentPayload {
    const contract_end_date = parseFlexibleDateToIso(form.contract_end_date) ?? "";
    return {
        role: form.role.trim(),
        salary: parseSalaryToNumber(form.salary),
        contract_type: form.contract_type.trim(),
        integration_date: parseFlexibleDateToIso(form.integration_date) ?? "",
        contract_end_date,
    };
}

function managerDisplayLabel(manager: EmploymentManager | null | undefined): string {
    const name = manager?.manager_name?.trim();
    if (name) return name;
    return "Non assigné";
}

export type TalentEmploymentEditPanelProps = {
    talentId: string;
    apiBase?: string;
    token?: string;
    mode: "create" | "edit";
    onCancel: () => void;
    onSaved: () => void;
};

export function TalentEmploymentDrawerHeader({
    talentName,
    mode,
}: {
    talentName: string;
    mode: "create" | "edit";
}) {
    return (
        <div className="flex items-center gap-2.5">
            <span
                className={cx(
                    "flex size-9 items-center justify-center rounded-lg",
                    WS_MUTED_SURFACE,
                    RH_TEXT_MUTED,
                )}
            >
                <Briefcase size={18} aria-hidden />
            </span>
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ws-accent">Contrat RH</p>
                <h2 className={cx("text-base font-bold", RH_TEXT_PRIMARY)}>
                    {mode === "create" ? "Ajouter un contrat" : "Modifier le contrat"}
                </h2>
                <p className={cx("text-xs", RH_TEXT_MUTED)}>{talentName}</p>
            </div>
        </div>
    );
}

function EmploymentFormSkeleton() {
    return (
        <div className="animate-pulse space-y-4 p-1" aria-busy="true" aria-label="Chargement du contrat">
            <div className="h-6 w-28 rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-48 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                        <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                        <div className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TalentEmploymentEditPanel({
    talentId,
    apiBase,
    token,
    mode,
    onCancel,
    onSaved,
}: TalentEmploymentEditPanelProps) {
    const ctx = useMemo(() => ({ token, apiBase }), [token, apiBase]);
    const loadExisting = mode === "edit";
    const { data, isLoading, isError, error, isFetching } = useTalentEmployment(talentId, ctx, {
        enabled: loadExisting,
    });
    const updateMutation = useUpdateTalentEmployment(talentId, ctx);
    const notConfigured = Boolean(data?.notConfigured);

    const employment = data?.employment ?? null;
    const manager = data?.manager ?? null;

    const [form, setForm] = useState<EmploymentFormState>(EMPTY_FORM);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EmploymentFormState, string>>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const submitting = updateMutation.isPending;
    const contractStatus = contractStatusBadgeMeta(employment?.contract_end_date);
    const tenureLabel = formatTenureFromBackend(employment?.tenure_years, employment?.tenure_months);

    useEffect(() => {
        if (mode === "create") {
            setForm({ ...EMPTY_FORM });
            setFieldErrors({});
            setFormError(null);
            return;
        }
        if (!data) return;
        setForm(responseToForm(employment));
        setFieldErrors({});
        setFormError(null);
    }, [data, employment, mode, talentId]);

    const set = (key: keyof EmploymentFormState, value: string) => {
        setForm((f) => ({ ...f, [key]: value }));
        setFieldErrors((e) => ({ ...e, [key]: undefined }));
        setFormError(null);
    };

    const validate = (): boolean => {
        const next: Partial<Record<keyof EmploymentFormState, string>> = {};
        if (!form.role.trim()) next.role = "Rôle requis.";
        if (!form.contract_type.trim()) next.contract_type = "Type de contrat requis.";
        const salaryNum = parseSalaryToNumber(form.salary);
        if (!form.salary.trim() || salaryNum <= 0) next.salary = "Rémunération requise (montant > 0).";
        const integrationIso = parseFlexibleDateToIso(form.integration_date);
        if (!form.integration_date.trim()) {
            next.integration_date = "Date d'intégration requise.";
        } else if (!integrationIso) {
            next.integration_date = "Format invalide (JJ/MM/AAAA ou AAAA-MM-JJ).";
        }
        const endIso = parseFlexibleDateToIso(form.contract_end_date);
        if (form.contract_end_date.trim() && !endIso) {
            next.contract_end_date = "Format invalide (JJ/MM/AAAA ou AAAA-MM-JJ).";
        } else if (integrationIso && endIso && endIso < integrationIso) {
            next.contract_end_date = "La fin doit être après l'intégration.";
        }
        setFieldErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setFormError(null);
        try {
            await updateMutation.mutateAsync(formToPayload(form));
            onSaved();
        } catch (err) {
            setFormError(mapRhTalentEmploymentApiError(err));
        }
    };

    return (
        <>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {loadExisting && isLoading ? (
                    <EmploymentFormSkeleton />
                ) : loadExisting && isError && !notConfigured ? (
                    <div className={cx("rounded-lg px-3 py-3 text-sm", RH_ALERT_ERROR)} role="alert">
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                            <div>
                                <p className="font-semibold">Impossible de charger le contrat</p>
                                <p className="mt-1 text-xs opacity-90">
                                    {error instanceof Error ? error.message : "Erreur réseau"}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form id={TALENT_EMPLOYMENT_DRAWER_FORM_ID} onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={cx(
                                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                                    contractStatus.cls,
                                )}
                            >
                                {contractStatus.label}
                            </span>
                            {tenureLabel ? (
                                <span className={cx("text-xs", RH_TEXT_MUTED)}>
                                    Ancienneté : <span className="font-medium text-slate-700 dark:text-slate-200">{tenureLabel}</span>
                                </span>
                            ) : null}
                            {isFetching && !isLoading ? (
                                <Loader2 size={12} className={cx("animate-spin", RH_TEXT_MUTED)} aria-hidden />
                            ) : null}
                        </div>

                        {notConfigured && loadExisting ? (
                            <p className={cx("rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100")}>
                                Aucune fiche contrat en lecture pour ce talent (GET non publié). Vous pouvez tout de même
                                enregistrer un nouveau contrat ci-dessous.
                            </p>
                        ) : null}

                        {formError ? (
                            <div className={cx("rounded-lg px-3 py-2 text-sm", RH_ALERT_ERROR)} role="alert">
                                {formError}
                            </div>
                        ) : null}

                        <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                            <h4 className={cx("mb-3 text-[10px] font-bold uppercase tracking-wider", RH_TEXT_MUTED)}>
                                Contrat
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className={labelCls} htmlFor="emp-role">
                                        Rôle
                                    </label>
                                    <input
                                        id="emp-role"
                                        className={inputCls}
                                        value={form.role}
                                        onChange={(e) => set("role", e.target.value)}
                                        disabled={submitting}
                                        autoComplete="organization-title"
                                    />
                                    {fieldErrors.role ? (
                                        <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.role}</p>
                                    ) : null}
                                </div>
                                <div>
                                    <label className={labelCls} htmlFor="emp-type">
                                        Type de contrat
                                    </label>
                                    <select
                                        id="emp-type"
                                        className={inputCls}
                                        value={form.contract_type}
                                        onChange={(e) => set("contract_type", e.target.value)}
                                        disabled={submitting}
                                    >
                                        <option value="">Sélectionner</option>
                                        {RH_EMPLOYMENT_CONTRACT_TYPES.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.contract_type ? (
                                        <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.contract_type}</p>
                                    ) : null}
                                </div>
                                <div>
                                    <label className={labelCls} htmlFor="emp-salary">
                                        Rémunération (MAD)
                                    </label>
                                    <input
                                        id="emp-salary"
                                        type="number"
                                        min={1}
                                        step={1}
                                        className={inputCls}
                                        value={form.salary}
                                        onChange={(e) => set("salary", e.target.value)}
                                        disabled={submitting}
                                    />
                                    {fieldErrors.salary ? (
                                        <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.salary}</p>
                                    ) : null}
                                </div>
                                <div>
                                    <label className={labelCls} htmlFor="emp-start">
                                        Date d&apos;intégration
                                    </label>
                                    <input
                                        id="emp-start"
                                        type="date"
                                        className={inputCls}
                                        value={form.integration_date}
                                        onChange={(e) => set("integration_date", e.target.value)}
                                        disabled={submitting}
                                    />
                                    {fieldErrors.integration_date ? (
                                        <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.integration_date}</p>
                                    ) : null}
                                </div>
                                <div>
                                    <label className={labelCls} htmlFor="emp-end">
                                        Fin de contrat
                                    </label>
                                    <input
                                        id="emp-end"
                                        type="date"
                                        className={inputCls}
                                        value={form.contract_end_date}
                                        onChange={(e) => set("contract_end_date", e.target.value)}
                                        disabled={submitting}
                                    />
                                    {fieldErrors.contract_end_date ? (
                                        <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.contract_end_date}</p>
                                    ) : null}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                            <h4 className={cx("mb-2 text-[10px] font-bold uppercase tracking-wider", RH_TEXT_MUTED)}>
                                Manager responsable
                            </h4>
                            <label className={labelCls} htmlFor="emp-manager">
                                Manager
                            </label>
                            <input
                                id="emp-manager"
                                className={readonlyCls}
                                value={managerDisplayLabel(manager)}
                                readOnly
                                disabled
                                aria-readonly="true"
                            />
                            {manager?.manager_email?.trim() ? (
                                <p className={cx("mt-1 text-xs", RH_TEXT_MUTED)}>{manager.manager_email}</p>
                            ) : null}
                            <p className={cx("mt-1.5 text-[10px]", RH_TEXT_MUTED)}>
                                Affectation manager gérée via Mobilité & réaffectation — non modifiable ici.
                            </p>
                        </section>
                    </form>
                )}
            </div>

            <div
                className={cx(
                    "flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95",
                )}
            >
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting || (loadExisting && isLoading)}
                    className={cx("rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50", RH_BTN_SECONDARY)}
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    form={TALENT_EMPLOYMENT_DRAWER_FORM_ID}
                    disabled={submitting || (loadExisting && isLoading) || (loadExisting && isError && !notConfigured)}
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
        </>
    );
}
