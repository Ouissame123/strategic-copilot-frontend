import type { DecisionLogKpis } from "@/services/decisions.api";
import { cx } from "@/utils/cx";

const SEGMENTS = [
    { key: "continue" as const, label: "Continue", className: "bg-emerald-500" },
    { key: "adjust" as const, label: "Adjust", className: "bg-amber-500" },
    { key: "stop" as const, label: "Stop", className: "bg-rose-500" },
    { key: "other" as const, label: "Other", className: "bg-violet-500" },
];

type DecisionStackedBarProps = {
    kpis: DecisionLogKpis;
};

export function DecisionStackedBar({ kpis }: DecisionStackedBarProps) {
    const total = Math.max(1, kpis.total || 0);

    return (
        <div className="rounded-xl border border-secondary bg-primary p-3">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary_subtle">
                {SEGMENTS.map((s) => {
                    const value = kpis[s.key] ?? 0;
                    const width = (value / total) * 100;
                    if (width <= 0) return null;
                    return (
                        <div
                            key={s.key}
                            className={cx(s.className, "h-full transition-all")}
                            style={{ width: `${width}%` }}
                            title={`${s.label}: ${value}`}
                        />
                    );
                })}
            </div>
            <ul className="mt-2 flex flex-wrap gap-3 text-xs text-secondary">
                {SEGMENTS.map((s) => (
                    <li key={s.key} className="flex items-center gap-1.5">
                        <span className={cx("size-2 rounded-full", s.className)} aria-hidden />
                        <span className="font-medium text-primary">{s.label}</span>
                        <span className="tabular-nums text-tertiary">{kpis[s.key] ?? 0}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
