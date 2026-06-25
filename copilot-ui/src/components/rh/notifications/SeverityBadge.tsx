import { getSeverityConfig } from "@/lib/notification-mapping";
import type { NotificationSeverity } from "@/types/rh-notifications.types";
import { cx } from "@/utils/cx";

type SeverityBadgeProps = {
    severity: NotificationSeverity;
    size?: "sm" | "md";
    className?: string;
};

export function SeverityBadge({ severity, size = "md", className }: SeverityBadgeProps) {
    const cfg = getSeverityConfig(severity);
    return (
        <span
            className={cx(
                "inline-flex items-center gap-1 rounded border font-medium",
                size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
                cfg.badgeCls,
                className,
            )}
        >
            <span
                className={cx(
                    "size-1.5 shrink-0 rounded-full",
                    cfg.dotCls,
                    cfg.pulse && "animate-pulse",
                )}
                aria-hidden
            />
            {cfg.label}
        </span>
    );
}
