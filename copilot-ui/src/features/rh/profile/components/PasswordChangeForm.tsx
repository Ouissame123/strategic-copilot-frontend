import { forwardRef, useId, useState, type FormEvent, type Ref } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import {
    RH_PROFILE_BTN_DISABLED,
    RH_PROFILE_CARD,
    RH_PROFILE_ICON_BOX,
    RH_PROFILE_INPUT,
    RH_PROFILE_LABEL,
} from "../profile-ui";
import { WS_BTN_PRIMARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type PasswordChangeFormProps = {
    nextPassword: string;
    confirmPassword: string;
    onNextPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onSubmit: (e: FormEvent) => void;
    canSubmit: boolean;
    saving: boolean;
    showRequiredBadge?: boolean;
    newPasswordInputRef?: Ref<HTMLInputElement>;
};

function PasswordField({
    id,
    label,
    value,
    onChange,
    autoComplete,
    inputRef,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete: string;
    inputRef?: Ref<HTMLInputElement>;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="grid gap-1.5">
            <label htmlFor={id} className={RH_PROFILE_LABEL}>
                {label}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    id={id}
                    type={visible ? "text" : "password"}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={cx(RH_PROFILE_INPUT, "pr-11")}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    aria-pressed={visible}
                    className={cx(
                        "absolute inset-y-0 right-0 flex items-center px-3 text-slate-500",
                        "rounded-r-xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40",
                        "hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                    )}
                >
                    {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
            </div>
        </div>
    );
}

function RuleItem({ ok, children }: { ok: boolean; children: string }) {
    return (
        <li
            className={cx(
                "flex items-center gap-2 text-xs transition-colors duration-200",
                ok ? "font-medium text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400",
            )}
        >
            <span
                className={cx(
                    "flex size-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                    ok
                        ? "bg-emerald-500 text-white"
                        : "border border-slate-300 bg-transparent dark:border-slate-600",
                )}
                aria-hidden
            >
                {ok ? <Check className="size-2.5" strokeWidth={3} /> : null}
            </span>
            {children}
        </li>
    );
}

export const PasswordChangeForm = forwardRef<HTMLElement, PasswordChangeFormProps>(
    function PasswordChangeForm(
        {
            nextPassword,
            confirmPassword,
            onNextPasswordChange,
            onConfirmPasswordChange,
            onSubmit,
            canSubmit,
            saving,
            showRequiredBadge = false,
            newPasswordInputRef,
        },
        ref,
    ) {
        const baseId = useId();
        const hasMinLength = nextPassword.length >= 8;
        const passwordsMatch = nextPassword.length > 0 && nextPassword === confirmPassword;

        return (
            <section ref={ref} id="rh-password-section" className={cx(RH_PROFILE_CARD, "p-6")}>
                <header className="mb-5 flex items-start gap-3">
                    <span className={RH_PROFILE_ICON_BOX}>
                        <KeyRound className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                                Changer le mot de passe
                            </h3>
                            {showRequiredBadge ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                                    Requis
                                </span>
                            ) : null}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Minimum 8 caractères. Reconnexion requise après mise à jour.
                        </p>
                    </div>
                </header>

                <form className="space-y-4" onSubmit={onSubmit}>
                    <PasswordField
                        id={`${baseId}-next`}
                        label="Nouveau mot de passe"
                        value={nextPassword}
                        onChange={onNextPasswordChange}
                        autoComplete="new-password"
                        inputRef={newPasswordInputRef}
                    />

                    {nextPassword.length > 0 ? <PasswordStrengthMeter password={nextPassword} /> : null}

                    <PasswordField
                        id={`${baseId}-confirm`}
                        label="Confirmation"
                        value={confirmPassword}
                        onChange={onConfirmPasswordChange}
                        autoComplete="new-password"
                    />

                    <ul className="space-y-1.5" aria-label="Règles du mot de passe">
                        <RuleItem ok={hasMinLength}>8 caractères minimum</RuleItem>
                        <RuleItem ok={passwordsMatch}>Les mots de passe correspondent</RuleItem>
                    </ul>

                    <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className={cx(
                                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white",
                                RH_PROFILE_BTN_DISABLED,
                                canSubmit ? WS_BTN_PRIMARY : "bg-primary-600/80 dark:bg-primary-600/70",
                            )}
                        >
                            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                            {saving ? "Mise à jour…" : "Mettre à jour"}
                        </button>
                    </div>
                </form>
            </section>
        );
    },
);
