import { Fragment } from "react";
import { Grid3X3 } from "lucide-react";
import {
    HEATMAP_IMPACT_COLS,
    HEATMAP_URGENCY_ROWS,
    type HeatmapBucketsNested,
    type ImpactLevel,
    type UrgencyLevel,
} from "@/lib/risk-alert-display";
import { cx } from "@/utils/cx";
import { RISK_CARD } from "./risks-shared";
import type { DisplayAlert } from "./risks-shared";

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
    watch: "Surveille",
    today: "Aujourd'hui",
    urgent: "Urgent",
};

const IMPACT_LABELS: Record<ImpactLevel, string> = {
    low: "Impact faible",
    medium: "Impact moyen",
    high: "Impact élevé",
};

function cellDensityClass(count: number): string {
    if (count <= 0) return "bg-slate-50 dark:bg-slate-900/60";
    if (count <= 2) return "bg-amber-50 dark:bg-amber-950/25";
    if (count <= 5) return "bg-orange-100 dark:bg-orange-950/35";
    return "bg-rose-100 dark:bg-rose-950/40";
}

type RiskHeatmapInteractiveProps = {
    buckets: HeatmapBucketsNested<DisplayAlert>;
    onCellPick: (alerts: DisplayAlert[]) => void;
};

export function RiskHeatmapInteractive({ buckets, onCellPick }: RiskHeatmapInteractiveProps) {
    return (
        <section className={cx(RISK_CARD, "p-4 sm:p-5")}>
            <div className="flex items-center gap-2">
                <Grid3X3 className="size-4 text-violet-600 dark:text-violet-400" aria-hidden />
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Risk heatmap</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Impact × urgence — cliquez une cellule pour filtrer le détail.</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="grid min-w-[20rem] grid-cols-[4.5rem_repeat(3,minmax(5.5rem,1fr))] text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <div className="border-b border-r border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-800/50" />
                    {HEATMAP_IMPACT_COLS.map((impact) => (
                        <div
                            key={impact}
                            className="border-b border-r border-slate-200 bg-slate-50/80 p-2 text-center last:border-r-0 dark:border-slate-700 dark:bg-slate-800/50"
                        >
                            {IMPACT_LABELS[impact]}
                        </div>
                    ))}
                    {HEATMAP_URGENCY_ROWS.map((urgency, row) => (
                        <Fragment key={urgency}>
                            <div
                                className={cx(
                                    "flex items-center border-r border-slate-200 bg-white p-2 font-semibold normal-case text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                                    row < HEATMAP_URGENCY_ROWS.length - 1 ? "border-b" : "",
                                )}
                            >
                                {URGENCY_LABELS[urgency]}
                            </div>
                            {HEATMAP_IMPACT_COLS.map((impact, col) => {
                                const cell = buckets[urgency][impact];
                                const count = cell.length;
                                return (
                                    <button
                                        key={`${urgency}-${impact}`}
                                        type="button"
                                        disabled={count === 0}
                                        onClick={() => count > 0 && onCellPick(cell)}
                                        className={cx(
                                            "relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1 border-r border-slate-200 p-2 text-left transition-all duration-200",
                                            row < HEATMAP_URGENCY_ROWS.length - 1 ? "border-b" : "",
                                            col === HEATMAP_IMPACT_COLS.length - 1 ? "border-r-0" : "",
                                            cellDensityClass(count),
                                            count > 0 && "cursor-pointer hover:scale-[1.02] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                                            count === 0 && "cursor-default opacity-80",
                                        )}
                                    >
                                        <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{count}</span>
                                        <ul className="w-full space-y-0.5 text-center text-[9px] font-medium normal-case text-slate-600 dark:text-slate-400">
                                            {cell.slice(0, 3).map((a) => (
                                                <li key={a.patchId} className="truncate">
                                                    {a.projectName}
                                                </li>
                                            ))}
                                        </ul>
                                        {count > 3 ? (
                                            <span className="text-[9px] font-semibold text-violet-600 dark:text-violet-400">+{count - 3}</span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </Fragment>
                    ))}
                </div>
            </div>
        </section>
    );
}
