import { assignmentStatusBadgeClass, rowHasManager } from "@/lib/rh-assignments-display";
import type { RhAssignmentRow } from "@/types/rh-assignments.types";
import { cx } from "@/utils/cx";

/** Badge statut affectation talent → manager (vert / orange). */
export function AssignmentStatusBadge({ row }: { row: RhAssignmentRow }) {
    const assigned = rowHasManager(row);
    return (
        <span
            className={cx(
                "inline-flex rounded-md px-1.5 py-px text-[10px] font-medium",
                assignmentStatusBadgeClass(row),
            )}
        >
            {assigned ? "Affecté" : "Sans manager"}
        </span>
    );
}
