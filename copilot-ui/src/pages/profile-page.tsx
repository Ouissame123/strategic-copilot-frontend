import { useNavigate } from "react-router";
import { Button } from "@/components/base/buttons/button";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useAuth } from "@/providers/auth-provider";

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const email = user?.email ?? "";
    useCopilotPage("profile", "Profil", email || undefined, email || undefined);

    if (!user) return null;

    return (
        <div className="space-y-8">
            <header className="rounded-2xl border border-secondary bg-primary p-5 shadow-xs ring-1 ring-secondary/80 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-quaternary">Compte</p>
                        <h1 className="mt-1 text-display-xs font-semibold text-primary md:text-display-sm">Mon profil</h1>
                        <p className="mt-2 text-md text-tertiary">Informations synchronisées depuis le backend.</p>
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
                <h2 className="mt-1 text-lg font-semibold text-primary">Informations du compte connecté</h2>
                <dl className="mt-6 grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                    <div>
                        <dt className="text-sm font-medium text-tertiary">Nom complet</dt>
                        <dd className="mt-1 text-sm font-semibold text-secondary">{user.fullName || "-"}</dd>
                    </div>
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
        </div>
    );
}
