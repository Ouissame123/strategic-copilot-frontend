import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Loader2, UserPlus, X } from "lucide-react";

import { mapRhAccountsApiError } from "@/api/rh-accounts.api";

import { ApiError } from "@/api/errors";

import { useAuth } from "@/hooks/useAuth";

import type { CreateRhStaffAccountBody, RhStaffRole } from "@/types/rh-accounts.types";

import { generateEnterpriseEmail, getEnterpriseDomainFromEmail } from "@/utils/accounts-email-utils";

import {

    RH_ALERT_ERROR,

    RH_BTN_PRIMARY,

    RH_BTN_SECONDARY,

    RH_INPUT,

    RH_MODAL_OVERLAY,

    RH_MODAL_PANEL,

    RH_TEXT_MUTED,

    RH_TEXT_PRIMARY,

    WS_MODAL_HEADER,

    WS_TEXT_FAINT,

} from "@/utils/rh-workspace-theme";

import { cx } from "@/utils/cx";



const EMPTY: CreateRhStaffAccountBody = {

    full_name: "",

    email: "",

    password: "",

    role: "manager",

};



function isValidEmail(email: string): boolean {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

}



type CreateStaffAccountModalProps = {

    open: boolean;

    submitting?: boolean;

    onClose: () => void;

    onSubmit: (body: CreateRhStaffAccountBody) => Promise<void>;

};



export function CreateStaffAccountModal({ open, submitting = false, onClose, onSubmit }: CreateStaffAccountModalProps) {

    const { user } = useAuth();

    const enterpriseDomain = useMemo(() => getEnterpriseDomainFromEmail(user?.email ?? ""), [user?.email]);



    const [form, setForm] = useState<CreateRhStaffAccountBody>({ ...EMPTY });

    const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [formError, setFormError] = useState<string | null>(null);



    const reset = useCallback(() => {

        setForm({ ...EMPTY });

        setEmailManuallyEdited(false);

        setFieldErrors({});

        setFormError(null);

    }, []);



    useEffect(() => {

        if (!open) reset();

    }, [open, reset]);



    if (!open) return null;



    const set = <K extends keyof CreateRhStaffAccountBody>(key: K, value: CreateRhStaffAccountBody[K]) => {

        setForm((f) => ({ ...f, [key]: value }));

        setFieldErrors((e) => {

            const next = { ...e };

            delete next[key];

            return next;

        });

        setFormError(null);

    };



    const handleFullNameChange = (value: string) => {

        set("full_name", value);

        if (!emailManuallyEdited && enterpriseDomain) {

            const generated = generateEnterpriseEmail(value, enterpriseDomain);

            if (generated) set("email", generated);

        }

    };



    const validate = (): boolean => {

        const errors: Record<string, string> = {};

        if (!form.full_name.trim()) errors.full_name = "Le nom complet est obligatoire.";

        if (!form.email.trim()) errors.email = "L’email est obligatoire.";

        else if (!isValidEmail(form.email)) errors.email = "Adresse email invalide.";

        if (!form.password) errors.password = "Le mot de passe est obligatoire.";

        else if (form.password.length < 8) errors.password = "Minimum 8 caractères.";

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;

    };



    const handleSubmit = async (e: FormEvent) => {

        e.preventDefault();

        if (!validate()) return;

        setFormError(null);

        try {

            await onSubmit({

                full_name: form.full_name.trim(),

                email: form.email.trim(),

                password: form.password,

                role: form.role,

            });

            reset();

            onClose();

        } catch (err) {

            setFormError(err instanceof ApiError ? mapRhAccountsApiError(err, "create-staff") : mapRhAccountsApiError(err, "create-staff"));

        }

    };



    const inputCls = cx("w-full px-2.5 py-1.5 text-sm", RH_INPUT);

    const labelCls = cx("mb-0.5 block text-[11px] font-medium", RH_TEXT_MUTED);



    return (

        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">

            <button type="button" className={cx("absolute inset-0", RH_MODAL_OVERLAY)} aria-label="Fermer" disabled={submitting} onClick={onClose} />

            <div role="dialog" aria-modal="true" className={cx("relative w-full max-w-md overflow-hidden", RH_MODAL_PANEL)}>

                <div className={cx("flex items-center justify-between px-5 py-4", WS_MODAL_HEADER)}>

                    <div className="flex items-center gap-3">

                        <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">

                            <UserPlus size={20} aria-hidden />

                        </span>

                        <h2 className={cx("text-lg font-semibold", RH_TEXT_PRIMARY)}>Nouveau compte Manager / RH</h2>

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



                <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">

                    {formError ? <p className={cx("rounded-lg px-3 py-2 text-sm", RH_ALERT_ERROR)}>{formError}</p> : null}



                    <div>

                        <label className={labelCls} htmlFor="staff-full-name">

                            Nom complet

                        </label>

                        <input

                            id="staff-full-name"

                            className={inputCls}

                            value={form.full_name}

                            onChange={(e) => handleFullNameChange(e.target.value)}

                            autoComplete="name"

                        />

                        {fieldErrors.full_name ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.full_name}</p> : null}

                    </div>



                    <div>

                        <label className={labelCls} htmlFor="staff-email">

                            Email

                        </label>

                        <input

                            id="staff-email"

                            type="email"

                            className={inputCls}

                            value={form.email}

                            onChange={(e) => {

                                setEmailManuallyEdited(true);

                                set("email", e.target.value);

                            }}

                            autoComplete="email"

                        />

                        {enterpriseDomain && !emailManuallyEdited ? (

                            <p className={cx("mt-0.5 text-[10px]", RH_TEXT_MUTED)}>Généré automatiquement — modifiable</p>

                        ) : null}

                        {fieldErrors.email ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.email}</p> : null}

                    </div>



                    <div>

                        <label className={labelCls} htmlFor="staff-password">

                            Mot de passe

                        </label>

                        <input

                            id="staff-password"

                            type="password"

                            className={inputCls}

                            value={form.password}

                            onChange={(e) => set("password", e.target.value)}

                            autoComplete="new-password"

                            minLength={8}

                        />

                        {fieldErrors.password ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.password}</p> : null}

                    </div>



                    <div>

                        <label className={labelCls} htmlFor="staff-role">

                            Rôle

                        </label>

                        <select

                            id="staff-role"

                            className={inputCls}

                            value={form.role}

                            onChange={(e) => set("role", e.target.value as RhStaffRole)}

                        >

                            <option value="manager">Manager</option>

                            <option value="rh">RH</option>

                        </select>

                    </div>



                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">

                        <button type="button" className={RH_BTN_SECONDARY} disabled={submitting} onClick={onClose}>

                            Annuler

                        </button>

                        <button type="submit" className={RH_BTN_PRIMARY} disabled={submitting}>

                            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Créer le compte"}

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

}


