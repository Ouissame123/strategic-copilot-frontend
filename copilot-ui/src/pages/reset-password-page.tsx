import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { useResetPassword } from "@/hooks/useResetPassword";
import { cx } from "@/utils/cx";

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const mutation = useResetPassword();

    const passwordError = useMemo(() => {
        if (!password) return null;
        if (password.length < 8) return "Au moins 8 caractères";
        if (!/[A-Z]/.test(password)) return "Au moins une majuscule";
        if (!/[a-z]/.test(password)) return "Au moins une minuscule";
        if (!/[0-9]/.test(password)) return "Au moins un chiffre";
        return null;
    }, [password]);

    const mismatchError = useMemo(() => {
        if (!confirm) return null;
        return password !== confirm ? "Les mots de passe ne correspondent pas" : null;
    }, [password, confirm]);

    const canSubmit = Boolean(password && confirm && !passwordError && !mismatchError && !mutation.isPending);

    if (!token) {
        return <Navigate to="/forgot-password" replace />;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        mutation.mutate({ token, new_password: password });
    };

    return (
        <AuthCardLayout
            title="Nouveau mot de passe"
            subtitle="Définissez un nouveau mot de passe pour votre compte."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="reset-password" className="text-sm font-medium text-primary">
                        Nouveau mot de passe *
                    </label>
                    <div className="relative">
                        <input
                            id="reset-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={mutation.isPending}
                            autoComplete="new-password"
                            className={cx(
                                "w-full rounded-lg border border-secondary bg-primary py-2.5 pr-10 pl-3 text-sm text-primary shadow-xs outline-hidden",
                                "focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60",
                            )}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-tertiary hover:text-primary"
                            tabIndex={-1}
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                            {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                        </button>
                    </div>
                    {passwordError ? (
                        <p className="text-xs text-error-primary">{passwordError}</p>
                    ) : password ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Mot de passe valide</p>
                    ) : null}
                </div>

                <div className="space-y-1.5">
                    <Input
                        label="Confirmer le mot de passe"
                        type={showPassword ? "text" : "password"}
                        value={confirm}
                        onChange={setConfirm}
                        isRequired
                        autoComplete="new-password"
                        isDisabled={mutation.isPending}
                    />
                    {mismatchError ? <p className="text-xs text-error-primary">{mismatchError}</p> : null}
                </div>

                <Button
                    type="submit"
                    color="primary"
                    size="md"
                    className="w-full"
                    isLoading={mutation.isPending}
                    isDisabled={!canSubmit}
                >
                    {mutation.isPending ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
                </Button>
            </form>

            <p className="pt-4 text-center text-sm text-tertiary">
                <Link
                    to="/login"
                    className={cx(
                        "font-semibold text-brand-secondary hover:text-brand-secondary_hover",
                        "rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                    )}
                >
                    Retour à la connexion
                </Link>
            </p>
        </AuthCardLayout>
    );
}
