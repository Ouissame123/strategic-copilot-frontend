import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { useAuth } from "@/providers/auth-provider";
import { saveProfile } from "@/utils/profile-storage";
import { cx } from "@/utils/cx";

export default function RegisterPage() {
    const navigate = useNavigate();
    const { register, isAuthenticated } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [nom, setNom] = useState("");
    const [prenom, setPrenom] = useState("");
    const [adresse, setAdresse] = useState("");
    const [dateNaissance, setDateNaissance] = useState("");
    const [error, setError] = useState<string | null>(null);

    if (isAuthenticated) {
        navigate("/", { replace: true });
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password || !confirmPassword) {
            setError("Veuillez remplir tous les champs.");
            return;
        }
        if (!nom.trim() || !prenom.trim() || !adresse.trim() || !dateNaissance.trim()) {
            setError("Veuillez remplir toutes les informations personnelles (nom, prénom, adresse, date de naissance).");
            return;
        }
        if (password !== confirmPassword) {
            setError("Les deux mots de passe ne correspondent pas.");
            return;
        }
        if (password.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }
        register(trimmedEmail);
        saveProfile(trimmedEmail, {
            nom: nom.trim(),
            prenom: prenom.trim(),
            adresse: adresse.trim(),
            email: trimmedEmail,
            dateNaissance: dateNaissance.trim(),
        });
        navigate("/", { replace: true });
    };

    return (
        <AuthCardLayout title="Créer un compte" subtitle="Inscrivez-vous pour accéder à Strategic Copilot.">
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
                    autoComplete="new-password"
                />
                <Input
                    label="Confirmer le mot de passe"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    isRequired
                    autoComplete="new-password"
                />
                <Input
                    label="Nom"
                    placeholder="Votre nom"
                    value={nom}
                    onChange={setNom}
                    isRequired
                    autoComplete="family-name"
                />
                <Input
                    label="Prénom"
                    placeholder="Votre prénom"
                    value={prenom}
                    onChange={setPrenom}
                    isRequired
                    autoComplete="given-name"
                />
                <Input
                    label="Adresse"
                    placeholder="Adresse postale complète"
                    value={adresse}
                    onChange={setAdresse}
                    isRequired
                    autoComplete="street-address"
                />
                <Input
                    label="Date de naissance"
                    type="date"
                    value={dateNaissance}
                    onChange={setDateNaissance}
                    isRequired
                />
                {error && (
                    <p className="text-sm font-medium text-error-primary" role="alert">
                        {error}
                    </p>
                )}
                <Button type="submit" color="primary" size="md" className="w-full">
                    Créer le compte
                </Button>
                <p className="pt-2 text-center text-sm text-tertiary">
                    Déjà un compte ?{" "}
                    <Link
                        to="/login"
                        className={cx(
                            "font-semibold text-brand-secondary hover:text-brand-secondary_hover",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded",
                        )}
                    >
                        Se connecter
                    </Link>
                </p>
            </form>
        </AuthCardLayout>
    );
}
