import { User, Users } from "lucide-react";
import type { RhStaffAccountsSummary, RhTalentAccountsSummary } from "@/types/rh-accounts.types";
import { cx } from "@/utils/cx";

type AccountsHeaderProps = {
    usersSummary?: RhStaffAccountsSummary;
    talentsSummary?: RhTalentAccountsSummary;
    embedded?: boolean;
};

export function AccountsHeader({
    usersSummary,
    talentsSummary,
    embedded = false,
}: AccountsHeaderProps) {
    return (
        <header className={cx("space-y-1.5", !embedded && "border-b border-slate-100 pb-3 dark:border-slate-800")}>
            {!embedded ? (
                <h1 className="text-xl font-semibold text-primary">Gestion des comptes</h1>
            ) : null}

            {usersSummary || talentsSummary ? (
                <div className="flex flex-wrap items-center gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                    {usersSummary ? (
                        <span className="flex flex-wrap items-center gap-1.5 text-slate-700 dark:text-slate-200">
                            <User size={14} aria-hidden />
                            <strong>{usersSummary.total}</strong> utilisateur{usersSummary.total > 1 ? "s" : ""}
                            <span className="text-xs text-slate-500">
                                ({usersSummary.managers} manager{usersSummary.managers > 1 ? "s" : ""}, {usersSummary.rh}{" "}
                                RH
                                {(usersSummary.admins ?? 0) > 0
                                    ? `, ${usersSummary.admins} admin${(usersSummary.admins ?? 0) > 1 ? "s" : ""}`
                                    : ""}
                                )
                            </span>
                        </span>
                    ) : null}
                    {talentsSummary ? (
                        <span className="flex flex-wrap items-center gap-1.5 text-slate-700 dark:text-slate-200">
                            <Users size={14} aria-hidden />
                            <strong>{talentsSummary.total}</strong> talent{talentsSummary.total > 1 ? "s" : ""}
                            {talentsSummary.without_manager > 0 ? (
                                <span className="text-xs text-amber-700">
                                    · {talentsSummary.without_manager} sans manager
                                </span>
                            ) : null}
                        </span>
                    ) : null}
                </div>
            ) : null}
        </header>
    );
}
