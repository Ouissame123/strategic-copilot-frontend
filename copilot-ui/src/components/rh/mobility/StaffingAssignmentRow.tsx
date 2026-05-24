import { AssignmentStatusBadge } from "@/components/rh/mobility/AssignmentStatusBadge";
import { StaffingRowActionsMenu } from "@/components/rh/mobility/StaffingRowActionsMenu";
import { MOBILITY_ROW_GRID } from "@/components/rh/mobility/mobility-board-theme";
import {
    fmtAssignmentUpdatedAt,
    resolveAssignmentManagerEmail,
    resolveAssignmentManagerName,
    rowHasManager,
} from "@/lib/rh-assignments-display";
import type { RhAssignmentRow } from "@/types/rh-assignments.types";
import { RH_BTN_SECONDARY, RH_TEXT_MUTED, RH_TEXT_PRIMARY, RH_TEXT_SECONDARY, WS_TEXT_FAINT } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type StaffingAssignmentRowProps = {
    row: RhAssignmentRow;
    onAssign?: () => void;
    onReassign?: () => void;
    onRemove?: () => void;
};

export function StaffingAssignmentRow({ row, onAssign, onReassign, onRemove }: StaffingAssignmentRowProps) {
    const hasManager = rowHasManager(row);

    return (
        <article
            className={cx(
                "group border-b border-slate-100/90 px-4 py-3 transition last:border-0 dark:border-slate-800/80",
                "hover:bg-slate-50/50 dark:hover:bg-slate-800/20",
                !hasManager && "bg-orange-50/25 dark:bg-orange-950/10",
            )}
        >
            <div className={MOBILITY_ROW_GRID}>
                <div className="min-w-0">
                    <p className={cx("text-[10px] font-semibold uppercase tracking-wide lg:hidden", WS_TEXT_FAINT)}>
                        Talent
                    </p>
                    <p className={cx("truncate text-sm font-semibold", RH_TEXT_PRIMARY)}>
                        {row.talent_name?.trim() || "Talent non renseigné"}
                    </p>
                    {row.talent_email ? (
                        <p className={cx("mt-0.5 truncate text-xs", RH_TEXT_MUTED)}>{row.talent_email}</p>
                    ) : null}
                </div>

                <div className="min-w-0 lg:border-l lg:border-slate-100 lg:pl-3 dark:lg:border-slate-800">
                    <p className={cx("text-[10px] font-semibold uppercase tracking-wide lg:hidden", WS_TEXT_FAINT)}>
                        Poste
                    </p>
                    <p className={cx("truncate text-sm", RH_TEXT_SECONDARY)}>
                        {row.job_title?.trim() || "Poste non renseigné"}
                    </p>
                </div>

                <div className="min-w-0 lg:border-l lg:border-slate-100 lg:pl-3 dark:lg:border-slate-800">
                    <p className={cx("text-[10px] font-semibold uppercase tracking-wide lg:hidden", WS_TEXT_FAINT)}>
                        Manager
                    </p>
                    <p
                        className={cx(
                            "truncate text-sm font-medium",
                            hasManager ? "text-slate-800 dark:text-slate-100" : "text-orange-700 dark:text-orange-300",
                        )}
                    >
                        {resolveAssignmentManagerName(row)}
                    </p>
                </div>

                <div className="min-w-0 lg:border-l lg:border-slate-100 lg:pl-3 dark:lg:border-slate-800">
                    <p className={cx("text-[10px] font-semibold uppercase tracking-wide lg:hidden", WS_TEXT_FAINT)}>
                        Email manager
                    </p>
                    <p
                        className={cx(
                            "truncate text-sm",
                            hasManager ? RH_TEXT_MUTED : "text-orange-600/90 dark:text-orange-400/90",
                        )}
                    >
                        {resolveAssignmentManagerEmail(row)}
                    </p>
                </div>

                <div className="lg:border-l lg:border-slate-100 lg:pl-3 dark:lg:border-slate-800">
                    <p className={cx("text-[10px] font-semibold uppercase tracking-wide lg:hidden", WS_TEXT_FAINT)}>
                        Statut
                    </p>
                    <AssignmentStatusBadge row={row} />
                </div>

                <div className="min-w-0 lg:border-l lg:border-slate-100 lg:pl-3 dark:lg:border-slate-800">
                    <p className={cx("text-[10px] font-semibold uppercase tracking-wide lg:hidden", WS_TEXT_FAINT)}>
                        Modifié
                    </p>
                    <p className={cx("text-xs tabular-nums", RH_TEXT_MUTED)}>{fmtAssignmentUpdatedAt(row.updated_at)}</p>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-1 lg:pl-2">
                    {onAssign ? (
                        <button
                            type="button"
                            onClick={onAssign}
                            className={cx(
                                "rounded-md border px-2.5 py-1 text-[11px] font-medium transition",
                                hasManager ? RH_BTN_SECONDARY : "border-violet-200/80 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-200",
                            )}
                        >
                            {hasManager ? "Modifier" : "Affecter"}
                        </button>
                    ) : null}
                    <StaffingRowActionsMenu onReassign={onReassign} onRemove={hasManager ? onRemove : undefined} />
                </div>
            </div>
        </article>
    );
}
