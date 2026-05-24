import { Users } from "lucide-react";
import { StaffingAssignmentRow } from "@/components/rh/mobility/StaffingAssignmentRow";
import { MOBILITY_BOARD_HEADER, MOBILITY_SURFACE } from "@/components/rh/mobility/mobility-board-theme";
import type { RhAssignmentRow } from "@/types/rh-assignments.types";
import { RH_BTN_PRIMARY, RH_TEXT_MUTED, RH_TEXT_PRIMARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type StaffingAllocationBoardProps = {
    rows: RhAssignmentRow[];
    onAssign: (row: RhAssignmentRow) => void;
    onReassign: (row: RhAssignmentRow) => void;
    onRemove: (row: RhAssignmentRow) => void;
    emptyMessage?: string;
    onCreate?: () => void;
};

export function StaffingAllocationBoard({
    rows,
    onAssign,
    onReassign,
    onRemove,
    emptyMessage,
    onCreate,
}: StaffingAllocationBoardProps) {
    if (rows.length === 0) {
        return (
            <div className={cx(MOBILITY_SURFACE, "flex flex-col items-center justify-center px-6 py-16 text-center")}>
                <Users className={cx("mb-3 size-10 text-slate-300 dark:text-slate-600")} aria-hidden />
                <p className={cx("text-sm font-medium", RH_TEXT_PRIMARY)}>{emptyMessage ?? "Aucune affectation"}</p>
                <p className={cx("mt-1 max-w-sm text-xs", RH_TEXT_MUTED)}>
                    Aucun talent listé — créez une affectation talent → manager.
                </p>
                {onCreate ? (
                    <button type="button" onClick={onCreate} className={cx("mt-4 px-4 py-2 text-sm font-semibold", RH_BTN_PRIMARY)}>
                        Nouvelle affectation
                    </button>
                ) : null}
            </div>
        );
    }

    return (
        <section className={cx(MOBILITY_SURFACE, "overflow-hidden")}>
            <div className={MOBILITY_BOARD_HEADER}>
                <span>Talent</span>
                <span>Poste</span>
                <span>Manager</span>
                <span>Email manager</span>
                <span>Statut</span>
                <span>Dernière modif.</span>
                <span className="text-right">Actions</span>
            </div>
            {rows.map((row) => (
                <StaffingAssignmentRow
                    key={row.talent_id ?? row.id}
                    row={row}
                    onAssign={() => onAssign(row)}
                    onReassign={() => onReassign(row)}
                    onRemove={() => onRemove(row)}
                />
            ))}
        </section>
    );
}
