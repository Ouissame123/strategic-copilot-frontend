import { Activity, AlertTriangle, Calendar, CurrencyDollar, Heart, Users01 } from "@untitledui/icons";
import type { KpiHighlight } from "@/api/helper-chat-v3.types";
import { cx } from "@/utils/cx";

function scoreColor(value: number, good = 7, warn = 5): string {
    if (value >= good) return "text-emerald-600 dark:text-emerald-400";
    if (value >= warn) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
}

type KpiItem = {
    key: string;
    Icon: typeof Activity;
    label: string;
    value: string;
    color: string;
};

export function KpiHighlightStrip({ kpi }: { kpi: KpiHighlight | null | undefined }) {
    if (!kpi || Object.keys(kpi).length === 0) return null;

    const items: KpiItem[] = [];

    if (kpi.viability != null) {
        items.push({
            key: "viability",
            Icon: Activity,
            label: "Viab.",
            value: `${kpi.viability.toFixed(1)}/10`,
            color: scoreColor(kpi.viability),
        });
    }
    if (kpi.health_score != null) {
        items.push({
            key: "health",
            Icon: Heart,
            label: "Santé",
            value: `${kpi.health_score.toFixed(1)}/10`,
            color: scoreColor(kpi.health_score),
        });
    }
    if (kpi.alerts_active != null) {
        items.push({
            key: "alerts",
            Icon: AlertTriangle,
            label: "Alertes",
            value: String(kpi.alerts_active),
            color:
                kpi.alerts_active === 0
                    ? "text-emerald-600"
                    : kpi.alerts_active < 3
                      ? "text-amber-600"
                      : "text-red-600",
        });
    }
    if (kpi.team_size != null) {
        items.push({
            key: "team",
            Icon: Users01,
            label: "Équipe",
            value: String(kpi.team_size),
            color: "text-blue-600 dark:text-blue-400",
        });
    }
    if (kpi.days_to_milestone != null) {
        items.push({
            key: "milestone",
            Icon: Calendar,
            label: "Échéance",
            value: `${kpi.days_to_milestone}j`,
            color:
                kpi.days_to_milestone < 30
                    ? "text-red-600"
                    : kpi.days_to_milestone < 90
                      ? "text-amber-600"
                      : "text-fg-tertiary",
        });
    }
    if (kpi.budget_consumed_pct != null) {
        items.push({
            key: "budget",
            Icon: CurrencyDollar,
            label: "Budget",
            value: `${kpi.budget_consumed_pct.toFixed(0)}%`,
            color:
                kpi.budget_consumed_pct >= 90
                    ? "text-red-600"
                    : kpi.budget_consumed_pct >= 75
                      ? "text-amber-600"
                      : "text-fg-tertiary",
        });
    }

    if (items.length === 0) return null;

    return (
        <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-secondary_subtle/50 px-3 py-2 text-xs"
            aria-label="Indicateurs projet mis en avant"
        >
            {items.map((item) => (
                <div key={item.key} className="flex items-center gap-1">
                    <item.Icon className={cx("size-3.5 shrink-0", item.color)} aria-hidden />
                    <span className="text-fg-tertiary">{item.label}:</span>
                    <span className={cx("font-semibold tabular-nums", item.color)}>{item.value}</span>
                </div>
            ))}
        </div>
    );
}
