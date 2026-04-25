import { cx } from "@/utils/cx";

type CopilotScoreRingProps = {
    value: number;
    fraction: number;
    className?: string;
    label?: string;
};

function strokeClassesForScore(value: number): string {
    if (value >= 7) return "stroke-success-primary";
    if (value >= 4) return "stroke-warning-primary";
    return "stroke-error-primary";
}

/** Anneau radial : couleur selon seuils de viabilité (scan rapide). */
export function CopilotScoreRing({ value, fraction, className, label }: CopilotScoreRingProps) {
    const size = 120;
    const stroke = 9;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, fraction));
    const offset = c * (1 - clamped);
    const strokeAccent = strokeClassesForScore(value);

    return (
        <div className={cx("flex flex-col items-center gap-2", className)}>
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90 drop-shadow-sm" aria-hidden>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-secondary/80 dark:stroke-secondary/60" strokeWidth={stroke} />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        className={cx("transition-[stroke-dashoffset] duration-700 ease-out", strokeAccent)}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={c}
                        strokeDashoffset={offset}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-kpi-mono text-display-sm font-semibold tabular-nums text-primary md:text-display-md">{value.toFixed(1)}</span>
                    {label ? <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-quaternary">{label}</span> : null}
                </div>
            </div>
        </div>
    );
}
