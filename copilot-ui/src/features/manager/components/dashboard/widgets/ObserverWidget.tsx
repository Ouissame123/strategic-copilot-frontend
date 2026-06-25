import { ChartBreakoutCircle } from "@untitledui/icons";
import type { DashboardResponse } from "@/features/manager/types/dashboard";
import { AgentSourceBadge } from "../shared/AgentSourceBadge";
import { AgentStatusBadge } from "../shared/AgentStatusBadge";
import { EmptyState, WidgetStatRow } from "../shared/EmptyState";

export function ObserverWidget({ observer }: { observer: DashboardResponse["agents"]["observer"] }) {
    const { stats, active } = observer;
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <ChartBreakoutCircle className="size-5 text-blue-600" aria-hidden />
                    Observer (Agent 1)
                </h3>
                <AgentStatusBadge status={active ? "active" : "empty"} />
            </div>
            {!active ? (
                <EmptyState title="Aucune analyse récente" description="L'Observer analyse les projets automatiquement." />
            ) : (
                <div className="space-y-2 text-sm">
                    <WidgetStatRow label="Projets analysés" value={stats.projects_analyzed} />
                    <WidgetStatRow label="Santé moyenne" value={`${stats.avg_health_score}/10`} />
                    <WidgetStatRow label="Skill gap moyen" value={`${stats.avg_skill_gap_score}/10`} />
                    <WidgetStatRow label="Risk High" value={stats.risk_high_count} colored="red" />
                    <WidgetStatRow label="Risk Medium" value={stats.risk_medium_count} colored="orange" />
                    <WidgetStatRow label="Analyses 24h" value={stats.analyses_last_24h} />
                </div>
            )}
            <AgentSourceBadge agent="Observer · Agent 1" />
        </div>
    );
}
