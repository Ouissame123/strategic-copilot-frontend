import { Clock } from "lucide-react";
import { cx } from "@/utils/cx";

type StaleBadgeProps = {
    days: number;
    className?: string;
};

export function StaleBadge({ days, className }: StaleBadgeProps) {
    return (
        <span
            className={cx(
                "inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
                className,
            )}
        >
            <Clock className="size-2.5" aria-hidden />
            Stale {days}j
        </span>
    );
}
