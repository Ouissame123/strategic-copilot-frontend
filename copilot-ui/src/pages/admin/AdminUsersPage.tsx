import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { RhAccountsPageContent } from "@/components/rh/accounts/page/RhAccountsPageContent";

export default function AdminUsersPage() {
    const navigate = useNavigate();

    return (
        <div className="mx-auto max-w-7xl p-6">
            <header className="mb-4 space-y-1">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-secondary transition hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                        aria-label="Retour à la page précédente"
                    >
                        <ArrowLeft size={18} aria-hidden />
                    </button>
                    <h1 className="text-xl font-semibold text-primary">Comptes utilisateurs</h1>
                </div>
                <p className="text-sm text-tertiary pl-10">
                    Gestion enterprise des comptes managers, RH et talents — WF_RH_Accounts_CRUD_v1.
                </p>
            </header>
            <RhAccountsPageContent embedded />
        </div>
    );
}
