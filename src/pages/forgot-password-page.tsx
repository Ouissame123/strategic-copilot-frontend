import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { cx } from "@/utils/cx";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email.trim()) {
            setError("Veuillez renseigner votre adresse e-mail.");
            return;
        }
        setSent(true);
    };

    if (sent) {
        return (
            <AuthCardLayout
                title="Demande enregistrée"
                subtitle="Dans cette version de l'application (démo), aucun e-mail n'est réellement envoyé."
            >
                <div className="space-y-4">
                    <p className="text-sm text-tertiary">
                        La réinitialisation du mot de passe nécessite un serveur d'envoi d'e-mails, qui n'est pas configuré ici. Essayez de vous connecter avec votre mot de passe habituel, ou contactez l'administrateur pour réinitialiser votre accès.
                    </p>
                    <Button color="primary" size="md" className="w-full" href="/login">
                        Retour à la connexion
                    </Button>
                </div>
            </AuthCardLayout>
        );
    }

    return (
        <AuthCardLayout
            title="Mot de passe oublié"
            subtitle="En mode démo, aucun e-mail n'est envoyé. Indiquez votre adresse pour afficher les instructions."
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
                {error && (
                    <p className="text-sm font-medium text-error-primary" role="alert">
                        {error}
                    </p>
                )}
                <Button type="submit" color="primary" size="md" className="w-full">
                    Envoyer le lien de réinitialisation
                </Button>
                <p className="pt-2 text-center text-sm text-tertiary">
                    <Link
                        to="/login"
                        className={cx(
                            "font-semibold text-brand-secondary hover:text-brand-secondary_hover",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded",
                        )}
                    >
                        Retour à la connexion
                    </Link>
                </p>
            </form>
        </AuthCardLayout>
    );
}
