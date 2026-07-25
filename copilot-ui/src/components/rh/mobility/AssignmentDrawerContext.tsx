/**
 * Contexte talent dans le drawer affectation RH (talent → manager).
 */
import { useMemo } from "react";
import { User } from "lucide-react";
import type { RhAssignmentRow } from "@/types/rh-assignments.types";
import type { RhTalentListItem } from "@/types/rh-talents.types";
import { resolveAssignmentManagerEmail, resolveAssignmentManagerName } from "@/lib/rh-assignments-display";
import { RH_CARD, RH_TEXT_MUTED, RH_TEXT_PRIMARY, RH_TEXT_SECONDARY } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type DrawerIntent = "create" | "edit" | "reassign";

export type AssignmentDrawerContextProps = {
    talentId: string | null;
    assignment?: RhAssignmentRow | null;
    talents: RhTalentListItem[];
};

export function AssignmentDrawerContext({ talentId, assignment, talents }: AssignmentDrawerContextProps) {
    const talent = useMemo(
        () => talents.find((t) => t.id === talentId) ?? null,
        [talents, talentId],
    );

    if (!talent && !assignment) return null;

    return (
        <div
            className={cx(
                RH_CARD,
                "flex items-start gap-3 border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50",
            )}
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-sm font-bold text-primary-800 dark:bg-primary-900/60 dark:text-primary-200">
                <User size={18} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
                <p className={cx("truncate text-sm font-bold", RH_TEXT_PRIMARY)}>
                    {talent?.name ?? assignment?.talent_name ?? "Talent non renseigné"}
                </p>
                <p className={cx("text-xs", RH_TEXT_SECONDARY)}>
                    {talent?.job_title ?? assignment?.job_title ?? "Poste non renseigné"}
                    {talent?.department ? ` · ${talent.department}` : ""}
                </p>
                {assignment ? (
                    <p className={cx("mt-1 text-xs", RH_TEXT_MUTED)}>
                        Manager actuel : {resolveAssignmentManagerName(assignment)} ·{" "}
                        {resolveAssignmentManagerEmail(assignment)}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
