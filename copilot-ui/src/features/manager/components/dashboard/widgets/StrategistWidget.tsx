import { Beaker01 } from "@untitledui/icons";
import type { DashboardResponse } from "@/features/manager/types/dashboard";
import { formatDisplayValue, readRecordNumber, readRecordString } from "@/features/manager/lib/dashboard-display";
import { AgentSourceBadge } from "../shared/AgentSourceBadge";
import { AgentStatusBadge } from "../shared/AgentStatusBadge";
import { EmptyState, WidgetStatRow } from "../shared/EmptyState";

export function StrategistWidget({ strategist }: { strategist: DashboardResponse["agents"]["strategist"] }) {
    const { stats, top_options, active } = strategist;
    const topFive = [...top_options]
        .sort((a, b) => (readRecordNumber(b, "confidence") ?? 0) - (readRecordNumber(a, "confidence") ?? 0))
        .slice(0, 5);

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Beaker01 className="size-5 text-purple-600" aria-hidden />
                    Strategist (Agent 3)
                </h3>
                <AgentStatusBadge status={active ? "active" : "empty"} />
            </div>
            {!active ? (
                <EmptyState title="Aucune option stratégique" description="Le Strategist propose des scénarios d'ajustement." />
            ) : (
                <div className="space-y-3 text-sm">
                    <div className="space-y-2">
                        <WidgetStatRow label="Proposées" value={stats.proposed_count} />
                        <WidgetStatRow label="Exécutées" value={stats.executed_count} colored="green" />
                        <WidgetStatRow label="Rejetées" value={stats.rejected_count} colored="red" />
                    </div>
                    <div className="space-y-1 border-t border-gray-100 pt-2 text-xs">
                        <WidgetStatRow label="Réallocation" value={stats.reallocation_count} />
                        <WidgetStatRow label="Délai" value={stats.delay_count} />
                        <WidgetStatRow label="Renfort" value={stats.reinforce_count} />
                        <WidgetStatRow label="Stop scope" value={stats.stop_scope_count} />
                    </div>
                    {topFive.length > 0 ? (
                        <div className="border-t border-gray-100 pt-2">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Top options</p>
                            <div className="space-y-2">
                                {topFive.map((option, index) => {
                                    const projectName = readRecordString(option, "project_name") ?? "Projet";
                                    const rationale = readRecordString(option, "rationale") ?? readRecordString(option, "label");
                                    const confidence = readRecordNumber(option, "confidence");
                                    return (
                                        <div key={`${projectName}-${index}`} className="rounded border border-gray-100 px-2 py-1.5">
                                            <p className="text-xs font-medium text-gray-900">{projectName}</p>
                                            {rationale ? <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{rationale}</p> : null}
                                            {confidence != null ? (
                                                <p className="mt-1 text-xs text-purple-600">Confiance {formatDisplayValue(confidence)}</p>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
            <AgentSourceBadge agent="Strategist · Agent 3" />
        </div>
    );
}
