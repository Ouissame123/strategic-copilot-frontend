import { Fragment } from "react";
import type { DecisionLogHeatmapRow } from "@/services/decisions.api";
import { cx } from "@/utils/cx";

const ROWS = [
    { key: "continue", label: "Continue" },
    { key: "adjust", label: "Adjust" },
    { key: "stop", label: "Stop" },
    { key: "other", label: "Other" },
] as const;

const COLS = [
    { key: "low" as const, label: "Faible" },
    { key: "medium" as const, label: "Moyen" },
    { key: "high" as const, label: "Élevé" },
];

type ConfidenceHeatmapProps = {
    heatmap: Record<string, DecisionLogHeatmapRow>;
};

function cellIntensity(value: number, rowTotal: number): string {
    if (rowTotal <= 0 || value <= 0) return "bg-secondary_subtle text-tertiary";
    const ratio = value / rowTotal;
    if (ratio > 0.66) return "bg-violet-600 text-white";
    if (ratio > 0.33) return "bg-violet-300/90 text-violet-950 dark:bg-violet-500/50 dark:text-violet-50";
    return "bg-violet-100 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100";
}

export function ConfidenceHeatmap({ heatmap }: ConfidenceHeatmapProps) {
    return (
        <article className="rounded-xl border border-secondary bg-primary p-3 shadow-sm md:p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary">Heatmap décisions</h3>
            <p className="mt-0.5 text-[10px] text-quaternary">+ intense = plus de décisions</p>
            <div className="mt-2 overflow-x-auto">
                <div className="inline-block min-w-full">
                    <div className="grid grid-cols-[minmax(5rem,1fr)_repeat(3,minmax(3rem,1fr))] gap-1 text-center text-[10px] font-semibold uppercase text-tertiary">
                        <div />
                        {COLS.map((c) => (
                            <div key={c.key} className="py-1">
                                {c.label}
                            </div>
                        ))}
                        {ROWS.map((row) => {
                            const data = heatmap[row.key] ?? { low: 0, medium: 0, high: 0 };
                            const rowTotal = data.low + data.medium + data.high;
                            return (
                                <Fragment key={row.key}>
                                    <div className="flex items-center py-2 text-left text-xs font-medium text-secondary">{row.label}</div>
                                    {COLS.map((col) => {
                                        const v = data[col.key];
                                        return (
                                            <div
                                                key={`${row.key}-${col.key}`}
                                                className={cx(
                                                    "flex min-h-[2.25rem] items-center justify-center rounded-md text-xs font-bold tabular-nums",
                                                    cellIntensity(v, rowTotal),
                                                )}
                                            >
                                                {v > 0 ? v : "·"}
                                            </div>
                                        );
                                    })}
                                </Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
        </article>
    );
}
