import { cx } from "@/utils/cx";
import { formatScoreAria, scoreToneClass, scoreTextClass } from "@/lib/manager-decision-log-inbox";

type MiniScoreGaugeProps = {
    score: number;
    className?: string;
    showValue?: boolean;
};

/** Mini-jauge horizontale — vert ≥7, ambre 4–7, rouge <4. */
export function MiniScoreGauge({ score, className, showValue = true }: MiniScoreGaugeProps) {
    const n = Number(score);
    const safe = Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0;
    const pct = (safe / 10) * 100;
    const display = Number.isFinite(n) ? n.toFixed(2) : "—";

    return (
        <span className={cx("inline-flex items-center gap-1.5", className)}>
            <span
                className="relative inline-block h-1.5 w-10 overflow-hidden rounded-full bg-secondary_subtle"
                role="img"
                aria-label={formatScoreAria(safe)}
            >
                <span
                    className={cx("absolute inset-y-0 left-0 rounded-full", scoreToneClass(safe))}
                    style={{ width: `${pct}%` }}
                />
            </span>
            {showValue ? (
                <span className={cx("text-xs font-semibold tabular-nums", scoreTextClass(safe))}>
                    {display}
                    <span className="font-normal text-tertiary">/10</span>
                </span>
            ) : null}
        </span>
    );
}

type WeightedScoreBarProps = {
    label: string;
    value: number | undefined;
    weight?: number;
    max?: number;
    unit?: "/10" | "%";
};

export function WeightedScoreBar({ label, value, weight, max = 10, unit = "/10" }: WeightedScoreBarProps) {
    if (value == null || !Number.isFinite(value)) return null;
    const safe = Math.max(0, Math.min(max, value));
    const pct = (safe / max) * 100;
    const display = unit === "%" ? `${Math.round(safe)}%` : `${safe.toFixed(1)}${unit}`;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-secondary">
                    {label}
                    {weight != null ? (
                        <span className="ml-1 tabular-nums text-tertiary">({weight.toFixed(2)})</span>
                    ) : null}
                </span>
                <span className="font-medium tabular-nums text-primary">{display}</span>
            </div>
            <div
                className="h-1.5 overflow-hidden rounded-full bg-secondary_subtle"
                role="img"
                aria-label={`${label} ${display}`}
            >
                <div
                    className={cx("h-full rounded-full", scoreToneClass(unit === "%" ? safe / 10 : safe))}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
