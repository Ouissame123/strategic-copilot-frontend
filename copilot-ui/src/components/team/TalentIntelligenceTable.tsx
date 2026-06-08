import { formatTalentDate, talentInitials } from "@/components/talent/talent-detail-shared";
import { AllocationBar } from "@/components/team/AllocationBar";
import { IpiVisualBadge } from "@/components/team/IpiVisualBadge";
import { TalentRiskBadge } from "@/components/team/TalentRiskBadge";
import type { TeamSortKey } from "@/components/team/team-list-utils";
import {
    displayProjectName,
    displayProjectStatus,
    displayRole,
    talentActionId,
} from "@/components/team/team-list-utils";
import type { TalentListItem } from "@/types/api.types";
import { cx } from "@/utils/cx";

const TH_CELL =
    "bg-slate-50 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-800/80 dark:text-slate-400";
const TD_CELL = "overflow-hidden px-3 py-4";

const COL_WIDTHS = {
    talent: "22%",
    project: "16%",
    status: "8%",
    charge: "14%",
    ipi: "10%",
    contract: "10%",
    risk: "8%",
    actions: "12%",
} as const;

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
    align = "left",
}: {
    label: string;
    active: boolean;
    dir: "asc" | "desc";
    onClick: () => void;
    align?: "left" | "center" | "right";
}) {
    return (
        <th className={cx(TH_CELL, align === "center" && "text-center", align === "right" && "text-right")}>
            <button
                type="button"
                onClick={onClick}
                className={cx(
                    "group inline-flex w-full min-w-0 items-center gap-1 truncate transition hover:text-slate-600 dark:hover:text-slate-200",
                    align === "center" && "justify-center",
                    align === "right" && "justify-end",
                )}
            >
                <span className="truncate">{label}</span>
                <span className={cx("shrink-0 font-mono text-[10px]", active ? "text-indigo-600 dark:text-indigo-400" : "opacity-0 group-hover:opacity-60")}>
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
        <section className="hidden w-full lg:block">
            <div className="w-full rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <table className="w-full table-fixed text-sm">
                    <colgroup>
                        <col style={{ width: COL_WIDTHS.talent }} />
                        <col style={{ width: COL_WIDTHS.project }} />
                        <col style={{ width: COL_WIDTHS.status }} />
                        <col style={{ width: COL_WIDTHS.charge }} />
                        <col style={{ width: COL_WIDTHS.ipi }} />
                        <col style={{ width: COL_WIDTHS.contract }} />
                        <col style={{ width: COL_WIDTHS.risk }} />
                        <col style={{ width: COL_WIDTHS.actions }} />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-white shadow-sm dark:bg-slate-900">
                        <tr>
                            <SortableTh label="Talent" active={sort.key === "name"} dir={sort.dir} onClick={() => onSort("name")} />
                            <th className={cx(TH_CELL, "text-left")}>
                                <span className="block truncate">Projet principal</span>
                            </th>
                            <SortableTh
                                label="Statut"
                                active={sort.key === "status"}
                                dir={sort.dir}
                                onClick={() => onSort("status")}
                                align="center"
                            />
                            <SortableTh label="Charge" active={sort.key === "allocation"} dir={sort.dir} onClick={() => onSort("allocation")} />
                            <SortableTh label="IPI" active={sort.key === "ipi"} dir={sort.dir} onClick={() => onSort("ipi")} />
                            <SortableTh label="Contrat" active={sort.key === "contract"} dir={sort.dir} onClick={() => onSort("contract")} />
                            <SortableTh label="Risque" active={sort.key === "risk"} dir={sort.dir} onClick={() => onSort("risk")} />
                            <th className={cx(TH_CELL, "text-right")}>
                                <span className="block truncate text-right">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((talent) => {
                            const actionId = talentActionId(talent);
                            const projectLabel = displayProjectName(talent) ?? "Aucun projet actif";
                            const roleLabel = displayRole(talent);
                            const st = projectStatusBadge(displayProjectStatus(talent));
                            const alloc = Number(talent.total_allocation_pct ?? 0);
                            const contractLabel = talent.contract_end_date
                                ? formatTalentDate(talent.contract_end_date) || "Non défini"
                                : "Non défini";
                            const contractFull =
                                talent.contract_ending_soon && contractLabel !== "Non défini"
                                    ? `${contractLabel} · <90j`
                                    : contractLabel;

                            return (
                                <tr
                                    key={talent.talent_id ?? talent.id ?? talent.full_name}
                                    className={cx(
                                        "h-16 border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40",
                                        actionId && "cursor-pointer",
                                    )}
                                    onClick={() => {
                                        if (actionId) onOpenDrawer(actionId);
                                    }}
                                >
                                    <td className={TD_CELL}>
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white ring-2 ring-white dark:ring-slate-900"
                                                aria-hidden
                                            >
                                                {talentInitials(talent.full_name)}
                                            </span>
                                            <div className="min-w-0 flex-1 overflow-hidden text-left">
                                                <button
                                                    type="button"
                                                    disabled={!actionId}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (actionId) onOpenDrawer(actionId);
                                                    }}
                                                    className="block w-full truncate text-left font-medium text-slate-800 hover:text-indigo-700 disabled:cursor-default disabled:opacity-60 dark:text-slate-100 dark:hover:text-indigo-300"
                                                    title={talent.full_name}
                                                >
                                                    {talent.full_name}
                                                </button>
                                                <p className="truncate text-xs text-slate-400" title={talent.email ?? undefined}>
                                                    {talent.email ?? "—"}
                                                </p>
                                                <p className="truncate text-xs text-slate-300 dark:text-slate-500" title={roleLabel}>
                                                    {roleLabel}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={TD_CELL}>
                                        <p className="truncate font-medium text-slate-800 dark:text-slate-200" title={projectLabel}>
                                            {projectLabel}
                                        </p>
                                    </td>
                                    <td className={cx(TD_CELL, "text-center")}>
                                        <span
                                            className={cx(
                                                "inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                                st.className,
                                            )}
                                            title={st.label}
                                        >
                                            {st.label}
                                        </span>
                                    </td>
                                    <td className={TD_CELL}>
                                        <div className="min-w-0 overflow-hidden">
                                            <AllocationBar pct={alloc} />
                                        </div>
                                    </td>
                                    <td className={TD_CELL}>
                                        <div className="min-w-0 overflow-hidden">
                                            <IpiVisualBadge score={talent.insights?.ipi_score} />
                                        </div>
                                    </td>
                                    <td className={cx(TD_CELL, "text-xs tabular-nums text-slate-700 dark:text-slate-300")}>
                                        <p className="truncate" title={contractFull}>
                                            {contractLabel}
                                            {talent.contract_ending_soon ? (
                                                <span className="text-amber-600 dark:text-amber-400"> · &lt;90j</span>
                                            ) : null}
                                        </p>
                                    </td>
                                    <td className={TD_CELL}>
                                        <div className="min-w-0 overflow-hidden">
                                            <TalentRiskBadge talent={talent} />
                                        </div>
                                    </td>
                                    <td className={cx(TD_CELL, "text-right")}>
                                        <div className="flex min-w-0 items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                disabled={!actionId}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (actionId) onGoDetail(actionId);
                                                }}
                                                className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-950/60"
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
                                                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
                                <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
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
