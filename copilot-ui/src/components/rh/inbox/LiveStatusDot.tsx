import { formatRelativeTimeFr } from "@/lib/rh-request-display";
import { cx } from "@/utils/cx";

type LiveStatusDotProps = {
    lastUpdate?: Date | null;
    className?: string;
};

export function LiveStatusDot({ lastUpdate, className }: LiveStatusDotProps) {
    const label = lastUpdate ? formatRelativeTimeFr(lastUpdate.toISOString()) : "—";

    return (
        <div className={cx("flex items-center gap-1.5 text-xs text-ws-muted", className)}>
            <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative size-2 rounded-full bg-emerald-500" />
            </span>
            Live · maj {label}
        </div>
    );
}
