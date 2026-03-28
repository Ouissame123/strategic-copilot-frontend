import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { useAuth } from "@/providers/auth-provider";
import { cx } from "@/utils/cx";

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

    if (isAuthenticated) {
        navigate(from, { replace: true });
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email.trim() || !password) {
            setError("Veuillez renseigner l'e-mail et le mot de passe.");
            return;
        }
        const success = login(email.trim());
        if (!success) {
            setError("Aucun compte associé à cette adresse. Créez un compte ou vérifiez votre e-mail.");
            return;
        }
        navigate(from, { replace: true });
    };

    return (
        <AuthCardLayout
            title="Connexion"
            subtitle="Connectez-vous à Strategic Copilot pour accéder à votre espace."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Adresse e-mail"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={setEmail}
                    isRequired
                    autoComplete="email"
                />
                <Input
                    label="Mot de passe"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                    isRequired
                    autoComplete="current-password"
                />
                {error && (
                    <p className="text-sm font-medium text-error-primary" role="alert">
                        {error}
                    </p>
                )}
                <Button type="submit" color="primary" size="md" className="w-full">
                    Se connecter
                </Button>
                <div className="flex flex-col gap-2 pt-2 text-center">
                    <Link
                        to="/forgot-password"
                        className={cx(
                            "text-sm font-semibold text-tertiary hover:text-tertiary_hover",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded",
                        )}
                    >
                        Mot de passe oublié ?
                    </Link>
                    <span className="text-sm text-tertiary">
                        Pas encore de compte ?{" "}
                        <Link
                            to="/register"
                            className={cx(
                                "font-semibold text-brand-secondary hover:text-brand-secondary_hover",
                                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded",
                            )}
                        >
                            Créer un compte
                        </Link>
                    </span>
                </div>
            </form>
        </AuthCardLayout>
    );
}
