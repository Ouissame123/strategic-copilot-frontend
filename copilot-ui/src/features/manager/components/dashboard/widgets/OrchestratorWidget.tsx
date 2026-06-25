import { ZapFast } from "@untitledui/icons";
import type { DashboardResponse } from "@/features/manager/types/dashboard";
import { formatDisplayValue } from "@/features/manager/lib/dashboard-display";
import { cx } from "@/utils/cx";
import { AgentSourceBadge } from "../shared/AgentSourceBadge";
import { AgentStatusBadge } from "../shared/AgentStatusBadge";
import { EmptyState, WidgetStatRow } from "../shared/EmptyState";

export function OrchestratorWidget({ orchestrator }: { orchestrator: DashboardResponse["agents"]["orchestrator"] }) {
    const { stats, active } = orchestrator;
    const total = stats.continue_count + stats.adjust_count + stats.stop_count;

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <ZapFast className="size-5 text-violet-600" aria-hidden />
                    Orchestrator (Agent 7)
                </h3>
                <AgentStatusBadge status={active ? "active" : "empty"} />
            </div>
            {!active ? (
                <EmptyState title="Aucune décision récente" description="L'Orchestrator consolide les recommandations IA." />
            ) : (
                <div className="space-y-3 text-sm">
                    <WidgetStatRow label="Décisions 30j" value={stats.total_decisions_30d} />
                    <WidgetStatRow label="Continue" value={stats.continue_count} colored="green" />
                    <WidgetStatRow label="Adjust" value={stats.adjust_count} colored="orange" />
                    <WidgetStatRow label="Stop" value={stats.stop_count} colored="red" />
                    <WidgetStatRow label="Confiance moy." value={formatDisplayValue(stats.avg_confidence)} />
                    <WidgetStatRow label="Score moy." value={formatDisplayValue(stats.avg_score)} />
                    <WidgetStatRow label="Décisions 24h" value={stats.decisions_last_24h} />

                    {total > 0 ? (
                        <div className="border-t border-gray-100 pt-2">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Répartition</p>
                            <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
                                {stats.continue_count > 0 ? (
                                    <div
                                        className={cx("bg-green-500")}
                                        style={{ width: `${(stats.continue_count / total) * 100}%` }}
                                        title={`Continue: ${stats.continue_count}`}
                                    />
                                ) : null}
                                {stats.adjust_count > 0 ? (
                                    <div
                                        className={cx("bg-orange-500")}
                                        style={{ width: `${(stats.adjust_count / total) * 100}%` }}
                                        title={`Adjust: ${stats.adjust_count}`}
                                    />
                                ) : null}
                                {stats.stop_count > 0 ? (
                                    <div
                                        className={cx("bg-red-500")}
                                        style={{ width: `${(stats.stop_count / total) * 100}%` }}
                                        title={`Stop: ${stats.stop_count}`}
                                    />
                                ) : null}
                            </div>
                            <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                                <span>Continue</span>
                                <span>Adjust</span>
                                <span>Stop</span>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
            <AgentSourceBadge agent="Orchestrator · Agent 7" />
        </div>
    );
}
