import { BarChart3, CheckCircle2, Clock, LogOut, ShieldAlert, Users } from "lucide-react";
import { AvatarUploader } from "./AvatarUploader";
import { StatPill } from "./StatPill";
import { MANAGER_ACTIVITY_STATS, PROFILE_CARD } from "./profile-shared";

type ProfileIdentityCardProps = {
    fullName: string;
    email: string;
    company: string;
    userId?: string;
    avatarUrl?: string;
    onChange?: (publicUrl: string) => void | Promise<void>;
    onLogout: () => void;
    logoutPending?: boolean;
};

export function ProfileIdentityCard({
    fullName,
    email,
    company,
    userId,
    avatarUrl,
    onChange,
    onLogout,
    logoutPending,
}: ProfileIdentityCardProps) {
    return (
        <aside className={PROFILE_CARD + " sticky top-6 rounded-3xl p-6 lg:top-8"}>
            <div className="flex flex-col items-center text-center">
                <AvatarUploader
                    userId={userId}
                    name={fullName}
                    email={email}
                    src={avatarUrl}
                    onChange={onChange}
                    sizeClass="size-24"
                />
                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{fullName}</h2>
                <p className="mt-1 text-sm font-medium text-primary-600 dark:text-primary-400">Manager</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{company}</p>
                <p className="mt-1 truncate max-w-full text-xs text-slate-400">{email}</p>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Mon activité</p>
                <div className="space-y-2">
                    <StatPill icon={BarChart3} label="Projets gérés" value={MANAGER_ACTIVITY_STATS.projectsManaged} />
                    <StatPill icon={Users} label="Talents dans mon équipe" value={MANAGER_ACTIVITY_STATS.teamTalents} />
                    <StatPill icon={CheckCircle2} label="Décisions ce mois" value={MANAGER_ACTIVITY_STATS.decisionsThisMonth} />
                    <StatPill icon={ShieldAlert} label="Alertes traitées" value={MANAGER_ACTIVITY_STATS.alertsHandled} />
                    <StatPill icon={Clock} label="Dernière connexion" value={MANAGER_ACTIVITY_STATS.lastLoginLabel} />
                </div>
            </div>

            <button
                type="button"
                disabled={logoutPending}
                onClick={onLogout}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
            >
                <LogOut className="size-4" aria-hidden />
                {logoutPending ? "Déconnexion…" : "Déconnexion"}
            </button>
        </aside>
    );
}
