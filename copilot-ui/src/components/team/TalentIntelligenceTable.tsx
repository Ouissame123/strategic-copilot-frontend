import { TALENT_CARD, TALENT_LABEL, formatTalentDate, talentInitials } from "@/components/talent/talent-detail-shared";
import { AllocationBar } from "@/components/team/AllocationBar";
import { IpiVisualBadge } from "@/components/team/IpiVisualBadge";
import { TalentRiskBadge } from "@/components/team/TalentRiskBadge";
import type { TeamSortKey } from "@/components/team/team-list-utils";
import {
    displayProjectName,
    displayProjectStatus,
    displayRole,
    talentActionId,
    truncateEmail,
} from "@/components/team/team-list-utils";
import type { TalentListItem } from "@/types/api.types";

function projectStatusBadge(status: string | null | undefined): { label: string; className: string } {
    const s = (status ?? "").toLowerCase().trim();
    if (!s) return { label: "—", className: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400" };
    if (s === "active")
        return { label: "Actif", className: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" };
    if (s === "on_hold")
        return { label: "En pause", className: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" };
    if (s === "cancelled")
        return { label: "Annulé", className: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200" };
    if (s === "planned")
        return { label: "Planifié", className: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200" };
    if (s === "completed")
        return { label: "Terminé", className: "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200" };
    return { label: status, className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300" };
}

function SortableTh({
    label,
    active,
    dir,
    onClick,
}: {
    label: string;
    active: boolean;
    dir: "asc" | "desc";
    onClick: () => void;
}) {
    return (
        <th className="px-4 py-3 text-left">
            <button
                type="button"
                onClick={onClick}
                className={`${TALENT_LABEL} group inline-flex items-center gap-1 rounded-md transition hover:text-slate-700 dark:hover:text-slate-200`}
            >
                {label}
                <span className={`font-mono text-[10px] ${active ? "text-indigo-600 dark:text-indigo-400" : "opacity-0 group-hover:opacity-60"}`}>
                    {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
                </span>
            </button>
        </th>
    );
}

export interface TalentIntelligenceTableProps {
    rows: TalentListItem[];
    sort: { key: TeamSortKey; dir: "asc" | "desc" };
    onSort: (key: TeamSortKey) => void;
    onOpenDrawer: (talentId: string) => void;
    onGoDetail: (talentId: string) => void;
    onGoWatchdog: (talentId: string) => void;
    isLoading?: boolean;
}

export function TalentIntelligenceTable({
    rows,
    sort,
    onSort,
    onOpenDrawer,
    onGoDetail,
    onGoWatchdog,
    isLoading,
}: TalentIntelligenceTableProps) {
    return (
        <section className={`hidden overflow-hidden lg:block ${TALENT_CARD}`}>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50">
                        <tr>
                            <SortableTh label="Talent" active={sort.key === "name"} dir={sort.dir} onClick={() => onSort("name")} />
                            <th className={`px-4 py-3 text-left ${TALENT_LABEL}`}>Projet principal</th>
                            <SortableTh label="Statut" active={sort.key === "status"} dir={sort.dir} onClick={() => onSort("status")} />
                            <SortableTh label="Charge" active={sort.key === "allocation"} dir={sort.dir} onClick={() => onSort("allocation")} />
                            <SortableTh label="IPI" active={sort.key === "ipi"} dir={sort.dir} onClick={() => onSort("ipi")} />
                            <SortableTh label="Contrat" active={sort.key === "contract"} dir={sort.dir} onClick={() => onSort("contract")} />
                            <SortableTh label="Risque" active={sort.key === "risk"} dir={sort.dir} onClick={() => onSort("risk")} />
                            <th className={`px-4 py-3 text-right ${TALENT_LABEL}`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((talent) => {
                            const actionId = talentActionId(talent);
                            const projectLabel = displayProjectName(talent) ?? "Aucun projet actif";
                            const st = projectStatusBadge(displayProjectStatus(talent));
                            const alloc = Number(talent.total_allocation_pct ?? 0);
                            const contractLabel = talent.contract_end_date
                                ? formatTalentDate(talent.contract_end_date) || "Non défini"
                                : "Non défini";

                            return (
                                <tr
                                    key={talent.talent_id ?? talent.id ?? talent.full_name}
                                    className={`border-t border-slate-100 transition dark:border-slate-800 ${
                                        actionId ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60" : ""
                                    }`}
                                    onClick={() => {
                                        if (actionId) onOpenDrawer(actionId);
                                    }}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white ring-2 ring-white dark:ring-slate-900"
                                                aria-hidden
                                            >
                                                {talentInitials(talent.full_name)}
                                            </span>
                                            <div className="min-w-0 text-left">
                                                <button
                                                    type="button"
                                                    disabled={!actionId}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (actionId) onOpenDrawer(actionId);
                                                    }}
                                                    className="truncate font-semibold text-slate-900 hover:text-indigo-700 disabled:cursor-default disabled:opacity-60 dark:text-slate-100 dark:hover:text-indigo-300"
                                                >
                                                    {talent.full_name}
                                                </button>
                                                <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={talent.email}>
                                                    {talent.email ? truncateEmail(talent.email) : "—"}
                                                </p>
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500">{displayRole(talent)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="max-w-[12rem] px-4 py-3">
                                        <p className="truncate font-medium text-slate-800 dark:text-slate-200" title={projectLabel}>
                                            {projectLabel}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.className}`}>
                                            {st.label}
                                        </span>
                                    </td>
                                    <td className="min-w-[8rem] px-4 py-3">
                                        <AllocationBar pct={alloc} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <IpiVisualBadge score={talent.insights?.ipi_score} />
                                    </td>
                                    <td className="px-4 py-3 text-xs tabular-nums text-slate-700 dark:text-slate-300">
                                        {contractLabel}
                                        {talent.contract_ending_soon ? (
                                            <span className="ml-1 text-amber-600 dark:text-amber-400">· &lt;90j</span>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-3">
                                        <TalentRiskBadge talent={talent} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                disabled={!actionId}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (actionId) onGoDetail(actionId);
                                                }}
                                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-950/60"
                                            >
                                                Détail
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!actionId}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (actionId) onGoWatchdog(actionId);
                                                }}
                                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                            >
                                                Watchdog
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {!isLoading && rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                    Aucun talent trouvé avec ces filtres.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
