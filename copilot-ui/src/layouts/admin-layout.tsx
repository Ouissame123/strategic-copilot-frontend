import { ArrowLeft, Activity, ShieldCheck, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useOrphanedAccounts } from "@/hooks/use-rh-accounts-audit";
import { useAuth } from "@/providers/auth-provider";
import { cx } from "@/utils/cx";

export default function AdminLayout() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: orphaned } = useOrphanedAccounts(200);
    const anomaliesCount = orphaned?.summary.total_orphaned ?? 0;

    const backHref =
        user?.role === "rh" ? "/workspace/rh/dashboard" : "/workspace/manager/dashboard";

    return (
        <div className="flex h-screen min-h-screen bg-slate-50 dark:bg-slate-950">
            <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <header className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={20} className="text-violet-600" aria-hidden />
                        <div>
                            <p className="text-sm font-semibold text-primary">Administration</p>
                            <p className="text-xs text-tertiary">Enterprise</p>
                        </div>
                    </div>
                </header>

                <nav className="flex-1 space-y-0.5 p-2">
                    <NavLink
                        to="/admin/users"
                        className={({ isActive }) =>
                            cx(
                                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                                isActive
                                    ? "bg-violet-50 font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                                    : "text-secondary hover:bg-slate-100 dark:hover:bg-slate-800",
                            )
                        }
                    >
                        <Users size={16} aria-hidden />
                        Comptes utilisateurs
                    </NavLink>
                    <NavLink
                        to={
                            anomaliesCount > 0
                                ? "/admin/accounts/health?tab=anomalies"
                                : "/admin/accounts/health"
                        }
                        className={({ isActive }) =>
                            cx(
                                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                                isActive
                                    ? "bg-violet-50 font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                                    : "text-secondary hover:bg-slate-100 dark:hover:bg-slate-800",
                            )
                        }
                    >
                        <Activity size={16} aria-hidden />
                        <span className="flex-1">Santé des comptes</span>
                        {anomaliesCount > 0 ? (
                            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                {anomaliesCount}
                            </span>
                        ) : null}
                    </NavLink>
                </nav>

                <footer className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => void navigate(backHref)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-secondary transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft size={14} aria-hidden />
                        Retour au workspace
                    </button>
                </footer>
            </aside>

            <main className="min-w-0 flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}
