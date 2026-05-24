import { useMemo } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { PROFILE_CARD, PROFILE_INPUT, PROFILE_LABEL, passwordStrengthUi } from "./profile-shared";
import { cx } from "@/utils/cx";

type PasswordForm = { current: string; next: string; confirm: string };

type ProfileTabSecurityProps = {
    password: PasswordForm;
    onPasswordChange: (pwd: PasswordForm) => void;
    onPasswordSubmit: () => void;
    passwordSaving?: boolean;
    canSubmitPassword: boolean;
    passwordMessage?: { type: "ok" | "err"; text: string } | null;
    mustChangePassword?: boolean;
    passwordExpiresInDays?: number | null;
};

export function ProfileTabSecurity({
    password,
    onPasswordChange,
    onPasswordSubmit,
    passwordSaving,
    canSubmitPassword,
    passwordMessage,
    sessions,
    onRevokeSession,
    mustChangePassword,
    passwordExpiresInDays,
}: ProfileTabSecurityProps) {
    const strength = useMemo(() => passwordStrengthUi(password.next), [password.next]);

    return (
        <div className="space-y-5">
            {mustChangePassword ? (
                <div
                    className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/25"
                    role="status"
                >
                    <KeyRound className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
                    <div>
                        <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Action requise</p>
                        <p className="mt-0.5 text-sm text-amber-900/90 dark:text-amber-100/90">
                            Définissez un nouveau mot de passe pour sécuriser votre compte.
                        </p>
                    </div>
                </div>
            ) : null}

            {passwordExpiresInDays != null && passwordExpiresInDays < 30 && passwordExpiresInDays >= 0 ? (
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-100">
                    Mot de passe : expire dans <strong>{passwordExpiresInDays}</strong> jour(s).
                </div>
            ) : null}

            <section className={PROFILE_CARD + " p-5 sm:p-6"}>
                <header className="mb-5 flex items-start gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                        <KeyRound className="size-5" aria-hidden />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Mot de passe</h2>
                        <p className="text-sm text-slate-500">Après changement, une reconnexion peut être demandée.</p>
                    </div>
                </header>

                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        onPasswordSubmit();
                    }}
                >
                    <label className="grid gap-1.5">
                        <span className={PROFILE_LABEL}>Mot de passe actuel</span>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={password.current}
                            onChange={(e) => onPasswordChange({ ...password, current: e.target.value })}
                            className={PROFILE_INPUT}
                        />
                    </label>
                    <label className="grid gap-1.5">
                        <span className={PROFILE_LABEL}>Nouveau mot de passe</span>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={password.next}
                            onChange={(e) => onPasswordChange({ ...password, next: e.target.value })}
                            className={PROFILE_INPUT}
                        />
                        {password.next ? (
                            <div className="mt-1">
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div
                                        className={cx("h-full rounded-full transition-all", strength.barClass)}
                                        style={{ width: `${strength.score}%` }}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    Robustesse : <span className="font-medium text-slate-700 dark:text-slate-300">{strength.label}</span>
                                </p>
                            </div>
                        ) : null}
                    </label>
                    <label className="grid gap-1.5">
                        <span className={PROFILE_LABEL}>Confirmer le mot de passe</span>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={password.confirm}
                            onChange={(e) => onPasswordChange({ ...password, confirm: e.target.value })}
                            className={PROFILE_INPUT}
                        />
                    </label>

                    {passwordMessage ? (
                        <p
                            className={cx(
                                "rounded-lg px-3 py-2 text-sm",
                                passwordMessage.type === "ok"
                                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                                    : "bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200",
                            )}
                        >
                            {passwordMessage.text}
                        </p>
                    ) : null}

                    <button
                        type="submit"
                        disabled={!canSubmitPassword || passwordSaving}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {passwordSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                        Mettre à jour le mot de passe
                    </button>
                </form>
            </section>
        </div>
    );
}
