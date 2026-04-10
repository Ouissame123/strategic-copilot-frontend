import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { useAuth } from "@/providers/auth-provider";
import { ApiError } from "@/utils/apiClient";
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

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email.trim() || !password) {
            setError("Veuillez renseigner l'e-mail et le mot de passe.");
            return;
        }
        setLoading(true);
        try {
            await login(email.trim(), password);
            navigate(from, { replace: true });
        } catch (err) {
            if (err instanceof ApiError && err.payload && typeof err.payload === "object" && "message" in err.payload) {
                setError(String((err.payload as { message: unknown }).message));
            } else {
                setError("Connexion impossible. Verifiez vos identifiants.");
            }
        } finally {
            setLoading(false);
        }
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
                <Button type="submit" color="primary" size="md" className="w-full" isLoading={loading}>
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
                </div>
            </form>
        </AuthCardLayout>
    );
}
