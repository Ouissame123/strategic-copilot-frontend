import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Loader2, UserPlus, X } from "lucide-react";

import {
    fetchRhExistingTalentsForAccounts,
    mapRhAccountsApiError,
    mapRhTalentAccountToExistingListItem,
} from "@/api/rh-accounts.api";

import { ApiError } from "@/api/errors";

import { useAuth } from "@/hooks/useAuth";

import { generateEmailFromFullName, generateEnterpriseEmail, getEnterpriseDomainFromEmail } from "@/utils/accounts-email-utils";

import type {

    CreateRhStaffAccountBody,

    CreateRhTalentAccountBody,

    RhExistingTalentListItem,

    RhStaffAccount,

    RhTalentAccount,

    RhTalentContractType,

    RhTalentSeniority,

} from "@/types/rh-accounts.types";

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



type FormState = {

    name: string;

    email: string;

    job_title: string;

    department: string;

    seniority: RhTalentSeniority | "";

    contract_type: RhTalentContractType | "";

    manager_user_id: string;

    phone: string;

};



type CreateMode = "new" | "existing";



const EMPTY: FormState = {

    name: "",

    email: "",

    job_title: "",

    department: "",

    seniority: "",

    contract_type: "",

    manager_user_id: "",

    phone: "",

};



const EXISTING_EMAIL_DOMAIN = "entreprise.com";



function isValidEmail(email: string): boolean {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

}



type CreateTalentAccountModalProps = {

    open: boolean;

    submitting?: boolean;

    managers: RhStaffAccount[];

    registeredEmails?: string[];

    pageTalents?: RhTalentAccount[];

    onClose: () => void;

    onSubmitNew: (body: CreateRhTalentAccountBody) => Promise<void>;

    onSubmitExisting: (body: CreateRhStaffAccountBody) => Promise<void>;

};



export function CreateTalentAccountModal({

    open,

    submitting = false,

    managers,

    registeredEmails = [],

    pageTalents = [],

    onClose,

    onSubmitNew,

    onSubmitExisting,

}: CreateTalentAccountModalProps) {

    const { user } = useAuth();

    const enterpriseDomain = useMemo(() => getEnterpriseDomainFromEmail(user?.email ?? ""), [user?.email]);



    const [mode, setMode] = useState<CreateMode>("new");

    const [form, setForm] = useState<FormState>({ ...EMPTY });

    const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [formError, setFormError] = useState<string | null>(null);

    const [existingTalents, setExistingTalents] = useState<RhExistingTalentListItem[]>([]);

    const [existingLoading, setExistingLoading] = useState(false);

    const [selectedExistingId, setSelectedExistingId] = useState("");

    const [existingEmail, setExistingEmail] = useState("");

    const [password, setPassword] = useState("");

    const [confirmPassword, setConfirmPassword] = useState("");



    const selectedTalent = useMemo(

        () => existingTalents.find((t) => t.talent_id === selectedExistingId) ?? null,

        [existingTalents, selectedExistingId],

    );



    const reset = useCallback(() => {

        setMode("new");

        setForm({ ...EMPTY });

        setEmailManuallyEdited(false);

        setFieldErrors({});

        setFormError(null);

        setSelectedExistingId("");

        setExistingEmail("");

        setPassword("");

        setConfirmPassword("");

    }, []);



    useEffect(() => {

        if (!open) reset();

    }, [open, reset]);



    useEffect(() => {

        if (!open || mode !== "existing") return;

        if (pageTalents.length > 0) {

            setExistingTalents(pageTalents.map(mapRhTalentAccountToExistingListItem));

        }

        const c = new AbortController();

        setExistingLoading(true);

        void fetchRhExistingTalentsForAccounts({ signal: c.signal })

            .then((talents) => {

                if (talents.length > 0) setExistingTalents(talents);

            })

            .catch((err) => {

                console.error("Erreur chargement talents:", err);

            })

            .finally(() => setExistingLoading(false));

        return () => c.abort();

    }, [open, mode, pageTalents]);



    if (!open) return null;



    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {

        setForm((f) => ({ ...f, [key]: value }));

        setFieldErrors((e) => {

            const next = { ...e };

            delete next[key];

            return next;

        });

        setFormError(null);

    };



    const applyEmailFromName = (name: string, keepManual = emailManuallyEdited) => {

        if (!keepManual && enterpriseDomain) {

            const generated = generateEnterpriseEmail(name, enterpriseDomain);

            if (generated) set("email", generated);

        }

    };



    const handleNameChange = (value: string) => {

        set("name", value);

        applyEmailFromName(value);

    };



    const handleSelectExisting = (talentId: string) => {

        setSelectedExistingId(talentId);

        const talent = existingTalents.find((t) => t.talent_id === talentId);

        if (!talent) {

            setExistingEmail("");

            return;

        }

        setExistingEmail(generateEmailFromFullName(talent.name, EXISTING_EMAIL_DOMAIN));

        setPassword("");

        setConfirmPassword("");

        setFieldErrors({});

        setFormError(null);

    };



    const validate = (): boolean => {

        const errors: Record<string, string> = {};

        if (mode === "existing") {

            if (!selectedExistingId) errors.existing = "Sélectionnez un talent existant.";

            if (!existingEmail.trim()) errors.email = "L'email est obligatoire.";

            else if (!isValidEmail(existingEmail)) errors.email = "Adresse email invalide.";

            if (!password) errors.password = "Le mot de passe est obligatoire.";

            else if (password.length < 8) errors.password = "Minimum 8 caractères.";

            if (!confirmPassword) errors.confirm = "La confirmation est obligatoire.";

            else if (password !== confirmPassword) errors.confirm = "Les mots de passe ne correspondent pas.";

        } else {

            if (!form.name.trim()) errors.name = "Le nom est obligatoire.";

            if (!form.email.trim()) errors.email = "L'email est obligatoire.";

            else if (!isValidEmail(form.email)) errors.email = "Adresse email invalide.";

            if (!form.job_title.trim()) errors.job_title = "Le poste est obligatoire.";

        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;

    };



    const buildNewBody = (): CreateRhTalentAccountBody => {

        const body: CreateRhTalentAccountBody = {

            name: form.name.trim(),

            email: form.email.trim(),

            job_title: form.job_title.trim(),

        };

        if (form.department.trim()) body.department = form.department.trim();

        if (form.seniority) body.seniority = form.seniority;

        if (form.contract_type) body.contract_type = form.contract_type;

        if (form.manager_user_id.trim()) body.manager_user_id = form.manager_user_id.trim();

        if (form.phone.trim()) body.phone = form.phone.trim();

        return body;

    };



    const handleSubmit = async (e: FormEvent) => {

        e.preventDefault();

        if (!validate()) return;

        setFormError(null);

        try {

            if (mode === "existing") {

                if (!selectedTalent) return;

                await onSubmitExisting({

                    full_name: selectedTalent.name.trim(),

                    email: existingEmail.trim(),

                    password,

                    role: "manager",

                });

            } else {

                await onSubmitNew(buildNewBody());

            }

            reset();

            onClose();

        } catch (err) {

            const ctx = mode === "existing" ? "create-staff" : "create-talent";

            setFormError(mapRhAccountsApiError(err, ctx));

        }

    };



    const inputCls = cx("w-full px-2.5 py-1.5 text-sm", RH_INPUT);

    const labelCls = cx("mb-0.5 block text-[11px] font-medium", RH_TEXT_MUTED);

    const modeTabCls = (active: boolean) =>

        cx(

            "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition",

            active

                ? "bg-primary-600 text-white shadow-sm"

                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",

        );



    return (

        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">

            <button type="button" className={cx("absolute inset-0", RH_MODAL_OVERLAY)} aria-label="Fermer" disabled={submitting} onClick={onClose} />

            <div role="dialog" aria-modal="true" className={cx("relative w-full max-w-lg overflow-hidden", RH_MODAL_PANEL)}>

                <div className={cx("flex items-center justify-between px-5 py-4", WS_MODAL_HEADER)}>

                    <div className="flex items-center gap-3">

                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">

                            <UserPlus size={20} aria-hidden />

                        </span>

                        <h2 className={cx("text-lg font-semibold", RH_TEXT_PRIMARY)}>Nouveau compte talent</h2>

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



                <form onSubmit={handleSubmit} className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto px-5 py-4">

                    {formError ? <p className={cx("rounded-lg px-3 py-2 text-sm", RH_ALERT_ERROR)}>{formError}</p> : null}



                    <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/60">

                        <button

                            type="button"

                            className={modeTabCls(mode === "new")}

                            onClick={() => {

                                setMode("new");

                                setFieldErrors({});

                                setFormError(null);

                            }}

                        >

                            Nouveau compte

                        </button>

                        <button

                            type="button"

                            className={modeTabCls(mode === "existing")}

                            onClick={() => {

                                setMode("existing");

                                setFieldErrors({});

                                setFormError(null);

                            }}

                        >

                            Talent existant

                        </button>

                    </div>



                    {mode === "existing" ? (

                        <div className="space-y-3">

                            <div>

                                <label className={labelCls} htmlFor="existing-talent-select">

                                    Sélectionner un talent *

                                </label>

                                <select

                                    id="existing-talent-select"

                                    className={inputCls}

                                    value={selectedExistingId}

                                    disabled={existingLoading}

                                    onChange={(e) => handleSelectExisting(e.target.value)}

                                >

                                    <option value="">{existingLoading ? "Chargement…" : "— Choisir un talent —"}</option>

                                    {existingTalents.map((t) => (

                                        <option key={t.talent_id} value={t.talent_id}>

                                            {t.name}

                                        </option>

                                    ))}

                                </select>

                                {fieldErrors.existing ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.existing}</p> : null}

                                {!existingLoading && existingTalents.length === 0 ? (

                                    <p className={cx("mt-1 text-[10px]", RH_TEXT_MUTED)}>Aucun talent disponible sans compte.</p>

                                ) : null}

                            </div>



                            <div>

                                <label className={labelCls} htmlFor="existing-talent-email">

                                    Email *

                                </label>

                                <input

                                    id="existing-talent-email"

                                    type="email"

                                    className={inputCls}

                                    value={existingEmail}

                                    onChange={(e) => {

                                        setExistingEmail(e.target.value);

                                        setFieldErrors((prev) => {

                                            const next = { ...prev };

                                            delete next.email;

                                            return next;

                                        });

                                    }}

                                />

                                <p className={cx("mt-0.5 text-[10px]", RH_TEXT_MUTED)}>Généré automatiquement — modifiable</p>

                                {fieldErrors.email ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.email}</p> : null}

                            </div>



                            <div>

                                <label className={labelCls} htmlFor="existing-talent-password">

                                    Mot de passe *

                                </label>

                                <input

                                    id="existing-talent-password"

                                    type="password"

                                    className={inputCls}

                                    value={password}

                                    minLength={8}

                                    autoComplete="new-password"

                                    onChange={(e) => {

                                        setPassword(e.target.value);

                                        setFieldErrors((prev) => {

                                            const next = { ...prev };

                                            delete next.password;

                                            return next;

                                        });

                                    }}

                                />

                                {fieldErrors.password ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.password}</p> : null}

                            </div>



                            <div>

                                <label className={labelCls} htmlFor="existing-talent-confirm">

                                    Confirmation mot de passe *

                                </label>

                                <input

                                    id="existing-talent-confirm"

                                    type="password"

                                    className={inputCls}

                                    value={confirmPassword}

                                    minLength={8}

                                    autoComplete="new-password"

                                    onChange={(e) => {

                                        setConfirmPassword(e.target.value);

                                        setFieldErrors((prev) => {

                                            const next = { ...prev };

                                            delete next.confirm;

                                            return next;

                                        });

                                    }}

                                />

                                {fieldErrors.confirm ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.confirm}</p> : null}

                            </div>

                        </div>

                    ) : (

                        <div className="grid gap-3 sm:grid-cols-2">

                            <div className="sm:col-span-2">

                                <label className={labelCls} htmlFor="talent-name">

                                    Nom *

                                </label>

                                <input id="talent-name" className={inputCls} value={form.name} onChange={(e) => handleNameChange(e.target.value)} />

                                {fieldErrors.name ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.name}</p> : null}

                            </div>

                            <div>

                                <label className={labelCls} htmlFor="talent-email">

                                    Email *

                                </label>

                                <input

                                    id="talent-email"

                                    type="email"

                                    className={inputCls}

                                    value={form.email}

                                    onChange={(e) => {

                                        setEmailManuallyEdited(true);

                                        set("email", e.target.value);

                                    }}

                                />

                                {enterpriseDomain && !emailManuallyEdited ? (

                                    <p className={cx("mt-0.5 text-[10px]", RH_TEXT_MUTED)}>Généré automatiquement — modifiable</p>

                                ) : null}

                                {fieldErrors.email ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.email}</p> : null}

                            </div>

                            <div>

                                <label className={labelCls} htmlFor="talent-job">

                                    Poste *

                                </label>

                                <input id="talent-job" className={inputCls} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />

                                {fieldErrors.job_title ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.job_title}</p> : null}

                            </div>

                            <div>

                                <label className={labelCls} htmlFor="talent-dept">

                                    Département

                                </label>

                                <input id="talent-dept" className={inputCls} value={form.department} onChange={(e) => set("department", e.target.value)} />

                            </div>

                            <div>

                                <label className={labelCls} htmlFor="talent-seniority">

                                    Ancienneté

                                </label>

                                <select

                                    id="talent-seniority"

                                    className={inputCls}

                                    value={form.seniority}

                                    onChange={(e) => set("seniority", e.target.value as RhTalentSeniority | "")}

                                >

                                    <option value="">—</option>

                                    <option value="junior">Junior</option>

                                    <option value="mid">Mid</option>

                                    <option value="senior">Senior</option>

                                </select>

                            </div>

                            <div>

                                <label className={labelCls} htmlFor="talent-contract">

                                    Type de contrat

                                </label>

                                <select

                                    id="talent-contract"

                                    className={inputCls}

                                    value={form.contract_type}

                                    onChange={(e) => set("contract_type", e.target.value as RhTalentContractType | "")}

                                >

                                    <option value="">—</option>

                                    <option value="CDI">CDI</option>

                                    <option value="CDD">CDD</option>

                                    <option value="Freelance">Freelance</option>

                                </select>

                            </div>

                            <div>

                                <label className={labelCls} htmlFor="talent-manager">

                                    Manager

                                </label>

                                <select

                                    id="talent-manager"

                                    className={inputCls}

                                    value={form.manager_user_id}

                                    onChange={(e) => set("manager_user_id", e.target.value)}

                                >

                                    <option value="">—</option>

                                    {managers.map((m) => (

                                        <option key={m.id} value={m.id}>

                                            {m.full_name || m.email}

                                        </option>

                                    ))}

                                </select>

                            </div>

                            <div>

                                <label className={labelCls} htmlFor="talent-phone">

                                    Téléphone

                                </label>

                                <input id="talent-phone" className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} />

                            </div>

                        </div>

                    )}



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


