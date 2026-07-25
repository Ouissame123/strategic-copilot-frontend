import { useId } from "react";
import { cx } from "@/utils/cx";

type PulseRingProps = {
    /** Score sur 10 */
    score: number;
    size?: number;
    className?: string;
    title?: string;
};

/** Jauge radiale 44px — élément signature Mission Control. */
export function PulseRing({ score, size = 44, className, title }: PulseRingProps) {
    const gradId = useId().replace(/:/g, "");
    const clamped = Number.isFinite(score) ? Math.min(10, Math.max(0, score)) : 0;
    const pct = (clamped / 10) * 100;
    const stroke = 3.5;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = (pct / 100) * c;

    const label = clamped.toFixed(1);

    return (
        <div
            className={cx("relative inline-flex shrink-0 items-center justify-center", className)}
            style={{ width: size, height: size }}
            title={title}
        >
            <span
                className="ops-pulse-halo pointer-events-none absolute inset-0 rounded-full bg-[color:var(--accent-glow)]"
                aria-hidden
            />
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-[1]" aria-hidden>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="var(--surface-2)"
                    strokeWidth={stroke}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={`url(#${gradId})`}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c - dash}`}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
                <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--critical)" />
                        <stop offset="55%" stopColor="var(--warn)" />
                        <stop offset="100%" stopColor="var(--ok)" />
                    </linearGradient>
                </defs>
            </svg>
            <span
                className="font-ops-display absolute z-[2] text-[13px] font-semibold tabular-nums text-[color:var(--text)]"
                aria-label={`Score global ${label} sur 10`}
            >
                {label}
            </span>
        </div>
    );
}
