import { cx } from "@/utils/cx";

type ScoreBarProps = {
    value: number;
    max?: number;
    variant?: "score" | "confidence";
};

export function ScoreBar({ value, max = 10, variant = "score" }: ScoreBarProps) {
    const n = Number(value);
    const pct = Number.isFinite(n) ? Math.max(0, Math.min(100, (n / max) * 100)) : 0;
    const filled = Math.round((pct / 100) * 10);

    return (
        <div className="flex gap-0.5" role="img" aria-label={`${Math.round(pct)}%`}>
            {Array.from({ length: 10 }, (_, i) => {
                const on = i < filled;
                const scoreColor =
                    i < 3 ? "bg-red-500" : i < 7 ? "bg-amber-500" : "bg-emerald-500";
                const confColor = "bg-violet-500";
                return (
                    <span
                        key={i}
                        className={cx(
                            "h-1.5 w-2 rounded-sm",
                            on ? (variant === "confidence" ? confColor : scoreColor) : "bg-slate-200 dark:bg-slate-700",
                        )}
                    />
                );
            })}
        </div>
    );
}
