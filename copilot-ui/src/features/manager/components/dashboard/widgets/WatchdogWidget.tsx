import { AlertTriangle } from "@untitledui/icons";
import type { DashboardResponse } from "@/features/manager/types/dashboard";
import { readRecordNumber, readRecordString } from "@/features/manager/lib/dashboard-display";
import { AgentSourceBadge } from "../shared/AgentSourceBadge";
import { AgentStatusBadge } from "../shared/AgentStatusBadge";
import { EmptyState, WidgetStatRow } from "../shared/EmptyState";

export function WatchdogWidget({ watchdog }: { watchdog: DashboardResponse["agents"]["watchdog"] }) {
    const { stats, by_type, active } = watchdog;
    const topTypes = by_type.slice(0, 5);

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <AlertTriangle className="size-5 text-red-600" aria-hidden />
                    Watchdog (Agent 2)
                </h3>
                <AgentStatusBadge status={active ? "active" : "empty"} />
            </div>
            {!active ? (
                <EmptyState title="Aucune alerte active" description="Le Watchdog surveille les risques en continu." />
            ) : (
                <div className="space-y-3 text-sm">
                    <div className="space-y-2">
                        <WidgetStatRow label="Alertes ouvertes" value={stats.total_open_alerts} />
                        <WidgetStatRow label="Critiques" value={stats.critical_count} colored="red" />
                        <WidgetStatRow label="Élevées" value={stats.high_count} colored="red" />
                        <WidgetStatRow label="Moyennes" value={stats.medium_count} colored="orange" />
                    </div>
                    {topTypes.length > 0 ? (
                        <div className="border-t border-gray-100 pt-2">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Top types</p>
                            <div className="space-y-1">
                                {topTypes.map((row) => {
                                    const riskType = readRecordString(row, "risk_type") ?? "—";
                                    const count = readRecordNumber(row, "count") ?? 0;
                                    return (
                                        <div key={riskType} className="flex items-center justify-between text-xs">
                                            <span className="truncate text-gray-600">{riskType}</span>
                                            <span className="font-semibold tabular-nums text-gray-900">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
            <AgentSourceBadge agent="Watchdog · Agent 2" />
        </div>
    );
}
