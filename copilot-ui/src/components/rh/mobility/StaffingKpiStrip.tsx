import { UserMinus } from "lucide-react";
import { MOBILITY_SURFACE } from "@/components/rh/mobility/mobility-board-theme";
import { RH_TEXT_MUTED, RH_TEXT_PRIMARY, WS_TEXT_FAINT } from "@/utils/rh-workspace-theme";
import { cx } from "@/utils/cx";

export type StaffingKpiStripProps = {
    total: number;
    withManager: number;
    withoutManager: number;
    loading?: boolean;
    /** Filtre one-click vers les talents sans manager. */
    onViewUnassigned?: () => void;
};

export function StaffingKpiStrip({
    total,
    withManager,
    withoutManager,
    loading,
    onViewUnassigned,
}: StaffingKpiStripProps) {
    if (loading) {
        return (
            <div className={cx(MOBILITY_SURFACE, "flex h-[72px] animate-pulse items-center gap-4 px-4")}>
                <div className="h-10 flex-1 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
        );
    }

    const hasUnassigned = withoutManager > 0;

    return (
        <div
            className={cx(
                MOBILITY_SURFACE,
                "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
                hasUnassigned && "border-amber-200/80 dark:border-amber-900/50",
            )}
        >
            <div className="flex min-w-0 items-start gap-3">
                <span
                    className={cx(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        hasUnassigned
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                    )}
                >
                    <UserMinus size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                    <p className={cx("text-[11px] font-medium uppercase tracking-wide", WS_TEXT_FAINT)}>
                        Sans manager
                    </p>
                    <p
                        className={cx(
                            "text-2xl font-semibold tabular-nums tracking-tight",
                            hasUnassigned
                                ? "text-amber-700 dark:text-amber-300"
                                : RH_TEXT_PRIMARY,
                        )}
                    >
                        {withoutManager}
                    </p>
                    <p className={cx("mt-0.5 text-xs", RH_TEXT_MUTED)}>
                        {withManager} affecté{withManager > 1 ? "s" : ""} · {total} talent
                        {total > 1 ? "s" : ""} au total
                    </p>
                </div>
            </div>

            {onViewUnassigned && hasUnassigned ? (
                <button
                    type="button"
                    onClick={onViewUnassigned}
                    className={cx(
                        "shrink-0 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition",
                        "hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60",
                    )}
                >
                    Voir les non affectés
                </button>
            ) : null}
        </div>
    );
}
