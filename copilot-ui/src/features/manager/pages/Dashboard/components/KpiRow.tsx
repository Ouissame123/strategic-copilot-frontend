import { SignedDelta, Sparkline } from "@/components/ui/Sparkline";
import type { ManagerDashboardV3Response } from "@/features/manager/types/dashboard-v3";
import { cx } from "@/utils/cx";
import { confidencePct } from "../dashboard-v3-ui";
import { labelDecision, labelSeverity } from "../lib/labels";

type KpiRowProps = {
    data: ManagerDashboardV3Response;
};

type KpiItem = {
    label: string;
    value: string;
    sub: string;
    subTone?: string;
    spark?: number[];
    delta?: number;
};

export function KpiRow({ data }: KpiRowProps) {
    const trend = data.project_state.summary.viability_trend_7d;
    const viabilitySeries =
        Number.isFinite(trend?.last_week) && Number.isFinite(trend?.this_week)
            ? [trend.last_week, trend.this_week]
            : undefined;
    const viabilityDelta =
        viabilitySeries != null ? viabilitySeries[1]! - viabilitySeries[0]! : undefined;

    const items: KpiItem[] = [
        {
            label: "Projets",
            value: String(data.project_state.summary.total),
            sub: `${data.project_state.summary.by_decision.stop} ${labelDecision("Stop")} · ${data.project_state.summary.by_decision.adjust} ${labelDecision("Adjust")}`,
            delta: 0,
        },
        {
            label: "Viabilité moy.",
            value: data.project_state.summary.avg_viability_score.toFixed(1),
            sub: "/ 10",
            spark: viabilitySeries,
            delta: viabilityDelta,
        },
        {
            label: "Alertes ouvertes",
            value: String(data.risk_alerts.summary.total_open),
            sub: `${data.risk_alerts.summary.critical} ${labelSeverity("critical").toLowerCase()}`,
            subTone:
                data.risk_alerts.summary.critical > 0
                    ? "text-[color:var(--critical)]"
                    : "text-[color:var(--text-muted)]",
            delta: data.risk_alerts.summary.new_24h,
        },
        {
            label: "Arbitrages",
            value: String(data.arbitrage_options.summary.proposed),
            sub: `${confidencePct(data.arbitrage_options.summary.avg_confidence)}% confiance moy.`,
            delta: 0,
        },
        {
            label: "Équipe",
            value: String(data.team.total),
            sub: `${data.team.overloaded} surchargés`,
            subTone:
                data.team.overloaded > 0 ? "text-[color:var(--warn)]" : "text-[color:var(--text-muted)]",
            delta: 0,
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
            {items.map((kpi, i) => (
                <div
                    key={kpi.label}
                    className={cx(
                        "ops-card ops-card-interactive ops-enter flex h-[88px] flex-col justify-center !p-3",
                    )}
                    style={{ animationDelay: `${i * 60}ms` }}
                >
                    <p className="text-ops-section">{kpi.label}</p>
                    <p className="font-ops-display text-[28px] font-semibold leading-tight tabular-nums text-[color:var(--text)]">
                        {kpi.value}
                    </p>
                    <div className="mt-0.5 flex items-end justify-between gap-2">
                        <p className={cx("text-[11px]", kpi.subTone ?? "text-[color:var(--text-muted)]")}>
                            {kpi.sub}
                        </p>
                        {kpi.spark && kpi.spark.length >= 2 ? (
                            <Sparkline values={kpi.spark} />
                        ) : kpi.delta != null ? (
                            <SignedDelta delta={kpi.delta} digits={kpi.label === "Alertes ouvertes" ? 0 : 1} />
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    );
}
