import { CheckCircle, ChevronRight, XCircle } from "lucide-react";
import type { RhStaffAccount } from "@/types/rh-accounts.types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROLE_BADGE, isUserActive } from "@/lib/rh-accounts-display";
import { formatDateRelative } from "@/utils/format";
import { cx } from "@/utils/cx";
import type { RhAccountsDensity } from "./use-rh-accounts-density";

type UsersTableProps = {
    users: RhStaffAccount[];
    isLoading: boolean;
    density: RhAccountsDensity;
    onRowClick: (user: RhStaffAccount) => void;
};

function TableSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
            ))}
        </div>
    );
}

export function UsersTable({ users, isLoading, density, onRowClick }: UsersTableProps) {
    const isCompact = density === "compact";

    if (isLoading) return <TableSkeleton />;

    if (users.length === 0) {
        return (
            <EmptyState size="md" className="py-10">
                <EmptyState.Content>
                    <EmptyState.Title>Aucun utilisateur</EmptyState.Title>
                    <EmptyState.Description>Ajuste les filtres ou ajoute un nouveau compte.</EmptyState.Description>
                </EmptyState.Content>
            </EmptyState>
        );
    }

    return (
        <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500 dark:bg-slate-900">
                    <tr>
                        <th className="px-4 py-2 text-left">Nom</th>
                        <th className="px-4 py-2 text-left">Email</th>
                        <th className="px-4 py-2 text-left">Rôle</th>
                        <th className="px-4 py-2 text-left">Statut</th>
                        <th className="w-10 px-4 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => {
                        const active = isUserActive(u.status);
                        const badge = ROLE_BADGE[u.role];
                        return (
                            <tr
                                key={u.id}
                                onClick={() => onRowClick(u)}
                                className={cx(
                                    "cursor-pointer border-l-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                    active ? "border-l-emerald-500" : "border-l-slate-300 opacity-60",
                                    isCompact ? "h-10" : "h-14",
                                )}
                            >
                                <td className="px-4">
                                    <p className="truncate font-medium">{u.full_name}</p>
                                    {!isCompact && u.role === "manager" ? (
                                        <p className="text-xs text-slate-500">
                                            {u.managed_talents_count} talent{u.managed_talents_count > 1 ? "s" : ""}{" "}
                                            managé{u.managed_talents_count > 1 ? "s" : ""}
                                            {u.updated_at ? ` · MAJ ${formatDateRelative(u.updated_at)}` : null}
                                        </p>
                                    ) : null}
                                </td>
                                <td className="truncate px-4 text-slate-700">{u.email}</td>
                                <td className="px-4">
                                    <span
                                        className={cx(
                                            "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                            badge.className,
                                        )}
                                    >
                                        {badge.label}
                                    </span>
                                </td>
                                <td className="px-4">
                                    {active ? (
                                        <span className="flex items-center gap-1 text-emerald-700">
                                            <CheckCircle size={12} aria-hidden /> Actif
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-slate-500">
                                            <XCircle size={12} aria-hidden /> Désactivé
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 text-center">
                                    <ChevronRight size={14} className="mx-auto text-slate-400" aria-hidden />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
