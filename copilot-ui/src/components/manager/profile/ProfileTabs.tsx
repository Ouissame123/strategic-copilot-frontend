import { Shield, User } from "lucide-react";
import { cx } from "@/utils/cx";
import type { ProfileTabId } from "./profile-shared";

const TABS: { id: ProfileTabId; label: string; icon: typeof User }[] = [
    { id: "account", label: "Compte", icon: User },
    { id: "security", label: "Sécurité", icon: Shield },
];

type ProfileTabsProps = {
    active: ProfileTabId;
    onChange: (id: ProfileTabId) => void;
};

export function ProfileTabs({ active, onChange }: ProfileTabsProps) {
    return (
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/60 bg-slate-50/80 p-1 dark:border-slate-800 dark:bg-slate-900/50">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={cx(
                            "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-white text-primary-700 shadow-sm dark:bg-slate-800 dark:text-primary-300"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                        )}
                    >
                        <Icon className="size-4" aria-hidden />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
