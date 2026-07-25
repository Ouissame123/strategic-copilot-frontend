import { AlertTriangle, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import type { RhTalentAccount } from "@/types/rh-accounts.types";
import { EmptyState } from "@/components/ui/EmptyState";
import { isTalentActive } from "@/lib/rh-accounts-display";
import { cx } from "@/utils/cx";

type TalentsTableProps = {
    talents: RhTalentAccount[];
    isLoading: boolean;
    onRowClick: (talent: RhTalentAccount) => void;
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

export function TalentsTable({ talents, isLoading, onRowClick }: TalentsTableProps) {
    if (isLoading) return <TableSkeleton />;

    if (talents.length === 0) {
        return (
            <EmptyState size="md" className="py-10">
                <EmptyState.Content>
                    <EmptyState.Title>Aucun talent</EmptyState.Title>
                    <EmptyState.Description>Ajuste les filtres ou ajoute un nouveau talent.</EmptyState.Description>
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
                        <th className="px-4 py-2 text-left">Métier</th>
                        <th className="px-4 py-2 text-left">Séniorité</th>
                        <th className="px-4 py-2 text-left">Manager</th>
                        <th className="px-4 py-2 text-left">Accès portail</th>
                        <th className="px-4 py-2 text-left">Statut</th>
                        <th className="w-10 px-4 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {talents.map((t) => {
                        const active = isTalentActive(t.status);
                        const seniority = t.seniority_level ?? t.seniority;
                        return (
                            <tr
                                key={t.id}
                                onClick={() => onRowClick(t)}
                                className={cx(
                                    "h-14 cursor-pointer border-l-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                    active ? "border-l-emerald-500" : "border-l-slate-300 opacity-60",
                                )}
                            >
                                <td className="px-4">
                                    <p className="truncate font-medium">{t.name}</p>
                                    <p className="truncate text-xs text-slate-500">{t.email}</p>
                                </td>
                                <td className="truncate px-4 text-slate-700">{t.job_title}</td>
                                <td className="px-4">
                                    {seniority ? (
                                        <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                            {seniority}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">—</span>
                                    )}
                                </td>
                                <td className="truncate px-4">
                                    {t.has_manager ? (
                                        <span className="text-slate-700">{t.manager_name || "—"}</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-amber-700">
                                            <AlertTriangle size={12} aria-hidden /> Aucun
                                        </span>
                                    )}
                                </td>
                                <td className="px-4">
                                    {t.has_portal_access ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                            <CheckCircle2 size={12} aria-hidden />
                                            Portail actif
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                                            <Clock size={12} aria-hidden />
                                            Sans accès
                                        </span>
                                    )}
                                </td>
                                <td className="px-4">
                                    {active ? (
                                        <span className="text-emerald-700">✓ Actif</span>
                                    ) : (
                                        <span className="text-slate-500">✗ Inactif</span>
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
