import { Trash2, UserCog, Users } from "lucide-react";
import type { RhAccountsTabId } from "@/types/rh-accounts.types";
import { cx } from "@/utils/cx";

const TABS: { id: RhAccountsTabId; label: string; icon: typeof Users }[] = [
    { id: "staff", label: "Managers / RH", icon: UserCog },
    { id: "talents", label: "Talents", icon: Users },
    { id: "deleted", label: "Comptes supprimés", icon: Trash2 },
];

type AccountsTabsProps = {
    active: RhAccountsTabId;
    counts: { staff: number; talents: number; deleted: number };
    onChange: (id: RhAccountsTabId) => void;
};

export function AccountsTabs({ active, counts, onChange }: AccountsTabsProps) {
    const countFor = (id: RhAccountsTabId) => {
        if (id === "staff") return counts.staff;
        if (id === "talents") return counts.talents;
        return counts.deleted;
    };

    return (
        <div
            className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/80 p-1 dark:border-slate-800 dark:bg-slate-900/80"
            role="tablist"
        >
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.id;
                const count = countFor(tab.id);
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(tab.id)}
                        className={cx(
                            "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"
                                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                        )}
                    >
                        <Icon className="size-4" aria-hidden />
                        <span>{tab.label}</span>
                        {!isActive && count > 0 ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {count}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
