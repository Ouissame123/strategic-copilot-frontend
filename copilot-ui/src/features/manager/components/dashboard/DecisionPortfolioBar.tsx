import type { DashboardResponse } from "@/features/manager/types/dashboard";
import { cx } from "@/utils/cx";

type Props = {
    decisions: DashboardResponse["kpi_cards"]["decisions"];
    className?: string;
};

const SEGMENTS = [
    { key: "continue" as const, label: "Poursuivre", color: "bg-emerald-500" },
    { key: "adjust" as const, label: "Ajuster", color: "bg-amber-500" },
    { key: "stop" as const, label: "Arrêter", color: "bg-rose-500" },
];

export function DecisionPortfolioBar({ decisions, className }: Props) {
    const total = decisions.continue + decisions.adjust + decisions.stop;
    if (total === 0) return null;

    return (
        <section className={cx("rounded-xl border border-secondary bg-primary px-4 py-3 shadow-sm", className)}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-primary">Répartition décisions IA</p>
                <span className="font-mono text-[10px] text-quaternary">Orchestrator</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary_subtle">
                {SEGMENTS.map((seg) => {
                    const value = decisions[seg.key];
                    if (value <= 0) return null;
                    const pct = (value / total) * 100;
                    return (
                        <div
                            key={seg.key}
                            className={cx("h-full transition-all", seg.color)}
                            style={{ width: `${pct}%` }}
                            title={`${seg.label} : ${value}`}
                        />
                    );
                })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {SEGMENTS.map((seg) => (
                    <div key={seg.key} className="flex items-center gap-1.5 text-[11px]">
                        <span className={cx("size-2 rounded-full", seg.color)} aria-hidden />
                        <span className="text-tertiary">{seg.label}</span>
                        <span className="font-semibold tabular-nums text-primary">{decisions[seg.key]}</span>
                    </div>
                ))}
                {decisions.unscored > 0 ? (
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="size-2 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden />
                        <span className="text-tertiary">Non scorés</span>
                        <span className="font-semibold tabular-nums text-primary">{decisions.unscored}</span>
                    </div>
                ) : null}
            </div>
        </section>
    );
}
