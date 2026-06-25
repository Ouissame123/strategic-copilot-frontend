import { cx } from "@/utils/cx";

type ScoreDonutProps = {
    value: number;
    max?: number;
    size?: number;
    thickness?: number;
    className?: string;
    /** Libellé accessible pour lecteurs d'écran */
    ariaLabel?: string;
};

function strokeColor(pct: number): string {
    if (pct >= 75) return "stroke-emerald-500";
    if (pct >= 50) return "stroke-amber-500";
    if (pct >= 30) return "stroke-orange-500";
    return "stroke-red-500";
}

export function ScoreDonut({
    value,
    max = 10,
    size = 100,
    thickness = 10,
    className,
    ariaLabel,
}: ScoreDonutProps) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;

    return (
        <div
            className={cx("relative", className)}
            style={{ width: size, height: size }}
            role="img"
            aria-label={ariaLabel ?? `Score ${value.toFixed(1)} sur ${max}`}
        >
            <svg width={size} height={size} className="-rotate-90" aria-hidden>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    strokeWidth={thickness}
                    className="stroke-secondary/40"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    strokeWidth={thickness}
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={cx(strokeColor(pct), "transition-all duration-700")}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
                <span className="text-2xl font-bold tabular-nums text-primary">{value.toFixed(1)}</span>
                <span className="text-xs text-tertiary">/{max}</span>
            </div>
        </div>
    );
}
