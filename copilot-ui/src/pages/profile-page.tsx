import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { toUserMessage } from "@/hooks/crud/error-message";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import type { AuthUser } from "@/types/auth";

function splitFullName(fullName: string): { first: string; last: string } {
    const t = fullName.trim();
    if (!t) return { first: "", last: "" };
    const i = t.indexOf(" ");
    if (i === -1) return { first: t, last: "" };
    return { first: t.slice(0, i).trim(), last: t.slice(i + 1).trim() };
}

function initialNames(user: AuthUser): { first: string; last: string } {
    if (user.firstName != null || user.lastName != null) {
        return {
            first: user.firstName?.trim() ?? "",
            last: user.lastName?.trim() ?? "",
        };
    }
    return splitFullName(user.fullName ?? "");
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { t } = useTranslation("common");
    const { push } = useToast();
    const { user, logout, updateProfile, changePassword } = useAuth();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);

    const email = user?.email ?? "";
    useCopilotPage("none", "Profil", { entityLabel: email || undefined });

    useEffect(() => {
        if (!user) return;
        const { first, last } = initialNames(user);
        setFirstName(first);
        setLastName(last);
    }, [user]);

    const profileDirty = useMemo(() => {
        if (!user) return false;
        const { first, last } = initialNames(user);
        return firstName.trim() !== first || lastName.trim() !== last;
    }, [user, firstName, lastName]);

    if (!user) return null;

    const handleSaveProfile = async () => {
        if (!firstName.trim()) {
            push("Le prénom est requis.", "neutral");
            return;
        }
        setSavingProfile(true);
        try {
            await updateProfile({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
            });
            push("Profil mis à jour.", "success");
        } catch (e) {
            push(toUserMessage(e), "error");
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword) {
            push("Indiquez votre mot de passe actuel.", "neutral");
            return;
        }
        if (!newPassword || newPassword.length < 8) {
            push("Le nouveau mot de passe doit contenir au moins 8 caractères.", "neutral");
            return;
        }
        if (newPassword !== confirmPassword) {
            push("La confirmation ne correspond pas au nouveau mot de passe.", "neutral");
            return;
        }
        setSavingPassword(true);
        try {
            await changePassword({ currentPassword, newPassword });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            push("Mot de passe mis à jour.", "success");
        } catch (e) {
            push(toUserMessage(e), "error");
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="space-y-8">
            <header className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Compte</p>
                        <h1 className="mt-1 text-display-xs font-semibold text-primary md:text-display-sm">Mon profil</h1>
                        <p className="mt-2 text-md text-tertiary">
                            Enregistrez vos prénom et nom, et votre mot de passe : tout est envoyé au backend pour mise à jour en base.
                        </p>
                    </div>
                    <Button
                        color="secondary"
                        size="sm"
                        onClick={() => {
                            void logout().finally(() => navigate("/login", { replace: true }));
                        }}
                    >
                        Se déconnecter
                    </Button>
                </div>
            </header>

            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Identité</p>
                <h2 className="mt-1 text-lg font-semibold text-primary">Nom et prénom</h2>
                <p className="mt-1 text-sm text-tertiary">Ces champs sont envoyés au backend pour mettre à jour votre compte.</p>
                <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
                    <Input
                        label={t("form.firstName")}
                        value={firstName}
                        onChange={setFirstName}
                        autoComplete="given-name"
                        isRequired
                    />
                    <Input
                        label={t("form.lastName")}
                        value={lastName}
                        onChange={setLastName}
                        autoComplete="family-name"
                    />
                </div>
                <div className="mt-6 flex justify-end">
                    <Button color="primary" isLoading={savingProfile} isDisabled={!profileDirty} onClick={() => void handleSaveProfile()}>
                        Enregistrer le profil
                    </Button>
                </div>

                <dl className="mt-10 grid gap-4 border-t border-secondary pt-8 sm:grid-cols-1 md:grid-cols-2">
                    <div>
                        <dt className="text-sm font-medium text-tertiary">Adresse e-mail</dt>
                        <dd className="mt-1 text-sm font-semibold text-secondary">{user.email}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-tertiary">Rôle</dt>
                        <dd className="mt-1 text-sm font-semibold capitalize text-secondary">{user.role || "-"}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-tertiary">Statut</dt>
                        <dd className="mt-1 text-sm font-semibold capitalize text-secondary">{user.status}</dd>
                    </div>
                </dl>
            </section>

            <section className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Sécurité</p>
                <h2 className="mt-1 text-lg font-semibold text-primary">Mot de passe</h2>
                <p className="mt-1 text-sm text-tertiary">
                    Saisissez votre mot de passe actuel puis le nouveau. Après succès, la bannière « changement obligatoire » disparaît
                    si le compte est à jour côté serveur.
                </p>
                <div className="mt-6 grid max-w-xl gap-4">
                    <Input
                        label="Mot de passe actuel"
                        type="password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        autoComplete="current-password"
                    />
                    <Input
                        label="Nouveau mot de passe"
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                        autoComplete="new-password"
                    />
                    <Input
                        label="Confirmer le nouveau mot de passe"
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        autoComplete="new-password"
                    />
                </div>
                <div className="mt-6 flex justify-end">
                    <Button color="primary" isLoading={savingPassword} onClick={() => void handleChangePassword()}>
                        Changer le mot de passe
                    </Button>
                </div>
            </section>
        </div>
    );
}
