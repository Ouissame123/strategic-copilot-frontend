import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Loader2, X } from "lucide-react";
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

export type ChangePasswordTarget = {
    id: string;
    name: string;
    email: string;
};

type ChangePasswordModalProps = {
    open: boolean;
    target: ChangePasswordTarget | null;
    submitting?: boolean;
    onClose: () => void;
    onSubmit: (target: ChangePasswordTarget, newPassword: string) => Promise<void>;
};

export function ChangePasswordModal({ open, target, submitting = false, onClose, onSubmit }: ChangePasswordModalProps) {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setPassword("");
        setConfirm("");
        setFieldErrors({});
        setFormError(null);
    }, []);

    useEffect(() => {
        if (!open) reset();
    }, [open, reset]);

    if (!open || !target) return null;

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!password) errors.password = "Le mot de passe est obligatoire.";
        else if (password.length < 8) errors.password = "Minimum 8 caractères.";
        if (!confirm) errors.confirm = "La confirmation est obligatoire.";
        else if (password !== confirm) errors.confirm = "Les mots de passe ne correspondent pas.";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setFormError(null);
        try {
            await onSubmit(target, password);
            reset();
            onClose();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Impossible de mettre à jour le mot de passe.");
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
                        <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                            <KeyRound size={20} aria-hidden />
                        </span>
                        <div>
                            <h2 className={cx("text-lg font-semibold", RH_TEXT_PRIMARY)}>Changer mot de passe</h2>
                            <p className={cx("text-xs", RH_TEXT_MUTED)}>{target.name}</p>
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

                <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
                    {formError ? <p className={cx("rounded-lg px-3 py-2 text-sm", RH_ALERT_ERROR)}>{formError}</p> : null}

                    <div>
                        <label className={labelCls} htmlFor="new-password">
                            Nouveau mot de passe *
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            className={inputCls}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.password;
                                    return next;
                                });
                            }}
                            autoComplete="new-password"
                            minLength={8}
                        />
                        {fieldErrors.password ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.password}</p> : null}
                    </div>

                    <div>
                        <label className={labelCls} htmlFor="confirm-password">
                            Confirmation *
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            className={inputCls}
                            value={confirm}
                            onChange={(e) => {
                                setConfirm(e.target.value);
                                setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.confirm;
                                    return next;
                                });
                            }}
                            autoComplete="new-password"
                            minLength={8}
                        />
                        {fieldErrors.confirm ? <p className="mt-0.5 text-xs text-rose-600">{fieldErrors.confirm}</p> : null}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                        <button type="button" className={RH_BTN_SECONDARY} disabled={submitting} onClick={onClose}>
                            Annuler
                        </button>
                        <button type="submit" className={RH_BTN_PRIMARY} disabled={submitting}>
                            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Mettre à jour"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
