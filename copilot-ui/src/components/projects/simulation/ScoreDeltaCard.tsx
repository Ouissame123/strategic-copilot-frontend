import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatDelta, formatScore } from "./whatif-format";
import { cx } from "@/utils/cx";

type ScoreDeltaCardProps = {
    label: string;
    before: number | null;
    after: number | null;
    max?: number;
};

export function ScoreDeltaCard({ label, before, after, max = 10 }: ScoreDeltaCardProps) {
    const b = before ?? 0;
    const a = after ?? 0;
    const delta = after != null && before != null ? a - b : null;
    const hasData = before != null || after != null;

    const Icon = delta != null && delta > 0 ? TrendingUp : delta != null && delta < 0 ? TrendingDown : Minus;
    const deltaColor =
        delta != null && delta > 0
            ? "text-emerald-600 dark:text-emerald-400"
            : delta != null && delta < 0
              ? "text-red-600 dark:text-red-400"
              : "text-fg-tertiary";

    const beforePct = (b / max) * 100;
    const afterPct = (a / max) * 100;

    return (
        <article className="rounded-xl border border-secondary bg-primary p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-fg-tertiary">{label}</div>
            {!hasData ? (
                <p className="mt-2 text-sm italic text-fg-quaternary">non disponible</p>
            ) : (
                <>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1">
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm text-fg-tertiary">Avant</span>
                                <span className="font-mono text-sm font-semibold tabular-nums text-fg-primary">
                                    {formatScore(before)}
                                </span>
                            </div>
                            <div
                                className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary/60"
                                role="progressbar"
                                aria-valuenow={Math.round(beforePct)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${label} avant`}
                            >
                                <div className="h-full bg-primary-400" style={{ width: `${Math.min(100, beforePct)}%` }} />
                            </div>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-fg-quaternary" aria-hidden />
                        <div className="flex-1">
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm text-fg-tertiary">Après</span>
                                <span className="font-mono text-sm font-semibold tabular-nums text-fg-primary">
                                    {formatScore(after)}
                                </span>
                            </div>
                            <div
                                className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary/60"
                                role="progressbar"
                                aria-valuenow={Math.round(afterPct)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${label} après`}
                            >
                                <div
                                    className={cx(
                                        "h-full",
                                        delta != null && delta < 0
                                            ? "bg-red-500"
                                            : delta != null && delta > 0
                                              ? "bg-emerald-500"
                                              : "bg-primary-500",
                                    )}
                                    style={{ width: `${Math.min(100, afterPct)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={cx("mt-2 flex items-center justify-end gap-1 text-sm font-semibold tabular-nums", deltaColor)}>
                        <Icon className="size-4" aria-hidden />
                        {formatDelta(delta)}
                    </div>
                </>
            )}
        </article>
    );
}
