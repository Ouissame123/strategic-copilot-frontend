import { Briefcase, UserPlus } from "lucide-react";
import { Button } from "@/components/base/buttons/button";

type AccountsTab = "users" | "talents";

type AccountsTabsBarProps = {
    tab: AccountsTab;
    onTabChange: (tab: AccountsTab) => void;
    usersTotal?: number;
    talentsTotal?: number;
};

export function AccountsTabsBar({ tab, onTabChange, usersTotal, talentsTotal }: AccountsTabsBarProps) {
    return (
        <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800">
            <button
                type="button"
                onClick={() => onTabChange("users")}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                    tab === "users"
                        ? "border-brand-secondary text-brand-secondary"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
            >
                Utilisateurs
                {typeof usersTotal === "number" ? (
                    <span className="ml-1.5 text-xs opacity-60">({usersTotal})</span>
                ) : null}
            </button>
            <button
                type="button"
                onClick={() => onTabChange("talents")}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                    tab === "talents"
                        ? "border-brand-secondary text-brand-secondary"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
            >
                Talents
                {typeof talentsTotal === "number" ? (
                    <span className="ml-1.5 text-xs opacity-60">({talentsTotal})</span>
                ) : null}
            </button>
        </div>
    );
}

type CreateAccountsButtonProps = {
    onCreateUser: () => void;
    onOnboardTalent: () => void;
};

export function CreateAccountsButton({ onCreateUser, onOnboardTalent }: CreateAccountsButtonProps) {
    return (
        <div className="flex flex-wrap gap-2">
            <Button type="button" color="secondary" size="sm" iconLeading={UserPlus} onClick={onCreateUser}>
                Nouveau manager/RH
            </Button>
            <Button type="button" color="primary" size="sm" iconLeading={Briefcase} onClick={onOnboardTalent}>
                Donner accès au portail talent
            </Button>
        </div>
    );
}
