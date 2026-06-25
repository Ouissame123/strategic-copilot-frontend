import { TrendingDown, TrendingUp } from "lucide-react";
import type { DecisionLogKpis } from "@/services/decisions.api";
import { kpiAvgConfidencePercent } from "@/utils/decisionLogHelpers";
import { cx } from "@/utils/cx";
import { decisionLogCardClass } from "./decision-log-ui";

type DecisionLogKpiRowProps = {
    kpis: DecisionLogKpis;
    sparkline: number[];
    confidenceDelta: number | null;
    watchCount: number;
};

function MiniSparkline({ values }: { values: number[] }) {
    const max = Math.max(1, ...values);
    return (
        <div className="flex h-8 w-full items-end gap-0.5 overflow-hidden" aria-hidden>
            {values.map((v, i) => (
                <div
                    key={i}
                    className="min-w-0 flex-1 max-w-[6px] rounded-t bg-brand-secondary/80"
                    style={{ height: `${Math.max(12, (v / max) * 100)}%` }}
                />
            ))}
        </div>
    );
}

export function DecisionLogKpiRow({ kpis, sparkline, confidenceDelta, watchCount }: DecisionLogKpiRowProps) {
    const avgConfidence = kpiAvgConfidencePercent(kpis);
    const avgScore = Number(kpis.avg_score);

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className={decisionLogCardClass + " p-5"}>
                <p className="text-xs font-medium uppercase tracking-wider text-tertiary">Décisions 30j</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-primary">{kpis.total}</p>
                <div className="mt-3">
                    <MiniSparkline values={sparkline} />
                </div>
            </article>

            <article className={decisionLogCardClass + " p-5"}>
                <p className="text-xs font-medium uppercase tracking-wider text-tertiary">Confiance moyenne</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-primary">
                    {avgConfidence}
                    <span className="text-lg font-medium text-tertiary">%</span>
                </p>
                {confidenceDelta != null ? (
                    <div className="mt-3 flex items-center gap-1.5 text-xs">
                        {confidenceDelta < 0 ? (
                            <TrendingDown className="size-3.5 text-rose-500" aria-hidden />
                        ) : (
                            <TrendingUp className="size-3.5 text-emerald-500" aria-hidden />
                        )}
                        <span className={cx("font-medium tabular-nums", confidenceDelta < 0 ? "text-rose-600" : "text-emerald-600")}>
                            {confidenceDelta > 0 ? "+" : ""}
                            {confidenceDelta} pts
                        </span>
                        <span className="text-tertiary">vs semaine précédente</span>
                    </div>
                ) : (
                    <p className="mt-3 text-xs text-tertiary">—</p>
                )}
            </article>

            <article className={decisionLogCardClass + " p-5"}>
                <p className="text-xs font-medium uppercase tracking-wider text-tertiary">Score moyen</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-primary">
                    {avgScore.toFixed(1)}
                    <span className="text-lg font-medium text-tertiary">/10</span>
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary_subtle">
                    <div
                        className="h-full rounded-full bg-brand-secondary transition-all"
                        style={{ width: `${Math.min(100, (avgScore / 10) * 100)}%` }}
                    />
                </div>
            </article>

            <article className={decisionLogCardClass + " p-5"}>
                <p className="text-xs font-medium uppercase tracking-wider text-tertiary">À surveiller</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">{watchCount}</p>
                <p className="mt-3 text-xs text-tertiary">score &lt; 5 ou confiance &lt; 50 %</p>
            </article>
        </div>
    );
}
