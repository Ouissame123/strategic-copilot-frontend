import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useAuth } from "@/providers/auth-provider";
import { getProfile, saveProfile, type StoredProfile } from "@/utils/profile-storage";

const emptyProfile = (email: string): StoredProfile => ({
    nom: "",
    prenom: "",
    adresse: "",
    email,
    dateNaissance: "",
});

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, removeCurrentUser } = useAuth();
    const [profile, setProfile] = useState<StoredProfile>(emptyProfile(""));
    const [isEditing, setIsEditing] = useState(false);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    const email = user?.email ?? "";
    useCopilotPage("profile", "Profil", email || undefined, email || undefined);

    useEffect(() => {
        if (!email) return;
        const stored = getProfile(email);
        setProfile(stored ?? emptyProfile(email));
    }, [email]);

    const handleChange = (field: keyof StoredProfile) => (value: string) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
        setSavedMessage(null);
    };

    const handleSave = () => {
        if (!email) return;
        saveProfile(email, profile);
        setIsEditing(false);
        setSavedMessage("Modifications enregistrées.");
        setTimeout(() => setSavedMessage(null), 3000);
    };

    const handleCancel = () => {
        const stored = getProfile(email);
        setProfile(stored ?? emptyProfile(email));
        setIsEditing(false);
        setSavedMessage(null);
    };

    const handleDeleteAccount = () => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
            removeCurrentUser();
            navigate("/login", { replace: true });
        }
    };

    const formatDateForDisplay = (dateStr: string) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            <header className="rounded-xl border border-secondary bg-primary p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">Mon profil</h1>
                        <p className="mt-2 text-md text-tertiary">Consultez et gérez vos informations personnelles.</p>
                    </div>
                    {!isEditing && (
                        <Button color="primary" size="sm" onClick={() => setIsEditing(true)}>
                            Modifier
                        </Button>
                    )}
                </div>
            </header>

            <section className="rounded-xl border border-secondary bg-primary p-5 md:p-6">
                <h2 className="text-lg font-semibold text-primary">Informations personnelles</h2>

                {isEditing ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSave();
                        }}
                        className="mt-6 grid gap-4 sm:grid-cols-1 md:grid-cols-2"
                    >
                        <div className="md:col-span-2 md:max-w-md">
                            <Input
                                label="Nom"
                                value={profile.nom}
                                onChange={(value) => handleChange("nom")(value)}
                                placeholder="Votre nom"
                            />
                        </div>
                        <div className="md:col-span-2 md:max-w-md">
                            <Input
                                label="Prénom"
                                value={profile.prenom}
                                onChange={(value) => handleChange("prenom")(value)}
                                placeholder="Votre prénom"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Input
                                label="Adresse"
                                value={profile.adresse}
                                onChange={(value) => handleChange("adresse")(value)}
                                placeholder="Adresse postale"
                            />
                        </div>
                        <div className="md:col-span-2 md:max-w-md">
                            <Input label="Adresse e-mail" type="email" value={profile.email} isDisabled placeholder="" />
                        </div>
                        <div className="md:col-span-2 md:max-w-md">
                            <Input
                                label="Date de naissance"
                                type="date"
                                value={profile.dateNaissance}
                                onChange={(value) => handleChange("dateNaissance")(value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 md:col-span-2">
                            <Button type="submit" color="primary" size="sm">
                                Enregistrer
                            </Button>
                            <Button type="button" color="secondary" size="sm" onClick={handleCancel}>
                                Annuler
                            </Button>
                        </div>
                    </form>
                ) : (
                    <dl className="mt-6 grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-tertiary">Nom</dt>
                            <dd className="mt-1 text-sm font-semibold text-secondary">{profile.nom || "-"}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-tertiary">Prénom</dt>
                            <dd className="mt-1 text-sm font-semibold text-secondary">{profile.prenom || "-"}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-tertiary">Adresse</dt>
                            <dd className="mt-1 text-sm font-semibold text-secondary">{profile.adresse || "-"}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-tertiary">Adresse e-mail</dt>
                            <dd className="mt-1 text-sm font-semibold text-secondary">{profile.email || "-"}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-tertiary">Date de naissance</dt>
                            <dd className="mt-1 text-sm font-semibold text-secondary">
                                {profile.dateNaissance ? formatDateForDisplay(profile.dateNaissance) : "-"}
                            </dd>
                        </div>
                    </dl>
                )}

                {savedMessage && (
                    <p className="mt-4 text-sm font-medium text-brand-primary" role="status">
                        {savedMessage}
                    </p>
                )}

                <div className="mt-8 border-t border-secondary pt-6">
                    <h3 className="text-sm font-semibold text-primary">Zone de danger</h3>
                    <p className="mt-1 text-sm text-tertiary">
                        La suppression du compte est définitive. Vous serez déconnecté et redirigé vers la page de connexion.
                    </p>
                    <Button color="primary-destructive" size="sm" className="mt-3" onClick={handleDeleteAccount}>
                        Supprimer mon compte
                    </Button>
                </div>
            </section>
        </div>
    );
}
