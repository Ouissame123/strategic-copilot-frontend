import { RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { PulseRing } from "@/components/ui/PulseRing";
import {
    DASHBOARD_AGENT_KEYS,
    type DashboardAgentsStatus,
    type DashboardCopilotPulse,
    type DashboardHealth,
} from "@/features/manager/types/dashboard-v3";
import { formatRelativeShort } from "@/lib/format-relative-short";
import { AgentChip } from "./AgentChip";
import { StatusBadge } from "./StatusBadge";
import { labelHealth, labelUrgency } from "../lib/labels";

type DashboardHeaderProps = {
    agentsStatus: DashboardAgentsStatus;
    activeCount: number;
    total: number;
    pulse: DashboardCopilotPulse;
    health: DashboardHealth;
    computedAt: string;
    lastRefreshed: Date | null;
    onRefresh: () => void;
    isRefreshing?: boolean;
    /** Tendance viabilité 7j pour le tooltip Pulse Ring */
    viabilityTrend?: { this_week: number; last_week: number };
};

export function DashboardHeader({
    agentsStatus,
    activeCount,
    total,
    pulse,
    health,
    computedAt,
    lastRefreshed,
    onRefresh,
    isRefreshing,
    viabilityTrend,
}: DashboardHeaderProps) {
    const refreshedLabel = lastRefreshed
        ? formatRelativeShort(lastRefreshed.toISOString())
        : computedAt
          ? formatRelativeShort(computedAt)
          : "—";

    const trendDelta =
        viabilityTrend && Number.isFinite(viabilityTrend.this_week) && Number.isFinite(viabilityTrend.last_week)
            ? viabilityTrend.this_week - viabilityTrend.last_week
            : null;
    const trendLabel =
        trendDelta == null ? "n/d" : `${trendDelta > 0 ? "+" : ""}${trendDelta.toFixed(1)} vs sem. préc.`;

    const pulseTip = [
        `Viabilité moy. ${health.avg_viability.toFixed(1)}/10`,
        `Urgence ${labelUrgency(pulse.urgency)}`,
        `Tendance 7j ${trendLabel}`,
    ].join(" · ");

    return (
        <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--surface-1)]">
            <div className="flex flex-col gap-2 px-4 py-2.5 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {DASHBOARD_AGENT_KEYS.map((key) => (
                            <AgentChip key={key} agentKey={key} status={agentsStatus[key]} compact />
                        ))}
                        <span className="font-ops-data ml-1 text-[11px] tabular-nums text-[color:var(--text-muted)]">
                            {activeCount}/{total} actifs
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-ops-data text-[11px] text-[color:var(--text-muted)]">
                            Mis à jour {refreshedLabel}
                        </span>
                        <Button
                            type="button"
                            color="tertiary"
                            size="sm"
                            onClick={onRefresh}
                            isDisabled={isRefreshing}
                            iconLeading={RefreshCw01}
                            className="ops-focus-ring"
                        >
                            Actualiser
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[13px]">
                    <PulseRing score={health.score} title={pulseTip} />
                    <p className="font-ops-display min-w-0 flex-1 truncate text-[15px] font-semibold text-[color:var(--text)]">
                        {pulse.headline}
                    </p>
                    <StatusBadge
                        variant={
                            health.label === "critical" || health.label === "attention"
                                ? "critical"
                                : health.label === "watch"
                                  ? "warning"
                                  : "ok"
                        }
                    >
                        {labelHealth(health.label)}
                    </StatusBadge>
                    <span className="font-ops-data text-[12px] tabular-nums text-[color:var(--text-muted)]">
                        Viabilité {health.avg_viability.toFixed(1)}/10 · {labelUrgency(pulse.urgency)}
                    </span>
                </div>
            </div>
        </header>
    );
}
