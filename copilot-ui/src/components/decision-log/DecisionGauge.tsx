import { cx } from "@/utils/cx";

type DecisionGaugeProps = {
    score: number;
    max?: number;
    size?: "sm" | "md";
};

export function DecisionGauge({ score, max = 10, size = "md" }: DecisionGaugeProps) {
    const n = Number(score);
    const safe = Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
    const pct = (safe / max) * 100;
    const dim = size === "sm" ? "size-14" : "size-20";
    const textSize = size === "sm" ? "text-sm" : "text-lg";
    const color = safe < 4 ? "#ef4444" : safe < 7 ? "#f59e0b" : "#10b981";

    return (
        <div
            className={cx("relative flex shrink-0 items-center justify-center rounded-full", dim)}
            style={{
                background: `conic-gradient(${color} ${pct}%, rgb(226 232 240) 0)`,
            }}
            aria-label={`Score ${safe.toFixed(1)} sur ${max}`}
        >
            <span
                className={cx(
                    "flex items-center justify-center rounded-full bg-primary font-bold tabular-nums text-primary",
                    size === "sm" ? "size-10 text-sm" : "size-14 text-lg",
                    textSize,
                )}
            >
                {safe.toFixed(1)}
            </span>
        </div>
    );
}
