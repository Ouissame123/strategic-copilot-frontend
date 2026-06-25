import { cx } from "@/utils/cx";
import { validationCardClass } from "./validation-ui";

type AgentStatsCardProps = {
    byType: { rh_action?: number; arbitrage?: number; decision?: number };
    onTypeClick: (type?: string) => void;
    activeType?: string;
};

const TYPE_ROWS = [
    { key: "rh_action", label: "Action RH", color: "bg-violet-500" },
    { key: "arbitrage", label: "Arbitrage", color: "bg-blue-500" },
    { key: "decision", label: "Décision", color: "bg-emerald-500" },
] as const;

export function AgentStatsCard({ byType, onTypeClick, activeType }: AgentStatsCardProps) {
    return (
        <div className={validationCardClass}>
            <div className="border-b border-secondary/60 px-4 py-3">
                <h2 className="text-sm font-semibold text-primary">Répartition par type</h2>
            </div>
            <div className="divide-y divide-secondary/50">
                {TYPE_ROWS.map((row) => {
                    const count = byType[row.key] ?? 0;
                    const isActive = activeType === row.key;
                    return (
                        <button
                            key={row.key}
                            type="button"
                            onClick={() => onTypeClick(isActive ? undefined : row.key)}
                            className={cx(
                                "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary_subtle/50",
                                isActive && "bg-brand-primary/5",
                            )}
                        >
                            <span className={cx("size-2 rounded-full", row.color)} />
                            <span className="flex-1 text-sm text-primary">{row.label}</span>
                            <span className="text-sm font-medium tabular-nums text-secondary">{count}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
