import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useAuth } from "@/providers/auth-provider";
import { getDisplayName } from "@/utils/profile-storage";
import { Badge } from "@/components/base/badges/badges";

export default function AccountSettingsPage() {
    const navigate = useNavigate();
    const { user, registeredUsers } = useAuth();

    useCopilotPage("account-settings", "Paramètres du compte", user?.email, user?.email);

    useEffect(() => {
        if (!user) return;
        if (user.role !== "admin") {
            navigate("/", { replace: true });
        }
    }, [user, navigate]);

    if (!user) return null;
    if (user.role !== "admin") return null;

    return (
        <div className="space-y-6">
            <header className="rounded-xl border border-secondary bg-primary p-5 md:p-6">
                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">Paramètres du compte</h1>
                <p className="mt-2 text-md text-tertiary">
                    En tant qu'administrateur, vous pouvez consulter la liste des comptes inscrits sur la plateforme.
                </p>
            </header>

            <section className="rounded-xl border border-secondary bg-primary p-5 md:p-6">
                <h2 className="text-lg font-semibold text-primary">Comptes inscrits</h2>
                <p className="mt-1 text-sm text-tertiary">{registeredUsers.length} compte(s) au total.</p>
                <ul className="mt-6 divide-y divide-secondary">
                    {registeredUsers.map((u) => (
                        <li key={u.email} className="flex flex-wrap items-center justify-between gap-2 py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-secondary">
                                    {getDisplayName(u.email) || u.email}
                                </span>
                                <span className="text-sm text-tertiary">{u.email}</span>
                            </div>
                            <Badge size="sm" type="pill-color" color={u.role === "admin" ? "brand" : "gray"}>
                                {u.role === "admin" ? "Admin" : "Utilisateur"}
                            </Badge>
                        </li>
                    ))}
                </ul>
                {registeredUsers.length === 0 && (
                    <p className="mt-4 text-sm text-tertiary">Aucun compte inscrit pour le moment.</p>
                )}
            </section>
        </div>
    );
}
