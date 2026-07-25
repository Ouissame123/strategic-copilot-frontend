import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { useAuth } from "@/providers/auth-provider";
import { ApiError } from "@/utils/apiClient";
import { cx } from "@/utils/cx";
import { getDefaultWorkspacePath } from "@/utils/workspace-routes";

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated, user } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    /** Ne jamais appeler navigate() pendant le rendu — évite « fewer hooks than expected » et l’avertissement BrowserRouter. */
    useEffect(() => {
        if (!isAuthenticated) return;
        const target = getDefaultWorkspacePath(user?.role);
        navigate(target, { replace: true });
    }, [isAuthenticated, navigate, user?.role]);

    if (isAuthenticated) {
        return null;
    }

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
            // La navigation post-login est gérée par l’effet une fois `user` hydraté (JWT + rôle).
        } catch (err) {
            if (err instanceof ApiError) {
                const fromPayload =
                    err.payload && typeof err.payload === "object" && "message" in err.payload
                        ? String((err.payload as { message: unknown }).message)
                        : null;
                setError(
                    fromPayload ||
                        (err.status === 401 || err.status === 403
                            ? "E-mail ou mot de passe incorrect."
                            : err.status === 404
                              ? "404 : URL du webhook incorrecte ou workflow n8n inactif. Dans n8n, copiez l’URL de production du nœud Webhook (sans ajouter un segment /login si le nœud n’en définit pas). Lancez « npm run dev » depuis le dossier copilot-ui pour charger .env."
                              : err.status === 500
                                ? "Erreur 500 sur le login : en dev, le plus souvent le proxy Vite n’arrive pas à joindre n8n (regarde le terminal : « ENOTFOUND » ou « http proxy error » = mauvaise URL ou DNS dans copilot-ui/.env, VITE_N8N_BASE_URL / VITE_N8N_PROXY_TARGET). Sinon, le workflow n8n a renvoyé 500 (exécutions dans n8n). VITE_PROXY_DEBUG=1 affiche le détail des requêtes proxy."
                                : err.message),
                );
            } else if (err instanceof Error) {
                setError(
                    err.message.includes("Réponse de connexion invalide")
                        ? "Réponse serveur inattendue (token ou utilisateur manquant). Vérifiez le format JSON du POST /login."
                        : err.message,
                );
            } else {
                setError("Connexion impossible. Vérifiez vos identifiants et la configuration API.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthCardLayout
            title="Connexion"
            subtitle="Connectez-vous à Copilote Stratégique pour accéder à votre espace."
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
