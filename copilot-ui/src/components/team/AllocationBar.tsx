import { clampAllocation } from "@/components/team/team-list-utils";

export interface AllocationBarProps {
    pct: number;
    className?: string;
    showLabel?: boolean;
}

export function AllocationBar({ pct, className = "", showLabel = true }: AllocationBarProps) {
    const value = clampAllocation(pct);
    const width = Math.min(100, value);
    const tone =
        value >= 160 ? "#f43f5e" : value >= 100 ? "#f59e0b" : value >= 80 ? "#6366f1" : "#10b981";
    const textTone =
        value >= 160
            ? "text-rose-600 dark:text-rose-400"
            : value >= 100
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-700 dark:text-slate-300";

    return (
        <div className={`flex min-w-[5rem] items-center gap-2 ${className}`}>
            <svg viewBox="0 0 100 8" className="h-2 flex-1" role="img" aria-label={`Charge ${value}%`}>
                <rect x="0" y="0" width="100" height="8" rx="4" className="fill-slate-200 dark:fill-slate-700" />
                <rect x="0" y="0" width={width} height="8" rx="4" fill={tone} />
            </svg>
            {showLabel ? <span className={`w-10 shrink-0 text-right text-xs font-bold tabular-nums ${textTone}`}>{value}%</span> : null}
        </div>
    );
}
