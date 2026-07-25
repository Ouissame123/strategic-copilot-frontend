import { labelRhRequestStatus, rhRequestStatusToBucket, type RhRequestStatusBucket } from "@/utils/rh-requests-decision";
import { cx } from "@/utils/cx";

const BADGE_CLASS: Record<RhRequestStatusBucket, string> = {
    pending: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
    accepted: "bg-primary-50 text-primary-900 border-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:border-primary-800",
    in_progress: "bg-primary-50 text-primary-900 border-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:border-primary-800",
    done: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
    rejected: "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800",
    closed: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

type RequestStatusBadgeProps = {
    status: unknown;
    statusLabel?: unknown;
    size?: "xs" | "sm";
};

export function RequestStatusBadge({ status, statusLabel, size = "xs" }: RequestStatusBadgeProps) {
    const bucket = rhRequestStatusToBucket(status) ?? "pending";
    const label = labelRhRequestStatus(status, statusLabel);
    return (
        <span
            role="status"
            aria-label={`Statut : ${label}`}
            className={cx(
                "inline-flex items-center rounded border font-semibold uppercase tracking-wide",
                size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
                BADGE_CLASS[bucket],
            )}
        >
            {label}
        </span>
    );
}
