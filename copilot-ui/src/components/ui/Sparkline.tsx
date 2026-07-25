import { cx } from "@/utils/cx";

type SparklineProps = {
    values: number[];
    width?: number;
    height?: number;
    className?: string;
    /** Couleur via token CSS (ex. var(--accent)) */
    stroke?: string;
};

/** Mini sparkline SVG 60×20 — aucune lib de charts. */
export function Sparkline({
    values,
    width = 60,
    height = 20,
    className,
    stroke = "var(--accent)",
}: SparklineProps) {
    if (values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pad = 1;

    const points = values
        .map((v, i) => {
            const x = pad + (i / (values.length - 1)) * (width - pad * 2);
            const y = height - pad - ((v - min) / range) * (height - pad * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={cx("shrink-0 overflow-visible", className)}
            aria-hidden
        >
            <polyline
                fill="none"
                stroke={stroke}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
}

type SignedDeltaProps = {
    delta: number;
    digits?: number;
    className?: string;
};

export function SignedDelta({ delta, digits = 1, className }: SignedDeltaProps) {
    const finite = Number.isFinite(delta) ? delta : 0;
    const sign = finite > 0 ? "+" : "";
    const tone =
        finite > 0 ? "text-[color:var(--ok)]" : finite < 0 ? "text-[color:var(--critical)]" : "text-[color:var(--text-muted)]";

    return (
        <span className={cx("font-ops-data inline-flex items-center gap-0.5 text-[11px] tabular-nums", tone, className)}>
            {sign}
            {finite.toFixed(digits)}
        </span>
    );
}
