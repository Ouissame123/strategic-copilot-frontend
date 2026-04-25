import { ErrorState } from "@/components/ui/ErrorState";
import { useCopilotPage } from "@/hooks/use-copilot-page";
import { useTalentWorkspacePageQuery } from "@/hooks/use-talent-workspace-page-query";
import { useAuth } from "@/providers/auth-provider";
import { textOf } from "@/utils/talent-page-parsers";
import ProfilePage from "@/pages/profile-page";

export function TalentProfileWorkspacePage() {
    const { user } = useAuth();
    useCopilotPage("none", "Talent Profile");
    const q = useTalentWorkspacePageQuery("profile");

    if (q.isLoading) {
        return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />)}</div>;
    }
    if (q.error) {
        return <ErrorState title="Profil indisponible" message="Impossible de charger le profil talent." detail={q.error instanceof Error ? q.error.message : String(q.error)} onRetry={() => void q.refetch()} />;
    }

    const profile = q.data?.items?.[0] ?? q.data?.root ?? {};
    const fullName = textOf(profile, ["full_name", "name"], user?.fullName ?? "Talent");
    const role = textOf(profile, ["role", "job_title"], user?.role ?? "talent");
    const email = textOf(profile, ["email"], user?.email ?? "—");

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-2xl font-semibold text-primary">Mon profil</h1>
                <p className="mt-2 text-sm text-secondary">Informations personnelles et professionnelles.</p>
            </header>

            <section className="rounded-2xl bg-gradient-to-r from-[#7c6ef5] to-[#a855f7] p-5 text-white">
                <p className="text-2xl font-semibold">{fullName}</p>
                <p className="mt-1 text-sm text-white/85">{role}</p>
                <p className="mt-1 text-xs text-white/75">{email}</p>
            </section>

            <section className="grid gap-3 rounded-2xl border border-secondary bg-primary p-5 shadow-xs md:grid-cols-2">
                <div>
                    <p className="text-xs uppercase tracking-wide text-tertiary">Manager</p>
                    <p className="mt-1 text-sm font-medium text-primary">{textOf(profile, ["manager_name", "manager"], "—")}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-tertiary">Localisation</p>
                    <p className="mt-1 text-sm font-medium text-primary">{textOf(profile, ["location", "city", "country"], "—")}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-tertiary">Departement</p>
                    <p className="mt-1 text-sm font-medium text-primary">{textOf(profile, ["department"], "—")}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-tertiary">Anciennete</p>
                    <p className="mt-1 text-sm font-medium text-primary">{textOf(profile, ["tenure", "seniority"], "—")}</p>
                </div>
            </section>

            <section className="rounded-2xl border border-secondary bg-primary p-2 shadow-xs ring-1 ring-secondary/80 md:p-4">
                <h2 className="mb-3 px-2 text-sm font-semibold text-primary md:px-4">Compte & préférences</h2>
                <ProfilePage />
            </section>
        </div>
    );
}
