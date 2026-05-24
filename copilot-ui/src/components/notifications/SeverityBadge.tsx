import { cx } from "@/utils/cx";
import type { AlertSeverity } from "./notification-alert-utils";
import { normalizeAlertSeverity } from "./notification-alert-utils";

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
    critical: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800",
    high: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/35 dark:text-orange-100 dark:border-orange-800",
    medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-800",
    low: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600",
    unknown: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
};

type SeverityBadgeProps = {
    severity: string;
    label: string;
    className?: string;
};

export function SeverityBadge({ severity, label, className }: SeverityBadgeProps) {
    const key = normalizeAlertSeverity(severity);
    return (
        <span
            className={cx(
                "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                SEVERITY_STYLES[key],
                className,
            )}
        >
            {label}
        </span>
    );
}
